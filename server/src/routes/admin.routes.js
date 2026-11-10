import { Router } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { upload } from '../middlewares/upload.js';
import * as a from '../controllers/admin.controller.js';
import * as s from '../controllers/sales.controller.js';
import { paymentsNeedReview } from '../controllers/payments.controller.js';
import { refundOrder } from '../controllers/tickets.controller.js';

const r = Router();
r.use(requireAuth, requireRole('ADMIN'));

// A: nội dung
r.get('/movies', a.adminListMovies);
r.post('/movies', validate(a.movieSchema), a.createMovie);
r.put('/movies/:id', a.updateMovie);
r.delete('/movies/:id', a.hideMovie);
r.post('/cinemas', validate(a.cinemaSchema), a.createCinema);
r.put('/cinemas/:id', a.updateCinema);
r.get('/rooms', a.listRooms);
r.post('/rooms', validate(a.roomSchema), a.createRoom);
r.post('/rooms/:id/generate-seats', validate(a.generateSeatsSchema), a.generateSeats);
r.get('/rooms/:id/seats', a.roomSeats);
r.patch('/seats/:id', a.updateSeat);
r.get('/showtimes', a.adminListShowtimes);
r.post('/showtimes', validate(a.showtimeSchema), a.createShowtime);
r.delete('/showtimes/:id', a.cancelShowtime);
r.get('/users', a.listUsers);
r.patch('/users/:id', validate(a.userSchema), a.updateUser);
r.post('/upload', upload.single('image'), a.uploadImage);

// B: bán hàng + thống kê
r.get('/products', s.adminListProducts);
r.post('/products', validate(s.productSchema), s.createProduct);
r.put('/products/:id', s.updateProduct);
r.get('/coupons', s.adminListCoupons);
r.post('/coupons', validate(s.couponSchema), s.createCoupon);
r.put('/coupons/:id', s.updateCoupon);
r.get('/stats/summary', s.statsSummary);
r.get('/stats/revenue-by-day', s.revenueByDay);
r.get('/stats/revenue-by-movie', s.revenueByMovie);
r.get('/orders/recent', s.recentOrders);

// C: đối soát + hoàn tiền
r.get('/payments/review', paymentsNeedReview);
r.post('/orders/:id/refund', refundOrder(true));
export default r;
