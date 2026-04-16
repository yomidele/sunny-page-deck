import { useEffect, useState } from 'react';
import { getUserStats, UserStats } from '@/lib/contentManagement';
import { useAdmin } from '@/hooks/useAdmin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, Award, Target, TrendingUp, Clock, BookOpen } from 'lucide-react';
import Leaderboard from '@/components/Leaderboard';
import PerformanceInsights from '@/components/PerformanceInsights';

const StudentAnalytics = () => {
  const { user } = useAdmin();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadStats();
    }
  }, [user?.id]);

  const loadStats = async () => {
    if (!user?.id) return;
    setLoading(true);
    const data = await getUserStats(user.id);
    setStats(data);
    setLoading(false);
  };

  const getGradeColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 70) return 'text-blue-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 70) return 'bg-blue-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const StatCard = ({
    icon: Icon,
    title,
    value,
    badge,
    iconBg,
    valueColor,
  }: {
    icon: any;
    title: string;
    value: string | number;
    badge?: string;
    iconBg: string;
    valueColor: string;
  }) => (
    <div className="group relative">
      <div className="absolute inset-0 bg-gradient-to-br from-[#1A1A1A] to-[#0B0B0B] rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 blur-xl -z-10" />
      <Card className="bg-gradient-to-br from-[#1A1A1A] to-[#0F0F0F] border border-[#2A2A2A] hover:border-[#FFD700]/50 transition-all duration-300 rounded-2xl h-full">
        <CardContent className="pt-8 pb-8 px-6 h-full flex flex-col">
          <div className="flex items-start justify-between mb-6">
            <div className={`${iconBg} p-4 rounded-xl`}>
              <Icon className="h-6 w-6 text-white" />
            </div>
            {badge && (
              <span className="bg-orange-500/20 border border-orange-500/50 text-orange-400 text-xs font-bold px-3 py-1 rounded-full">
                {badge}
              </span>
            )}
          </div>
          
          <p className="text-[#888888] text-sm font-medium mb-3">{title}</p>
          <p className={`text-4xl font-black ${valueColor} leading-tight`}>{value}</p>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-white py-12">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-[#FFD700]" />
            Your Performance Analytics
          </h1>
          <p className="text-[#B0B0B0]">Track your progress and identify improvement areas</p>
        </div>

        {loading ? (
          <>
            <Skeleton className="h-64 bg-[#111111] mb-12 rounded-2xl" />
            <div className="grid md:grid-cols-2 gap-6 mb-12">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-40 bg-[#111111] rounded-2xl" />
              ))}
            </div>
          </>
        ) : stats ? (
          <>
            {/* Main Hero Card - Average Score */}
            <div className="mb-12 group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-[#1A1A1A] to-[#0B0B0B] rounded-3xl opacity-0 group-hover:opacity-100 transition-all duration-300 blur-2xl -z-10" />
              <Card className="bg-gradient-to-br from-[#1A1A1A] to-[#0F0F0F] border border-[#2A2A2A] hover:border-[#FFD700]/50 transition-all duration-300 rounded-3xl overflow-hidden">
                <CardContent className="pt-10 pb-10 px-8">
                  <div className="mb-8">
                    <p className="text-[#888888] text-lg font-semibold mb-4">Average Score</p>
                    <div className="flex items-baseline gap-3">
                      <p className={`text-6xl font-black ${getGradeColor(stats.average_score)}`}>
                        {Math.round(stats.average_score)}%
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                        <span className="text-[#888888] text-sm">Best: {stats.best_score}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-[#888888] text-sm font-medium">Progress</label>
                      <span className="text-[#FFD700] font-bold text-lg">{Math.round(stats.average_score)}%</span>
                    </div>
                    <div className="w-full bg-[#0B0B0B] rounded-full h-3 overflow-hidden border border-[#2A2A2A]">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${getProgressColor(stats.average_score)}`}
                        style={{ width: `${Math.min(stats.average_score, 100)}%` }}
                      />
                    </div>
                    <p className="text-[#666666] text-xs mt-3">Based on {stats.total_tests_taken} exam{stats.total_tests_taken !== 1 ? 's' : ''}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Stats Grid - 2x2 */}
            <div className="grid md:grid-cols-2 gap-6 mb-12">
              <StatCard
                icon={Target}
                title="Tests Taken"
                value={stats.total_tests_taken}
                iconBg="bg-teal-500/20"
                valueColor="text-teal-400"
              />
              <StatCard
                icon={Clock}
                title="Time Invested"
                value={`${Math.floor(stats.total_time_spent_seconds / 3600)}h ${Math.floor((stats.total_time_spent_seconds % 3600) / 60)}m`}
                iconBg="bg-purple-500/20"
                valueColor="text-purple-400"
              />
              <StatCard
                icon={TrendingUp}
                title="Strongest Subject"
                value={stats.strongest_subject || 'N/A'}
                iconBg="bg-green-500/20"
                valueColor="text-green-400"
              />
              <StatCard
                icon={BookOpen}
                title="Weakest Subject"
                value={stats.weakest_subject || 'N/A'}
                iconBg="bg-red-500/20"
                valueColor="text-red-400"
              />
            </div>

            {/* Performance Insights */}
            <div className="mb-12">
              <PerformanceInsights userId={user?.id || ''} />
            </div>

            {/* Leaderboards */}
            <div className="grid lg:grid-cols-2 gap-6">
              <Leaderboard examType="cbt" limit={10} title="CBT Leaderboard" />
              <Leaderboard examType="practice" limit={10} title="Practice Leaderboard" />
            </div>
          </>
        ) : (
          <div className="text-center py-24">
            <BarChart3 className="h-16 w-16 text-[#1A1A1A] mx-auto mb-4" />
            <p className="text-[#B0B0B0] text-lg">
              Start taking exams to see your analytics and track progress.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentAnalytics;
