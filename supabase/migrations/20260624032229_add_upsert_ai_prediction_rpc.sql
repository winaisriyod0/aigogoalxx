
-- Allow admin users to insert/update predictions for AI users
-- (since admin writes AI predictions on behalf of AI profiles)

CREATE OR REPLACE FUNCTION upsert_ai_prediction(
  p_ai_id text,
  p_match_id uuid,
  p_home integer,
  p_away integer
) RETURNS void AS $$
DECLARE
  ai_profile_id uuid;
BEGIN
  ai_profile_id := CASE p_ai_id
    WHEN 'gemini'   THEN '11111111-1111-1111-1111-111111111111'::uuid
    WHEN 'deepseek' THEN '22222222-2222-2222-2222-222222222222'::uuid
    WHEN 'claude'   THEN '33333333-3333-3333-3333-333333333333'::uuid
    ELSE NULL
  END;

  IF ai_profile_id IS NULL THEN RETURN; END IF;

  INSERT INTO predictions (user_id, match_id, home_score_pred, away_score_pred, updated_at)
  VALUES (ai_profile_id, p_match_id, p_home, p_away, now())
  ON CONFLICT (user_id, match_id) DO UPDATE SET
    home_score_pred = EXCLUDED.home_score_pred,
    away_score_pred = EXCLUDED.away_score_pred,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Allow authenticated (admin) to call this function
GRANT EXECUTE ON FUNCTION upsert_ai_prediction(text, uuid, integer, integer) TO authenticated;
