import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth.js';
import projectsRouter from './routes/projects.js';
import webhooksRouter from './routes/webhooks.js';
import { requireAuth } from './middleware/auth.js';
import { getQueueStats } from './lib/queue.js';
import { ALL_VERTICALS } from './config/verticals.js';

const app = express();

app.use(cors({ origin: true })); // allow all origins in dev
app.use(express.json());

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
app.listen(PORT, () => {
  console.log(`🚀 Image-Blaster API v0.2.0 — port ${PORT}`);
  console.log(`   Verticals: ${ALL_VERTICALS.join(', ')}`);
  console.log(`   Worker: npm run worker`);
});

export default app;
