import { Router } from 'express';
import auth from './auth.routes.js';
import catalog from './catalog.routes.js';
import booking from './booking.routes.js';
import payment from './payment.routes.js';
import admin from './admin.routes.js';

const router = Router();
router.get('/health', (req, res) => res.json({ success: true, message: 'TicketHub API đang chạy', time: new Date().toISOString() }));
router.use(auth);
router.use(catalog);
router.use(booking);
router.use(payment);
router.use('/admin', admin);
export default router;
