
/*
# AI Go Goal - Schema Part 2: Functions, Triggers, and Seeds

- Helper functions: has_role, calc_points
- Triggers: handle_new_user, recalc_predictions_for_match
- Default settings
- Admin user and AI player seeds
*/

-- =============================================
-- HELPER FUNCTION: has_role
-- =============================================
CREATE OR REPLACE FUNCTION has_role(uid uuid, check_role app_role)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = uid AND role = check_role
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =============================================
-- HELPER FUNCTION: calc_points
-- =============================================
CREATE OR REPLACE FUNCTION calc_points(
  pred_h integer, pred_a integer,
  act_h integer, act_a integer
) RETURNS integer AS $$
BEGIN
  IF act_h IS NULL OR act_a IS NULL THEN RETURN NULL; END IF;
  IF pred_h = act_h AND pred_a = act_a THEN RETURN 3; END IF;
  IF (pred_h > pred_a AND act_h > act_a) OR
     (pred_h < pred_a AND act_h < act_a) OR
     (pred_h = pred_a AND act_h = act_a) THEN RETURN 1; END IF;
  RETURN 0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =============================================
-- TRIGGER: handle_new_user (auto-create profile)
-- =============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, email, first_name, last_name, username, province, country)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'province', 'กรุงเทพมหานคร'),
    COALESCE(NEW.raw_user_meta_data->>'country', 'Thailand')
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO user_roles (user_id, role)
  VALUES (NEW.id, 'player')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================
-- TRIGGER: recalc_predictions_for_match
-- =============================================
CREATE OR REPLACE FUNCTION recalc_predictions_for_match()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'finished' AND NEW.home_score IS NOT NULL AND NEW.away_score IS NOT NULL THEN
    UPDATE predictions
    SET
      points = calc_points(home_score_pred, away_score_pred, NEW.home_score, NEW.away_score),
      is_exact = (home_score_pred = NEW.home_score AND away_score_pred = NEW.away_score),
      is_correct_result = (
        (home_score_pred > away_score_pred AND NEW.home_score > NEW.away_score) OR
        (home_score_pred < away_score_pred AND NEW.home_score < NEW.away_score) OR
        (home_score_pred = away_score_pred AND NEW.home_score = NEW.away_score)
      ),
      updated_at = now()
    WHERE match_id = NEW.id;

    UPDATE profiles p
    SET total_points = (
      SELECT COALESCE(SUM(pr.points), 0)
      FROM predictions pr
      WHERE pr.user_id = p.id AND pr.points IS NOT NULL
    ),
    updated_at = now()
    WHERE p.id IN (
      SELECT DISTINCT user_id FROM predictions WHERE match_id = NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_match_finished ON matches;
CREATE TRIGGER on_match_finished
  AFTER UPDATE ON matches
  FOR EACH ROW
  WHEN (NEW.status = 'finished')
  EXECUTE FUNCTION recalc_predictions_for_match();

-- =============================================
-- DEFAULT SETTINGS
-- =============================================
INSERT INTO settings (key, value) VALUES
  ('leaderboard_title', 'Season 1'),
  ('weekly_prize', 'ยังไม่มีรางวัลประจำสัปดาห์นี้'),
  ('weekly_winner', 'ยังไม่มีผู้โชคดีสัปดาห์ล่าสุด'),
  ('affiliate_link', ''),
  ('affiliate_text', 'ช่วยสนับสนุนเว็บด้วยการสมัครผ่านลิงก์ของเรา! รับ 1 Support point ทุก 1 การสมัคร')
ON CONFLICT (key) DO NOTHING;

-- =============================================
-- SEED: Admin user (adminadmin@gmail.com)
-- We create via auth.users directly with a confirmed email
-- =============================================
DO $$
DECLARE
  admin_id uuid := '00000000-0000-0000-0000-000000000001';
  gemini_id uuid := '11111111-1111-1111-1111-111111111111';
  deepseek_id uuid := '22222222-2222-2222-2222-222222222222';
  claude_id uuid := '33333333-3333-3333-3333-333333333333';
BEGIN
  -- Admin
  INSERT INTO auth.users (
    id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, aud, role
  )
  VALUES (
    admin_id,
    'adminadmin@gmail.com',
    crypt('Adminadmin.0', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"first_name":"Admin","last_name":"Admin","username":"Admin"}'::jsonb,
    now(), now(), 'authenticated', 'authenticated'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO profiles (id, email, first_name, last_name, username, province, country)
  VALUES (admin_id, 'adminadmin@gmail.com', 'Admin', 'Admin', 'Admin', 'กรุงเทพมหานคร', 'Thailand')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO user_roles (user_id, role) VALUES (admin_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  INSERT INTO user_roles (user_id, role) VALUES (admin_id, 'player')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- AI: Gemini
  INSERT INTO auth.users (
    id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, aud, role
  )
  VALUES (
    gemini_id,
    'ai-gemini@aigogoal.internal',
    crypt('AIgemini.internal.0', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"first_name":"Ai-Gemini","last_name":"","username":"🤖 Ai-Gemini"}'::jsonb,
    now(), now(), 'authenticated', 'authenticated'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO profiles (id, email, first_name, last_name, username, province, country, is_ai)
  VALUES (gemini_id, 'ai-gemini@aigogoal.internal', 'Ai-Gemini', '', '🤖 Ai-Gemini', 'กรุงเทพมหานคร', 'Thailand', true)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO user_roles (user_id, role) VALUES (gemini_id, 'player')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- AI: DeepSeek
  INSERT INTO auth.users (
    id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, aud, role
  )
  VALUES (
    deepseek_id,
    'ai-deepseek@aigogoal.internal',
    crypt('AIdeepseek.internal.0', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"first_name":"Ai-Deepseek","last_name":"","username":"🤖 Ai-Deepseek"}'::jsonb,
    now(), now(), 'authenticated', 'authenticated'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO profiles (id, email, first_name, last_name, username, province, country, is_ai)
  VALUES (deepseek_id, 'ai-deepseek@aigogoal.internal', 'Ai-Deepseek', '', '🤖 Ai-Deepseek', 'กรุงเทพมหานคร', 'Thailand', true)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO user_roles (user_id, role) VALUES (deepseek_id, 'player')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- AI: Claude
  INSERT INTO auth.users (
    id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, aud, role
  )
  VALUES (
    claude_id,
    'ai-claude@aigogoal.internal',
    crypt('AIclaude.internal.0', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"first_name":"Ai-Claude","last_name":"","username":"🤖 Ai-Claude"}'::jsonb,
    now(), now(), 'authenticated', 'authenticated'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO profiles (id, email, first_name, last_name, username, province, country, is_ai)
  VALUES (claude_id, 'ai-claude@aigogoal.internal', 'Ai-Claude', '', '🤖 Ai-Claude', 'กรุงเทพมหานคร', 'Thailand', true)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO user_roles (user_id, role) VALUES (claude_id, 'player')
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;
