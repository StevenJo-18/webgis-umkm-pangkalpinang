import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cookieParser from 'cookie-parser';
import { createServer as createViteServer } from 'vite';
import { createDatabaseRepository } from './server/db/index.js';
import { createAuthMiddleware } from './server/middleware/auth.js';
import { createAuthRouter } from './server/routes/auth.js';
import { createUmkmRouter } from './server/routes/umkm.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function bootstrap() {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.startsWith('GANTI_') || jwtSecret.length < 32) {
    throw new Error('JWT_SECRET harus diatur dengan nilai acak minimal 32 karakter pada file .env.');
  }

  const repo = await createDatabaseRepository();
  const app = express();
  const port = Number(process.env.PORT ?? 3000);

  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  const authGuards = createAuthMiddleware(repo);
  app.use(authGuards.attachAuthUser);

  app.get('/api/health', async (_req, res) => {
    const status = await repo.healthCheck();
    res.status(status.ok ? 200 : 503).json(status);
  });

  app.use('/api/auth', createAuthRouter(repo));
  app.use('/api', createUmkmRouter(repo, authGuards));

  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`[Server] WebGIS UMKM Pangkalpinang berjalan di http://0.0.0.0:${port}`);
  });
}

bootstrap().catch((err) => {
  console.error('[Fatal Server Error]', err);
  process.exit(1);
});
