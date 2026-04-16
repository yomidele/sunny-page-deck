-- ============================================================================
-- MULTI-AI QUESTION GENERATION SYSTEM - SQL REFERENCE
-- Date: April 15, 2026
-- Status: NO SQL UPDATES REQUIRED FOR PRODUCTION
-- ============================================================================

-- ============================================================================
-- IMPORTANT: READ THIS FIRST
-- ============================================================================
-- The multi-AI system works with the EXISTING database schema.
-- NO SCHEMA MODIFICATIONS ARE NEEDED.
-- NO MIGRATIONS ARE REQUIRED.
-- 
-- This file contains:
-- 1. Verification queries (check your schema)
-- 2. Optional tracking additions (NOT recommended - keep schema clean)
-- 3. Reference queries (for monitoring/debugging)
-- ============================================================================

-- ============================================================================
-- SECTION 1: VERIFICATION QUERIES (Run these to verify compatibility)
-- ============================================================================

-- Query 1.1: Verify questions table schema
-- Run this to confirm your table structure matches requirements
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'questions'
ORDER BY ordinal_position;

-- Expected columns:
-- - id (uuid)
-- - subject_id (uuid)
-- - topic_id (uuid)
-- - question_text (text)
-- - option_a (text)
-- - option_b (text)
-- - option_c (text)
-- - option_d (text)
-- - correct_option (character / text)
-- - explanation (text / null)
-- - difficulty (varchar / text)
-- - type (varchar / text)
-- - created_at (timestamp)
-- - updated_at (timestamp)
-- ✅ If all present: System is compatible!

-- Query 1.2: Count existing questions
SELECT 
  COUNT(*) as total_questions,
  COUNT(DISTINCT subject_id) as subjects,
  COUNT(DISTINCT topic_id) as topics
FROM questions;

-- Query 1.3: Check difficulty distribution
SELECT 
  difficulty,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) as percentage
FROM questions
WHERE difficulty IS NOT NULL
GROUP BY difficulty
ORDER BY count DESC;

-- Expected: roughly 30% easy, 50% medium, 20% hard (for new questions)

-- Query 1.4: Verify all required fields are populated
SELECT 
  COUNT(*) as total,
  COUNT(question_text) as with_question,
  COUNT(option_a) as with_option_a,
  COUNT(option_b) as with_option_b,
  COUNT(option_c) as with_option_c,
  COUNT(option_d) as with_option_d,
  COUNT(correct_option) as with_correct_option,
  COUNT(explanation) as with_explanation
FROM questions;

-- Query 1.5: Check for valid correct_option values
SELECT 
  correct_option,
  COUNT(*) as count
FROM questions
WHERE correct_option IS NOT NULL
GROUP BY correct_option
ORDER BY correct_option;

-- Expected: only A, B, C, D values

-- ============================================================================
-- SECTION 2: MONITORING QUERIES (Track generation results)
-- ============================================================================

-- Query 2.1: Count questions generated in last 24 hours
SELECT 
  DATE(created_at) as generation_date,
  COUNT(*) as questions_generated,
  COUNT(DISTINCT subject_id) as subjects,
  COUNT(DISTINCT topic_id) as topics
FROM questions
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY DATE(created_at)
ORDER BY generation_date DESC;

-- Query 2.2: Duplicate check (questions with same text in same topic)
SELECT 
  topic_id,
  SUBSTRING(question_text, 1, 50) as question_preview,
  COUNT(*) as duplicate_count,
  ARRAY_AGG(id) as question_ids
FROM questions
GROUP BY topic_id, SUBSTRING(question_text, 1, 50)
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC
LIMIT 20;

-- Query 2.3: Questions with missing explanations
SELECT 
  id,
  SUBSTRING(question_text, 1, 50) as question_preview,
  subject_id,
  topic_id,
  created_at
FROM questions
WHERE explanation IS NULL 
   OR explanation = ''
   OR LENGTH(TRIM(explanation)) = 0
LIMIT 50;

-- Query 2.4: Questions with empty fields
SELECT 
  id,
  SUBSTRING(question_text, 1, 30) as preview,
  CASE WHEN question_text = '' THEN 'question_text' ELSE NULL END as empty_field_1,
  CASE WHEN option_a = '' THEN 'option_a' ELSE NULL END as empty_field_2,
  CASE WHEN option_b = '' THEN 'option_b' ELSE NULL END as empty_field_3,
  CASE WHEN option_c = '' THEN 'option_c' ELSE NULL END as empty_field_4,
  CASE WHEN option_d = '' THEN 'option_d' ELSE NULL END as empty_field_5
FROM questions
WHERE question_text = '' 
   OR option_a = '' 
   OR option_b = '' 
   OR option_c = '' 
   OR option_d = ''
LIMIT 50;

-- Query 2.5: Questions by generation batch (check variety)
SELECT 
  DATE(created_at) as date,
  EXTRACT(HOUR FROM created_at) as hour,
  subject_id,
  topic_id,
  COUNT(*) as count,
  AVG(CASE WHEN difficulty = 'easy' THEN 1 ELSE 0 END) * 100 as easy_pct,
  AVG(CASE WHEN difficulty = 'medium' THEN 1 ELSE 0 END) * 100 as medium_pct,
  AVG(CASE WHEN difficulty = 'hard' THEN 1 ELSE 0 END) * 100 as hard_pct
FROM questions
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at), EXTRACT(HOUR FROM created_at), subject_id, topic_id
ORDER BY date DESC, hour DESC;

-- ============================================================================
-- SECTION 3: OPTIONAL ANALYTICS (For advanced tracking - NOT recommended)
-- ============================================================================

-- Query 3.1: Question quality score (if you want to add tracking)
-- This would require adding columns (see Section 4 for optional schema changes)
-- Formula: quality_score = has_explanation + valid_difficulty + valid_type + has_all_options
SELECT 
  id,
  SUBSTRING(question_text, 1, 40) as preview,
  (
    CASE WHEN explanation IS NOT NULL AND LENGTH(TRIM(explanation)) > 10 THEN 1 ELSE 0 END +
    CASE WHEN difficulty IN ('easy', 'medium', 'hard') THEN 1 ELSE 0 END +
    CASE WHEN type IN ('theory', 'calculation') THEN 1 ELSE 0 END +
    CASE WHEN correct_option IN ('A', 'B', 'C', 'D') THEN 1 ELSE 0 END
  ) as quality_score
FROM questions
ORDER BY quality_score DESC
LIMIT 100;

-- ============================================================================
-- SECTION 4: OPTIONAL SCHEMA ADDITIONS (NOT REQUIRED - Keep schema clean)
-- ============================================================================

-- ⚠️  THESE ARE OPTIONAL - Only run if you want to track AI pipeline runs
-- ⚠️  VIOLATES "DO NOT modify database schema" requirement
-- ⚠️  RECOMMENDED: Skip these unless you have specific tracking needs

-- Optional 4.1: Add AI pipeline tracking columns
-- This is NOT recommended - violates requirement to not modify schema
-- Only uncomment if you really need pipeline tracking
/*
ALTER TABLE questions ADD COLUMN IF NOT EXISTS 
  ai_generation_batch_id UUID COMMENT 'Tracks which generation batch';

ALTER TABLE questions ADD COLUMN IF NOT EXISTS 
  ai_refined BOOLEAN DEFAULT FALSE COMMENT 'Was refined by Together AI';

ALTER TABLE questions ADD COLUMN IF NOT EXISTS 
  ai_validated BOOLEAN DEFAULT FALSE COMMENT 'Was validated by Gemini AI';

ALTER TABLE questions ADD COLUMN IF NOT EXISTS 
  ai_pipeline_version VARCHAR(50) DEFAULT '1.0' COMMENT 'Pipeline version used';

-- Create index for batch queries
CREATE INDEX IF NOT EXISTS idx_questions_ai_batch 
ON questions(ai_generation_batch_id, created_at DESC);
*/

-- Optional 4.2: Create audit table for pipeline runs (NOT recommended)
/*
CREATE TABLE IF NOT EXISTS question_generation_audits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL UNIQUE,
  subject_id UUID NOT NULL REFERENCES subjects(id),
  topic_id UUID NOT NULL REFERENCES topics(id),
  requested_count INT NOT NULL,
  generated_count INT NOT NULL,
  refined_count INT NOT NULL,
  validated_count INT NOT NULL,
  final_count INT NOT NULL,
  quality_score FLOAT,
  processing_time_seconds INT,
  lovable_ai_status VARCHAR(50),
  together_ai_status VARCHAR(50),
  gemini_ai_status VARCHAR(50),
  errors TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_audits_subject ON question_generation_audits(subject_id, created_at DESC);
CREATE INDEX idx_audits_created_by ON question_generation_audits(created_by, created_at DESC);
*/

-- ============================================================================
-- SECTION 5: CLEANUP QUERIES (Use with caution!)
-- ============================================================================

-- Query 5.1: Delete questions from specific generation batch (by date)
-- ⚠️  CAREFUL: This permanently deletes data!
-- Example: Delete all questions from specific date
-- Uncomment and modify date as needed
/*
DELETE FROM questions
WHERE created_at >= '2026-04-15 00:00:00'
  AND created_at < '2026-04-16 00:00:00'
  AND subject_id = 'specific-subject-uuid';  -- Replace with actual UUID
-- This will delete N rows
*/

-- Query 5.2: Remove duplicate questions (keep first occurrence)
-- ⚠️  CAREFUL: This permanently deletes data!
-- Removes questions with identical text in same topic
/*
DELETE FROM questions 
WHERE id NOT IN (
  SELECT MIN(id)
  FROM questions
  GROUP BY topic_id, SUBSTRING(question_text, 1, 100)
)
AND created_at >= '2026-04-15'  -- Only delete recent ones for safety
*/

-- Query 5.3: Remove questions with missing critical fields
-- ⚠️  CAREFUL: This permanently deletes data!
/*
DELETE FROM questions
WHERE question_text IS NULL
   OR question_text = ''
   OR option_a IS NULL
   OR option_b IS NULL
   OR option_c IS NULL
   OR option_d IS NULL
   OR correct_option IS NULL
   OR correct_option NOT IN ('A', 'B', 'C', 'D')
   AND created_at >= '2026-04-15'  -- Only recent ones
*/

-- ============================================================================
-- SECTION 6: REFERENCE DATA VALIDATION
-- ============================================================================

-- Query 6.1: Verify all subject_id references exist
SELECT 
  DISTINCT q.subject_id,
  s.name as subject_name,
  COUNT(q.id) as question_count
FROM questions q
LEFT JOIN subjects s ON q.subject_id = s.id
GROUP BY q.subject_id, s.name
ORDER BY question_count DESC;

-- Query 6.2: Verify all topic_id references exist
SELECT 
  DISTINCT q.topic_id,
  t.name as topic_name,
  t.subject_id,
  s.name as subject_name,
  COUNT(q.id) as question_count
FROM questions q
LEFT JOIN topics t ON q.topic_id = t.id
LEFT JOIN subjects s ON t.subject_id = s.id
WHERE q.topic_id IS NOT NULL
GROUP BY q.topic_id, t.name, t.subject_id, s.name
ORDER BY question_count DESC;

-- Query 6.3: Find orphaned questions (topic doesn't exist)
SELECT 
  q.id,
  q.topic_id,
  SUBSTRING(q.question_text, 1, 40) as preview,
  q.created_at
FROM questions q
LEFT JOIN topics t ON q.topic_id = t.id
WHERE q.topic_id IS NOT NULL 
  AND t.id IS NULL;

-- ============================================================================
-- SECTION 7: PERFORMANCE CHECKS
-- ============================================================================

-- Query 7.1: Index health check
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE tablename = 'questions'
ORDER BY idx_scan DESC;

-- Query 7.2: Table size information
SELECT 
  pg_size_pretty(pg_total_relation_size('questions')) as total_size,
  pg_size_pretty(pg_relation_size('questions')) as table_size,
  pg_size_pretty(pg_total_relation_size('questions') - pg_relation_size('questions')) as indexes_size,
  (SELECT COUNT(*) FROM questions) as total_rows;

-- ============================================================================
-- SUMMARY
-- ============================================================================

-- ✅ WHAT TO RUN IN PRODUCTION:
-- 1. Section 1 queries (verification only)
-- 2. Section 2 queries (monitoring only)
-- 3. Deploy functions via: supabase functions deploy generate-questions
-- 4. System ready!

-- ❌ DO NOT RUN (unless specifically needed):
-- 1. Section 4 (optional schema changes - not required)
-- 2. Section 5 (cleanup queries - destructive)

-- 📊 FOR MONITORING:
-- 1. Run Section 2 queries periodically
-- 2. Check questions are being generated
-- 3. Verify quality metrics

-- ============================================================================
-- End of SQL Reference
-- For questions: See MULTI_AI_DEPLOYMENT.md or MULTI_AI_TECHNICAL_REFERENCE.md
-- ============================================================================
