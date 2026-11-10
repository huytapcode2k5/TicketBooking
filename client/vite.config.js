import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev: client chạy ở :5173, proxy API/ảnh/socket sang server :5000 nên không bị lỗi CORS
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5000',
      '/uploads': 'http://localhost:5000',
      '/socket.io': { target: 'http://localhost:5000', ws: true },
    },
  },
});
