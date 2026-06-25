
/*
# AI Go Goal - Schema Part 1: Core Tables

Creates profiles, user_roles, teams, matches tables with basic policies.
AI predictions, settings, triggers, and indexes in part 2.
*/

-- ENUMS
DO $$ BEGIN
  CREATE TYPE app_role AS ENUM ('admin', 'player');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE match_status AS ENUM ('scheduled', 'live', 'finished', 'postponed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================
-- USER_ROLES TABLE (created first for policy refs)
-- =============================================
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'player',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_roles_select_own" ON user_roles;
CREATE POLICY "user_roles_select_own" ON user_roles FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "user_roles_insert_admin" ON user_roles;
CREATE POLICY "user_roles_insert_admin" ON user_roles FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "user_roles_update_admin" ON user_roles;
CREATE POLICY "user_roles_update_admin" ON user_roles FOR UPDATE
  TO authenticated USING (true);

DROP POLICY IF EXISTS "user_roles_delete_admin" ON user_roles;
CREATE POLICY "user_roles_delete_admin" ON user_roles FOR DELETE
  TO authenticated USING (true);

-- =============================================
-- PROFILES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  username text UNIQUE,
  province text NOT NULL DEFAULT 'กรุงเทพมหานคร',
  country text NOT NULL DEFAULT 'Thailand',
  email text,
  is_ai boolean NOT NULL DEFAULT false,
  is_banned boolean NOT NULL DEFAULT false,
  total_points integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_public" ON profiles;
CREATE POLICY "profiles_select_public" ON profiles FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id OR 
    EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
  ) WITH CHECK (auth.uid() = id OR
    EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
  );

DROP POLICY IF EXISTS "profiles_delete_admin" ON profiles;
CREATE POLICY "profiles_delete_admin" ON profiles FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
  );

-- =============================================
-- TEAMS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL,
  flag text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teams_select_public" ON teams;
CREATE POLICY "teams_select_public" ON teams FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "teams_insert_admin" ON teams;
CREATE POLICY "teams_insert_admin" ON teams FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
  );

DROP POLICY IF EXISTS "teams_update_admin" ON teams;
CREATE POLICY "teams_update_admin" ON teams FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
  );

DROP POLICY IF EXISTS "teams_delete_admin" ON teams;
CREATE POLICY "teams_delete_admin" ON teams FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
  );

-- =============================================
-- MATCHES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text UNIQUE,
  home_team text NOT NULL,
  away_team text NOT NULL,
  home_team_code text NOT NULL DEFAULT '',
  away_team_code text NOT NULL DEFAULT '',
  home_team_flag text NOT NULL DEFAULT '',
  away_team_flag text NOT NULL DEFAULT '',
  kickoff_time timestamptz NOT NULL,
  stage text NOT NULL DEFAULT 'Group Stage',
  group_name text,
  home_score integer,
  away_score integer,
  status match_status NOT NULL DEFAULT 'scheduled',
  lot_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "matches_select_public" ON matches;
CREATE POLICY "matches_select_public" ON matches FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "matches_insert_admin" ON matches;
CREATE POLICY "matches_insert_admin" ON matches FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
  );

DROP POLICY IF EXISTS "matches_update_admin" ON matches;
CREATE POLICY "matches_update_admin" ON matches FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
  );

DROP POLICY IF EXISTS "matches_delete_admin" ON matches;
CREATE POLICY "matches_delete_admin" ON matches FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
  );

-- =============================================
-- PREDICTIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  home_score_pred integer NOT NULL CHECK (home_score_pred >= 0 AND home_score_pred <= 30),
  away_score_pred integer NOT NULL CHECK (away_score_pred >= 0 AND away_score_pred <= 30),
  points integer,
  is_exact boolean,
  is_correct_result boolean,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, match_id)
);

ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "predictions_select_public" ON predictions;
CREATE POLICY "predictions_select_public" ON predictions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "predictions_insert_own" ON predictions;
CREATE POLICY "predictions_insert_own" ON predictions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "predictions_update_own" ON predictions;
CREATE POLICY "predictions_update_own" ON predictions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "predictions_delete_own" ON predictions;
CREATE POLICY "predictions_delete_own" ON predictions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- =============================================
-- AI_PREDICTIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS ai_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  ai_id text NOT NULL CHECK (ai_id IN ('gemini', 'deepseek', 'claude')),
  home_score_pred integer,
  away_score_pred integer,
  headline text,
  analysis text,
  scenario text,
  full_text text,
  lot_id text,
  is_current boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(match_id, ai_id)
);

ALTER TABLE ai_predictions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_predictions_select_public" ON ai_predictions;
CREATE POLICY "ai_predictions_select_public" ON ai_predictions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "ai_predictions_insert_admin" ON ai_predictions;
CREATE POLICY "ai_predictions_insert_admin" ON ai_predictions FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
  );

DROP POLICY IF EXISTS "ai_predictions_update_admin" ON ai_predictions;
CREATE POLICY "ai_predictions_update_admin" ON ai_predictions FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
  );

DROP POLICY IF EXISTS "ai_predictions_delete_admin" ON ai_predictions;
CREATE POLICY "ai_predictions_delete_admin" ON ai_predictions FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
  );

-- =============================================
-- SETTINGS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings_select_public" ON settings;
CREATE POLICY "settings_select_public" ON settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "settings_insert_admin" ON settings;
CREATE POLICY "settings_insert_admin" ON settings FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
  );

DROP POLICY IF EXISTS "settings_update_admin" ON settings;
CREATE POLICY "settings_update_admin" ON settings FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
  );

DROP POLICY IF EXISTS "settings_delete_admin" ON settings;
CREATE POLICY "settings_delete_admin" ON settings FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
  );

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_predictions_user_id ON predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_predictions_match_id ON predictions(match_id);
CREATE INDEX IF NOT EXISTS idx_matches_kickoff ON matches(kickoff_time);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_profiles_total_points ON profiles(total_points DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_province ON profiles(province);
CREATE INDEX IF NOT EXISTS idx_profiles_country ON profiles(country);
CREATE INDEX IF NOT EXISTS idx_ai_predictions_match ON ai_predictions(match_id);
CREATE INDEX IF NOT EXISTS idx_ai_predictions_current ON ai_predictions(is_current);
