import { z } from 'zod';
import { query } from '../utils/db.js';
import { signToken } from '../utils/jwt.js';
import { HttpError } from '../utils/httpError.js';
import { ok, asyncHandler } from '../utils/response.js';
import { env } from '../config/env.js';
import { verifyGoogleCredential, verifyFacebookToken } from '../services/oauth.service.js';
import { publicUser } from './auth.controller.js';

export const googleSchema = z.object({ credential: z.string().min(20, 'Thiếu mã đăng nhập Google') });
export const facebookSchema = z.object({ accessToken: z.string().min(20, 'Thiếu mã đăng nhập Facebook') });

// Tên cột lấy từ danh sách cố định này, không bao giờ từ dữ liệu người dùng
const COLUMN = { google: 'GoogleId', facebook: 'FacebookId' };
const LABEL = { google: 'Google', facebook: 'Facebook' };

/** Cấu hình công khai để client biết hiện nút nào (chỉ ID công khai, không có secret). */
export const oauthConfig = asyncHandler(async (req, res) =>
    ok(res, { googleClientId: env.google.clientId || null, facebookAppId: env.facebook.appId || null, facebookVersion: env.facebook.graphVersion }),
);

/**
 * Tìm hoặc tạo tài khoản cho người đăng nhập bằng mạng xã hội:
 * 1) đã từng liên kết -> đăng nhập;  2) trùng email đã xác thực với tài khoản có sẵn -> liên kết rồi đăng nhập;  3) chưa có -> tạo mới.
 */
async function findOrCreateUser(provider, profile) {
    const col = COLUMN[provider];
    const key = col.charAt(0).toLowerCase() + col.slice(1);

    let [user] = await query(`SELECT * FROM Users WHERE ${col} = @Pid`, { Pid: profile.providerId });

    if (!user && profile.email) {
        const [byEmail] = await query('SELECT * FROM Users WHERE Email = @Email', { Email: profile.email });
        if (byEmail) {
            if (!profile.emailVerified) throw new HttpError(409, 'Email này đã được đăng ký. Hãy đăng nhập bằng mật khẩu.');
            if (byEmail[key] && byEmail[key] !== profile.providerId) throw new HttpError(409, `Tài khoản này đã liên kết với một tài khoản ${LABEL[provider]} khác.`);
            [user] = await query(
                `UPDATE Users SET ${col} = @Pid, AvatarUrl = COALESCE(AvatarUrl, @Avatar), UpdatedAt = SYSUTCDATETIME() OUTPUT INSERTED.* WHERE UserId = @UserId`,
                { Pid: profile.providerId, Avatar: profile.picture, UserId: byEmail.userId },
            );
        }
    }

    if (!user) {
        // Nếu nhà cung cấp (đặc biệt là Facebook) không trả về email (do đăng ký bằng SĐT hoặc không cấp quyền email)
        // -> tự động tạo email đại diện duy nhất theo Provider ID để người dùng vẫn đăng nhập thành công
        const userEmail = (profile.email || `${provider === 'facebook' ? 'fb' : 'gg'}_${profile.providerId}@${provider}.tickethub.vn`).slice(0, 255);
        const userName = (profile.name || (profile.email ? profile.email.split('@')[0] : `Người dùng ${LABEL[provider]}`)).slice(0, 150);
        const pid = String(profile.providerId).slice(0, 64);

        const [byFallback] = await query('SELECT * FROM Users WHERE Email = @Email', { Email: userEmail });
        if (byFallback) {
            [user] = await query(
                `UPDATE Users SET ${col} = @Pid, AvatarUrl = COALESCE(AvatarUrl, @Avatar), UpdatedAt = SYSUTCDATETIME() OUTPUT INSERTED.* WHERE UserId = @UserId`,
                { Pid: pid, Avatar: profile.picture, UserId: byFallback.userId },
            );
        } else {
            [user] = await query(
                `INSERT INTO Users (Email, PasswordHash, FullName, AvatarUrl, ${col}) OUTPUT INSERTED.* VALUES (@Email, NULL, @Name, @Avatar, @Pid)`,
                { Email: userEmail, Name: userName, Avatar: profile.picture, Pid: pid },
            );
        }
    }

    if (!user.isActive) throw new HttpError(403, 'Tài khoản đã bị khóa.');
    return user;
}

const respond = (res, user) => ok(res, { token: signToken(user), user: publicUser(user) }, 'Đăng nhập thành công');

export const googleLogin = asyncHandler(async (req, res) => {
    respond(res, await findOrCreateUser('google', await verifyGoogleCredential(req.body.credential)));
});

export const facebookLogin = asyncHandler(async (req, res) => {
    respond(res, await findOrCreateUser('facebook', await verifyFacebookToken(req.body.accessToken)));
});