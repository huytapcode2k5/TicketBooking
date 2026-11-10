import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const signToken = (user) =>
  jwt.sign({ userId: user.userId, role: user.role, email: user.email }, env.jwtSecret, { expiresIn: env.jwtExpires });

export const verifyToken = (token) => jwt.verify(token, env.jwtSecret);
