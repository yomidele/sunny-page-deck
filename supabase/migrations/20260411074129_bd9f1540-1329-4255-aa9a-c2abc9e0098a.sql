
-- CBT Exam Sessions
CREATE TABLE public.cbt_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subject_ids JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress',
  start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_time TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER NOT NULL DEFAULT 120,
  total_questions INTEGER NOT NULL DEFAULT 160,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cbt_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cbt sessions" ON public.cbt_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own cbt sessions" ON public.cbt_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own cbt sessions" ON public.cbt_sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all cbt sessions" ON public.cbt_sessions FOR SELECT TO authenticated USING (is_admin(auth.uid()));

-- CBT Answers (stores each answer per question)
CREATE TABLE public.cbt_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.cbt_sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  selected_option TEXT,
  question_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(session_id, question_id)
);

ALTER TABLE public.cbt_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cbt answers" ON public.cbt_answers FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cbt_sessions cs WHERE cs.id = cbt_answers.session_id AND cs.user_id = auth.uid()));
CREATE POLICY "Users can insert own cbt answers" ON public.cbt_answers FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.cbt_sessions cs WHERE cs.id = cbt_answers.session_id AND cs.user_id = auth.uid()));
CREATE POLICY "Users can update own cbt answers" ON public.cbt_answers FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cbt_sessions cs WHERE cs.id = cbt_answers.session_id AND cs.user_id = auth.uid()));
CREATE POLICY "Admins can view all cbt answers" ON public.cbt_answers FOR SELECT TO authenticated USING (is_admin(auth.uid()));

-- CBT Results (final scores)
CREATE TABLE public.cbt_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_id UUID NOT NULL REFERENCES public.cbt_sessions(id) ON DELETE CASCADE,
  total_score INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 160,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  subject_scores JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(session_id)
);

ALTER TABLE public.cbt_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cbt results" ON public.cbt_results FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own cbt results" ON public.cbt_results FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all cbt results" ON public.cbt_results FOR SELECT TO authenticated USING (is_admin(auth.uid()));

-- Index for quick lookups
CREATE INDEX idx_cbt_sessions_user_status ON public.cbt_sessions(user_id, status);
CREATE INDEX idx_cbt_answers_session ON public.cbt_answers(session_id);
CREATE INDEX idx_cbt_results_user ON public.cbt_results(user_id);
