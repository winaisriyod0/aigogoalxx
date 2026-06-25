
-- 1. Fix is_ai flag for AI profiles
UPDATE profiles SET is_ai = true
WHERE id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333'
);

-- 2. Add RLS policy so AI users (service role) can insert their predictions
-- The predictions table needs to allow inserts for AI user IDs via service role
-- The existing policy already allows authenticated users to insert their own rows.
-- We need service_role to be able to insert/update predictions for AI users.
-- Since service_role bypasses RLS, the existing trigger/function approach works fine.

-- 3. Update recalc_predictions_for_match trigger to also handle AI users
-- When a match finishes, sync ai_predictions -> predictions and recalc AI totals
CREATE OR REPLACE FUNCTION recalc_predictions_for_match()
RETURNS trigger AS $$
DECLARE
  ai_map RECORD;
  ai_pred RECORD;
  pts integer;
  pred_exists boolean;
BEGIN
  IF NEW.status = 'finished' AND NEW.home_score IS NOT NULL AND NEW.away_score IS NOT NULL THEN
    -- Recalculate human predictions
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

    -- Recalculate human total_points
    UPDATE profiles p
    SET total_points = (
      SELECT COALESCE(SUM(pr.points), 0)
      FROM predictions pr
      WHERE pr.user_id = p.id AND pr.points IS NOT NULL
    ),
    updated_at = now()
    WHERE p.id IN (
      SELECT DISTINCT user_id FROM predictions WHERE match_id = NEW.id
    ) AND p.is_ai = false;

    -- Sync AI predictions -> predictions table and recalc AI totals
    FOR ai_pred IN
      SELECT ap.ai_id, ap.home_score_pred, ap.away_score_pred
      FROM ai_predictions ap
      WHERE ap.match_id = NEW.id AND ap.is_current = true
        AND ap.home_score_pred IS NOT NULL AND ap.away_score_pred IS NOT NULL
    LOOP
      -- Map ai_id to profile UUID
      DECLARE
        ai_profile_id uuid;
      BEGIN
        ai_profile_id := CASE ai_pred.ai_id
          WHEN 'gemini'   THEN '11111111-1111-1111-1111-111111111111'::uuid
          WHEN 'deepseek' THEN '22222222-2222-2222-2222-222222222222'::uuid
          WHEN 'claude'   THEN '33333333-3333-3333-3333-333333333333'::uuid
          ELSE NULL
        END;

        IF ai_profile_id IS NULL THEN CONTINUE; END IF;

        pts := calc_points(ai_pred.home_score_pred, ai_pred.away_score_pred, NEW.home_score, NEW.away_score);

        -- Upsert into predictions
        INSERT INTO predictions (user_id, match_id, home_score_pred, away_score_pred, points, is_exact, is_correct_result, updated_at)
        VALUES (
          ai_profile_id,
          NEW.id,
          ai_pred.home_score_pred,
          ai_pred.away_score_pred,
          pts,
          ai_pred.home_score_pred = NEW.home_score AND ai_pred.away_score_pred = NEW.away_score,
          (
            (ai_pred.home_score_pred > ai_pred.away_score_pred AND NEW.home_score > NEW.away_score) OR
            (ai_pred.home_score_pred < ai_pred.away_score_pred AND NEW.home_score < NEW.away_score) OR
            (ai_pred.home_score_pred = ai_pred.away_score_pred AND NEW.home_score = NEW.away_score)
          ),
          now()
        )
        ON CONFLICT (user_id, match_id) DO UPDATE SET
          home_score_pred = EXCLUDED.home_score_pred,
          away_score_pred = EXCLUDED.away_score_pred,
          points = EXCLUDED.points,
          is_exact = EXCLUDED.is_exact,
          is_correct_result = EXCLUDED.is_correct_result,
          updated_at = now();

        -- Recalculate AI total_points
        UPDATE profiles
        SET total_points = (
          SELECT COALESCE(SUM(pr.points), 0)
          FROM predictions pr
          WHERE pr.user_id = ai_profile_id AND pr.points IS NOT NULL
        ),
        updated_at = now()
        WHERE id = ai_profile_id;
      END;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create trigger (function replaced above)
DROP TRIGGER IF EXISTS on_match_finished ON matches;
CREATE TRIGGER on_match_finished
  AFTER UPDATE ON matches
  FOR EACH ROW
  WHEN (NEW.status = 'finished')
  EXECUTE FUNCTION recalc_predictions_for_match();

-- 4. Add policy for AI users to be readable in predictions (already public via anon)
-- Make sure predictions table allows service_role inserts for AI (already bypasses RLS)

-- 5. Backfill: for any already-finished matches that have ai_predictions,
-- sync them into the predictions table now
DO $$
DECLARE
  m RECORD;
  ap RECORD;
  ai_profile_id uuid;
  pts integer;
BEGIN
  FOR m IN
    SELECT id, home_score, away_score FROM matches WHERE status = 'finished' AND home_score IS NOT NULL
  LOOP
    FOR ap IN
      SELECT ai_id, home_score_pred, away_score_pred
      FROM ai_predictions
      WHERE match_id = m.id AND is_current = false  -- already-processed predictions
        AND home_score_pred IS NOT NULL
    LOOP
      ai_profile_id := CASE ap.ai_id
        WHEN 'gemini'   THEN '11111111-1111-1111-1111-111111111111'::uuid
        WHEN 'deepseek' THEN '22222222-2222-2222-2222-222222222222'::uuid
        WHEN 'claude'   THEN '33333333-3333-3333-3333-333333333333'::uuid
        ELSE NULL
      END;

      IF ai_profile_id IS NULL THEN CONTINUE; END IF;

      pts := calc_points(ap.home_score_pred, ap.away_score_pred, m.home_score, m.away_score);

      INSERT INTO predictions (user_id, match_id, home_score_pred, away_score_pred, points, is_exact, is_correct_result, updated_at)
      VALUES (
        ai_profile_id, m.id,
        ap.home_score_pred, ap.away_score_pred, pts,
        ap.home_score_pred = m.home_score AND ap.away_score_pred = m.away_score,
        (
          (ap.home_score_pred > ap.away_score_pred AND m.home_score > m.away_score) OR
          (ap.home_score_pred < ap.away_score_pred AND m.home_score < m.away_score) OR
          (ap.home_score_pred = ap.away_score_pred AND m.home_score = m.away_score)
        ),
        now()
      )
      ON CONFLICT (user_id, match_id) DO UPDATE SET
        points = EXCLUDED.points,
        is_exact = EXCLUDED.is_exact,
        is_correct_result = EXCLUDED.is_correct_result,
        updated_at = now();
    END LOOP;

    -- Recalculate each AI total
    UPDATE profiles
    SET total_points = (
      SELECT COALESCE(SUM(pr.points), 0)
      FROM predictions pr
      WHERE pr.user_id = profiles.id AND pr.points IS NOT NULL
    ),
    updated_at = now()
    WHERE id IN (
      '11111111-1111-1111-1111-111111111111',
      '22222222-2222-2222-2222-222222222222',
      '33333333-3333-3333-3333-333333333333'
    );
  END LOOP;
END $$;
