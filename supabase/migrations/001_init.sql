-- Image-Blaster SaaS: Database Schema
-- Run: psql $DATABASE_URL -f supabase/migrations/001_init.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===== USERS =====
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  vertical VARCHAR(50) NOT NULL DEFAULT 'real_estate',
  plan VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro', 'enterprise')),
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== PROJECTS =====
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  vertical VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  image_url TEXT,
  export_format VARCHAR(50),
  features JSONB DEFAULT '[]',
  custom_config JSONB DEFAULT '{}',
  api_keys JSONB DEFAULT '{}',
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ===== OUTPUTS =====
CREATE TABLE IF NOT EXISTS outputs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  format VARCHAR(50) NOT NULL,
  url TEXT NOT NULL,
  size_bytes BIGINT DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== INTEGRATIONS =====
CREATE TABLE IF NOT EXISTS integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vertical VARCHAR(50) NOT NULL,
  integration_type VARCHAR(50) NOT NULL,
  credentials JSONB DEFAULT '{}',
  webhook_url TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== ANALYTICS =====
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  value NUMERIC DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== SUBSCRIPTIONS =====
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE,
  plan VARCHAR(20) NOT NULL DEFAULT 'free',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== USAGE TRACKING =====
CREATE TABLE IF NOT EXISTS usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  tours_created INT DEFAULT 0,
  storage_mb NUMERIC DEFAULT 0,
  api_calls INT DEFAULT 0,
  UNIQUE(user_id, month)
);

-- ===== INDEXES =====
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_vertical ON projects(vertical);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_outputs_project_id ON outputs(project_id);
CREATE INDEX IF NOT EXISTS idx_analytics_project_id ON analytics_events(project_id);
CREATE INDEX IF NOT EXISTS idx_usage_user_month ON usage(user_id, month);

-- ===== PLAN LIMITS VIEW =====
CREATE OR REPLACE VIEW plan_limits AS
  SELECT 'free'::TEXT AS plan,        2  AS tours_per_month, FALSE AS custom_branding, FALSE AS api_access
UNION ALL
  SELECT 'starter',                   5,                     FALSE,                    FALSE
UNION ALL
  SELECT 'pro',                       -1,                    TRUE,                     TRUE
UNION ALL
  SELECT 'enterprise',                -1,                    TRUE,                     TRUE;

-- ===== UPDATED_AT TRIGGER =====
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
