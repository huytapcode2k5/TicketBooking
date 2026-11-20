import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

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
    port: Number(process.env.DB_PORT || 1433),
    database: process.env.DB_NAME || 'TicketBookingDB',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    encrypt: bool(process.env.DB_ENCRYPT, false),
    trustCert: bool(process.env.DB_TRUST_CERT, true),
  },
  payos: {
    clientId: process.env.PAYOS_CLIENT_ID,
    apiKey: process.env.PAYOS_API_KEY,
    checksumKey: process.env.PAYOS_CHECKSUM_KEY,
  },
  // URL công khai của server (Cloudflare Tunnel / ngrok) để cổng thanh toán gọi IPN/webhook về
  publicUrl: (process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}`).replace(/\/$/, ''),
  // Đăng nhập mạng xã hội: ID công khai gửi cho client, App Secret của Facebook chỉ dùng ở server
  google: { clientId: process.env.GOOGLE_CLIENT_ID },
  facebook: { appId: process.env.FACEBOOK_APP_ID, appSecret: process.env.FACEBOOK_APP_SECRET, graphVersion: process.env.FACEBOOK_GRAPH_VERSION || 'v21.0' },
  momo: {
    partnerCode: process.env.MOMO_PARTNER_CODE,
    accessKey: process.env.MOMO_ACCESS_KEY,
    secretKey: process.env.MOMO_SECRET_KEY,
    endpoint: (process.env.MOMO_ENDPOINT || 'https://test-payment.momo.vn').replace(/\/$/, ''),
    requestType: process.env.MOMO_REQUEST_TYPE || 'captureWallet',
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