import 'dotenv/config';

const bool = (v, d = false) => (v === undefined || v === '' ? d : ['1', 'true', 'yes'].includes(String(v).toLowerCase()));

export const env = {
  port: Number(process.env.PORT || 5000),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-doi-di',
  jwtExpires: process.env.JWT_EXPIRES || '7d',
  holdMinutes: Number(process.env.HOLD_MINUTES || 10),
  fakeAuth: bool(process.env.FAKE_AUTH),
  db: {
    server: process.env.DB_SERVER || 'localhost',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
    database: process.env.DB_NAME || 'TicketBookingDB',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    encrypt: bool(process.env.DB_ENCRYPT, false),
    trustCert: bool(process.env.DB_TRUST_CERT, true),
    instanceName: process.env.DB_INSTANCE,
  },
  payos: {
    clientId: process.env.PAYOS_CLIENT_ID,
    apiKey: process.env.PAYOS_API_KEY,
    checksumKey: process.env.PAYOS_CHECKSUM_KEY,
  },
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.MAIL_FROM || 'TicketHub <no-reply@tickethub.local>',
  },
};

if (!process.env.JWT_SECRET) console.warn('[env] Chưa đặt JWT_SECRET, đang dùng giá trị mặc định (chỉ dành cho dev).');
