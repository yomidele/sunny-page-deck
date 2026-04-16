# Phase 5: SQL Migration & Supabase Setup

Complete guide for applying Phase 5 database changes to your Supabase project.

## ⚠️ SAFETY CONFIRMATION

✅ **NO DATA LOSS** - This migration only adds new tables
✅ **NO BREAKING CHANGES** - Existing tables remain unchanged
✅ **SAFE TO RUN MULTIPLE TIMES** - Uses `IF NOT EXISTS` clauses
✅ **REVERSIBLE** - Can drop tables if needed

---

## 📊 TABLES BEING ADDED

### 1. `user_devices` - Device Tracking
```sql
CREATE TABLE IF NOT EXISTS public.user_devices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  device_name TEXT,
  last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```
**Indexes**: 
- `user_id` (for efficient device lookups)
- `device_id` (for device identification)

### 2. `videos` - YouTube Content
```sql
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
```
**Indexes**: 
- `created_at DESC` (for sorting by date)

### 3. `posts` - Blog Content
```sql
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  featured_image TEXT,
  excerpt TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```
**Indexes**: 
- `created_at DESC` (for sorting by date)

---

## 🔐 RLS POLICIES BEING ADDED

### user_devices Policies (4 policies)
1. **SELECT** - Users see their own devices only
2. **INSERT** - System creates devices during login
3. **UPDATE** - System updates device last_login
4. **DELETE** - Users can remove their own devices

### videos Policies (3 policies)
1. **SELECT** - Everyone can read videos (public)
2. **INSERT** - Only admins can create videos
3. **UPDATE** - Only admins can update videos
4. **DELETE** - Only admins can delete videos

### posts Policies (3 policies)
1. **SELECT** - Everyone can read posts (public)
2. **INSERT** - Only admins can create posts
3. **UPDATE** - Only admins can update posts
4. **DELETE** - Only admins can delete posts

---

## 🚀 HOW TO APPLY MIGRATION

### Option A: Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Navigate to your project at https://supabase.com
   - Click "SQL Editor" in left sidebar

2. **Create New Query**
   - Click "New Query" button
   - Or click "+" next to "SQL"

3. **Copy & Paste Migration**
   - Copy entire contents from: `supabase/migrations/20260414000001_phase5_content_devices.sql`
   - Paste into SQL editor

4. **Execute**
   - Click "Run" button (or Cmd+Enter)
   - Wait for completion
   - Check for "Success" messages

5. **Verify**
   - Go to "Table Editor" 
   - Confirm new tables appear: `user_devices`, `videos`, `posts`
   - Click each table to verify structure

### Option B: Run via CLI (Supabase CLI installed)

```bash
# From project root
supabase db push

# This automatically runs all migrations in supabase/migrations/ folder
```

### Option C: Manual SQL Execution

If using PostgreSQL client directly:

```bash
psql postgresql://user:password@host:port/database < supabase/migrations/20260414000001_phase5_content_devices.sql
```

---

## ✅ VERIFICATION CHECKLIST

After running migration, verify everything worked:

### Tables Created
```sql
-- Run in Supabase SQL Editor to verify
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_devices', 'videos', 'posts');

-- Should return 3 rows:
-- user_devices
-- videos  
-- posts
```

### Indexes Created
```sql
-- Check all indexes
SELECT indexname, tablename 
FROM pg_indexes 
WHERE tablename IN ('user_devices', 'videos', 'posts');

-- Should include:
-- idx_user_devices_user_id
-- idx_user_devices_device_id
-- idx_videos_created_at
-- idx_posts_created_at
```

### RLS Enabled
```sql
-- Check RLS status
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('user_devices', 'videos', 'posts');

-- All should show RLS as enabled in Supabase dashboard
```

### Policies Active
```sql
-- Check RLS policies
SELECT policyname, tablename 
FROM pg_policies 
WHERE tablename IN ('user_devices', 'videos', 'posts');

-- Should show 10 policies total:
-- - 4 for user_devices
-- - 3 for videos
-- - 3 for posts
```

---

## 🧪 TEST DATA (Optional)

After migration, you can add test data:

### Add Test Video
```sql
INSERT INTO public.videos (youtube_url, title, description, video_id, thumbnail_url)
VALUES (
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'Test Video',
  'This is a test video',
  'dQw4w9WgXcQ',
  'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg'
);
```

### Add Test Post
```sql
INSERT INTO public.posts (title, content, excerpt)
VALUES (
  'Test Blog Post',
  'This is test content for a blog post',
  'Short preview of test content'
);
```

### Verify Test Data
```sql
SELECT * FROM public.videos LIMIT 1;
SELECT * FROM public.posts LIMIT 1;
```

---

## 🔄 ROLLBACK (If Needed)

If you need to undo changes, run:

```sql
-- Drop tables safely (will also drop policies)
DROP TABLE IF EXISTS public.user_devices CASCADE;
DROP TABLE IF EXISTS public.videos CASCADE;
DROP TABLE IF EXISTS public.posts CASCADE;

-- This is safe because:
-- 1. Original tables unchanged
-- 2. No user data affected
-- 3. Can re-run migration after fixing issues
```

---

## 🛡️ MIGRATION FILE LOCATION

**File**: `supabase/migrations/20260414000001_phase5_content_devices.sql`

This file contains:
- All table creation statements
- All index creation
- All RLS policy definitions
- All grant statements

When you run `supabase db push`, this file is automatically executed.

---

## 📝 KEY DETAILS

### Timestamps (TIMESTAMP WITH TIME ZONE)
- Uses UTC timezone
- All timestamps in `_at` columns
- Automatically set to NOW() by default

### Foreign Keys
- `user_devices.user_id` → `users.id`
- Cascade delete (removes devices if user deleted)
- No circular dependencies

### Indexes
- Created for frequently queried columns
- Improves performance on SELECT queries
- Automatically maintained by PostgreSQL

### RLS Policies
- Enforced at database level
- Applied automatically by Supabase Auth
- No bypassing at application level

---

## 🐛 TROUBLESHOOTING

### "Table already exists" error
✅ This is FINE - `IF NOT EXISTS` means it skips existing tables
✅ Migration is safe to run again

### "Permission denied" error
❌ Check that your Supabase user has proper permissions
- Must have superuser or table creation rights
- Contact Supabase support if needed

### "Foreign key constraint failed"
❌ Rare - means `users` table missing or has issues
- Verify `users` table exists: `SELECT * FROM public.users LIMIT 1;`
- Check `id` column type (should be UUID)

### Policies not working
Check:
1. RLS enabled on table: `ALTER TABLE tablename ENABLE ROW LEVEL SECURITY;`
2. At least one policy exists for operation type
3. Policy conditions correctly reference `auth.uid()` or `auth.role()`

### Performance issues
Check:
1. Indexes created: Run verification query above
2. No duplicate indexes: `SELECT * FROM pg_indexes WHERE tablename IN ...`
3. Table row count: `SELECT COUNT(*) FROM user_devices;`

---

## 📞 SUPPORT

If migration fails:

1. **Take screenshot** of error message
2. **Check Supabase logs**: 
   - Project settings → Logs → Database
3. **Verify prerequisites**:
   - Supabase project active
   - Have `users` table
   - Admin credentials valid
4. **Contact support** with:
   - Error message
   - Migration file version
   - Supabase project ID

---

## ✨ POST-MIGRATION TASKS

After successful migration:

1. ✅ Deploy updated frontend code
2. ✅ Verify admin pages accessible (`/admin/manage-videos`, `/admin/manage-posts`)
3. ✅ Add admin user as superuser (if not already)
4. ✅ Test device limit functionality
5. ✅ Add sample videos/posts via admin panel
6. ✅ Verify landing page loads content
7. ✅ Monitor performance with real usage

---

## 🎯 NEXT STEPS

Now that database is ready:

1. **Add Admin Routes** - Link to new admin pages
2. **Configure Permissions** - Ensure admin users have role='admin'
3. **Deploy Frontend** - Push code with new components
4. **Test Full Flow** - Device limits, content management, landing page
5. **Monitor** - Check logs for errors

