-- Phase 5: Content Management & Device Tracking
-- Safe migration: Only adds new tables and policies, no destructive changes

-- ============================================
-- 1. USER DEVICES TABLE (Device limit system)
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_devices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  device_name TEXT,
  last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON public.user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_device_id ON public.user_devices(device_id);

-- Enable RLS
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own devices
CREATE POLICY IF NOT EXISTS "Users can view their own devices"
ON public.user_devices FOR SELECT
USING (auth.uid() = user_id);

-- RLS Policy: Users can manage their own devices
CREATE POLICY IF NOT EXISTS "Users can manage their own devices"
ON public.user_devices FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policy: System can insert new devices (during login)
CREATE POLICY IF NOT EXISTS "System can create devices"
ON public.user_devices FOR INSERT
WITH CHECK (true);

-- RLS Policy: System can update device last_login
CREATE POLICY IF NOT EXISTS "System can update devices"
ON public.user_devices FOR UPDATE
USING (true)
WITH CHECK (true);

-- ============================================
-- 2. VIDEOS TABLE (YouTube video system)
-- ============================================
CREATE TABLE IF NOT EXISTS public.videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  youtube_url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  video_id TEXT NOT NULL,
  duration_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON public.videos(created_at DESC);

-- Enable RLS
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Public can read videos
CREATE POLICY IF NOT EXISTS "Public read videos"
ON public.videos FOR SELECT
USING (true);

-- RLS Policy: Only admins can create videos
CREATE POLICY IF NOT EXISTS "Admins create videos"
ON public.videos FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- RLS Policy: Only admins can update videos
CREATE POLICY IF NOT EXISTS "Admins update videos"
ON public.videos FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- RLS Policy: Only admins can delete videos
CREATE POLICY IF NOT EXISTS "Admins delete videos"
ON public.videos FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- ============================================
-- 3. POSTS TABLE (Blog/News system)
-- ============================================
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  featured_image TEXT,
  excerpt TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);

-- Enable RLS
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Public can read posts
CREATE POLICY IF NOT EXISTS "Public read posts"
ON public.posts FOR SELECT
USING (true);

-- RLS Policy: Only admins can create posts
CREATE POLICY IF NOT EXISTS "Admins create posts"
ON public.posts FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- RLS Policy: Only admins can update posts
CREATE POLICY IF NOT EXISTS "Admins update posts"
ON public.posts FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- RLS Policy: Only admins can delete posts
CREATE POLICY IF NOT EXISTS "Admins delete posts"
ON public.posts FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
GRANT SELECT ON public.user_devices TO authenticated;
GRANT INSERT ON public.user_devices TO authenticated;
GRANT UPDATE ON public.user_devices TO authenticated;
GRANT DELETE ON public.user_devices TO authenticated;

GRANT SELECT ON public.videos TO anon, authenticated;
GRANT SELECT ON public.posts TO anon, authenticated;
