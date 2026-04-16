
-- Create allowed_users table
CREATE TABLE public.allowed_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  is_used BOOLEAN NOT NULL DEFAULT false,
  linked_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on allowed_users (no public policies - only accessible via security definer functions)
ALTER TABLE public.allowed_users ENABLE ROW LEVEL SECURITY;

-- Create settings table
CREATE TABLE public.settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  general_password TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on settings (no public policies)
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Create users table
CREATE TABLE public.users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  has_set_password BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can read their own record
CREATE POLICY "Users can view own record"
  ON public.users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Users can update their own record
CREATE POLICY "Users can update own record"
  ON public.users FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- Allow insert during signup (service role will handle this, but also allow authenticated for the setup flow)
CREATE POLICY "Users can insert own record"
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Security definer function to check email whitelist
CREATE OR REPLACE FUNCTION public.check_email_whitelist(check_email TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'exists', CASE WHEN a.id IS NOT NULL THEN true ELSE false END,
    'is_used', COALESCE(a.is_used, false),
    'linked_user_id', a.linked_user_id
  ) INTO result
  FROM (SELECT NULL AS id, NULL AS is_used, NULL::UUID AS linked_user_id) AS dummy
  LEFT JOIN public.allowed_users a ON LOWER(a.email) = LOWER(check_email);
  
  -- If no match found, return not exists
  IF result IS NULL OR (result->>'exists')::boolean IS NOT TRUE THEN
    RETURN json_build_object('exists', false, 'is_used', false, 'linked_user_id', null);
  END IF;
  
  RETURN result;
END;
$$;

-- Security definer function to verify general password
CREATE OR REPLACE FUNCTION public.verify_general_password(input_password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stored_password TEXT;
BEGIN
  SELECT general_password INTO stored_password FROM public.settings LIMIT 1;
  RETURN stored_password IS NOT NULL AND stored_password = input_password;
END;
$$;

-- Security definer function to complete account setup (links user to allowed_users)
CREATE OR REPLACE FUNCTION public.complete_account_setup(
  user_email TEXT,
  user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.allowed_users
  SET is_used = true, linked_user_id = user_id
  WHERE LOWER(email) = LOWER(user_email) AND is_used = false;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Insert a default general password
INSERT INTO public.settings (general_password) VALUES ('JAMB2025');

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger for settings updated_at
CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
