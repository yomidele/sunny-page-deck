# Multi-AI Pipeline - Deployment & Configuration Guide

## 🚀 Quick Start

### 1. Verify Implementation

The multi-AI pipeline is already implemented in:
- ✅ `supabase/functions/generate-questions/index.ts` - **PRODUCTION ACTIVE**
- ✅ `supabase/functions/multi-ai-generate/index.ts` - Alternative standalone
- ✅ `supabase/functions/_shared/multi-ai-utils.ts` - Reusable utilities

### 2. Configure API Keys

**Required:**
- Lovable AI API Key (for question generation)

**Recommended:**
- Together AI API Key (for refinement)
- Gemini AI API Key (for validation)

### 3. Add to Supabase Environment

#### Step A: Log into Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **Settings** (bottom of sidebar)
4. Click **Configuration** → **Secrets**

#### Step B: Add API Keys

Click "New Secret" and add these (copying exact values from each service):

```
LOVABLE_API_KEY = sk_xxxxxxxxxxxxx
TOGETHER_API_KEY = xxxxxxxxxxxxxxxxxx
GEMINI_API_KEY = xxxxxxxxxxxxxxxxxx
```

**Note**: Leave Together/Gemini blank if you only want Lovable (will still work)

#### Step C: Redeploy Functions

```bash
# Terminal in project root
supabase functions deploy generate-questions
supabase functions deploy multi-ai-generate
```

Or use Supabase CLI:
```bash
supabase deploy
```

### 4. Test the Pipeline

#### Via Admin Dashboard (Easiest)
1. Login as admin: `/admin/login`
2. Go to Question Bank: `/admin/questions`
3. Click **"AI Generate"** button
4. Select subject and topic
5. Click **"Generate 50 Questions"**
6. Watch logs in Supabase dashboard

#### Via Terminal
```bash
# Set your token
TOKEN="your_admin_token_here"

curl -X POST http://localhost:54321/functions/v1/generate-questions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subject_id": "12345",
    "topic_id": "67890",
    "subject_name": "Physics",
    "topic_name": "Mechanics",
    "count": 50
  }'
```

## 📋 Getting API Keys

### Lovable AI
1. Visit https://lovable.dev
2. Sign in or create account
3. Go to API keys section
4. Generate new API key prefixed with `sk_`
5. Copy and save securely

**Pricing**: Pay-as-you-go (usually $1-5 per 50 questions)

### Together AI
1. Visit https://www.together.ai
2. Create account
3. Go to API keys
4. Generate new API key
5. Copy and save securely

**Pricing**: Credit-based (~$0.50-1 per 50 questions)

### Gemini AI
1. Visit https://aistudio.google.com
2. Create/sign into Google account
3. Generate API key
4. Copy and save securely

**Pricing**: Free tier available (100 requests/day), paid for more

## ✅ Verification Checklist

After setup, verify everything works:

- [ ] API keys added to Supabase Secrets
- [ ] Functions deployed successfully
- [ ] No errors in Supabase function logs
- [ ] Test generation creates questions in database
- [ ] Admin dashboard button works
- [ ] Generated questions have all required fields
- [ ] Difficulty distribution ~30/50/20
- [ ] Explanations are clear and complete
- [ ] No duplicate questions

## 🔍 Monitor Pipeline

### Check Logs

```bash
# Via Supabase CLI
supabase functions logs generate-questions --limit 10

# Or in Supabase Dashboard:
# 1. Project home
# 2. Edge Functions (left sidebar)
# 3. Click "generate-questions"
# 4. View logs and invocations tab
```

### Expected Log Output

```
[Multi-AI Pipeline] Starting for Physics > Mechanics (50 questions)
[Multi-AI Pipeline] APIs available: Lovable(✓) Together(✓) Gemini(✓)
[Lovable AI] Generating raw questions...
[Lovable AI] ✓ Generated 50 questions
[Together AI] Refining questions...
[Together AI] ✓ Refined 50 questions
[Gemini AI] Validating questions...
[Gemini AI] ✓ Validated 50 questions
[Multi-AI Pipeline] Running quality control...
[Quality Control] Removed 2 duplicate questions
[Multi-AI Pipeline] Saving to database...
[Multi-AI Pipeline] ✓ Complete! 48 questions generated and saved
```

## 🔧 Troubleshooting

### "API not configured"
**Issue**: LOVABLE_API_KEY not found
**Fix**: 
1. Check Supabase Secrets are saved
2. Verify key name is exactly `LOVABLE_API_KEY`
3. Redeploy functions after adding key

### "API rate limit"
**Issue**: Hit provider's rate limit
**Fix**:
1. Wait 60 seconds and retry
2. Upgrade API plan to increase limits
3. Split into smaller batches

### Questions saved but no refinement/validation
**Issue**: Together/Gemini keys not configured
**This is normal** - system uses Lovable output
**To enable refinement:**
1. Add TOGETHER_API_KEY to Secrets
2. Add GEMINI_API_KEY to Secrets
3. Redeploy functions

### Only partial questions saved
**Issue**: Some questions failed validation
**This is expected** - system only saves valid questions
**To improve:**
1. Ensure all 3 AIs configured
2. Check Gemini is validating properly
3. Monitor AI refinement quality

## 🎯 Performance Optimization

### Reduce Generation Time

**If too slow** (>120 seconds):
1. Use smaller batch sizes (25 instead of 50)
2. Disable Gemini validation (set GEMINI_API_KEY empty)
3. Run on schedule instead of on-demand

**If budget is concern**:
1. Use Lovable + Together only (skip Gemini)
2. Batch generation during off-hours
3. Reuse existing refined questions

### Improve Question Quality

**If questions need improvement**:
1. Ensure Together AI enabled (add TOGETHER_API_KEY)
2. Ensure Gemini AI enabled (add GEMINI_API_KEY)
3. Increase question count (larger batches = better quality)
4. Use specific prompts for subject/topic

## 📊 Cost Estimation

**Per 50 questions generated:**

| Config | Cost | Speed | Quality |
|--------|------|-------|---------|
| Lovable only | ~$1-2 | ⚡⚡⚡ | ⭐⭐ |
| Lovable + Together | ~$2-3 | ⚡⚡ | ⭐⭐⭐ |
| All 3 AIs | ~$3-5 | ⚡ | ⭐⭐⭐⭐ |
| Gemini free tier | ~$0-1 | ⚡ | ⭐⭐⭐ |

## 🚀 Advanced Usage

### Use Multi-AI without Admin Dashboard

```typescript
// In frontend or backend
const { data, error } = await supabase.functions.invoke("multi-ai-generate", {
  body: {
    subject_id: "uuid",
    topic_id: "uuid", 
    subject_name: string,
    topic_name: string,
    count: number,
    prompt: "Custom generation prompt"  // Optional
  }
});
```

### Custom Question Generation

Use utilities for custom workflows:

```typescript
import { executeMultiAIPipeline } from "@/supabase/functions/_shared/multi-ai-utils.ts";

const result = await executeMultiAIPipeline(
  "Your custom prompt here",
  50,  // question count
  {
    lovable: process.env.LOVABLE_API_KEY!,
    together: process.env.TOGETHER_API_KEY,
    gemini: process.env.GEMINI_API_KEY,
  }
);

console.log(`Generated ${result.stats.final} questions`);
```

## 🔄 Rollback If Needed

If you need to revert to single-AI (Lovable only):

```bash
# Copy original function
cp supabase/functions/generate-questions/index-original.ts \
   supabase/functions/generate-questions/index.ts

# Redeploy
supabase functions deploy generate-questions
```

## 📞 Support & Issues

### Debug Mode

Add to function to enable verbose logging:

```typescript
// In generate-questions/index.ts at top of serve()
const DEBUG = true;

if (DEBUG) {
  console.log("Request body:", req.body);
  console.log("API keys available:", {
    lovable: !!Deno.env.get("LOVABLE_API_KEY"),
    together: !!Deno.env.get("TOGETHER_API_KEY"),
    gemini: !!Deno.env.get("GEMINI_API_KEY"),
  });
}
```

### Common Issues Reference

See [MULTI_AI_PIPELINE_GUIDE.md](./MULTI_AI_PIPELINE_GUIDE.md#-troubleshooting) for detailed troubleshooting

## ✨ Next Steps

1. ✅ Configure API keys in Supabase Secrets
2. ✅ Deploy/redeploy functions
3. ✅ Test via admin dashboard
4. ✅ Monitor logs for quality
5. ✅ Adjust configuration if needed
6. ✅ Set up cost monitoring

---

**Status**: Ready for Production
**Last Updated**: April 15, 2026
**Support**: Check logs first, then reference guides above
