import { Router } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { requireAuth, PLAN_LIMITS } from '../middleware/auth.js';
import {
  createProject,
  getProjectsByUser,
  getProjectById,
  getOutputsByProject,
  updateProjectStatus,
  saveOutput,
  incrementUsage,
  query,
} from '../lib/db.js';
import { ALL_VERTICALS } from '../config/verticals.js';
import type { Vertical } from '../types/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = join(__dirname, '..', '..', 'uploads');
mkdirSync(UPLOADS_DIR, { recursive: true });

function saveLocally(buffer: Buffer, filename: string): string {
  const dest = join(UPLOADS_DIR, filename);
  writeFileSync(dest, buffer);
  const baseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
  return `${baseUrl}/uploads/${filename}`;
}

// Imported lazily to avoid circular dependency
async function processInBackground(projectId: string, userId: string, vertical: Vertical, imageUrl: string, projectName: string) {
  const { processInBackground: run } = await import('../index.js');
  run(projectId, userId, vertical, imageUrl, projectName);
}

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  },
});

// POST /api/projects/create/:vertical
router.post('/create/:vertical', requireAuth, upload.single('image'), async (req, res) => {
  try {
    const vertical = req.params.vertical as Vertical;
    if (!ALL_VERTICALS.includes(vertical)) {
      res.status(400).json({ success: false, error: `Vertical inválido: ${vertical}` });
      return;
    }

    const { name = 'Sin título' } = req.body;
    const { userId, plan } = req.user;

    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
    if (limits.tours > 0) {
      const [row] = await query<{ count: string }>(
        `SELECT COUNT(*) AS count FROM projects
         WHERE user_id = $1
           AND status IN ('processing', 'completed')
           AND created_at >= DATE_TRUNC('month', NOW())`,
        [userId]
      );
      const used = parseInt(row?.count || '0', 10);
      if (used >= limits.tours) {
        res.status(403).json({
          success: false,
          error: `Has alcanzado el límite de ${limits.tours} tours/mes del plan ${plan}.`,
        });
        return;
      }
    }

    let imageUrl: string;
    if (req.file) {
      const filename = `${uuidv4()}${getExt(req.file.originalname)}`;
      imageUrl = saveLocally(req.file.buffer, filename);
    } else if (req.body.imagePath) {
      imageUrl = req.body.imagePath;
    } else {
      res.status(400).json({ success: false, error: 'Imagen requerida (multipart o imagePath)' });
      return;
    }

    const project = await createProject(userId, name, vertical, imageUrl);

    // Fire and forget — no Redis needed
    processInBackground(project.id, userId, vertical, imageUrl, name);

    res.status(202).json({
      success: true,
      data: { projectId: project.id, jobId: project.id, status: 'processing', vertical, name },
    });
  } catch (err) {
    console.error('Create project error:', err);
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// GET /api/projects
router.get('/', requireAuth, async (req, res) => {
  try {
    const projects = await getProjectsByUser(req.user.userId);
    res.json({ success: true, data: projects });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// GET /api/projects/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const project = await getProjectById(req.params.id);
    if (!project) {
      res.status(404).json({ success: false, error: 'Proyecto no encontrado' });
      return;
    }
    if (project.user_id !== req.user.userId) {
      res.status(403).json({ success: false, error: 'Acceso denegado' });
      return;
    }
    const outputs = await getOutputsByProject(project.id);
    res.json({ success: true, data: { ...project, outputs } });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// GET /api/projects/:id/export/:format
router.get('/:id/export/:format', requireAuth, async (req, res) => {
  try {
    const outputs = await getOutputsByProject(req.params.id);
    const match = outputs.find((o) => o.format === req.params.format);
    if (!match) {
      res.status(404).json({ success: false, error: `No hay output en formato ${req.params.format}` });
      return;
    }
    res.json({ success: true, data: { format: match.format, url: match.url, metadata: match.metadata } });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

function getExt(filename: string): string {
  const match = filename.match(/\.[^.]+$/);
  return match ? match[0] : '.jpg';
}

export default router;
