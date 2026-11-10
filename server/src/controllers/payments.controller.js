import { z } from 'zod';
import { query, callProc, toId } from '../utils/db.js';
import { HttpError } from '../utils/httpError.js';
import { ok, asyncHandler } from '../utils/response.js';
import { createPaymentLink, verifyWebhook } from '../services/payment.service.js';
import { sendTicketEmail } from '../services/email.service.js';
import { emitToUser } from '../sockets/payment.socket.js';
import { emitSeatRows } from '../sockets/seat.socket.js';

export const createPaymentSchema = z.object({ orderId: z.number().int().positive() });

/** POST /api/payments/create - tạo link/QR PayOS cho đơn PENDING của chính user. */
export const createPayment = asyncHandler(async (req, res) => {
  const [order] = await query('SELECT OrderId, OrderCode, TotalAmount, Status, ExpiresAt FROM Orders WHERE OrderId = @Id AND UserId = @UserId', {
    Id: req.body.orderId, UserId: req.user.userId,
  });
  if (!order) throw new HttpError(404, 'Không tìm thấy đơn hàng.');
  if (order.status !== 'PENDING') throw new HttpError(400, 'Đơn hàng không còn ở trạng thái chờ thanh toán.');
  if (new Date(order.expiresAt) <= new Date()) throw new HttpError(400, 'Đơn hàng đã hết hạn giữ chỗ. Vui lòng chọn lại ghế.');

  const base = { orderId: order.orderId, orderCode: Number(order.orderCode), amount: order.totalAmount, expiresAt: order.expiresAt };

  // Đã có link chờ thanh toán thì dùng lại, tránh tạo trùng
  const [existing] = await query(`SELECT TOP 1 CheckoutUrl, RawPayload FROM Payments WHERE OrderId = @Id AND Status = 'PENDING' AND CheckoutUrl IS NOT NULL ORDER BY PaymentId DESC`, { Id: order.orderId });
  if (existing) return ok(res, { ...base, checkoutUrl: existing.checkoutUrl, ...JSON.parse(existing.rawPayload ?? '{}') });

  const link = await createPaymentLink(base);
  const info = { qrCode: link.qrCode, accountNumber: link.accountNumber, accountName: link.accountName, bin: link.bin, description: link.description };
  await query(
    `INSERT INTO Payments (OrderId, ProviderRef, CheckoutUrl, Amount, Status, RawPayload) VALUES (@OrderId, @Ref, @Url, @Amount, 'PENDING', @Raw)`,
    { OrderId: order.orderId, Ref: link.paymentLinkId, Url: link.checkoutUrl, Amount: order.totalAmount, Raw: JSON.stringify(info) },
  );
  ok(res, { ...base, checkoutUrl: link.checkoutUrl, ...info }, 'Đã tạo thanh toán', 201);
});

/**
 * POST /api/payments/webhook - PayOS gọi khi có tiền vào.
 * Quy trình: verify chữ ký -> sp_ConfirmPayment (idempotent) -> gửi email + phát Socket.IO.
 */
export const handleWebhook = asyncHandler(async (req, res) => {
  let data;
  try {
    data = await verifyWebhook(req.body);
  } catch (e) {
    if (e instanceof HttpError) throw e; // chưa cấu hình PayOS
    return res.status(400).json({ success: false, message: 'Chữ ký webhook không hợp lệ.' });
  }
  if (!req.body.success || data.code !== '00') return res.json({ success: true, message: 'Bỏ qua giao dịch không thành công.' });

  let result;
  try {
    const { rows } = await callProc('sp_ConfirmPayment', {
      OrderCode: Number(data.orderCode), AmountPaid: data.amount, ProviderRef: data.paymentLinkId, RawPayload: JSON.stringify(req.body),
    });
    result = rows[0];
  } catch (e) {
    // Không có đơn (ví dụ webhook thử khi đăng ký URL): vẫn trả 200 để PayOS không gửi lại
    if (e.status === 400) return res.json({ success: true, message: e.message });
    throw e;
  }

  if (result.result === 'SUCCESS') {
    const seats = await query(`SELECT ShowtimeId, SeatId FROM Tickets WHERE OrderId = @Id`, { Id: result.orderId });
    emitSeatRows('seat:sold', seats);
    emitToUser(result.userId, 'payment:success', { orderId: result.orderId });
    emitToUser(result.userId, 'notification:new', {});
    sendTicketEmail(result.orderId); // không await: không chặn phản hồi cho PayOS
  } else {
    console.warn(`[webhook] đơn ${data.orderCode}: ${result.result} (xem vw_PaymentsNeedReview)`);
  }
  res.json({ success: true, result: result.result });
});

/** GET /api/payments/:orderId/status - client hỏi lại server (không tin tham số trên URL). */
export const paymentStatus = asyncHandler(async (req, res) => {
  const [o] = await query(
    `SELECT o.OrderId, o.Status, o.ExpiresAt, o.TotalAmount, (SELECT COUNT(*) FROM Tickets t WHERE t.OrderId = o.OrderId) AS TicketCount
     FROM Orders o WHERE o.OrderId = @Id AND o.UserId = @UserId`,
    { Id: toId(req.params.orderId, 'orderId'), UserId: req.user.userId },
  );
  if (!o) throw new HttpError(404, 'Không tìm thấy đơn hàng.');
  ok(res, o);
});

export const paymentsNeedReview = asyncHandler(async (req, res) => {
  const rows = await query('SELECT * FROM vw_PaymentsNeedReview ORDER BY PaidAt DESC');
  ok(res, rows.map((r) => ({ ...r, orderCode: Number(r.orderCode) })));
});
