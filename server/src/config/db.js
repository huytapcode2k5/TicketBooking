import sql from 'mssql';
import { env } from './env.js';

let poolPromise;

/** Pool kết nối dùng chung toàn server (tạo lười, lỗi thì thử lại lần sau). */
export function getPool() {
  if (!poolPromise) {
    const config = {
      server: env.db.server,
      database: env.db.database,
      user: env.db.user,
      password: env.db.password,
      options: {
        encrypt: env.db.encrypt,
        trustServerCertificate: env.db.trustCert,
      },
      pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
    };

    if (env.db.port) {
      config.port = env.db.port;
    }
    if (env.db.instanceName) {
      config.options.instanceName = env.db.instanceName;
    }

    poolPromise = new sql.ConnectionPool(config)
      .connect()
      .catch((err) => {
        poolPromise = undefined;
        throw err;
      });
  }
  return poolPromise;
}

export { sql };
