import { getIO } from './io.js';

/** User đã đăng nhập (token trong handshake) tự vào phòng riêng user:{id}. */
export function registerPaymentSocket(io, socket) {
  const user = socket.data.user;
  if (user?.userId) socket.join(`user:${user.userId}`);
}

/** event: payment:success | notification:new */
export function emitToUser(userId, event, payload = {}) {
  getIO()?.to(`user:${userId}`).emit(event, payload);
}
