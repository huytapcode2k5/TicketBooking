import { z } from 'zod';
import { callProc, query, toId } from '../utils/db.js';
import { HttpError } from '../utils/httpError.js';
import { ok, asyncHandler } from '../utils/response.js';
import { ticketsWithQr } from '../services/ticket.service.js';
import { emitSeatRows } from '../sockets/seat.socket.js';

export const myTickets = asyncHandler(async (req, res) => ok(res, await ticketsWithQr('o.UserId = @UserId', { UserId: req.user.userId })));

export const getTicket = asyncHandler(async (req, res) => {
  const [t] = await ticketsWithQr('t.TicketId = @Id AND o.UserId = @UserId', { Id: toId(req.params.id), UserId: req.user.userId });
  if (!t) throw new HttpError(404, 'Không tìm thấy vé.');
  ok(res, t);
});

/** POST /api/staff/checkin - soát vé bằng mã QR (STAFF/ADMIN). */
export const checkinSchema = z.object({ qrToken: z.string().min(8).max(64) });
export const checkin = asyncHandler(async (req, res) => {
  const { rows } = await callProc('sp_CheckInTicket', { QrToken: req.body.qrToken.trim(), StaffId: req.user.userId });
  ok(res, rows[0]);
});

/** Hoàn vé: người dùng (trước giờ chiếu 24h) hoặc admin. */
export const refundOrder = (isAdmin) =>
  asyncHandler(async (req, res) => {
    const orderId = toId(req.params.id);
    const seats = await query(`SELECT ShowtimeId, SeatId FROM Tickets WHERE OrderId = @Id AND Status = 'VALID'`, { Id: orderId });
    await callProc('sp_RefundOrder', { OrderId: orderId, UserId: req.user.userId, IsAdmin: isAdmin, Reason: req.body?.reason ?? null });
    emitSeatRows('seat:released', seats);
    ok(res, null, 'Đã hoàn vé. Tiền sẽ được hoàn lại theo chính sách của ban tổ chức.');
  });
