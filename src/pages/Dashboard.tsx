import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, BarChart3, GraduationCap, Trophy, TrendingUp, Clock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';

const Dashboard = () => {
  const { user } = useAuth();
  const [fullName, setFullName] = useState('');
  const [stats, setStats] = useState({ 
    sessions: 0, 
    avgScore: 0,
    bestScore: 0,
    weakestSubject: 'Loading...',
    totalQuestionsPracticed: 0 
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        // Get user name
        const { data: userData } = await supabase
          .from('users')
          .select('full_name')
          .eq('id', user.id)
          .single();
        
        if (userData) setFullName(userData.full_name);

        // Get practice sessions
        const { data: sessionsData } = await supabase
          .from('practice_sessions')
          .select('total_questions, correct_answers')
          .eq('user_id', user.id);

        if (sessionsData && sessionsData.length > 0) {
          const totalQ = sessionsData.reduce((s, r) => s + r.total_questions, 0);
          const totalC = sessionsData.reduce((s, r) => s + r.correct_answers, 0);
          const scores = sessionsData.map(s => (s.correct_answers / s.total_questions) * 100);
          const avgScore = Math.round((totalC / totalQ) * 100);
          const bestScore = Math.round(Math.max(...scores));

          setStats({
            sessions: sessionsData.length,
            avgScore,
            bestScore,
            weakestSubject: 'English',
            totalQuestionsPracticed: totalQ,
          });
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const statsCards = [
    {
      title: 'Total Tests Taken',
      value: stats.sessions,
      subtitle: 'practice sessions',
      icon: BarChart3,
      color: 'text-blue-400',
    },
    {
      title: 'Average Score',
      value: `${stats.avgScore}%`,
      subtitle: 'across all tests',
      icon: TrendingUp,
      color: 'text-green-400',
    },
    {
      title: 'Best Score',
      value: `${stats.bestScore}%`,
      subtitle: 'highest achievement',
      icon: Trophy,
      color: 'text-yellow-400',
    },
    {
      title: 'Questions Practiced',
      value: stats.totalQuestionsPracticed,
      subtitle: 'total questions solved',
      icon: Clock,
      color: 'text-purple-400',
    },
  ];

  return (
    <DashboardLayout>
      <div className="bg-[#0B0B0B] min-h-full">
        {/* Welcome Section */}
        <div className="border-b border-[#1A1A1A] bg-gradient-to-b from-[#111111] to-[#0B0B0B] px-6 py-8">
          <div className="container mx-auto max-w-7xl">
            <h1 className="text-4xl md:text-5xl font-heading font-bold text-white mb-2">
              Welcome back{fullName ? `, ${fullName}` : ''}! 👋
            </h1>
            <p className="text-lg text-[#B0B0B0]">
              You're making excellent progress toward mastering JAMB
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto max-w-7xl px-6 py-8">
          {/* Quick Start CTA */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            <Link to="/practice">
              <button className="w-full h-32 bg-gradient-to-br from-[#FFD700]/20 to-[#FFD700]/5 border border-[#FFD700]/30 hover:border-[#FFD700] rounded-2xl p-6 smooth-transition group overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-10 smooth-transition transform -skew-x-12 group-hover:translate-x-full duration-1000"></div>
                <div className="relative flex items-center justify-between h-full">
                  <div className="text-left">
                    <h3 className="text-2xl font-bold text-white mb-1 font-heading">Start Practice</h3>
                    <p className="text-[#B0B0B0]">Practice questions by subject</p>
                  </div>
                  <div className="w-14 h-14 bg-[#FFD700] rounded-full flex items-center justify-center group-hover:scale-110 smooth-transition">
                    <Play className="h-7 w-7 text-[#0B0B0B]" />
                  </div>
                </div>
              </button>
            </Link>

            <Link to="/cbt/setup">
              <button className="w-full h-32 bg-gradient-to-br from-[#111111] to-[#0B0B0B] border border-[#1A1A1A] hover:border-[#FFD700] rounded-2xl p-6 smooth-transition group overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-5 smooth-transition transform -skew-x-12 group-hover:translate-x-full duration-1000"></div>
                <div className="relative flex items-center justify-between h-full">
                  <div className="text-left">
                    <h3 className="text-2xl font-bold text-white mb-1 font-heading">Full CBT Exam</h3>
                    <p className="text-[#B0B0B0]">160 questions • 2 hours</p>
                  </div>
                  <div className="w-14 h-14 bg-[#1A1A1A] rounded-full flex items-center justify-center group-hover:bg-[#FFD700] group-hover:scale-110 smooth-transition">
                    <GraduationCap className="h-7 w-7 text-[#B0B0B0] group-hover:text-[#0B0B0B] smooth-transition" />
                  </div>
                </div>
              </button>
            </Link>
          </div>

          {/* Stats Grid */}
          <div className="mb-12">
            <h2 className="text-2xl font-heading font-bold text-white mb-6">Your Progress</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {statsCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.title}
                    className="bg-[#111111] border border-[#1A1A1A] rounded-2xl p-6 hover:border-[#FFD700] smooth-transition group"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-12 h-12 bg-[#1A1A1A] group-hover:bg-[#FFD700]/10 rounded-lg flex items-center justify-center smooth-transition ${card.color}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                    </div>
                    <h3 className="text-sm font-medium text-[#B0B0B0] mb-2">{card.title}</h3>
                    <p className="text-3xl font-bold text-white mb-1 font-heading">
                      {loading ? '...' : card.value}
                    </p>
                    <p className="text-xs text-[#B0B0B0]">{card.subtitle}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Activity / Coming Soon */}
          <div className="bg-[#111111] border border-[#1A1A1A] rounded-2xl p-8">
            <h2 className="text-2xl font-heading font-bold text-white mb-6">Recent Activity</h2>
            {stats.sessions === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-[#1A1A1A] rounded-full flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="h-8 w-8 text-[#B0B0B0]" />
                </div>
                <p className="text-[#B0B0B0] mb-6">No practice sessions yet</p>
                <Link to="/practice">
                  <Button className="bg-[#FFD700] hover:bg-yellow-500 text-[#0B0B0B] font-bold">
                    Start Your First Practice
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-[#B0B0B0]">You've completed {stats.sessions} practice session{stats.sessions !== 1 ? 's' : ''}.</p>
                <p className="text-[#B0B0B0]">Keep up the great work! 🎯</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
