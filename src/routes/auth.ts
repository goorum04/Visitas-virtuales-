import { Router } from 'express';
import bcrypt from 'bcrypt';
import { createUser, getUserByEmail } from '../lib/db.js';
import { generateToken } from '../middleware/auth.js';
import { ALL_VERTICALS } from '../config/verticals.js';
import type { Vertical } from '../types/index.js';

const router = Router();

router.post('/signup', async (req, res) => {
  try {
    const { email, password, vertical = 'real_estate' } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, error: 'email y contraseña requeridos' });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ success: false, error: 'La contraseña debe tener al menos 8 caracteres' });
      return;
    }
    if (!ALL_VERTICALS.includes(vertical)) {
      res.status(400).json({ success: false, error: `Vertical inválido. Opciones: ${ALL_VERTICALS.join(', ')}` });
      return;
    }

    const existing = await getUserByEmail(email).catch(() => null);
    if (existing) {
      res.status(409).json({ success: false, error: 'Email ya registrado' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await createUser(email, passwordHash, vertical as Vertical);

    const token = generateToken({ userId: user.id, email: user.email, vertical: user.vertical, plan: user.plan });
    res.status(201).json({ success: true, data: { token, email: user.email, vertical: user.vertical, plan: user.plan } });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, error: 'email y contraseña requeridos' });
      return;
    }

    const user = await getUserByEmail(email).catch(() => null);
    if (!user) {
      res.status(401).json({ success: false, error: 'Credenciales inválidas' });
      return;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ success: false, error: 'Credenciales inválidas' });
      return;
    }

    const token = generateToken({ userId: user.id, email: user.email, vertical: user.vertical, plan: user.plan });
    res.json({ success: true, data: { token, email: user.email, vertical: user.vertical, plan: user.plan } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

export default router;
