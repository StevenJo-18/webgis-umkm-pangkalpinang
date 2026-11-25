import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { User } from '../../src/types/index.js';
import type { DatabaseRepository } from '../db/repository.js';

export const AUTH_COOKIE_NAME = 'umkm_pkp_token';

const JWT_SECRET = process.env.JWT_SECRET;

export interface AuthTokenPayload {
  userId: number;
  email: string;
  role: 'admin' | 'user';
}

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export function signAuthToken(user: User): string {
  if (!JWT_SECRET || JWT_SECRET.startsWith('GANTI_') || JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET harus diatur dengan nilai acak minimal 32 karakter.');
  }
  const payload: AuthTokenPayload = {
    userId: user.user_id,
    email: user.email,
    role: user.role,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyAuthToken(token: string): AuthTokenPayload | null {
  if (!JWT_SECRET || JWT_SECRET.startsWith('GANTI_') || JWT_SECRET.length < 32) {
    return null;
  }
  try {
    return jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
  } catch {
    return null;
  }
}

function extractToken(req: Request): string | null {
  const cookieToken = req.cookies?.[AUTH_COOKIE_NAME];
  if (typeof cookieToken === 'string' && cookieToken.length > 0) {
    return cookieToken;
  }
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return null;
}

export function createAuthMiddleware(repo: DatabaseRepository) {
  const attachAuthUser = async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    const token = extractToken(req);
    if (!token) return next();

    const payload = verifyAuthToken(token);
    if (!payload) return next();

    try {
      const user = await repo.findUserById(payload.userId);
      if (user) {
        req.user = user;
      }
    } catch (err) {
      console.error('[Auth] Gagal memuat sesi pengguna:', err);
    }
    return next();
  };

  const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Silakan masuk terlebih dahulu untuk melanjutkan.' });
    }
    return next();
  };

  const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Autentikasi diperlukan.' });
    }
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Akses ditolak. Fitur ini khusus administrator.' });
    }
    return next();
  };

  return { attachAuthUser, requireAuth, requireAdmin };
}
