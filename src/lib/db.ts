import pg from 'pg';
import type { Vertical, JobStatus } from '../types/index.js';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  ssl: process.env.DATABASE_URL?.includes('railway') || process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
});

pool.on('error', (err) => {
  console.error('DB pool error:', err.message);
});

export async function query<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await pool.query(sql, params);
  return result.rows as T[];
}

export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

// ===== Users =====

export interface DbUser {
  id: string;
  email: string;
  password_hash: string;
  vertical: Vertical;
  plan: string;
  stripe_customer_id: string | null;
  created_at: Date;
}

export async function createUser(
  email: string,
  passwordHash: string,
  vertical: Vertical
): Promise<DbUser> {
  const [row] = await query<DbUser>(
    `INSERT INTO users (email, password_hash, vertical)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [email, passwordHash, vertical]
  );
  return row;
}

export async function getUserByEmail(email: string): Promise<DbUser | null> {
  return queryOne<DbUser>('SELECT * FROM users WHERE email = $1', [email]);
}

export async function getUserById(id: string): Promise<DbUser | null> {
  return queryOne<DbUser>('SELECT * FROM users WHERE id = $1', [id]);
}

// ===== Projects =====

export interface DbProject {
  id: string;
  user_id: string;
  name: string;
  vertical: Vertical;
  status: JobStatus;
  image_url: string | null;
  export_format: string | null;
  features: string[];
  custom_config: Record<string, unknown>;
  error: string | null;
  created_at: Date;
  completed_at: Date | null;
}

export async function createProject(
  userId: string,
  name: string,
  vertical: Vertical,
  imageUrl: string,
  features: string[] = []
): Promise<DbProject> {
  const [row] = await query<DbProject>(
    `INSERT INTO projects (user_id, name, vertical, image_url, features)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [userId, name, vertical, imageUrl, JSON.stringify(features)]
  );
  return row;
}

export async function updateProjectStatus(
  id: string,
  status: JobStatus,
  error?: string
): Promise<void> {
  await query(
    `UPDATE projects
     SET status = $1::text,
         error = $2,
         completed_at = CASE WHEN $1::text IN ('completed','failed') THEN NOW() ELSE NULL END
     WHERE id = $3`,
    [status, error ?? null, id]
  );
}

export async function getProjectsByUser(userId: string): Promise<DbProject[]> {
  return query<DbProject>(
    'SELECT * FROM projects WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
}

export async function getProjectById(id: string): Promise<DbProject | null> {
  return queryOne<DbProject>('SELECT * FROM projects WHERE id = $1', [id]);
}

// ===== Outputs =====

export interface DbOutput {
  id: string;
  project_id: string;
  format: string;
  url: string;
  size_bytes: number;
  metadata: Record<string, unknown>;
  created_at: Date;
}

export async function saveOutput(
  projectId: string,
  format: string,
  url: string,
  sizeBytes: number,
  metadata: Record<string, unknown> = {}
): Promise<DbOutput> {
  const [row] = await query<DbOutput>(
    `INSERT INTO outputs (project_id, format, url, size_bytes, metadata)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [projectId, format, url, sizeBytes, JSON.stringify(metadata)]
  );
  return row;
}

export async function getOutputsByProject(projectId: string): Promise<DbOutput[]> {
  return query<DbOutput>('SELECT * FROM outputs WHERE project_id = $1', [projectId]);
}

// ===== Usage =====

export async function incrementUsage(userId: string): Promise<void> {
  await query(
    `INSERT INTO usage (user_id, month, tours_created)
     VALUES ($1, DATE_TRUNC('month', NOW()), 1)
     ON CONFLICT (user_id, month)
     DO UPDATE SET tours_created = usage.tours_created + 1`,
    [userId]
  );
}

export async function getMonthlyUsage(userId: string): Promise<number> {
  const row = await queryOne<{ tours_created: number }>(
    `SELECT tours_created FROM usage
     WHERE user_id = $1 AND month = DATE_TRUNC('month', NOW())`,
    [userId]
  );
  return row?.tours_created ?? 0;
}

export { pool };
