import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middlewares/validate.js';
import { ok, asyncHandler } from '../utils/response.js';
import { HttpError } from '../utils/httpError.js';
import { chat } from '../services/chatbot.service.js';

const r = Router();

// Khách gửi cả đoạn hội thoại gần nhất (server không lưu), tin cuối là câu hỏi mới
const chatSchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(['user', 'assistant']), text: z.string().trim().min(1).max(1000) }))
    .min(1)
    .max(20)
    .refine((m) => m[m.length - 1].role === 'user', 'tin nhắn cuối phải là câu hỏi của khách'),
});

// Giới hạn đơn giản theo IP để không đốt hết lượt miễn phí của Gemini: 15 câu / 5 phút
const WINDOW_MS = 5 * 60 * 1000;
const LIMIT = 15;
const hits = new Map();
function rateLimit(req, res, next) {
  const now = Date.now();
  const key = req.ip;
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= LIMIT) return next(new HttpError(429, 'Bạn hỏi hơi nhanh, đợi vài phút rồi hỏi tiếp nhé.'));
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear(); // tránh phình bộ nhớ
  next();
}

r.post(
  '/chat',
  rateLimit,
  validate(chatSchema),
  asyncHandler(async (req, res) => {
    const reply = await chat(req.body.messages.slice(-12));
    ok(res, { reply });
  }),
);

export default r;
