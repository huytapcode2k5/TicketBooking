import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import * as seats from '../controllers/seats.controller.js';
import * as orders from '../controllers/orders.controller.js';
import * as shop from '../controllers/sales.controller.js';

const r = Router();
r.get('/showtimes/:id/seats', (req, res, next) => (req.headers.authorization ? requireAuth(req, res, next) : next()), seats.getSeats);
r.post('/showtimes/:id/hold', requireAuth, validate(seats.holdSchema), seats.holdSeats);
r.delete('/showtimes/:id/hold', requireAuth, seats.releaseHold);

r.get('/products', shop.listProducts);
r.post('/coupons/validate', requireAuth, validate(shop.validateCouponSchema), shop.validateCoupon);

r.post('/orders', requireAuth, validate(orders.createOrderSchema), orders.createOrder);
r.get('/orders/me', requireAuth, orders.myOrders);
r.get('/orders/:id', requireAuth, orders.getOrder);
r.post('/orders/:id/cancel', requireAuth, orders.cancelOrder);

r.get('/notifications', requireAuth, shop.listNotifications);
r.patch('/notifications/:id/read', requireAuth, shop.markNotificationRead);
export default r;
