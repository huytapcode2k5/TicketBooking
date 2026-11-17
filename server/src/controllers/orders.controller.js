import { z } from 'zod';
import { query, callProc, toId } from '../utils/db.js';
import { HttpError } from '../utils/httpError.js';
import { ok, asyncHandler } from '../utils/response.js';
import { cancelPaymentLink } from '../services/payment.service.js';
import { emitSeats } from '../sockets/seat.socket.js';

export const createOrderSchema = z.object({
  showtimeId: z.number().int().positive(),
  seatIds: z.array(z.number().int().positive()).min(1).max(8),
  couponCode: z.string().optional(),
  combos: z.array(z.object({ productId: z.number().int(), quantity: z.number().int().min(1).max(20) })).optional(),
});

export const createOrder = asyncHandler(async (req, res) => {
  const { showtimeId, seatIds, couponCode, combos } = req.body;
  const { rows } = await callProc('sp_CreateOrder', {
    UserId: req.user.userId, ShowtimeId: showtimeId, SeatIds: seatIds.join(','),
    CouponCode: couponCode?.trim() || null, CombosJson: combos?.length ? JSON.stringify(combos) : null,
  });
  const { replacedOrderCode, ...o } = rows[0];
  // Đơn chờ cũ của cùng suất vừa bị thay: hủy link PayOS để khách không trả nhầm 2 lần
  if (replacedOrderCode) cancelPaymentLink(replacedOrderCode, 'Thay bang don moi');
  ok(res, { ...o, orderCode: Number(o.orderCode) }, 'Đã tạo đơn hàng', 201);
});

export const myOrders = asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT o.OrderId, o.OrderCode, o.TotalAmount, o.Status, o.CreatedAt, o.ExpiresAt,
            (SELECT TOP 1 m.Title FROM OrderItems oi JOIN Showtimes st ON st.ShowtimeId = oi.ShowtimeId JOIN Movies m ON m.MovieId = st.MovieId
              WHERE oi.OrderId = o.OrderId AND oi.ItemType = 'TICKET') AS MovieTitle
     FROM Orders o WHERE o.UserId = @UserId ORDER BY o.CreatedAt DESC`,
    { UserId: req.user.userId },
  );
  ok(res, rows.map((o) => ({ ...o, orderCode: Number(o.orderCode) })));
});

export const getOrder = asyncHandler(async (req, res) => {
  const id = toId(req.params.id);
  const [order] = await query(
    `SELECT o.OrderId, o.OrderCode, o.UserId, o.SubTotal, o.DiscountAmount, o.TotalAmount, o.Status, o.ExpiresAt, o.CreatedAt, o.PaidAt, c.Code AS CouponCode
     FROM Orders o LEFT JOIN Coupons c ON c.CouponId = o.CouponId WHERE o.OrderId = @Id`, { Id: id });
  if (!order || (order.userId !== req.user.userId && req.user.role !== 'ADMIN')) throw new HttpError(404, 'Không tìm thấy đơn hàng.');
  order.orderCode = Number(order.orderCode);
  order.items = await query(
    `SELECT oi.ItemType, oi.UnitPrice, oi.Quantity, s.RowLabel + CAST(s.ColNumber AS VARCHAR(3)) AS SeatLabel, s.SeatType, p.Name AS ProductName,
            m.Title AS MovieTitle, st.StartTime, st.ShowtimeId, r.Name AS RoomName, c.Name AS CinemaName
     FROM OrderItems oi
     LEFT JOIN Seats s ON s.SeatId = oi.SeatId
     LEFT JOIN Products p ON p.ProductId = oi.ProductId
     LEFT JOIN Showtimes st ON st.ShowtimeId = oi.ShowtimeId
     LEFT JOIN Movies m ON m.MovieId = st.MovieId
     LEFT JOIN Rooms r ON r.RoomId = st.RoomId
     LEFT JOIN Cinemas c ON c.CinemaId = r.CinemaId
     WHERE oi.OrderId = @Id ORDER BY oi.ItemType, s.RowLabel, s.ColNumber`, { Id: id });
  ok(res, order);
});

/** Hủy đơn chưa thanh toán: nhả ghế + hủy link PayOS. */
export const cancelOrder = asyncHandler(async (req, res) => {
  const id = toId(req.params.id);
  const seats = await query(`SELECT oi.ShowtimeId, oi.SeatId, o.OrderCode FROM OrderItems oi JOIN Orders o ON o.OrderId = oi.OrderId
                             WHERE oi.OrderId = @Id AND oi.ItemType = 'TICKET' AND o.UserId = @UserId`, { Id: id, UserId: req.user.userId });
  await callProc('sp_CancelOrder', { OrderId: id, UserId: req.user.userId, Reason: req.body?.reason ?? 'Người dùng hủy' });
  if (seats[0]) cancelPaymentLink(seats[0].orderCode);
  const byShowtime = new Map();
  for (const s of seats) byShowtime.set(s.showtimeId, [...(byShowtime.get(s.showtimeId) ?? []), s.seatId]);
  for (const [showtimeId, ids] of byShowtime) emitSeats('seat:released', showtimeId, ids);
  ok(res, null, 'Đã hủy đơn hàng');
});
