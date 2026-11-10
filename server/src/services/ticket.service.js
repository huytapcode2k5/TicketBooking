import QRCode from 'qrcode';
import { query } from '../utils/db.js';

const BASE = `
  SELECT t.TicketId, t.Status, t.QrToken, t.Price, t.IssuedAt, t.CheckedInAt,
         s.RowLabel + CAST(s.ColNumber AS VARCHAR(3)) AS SeatLabel, s.SeatType,
         st.ShowtimeId, st.StartTime, st.EndTime,
         m.Title AS MovieTitle, m.PosterUrl, r.Name AS RoomName, c.Name AS CinemaName, c.Address,
         o.OrderId, o.OrderCode
  FROM Tickets t
  JOIN Orders o ON o.OrderId = t.OrderId
  JOIN Seats s ON s.SeatId = t.SeatId
  JOIN Showtimes st ON st.ShowtimeId = t.ShowtimeId
  JOIN Movies m ON m.MovieId = st.MovieId
  JOIN Rooms r ON r.RoomId = st.RoomId
  JOIN Cinemas c ON c.CinemaId = r.CinemaId`;

/** where: chuỗi cố định trong code (không lấy từ người dùng); giá trị truyền qua params. */
export async function ticketsWithQr(where, params) {
  const rows = await query(`${BASE} WHERE ${where} ORDER BY st.StartTime DESC, s.RowLabel, s.ColNumber`, params);
  return Promise.all(
    rows.map(async (t) => ({ ...t, orderCode: Number(t.orderCode), qrDataUrl: await QRCode.toDataURL(t.qrToken, { margin: 1, width: 260 }) })),
  );
}
