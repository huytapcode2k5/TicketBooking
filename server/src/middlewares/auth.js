import { env } from '../config/env.js';
import { verifyToken } from '../utils/jwt.js';
import { HttpError } from '../utils/httpError.js';

function readUser(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try {
      return verifyToken(token);
    } catch {
      throw new HttpError(401, 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.');
    }
  }
  // Chỉ dev: giả lập user khi chưa có auth thật (FAKE_AUTH=true)
  if (env.fakeAuth) return { userId: 3, role: req.headers['x-fake-role'] || 'USER', email: 'fake@dev.local' };
  return null;
}

export function requireAuth(req, res, next) {
  try {
    const user = readUser(req);
    if (!user) throw new HttpError(401, 'Bạn cần đăng nhập.');
    req.user = user;
    next();
  } catch (e) {
    next(e);
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(new HttpError(401, 'Bạn cần đăng nhập.'));
    if (!roles.includes(req.user.role)) return next(new HttpError(403, 'Bạn không có quyền thực hiện thao tác này.'));
    next();
  };
}
