import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { ImageBlasterOrchestrator } from './orchestrator.js';
import type { Vertical, ApiResponse } from './types/index.js';
import { ALL_VERTICALS } from './config/verticals.js';

const app = express();
const orchestrator = new ImageBlasterOrchestrator();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===== Auth middleware =====

function verifyToken(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    res.status(401).json({ success: false, error: 'No token provided' });
    return;
  }
  try {
    (req as any).user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(403).json({ success: false, error: 'Invalid token' });
  }
}

// ===== Health =====

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date(), version: '0.1.0' });
});

// ===== Auth =====

app.post('/auth/signup', async (req, res) => {
  try {
    const { email, password, vertical } = req.body;
    if (!email || !password) {
      res.status(400).json({ success: false, error: 'email and password required' });
      return;
    }
    if (vertical && !ALL_VERTICALS.includes(vertical)) {
      res.status(400).json({ success: false, error: `Invalid vertical. Choose: ${ALL_VERTICALS.join(', ')}` });
      return;
    }
    // TODO: Hash password and persist to Supabase
    const token = jwt.sign({ email, vertical: vertical || 'real_estate' }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ success: true, data: { token, email, vertical } });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ success: false, error: 'email and password required' });
      return;
    }
    // TODO: Verify credentials from Supabase
    const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ success: true, data: { token, email } });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// ===== Projects =====

app.post('/api/projects/create/:vertical', verifyToken, async (req, res) => {
  try {
    const vertical = req.params.vertical as Vertical;
    if (!ALL_VERTICALS.includes(vertical)) {
      res.status(400).json({ success: false, error: `Invalid vertical: ${vertical}` });
      return;
    }

    const { imagePath, name } = req.body;
    if (!imagePath) {
      res.status(400).json({ success: false, error: 'imagePath required' });
      return;
    }

    // In production: save to Supabase, queue job with Bull
    const result = await orchestrator.processImage(vertical, imagePath);

    res.json({
      success: true,
      data: {
        projectName: name || 'Untitled',
        vertical,
        ...result,
      },
    } as ApiResponse);
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

app.get('/api/projects', verifyToken, async (req, res) => {
  try {
    // TODO: Fetch from Supabase filtered by req.user.email
    res.json({ success: true, data: [] });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

app.get('/api/projects/:id', verifyToken, async (req, res) => {
  try {
    // TODO: Fetch from Supabase
    res.json({ success: true, data: { id: req.params.id, status: 'pending' } });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

app.get('/api/projects/:id/export/:format', verifyToken, async (req, res) => {
  try {
    const { id, format } = req.params;
    // TODO: Fetch from storage and stream download
    res.json({ success: true, data: { id, format, downloadUrl: `/output/${id}/asset.${format}` } });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// ===== Analytics =====

app.get('/api/analytics/:projectId/:metric', verifyToken, async (req, res) => {
  try {
    const { projectId, metric } = req.params;
    // TODO: Fetch from analytics store
    res.json({ success: true, data: { projectId, metric, value: 0 } });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// ===== Stripe webhooks =====

app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const event = JSON.parse(req.body.toString());
    if (event.type === 'customer.subscription.updated') {
      console.log('Stripe: subscription updated');
    }
    res.json({ received: true });
  } catch (err) {
    res.status(400).json({ error: 'Webhook Error' });
  }
});

// ===== Start =====

const PORT = parseInt(process.env.PORT || '3001', 10);
app.listen(PORT, () => {
  console.log(`🚀 Image-Blaster API running on port ${PORT}`);
  console.log(`   Verticals: ${ALL_VERTICALS.join(', ')}`);
});

export default app;
