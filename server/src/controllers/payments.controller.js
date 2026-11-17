import { z } from 'zod';
import { query, callProc, toId } from '../utils/db.js';
import { HttpError } from '../utils/httpError.js';
import { ok, asyncHandler } from '../utils/response.js';
import { env } from '../config/env.js';
import { createPaymentLink, verifyWebhook } from '../services/payment.service.js';
import { createMomoPayment, queryMomoPayment, verifyMomoIpn, orderCodeFromMomoOrderId } from '../services/momo.service.js';
import { sendTicketEmail } from '../services/email.service.js';
import { emitToUser } from '../sockets/payment.socket.js';
import { emitSeatRows } from '../sockets/seat.socket.js';

export const createPaymentSchema = z.object({
  orderId: z.number().int().positive(),
  provider: z.enum(['PAYOS', 'MOMO']).default('PAYOS'),
});

/**
 * Xác nhận thanh toán (dùng chung cho PayOS, MoMo): gọi sp_ConfirmPayment (idempotent),
 * rồi phát realtime + gửi email khi SUCCESS. Gọi nhiều lần cho một đơn vẫn an toàn.
 */
async function confirmPayment({ orderCode, amount, providerRef, raw }) {
  let result;
  try {
    const { rows } = await callProc('sp_ConfirmPayment', {
      OrderCode: orderCode, AmountPaid: amount, ProviderRef: providerRef, RawPayload: JSON.stringify(raw),
    });
    result = rows[0];
  } catch (e) {
    // Không có đơn (ví dụ webhook thử khi đăng ký URL): không coi là lỗi để cổng thanh toán không gửi lại mãi
    if (e.status === 400) return { result: 'ORDER_NOT_FOUND', message: e.message };
    throw e;
  }

  if (result.result === 'SUCCESS') {
    const seats = await query('SELECT ShowtimeId, SeatId FROM Tickets WHERE OrderId = @Id', { Id: result.orderId });
    emitSeatRows('seat:sold', seats);
    emitToUser(result.userId, 'payment:success', { orderId: result.orderId });
    emitToUser(result.userId, 'notification:new', {});
    sendTicketEmail(result.orderId); // không await: không chặn phản hồi cho cổng thanh toán
  } else if (result.result !== 'ALREADY_PAID') {
    console.warn(`[payment] đơn ${orderCode}: ${result.result} (xem vw_PaymentsNeedReview)`);
  }
  return result;
}

/** POST /api/payments/create { orderId, provider: 'PAYOS' | 'MOMO' } - tạo link/QR cho đơn PENDING của chính user. */
export const createPayment = asyncHandler(async (req, res) => {
  const { orderId, provider } = req.body;
  const [order] = await query('SELECT OrderId, OrderCode, TotalAmount, Status, ExpiresAt FROM Orders WHERE OrderId = @Id AND UserId = @UserId', {
    Id: orderId, UserId: req.user.userId,
  });
  if (!order) throw new HttpError(404, 'Không tìm thấy đơn hàng.');
  if (order.status !== 'PENDING') throw new HttpError(400, 'Đơn hàng không còn ở trạng thái chờ thanh toán.');
  if (new Date(order.expiresAt) <= new Date()) throw new HttpError(400, 'Đơn hàng đã hết hạn giữ chỗ. Vui lòng chọn lại ghế.');

  const base = { provider, orderId: order.orderId, orderCode: Number(order.orderCode), amount: order.totalAmount, expiresAt: order.expiresAt };

  // Đổi cổng thanh toán: chỉ một giao dịch ở trạng thái chờ tại một thời điểm
  await query(`UPDATE Payments SET Status = 'CANCELLED' WHERE OrderId = @Id AND Status = 'PENDING' AND Provider <> @Provider`, { Id: order.orderId, Provider: provider });

  // Đã có link của cổng này (chờ hoặc bị đổi cổng trước đó) thì dùng lại, tránh tạo trùng
  const [existing] = await query(
    `SELECT TOP 1 PaymentId, CheckoutUrl, RawPayload FROM Payments
     WHERE OrderId = @Id AND Provider = @Provider AND Status IN ('PENDING','CANCELLED') AND CheckoutUrl IS NOT NULL ORDER BY PaymentId DESC`,
    { Id: order.orderId, Provider: provider },
  );
  if (existing) {
    await query(`UPDATE Payments SET Status = 'PENDING' WHERE PaymentId = @Id`, { Id: existing.paymentId });
    return ok(res, { ...base, checkoutUrl: existing.checkoutUrl, ...JSON.parse(existing.rawPayload ?? '{}') });
  }

  let info;
  let ref;
  let url;
  if (provider === 'MOMO') {
    const m = await createMomoPayment({ orderCode: base.orderCode, amount: base.amount, redirectUrl: `${env.clientUrl}/payment/result?orderId=${order.orderId}` });
    ref = m.momoOrderId;
    url = m.payUrl;
    info = { qrCode: m.qrCode, deeplink: m.deeplink };
  } else {
    const link = await createPaymentLink(base);
    ref = link.paymentLinkId;
    url = link.checkoutUrl;
    info = { qrCode: link.qrCode, accountNumber: link.accountNumber, accountName: link.accountName, bin: link.bin, description: link.description };
  }
  await query(
    `INSERT INTO Payments (OrderId, Provider, ProviderRef, CheckoutUrl, Amount, Status, RawPayload) VALUES (@OrderId, @Provider, @Ref, @Url, @Amount, 'PENDING', @Raw)`,
    { OrderId: order.orderId, Provider: provider, Ref: ref, Url: url, Amount: order.totalAmount, Raw: JSON.stringify(info) },
  );
  ok(res, { ...base, checkoutUrl: url, ...info }, 'Đã tạo thanh toán', 201);
});

/**
 * POST /api/payments/webhook - PayOS gọi khi có tiền vào.
 * Quy trình: verify chữ ký -> confirmPayment (idempotent) -> phát Socket.IO + gửi email.
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

  const result = await confirmPayment({ orderCode: Number(data.orderCode), amount: data.amount, providerRef: data.paymentLinkId, raw: req.body });
  if (result.result === 'ORDER_NOT_FOUND') return res.json({ success: true, message: result.message });
  res.json({ success: true, result: result.result });
});

/**
 * POST /api/payments/momo/ipn - MoMo gọi (IPN) khi giao dịch có kết quả.
 * MoMo yêu cầu phản hồi HTTP 204; sai chữ ký thì từ chối.
 */
export const handleMomoIpn = asyncHandler(async (req, res) => {
  const body = req.body ?? {};
  if (!verifyMomoIpn(body)) return res.status(400).json({ success: false, message: 'Chữ ký IPN không hợp lệ.' });
  const orderCode = orderCodeFromMomoOrderId(body.orderId);
  if (Number(body.resultCode) !== 0 || !Number.isFinite(orderCode)) return res.status(204).end(); // giao dịch thất bại/hủy: không cần xử lý
  await confirmPayment({ orderCode, amount: Number(body.amount), providerRef: String(body.orderId), raw: body });
  res.status(204).end();
});

const lastMomoQuery = new Map(); // orderId -> thời điểm hỏi MoMo gần nhất (tránh hỏi dồn dập)

const loadStatus = (orderId, userId) =>
  query(
    `SELECT o.OrderId, o.OrderCode, o.Status, o.ExpiresAt, o.TotalAmount, (SELECT COUNT(*) FROM Tickets t WHERE t.OrderId = o.OrderId) AS TicketCount
     FROM Orders o WHERE o.OrderId = @Id AND o.UserId = @UserId`,
    { Id: orderId, UserId: userId },
  ).then((r) => r[0]);

/**
 * GET /api/payments/:orderId/status - client hỏi lại server (không tin tham số trên URL).
 * Nếu đơn đang chờ MoMo mà IPN chưa về (chạy local chưa có tunnel), server tự hỏi MoMo rồi xác nhận.
 */
export const paymentStatus = asyncHandler(async (req, res) => {
  const orderId = toId(req.params.orderId, 'orderId');
  let o = await loadStatus(orderId, req.user.userId);
  if (!o) throw new HttpError(404, 'Không tìm thấy đơn hàng.');

  if (o.status === 'PENDING' && Date.now() - (lastMomoQuery.get(orderId) ?? 0) > 4000) {
    const [p] = await query(`SELECT TOP 1 Provider, ProviderRef FROM Payments WHERE OrderId = @Id AND Status = 'PENDING' ORDER BY PaymentId DESC`, { Id: orderId });
    if (p?.provider === 'MOMO' && p.providerRef) {
      lastMomoQuery.set(orderId, Date.now());
      try {
        const q = await queryMomoPayment(p.providerRef);
        if (q.resultCode === 0) {
          await confirmPayment({ orderCode: Number(o.orderCode), amount: Number(q.amount), providerRef: p.providerRef, raw: q });
          o = await loadStatus(orderId, req.user.userId);
        }
      } catch (e) {
        console.warn('[momo] hỏi trạng thái thất bại:', e.message);
      }
    }
  }
  const { orderCode, ...rest } = o;
  ok(res, rest);
});

export const paymentsNeedReview = asyncHandler(async (req, res) => {
  const rows = await query('SELECT * FROM vw_PaymentsNeedReview ORDER BY PaidAt DESC');
  ok(res, rows.map((r) => ({ ...r, orderCode: Number(r.orderCode) })));
});

/** POST /api/payments/:orderId/simulate-success - Dành cho dev/test thử nghiệm luồng thanh toán nhanh */
export const simulatePaymentSuccess = asyncHandler(async (req, res) => {
  const orderId = toId(req.params.orderId, 'orderId');
  const [order] = await query('SELECT OrderId, OrderCode, TotalAmount, Status FROM Orders WHERE OrderId = @Id AND UserId = @UserId', {
    Id: orderId, UserId: req.user.userId,
  });
  if (!order) throw new HttpError(404, 'Không tìm thấy đơn hàng.');
  if (order.status !== 'PENDING') throw new HttpError(400, 'Đơn hàng không ở trạng thái chờ thanh toán.');

  const result = await confirmPayment({
    orderCode: Number(order.orderCode),
    amount: order.totalAmount,
    providerRef: `SIMULATED_${Date.now()}`,
    raw: { provider: 'SIMULATED', note: 'Thanh toán giả lập môi trường phát triển (Dev Demo)' },
  });

  ok(res, result, 'Đã giả lập thanh toán thành công!');
});