-- Add difficulty and type columns to questions table
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS difficulty text NOT NULL DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'theory';
