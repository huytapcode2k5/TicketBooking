import { z } from 'zod';
import { query, updateById, toId } from '../utils/db.js';
import { ok, asyncHandler } from '../utils/response.js';
import { HttpError } from '../utils/httpError.js';

// ---------- Combo ----------
export const listProducts = asyncHandler(async (req, res) =>
  ok(res, await query('SELECT ProductId, Name, Description, Price, ImageUrl FROM Products WHERE IsActive = 1 ORDER BY Price')),
);
export const productSchema = z.object({ name: z.string().min(1), description: z.string().optional(), price: z.number().int().min(0), imageUrl: z.string().optional(), isActive: z.boolean().optional() });
export const productUpdateSchema = productSchema.partial().extend({ description: z.string().nullable().optional(), imageUrl: z.string().nullable().optional() });
export const adminListProducts = asyncHandler(async (req, res) => ok(res, await query('SELECT * FROM Products ORDER BY ProductId DESC')));
export const createProduct = asyncHandler(async (req, res) => {
  const b = req.body;
  const [row] = await query('INSERT INTO Products (Name, Description, Price, ImageUrl) OUTPUT INSERTED.* VALUES (@Name, @Description, @Price, @ImageUrl)',
    { Name: b.name, Description: b.description ?? null, Price: b.price, ImageUrl: b.imageUrl ?? null });
  ok(res, row, 'Đã tạo combo', 201);
});
export const updateProduct = asyncHandler(async (req, res) =>
  ok(res, await updateById('Products', 'ProductId', toId(req.params.id), req.body, { name: 'Name', description: 'Description', price: 'Price', imageUrl: 'ImageUrl', isActive: 'IsActive' })),
);

// ---------- Mã giảm giá ----------
export const validateCouponSchema = z.object({ code: z.string().min(1), subTotal: z.number().int().min(0) });

/** Chỉ để xem trước giảm bao nhiêu; số tiền thật do sp_CreateOrder tính lại ở server. */
export const validateCoupon = asyncHandler(async (req, res) => {
  const { code, subTotal } = req.body;
  const [c] = await query(
    `SELECT Code, Description, DiscountType, DiscountValue, MaxDiscount FROM Coupons
     WHERE Code = @Code AND IsActive = 1 AND SYSUTCDATETIME() BETWEEN StartAt AND EndAt
       AND (MaxUses IS NULL OR UsedCount < MaxUses) AND MinOrderAmount <= @SubTotal`,
    { Code: code.trim(), SubTotal: subTotal },
  );
  if (!c) return ok(res, { valid: false, discountAmount: 0 }, 'Mã giảm giá không hợp lệ hoặc chưa đủ điều kiện.');
  let discount = c.discountType === 'PERCENT' ? Math.floor((subTotal * c.discountValue) / 100) : c.discountValue;
  if (c.discountType === 'PERCENT' && c.maxDiscount != null) discount = Math.min(discount, c.maxDiscount);
  ok(res, { valid: true, code: c.code, description: c.description, discountAmount: Math.min(discount, subTotal) }, 'Áp dụng mã thành công');
});

const isoDate = z.string().refine((s) => !Number.isNaN(Date.parse(s)), 'ngày giờ không hợp lệ');
const endAfterStart = (b) => !b.startAt || !b.endAt || new Date(b.endAt) > new Date(b.startAt);
const endAfterStartMsg = { message: 'phải sau thời điểm bắt đầu', path: ['endAt'] };

export const couponSchema = z.object({
  code: z.string().trim().min(1).max(50).regex(/^[A-Za-z0-9_-]+$/, 'chỉ gồm chữ, số, - và _'), description: z.string().optional(),
  discountType: z.enum(['PERCENT', 'FIXED']), discountValue: z.number().int().positive(),
  maxDiscount: z.number().int().positive().optional(), minOrderAmount: z.number().int().min(0).default(0), maxUses: z.number().int().positive().optional(),
  startAt: isoDate, endAt: isoDate,
})
  .refine((b) => b.discountType !== 'PERCENT' || b.discountValue <= 100, { message: 'phần trăm giảm tối đa 100', path: ['discountValue'] })
  .refine(endAfterStart, endAfterStartMsg);
// Không cho đổi mã, loại và giá trị giảm sau khi tạo để không lệch với các đơn đã dùng mã
export const couponUpdateSchema = z.object({
  description: z.string().nullable().optional(), maxDiscount: z.number().int().positive().nullable().optional(),
  minOrderAmount: z.number().int().min(0).optional(), maxUses: z.number().int().positive().nullable().optional(),
  startAt: isoDate.optional(), endAt: isoDate.optional(), isActive: z.boolean().optional(),
}).refine(endAfterStart, endAfterStartMsg);

export const adminListCoupons = asyncHandler(async (req, res) => ok(res, await query('SELECT * FROM Coupons ORDER BY CouponId DESC')));
export const createCoupon = asyncHandler(async (req, res) => {
  const b = req.body;
  const [dup] = await query('SELECT 1 AS x FROM Coupons WHERE Code = @Code', { Code: b.code.toUpperCase() });
  if (dup) throw new HttpError(409, `Mã ${b.code.toUpperCase()} đã tồn tại.`);
  const [row] = await query(
    `INSERT INTO Coupons (Code, Description, DiscountType, DiscountValue, MaxDiscount, MinOrderAmount, MaxUses, StartAt, EndAt)
     OUTPUT INSERTED.* VALUES (@Code, @Description, @DiscountType, @DiscountValue, @MaxDiscount, @MinOrderAmount, @MaxUses, @StartAt, @EndAt)`,
    { Code: b.code.trim().toUpperCase(), Description: b.description ?? null, DiscountType: b.discountType, DiscountValue: b.discountValue, MaxDiscount: b.maxDiscount ?? null,
      MinOrderAmount: b.minOrderAmount, MaxUses: b.maxUses ?? null, StartAt: new Date(b.startAt), EndAt: new Date(b.endAt) },
  );
  ok(res, row, 'Đã tạo mã giảm giá', 201);
});
export const updateCoupon = asyncHandler(async (req, res) => {
  const id = toId(req.params.id);
  const b = { ...req.body };
  if (b.startAt) b.startAt = new Date(b.startAt);
  if (b.endAt) b.endAt = new Date(b.endAt);
  // Chỉ đổi một đầu khoảng thời gian thì so với đầu còn lại đang lưu trong DB
  if (b.startAt || b.endAt) {
    const [cur] = await query('SELECT StartAt, EndAt FROM Coupons WHERE CouponId = @Id', { Id: id });
    if (!cur) throw new HttpError(404, 'Không tìm thấy mã giảm giá.');
    if ((b.endAt ?? cur.endAt) <= (b.startAt ?? cur.startAt)) throw new HttpError(400, 'endAt: phải sau thời điểm bắt đầu');
  }
  ok(res, await updateById('Coupons', 'CouponId', id, b, {
    description: 'Description', maxDiscount: 'MaxDiscount', minOrderAmount: 'MinOrderAmount', maxUses: 'MaxUses',
    startAt: 'StartAt', endAt: 'EndAt', isActive: 'IsActive',
  }), 'Đã cập nhật mã giảm giá');
});

// ---------- Thống kê (dashboard) ----------
// "Hôm nay" tính theo giờ Việt Nam (UTC+7)
function startOfTodayVN() {
  const vnNow = new Date(Date.now() + 7 * 3600 * 1000);
  return new Date(Date.UTC(vnNow.getUTCFullYear(), vnNow.getUTCMonth(), vnNow.getUTCDate()) - 7 * 3600 * 1000);
}

export const statsSummary = asyncHandler(async (req, res) => {
  const [r] = await query(
    `SELECT
       (SELECT ISNULL(SUM(TotalAmount), 0) FROM Orders WHERE Status = 'PAID' AND PaidAt >= @Today) AS RevenueToday,
       (SELECT COUNT(*) FROM Tickets WHERE Status IN ('VALID','USED') AND IssuedAt >= @Today) AS TicketsToday,
       (SELECT COUNT(*) FROM Orders WHERE Status = 'PENDING') AS PendingOrders,
       (SELECT COUNT(*) FROM Tickets t JOIN Showtimes st ON st.ShowtimeId = t.ShowtimeId
         WHERE t.Status IN ('VALID','USED') AND st.Status = 'SCHEDULED' AND st.StartTime > SYSUTCDATETIME()) AS SoldUpcoming,
       (SELECT COUNT(*) FROM Showtimes st JOIN Seats s ON s.RoomId = st.RoomId AND s.IsActive = 1
         WHERE st.Status = 'SCHEDULED' AND st.StartTime > SYSUTCDATETIME()) AS CapacityUpcoming`,
    { Today: startOfTodayVN() },
  );
  ok(res, { ...r, fillRate: r.capacityUpcoming ? Math.round((r.soldUpcoming / r.capacityUpcoming) * 1000) / 10 : 0 });
});

export const revenueByDay = asyncHandler(async (req, res) =>
  ok(res, await query(`SELECT [Date], TotalOrders, Revenue FROM vw_RevenueByDay WHERE [Date] >= DATEADD(DAY, -@Days, CAST(SYSUTCDATETIME() AS DATE)) ORDER BY [Date]`,
    { Days: Math.min(Number(req.query.days) || 7, 90) })),
);
export const revenueByMovie = asyncHandler(async (req, res) =>
  ok(res, await query('SELECT TOP 10 MovieId, Title, TicketsSold, TicketRevenue FROM vw_RevenueByMovie ORDER BY TicketsSold DESC')),
);
export const recentOrders = asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT TOP 10 o.OrderId, o.OrderCode, o.TotalAmount, o.Status, o.CreatedAt, u.FullName
     FROM Orders o JOIN Users u ON u.UserId = o.UserId ORDER BY o.CreatedAt DESC`);
  ok(res, rows.map((o) => ({ ...o, orderCode: Number(o.orderCode) })));
});

// ---------- Thông báo ----------
export const listNotifications = asyncHandler(async (req, res) => {
  const items = await query('SELECT TOP 30 NotificationId, Title, Content, IsRead, CreatedAt FROM Notifications WHERE UserId = @UserId ORDER BY CreatedAt DESC', { UserId: req.user.userId });
  ok(res, { items, unread: items.filter((n) => !n.isRead).length });
});
export const markNotificationRead = asyncHandler(async (req, res) => {
  await query('UPDATE Notifications SET IsRead = 1 WHERE NotificationId = @Id AND UserId = @UserId', { Id: toId(req.params.id), UserId: req.user.userId });
  ok(res, null, 'Đã đọc');
});
