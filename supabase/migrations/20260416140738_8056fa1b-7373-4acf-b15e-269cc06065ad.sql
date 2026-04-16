
-- Create app_settings table for storing general password etc.
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage settings" ON public.app_settings
  FOR ALL USING (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'));

CREATE POLICY "Settings readable by authenticated" ON public.app_settings
  FOR SELECT TO authenticated USING (true);

-- Insert default general password
INSERT INTO public.app_settings (key, value) VALUES ('general_password', 'meekah2025')
ON CONFLICT (key) DO NOTHING;

-- Function: check_email_whitelist
CREATE OR REPLACE FUNCTION public.check_email_whitelist(check_email TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  student RECORD;
BEGIN
  SELECT * INTO student FROM public.allowed_students WHERE email = lower(check_email) LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN json_build_object('exists', false, 'is_used', false, 'linked_user_id', null);
  END IF;
  
  -- Check if a user account exists with this email
  DECLARE
    linked_id UUID;
  BEGIN
    SELECT id INTO linked_id FROM auth.users WHERE email = lower(check_email) LIMIT 1;
    
    IF linked_id IS NOT NULL THEN
      RETURN json_build_object('exists', true, 'is_used', true, 'linked_user_id', linked_id);
    ELSE
      RETURN json_build_object('exists', true, 'is_used', false, 'linked_user_id', null);
    END IF;
  END;
END;
$$;

-- Function: verify_general_password
CREATE OR REPLACE FUNCTION public.verify_general_password(input_password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stored_password TEXT;
BEGIN
  SELECT value INTO stored_password FROM public.app_settings WHERE key = 'general_password';
  RETURN stored_password IS NOT NULL AND stored_password = input_password;
END;
$$;

-- Trigger function: auto-create users row on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'student'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Create the trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
