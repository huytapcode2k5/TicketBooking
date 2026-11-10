export const ok = (res, data = null, message = 'OK', status = 200) =>
  res.status(status).json({ success: true, data, message });

export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
