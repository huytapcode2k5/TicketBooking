import { io } from 'socket.io-client';

let socket;

/** Một kết nối Socket.IO dùng chung; gửi token để server cho vào phòng riêng của user. */
export function getSocket() {
  if (!socket) {
    socket = io(import.meta.env.VITE_API_URL || undefined, {
      auth: (cb) => cb({ token: localStorage.getItem('token') }),
    });
  }
  return socket;
}

/** Gọi sau khi đăng nhập/đăng xuất để kết nối lại với token mới. */
export function resetSocket() {
  socket?.disconnect();
  socket = undefined;
}
