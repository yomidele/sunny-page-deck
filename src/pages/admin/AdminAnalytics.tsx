import { useEffect, useState } from 'react';
import { getAdminAnalytics } from '@/lib/contentManagement';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, UserCheck, BarChart3, TrendingDown, TrendingUp } from 'lucide-react';
import Leaderboard from '@/components/Leaderboard';

interface AdminAnalyticsData {
  totalStudents: number;
  activeStudents: number;
  averagePlatformScore: number;
  mostFailedSubject: string | null;
  mostAttemptedSubject: string | null;
}

const AdminAnalytics = () => {
  const [analytics, setAnalytics] = useState<AdminAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    const data = await getAdminAnalytics();
    setAnalytics(data);
    setLoading(false);
  };

  const StatCard = ({
    icon: Icon,
    title,
    value,
    description,
    color,
  }: {
    icon: any;
    title: string;
    value: string | number;
    description?: string;
    color?: string;
  }) => (
    <Card className="bg-[#111111] border-[#1A1A1A] hover:border-[#FFD700] transition">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[#B0B0B0] text-sm mb-2">{title}</p>
            <p className={`text-3xl font-bold ${color || 'text-[#FFD700]'}`}>{value}</p>
            {description && <p className="text-xs text-[#B0B0B0] mt-2">{description}</p>}
          </div>
          <div className="bg-[#0B0B0B] p-3 rounded-lg">
            <Icon className="h-6 w-6 text-[#FFD700]" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-white py-12">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-[#FFD700]" />
            Platform Analytics
          </h1>
          <p className="text-[#B0B0B0]">Monitor platform-wide performance and student engagement</p>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-32 bg-[#111111]" />
            ))}
          </div>
        ) : analytics ? (
          <>
            {/* Main Stats */}
            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">
              <StatCard
                icon={Users}
                title="Total Students"
                value={analytics.totalStudents}
                description="Registered users"
              />
              <StatCard
                icon={UserCheck}
                title="Active Students"
                value={analytics.activeStudents}
                description={`${Math.round((analytics.activeStudents / Math.max(analytics.totalStudents, 1)) * 100)}% engagement`}
              />
              <StatCard
                icon={BarChart3}
                title="Platform Average"
                value={`${analytics.averagePlatformScore}%`}
                description="Overall platform performance"
              />
              <StatCard
                icon={TrendingDown}
                title="Most Failed Subject"
                value={analytics.mostFailedSubject || 'N/A'}
                description="Needs attention"
              />
              <StatCard
                icon={TrendingUp}
                title="Most Attempted"
                value={analytics.mostAttemptedSubject || 'N/A'}
                description="Popular subject"
              />
            </div>

            {/* Insights Cards */}
            <div className="grid lg:grid-cols-2 gap-6 mb-12">
              {/* Performance Insights */}
              <Card className="bg-[#111111] border-[#1A1A1A]">
                <CardHeader>
                  <CardTitle className="text-lg">Key Insights</CardTitle>
                  <CardDescription className="text-[#B0B0B0]">Platform health indicators</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-4 p-4 bg-[#0B0B0B] rounded-lg border border-[#1A1A1A]">
                    <div className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div>
                      <p className="font-semibold text-sm">Active Participation</p>
                      <p className="text-xs text-[#B0B0B0] mt-1">
                        {Math.round((analytics.activeStudents / Math.max(analytics.totalStudents, 1)) * 100)}% of students are actively using the platform.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 bg-[#0B0B0B] rounded-lg border border-[#1A1A1A]">
                    <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div>
                      <p className="font-semibold text-sm">Platform Performance</p>
                      <p className="text-xs text-[#B0B0B0] mt-1">
                        Average student score is {analytics.averagePlatformScore}%. Focus on content quality to improve overall performance.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 bg-[#0B0B0B] rounded-lg border border-yellow-500/30 bg-yellow-500/10">
                    <div className="flex-shrink-0 w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                    <div>
                      <p className="font-semibold text-sm">Subject Focus</p>
                      <p className="text-xs text-[#B0B0B0] mt-1">
                        {analytics.mostFailedSubject} needs additional resources or tutoring support.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 bg-[#0B0B0B] rounded-lg border border-[#1A1A1A]">
                    <div className="flex-shrink-0 w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                    <div>
                      <p className="font-semibold text-sm">Popular Subject</p>
                      <p className="text-xs text-[#B0B0B0] mt-1">
                        {analytics.mostAttemptedSubject} is the most attempted subject - students find this content valuable.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recommended Actions */}
              <Card className="bg-[#111111] border-[#1A1A1A]">
                <CardHeader>
                  <CardTitle className="text-lg">Recommended Actions</CardTitle>
                  <CardDescription className="text-[#B0B0B0]">Steps to improve platform performance</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 bg-[#0B0B0B] rounded-lg border-l-2 border-[#FFD700]">
                    <p className="text-sm font-semibold">📊 Improve Content Quality</p>
                    <p className="text-xs text-[#B0B0B0] mt-1">
                      Create more practice materials for {analytics.mostFailedSubject} to boost student performance.
                    </p>
                  </div>

                  <div className="p-3 bg-[#0B0B0B] rounded-lg border-l-2 border-green-500">
                    <p className="text-sm font-semibold">✅ Encourage Engagement</p>
                    <p className="text-xs text-[#B0B0B0] mt-1">
                      Engage inactive students ({analytics.totalStudents - analytics.activeStudents} students) with personalized messaging.
                    </p>
                  </div>

                  <div className="p-3 bg-[#0B0B0B] rounded-lg border-l-2 border-blue-500">
                    <p className="text-sm font-semibold">🎯 Leverage Popular Content</p>
                    <p className="text-xs text-[#B0B0B0] mt-1">
                      Expand {analytics.mostAttemptedSubject} content - students are showing strong interest.
                    </p>
                  </div>

                  <div className="p-3 bg-[#0B0B0B] rounded-lg border-l-2 border-purple-500">
                    <p className="text-sm font-semibold">📈 Monitor Performance Trends</p>
                    <p className="text-xs text-[#B0B0B0] mt-1">
                      Track subject performance weekly to identify trending issues early.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Leaderboards */}
            <div className="grid lg:grid-cols-2 gap-6">
              <Leaderboard examType="cbt" limit={10} title="Top CBT Performers" />
              <Leaderboard examType="practice" limit={10} title="Top Practice Performers" />
            </div>
          </>
        ) : (
          <div className="text-center py-24">
            <BarChart3 className="h-16 w-16 text-[#1A1A1A] mx-auto mb-4" />
            <p className="text-[#B0B0B0] text-lg">Loading analytics data...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAnalytics;
