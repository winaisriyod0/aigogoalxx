
/*
# Fix handle_new_user trigger - search_path and username uniqueness

When GoTrue (Supabase Auth) calls the handle_new_user trigger via the admin API,
it uses a search_path that does NOT include 'public'. Without SET search_path,
the function fails to find the profiles table, causing "Database error saving new user".

Changes:
1. Add SET search_path = public, auth to handle_new_user so it works regardless
   of which role/search_path calls it.
2. Prefix all table references with public. for explicitness.
3. Keep the username-uniqueness loop from the previous fix.
*/

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

  final_username := base_username;
  LOOP
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username);
    suffix := suffix + 1;
    final_username := base_username || suffix::text;
  END LOOP;

  INSERT INTO public.profiles (id, email, first_name, last_name, username, province, country)
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

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'player')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;
