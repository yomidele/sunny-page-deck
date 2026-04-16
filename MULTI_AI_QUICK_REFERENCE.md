# Multi-AI System - Quick Reference Card

## 🚀 TL;DR (30 seconds)

**What**: Question generation now uses 3 AIs (Lovable + Together + Gemini) instead of 1

**How**: Same admin dashboard button - no changes needed

**Setup**: Add 3 API keys to Supabase Secrets → Done

**Result**: Better quality questions with automatic refinement & validation

---

## 📋 Quick Setup

### Step 1: Get API Keys
- Lovable: https://lovable.dev → API keys
- Together: https://www.together.ai → API keys  
- Gemini: https://aistudio.google.com → Generate API key

### Step 2: Add to Supabase
1. Go Supabase Dashboard → Settings → Configuration → Secrets
2. Click "New Secret"
3. Add:
   ```
   LOVABLE_API_KEY = sk_...
   TOGETHER_API_KEY = ...
   GEMINI_API_KEY = ...
   ```
4. Save

### Step 3: Deploy
```bash
supabase functions deploy generate-questions
```

### Step 4: Test
1. Login admin: `/admin/login`
2. Go: `/admin/questions`
3. Click: **"AI Generate"**
4. Select subject + topic
5. Click: **"Generate 50 Questions"**
6. Done! 

---

## 🔄 What Changed vs What Stayed Same

### Changed ✅
- Backend generation now uses 3-stage pipeline
- Questions auto-refined and validated
- Better quality, fewer duplicates
- Transparent logging of all stages

### Same (No Changes) ✅
- Admin dashboard UI - identical
- Question format - same fields
- Database schema - no changes
- Student interface - unchanged
- Generation speed - ~120s max
- Request/response format - identical

---

## 📊 Pipeline Stages

| Stage | AI | Time | What It Does | Required? |
|-------|----|----|---|---|
| 1 | Lovable | 30s | Generate 50 questions | ✅ YES |
| 2 | Together | 30s | Improve wording/style | ⭕ Optional |
| 3 | Gemini | 60s | Validate correctness | ⭕ Optional |
| 4 | QC | 5s | Remove duplicates | ✅ Always |
| 5 | Save | 5s | Store in database | ✅ Always |

**Total**: ~120 seconds (all stages) or ~35 seconds (Lovable only)

---

## 🎯 Quality Tiers

Choose what works for your budget:

### Just Lovable (Fast & Budget)
```
Config: LOVABLE_API_KEY only
Time: 30s
Quality: ⭐⭐
Cost: $1-2 per 50 questions
```

### Lovable + Together (Recommended)
```
Config: LOVABLE_API_KEY + TOGETHER_API_KEY
Time: 60s
Quality: ⭐⭐⭐
Cost: $2-3 per 50 questions
```

### All 3 AIs (Premium)
```
Config: All 3 keys
Time: 120s
Quality: ⭐⭐⭐⭐
Cost: $3-5 per 50 questions
```

### Free Tier (Budget)
```
Config: LOVABLE_API_KEY + GEMINI_API_KEY (free)
Time: 90s
Quality: ⭐⭐⭐
Cost: $1-2 per 50 questions
```

---

## 🆘 Troubleshooting

| Problem | Fix |
|---------|-----|
| "API not configured" | Add LOVABLE_API_KEY to Secrets |
| "Rate limit" | Wait 60s, check API plan limits |
| "Only 30 questions saved" | Normal - some fail QC checks |
| "No refinement/validation" | Add TOGETHER_API_KEY / GEMINI_API_KEY |
| "Generation takes too long" | Only Lovable needed, skip others |

---

## 📂 Files Created/Modified

```
✅ supabase/functions/generate-questions/index.ts     [MAIN - PRODUCTION]
✅ supabase/functions/multi-ai-generate/index.ts      [ALTERNATIVE]
✅ supabase/functions/_shared/multi-ai-utils.ts       [UTILITIES]
📄 MULTI_AI_PIPELINE_GUIDE.md                         [USER GUIDE]
📄 MULTI_AI_DEPLOYMENT.md                             [SETUP GUIDE]
📄 MULTI_AI_TECHNICAL_REFERENCE.md                    [TECH DEEP DIVE]
📄 MULTI_AI_IMPLEMENTATION_SUMMARY.md                 [THIS PROJECT]
```

---

## ✅ Verification Checklist

After setup, verify:

- [ ] API keys in Supabase Secrets
- [ ] Functions deployed
- [ ] Admin dashboard "AI Generate" button works
- [ ] Questions appear in database
- [ ] Question count is 48+ (some removed as duplicates)
- [ ] Explanations present and complete
- [ ] Difficulty distribution looks good
- [ ] Logs show multiple AI stages running

---

## 🔐 Security

- ✅ API keys stored securely (not in code)
- ✅ Only admin users can generate
- ✅ Raw AI outputs never shown to students
- ✅ Final validated questions only
- ✅ All operations logged

---

## 📞 Quick Help

**Documentation**:
- Setup: See `MULTI_AI_DEPLOYMENT.md`
- Deep dive: See `MULTI_AI_TECHNICAL_REFERENCE.md`
- Full guide: See `MULTI_AI_PIPELINE_GUIDE.md`

**Logs**:
```bash
supabase functions logs generate-questions --limit 20
```

**Revert if needed**:
```bash
# Use original single-AI version
cp generate-questions/index-original.ts generate-questions/index.ts
supabase functions deploy generate-questions
```

---

## 🎯 What You Get

1. **Better Questions**: Refinement + Validation built-in
2. **No Work**: Same admin workflow
3. **Flexible**: Works with 1, 2, or 3 AIs
4. **Safe**: Graceful fallbacks if any AI fails
5. **Transparent**: Full logging and monitoring
6. **Scalable**: Handles any question count
7. **Standardized**: Clean database entries

---

## 🚀 Next Steps

1. Get API keys from providers (5 mins)
2. Add to Supabase Secrets (2 mins)
3. Deploy functions (1 min)
4. Test via admin dashboard (5 mins)
5. Monitor logs (ongoing)
6. Celebrate! 🎉

**Total setup time: ~15 minutes**

---

## 💡 Pro Tips

- Start with just Lovable, upgrade quality later
- Monitor logs first time to understand flow
- Use budget tier for high-volume generation
- Batch generation during off-hours
- Watch for duplicate removal in QC stage (normal)

---

**Questions?** → Check full documentation
**Ready?** → See MULTI_AI_DEPLOYMENT.md
**Technical?** → See MULTI_AI_TECHNICAL_REFERENCE.md

---

*Last Updated: April 15, 2026*
*Status: Production Ready*
*Implementation: Complete ✅*
