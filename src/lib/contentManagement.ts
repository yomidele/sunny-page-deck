import { supabase } from "@/integrations/supabase/client";

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Extract YouTube video ID from various URL formats
 */
export const extractYoutubeId = (url: string): string | null => {
  try {
    // Handle youtu.be format
    if (url.includes("youtu.be/")) {
      const match = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
      return match?.[1] || null;
    }

    // Handle youtube.com/watch?v= format
    if (url.includes("youtube.com/watch")) {
      const match = url.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/);
      return match?.[1] || null;
    }

    // Handle youtube.com/embed format
    if (url.includes("youtube.com/embed/")) {
      const match = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
      return match?.[1] || null;
    }

    // If it's just the ID (11 characters)
    if (url.match(/^[a-zA-Z0-9_-]{11}$/)) {
      return url;
    }

    return null;
  } catch {
    return null;
  }
};

/**
 * Get YouTube thumbnail URL
 */
export const getYoutubeThumbnail = (videoId: string): string => {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
};

/**
 * Get YouTube embed URL
 */
export const getYoutubeEmbedUrl = (videoId: string): string => {
  return `https://www.youtube.com/embed/${videoId}`;
};

// ============================================
// VIDEO OPERATIONS
// ============================================

export interface Video {
  id: string;
  youtube_url: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
  video_id: string;
  duration_seconds?: number;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch all videos
 */
export const getVideos = async (): Promise<Video[]> => {
  try {
    const { data, error } = await supabase
      .from("videos")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching videos:", error);
    return [];
  }
};

/**
 * Create new video
 */
export const createVideo = async (videoData: {
  youtube_url: string;
  title: string;
  description?: string;
  duration_seconds?: number;
}): Promise<{ success: boolean; data?: Video; error?: string }> => {
  try {
    const videoId = extractYoutubeId(videoData.youtube_url);
    if (!videoId) {
      return { success: false, error: "Invalid YouTube URL" };
    }

    const { data, error } = await supabase
      .from("videos")
      .insert({
        youtube_url: videoData.youtube_url,
        title: videoData.title,
        description: videoData.description,
        video_id: videoId,
        thumbnail_url: getYoutubeThumbnail(videoId),
        duration_seconds: videoData.duration_seconds,
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("Error creating video:", error);
    return { success: false, error: String(error) };
  }
};

/**
 * Update video
 */
export const updateVideo = async (
  id: string,
  updates: Partial<Video>
): Promise<{ success: boolean; data?: Video; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from("videos")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("Error updating video:", error);
    return { success: false, error: String(error) };
  }
};

/**
 * Delete video
 */
export const deleteVideo = async (
  id: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.from("videos").delete().eq("id", id);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Error deleting video:", error);
    return { success: false, error: String(error) };
  }
};

// ============================================
// POST OPERATIONS
// ============================================

export interface Post {
  id: string;
  title: string;
  content: string;
  featured_image?: string;
  excerpt?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch all posts (paginated)
 */
export const getPosts = async (limit: number = 10, offset: number = 0): Promise<Post[]> => {
  try {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching posts:", error);
    return [];
  }
};

/**
 * Get single post
 */
export const getPost = async (id: string): Promise<Post | null> => {
  try {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching post:", error);
    return null;
  }
};

/**
 * Create new post
 */
export const createPost = async (postData: {
  title: string;
  content: string;
  featured_image?: string;
  excerpt?: string;
}): Promise<{ success: boolean; data?: Post; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from("posts")
      .insert(postData)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("Error creating post:", error);
    return { success: false, error: String(error) };
  }
};

/**
 * Update post
 */
export const updatePost = async (
  id: string,
  updates: Partial<Post>
): Promise<{ success: boolean; data?: Post; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from("posts")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("Error updating post:", error);
    return { success: false, error: String(error) };
  }
};

/**
 * Delete post
 */
export const deletePost = async (
  id: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.from("posts").delete().eq("id", id);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Error deleting post:", error);
    return { success: false, error: String(error) };
  }
};

// ============================================
// ANALYTICS OPERATIONS
// ============================================

export interface UserStats {
  id: string;
  user_id: string;
  total_tests_taken: number;
  average_score: number;
  best_score: number;
  worst_score: number;
  weakest_subject?: string;
  strongest_subject?: string;
  total_time_spent_seconds: number;
  created_at: string;
  updated_at: string;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  user_name: string;
  score: number;
  exam_type: string;
}

export interface PerformanceInsight {
  id: string;
  user_id: string;
  insight_type: 'improvement' | 'weakness' | 'strength' | 'encouragement';
  subject: string;
  topic?: string;
  message: string;
  created_at: string;
  is_read: boolean;
}

/**
 * Get user stats
 */
export const getUserStats = async (userId: string): Promise<UserStats | null> => {
  try {
    const { data, error } = await supabase
      .from("user_stats")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error && error.code === 'PGRST116') return null; // Not found
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching user stats:", error);
    return null;
  }
};

/**
 * Get leaderboard (top students)
 */
export const getLeaderboard = async (
  examType: 'cbt' | 'practice' = 'cbt',
  limit: number = 10
): Promise<LeaderboardEntry[]> => {
  try {
    const { data, error } = await supabase
      .rpc('get_top_leaderboard', {
        p_exam_type: examType,
        p_limit: limit,
      });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    // Fallback to direct query if RPC fails
    return await getLeaderboardFallback(examType, limit);
  }
};

/**
 * Fallback leaderboard query
 */
const getLeaderboardFallback = async (
  examType: 'cbt' | 'practice',
  limit: number
): Promise<LeaderboardEntry[]> => {
  try {
    const { data, error } = await supabase
      .from("leaderboard")
      .select("user_id, score, exam_type, users!inner(full_name)")
      .eq("exam_type", examType)
      .order("score", { ascending: false })
      .limit(limit);

    if (error) throw error;
    
    return (data || []).map((item: any, index: number) => ({
      rank: index + 1,
      user_id: item.user_id,
      user_name: item.users?.full_name || 'Anonymous',
      score: item.score,
      exam_type: item.exam_type,
    }));
  } catch (error) {
    console.error("Error in leaderboard fallback:", error);
    return [];
  }
};

/**
 * Get user rank in leaderboard
 */
export const getUserRank = async (
  userId: string,
  examType: 'cbt' | 'practice' = 'cbt'
): Promise<number | null> => {
  try {
    const { data, error } = await supabase
      .from("leaderboard")
      .select("score")
      .eq("exam_type", examType)
      .eq("user_id", userId)
      .order("score", { ascending: false })
      .limit(1)
      .single();

    if (error && error.code === 'PGRST116') return null;
    if (error) throw error;

    const userScore = data?.score;
    const { count } = await supabase
      .from("leaderboard")
      .select("*", { count: 'exact', head: true })
      .eq("exam_type", examType)
      .gt("score", userScore);

    return (count || 0) + 1;
  } catch (error) {
    console.error("Error fetching user rank:", error);
    return null;
  }
};

/**
 * Record exam result and update stats
 */
export const recordExamResult = async (
  userId: string,
  score: number,
  examType: 'cbt' | 'practice',
  subject: string,
  durationSeconds: number
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Add to leaderboard
    const { error: lbError } = await supabase
      .from("leaderboard")
      .insert({
        user_id: userId,
        score,
        exam_type: examType,
        subject,
      });

    if (lbError) throw lbError;

    // Call RPC to update user stats
    const { error: statsError } = await supabase
      .rpc('update_user_stats_after_exam', {
        p_user_id: userId,
        p_score: score,
        p_subject: subject,
        p_duration_seconds: durationSeconds,
      });

    if (statsError) throw statsError;

    return { success: true };
  } catch (error) {
    console.error("Error recording exam result:", error);
    return { success: false, error: String(error) };
  }
};

/**
 * Get performance insights for user
 */
export const getPerformanceInsights = async (
  userId: string
): Promise<PerformanceInsight[]> => {
  try {
    const { data, error } = await supabase
      .from("performance_insights")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching insights:", error);
    return [];
  }
};

/**
 * Create performance insight
 */
export const createPerformanceInsight = async (
  userId: string,
  insightType: 'improvement' | 'weakness' | 'strength' | 'encouragement',
  subject: string,
  message: string,
  topic?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from("performance_insights")
      .insert({
        user_id: userId,
        insight_type: insightType,
        subject,
        topic,
        message,
      });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Error creating insight:", error);
    return { success: false, error: String(error) };
  }
};

/**
 * Mark insight as read
 */
export const markInsightAsRead = async (
  insightId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from("performance_insights")
      .update({ is_read: true })
      .eq("id", insightId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Error marking insight as read:", error);
    return { success: false, error: String(error) };
  }
};

/**
 * Generate smart performance insights (rule-based AI logic)
 */
export const generateSmartInsights = async (
  userId: string,
  stats: UserStats,
  recentScore: number
): Promise<void> => {
  try {
    // Rule 1: If repeated low performance in subject
    if (recentScore < 40 && stats.weakest_subject) {
      await createPerformanceInsight(
        userId,
        'weakness',
        stats.weakest_subject,
        `Focus more on ${stats.weakest_subject} practice. Try dedicating 2-3 hours daily to this subject.`
      );
    }

    // Rule 2: If score improved
    if (recentScore > stats.average_score && recentScore > 50) {
      await createPerformanceInsight(
        userId,
        'improvement',
        stats.strongest_subject || 'General',
        `Great improvement! Your score increased to ${recentScore}%. Keep up this momentum!`
      );
    }

    // Rule 3: If high performer
    if (recentScore >= 80) {
      await createPerformanceInsight(
        userId,
        'strength',
        stats.strongest_subject || 'General',
        `Excellent performance! You're demonstrating strong mastery in ${stats.strongest_subject || 'the material'}. Consider helping peers!`
      );
    }

    // Rule 4: General encouragement
    if (stats.total_tests_taken > 5 && stats.average_score < 50) {
      await createPerformanceInsight(
        userId,
        'encouragement',
        'General',
        `You've completed ${stats.total_tests_taken} tests. Consistency is key - keep practicing and you'll see improvement!`
      );
    }
  } catch (error) {
    console.error("Error generating insights:", error);
  }
};

/**
 * Get admin analytics
 */
export const getAdminAnalytics = async (): Promise<{
  totalStudents: number;
  activeStudents: number;
  averagePlatformScore: number;
  mostFailedSubject: string | null;
  mostAttemptedSubject: string | null;
}> => {
  try {
    // Get total students
    const { count: totalStudents } = await supabase
      .from("users")
      .select("*", { count: 'exact', head: true });

    // Get active students (those with stats)
    const { count: activeStudents } = await supabase
      .from("user_stats")
      .select("*", { count: 'exact', head: true });

    // Get average platform score
    const { data: avgScoreData } = await supabase
      .from("user_stats")
      .select("average_score");
    
    const averagePlatformScore = avgScoreData
      ? (avgScoreData.reduce((acc: number, s: any) => acc + (s.average_score || 0), 0) / (avgScoreData.length || 1))
      : 0;

    // Get most failed subject
    const { data: subjectStats } = await supabase
      .from("leaderboard")
      .select("subject, score")
      .lt("score", 50);

    const failureCount: Record<string, number> = {};
    (subjectStats || []).forEach((item: any) => {
      failureCount[item.subject] = (failureCount[item.subject] || 0) + 1;
    });

    const mostFailedSubject = Object.entries(failureCount).sort(
      ([, a], [, b]) => (b as number) - (a as number)
    )[0]?.[0] || null;

    // Get most attempted subject
    const { data: allAttempts } = await supabase
      .from("leaderboard")
      .select("subject");

    const attemptCount: Record<string, number> = {};
    (allAttempts || []).forEach((item: any) => {
      attemptCount[item.subject] = (attemptCount[item.subject] || 0) + 1;
    });

    const mostAttemptedSubject = Object.entries(attemptCount).sort(
      ([, a], [, b]) => (b as number) - (a as number)
    )[0]?.[0] || null;

    return {
      totalStudents: totalStudents || 0,
      activeStudents: activeStudents || 0,
      averagePlatformScore: Math.round(averagePlatformScore * 100) / 100,
      mostFailedSubject,
      mostAttemptedSubject,
    };
  } catch (error) {
    console.error("Error fetching admin analytics:", error);
    return {
      totalStudents: 0,
      activeStudents: 0,
      averagePlatformScore: 0,
      mostFailedSubject: null,
      mostAttemptedSubject: null,
    };
  }
};
