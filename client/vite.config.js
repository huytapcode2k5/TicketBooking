import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const backendTarget = 'http://127.0.0.1:5000';

const handleProxyError = (proxy) => {
  proxy.on('error', (err, _req, res) => {
    // Bỏ qua cảnh báo ECONNRESET / ECONNREFUSED khi server backend đang reload/restart
    if (['ECONNRESET', 'ECONNREFUSED', 'EPIPE'].includes(err.code) || err.message?.includes('ECONNRESET')) {
      if (res && !res.headersSent && typeof res.writeHead === 'function') {
        res.writeHead(502, { 'Content-Type': 'text/plain' });
        res.end('Backend server is restarting...');
      }
      return;
    }
    console.error('[vite proxy error]', err.message);
  });
};

// Dev: client chạy ở :5173, proxy API/ảnh/socket sang server :5000
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: backendTarget,
        changeOrigin: true,
        configure: handleProxyError,
      },
      '/uploads': {
        target: backendTarget,
        changeOrigin: true,
        configure: handleProxyError,
      },
      '/socket.io': {
        target: backendTarget,
        ws: true,
        changeOrigin: true,
        configure: handleProxyError,
      },
    },
  },
});
