import { useEffect, useState } from 'react';
import { getLeaderboard, LeaderboardEntry } from '@/lib/contentManagement';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Medal } from 'lucide-react';

interface LeaderboardProps {
  examType?: 'cbt' | 'practice';
  limit?: number;
  title?: string;
}

const Leaderboard = ({
  examType = 'cbt',
  limit = 10,
  title = 'Top Performers',
}: LeaderboardProps) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, [examType, limit]);

  const loadLeaderboard = async () => {
    setLoading(true);
    const data = await getLeaderboard(examType, limit);
    setLeaderboard(data);
    setLoading(false);
  };

  const getMedalColor = (rank: number): string => {
    switch (rank) {
      case 1:
        return 'bg-[#FFD700]/10 border-[#FFD700]/40';
      case 2:
        return 'bg-[#B0B0B0]/10 border-[#B0B0B0]/30';
      case 3:
        return 'bg-[#FF9800]/10 border-[#FF9800]/30';
      default:
        return 'bg-[#1A1A2E] border-[#2A2A3E]';
    }
  };

  const getMedalIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
      case 3:
        return <Medal className="h-5 w-5 text-gray-400" />;
      default:
        return null;
    }
  };

  return (
    <Card className="bg-[#0B0B0B] border-[#1A1A1A]">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-white flex items-center gap-2">
          <Trophy className="h-6 w-6 text-[#FFD700]" />
          {title}
        </CardTitle>
        <CardDescription className="text-[#B0B0B0]">
          {examType === 'cbt' ? 'CBT Exam Rankings' : 'Practice Test Rankings'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 bg-[#111111]" />
            ))}
          </div>
        ) : leaderboard.length > 0 ? (
          <div className="space-y-3">
            {leaderboard.map((entry) => (
              <div
                key={entry.user_id}
                className={`flex items-center gap-4 p-4 rounded-lg border ${getMedalColor(
                  entry.rank
                )}`}
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#FFD700] text-[#0B0B0B] font-bold text-sm flex-shrink-0">
                  {entry.rank}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate">{entry.user_name}</p>
                  <p className="text-xs text-[#B0B0B0]">
                    {entry.exam_type === 'cbt' ? 'CBT Exam' : 'Practice Test'}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {getMedalIcon(entry.rank)}
                  <span className="font-bold text-lg text-[#FFD700]">{entry.score}%</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Trophy className="h-12 w-12 text-[#1A1A1A] mx-auto mb-4" />
            <p className="text-[#B0B0B0]">No records yet. Be the first!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default Leaderboard;
