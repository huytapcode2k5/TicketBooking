import { HttpError } from '../utils/httpError.js';

export function notFound(req, res) {
  res.status(404).json({ success: false, data: null, message: 'Không tìm thấy đường dẫn.' });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  if (status >= 500) console.error('[error]', err.message);
  // HttpError do mình chủ động ném thì hiện message; lỗi lạ (SQL, code) chỉ hiện thông báo chung
  const message = err instanceof HttpError ? err.message : status >= 500 ? 'Lỗi máy chủ, vui lòng thử lại sau.' : err.message;
  res.status(status).json({ success: false, data: null, message, code: err.code });
}
