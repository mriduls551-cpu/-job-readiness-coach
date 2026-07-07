-- SQLite Schema for Job Readiness Coach
-- This schema mirrors the Supabase schema for easy migration later

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT,
  role TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Assessments Table
CREATE TABLE IF NOT EXISTS assessments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('career_fit', 'quick_check')),
  responses TEXT NOT NULL,  -- JSON stored as TEXT
  role_scores TEXT,         -- JSON stored as TEXT
  selected_role TEXT,
  status TEXT DEFAULT 'in_progress' CHECK(status IN ('in_progress', 'completed')),
  completed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_assessments_user_id ON assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_assessments_status ON assessments(status);

-- Assessment Feedback Table
CREATE TABLE IF NOT EXISTS assessment_feedback (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  assessment_id TEXT NOT NULL,
  rating TEXT NOT NULL CHECK(rating IN ('helpful', 'unhelpful')),
  comment TEXT NOT NULL DEFAULT '',
  locale TEXT NOT NULL DEFAULT 'en' CHECK(locale IN ('en', 'hi')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
  UNIQUE(user_id, assessment_id)
);

CREATE INDEX IF NOT EXISTS idx_assessment_feedback_user_id ON assessment_feedback(user_id);

-- D1 Waitlist Table
CREATE TABLE IF NOT EXISTS d1_waitlist (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  assessment_id TEXT NOT NULL,
  selected_role_id TEXT NOT NULL,
  contact_consent INTEGER NOT NULL DEFAULT 0,
  note TEXT NOT NULL DEFAULT '',
  locale TEXT NOT NULL DEFAULT 'en' CHECK(locale IN ('en', 'hi')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
  UNIQUE(user_id, assessment_id)
);

CREATE INDEX IF NOT EXISTS idx_d1_waitlist_user_id ON d1_waitlist(user_id);

-- Funnel Events Table
CREATE TABLE IF NOT EXISTS funnel_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  properties TEXT NOT NULL DEFAULT '{}',
  locale TEXT NOT NULL DEFAULT 'en' CHECK(locale IN ('en', 'hi')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_funnel_events_user_id ON funnel_events(user_id);
CREATE INDEX IF NOT EXISTS idx_funnel_events_event_name ON funnel_events(event_name);

-- Public Shares Table
CREATE TABLE IF NOT EXISTS public_shares (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  assessment_id TEXT NOT NULL,
  public_id TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'en' CHECK(locale IN ('en', 'hi')),
  role_id TEXT NOT NULL,
  role_name TEXT NOT NULL,
  role_summary TEXT NOT NULL,
  dimension_snapshot TEXT NOT NULL,
  confidence_band TEXT NOT NULL CHECK(confidence_band IN ('low', 'medium', 'high')),
  visit_count INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_visited_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_public_shares_user_id ON public_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_public_shares_public_id ON public_shares(public_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_public_shares_user_assessment ON public_shares(user_id, assessment_id);

-- Resumes Table
CREATE TABLE IF NOT EXISTS resumes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  title TEXT,
  summary TEXT,
  email TEXT,
  phone TEXT,
  location TEXT,
  skills TEXT,        -- JSON array as TEXT
  experience TEXT,    -- JSON array as TEXT
  education TEXT,     -- JSON array as TEXT
  certifications TEXT, -- JSON array as TEXT
  projects TEXT,      -- JSON array as TEXT
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id);

-- Applications Table
CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  company_name TEXT NOT NULL,
  role_title TEXT NOT NULL,
  status TEXT DEFAULT 'applied' CHECK(status IN ('applied', 'interview', 'offered', 'rejected')),
  application_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);

-- Action Plans Table
CREATE TABLE IF NOT EXISTS action_plans (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  week_number INTEGER NOT NULL,
  tasks TEXT NOT NULL,  -- JSON array as TEXT
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'completed', 'archived')),
  generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_action_plans_user_id ON action_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_action_plans_status ON action_plans(status);

-- Enable foreign keys by default
PRAGMA foreign_keys = ON;
