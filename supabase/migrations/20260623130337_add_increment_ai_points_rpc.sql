
-- RPC function to atomically increment AI profile points
CREATE OR REPLACE FUNCTION increment_ai_points(p_profile_id uuid, p_points integer)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET total_points = COALESCE(total_points, 0) + p_points,
      updated_at = now()
  WHERE id = p_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
