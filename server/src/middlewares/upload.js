import multer from 'multer';
import path from 'node:path';
import crypto from 'node:crypto';

export const upload = multer({
  storage: multer.diskStorage({
    destination: path.resolve('uploads'),
    filename: (req, file, cb) => cb(null, crypto.randomBytes(12).toString('hex') + path.extname(file.originalname).toLowerCase()),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, /^image\/(png|jpe?g|webp|gif)$/.test(file.mimetype)),
});
