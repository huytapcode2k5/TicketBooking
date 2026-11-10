const TZ = 'Asia/Ho_Chi_Minh'; // Server lưu UTC, hiển thị theo giờ Việt Nam

export const vnd = (n) => `${new Intl.NumberFormat('vi-VN').format(n ?? 0)}đ`;
export const fmtTime = (d) => new Date(d).toLocaleTimeString('vi-VN', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
export const fmtDate = (d) => new Date(d).toLocaleDateString('vi-VN', { timeZone: TZ, weekday: 'short', day: '2-digit', month: '2-digit' });
export const fmtDateTime = (d) => `${fmtTime(d)} ${new Date(d).toLocaleDateString('vi-VN', { timeZone: TZ })}`;
export const dayKey = (d) => new Date(d).toLocaleDateString('en-CA', { timeZone: TZ }); // YYYY-MM-DD theo giờ VN

export const imgUrl = (u) =>
  !u ? 'https://placehold.co/300x450/151B2E/FFFFFF?text=TicketHub' : u.startsWith('http') ? u : `${import.meta.env.VITE_API_URL || ''}${u}`;

export const SEAT_TYPE_LABEL = { NORMAL: 'Thường', VIP: 'VIP', COUPLE: 'Ghế đôi' };
