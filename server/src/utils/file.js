import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const uploadDir = path.resolve(__dirname, '../../uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/** Nếu đầu vào là data URI (base64) thì lưu ra file trong uploads/ và trả về đường dẫn /uploads/<tên_file> */
export function saveDataUri(val) {
  if (typeof val !== 'string' || !val.startsWith('data:image/')) return val;
  try {
    const match = val.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
    if (!match) return val;
    const rawExt = match[1].toLowerCase();
    const ext = rawExt === 'jpeg' ? 'jpg' : rawExt === 'svg+xml' ? 'svg' : rawExt;
    const buffer = Buffer.from(match[2], 'base64');
    const filename = `${crypto.randomBytes(12).toString('hex')}.${ext}`;
    fs.writeFileSync(path.join(uploadDir, filename), buffer);
    return `/uploads/${filename}`;
  } catch (err) {
    console.warn('[upload] Lỗi chuyển đổi data URI sang file:', err.message);
    return val;
  }
}
