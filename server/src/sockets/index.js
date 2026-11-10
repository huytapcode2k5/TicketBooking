import { Server } from 'socket.io';
import { env } from '../config/env.js';
import { verifyToken } from '../utils/jwt.js';
import { setIO } from './io.js';
import { registerSeatSocket } from './seat.socket.js';
import { registerPaymentSocket } from './payment.socket.js';

export function initSockets(httpServer) {
  const io = new Server(httpServer, { cors: { origin: env.clientUrl, credentials: true } });
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (token) {
      try {
        socket.data.user = verifyToken(token);
      } catch {
        /* token sai: vẫn cho kết nối như khách */
      }
    }
    next();
  });
  io.on('connection', (socket) => {
    registerSeatSocket(io, socket);
    registerPaymentSocket(io, socket);
  });
  setIO(io);
  return io;
}
