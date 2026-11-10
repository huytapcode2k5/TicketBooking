import { HttpError } from '../utils/httpError.js';

export const validate =
  (schema, source = 'body') =>
  (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const msg = result.error.issues.map((i) => `${i.path.join('.') || 'dữ liệu'}: ${i.message}`).join('; ');
      return next(new HttpError(400, msg));
    }
    req[source] = result.data;
    next();
  };
