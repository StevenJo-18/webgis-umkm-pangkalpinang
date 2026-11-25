import { Router, type Response } from 'express';
import bcrypt from 'bcryptjs';
import type { DatabaseRepository } from '../db/repository.js';
import {
  AUTH_COOKIE_NAME,
  signAuthToken,
  type AuthenticatedRequest,
} from '../middleware/auth.js';

function setSessionCookie(res: Response, token: string) {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

export function createAuthRouter(repo: DatabaseRepository): Router {
  const router = Router();

  router.post('/register', async (req, res) => {
    try {
      const fullName = typeof req.body?.full_name === 'string' ? req.body.full_name.trim() : '';
      const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
      const password = typeof req.body?.password === 'string' ? req.body.password : '';

      if (fullName.length < 2 || fullName.length > 100) {
        return res.status(400).json({ error: 'Nama lengkap harus 2 hingga 100 karakter.' });
      }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Format alamat email tidak valid.' });
      }
      if (password.length < 6) {
        return res.status(400).json({ error: 'Kata sandi minimal 6 karakter.' });
      }

      const existing = await repo.findUserByEmail(email);
      if (existing) {
        return res.status(409).json({ error: 'Email tersebut sudah terdaftar. Silakan masuk.' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await repo.createUser({
        full_name: fullName,
        email,
        password_hash: passwordHash,
        role: 'user',
      });

      const token = signAuthToken(user);
      setSessionCookie(res, token);

      return res.status(201).json({ user, token });
    } catch (error) {
      console.error('[Auth Register Error]', error);
      return res.status(500).json({ error: 'Terjadi kesalahan saat mendaftarkan akun.' });
    }
  });

  router.post('/login', async (req, res) => {
    try {
      const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
      const password = typeof req.body?.password === 'string' ? req.body.password : '';

      if (!email || !password) {
        return res.status(400).json({ error: 'Email dan kata sandi wajib diisi.' });
      }

      const userRecord = await repo.findUserByEmail(email);
      if (!userRecord) {
        return res.status(401).json({ error: 'Email atau kata sandi salah.' });
      }

      const validPassword = await bcrypt.compare(password, userRecord.password_hash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Email atau kata sandi salah.' });
      }

      const user = {
        user_id: userRecord.user_id,
        full_name: userRecord.full_name,
        email: userRecord.email,
        role: userRecord.role,
        created_at: userRecord.created_at,
      };

      const token = signAuthToken(user);
      setSessionCookie(res, token);

      return res.json({ user, token });
    } catch (error) {
      console.error('[Auth Login Error]', error);
      return res.status(500).json({ error: 'Terjadi kesalahan saat memproses login.' });
    }
  });

  router.post('/logout', (_req, res) => {
    res.clearCookie(AUTH_COOKIE_NAME, { path: '/' });
    return res.json({ ok: true });
  });

  router.get('/me', (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ user: null });
    }
    return res.json({ user: req.user });
  });

  return router;
}
