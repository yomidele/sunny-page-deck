---
name: CBT Features
description: Practice mode, CBT exam, AI question generation, option shuffling, configurable duration
type: feature
---

## Practice Mode

- Students can select subject + specific topic OR "All Topics" for entire subject
- Configurable question count via slider (5-50)
- Options A-D are shuffled each session (correct answer tracked)
- If topic has no questions, AI generates 50 automatically via generate-questions edge function
- Explanations shown after each answer

## CBT Exam Mode

- 4 subjects (English compulsory + 3 electives)
- Configurable duration: 30min/10q, 60min/20q, 90min/30q, 120min/40q per subject
- Timer persists across page refreshes (server-side start_time)
- Auto-submit when timer reaches zero
- Navigation panel with answered/unanswered indicators

## AI Question Generation

- Edge function: generate-questions
- Uses Lovable AI Gateway (gemini-2.5-flash)
- Generates 50 questions per call with difficulty mix (30% easy, 50% medium, 20% hard)
- Triggered: automatically when student hits empty topic, manually from admin panel
- Questions stored with difficulty and type columns

## Admin Panel

- "AI Generate" button in Question Bank to generate 50 questions for any subject+topic
- Bulk upload (CSV/PDF) still available
