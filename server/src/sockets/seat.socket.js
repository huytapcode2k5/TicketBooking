import { getIO } from './io.js';

/** Client vào phòng của suất chiếu để nhận cập nhật ghế realtime. */
export function registerSeatSocket(io, socket) {
  socket.on('showtime:join', (id) => socket.join(`showtime:${Number(id)}`));
  socket.on('showtime:leave', (id) => socket.leave(`showtime:${Number(id)}`));
}

/** event: seat:held | seat:released | seat:sold */
export function emitSeats(event, showtimeId, seatIds) {
  if (!seatIds?.length) return;
  getIO()?.to(`showtime:${showtimeId}`).emit(event, { showtimeId, seatIds });
}

/** Gom danh sách {showtimeId, seatId} theo suất rồi phát sự kiện. */
export function emitSeatRows(event, rows) {
  const byShowtime = new Map();
  for (const r of rows) {
    if (!byShowtime.has(r.showtimeId)) byShowtime.set(r.showtimeId, []);
    byShowtime.get(r.showtimeId).push(r.seatId);
  }
  for (const [showtimeId, seatIds] of byShowtime) emitSeats(event, showtimeId, seatIds);
}
