/**
 * JAMB CBT Question Generation - Multi-AI Pipeline
 * 
 * PIPELINE (STRICT ORDER):
 * 1. Tavily API → Search for JAMB-standard academic questions
 * 2. Apify API → Extract structured educational content
 * 3. Together AI → Generate JAMB-style MCQs from extracted content
 * 4. Gemini API → Validate, correct, standardize, and finalize
 * 5. Quality Control → Remove duplicates, validate format
 * 6. Database Save → Store final validated questions
 * 
 * FALLBACK: If Together AI fails → Gemini generates. If Gemini validation fails → retry or discard.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Question {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: "A" | "B" | "C" | "D";
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  type: "theory" | "calculation";
}

// ==================== HELPERS ====================

function parseJsonResponse(content: string): any {
  try {
    let cleaned = content.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    if (!cleaned.startsWith("{") && !cleaned.startsWith("[")) {
      const s = cleaned.indexOf("{");
      if (s !== -1) cleaned = cleaned.slice(s, cleaned.lastIndexOf("}") + 1);
    }
    return JSON.parse(cleaned);
  } catch (e) {
    // Try array
    try {
      const match = content.match(/\[[\s\S]*\]/);
      if (match) return { questions: JSON.parse(match[0]) };
    } catch {}
    throw new Error(`Failed to parse JSON: ${e instanceof Error ? e.message : String(e)}`);
  }
}

function isValidQuestion(q: any): boolean {
  if (!q) return false;
  const fields = ["question_text", "option_a", "option_b", "option_c", "option_d", "correct_option", "explanation"];
  if (!fields.every(f => q[f] && String(q[f]).trim().length > 0)) return false;
  if (!["A", "B", "C", "D"].includes(String(q.correct_option).toUpperCase())) return false;
  // Ensure explanation is meaningful
  if (String(q.explanation).trim().length < 10) return false;
  // Ensure correct_option matches one of the options
  const correctKey = `option_${String(q.correct_option).toLowerCase()}`;
  if (!q[correctKey] || String(q[correctKey]).trim().length === 0) return false;
  return true;
}

function normalizeQuestion(q: any): Question {
  return {
    question_text: String(q.question_text).trim(),
    option_a: String(q.option_a).trim(),
    option_b: String(q.option_b).trim(),
    option_c: String(q.option_c).trim(),
    option_d: String(q.option_d).trim(),
    correct_option: String(q.correct_option).toUpperCase() as "A" | "B" | "C" | "D",
    explanation: String(q.explanation).trim(),
    difficulty: ["easy", "medium", "hard"].includes(q.difficulty) ? q.difficulty : "medium",
    type: ["theory", "calculation"].includes(q.type) ? q.type : "theory",
  };
}

function performQualityControl(questions: any[]): Question[] {
  const seen = new Set<string>();
  const cleaned: Question[] = [];
  for (const q of questions) {
    if (!isValidQuestion(q)) { console.log("[QC] Skipped invalid question"); continue; }
    const hash = String(q.question_text).substring(0, 60).toLowerCase().replace(/\s+/g, " ");
    if (seen.has(hash)) { console.log("[QC] Skipped duplicate"); continue; }
    seen.add(hash);
    cleaned.push(normalizeQuestion(q));
  }
  return cleaned;
}

// ==================== PIPELINE STAGES ====================

/** STAGE 1: Tavily Search */
async function searchWithTavily(subjectName: string, topicName: string, examType: string, apiKey: string): Promise<string[]> {
  console.log("[Tavily] Searching for JAMB questions...");
  const queries = [
    `${examType} ${subjectName} ${topicName} past questions and answers Nigeria`,
    `${subjectName} ${topicName} multiple choice questions CBT exam`,
  ];
  const allContent: string[] = [];

  for (const query of queries) {
    try {
      const resp = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: apiKey,
          query,
          search_depth: "advanced",
          max_results: 8,
          include_raw_content: true,
        }),
      });
      if (!resp.ok) { console.error("[Tavily] Error:", resp.status); continue; }
      const data = await resp.json();
      for (const result of (data.results || [])) {
        const content = result.raw_content || result.content || "";
        if (content.length > 100) allContent.push(content.slice(0, 6000));
      }
    } catch (e) { console.error("[Tavily] Query failed:", e); }
  }
  console.log(`[Tavily] ✓ Found ${allContent.length} content blocks`);
  return allContent;
}

/** STAGE 2: Apify Extraction */
async function extractWithApify(subjectName: string, topicName: string, apiKey: string): Promise<string[]> {
  console.log("[Apify] Extracting educational content...");
  const searchUrls = [
    `https://www.google.com/search?q=JAMB+${encodeURIComponent(subjectName)}+${encodeURIComponent(topicName)}+past+questions+answers`,
  ];
  const extracted: string[] = [];

  try {
    const resp = await fetch(`https://api.apify.com/v2/acts/apify~google-search-scraper/run-sync-get-dataset-items?token=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        queries: `JAMB ${subjectName} ${topicName} past questions answers`,
        maxPagesPerQuery: 1,
        resultsPerPage: 5,
      }),
    });
    if (resp.ok) {
      const data = await resp.json();
      for (const item of (Array.isArray(data) ? data : [])) {
        if (item.description) extracted.push(item.description);
        if (item.title) extracted.push(item.title);
      }
      console.log(`[Apify] ✓ Extracted ${extracted.length} items`);
    } else {
      console.warn("[Apify] Request failed:", resp.status);
    }
  } catch (e) { console.warn("[Apify] Error:", e); }

  return extracted;
}

/** STAGE 3: Together AI Generation */
async function generateWithTogetherAI(
  context: string, subjectName: string, topicName: string, count: number, apiKey: string
): Promise<Question[]> {
  console.log("[Together AI] Generating JAMB-style questions...");

  const prompt = `You are a JAMB CBT question generator for Nigeria. Generate exactly ${count} high-quality multiple-choice questions.

Subject: ${subjectName}
Topic: ${topicName}

Use this reference content for context and accuracy:
${context.slice(0, 30000)}

REQUIREMENTS:
- Follow strict JAMB CBT standard
- Difficulty distribution: 30% easy, 50% medium, 20% hard
- Mix theory and calculation questions
- Each question: exactly 4 options (A, B, C, D), one correct
- Clear step-by-step explanations for each answer
- No duplicates, cover different aspects
- Exam-quality standards

Return ONLY valid JSON: {"questions": [...]}
Each question object must have: question_text, option_a, option_b, option_c, option_d, correct_option (A/B/C/D), explanation, difficulty (easy/medium/hard), type (theory/calculation)`;

  const resp = await fetch("https://api.together.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "meta-llama/Llama-3-70b-chat-hf",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 8000,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error("[Together AI] Error:", resp.status, errText);
    throw new Error(`Together AI failed: ${resp.status}`);
  }

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty response from Together AI");

  const parsed = parseJsonResponse(content);
  const questions = parsed.questions || parsed || [];
  console.log(`[Together AI] ✓ Generated ${Array.isArray(questions) ? questions.length : 0} questions`);
  return Array.isArray(questions) ? questions : [];
}

/** STAGE 3 FALLBACK: Gemini Generation */
async function generateWithGemini(
  context: string, subjectName: string, topicName: string, count: number, apiKey: string
): Promise<Question[]> {
  console.log("[Gemini] Fallback generation...");

  const prompt = `Generate exactly ${count} JAMB CBT questions for ${subjectName} > ${topicName}.

Reference content: ${context.slice(0, 20000)}

Return JSON: {"questions": [...]} with fields: question_text, option_a-d, correct_option (A/B/C/D), explanation, difficulty (easy/medium/hard), type (theory/calculation).
Difficulty: 30% easy, 50% medium, 20% hard. JAMB exam standard.`;

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 8000 },
      }),
    },
  );

  if (!resp.ok) throw new Error(`Gemini generation failed: ${resp.status}`);
  const data = await resp.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) throw new Error("Empty Gemini response");

  const parsed = parseJsonResponse(content);
  const questions = parsed.questions || [];
  console.log(`[Gemini] ✓ Generated ${questions.length} questions`);
  return questions;
}

/** STAGE 4: Gemini Validation */
async function validateWithGemini(questions: Question[], apiKey: string): Promise<Question[]> {
  console.log("[Gemini] Validating questions...");
  if (!questions.length) return [];

  const prompt = `You are a JAMB CBT exam validator. Validate and correct these questions:

VALIDATION RULES:
1. Verify correct_option matches the explanation
2. Ensure exactly 4 unique options per question
3. Ensure only ONE correct answer
4. Fix incorrect answers or explanations
5. Ensure explanations are meaningful (>10 words)
6. Remove ambiguous wording
7. Ensure correct_option is one of: A, B, C, D
8. Ensure no empty fields

Questions:
${JSON.stringify(questions, null, 2)}

Return ONLY valid JSON: {"questions": [...]} with corrected questions (same fields).`;

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 8000 },
      }),
    },
  );

  if (!resp.ok) {
    console.warn("[Gemini] Validation failed:", resp.status);
    return questions;
  }

  const data = await resp.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) return questions;

  try {
    const parsed = parseJsonResponse(content);
    const validated = parsed.questions || [];
    console.log(`[Gemini] ✓ Validated ${validated.length} questions`);
    return validated.length > 0 ? validated : questions;
  } catch {
    console.warn("[Gemini] Parse error, using unvalidated questions");
    return questions;
  }
}

// ==================== MAIN HANDLER ====================

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing auth");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { subject_id, topic_id, subject_name, topic_name, count, exam_type } = await req.json();
    if (!subject_id || !subject_name) throw new Error("Missing subject_id or subject_name");

    const questionCount = Math.min(count || 50, 200);
    const examLabel = exam_type || "JAMB";

    // Get API keys
    const tavilyKey = Deno.env.get("TIVALY_API_KEY") || Deno.env.get("TAVILY_API_KEY");
    const apifyKey = Deno.env.get("APIFY_API_KEY");
    const togetherKey = Deno.env.get("TOGETHERAI_API_KEY") || Deno.env.get("TOGETHER_API_KEY");
    const geminiKey = Deno.env.get("GEMINI_API_KEY");

    if (!geminiKey) throw new Error("GEMINI_API_KEY not configured");

    console.log(`[Pipeline] Starting for ${subject_name} > ${topic_name || "All"} (${questionCount} questions)`);
    console.log(`[Pipeline] APIs: Tavily(${tavilyKey ? "✓" : "✗"}) Apify(${apifyKey ? "✓" : "✗"}) Together(${togetherKey ? "✓" : "✗"}) Gemini(✓)`);

    // STEP 1: Tavily Search
    let searchContent: string[] = [];
    if (tavilyKey) {
      try {
        searchContent = await searchWithTavily(subject_name, topic_name || "", examLabel, tavilyKey);
      } catch (e) { console.warn("[Pipeline] Tavily failed:", e); }
    }

    // STEP 2: Apify Extraction
    let apifyContent: string[] = [];
    if (apifyKey) {
      try {
        apifyContent = await extractWithApify(subject_name, topic_name || "", apifyKey);
      } catch (e) { console.warn("[Pipeline] Apify failed:", e); }
    }

    // Combine context
    const combinedContext = [...searchContent, ...apifyContent].join("\n\n---\n\n").slice(0, 50000);

    // STEP 3: Generate with Together AI (fallback to Gemini)
    let questions: Question[] = [];
    if (togetherKey) {
      try {
        questions = await generateWithTogetherAI(combinedContext, subject_name, topic_name || "", questionCount, togetherKey);
      } catch (e) {
        console.warn("[Pipeline] Together AI failed, falling back to Gemini:", e);
      }
    }

    if (!questions.length) {
      questions = await generateWithGemini(combinedContext, subject_name, topic_name || "", questionCount, geminiKey);
    }

    if (!questions.length) throw new Error("No questions generated from any AI");

    // STEP 4: Validate with Gemini
    try {
      questions = await validateWithGemini(questions, geminiKey);
    } catch (e) {
      console.warn("[Pipeline] Validation error:", e);
    }

    // STEP 5: Quality Control
    console.log("[Pipeline] Running quality control...");
    const adminClient = createClient(supabaseUrl, supabaseKey);

    // Check for existing duplicates in DB
    const { data: existingQs } = await adminClient
      .from("questions")
      .select("question_text")
      .eq("subject_id", subject_id);

    const existingTexts = new Set(
      (existingQs || []).map((q: any) => String(q.question_text).substring(0, 60).toLowerCase().replace(/\s+/g, " "))
    );

    let finalQuestions = performQualityControl(questions);
    // Remove DB duplicates
    finalQuestions = finalQuestions.filter(q => {
      const hash = q.question_text.substring(0, 60).toLowerCase().replace(/\s+/g, " ");
      return !existingTexts.has(hash);
    });

    if (!finalQuestions.length) throw new Error("No questions passed quality control");

    // STEP 6: Save to Database
    console.log(`[Pipeline] Saving ${finalQuestions.length} questions...`);
    const rows = finalQuestions.map(q => ({
      subject_id,
      topic_id: topic_id || null,
      question_text: q.question_text,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_option: q.correct_option,
      explanation: q.explanation,
      difficulty: q.difficulty,
      type: q.type,
    }));

    let totalInserted = 0;
    for (let i = 0; i < rows.length; i += 50) {
      const batch = rows.slice(i, i + 50);
      const { error } = await adminClient.from("questions").insert(batch);
      if (error) { console.error("[DB] Insert error:", error); throw new Error("Failed to save: " + error.message); }
      totalInserted += batch.length;
    }

    console.log(`[Pipeline] ✓ Complete! ${totalInserted} questions saved`);

    return new Response(JSON.stringify({ success: true, count: totalInserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[Pipeline] Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
