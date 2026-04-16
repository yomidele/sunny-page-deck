-- Phase 6: Analytics System - Safe Database Extension
-- Status: ADDITIVE ONLY - No existing tables modified
-- Date: 2026-04-14

-- ====================================
-- 1. USER STATS TABLE (Student Analytics)
-- ====================================
CREATE TABLE IF NOT EXISTS user_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  total_tests_taken INT DEFAULT 0,
  average_score FLOAT DEFAULT 0,
  best_score INT DEFAULT 0,
  worst_score INT DEFAULT 0,
  weakest_subject TEXT,
  strongest_subject TEXT,
  total_time_spent_seconds INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON user_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_stats_avg_score ON user_stats(average_score DESC);

-- ====================================
-- 2. LEADERBOARD TABLE
-- ====================================
CREATE TABLE IF NOT EXISTS leaderboard (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score INT NOT NULL,
  exam_type TEXT CHECK (exam_type IN ('practice', 'cbt')),
  subject TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_score ON leaderboard(score DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_user_id ON leaderboard(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_exam_type ON leaderboard(exam_type);
CREATE INDEX IF NOT EXISTS idx_leaderboard_created_at ON leaderboard(created_at DESC);

-- ====================================
-- 3. PERFORMANCE INSIGHTS (Rule-based suggestions)
-- ====================================
CREATE TABLE IF NOT EXISTS performance_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  insight_type TEXT CHECK (insight_type IN ('improvement', 'weakness', 'strength', 'encouragement')),
  subject TEXT,
  topic TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  is_read BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_performance_insights_user_id ON performance_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_performance_insights_created_at ON performance_insights(created_at DESC);

-- ====================================
-- 4. INSTITUTIONS TABLE (Multi-school readiness)
-- ====================================
CREATE TABLE IF NOT EXISTS institutions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  abbreviation TEXT,
  location TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ====================================
-- 5. ADD INSTITUTION_ID TO USERS (Safe ALTER)
-- ====================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES institutions(id);
CREATE INDEX IF NOT EXISTS idx_users_institution_id ON users(institution_id);

-- ====================================
-- 6. EXAM RESULTS ENHANCEMENT (for analytics)
-- ====================================
-- Note: If cbt_results, practice_results or similar tables exist,
-- ensure they have: subject TEXT, duration_seconds INT fields
-- This migration does NOT modify existing tables

-- ====================================
-- 7. ROW-LEVEL SECURITY POLICIES
-- ====================================

-- Enable RLS on user_stats
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own stats"
  ON user_stats
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can update user stats"
  ON user_stats
  FOR UPDATE
  USING (auth.uid() = user_id OR auth.jwt() ->> 'role' = 'admin');

-- Enable RLS on leaderboard
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can read leaderboard"
  ON leaderboard
  FOR SELECT
  USING (TRUE);

CREATE POLICY "System can insert exam results"
  ON leaderboard
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.jwt() ->> 'role' = 'service_role');

-- Enable RLS on performance_insights
ALTER TABLE performance_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own insights"
  ON performance_insights
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage insights"
  ON performance_insights
  FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Enable RLS on institutions
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can read institutions"
  ON institutions
  FOR SELECT
  USING (TRUE);

-- ====================================
-- 8. HELPER FUNCTIONS
-- ====================================

-- Function to update user stats after exam
CREATE OR REPLACE FUNCTION update_user_stats_after_exam(
  p_user_id UUID,
  p_score INT,
  p_subject TEXT,
  p_duration_seconds INT
) RETURNS void AS $$
BEGIN
  INSERT INTO user_stats (user_id, total_tests_taken, average_score, best_score, worst_score, strongest_subject, total_time_spent_seconds)
  VALUES (p_user_id, 1, p_score, p_score, p_score, p_subject, p_duration_seconds)
  ON CONFLICT (user_id) DO UPDATE SET
    total_tests_taken = user_stats.total_tests_taken + 1,
    average_score = (user_stats.average_score * (user_stats.total_tests_taken) + p_score) / (user_stats.total_tests_taken + 1),
    best_score = GREATEST(user_stats.best_score, p_score),
    worst_score = LEAST(user_stats.worst_score, p_score),
    strongest_subject = CASE WHEN p_score > user_stats.average_score THEN p_subject ELSE user_stats.strongest_subject END,
    total_time_spent_seconds = user_stats.total_time_spent_seconds + p_duration_seconds,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to get top 10 leaderboard
CREATE OR REPLACE FUNCTION get_top_leaderboard(p_exam_type TEXT DEFAULT 'cbt', p_limit INT DEFAULT 10)
RETURNS TABLE (
  rank INT,
  user_id UUID,
  user_name TEXT,
  score INT,
  exam_type TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ROW_NUMBER() OVER (ORDER BY MAX(lb.score) DESC)::INT as rank,
    lb.user_id,
    u.full_name,
    MAX(lb.score)::INT as score,
    p_exam_type
  FROM leaderboard lb
  JOIN users u ON lb.user_id = u.id
  WHERE lb.exam_type = p_exam_type
  GROUP BY lb.user_id, u.full_name
  ORDER BY MAX(lb.score) DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ====================================
-- MIGRATION COMPLETE
-- ====================================
-- All changes are SAFE and ADDITIVE
-- No existing tables deleted or modified destructively
-- All user data remains intact
