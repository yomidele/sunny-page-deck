# Phase 5 Implementation Guide

Complete implementation of device tracking, content management, and UI enhancements for JAMB CBT platform.

## 📋 Overview

Phase 5 adds three major systems to the platform:
1. **Device Limit System** - Track and limit user logins to max 2 devices
2. **Content Management System** - Manage videos and blog posts
3. **Dynamic Landing Page** - Display content from database

---

## 🔒 DEVICE LIMIT SYSTEM

### What It Does
- Tracks devices by generating unique device IDs
- Limits users to 2 active devices
- Blocks login if device limit exceeded
- Allows users to manage and remove devices

### Database Implementation
**Table**: `user_devices`
```
- id (UUID, Primary Key)
- user_id (UUID, References users.id)
- device_id (TEXT, Unique identifier)
- device_name (TEXT, e.g., "Windows PC", "iPhone")
- last_login (TIMESTAMP)
- created_at (TIMESTAMP)
```

### Integration Steps

#### 1. Update Login Flow (Optional enhancement)
In your login process, after successful authentication:
```typescript
import { checkDeviceLimit } from '@/lib/deviceManagement';

const handleLogin = async (credentials) => {
  const session = await supabase.auth.signInWithPassword(credentials);
  
  if (session.data.user) {
    const { allowed, reason } = await checkDeviceLimit(session.data.user.id);
    
    if (!allowed) {
      await supabase.auth.signOut();
      alert(reason); // "Device limit reached..."
      return;
    }
  }
};
```

#### 2. Add Device Management UI
Use in user dashboard or profile page:
```typescript
import DeviceManagement from '@/components/DeviceManagement';

<DeviceManagement userId={user.id} />
```

### API Functions

**`deviceManagement.ts`** exports:
- `generateDeviceId()` - Create/retrieve device ID
- `getDeviceName()` - Get device description (Windows, Mac, iPhone, etc.)
- `checkDeviceLimit(userId)` - Check if login allowed
- `getUserDevices(userId)` - Get all devices for user
- `removeDevice(deviceId, userId)` - Remove specific device
- `removeAllUserDevices(userId)` - Admin function to clear all devices

---

## 🌐 CONTENT MANAGEMENT SYSTEM

### What It Does
- Store YouTube videos with metadata
- Store blog posts with images
- Admin interface to create/edit/delete content
- Public access to view content
- Dynamic content loading on landing page

### Database Implementation

#### Videos Table (`videos`)
```
- id (UUID)
- youtube_url (TEXT)
- title (TEXT)
- description (TEXT)
- thumbnail_url (TEXT)
- video_id (TEXT, extracted from URL)
- duration_seconds (INTEGER)
- created_at, updated_at (TIMESTAMP)
```

#### Posts Table (`posts`)
```
- id (UUID)
- title (TEXT)
- content (TEXT)
- featured_image (TEXT, optional)
- excerpt (TEXT, optional)
- created_at, updated_at (TIMESTAMP)
```

### Admin Pages

#### `/admin/manage-videos`
- **Location**: `src/pages/admin/ManageVideos.tsx`
- **Features**:
  - Add video by YouTube URL
  - Edit video title and description
  - Delete videos
  - View thumbnails
- **Form Fields**:
  - YouTube URL (required)
  - Title (required)
  - Description (optional)
  - Duration in seconds (optional)

#### `/admin/manage-posts`
- **Location**: `src/pages/admin/ManagePosts.tsx`
- **Features**:
  - Create blog posts
  - Edit existing posts
  - Delete posts
  - Add featured images
  - Write full content with excerpts
- **Form Fields**:
  - Title (required)
  - Content (required)
  - Excerpt (optional)
  - Featured Image URL (optional)

### API Functions

**`contentManagement.ts`** exports:

#### Video Functions
```typescript
getVideos(): Promise<Video[]>
createVideo(data): Promise<{success, data?, error?}>
updateVideo(id, updates): Promise<{success, data?, error?}>
deleteVideo(id): Promise<{success, error?}>
```

#### Post Functions
```typescript
getPosts(limit, offset): Promise<Post[]>
getPost(id): Promise<Post | null>
createPost(data): Promise<{success, data?, error?}>
updatePost(id, updates): Promise<{success, data?, error?}>
deletePost(id): Promise<{success, error?}>
```

#### Utility Functions
```typescript
extractYoutubeId(url): string | null // Extract ID from various URL formats
getYoutubeThumbnail(videoId): string // Get thumbnail URL
getYoutubeEmbedUrl(videoId): string  // Get embed URL
```

### Security (RLS Policies)

✅ Videos:
- Public read (anyone can view)
- Admin write/update/delete (only admins)

✅ Posts:
- Public read (anyone can view)
- Admin write/update/delete (only admins)

✅ User Devices:
- Users can view their own devices
- Users can delete their own devices
- System can create/update devices during login

---

## 📈 LANDING PAGE ENHANCEMENTS

### Dynamic Content Loading

**Updated**: `src/pages/Landing.tsx`

#### Features Added
1. **Video Section** - Fetches from `videos` table
   - Shows 4 most recent videos
   - Displays YouTube thumbnails
   - Shows duration
   - Links to YouTube

2. **Blog Section** - Fetches from `posts` table
   - Shows 3 most recent posts
   - Displays featured image if available
   - Shows excerpt or content preview
   - Includes publication date

#### Fallback Behavior
If database is empty or unreachable:
- Shows default placeholder videos
- Shows default placeholder posts
- Maintains original design
- No breaking changes

#### Loading States
- Shows loading messages while fetching
- Falls back gracefully on error
- Allows manual retry (refresh page)

---

## 🔗 ROUTING SETUP

Add routes to your router configuration:

```typescript
// Admin routes
import ManageVideos from '@/pages/admin/ManageVideos';
import ManagePosts from '@/pages/admin/ManagePosts';

// In your router setup:
{
  path: '/admin/manage-videos',
  element: <ManageVideos />,
  // Add auth guard to ensure only admins access
},
{
  path: '/admin/manage-posts',
  element: <ManagePosts />,
  // Add auth guard to ensure only admins access
}
```

---

## 🧑‍💼 ADMIN DASHBOARD UPDATE

The admin dashboard should link to new management pages. Add navigation items:

```
Admin Navigation:
├── Dashboard (existing)
├── Manage Video Content (new)
├── Manage Blog Posts (new)
├── Question Bank (existing)
└── ... other admin pages
```

---

## 📱 RESPONSIVE DESIGN

### All new features are fully responsive:

✅ Device Management
- Full width on mobile
- Side-by-side on tablet/desktop
- Touch-friendly buttons

✅ Admin Video Manager
- 1-column grid on mobile
- 2-column on tablet
- 3-column on desktop

✅ Admin Post Manager
- Full width cards
- Stacked layout

✅ Landing Page
- 1-column video grid on mobile
- 2-column on tablet
- 4-column on desktop
- 1-column post grid on mobile
- 3-column on tablet/desktop

---

## 🔐 SECURITY CHECKLIST

✅ RLS policies configured for all tables
✅ Admin-only operations protected by role check
✅ User devices linked to user_id (isolated)
✅ Device IDs stored securely in localStorage
✅ No sensitive data exposed in frontend

---

## 🚀 DEPLOYMENT STEPS

### 1. Database Migration
```bash
# Supabase will run migrations automatically when deployed
# Or manually run: src/migrations/20260414000001_phase5_content_devices.sql
```

### 2. Frontend Deployment
```bash
# Build and deploy as usual
npm run build
# All new components are included
```

### 3. Verify Installation
- [ ] Admin can access `/admin/manage-videos`
- [ ] Admin can add/edit/delete videos
- [ ] Admin can access `/admin/manage-posts`
- [ ] Admin can add/edit/delete posts
- [ ] Landing page fetches and displays videos
- [ ] Landing page fetches and displays posts
- [ ] Device management works in user dashboard
- [ ] Device limit enforcement works on login

---

## 🔧 TROUBLESHOOTING

### Videos not showing on landing page
1. Check browser console for errors
2. Verify `videos` table exists: `SELECT * FROM videos;`
3. Check RLS policies: `SELECT * FROM pg_policies WHERE tablename='videos';`
4. Verify admin user has proper role

### Device limit not working
1. Check `user_devices` table exists
2. Verify device localStorage key is set
3. Check browser's localStorage for `deviceId`
4. Delete devices and try login again

### Admin pages not accessible
1. Verify user has `role = 'admin'`
2. Check route is properly configured
3. Verify `AdminLayout` component exists
4. Check auth guard is not blocking access

---

## 📚 NEXT STEPS

### Optional Enhancements
1. **Video Analytics** - Track video views
2. **Post Categories** - Organize blog posts
3. **Comments** - Allow user comments on posts
4. **Advanced Device Management** - Device naming, location
5. **Device Activity Logs** - Login history per device

### Future Integrations
- Email notifications for new videos/posts
- Social media sharing for videos
- Video chapters and timestamps
- Post author information
- Featured content section

---

## ✅ VALIDATION CHECKLIST

Before going to production:

✅ SQL migrations applied successfully
✅ All tables created with proper indexes
✅ RLS policies active
✅ Admin pages accessible and functional
✅ Device management tested with 2+ devices
✅ Landing page loads videos and posts
✅ Responsive design verified on mobile
✅ Error handling working (fallback content)
✅ No console errors or warnings
✅ Performance acceptable (load times < 2s)
✅ Security policies verified
✅ User data privacy maintained

---

## 📞 SUPPORT

For issues or questions about Phase 5 implementation:
1. Check migration file for SQL syntax
2. Review RLS policies in Supabase dashboard
3. Check browser console for JavaScript errors
4. Verify table structure matches expectations
5. Check Supabase logs for API errors
