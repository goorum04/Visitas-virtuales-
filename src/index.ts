import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { readFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import authRouter from './routes/auth.js';
import projectsRouter from './routes/projects.js';
import webhooksRouter from './routes/webhooks.js';
import { requireAuth } from './middleware/auth.js';
import { getQueueStats } from './lib/queue.js';
import { query } from './lib/db.js';
import { ALL_VERTICALS } from './config/verticals.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function runMigrations() {
  try {
    const sqlPath = join(__dirname, '..', 'supabase', 'migrations', '001_init.sql');
    const sql = readFileSync(sqlPath, 'utf-8');
    await query(sql);
    console.log('✅ DB schema initialized');

    // Seed demo user
    const bcrypt = await import('bcrypt');
    const hash = await bcrypt.hash('demo1234', 12);
    await query(
      `INSERT INTO users (email, password_hash, vertical, plan)
       VALUES ($1, $2, 'real_estate', 'pro')
       ON CONFLICT (email) DO NOTHING`,
      ['demo@visitas.com', hash]
    );
    console.log('✅ Demo user ready: demo@visitas.com / demo1234');
  } catch (err) {
    console.error('⚠️ Migration failed:', (err as Error).message);
  }
}

const app = express();

// Serve uploaded images publicly
const UPLOADS_DIR = join(__dirname, '..', 'uploads');
mkdirSync(UPLOADS_DIR, { recursive: true });

app.use(cors({ origin: true }));
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR));

// ===== Routes =====
app.use('/auth', authRouter);
app.use('/api/projects', projectsRouter);
app.use('/webhooks', webhooksRouter);

// Health + stats
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date(), version: '0.2.0', verticals: ALL_VERTICALS });
});

app.get('/api/stats', requireAuth, async (_req, res) => {
  try {
    const queue = await getQueueStats();
    res.json({ success: true, data: { queue } });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// 404
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint no encontrado' });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: 'Error interno del servidor' });
});

const PORT = parseInt(process.env.PORT || '3001', 10);

runMigrations().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Image-Blaster API v0.2.0 — port ${PORT}`);
    console.log(`   Verticals: ${ALL_VERTICALS.join(', ')}`);
    console.log(`   Worker: npm run worker`);
  });
});

export default app;
