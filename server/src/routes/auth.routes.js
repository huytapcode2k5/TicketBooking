import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import * as c from '../controllers/auth.controller.js';

const r = Router();
r.post('/auth/register', validate(c.registerSchema), c.register);
r.post('/auth/login', validate(c.loginSchema), c.login);
r.post('/auth/forgot-password', validate(c.forgotSchema), c.forgotPassword);
r.post('/auth/reset-password', validate(c.resetSchema), c.resetPassword);
r.get('/auth/me', requireAuth, c.me);
r.put('/users/me', requireAuth, validate(c.profileSchema), c.updateProfile);
r.put('/users/me/password', requireAuth, validate(c.changePasswordSchema), c.changePassword);
export default r;
