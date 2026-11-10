import nodemailer from 'nodemailer';
import QRCode from 'qrcode';
import { env } from '../config/env.js';
import { query } from '../utils/db.js';

let transporter;
function getTransporter() {
  if (!env.smtp.host) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
    });
  }
  return transporter;
}

/** Chưa cấu hình SMTP thì chỉ in ra console để dev vẫn thử được luồng. */
export async function sendMail({ to, subject, html, attachments }) {
  const t = getTransporter();
  if (!t) {
    console.log(`[email:dev] To: ${to} | ${subject}\n${html.replace(/<[^>]+>/g, ' ').slice(0, 400)}`);
    return;
  }
  await t.sendMail({ from: env.smtp.from, to, subject, html, attachments });
}

const fmtTime = (d) => new Date(d).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

/** Gửi vé kèm mã QR sau khi thanh toán thành công (gọi không cần await). */
export async function sendTicketEmail(orderId) {
  try {
    const [order] = await query(
      `SELECT o.OrderCode, o.TotalAmount, u.Email, u.FullName FROM Orders o JOIN Users u ON u.UserId = o.UserId WHERE o.OrderId = @OrderId`,
      { OrderId: orderId },
    );
    if (!order) return;
    const tickets = await query(
      `SELECT t.TicketId, t.QrToken, s.RowLabel + CAST(s.ColNumber AS VARCHAR(3)) AS SeatLabel,
              st.StartTime, m.Title AS MovieTitle, r.Name AS RoomName, c.Name AS CinemaName
       FROM Tickets t
       JOIN Seats s ON s.SeatId = t.SeatId
       JOIN Showtimes st ON st.ShowtimeId = t.ShowtimeId
       JOIN Movies m ON m.MovieId = st.MovieId
       JOIN Rooms r ON r.RoomId = st.RoomId
       JOIN Cinemas c ON c.CinemaId = r.CinemaId
       WHERE t.OrderId = @OrderId ORDER BY s.RowLabel, s.ColNumber`,
      { OrderId: orderId },
    );
    const attachments = [];
    const blocks = [];
    for (const t of tickets) {
      const cid = `qr-${t.ticketId}@tickethub`;
      attachments.push({ filename: `ve-${t.ticketId}.png`, content: await QRCode.toBuffer(t.qrToken, { width: 240, margin: 1 }), cid });
      blocks.push(`<div style="border:1px solid #ddd;border-radius:8px;padding:12px;margin:12px 0">
        <b>${t.movieTitle}</b><br>${t.cinemaName} - ${t.roomName}<br>${fmtTime(t.startTime)}<br>Ghế: <b>${t.seatLabel}</b><br>
        <img src="cid:${cid}" width="160" height="160" alt="QR"></div>`);
    }
    await sendMail({
      to: order.email,
      subject: `Vé của bạn - đơn #${order.orderCode}`,
      html: `<p>Xin chào ${order.fullName}, bạn đã đặt vé thành công (đơn #${order.orderCode}).</p>${blocks.join('')}<p>Đưa mã QR cho nhân viên soát vé khi vào cửa.</p>`,
      attachments,
    });
  } catch (e) {
    console.error('[email] gửi vé thất bại:', e.message);
  }
}
