import http from 'node:http';
import { env } from './config/env.js';
import app from './app.js';
import { initSockets } from './sockets/index.js';
import { startExpireHoldsJob } from './jobs/expireHolds.job.js';
import { getPool } from './config/db.js';

const server = http.createServer(app);
initSockets(server);
startExpireHoldsJob();

server.listen(env.port, async () => {
  console.log(`TicketHub API: http://localhost:${env.port}/api/health`);
  try {
    await getPool();
    console.log(`Đã kết nối SQL Server (${env.db.server}/${env.db.database})`);
  } catch (e) {
    console.error('Chưa kết nối được SQL Server:', e.message, '\n→ Kiểm tra cấu hình DB_* trong file .env và trạng thái dịch vụ SQL Server.');
  }
});
