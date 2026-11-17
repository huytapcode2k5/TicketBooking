import { z } from 'zod';
import { query, callProc, toId } from '../utils/db.js';
import { env } from '../config/env.js';
import { ok, asyncHandler } from '../utils/response.js';
import { HttpError } from '../utils/httpError.js';
import { emitSeats } from '../sockets/seat.socket.js';

export const holdSchema = z.object({ seatIds: z.array(z.number().int().positive()).min(1, 'Chưa chọn ghế nào').max(8, 'Tối đa 8 ghế') });

export const getSeats = asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT SeatId, RowLabel, ColNumber, SeatType, Price, SeatStatus, HeldByUserId, HoldExpiresAt
     FROM vw_ShowtimeSeats WHERE ShowtimeId = @Id ORDER BY RowLabel, ColNumber`,
    { Id: toId(req.params.id) },
  );
  ok(res, rows.map((s) => ({ ...s, heldByMe: s.heldByUserId === req.user?.userId })));
});

const myHolds = (userId, showtimeId) =>
  query('SELECT SeatId FROM SeatHolds WHERE ShowtimeId = @ShowtimeId AND UserId = @UserId', { ShowtimeId: showtimeId, UserId: userId }).then((r) => r.map((x) => x.seatId));

export const holdSeats = asyncHandler(async (req, res) => {
  const showtimeId = toId(req.params.id);
  const before = await myHolds(req.user.userId, showtimeId);
  const { rows } = await callProc('sp_HoldSeats', {
    UserId: req.user.userId, ShowtimeId: showtimeId, SeatIds: req.body.seatIds.join(','), HoldMinutes: env.holdMinutes,
  });
  const now = rows.map((r) => r.seatId);
  emitSeats('seat:released', showtimeId, before.filter((id) => !now.includes(id)));
  emitSeats('seat:held', showtimeId, now);
  ok(res, { seats: rows, expiresAt: rows[0]?.expiresAt }, 'Đã giữ ghế');
});

/** Đơn PENDING còn hạn của user cho suất này (ghế đang giữ thuộc về đơn đó). */
const findPendingOrder = (userId, showtimeId) =>
  query(
    `SELECT TOP 1 o.OrderId, o.OrderCode, o.TotalAmount, o.ExpiresAt FROM Orders o
     WHERE o.UserId = @UserId AND o.Status = 'PENDING' AND o.ExpiresAt > SYSUTCDATETIME()
       AND EXISTS (SELECT 1 FROM OrderItems oi WHERE oi.OrderId = o.OrderId AND oi.ShowtimeId = @ShowtimeId)
     ORDER BY o.CreatedAt DESC`,
    { UserId: userId, ShowtimeId: showtimeId },
  ).then(([o]) => (o ? { ...o, orderCode: Number(o.orderCode) } : null));

export const pendingOrder = asyncHandler(async (req, res) =>
  ok(res, await findPendingOrder(req.user.userId, toId(req.params.id))),
);

export const releaseHold = asyncHandler(async (req, res) => {
  const showtimeId = toId(req.params.id);
  // Bỏ giữ lúc đang có đơn chờ thì người khác mua mất ghế của đơn đó
  if (await findPendingOrder(req.user.userId, showtimeId)) {
    throw new HttpError(409, 'Bạn đang có đơn chờ thanh toán cho suất này. Hãy thanh toán hoặc hủy đơn trước khi chọn lại ghế.', { code: 50007 });
  }
  const ids = await myHolds(req.user.userId, showtimeId);
  await query('DELETE FROM SeatHolds WHERE ShowtimeId = @ShowtimeId AND UserId = @UserId', { ShowtimeId: showtimeId, UserId: req.user.userId });
  emitSeats('seat:released', showtimeId, ids);
  ok(res, null, 'Đã bỏ giữ ghế');
});
