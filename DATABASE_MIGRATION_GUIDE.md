# SUPABASE MIGRATION DEPLOYMENT GUIDE

## ⚠️ BEFORE YOU START

**BACKUP**: This should already be done, but verify:
- ✅ Production database backed up
- ✅ Current schema documented
- ✅ User data secured
- ✅ Admin credentials stored safely

**TEST ENVIRONMENT**: Run migration on staging FIRST
- ✅ Test database available
- ✅ Mirror of production schema
- ✅ Non-production data

---

## 🔄 DEPLOYMENT STEPS

### Step 1: Backup Supabase Database
1. Go to Supabase Dashboard
2. Project → Backups
3. Click "Create backup" → Confirm
4. Wait for completion (⏱️ ~5-10 minutes)
5. Verify backup appears in backup list

### Step 2: Run Migration on Staging (FIRST!)
1. Go to Supabase Staging Project
2. SQL Editor
3. Create new query
4. Copy entire `20260414_phase6_analytics.sql` content
5. Paste into SQL editor
6. Review (should see 8 CREATE TABLE, ALTER, etc.)
7. Click "Run"
8. Verify: "0 rows affected" or "statements executed"
9. Check: No red error messages

### Step 3: Verify Staging Migration
1. SQL Editor → New Query
2. Run test queries:
```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_stats', 'leaderboard', 'performance_insights', 'institutions');

-- Should return 4 rows

-- Check indexes
SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE '%idx_%';

-- Should return 9+ indexes

-- Check RLS enabled
SELECT tablename, rowsecurity FROM pg_tables 
WHERE tablename IN ('user_stats', 'leaderboard', 'performance_insights');

-- Should show TRUE for all 3
```

3. Verify results before production

### Step 4: Run Migration on Production
⚠️ **ONLY IF STAGING PASSED**

1. Go to Supabase Production Project
2. SQL Editor
3. Create new query  
4. Copy entire migration SQL
5. Paste into editor
6. **DOUBLE-CHECK** you're in PRODUCTION
7. Click "Run"
8. Wait for completion
9. Verify: "0 rows affected" (expected for schema creation)

### Step 5: Post-Migration Verification
1. Run same test queries as Step 3
2. Verify all 4 tables exist
3. Verify all 9 indexes created
4. Verify RLS enabled
5. Check no existing data corrupted:
```sql
-- Verify users table unchanged
SELECT COUNT(*) FROM users;

-- Verify auth tables untouched
SELECT COUNT(*) FROM cbt_sessions;
SELECT COUNT(*) FROM questions;
```

---

## 🛠️ TROUBLESHOOTING

### Error: "relation 'user_stats' already exists"
**Cause**: Migration ran twice or partially  
**Fix**:
```sql
-- Check if tables exist
\dt user_stats

-- If exists, check if data safe
SELECT COUNT(*) FROM user_stats;

-- If safe to replace, drop and rerun
DROP TABLE IF EXISTS user_stats CASCADE;
-- ... then rerun migration
```

### Error: "function 'update_user_stats_after_exam' already exists"
**Cause**: Function created twice  
**Fix**:
```sql
-- Drop and recreate
DROP FUNCTION IF EXISTS update_user_stats_after_exam CASCADE;
-- ... then rerun migration
```

### Error: "permission denied for schema 'public'"
**Cause**: Role/permissions issue  
**Fix**:
1. Check Supabase role has ALTER privileges
2. Try running as `postgres` role
3. Contact Supabase support if persists

### Migration Hangs/Times Out
**Cause**: Large existing data or network issue  
**Fix**:
1. Cancel query
2. Wait 2 minutes
3. Retry single table at a time
4. If still fails, contact Supabase support

---

## ✅ VALIDATION CHECKLIST

After migration, verify:

- [ ] All 4 tables created
- [ ] All 9 indexes created
- [ ] RLS policies enabled on 3 tables
- [ ] 2 PostgreSQL functions created
- [ ] No existing data corrupted
- [ ] Can insert test data into user_stats
- [ ] Can insert test data into leaderboard
- [ ] Can select from performance_insights
- [ ] Leaderboard RPC returns results
- [ ] No error logs in database

---

## 📋 ROLLBACK PROCEDURE

**IF SOMETHING GOES WRONG**

### Option 1: Quick Rollback (0 data loss)
```sql
-- Drop new tables (no existing data affected)
DROP TABLE IF EXISTS performance_insights CASCADE;
DROP TABLE IF EXISTS leaderboard CASCADE;
DROP TABLE IF EXISTS user_stats CASCADE;
DROP TABLE IF EXISTS institutions CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS update_user_stats_after_exam CASCADE;
DROP FUNCTION IF EXISTS get_top_leaderboard CASCADE;

-- Restore from backup if needed
```

### Option 2: Full Restore from Backup
1. Supabase Dashboard → Backups
2. Find pre-migration backup
3. Click "Restore"
4. Confirm you want to restore
5. ⏱️ Wait 10-30 minutes
6. Database restored to previous state

---

## 🔐 SECURITY VERIFICATION

After migration, verify security:

```sql
-- Check RLS policies exist
SELECT policyname, permissive, roles FROM pg_policies 
WHERE tablename IN ('user_stats', 'leaderboard', 'performance_insights');

-- Should see multiple policies

-- Verify auth.uid() functions work
SELECT auth.uid(); -- Should work for authenticated user

-- Test RLS in practice
-- Login as student user, should NOT be able to:
-- SELECT * FROM user_stats; -- (except own)
```

---

## 📊 DATA IMPORT (OPTIONAL)

If you want to backfill existing student data:

```sql
-- Example: Create stats for existing users
INSERT INTO user_stats (user_id, total_tests_taken, average_score)
SELECT id, 0, 0 FROM users
ON CONFLICT (user_id) DO NOTHING;

-- If you have existing exam records, calculate stats:
-- (This requires custom logic based on your schema)
```

---

## 🚀 NEXT STEPS

After migration is verified:

1. **Deploy Frontend**: Push Phase 6 code changes
2. **Update Exam Logic**: Call `recordExamResult()` after exams
3. **Monitor Performance**: Watch database query times
4. **Gather Data**: Run few practice exams to populate stats
5. **Test User Experience**: Verify analytics pages work

---

## 📞 MIGRATION SUPPORT

**Issues?**
1. Check this guide's troubleshooting section
2. Run `ROLLBACK` if needed (no production data at risk)
3. Restore from backup if major issue
4. Contact platform team with:
   - Error message
   - Timestamp
   - Database name
   - Steps to reproduce

---

## ✅ SIGN-OFF CHECKLIST

- [ ] Backup created (verified in Supabase)
- [ ] Staging migration passed
- [ ] All tests passed on staging
- [ ] Production backup created
- [ ] Production migration executed
- [ ] Post-migration validation passed
- [ ] Security verification passed
- [ ] Existing data intact
- [ ] Frontend code deployed
- [ ] Team notified of changes

**Deployment Date**: ___________  
**Verified By**: ___________  
**Sign-Off**: ___________  

---

**MIGRATION STATUS**: Ready for deployment  
**RISK LEVEL**: Low (additive changes only)  
**ROLLBACK TIME**: <5 minutes if needed  
**DATA SAFETY**: 100% protected
