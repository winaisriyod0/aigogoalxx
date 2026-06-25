
-- Fix handle_new_user to handle username uniqueness conflicts gracefully
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  base_username text;
  final_username text;
  suffix int := 0;
BEGIN
  base_username := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data->>'username'), ''),
    split_part(NEW.email, '@', 1)
  );

  -- Ensure username is unique by appending a number if needed
  final_username := base_username;
  LOOP
    EXIT WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE username = final_username);
    suffix := suffix + 1;
    final_username := base_username || suffix::text;
  END LOOP;

  INSERT INTO profiles (id, email, first_name, last_name, username, province, country)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    final_username,
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
