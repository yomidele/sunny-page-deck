import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Trophy, Target, CheckCircle2, XCircle, RotateCcw, ArrowRight } from 'lucide-react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';

type SubjectScore = {
  correct: number;
  total: number;
  name: string;
};

const CbtResult = () => {
  const { user } = useAuth();
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [result, setResult] = useState<{
    total_score: number;
    total_questions: number;
    correct_answers: number;
    subject_scores: Record<string, SubjectScore>;
    created_at: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !sessionId) return;

    const load = async () => {
      const { data } = await supabase
        .from('cbt_results')
        .select('*')
        .eq('session_id', sessionId)
        .eq('user_id', user.id)
        .single();

      if (data) {
        setResult({
          total_score: data.total_score,
          total_questions: data.total_questions,
          correct_answers: data.correct_answers,
          subject_scores: data.subject_scores as Record<string, SubjectScore>,
          created_at: data.created_at,
        });
      }
      setLoading(false);
    };
    load();
  }, [user, sessionId]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="bg-[#0B0B0B] min-h-full flex items-center justify-center">
          <p className="text-[#B0B0B0]">Loading results…</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!result) {
    return (
      <DashboardLayout>
        <div className="bg-[#0B0B0B] min-h-full flex items-center justify-center flex-col gap-4">
          <p className="text-[#B0B0B0]">Result not found</p>
          <Link to="/dashboard">
            <Button className="bg-[#FFD700] hover:bg-yellow-500 text-[#0B0B0B] font-bold">Back to Dashboard</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const scorePercent = Math.round((result.correct_answers / result.total_questions) * 100);
  const subjectEntries = Object.entries(result.subject_scores);
  const isPassing = scorePercent >= 50;

  return (
    <DashboardLayout>
      <div className="bg-[#0B0B0B] min-h-full px-6 py-8">
        <div className="max-w-4xl mx-auto">
          
          {/* Heading */}
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-6xl font-heading font-bold text-white mb-2">
              Exam Complete! 🎉
            </h1>
            <p className="text-[#B0B0B0] text-lg">
              {new Date(result.created_at).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>

          {/* Main Score Card */}
          <div className="bg-gradient-to-br from-[#111111] to-[#0B0B0B] border-2 border-[#FFD700] rounded-2xl p-12 mb-12 text-center">
            <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-8 ${
              isPassing
                ? 'bg-green-500/20 border-2 border-green-500'
                : 'bg-red-500/20 border-2 border-red-500'
            }`}>
              <Trophy className={`h-12 w-12 ${isPassing ? 'text-green-400' : 'text-red-400'}`} />
            </div>
            
            <p className="text-[#B0B0B0] text-lg mb-4">Your Score</p>
            <div className={`text-7xl font-heading font-bold mb-8 ${
              isPassing ? 'text-[#FFD700]' : 'text-red-400'
            }`}>
              {scorePercent}%
            </div>

            {isPassing && (
              <p className="text-green-400 font-semibold text-lg">Outstanding! You passed! 🌟</p>
            )}
            {!isPassing && scorePercent >= 40 && (
              <p className="text-yellow-400 font-semibold text-lg">Almost there! Keep practicing! 💪</p>
            )}
            {scorePercent < 40 && (
              <p className="text-blue-400 font-semibold text-lg">Great effort! More practice needed 📚</p>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-[#111111] border border-[#1A1A1A] rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-[#1A1A1A] rounded-lg flex items-center justify-center">
                  <Target className="h-6 w-6 text-[#FFD700]" />
                </div>
                <div>
                  <p className="text-[#B0B0B0] text-sm">Total Questions</p>
                  <p className="text-3xl font-heading font-bold text-white">{result.total_questions}</p>
                </div>
              </div>
            </div>

            <div className="bg-[#111111] border border-green-500/30 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-green-400" />
                </div>
                <div>
                  <p className="text-[#B0B0B0] text-sm">Correct Answers</p>
                  <p className="text-3xl font-heading font-bold text-green-400">{result.correct_answers}</p>
                </div>
              </div>
            </div>

            <div className="bg-[#111111] border border-red-500/30 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center">
                  <XCircle className="h-6 w-6 text-red-400" />
                </div>
                <div>
                  <p className="text-[#B0B0B0] text-sm">Wrong Answers</p>
                  <p className="text-3xl font-heading font-bold text-red-400">{result.total_questions - result.correct_answers}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Subject Breakdown */}
          <div className="mb-12">
            <h2 className="text-2xl font-heading font-bold text-white mb-6">Subject Performance</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {subjectEntries.map(([key, subject]) => {
                const percentage = Math.round((subject.correct / subject.total) * 100);
                return (
                  <div
                    key={key}
                    className="bg-[#111111] border border-[#1A1A1A] rounded-2xl p-6"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-white">{subject.name}</h3>
                      <span className={`text-lg font-bold ${
                        percentage >= 60 ? 'text-green-400' : percentage >= 40 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {percentage}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-[#0B0B0B] rounded-full overflow-hidden mb-2">
                      <div
                        className={`h-full smooth-transition ${
                          percentage >= 60
                            ? 'bg-green-500'
                            : percentage >= 40
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <p className="text-sm text-[#B0B0B0]">
                      {subject.correct} out of {subject.total} correct
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link to="/cbt/setup" className="flex-1">
              <Button className="w-full bg-[#FFD700] hover:bg-yellow-500 text-[#0B0B0B] font-bold h-12">
                Try Another Exam
                <RotateCcw className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/dashboard" className="flex-1">
              <Button
                variant="outline"
                className="w-full border-[#1A1A1A] text-[#B0B0B0] hover:bg-[#111111] h-12 font-bold"
              >
                Back to Dashboard
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CbtResult;
