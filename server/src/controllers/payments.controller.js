import { z } from 'zod';
import { query, callProc, toId } from '../utils/db.js';
import { HttpError } from '../utils/httpError.js';
import { ok, asyncHandler } from '../utils/response.js';
import { env } from '../config/env.js';
import { createMomoPayment, queryMomoPayment, verifyMomoIpn, orderCodeFromMomoOrderId } from '../services/momo.service.js';
import { sendTicketEmail } from '../services/email.service.js';
import { emitToUser, emitToAdmin } from '../sockets/payment.socket.js';
import { emitSeatRows } from '../sockets/seat.socket.js';

export const createPaymentSchema = z.object({
  orderId: z.number().int().positive(),
  provider: z.string().optional().default('MOMO'),
});

/**
 * Xác nhận thanh toán qua MoMo: gọi sp_ConfirmPayment (idempotent),
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
    // Không có đơn (ví dụ IPN thử khi đăng ký URL): không coi là lỗi để MoMo không gửi lại mãi
    if (e.status === 400) return { result: 'ORDER_NOT_FOUND', message: e.message };
    throw e;
  }

  if (result.result === 'SUCCESS') {
    const seats = await query('SELECT ShowtimeId, SeatId FROM Tickets WHERE OrderId = @Id', { Id: result.orderId });
    emitSeatRows('seat:sold', seats);
    emitToUser(result.userId, 'payment:success', { orderId: result.orderId });
    emitToUser(result.userId, 'notification:new', {});

    // Tạo thông báo và phát realtime đến trang Admin
    try {
      const [orderInfo] = await query(
        `SELECT o.OrderCode, o.TotalAmount, u.FullName,
                (SELECT TOP 1 m.Title FROM OrderItems oi
                 JOIN Showtimes st ON st.ShowtimeId = oi.ShowtimeId
                 JOIN Movies m ON m.MovieId = st.MovieId
                 WHERE oi.OrderId = o.OrderId AND oi.ItemType = 'TICKET') AS MovieTitle,
                (SELECT COUNT(*) FROM Tickets WHERE OrderId = o.OrderId) AS TicketCount
         FROM Orders o
         JOIN Users u ON u.UserId = o.UserId
         WHERE o.OrderId = @Id`,
        { Id: result.orderId },
      );

      if (orderInfo) {
        const notifTitle = 'Khách đặt vé thành công';
        const notifContent = `${orderInfo.fullName} vừa thanh toán đơn #${orderInfo.orderCode} (${orderInfo.ticketCount} vé "${orderInfo.movieTitle || 'Sự kiện'}"): ${Number(orderInfo.totalAmount).toLocaleString('vi-VN')} đ`;

        // 1. Lưu thông báo cho tất cả Admin trong DB
        const admins = await query("SELECT UserId FROM Users WHERE Role = 'ADMIN'");
        for (const adm of admins) {
          await query(
            `INSERT INTO Notifications (UserId, Title, Content, IsRead, CreatedAt)
             VALUES (@UserId, @Title, @Content, 0, SYSUTCDATETIME())`,
            { UserId: adm.userId, Title: notifTitle, Content: notifContent },
          ).catch(() => {});
          emitToUser(adm.userId, 'notification:new', {});
        }

        // Lưu thông báo cho chính khách hàng đặt vé
        const customerTitle = `Đặt vé thành công (#${orderInfo.orderCode})`;
        const customerContent = `Bạn đã đặt thành công ${orderInfo.ticketCount} vé phim "${orderInfo.movieTitle || 'Sự kiện'}". Nhấn vào đây để xem chi tiết vé vừa đặt.`;
        await query(
          `INSERT INTO Notifications (UserId, Title, Content, IsRead, CreatedAt)
           VALUES (@UserId, @Title, @Content, 0, SYSUTCDATETIME())`,
          { UserId: result.userId, Title: customerTitle, Content: customerContent },
        ).catch(() => {});
        emitToUser(result.userId, 'notification:new', {});

        // 2. Phát sự kiện popup realtime tới Admin trên trang admin
        emitToAdmin('admin:order_success', {
          orderId: result.orderId,
          orderCode: Number(orderInfo.orderCode),
          fullName: orderInfo.fullName,
          movieTitle: orderInfo.movieTitle,
          ticketCount: orderInfo.ticketCount,
          totalAmount: orderInfo.totalAmount,
          title: notifTitle,
          content: notifContent,
        });
      }
    } catch (err) {
      // Bỏ qua lỗi thông báo để không ảnh hưởng thanh toán
    }

    sendTicketEmail(result.orderId); // không await: không chặn phản hồi cho cổng thanh toán
  } else if (result.result !== 'ALREADY_PAID') {
    console.warn(`[payment] đơn ${orderCode}: ${result.result} (xem vw_PaymentsNeedReview)`);
  }
  return result;
}

/** POST /api/payments/create { orderId } - tạo link/QR MoMo cho đơn PENDING của chính user. */
export const createPayment = asyncHandler(async (req, res) => {
  const { orderId } = req.body;
  const [order] = await query('SELECT OrderId, OrderCode, TotalAmount, Status, ExpiresAt FROM Orders WHERE OrderId = @Id AND UserId = @UserId', {
    Id: orderId, UserId: req.user.userId,
  });
  if (!order) throw new HttpError(404, 'Không tìm thấy đơn hàng.');
  if (order.status !== 'PENDING') throw new HttpError(400, 'Đơn hàng không còn ở trạng thái chờ thanh toán.');
  if (new Date(order.expiresAt) <= new Date()) throw new HttpError(400, 'Đơn hàng đã hết hạn giữ chỗ. Vui lòng chọn lại ghế.');

  const base = { provider: 'MOMO', orderId: order.orderId, orderCode: Number(order.orderCode), amount: order.totalAmount, expiresAt: order.expiresAt };

  // Đã có link MoMo đang chờ thì dùng lại, tránh tạo trùng
  const [existing] = await query(
    `SELECT TOP 1 PaymentId, CheckoutUrl, RawPayload FROM Payments
     WHERE OrderId = @Id AND Provider = 'MOMO' AND Status = 'PENDING' AND CheckoutUrl IS NOT NULL ORDER BY PaymentId DESC`,
    { Id: order.orderId },
  );
  if (existing) {
    return ok(res, { ...base, checkoutUrl: existing.checkoutUrl, ...JSON.parse(existing.rawPayload ?? '{}') });
  }

  const m = await createMomoPayment({ 
    orderCode: base.orderCode, 
    amount: base.amount, 
    redirectUrl: `${env.clientUrl}/payment/result?orderId=${order.orderId}` 
  });
  const info = { qrCode: m.qrCode, deeplink: m.deeplink };

  await query(
    `INSERT INTO Payments (OrderId, Provider, ProviderRef, CheckoutUrl, Amount, Status, RawPayload) VALUES (@OrderId, 'MOMO', @Ref, @Url, @Amount, 'PENDING', @Raw)`,
    { OrderId: order.orderId, Ref: m.momoOrderId, Url: m.payUrl, Amount: order.totalAmount, Raw: JSON.stringify(info) },
  );
  ok(res, { ...base, checkoutUrl: m.payUrl, ...info }, 'Đã tạo thanh toán MoMo', 201);
});

/**
 * POST /api/payments/momo/ipn - MoMo gọi (IPN) khi giao dịch có kết quả.
 * MoMo yêu cầu phản hồi HTTP 204; sai chữ ký thì từ chối.
 */
export const handleMomoIpn = asyncHandler(async (req, res) => {
  const body = req.body ?? {};
  if (!verifyMomoIpn(body)) return res.status(400).json({ success: false, message: 'Chữ ký IPN không hợp lệ.' });
  const orderCode = orderCodeFromMomoOrderId(body.orderId);
  if (Number(body.resultCode) !== 0 || !Number.isFinite(orderCode)) return res.status(204).end(); // giao dịch thất bại/hủy
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
