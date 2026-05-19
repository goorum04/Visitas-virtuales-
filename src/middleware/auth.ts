import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getUserById } from '../lib/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

export interface AuthPayload {
  userId: string;
  email: string;
  vertical: string;
  plan: string;
}

declare global {
  namespace Express {
    interface Request {
      user: AuthPayload;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    res.status(401).json({ success: false, error: 'Token requerido' });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
    req.user = payload;
    next();
  } catch {
    res.status(403).json({ success: false, error: 'Token inválido o expirado' });
  }
}

export function generateToken(payload: AuthPayload, expiresIn = '30d'): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn } as jwt.SignOptions);
}

export const PLAN_LIMITS: Record<string, { tours: number; apiAccess: boolean }> = {
  free:       { tours: 2,  apiAccess: false },
  starter:    { tours: 5,  apiAccess: false },
  pro:        { tours: -1, apiAccess: true },
  enterprise: { tours: -1, apiAccess: true },
};
