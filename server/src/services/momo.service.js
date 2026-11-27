import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';

const { momo } = env;
const hmac = (raw) => crypto.createHmac('sha256', momo.secretKey).update(raw).digest('hex');
const v = (x) => (x === undefined || x === null ? '' : x);

function assertConfigured() {
    if (!momo.partnerCode || !momo.accessKey || !momo.secretKey) {
        throw new HttpError(503, 'Chưa cấu hình MoMo (MOMO_PARTNER_CODE, MOMO_ACCESS_KEY, MOMO_SECRET_KEY trong .env).');
    }
}

// Chuỗi ký của MoMo: các trường sắp xếp theo thứ tự a-z, ký HMAC-SHA256 bằng secretKey
export const signCreate = (p) =>
    hmac(`accessKey=${momo.accessKey}&amount=${p.amount}&extraData=${v(p.extraData)}&ipnUrl=${p.ipnUrl}&orderId=${p.orderId}&orderInfo=${p.orderInfo}&partnerCode=${p.partnerCode}&redirectUrl=${p.redirectUrl}&requestId=${p.requestId}&requestType=${p.requestType}`);

export const signQuery = (p) => hmac(`accessKey=${momo.accessKey}&orderId=${p.orderId}&partnerCode=${p.partnerCode}&requestId=${p.requestId}`);

export const signIpn = (b) =>
    hmac(`accessKey=${momo.accessKey}&amount=${v(b.amount)}&extraData=${v(b.extraData)}&message=${v(b.message)}&orderId=${v(b.orderId)}&orderInfo=${v(b.orderInfo)}&orderType=${v(b.orderType)}&partnerCode=${v(b.partnerCode)}&payType=${v(b.payType)}&requestId=${v(b.requestId)}&responseTime=${v(b.responseTime)}&resultCode=${v(b.resultCode)}&transId=${v(b.transId)}`);

/** Xác thực IPN MoMo gửi về: đúng chữ ký và đúng partnerCode của mình. */
export function verifyMomoIpn(body) {
    if (!body?.signature || body.partnerCode !== momo.partnerCode) return false;
    const expected = Buffer.from(signIpn(body));
    const actual = Buffer.from(String(body.signature));
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

// orderId gửi MoMo có dạng "<orderCode>_<timestamp>" (MoMo không cho dùng lại orderId nên mỗi lần tạo link là một mã mới)
export const orderCodeFromMomoOrderId = (orderId) => Number(String(orderId).split('_')[0]);

async function post(path, body) {
    let res;
    try {
        res = await fetch(`${momo.endpoint}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(30000), // MoMo khuyến nghị timeout tối thiểu 30 giây
        });
    } catch {
        throw new HttpError(502, 'Không kết nối được MoMo, vui lòng thử lại.');
    }
    return res.json().catch(() => ({}));
}

/** Tạo giao dịch MoMo. Trả về payUrl (trang thanh toán), deeplink và qrCode (chuỗi để vẽ mã QR). */
export async function createMomoPayment({ orderCode, amount, redirectUrl }) {
    assertConfigured();
    if (amount < 1000 || amount > 50_000_000) throw new HttpError(400, 'MoMo chỉ nhận số tiền từ 1.000đ đến 50.000.000đ.');
    const orderId = `${orderCode}_${Date.now()}`;
    const body = {
        partnerCode: momo.partnerCode, partnerName: 'TicketHub', storeId: 'TicketHub',
        requestId: orderId, amount, orderId, orderInfo: `Thanh toan don ${orderCode}`,
        redirectUrl, ipnUrl: `${env.publicUrl}/api/payments/momo/ipn`,
        lang: 'vi', requestType: momo.requestType, autoCapture: true, extraData: '',
    };
    body.signature = signCreate(body);
    const json = await post('/v2/gateway/api/create', body);
    if (json.resultCode !== 0 || !json.payUrl) {
        throw new HttpError(502, `MoMo từ chối tạo giao dịch: ${json.message || 'không rõ lý do'} (mã ${json.resultCode ?? '?'}).`);
    }
    return { momoOrderId: orderId, payUrl: json.payUrl, deeplink: json.deeplink ?? null, qrCode: json.qrCodeUrl ?? null };
}

/** Hỏi MoMo trạng thái giao dịch: dùng khi IPN chưa về (ví dụ chạy local chưa có tunnel). */
export async function queryMomoPayment(momoOrderId) {
    assertConfigured();
    const body = { partnerCode: momo.partnerCode, requestId: `Q${Date.now()}`, orderId: momoOrderId, lang: 'vi' };
    body.signature = signQuery(body);
    return post('/v2/gateway/api/query', body);
}