import { PayOS } from '@payos/node';
import { env } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';

let client;
function getClient() {
  if (!client) {
    const { clientId, apiKey, checksumKey } = env.payos;
    if (!clientId || !apiKey || !checksumKey) {
      throw new HttpError(503, 'Chưa cấu hình PayOS (PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY trong .env).');
    }
    client = new PayOS({ clientId, apiKey, checksumKey });
  }
  return client;
}

export async function createPaymentLink({ orderId, orderCode, amount, expiresAt }) {
  const payload = {
    orderCode,
    amount,
    description: `TH ${orderCode}`.slice(0, 25), // PayOS giới hạn độ dài nội dung
    items: [{ name: `Don hang ${orderCode}`, quantity: 1, price: amount }],
    returnUrl: `${env.clientUrl}/payment/result?orderId=${orderId}`,
    cancelUrl: `${env.clientUrl}/payment/result?orderId=${orderId}&cancelled=1`,
  };
  // Đồng bộ hạn link với hạn giữ ghế (bỏ qua nếu còn quá ít thời gian, ví dụ khi demo HOLD_MINUTES=1)
  const expiredAt = Math.floor(new Date(expiresAt).getTime() / 1000);
  if (expiredAt - Date.now() / 1000 > 120) payload.expiredAt = expiredAt;
  return getClient().paymentRequests.create(payload);
}

/** Xác thực chữ ký webhook; ném lỗi nếu sai. */
export const verifyWebhook = (body) => getClient().webhooks.verify(body);

/** Huỷ link thanh toán (không ném lỗi nếu link không còn). */
export async function cancelPaymentLink(orderCode, reason = 'Nguoi dung huy') {
  try {
    await getClient().paymentRequests.cancel(Number(orderCode), reason);
  } catch (e) {
    console.warn('[payos] huỷ link không thành công:', e.message);
  }
}
