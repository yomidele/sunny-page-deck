import { useEffect, useState } from 'react';
import { getPerformanceInsights, PerformanceInsight, markInsightAsRead } from '@/lib/contentManagement';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, CheckCircle, Lightbulb, Star, TrendingUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PerformanceInsightsProps {
  userId: string;
  compact?: boolean;
}

const PerformanceInsights = ({ userId, compact = false }: PerformanceInsightsProps) => {
  const [insights, setInsights] = useState<PerformanceInsight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInsights();
  }, [userId]);

  const loadInsights = async () => {
    setLoading(true);
    const data = await getPerformanceInsights(userId);
    setInsights(data);
    setLoading(false);
  };

  const handleDismiss = async (id: string) => {
    await markInsightAsRead(id);
    setInsights(insights.filter((i) => i.id !== id));
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'weakness':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'strength':
        return <Star className="h-5 w-5 text-yellow-500" />;
      case 'improvement':
        return <TrendingUp className="h-5 w-5 text-green-500" />;
      case 'encouragement':
        return <CheckCircle className="h-5 w-5 text-blue-500" />;
      default:
        return <Lightbulb className="h-5 w-5 text-purple-500" />;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'weakness':
        return 'bg-red-500/10 border-red-500/30';
      case 'strength':
        return 'bg-yellow-500/10 border-yellow-500/30';
      case 'improvement':
        return 'bg-green-500/10 border-green-500/30';
      case 'encouragement':
        return 'bg-blue-500/10 border-blue-500/30';
      default:
        return 'bg-purple-500/10 border-purple-500/30';
    }
  };

  if (compact && insights.length === 0) {
    return null;
  }

  const displayInsights = compact ? insights.slice(0, 3) : insights;

  return (
    <Card className="bg-[#0B0B0B] border-[#1A1A1A]">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-[#FFD700]" />
          Smart Insights
        </CardTitle>
        <CardDescription className="text-[#B0B0B0]">
          Personalized recommendations to improve your scores
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 bg-[#111111]" />
            ))}
          </div>
        ) : displayInsights.length > 0 ? (
          <div className="space-y-3">
            {displayInsights.map((insight) => (
              <div
                key={insight.id}
                className={`flex gap-4 p-4 rounded-lg border ${getInsightColor(insight.insight_type)}`}
              >
                <div className="flex-shrink-0 mt-1">{getInsightIcon(insight.insight_type)}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm">
                    {insight.subject}
                    {insight.topic && ` - ${insight.topic}`}
                  </p>
                  <p className="text-sm text-[#B0B0B0] mt-1">{insight.message}</p>
                </div>
                {!compact && (
                  <button
                    onClick={() => handleDismiss(insight.id)}
                    className="flex-shrink-0 text-[#B0B0B0] hover:text-white transition"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Lightbulb className="h-12 w-12 text-[#1A1A1A] mx-auto mb-4" />
            <p className="text-[#B0B0B0]">Complete more exams to get personalized insights.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PerformanceInsights;
