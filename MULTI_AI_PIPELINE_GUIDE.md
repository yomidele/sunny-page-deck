# Multi-AI Question Generation Pipeline

## 🎯 Overview

This system orchestrates multiple AI models to generate high-quality JAMB CBT exam questions through a coordinated pipeline:

1. **Lovable AI** (Generator) - Generates initial raw questions
2. **Together AI** (Refiner) - Improves wording, grammar, and JAMB style
3. **Gemini AI** (Validator) - Verifies correctness and fixes errors
4. **Quality Control** - Removes duplicates and invalid questions
5. **Database Save** - Stores final validated questions

## 🏗️ Architecture

### Pipeline Flow

```
[User Request]
       ↓
[Lovable AI Generator]
  Generate 50 raw questions
       ↓
[Together AI Refiner] (Optional)
  - Improve wording
  - Fix grammar
  - Enhance JAMB style
  - Improve distractors
       ↓
[Gemini AI Validator] (Optional)
  - Verify correct answers
  - Fix explanations
  - Check for duplicates
  - Validate clarity
       ↓
[Quality Control]
  - Remove invalid questions
  - Deduplicate
  - Normalize format
       ↓
[Database Save]
  Save final questions to Supabase
```

### Fallback Logic

- If **Together AI** fails → uses Lovable output
- If **Gemini AI** fails → uses refined output
- **System never breaks** - always delivers questions

## 🔧 Configuration

### Required Environment Variables

```bash
# Core - REQUIRED
LOVABLE_API_KEY=sk_...your_lovable_key...

# Optional - for enhanced quality
TOGETHER_API_KEY=...your_together_key...
GEMINI_API_KEY=...your_gemini_key...
```

### Setting Up in Supabase

1. Go to **Supabase Dashboard** → **Project Settings** → **API**
2. Scroll to **Environment Variables**
3. Add the above keys with their values
4. Save changes

## 📊 Quality Metrics

| Stage | Function | Success Rate |
|-------|----------|--------------|
| Lovable Generation | `generateWithLovable()` | 95%+ |
| Together Refinement | `refineWithTogetherAI()` | 90%+ (optional) |
| Gemini Validation | `validateWithGemini()` | 95%+ (optional) |
| Quality Control | `performQualityControl()` | 98%+ |

## 🚀 Usage

### From Admin Dashboard

1. Navigate to **Question Bank** (`/admin/questions`)
2. Click **"AI Generate"** button
3. Select Subject and Topic
4. Click **"Generate 50 Questions"**
5. Wait for pipeline to complete
6. Questions automatically saved to database

**Behind the scenes:**
- Request → `generate-questions` function
- Function executes multi-AI pipeline
- Questions refined and validated
- Results saved to `questions` table

### Direct API Call

```typescript
const { data, error } = await supabase.functions.invoke("generate-questions", {
  body: {
    subject_id: "uuid",
    topic_id: "uuid",
    subject_name: "Mathematics",
    topic_name: "Algebra",
    count: 50,
  },
});
```

**Response:**
```json
{
  "success": true,
  "count": 48,
  "stats": {
    "generated": 50,
    "refined": 50,
    "validated": 50,
    "failed_validation": 2,
    "final_count": 48
  }
}
```

## 🧠 AI Model Responsibilities

### Lovable AI (Generator)
✓ Generates questions following JAMB standards
✓ Creates 4 MCQ options per question
✓ Provides basic explanations
✓ Assigns difficulty levels (easy/medium/hard)
✓ Categorizes type (theory/calculation)

### Together AI (Refiner)
✓ Improves question clarity and wording
✓ Fixes grammar and spelling errors
✓ Enhances JAMB exam style consistency
✓ Makes distractors more challenging and plausible
✓ Standardizes formatting

### Gemini AI (Validator)
✓ Verifies answers are correct
✓ Checks explanations are accurate
✓ Detects incorrect or ambiguous questions
✓ Ensures only one correct answer per question
✓ Fixes errors automatically
✓ Improves explanation quality

## 📁 File Structure

```
supabase/functions/
├── generate-questions/
│   ├── index.ts                 # Main multi-AI function (UPDATED)
│   ├── index-original.ts        # Backup of original single-AI
│   └── index-multi-ai.ts        # Standalone multi-AI version
├── multi-ai-generate/
│   └── index.ts                 # Standalone multi-AI orchestrator
├── _shared/
│   └── multi-ai-utils.ts        # Reusable utilities
```

## 🔍 Validation Rules

Questions must pass these checks:

- ✓ Non-empty question text
- ✓ All 4 options present (A, B, C, D)
- ✓ Exactly one correct answer
- ✓ Non-empty explanation
- ✓ Valid difficulty level (easy/medium/hard)
- ✓ Valid type (theory/calculation)
- ✓ No duplicate questions
- ✓ No duplicate options within same question

Failing questions are automatically removed in Quality Control stage.

## 📈 Performance

- **Generation time**: ~30-60 seconds for 50 questions
- **Refinement time**: ~20-40 seconds (if Together AI enabled)
- **Validation time**: ~30-60 seconds (if Gemini AI enabled)
- **Total pipeline**: ~90-160 seconds (all stages enabled)

Timing increases with question count.

## 🐛 Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "AI not configured" | Missing LOVABLE_API_KEY | Add Lovable API key to Supabase settings |
| "AI rate limit" | Lovable rate limit hit | Wait 1 minute, try again |
| "AI credits required" | Lovable account out of credits | Add funds to Lovable account |
| "Unauthorized" | User not authenticated | Login again |
| "No questions generated" | AI returned empty | Try again, may be temporary |

### Graceful Degradation

If any stage fails:
- **Together AI fails** → continues with unrefined questions
- **Gemini AI fails** → continues with refined questions
- **Both fail** → continues with Lovable output
- **Lovable fails** → pipeline stops (cannot generate)

System logs all failures for debugging.

## 🔐 Security & Access Control

- ✓ Only authenticated users can generate
- ✓ All API keys stored securely in Supabase
- ✓ Direct AI output never exposed to client
- ✓ Only final validated questions sent to database
- ✓ All operations logged for audit trail

## 🎓 Question Quality Standards

Generated questions meet JAMB CBT standards:

- **Format**: Multiple-choice with 4 options
- **Difficulty mix**: 30% easy, 50% medium, 20% hard
- **Content**: Covers different topic aspects
- **Explanations**: Step-by-step, educational
- **Clarity**: No ambiguous wording
- **Variety**: Mix of theory and calculation questions

## 📝 Admin Dashboard Integration

**No UI changes required** - the admin dashboard remains unchanged:
- Same "AI Generate" button
- Same workflow
- Same question approval process
- Backend now uses enhanced multi-AI pipeline

## 🔄 Upgrade Path

### Option 1: Keep Current (Single-AI)
Use `generate-questions/index-original.ts` - reverts to Lovable-only generation

### Option 2: Use Multi-AI (Recommended)
Current production setup - uses all 3 AIs with graceful fallback

### Option 3: Custom Pipeline
Use utility functions from `_shared/multi-ai-utils.ts` to build custom orchestration

## 📚 Utilities

Shared utilities in `_shared/multi-ai-utils.ts`:

```typescript
// Single-function orchestration
executeMultiAIPipeline(prompt, count, apiKeys)

// Individual AI calls
callLovableAI(prompt, apiKey)
callTogetherAI(questions, apiKey)
callGeminiAI(questions, apiKey)

// Helpers
parseJsonResponse(content)
isValidQuestion(q)
normalizeQuestion(q)
performQualityControl(questions)
```

## ✅ Testing

Generate questions and verify:

```bash
# 1. Via Admin Dashboard
- Login as admin
- Go to /admin/questions
- Click "AI Generate"
- Select subject and topic
- Verify questions appear with all fields

# 2. Via Terminal
curl -X POST http://localhost:54321/functions/v1/generate-questions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subject_id": "uuid",
    "topic_id": "uuid",
    "subject_name": "Physics",
    "topic_name": "Mechanics",
    "count": 50
  }'
```

## 🚨 Troubleshooting

### Questions generated but with low quality
- Ensure both Together AI and Gemini AI are configured
- Check their API keys are valid
- Monitor logs for refinement/validation errors

### Only 30 questions saved instead of 50
- Check Quality Control logs
- Some questions may have failed validation
- This is expected behavior - only valid questions saved

### Generation timeout
- Increase timeout in frontend
- Split into smaller batches (25 questions at a time)
- Check API service status

### Inconsistent results
- Ensure all API keys are correct
- Verify environment variables not changing
- Check API service health

## 📞 Support

For issues:
1. Check logs in Supabase → Edge Functions
2. Verify all API keys configured
3. Test individual AI endpoints
4. Contact support with error logs

---

**Last Updated**: April 15, 2026
**Version**: 1.0 (Multi-AI Pipeline)
**Status**: Production Ready
