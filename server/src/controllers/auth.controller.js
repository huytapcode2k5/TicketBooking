import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { z } from 'zod';
import { query } from '../utils/db.js';
import { signToken } from '../utils/jwt.js';
import { HttpError } from '../utils/httpError.js';
import { ok, asyncHandler } from '../utils/response.js';
import { sendMail } from '../services/email.service.js';
import { env } from '../config/env.js';

export const registerSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
  fullName: z.string().min(2, 'Nhập họ tên'),
  phone: z.string().optional(),
});
export const loginSchema = z.object({ email: z.string().email('Email không hợp lệ'), password: z.string().min(1, 'Nhập mật khẩu') });
export const forgotSchema = z.object({ email: z.string().email('Email không hợp lệ') });
export const resetSchema = z.object({ token: z.string().min(10), password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự') });

const publicUser = (u) => ({ userId: u.userId, email: u.email, fullName: u.fullName, phone: u.phone, avatarUrl: u.avatarUrl, role: u.role });
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

export const register = asyncHandler(async (req, res) => {
  const { email, password, fullName, phone } = req.body;
  const exists = await query('SELECT 1 AS x FROM Users WHERE Email = @Email', { Email: email });
  if (exists.length) throw new HttpError(409, 'Email này đã được đăng ký.');
  const hash = await bcrypt.hash(password, 10);
  const [user] = await query(
    `INSERT INTO Users (Email, PasswordHash, FullName, Phone) OUTPUT INSERTED.* VALUES (@Email, @Hash, @FullName, @Phone)`,
    { Email: email, Hash: hash, FullName: fullName, Phone: phone ?? null },
  );
  ok(res, { token: signToken(user), user: publicUser(user) }, 'Đăng ký thành công', 201);
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const [user] = await query('SELECT * FROM Users WHERE Email = @Email', { Email: email });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw new HttpError(401, 'Email hoặc mật khẩu không đúng.');
  if (!user.isActive) throw new HttpError(403, 'Tài khoản đã bị khóa.');
  ok(res, { token: signToken(user), user: publicUser(user) }, 'Đăng nhập thành công');
});

export const me = asyncHandler(async (req, res) => {
  const [user] = await query('SELECT * FROM Users WHERE UserId = @UserId', { UserId: req.user.userId });
  if (!user) throw new HttpError(404, 'Không tìm thấy tài khoản.');
  ok(res, publicUser(user));
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const [user] = await query('SELECT UserId, Email FROM Users WHERE Email = @Email AND IsActive = 1', { Email: req.body.email });
  if (user) {
    const token = crypto.randomBytes(32).toString('hex');
    await query(
      `INSERT INTO PasswordResetTokens (UserId, TokenHash, ExpiresAt) VALUES (@UserId, @Hash, DATEADD(MINUTE, 30, SYSUTCDATETIME()))`,
      { UserId: user.userId, Hash: sha256(token) },
    );
    const link = `${env.clientUrl}/reset-password?token=${token}`;
    await sendMail({ to: user.email, subject: 'Đặt lại mật khẩu TicketHub', html: `<p>Bấm vào liên kết để đặt lại mật khẩu (hiệu lực 30 phút):</p><p><a href="${link}">${link}</a></p>` });
  }
  ok(res, null, 'Nếu email tồn tại, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.');
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  const [row] = await query(
    `SELECT TokenId, UserId FROM PasswordResetTokens WHERE TokenHash = @Hash AND UsedAt IS NULL AND ExpiresAt > SYSUTCDATETIME()`,
    { Hash: sha256(token) },
  );
  if (!row) throw new HttpError(400, 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.');
  await query('UPDATE Users SET PasswordHash = @Hash, UpdatedAt = SYSUTCDATETIME() WHERE UserId = @UserId', {
    Hash: await bcrypt.hash(password, 10),
    UserId: row.userId,
  });
  await query('UPDATE PasswordResetTokens SET UsedAt = SYSUTCDATETIME() WHERE TokenId = @TokenId', { TokenId: row.tokenId });
  ok(res, null, 'Đã đặt lại mật khẩu, bạn có thể đăng nhập.');
});

// ---- Hồ sơ cá nhân ----
export const profileSchema = z.object({ fullName: z.string().min(2).optional(), phone: z.string().optional(), avatarUrl: z.string().optional() });
export const changePasswordSchema = z.object({ oldPassword: z.string().min(1), newPassword: z.string().min(6, 'Mật khẩu mới tối thiểu 6 ký tự') });

export const updateProfile = asyncHandler(async (req, res) => {
  const { fullName, phone, avatarUrl } = req.body;
  const [user] = await query(
    `UPDATE Users SET FullName = COALESCE(@FullName, FullName), Phone = COALESCE(@Phone, Phone), AvatarUrl = COALESCE(@AvatarUrl, AvatarUrl),
            UpdatedAt = SYSUTCDATETIME() OUTPUT INSERTED.* WHERE UserId = @UserId`,
    { FullName: fullName ?? null, Phone: phone ?? null, AvatarUrl: avatarUrl ?? null, UserId: req.user.userId },
  );
  ok(res, publicUser(user), 'Đã cập nhật hồ sơ');
});

export const changePassword = asyncHandler(async (req, res) => {
  const [user] = await query('SELECT PasswordHash FROM Users WHERE UserId = @UserId', { UserId: req.user.userId });
  if (!(await bcrypt.compare(req.body.oldPassword, user.passwordHash))) throw new HttpError(400, 'Mật khẩu cũ không đúng.');
  await query('UPDATE Users SET PasswordHash = @Hash, UpdatedAt = SYSUTCDATETIME() WHERE UserId = @UserId', {
    Hash: await bcrypt.hash(req.body.newPassword, 10),
    UserId: req.user.userId,
  });
  ok(res, null, 'Đã đổi mật khẩu');
});
