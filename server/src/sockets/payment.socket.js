import { getIO } from './io.js';

/** User đã đăng nhập (token trong handshake) tự vào phòng riêng user:{id} và role:{role}. */
export function registerPaymentSocket(io, socket) {
  const user = socket.data.user;
  if (user?.userId) socket.join(`user:${user.userId}`);
  if (user?.role === 'ADMIN') socket.join('role:admin');
}

/** event: payment:success | notification:new */
export function emitToUser(userId, event, payload = {}) {
  getIO()?.to(`user:${userId}`).emit(event, payload);
}

/** Phát thông báo realtime tới toàn bộ Admin đang online trên trang admin */
export function emitToAdmin(event, payload = {}) {
  getIO()?.to('role:admin').emit(event, payload);
}
