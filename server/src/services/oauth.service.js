import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';

const googleClient = new OAuth2Client();
const GRAPH = 'https://graph.facebook.com';

async function getJson(url) {
    try {
        const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
        return await res.json();
    } catch {
        throw new HttpError(502, 'Không kết nối được máy chủ Facebook, vui lòng thử lại.');
    }
}

/**
 * Xác thực "credential" (ID token) mà nút Đăng nhập bằng Google trả về.
 * audience bắt buộc là Client ID của mình: token cấp cho app khác sẽ bị từ chối.
 */
export async function verifyGoogleCredential(credential) {
    if (!env.google.clientId) throw new HttpError(503, 'Chưa cấu hình đăng nhập Google (GOOGLE_CLIENT_ID trong .env).');
    let payload;
    try {
        const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: env.google.clientId });
        payload = ticket.getPayload();
    } catch {
        throw new HttpError(401, 'Mã đăng nhập Google không hợp lệ hoặc đã hết hạn.');
    }
    if (!payload?.sub) throw new HttpError(401, 'Mã đăng nhập Google không hợp lệ.');
    return {
        providerId: payload.sub,
        email: payload.email ? payload.email.toLowerCase() : null,
        emailVerified: payload.email_verified === true,
        name: payload.name || null,
        picture: payload.picture ?? null,
    };
}

/**
 * Xác thực access token Facebook: (1) token còn hiệu lực và do chính app của mình cấp (debug_token),
 * (2) lấy hồ sơ người dùng bằng token đó.
 */
export async function verifyFacebookToken(accessToken) {
    const { appId, appSecret, graphVersion } = env.facebook;
    if (!appId || !appSecret) throw new HttpError(503, 'Chưa cấu hình đăng nhập Facebook (FACEBOOK_APP_ID, FACEBOOK_APP_SECRET trong .env).');

    const dbg = await getJson(`${GRAPH}/debug_token?input_token=${encodeURIComponent(accessToken)}&access_token=${encodeURIComponent(`${appId}|${appSecret}`)}`);
    const d = dbg?.data;
    if (!d?.is_valid || String(d.app_id) !== String(appId)) throw new HttpError(401, 'Mã đăng nhập Facebook không hợp lệ hoặc đã hết hạn.');

    const me = await getJson(`${GRAPH}/${graphVersion}/me?fields=id,name,email,picture.type(large)&access_token=${encodeURIComponent(accessToken)}`);
    if (!me?.id || String(me.id) !== String(d.user_id)) throw new HttpError(401, 'Không lấy được thông tin tài khoản Facebook.');
    return {
        providerId: String(me.id),
        email: me.email ? me.email.toLowerCase() : null,
        emailVerified: Boolean(me.email), // Facebook chỉ trả về email đã xác nhận
        name: me.name || null,
        picture: me.picture?.data?.url ?? null,
    };
}