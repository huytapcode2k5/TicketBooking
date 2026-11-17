import { Router } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import * as pay from '../controllers/payments.controller.js';
import * as tk from '../controllers/tickets.controller.js';

const r = Router();
r.post('/payments/create', requireAuth, validate(pay.createPaymentSchema), pay.createPayment);
r.post('/payments/momo/ipn', pay.handleMomoIpn); // MoMo gọi (IPN), không có JWT: bảo vệ bằng chữ ký
r.get('/payments/:orderId/status', requireAuth, pay.paymentStatus);
r.post('/payments/:orderId/simulate-success', requireAuth, pay.simulatePaymentSuccess); // Dành cho dev/test demo

r.get('/tickets/me', requireAuth, tk.myTickets);
r.get('/tickets/:id', requireAuth, tk.getTicket);

r.post('/staff/checkin', requireAuth, requireRole('STAFF', 'ADMIN'), validate(tk.checkinSchema), tk.checkin);
r.post('/orders/:id/refund', requireAuth, tk.refundOrder(false));
export default r;
