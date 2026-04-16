/**
 * Enhanced Question Generation with Multi-AI Pipeline
 * 
 * PIPELINE STAGES:
 * 1. Lovable AI: Generates raw questions
 * 2. Together AI: Refines and improves quality (optional)
 * 3. Gemini AI: Validates correctness (optional)
 * 4. Quality Control: Removes duplicates and invalid questions
 * 5. Database Save: Stores final validated questions
 * 
 * FALLBACK LOGIC: If any stage fails, continues with previous output
 * This ensures questions are always generated even if refinement/validation fails
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

// ==================== HELPER FUNCTIONS ====================

function parseJsonResponse(content: string): any {
  try {
    let cleaned = content
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();
    if (!cleaned.startsWith("{")) {
      const s = cleaned.indexOf("{");
      if (s !== -1) {
        cleaned = cleaned.slice(s, cleaned.lastIndexOf("}") + 1);
      }
    }
    return JSON.parse(cleaned);
  } catch (e) {
    throw new Error(`Failed to parse JSON: ${e instanceof Error ? e.message : String(e)}`);
  }
}

function isValidQuestion(q: any): boolean {
  return (
    q &&
    q.question_text &&
    q.option_a &&
    q.option_b &&
    q.option_c &&
    q.option_d &&
    q.correct_option &&
    q.explanation &&
    String(q.question_text).trim().length > 0 &&
    String(q.option_a).trim().length > 0 &&
    String(q.option_b).trim().length > 0 &&
    String(q.option_c).trim().length > 0 &&
    String(q.option_d).trim().length > 0 &&
    ["A", "B", "C", "D"].includes(q.correct_option?.toUpperCase?.())
  );
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
    difficulty: ["easy", "medium", "hard"].includes(q.difficulty)
      ? (q.difficulty as "easy" | "medium" | "hard")
      : "medium",
    type: ["theory", "calculation"].includes(q.type)
      ? (q.type as "theory" | "calculation")
      : "theory",
  };
}

function performQualityControl(questions: any[]): Question[] {
  const seenQuestions = new Set<string>();
  const cleaned: Question[] = [];

  for (const q of questions) {
    if (!isValidQuestion(q)) {
      console.log("[QC] Skipped invalid question");
      continue;
    }

    const hash = q.question_text.substring(0, 50).toLowerCase();
    if (seenQuestions.has(hash)) {
      console.log("[QC] Skipped duplicate question");
      continue;
    }

    seenQuestions.add(hash);
    cleaned.push(normalizeQuestion(q));
  }

  return cleaned;
}

// ==================== AI PIPELINE STAGES ====================

async function generateWithLovable(
  prompt: string,
  apiKey: string,
): Promise<Question[]> {
  console.log("[Lovable AI] Generating raw questions...");

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.7,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error("[Lovable AI] Error:", resp.status, errText);
    if (resp.status === 429) throw new Error("AI rate limit. Please try again in a moment.");
    if (resp.status === 402) throw new Error("AI credits required. Please add funds.");
    throw new Error(`Lovable AI failed: ${resp.status}`);
  }

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty response from Lovable AI");

  const parsed = parseJsonResponse(content);
  const questions = parsed.questions || [];
  console.log(`[Lovable AI] ✓ Generated ${questions.length} questions`);
  return questions;
}

async function refineWithTogetherAI(
  questions: Question[],
  apiKey: string,
): Promise<Question[]> {
  console.log("[Together AI] Refining questions...");

  if (!questions.length) return [];

  const prompt = `You are an expert JAMB exam question refiner. Your job is to improve the quality of these exam questions:

1. Clarify wording and fix grammar
2. Enhance JAMB exam style consistency
3. Improve distractors (make wrong options more challenging and plausible)
4. Ensure explanations are clear and step-by-step
5. Remove ambiguous phrasing
6. Standardize formatting

Questions to refine:
${JSON.stringify(questions, null, 2)}

Return ONLY valid JSON with improved questions (keep same structure and field names).`;

  const resp = await fetch("https://api.together.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "meta-llama/Llama-3-70b-chat-hf",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
      max_tokens: 4000,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error("[Together AI] Error:", resp.status, errText);
    console.warn("[Together AI] Refinement skipped, using unrefined questions");
    return questions;
  }

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) return questions;

  try {
    const parsed = parseJsonResponse(content);
    const refined = parsed.questions || [];
    console.log(`[Together AI] ✓ Refined ${refined.length} questions`);
    return refined.length > 0 ? refined : questions;
  } catch (e) {
    console.warn("[Together AI] Parse error, using unrefined questions");
    return questions;
  }
}

async function validateWithGemini(
  questions: Question[],
  apiKey: string,
): Promise<Question[]> {
  console.log("[Gemini AI] Validating questions...");

  if (!questions.length) return [];

  const prompt = `You are an academic validator for JAMB CBT exam questions. Your job is to validate and correct these questions:

VALIDATION CHECKS:
1. Verify correct answer matches explanation
2. Check for duplicate options
3. Ensure only ONE correct answer per question
4. Validate question clarity and completeness
5. Verify explanations are accurate and educational
6. Fix any incorrect answers or explanations
7. Ensure no ambiguous wording

Questions to validate:
${JSON.stringify(questions, null, 2)}

For any issues found:
- Correct the answer if wrong
- Rewrite explanation for accuracy
- Fix ambiguous wording
- Replace duplicate options

Return ONLY valid JSON with corrected questions (keep same structure and field names).`;

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt,
          }],
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 4000,
        },
      }),
    },
  );

  if (!resp.ok) {
    const errText = await resp.text();
    console.error("[Gemini AI] Error:", resp.status, errText);
    console.warn("[Gemini AI] Validation skipped, using unvalidated questions");
    return questions;
  }

  const data = await resp.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) return questions;

  try {
    const parsed = parseJsonResponse(content);
    const validated = parsed.questions || [];
    console.log(`[Gemini AI] ✓ Validated ${validated.length} questions`);
    return validated.length > 0 ? validated : questions;
  } catch (e) {
    console.warn("[Gemini AI] Parse error, using unvalidated questions");
    return questions;
  }
}

// ==================== MAIN HANDLER ====================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing auth");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user
    const userClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: { headers: { Authorization: authHeader } },
      },
    );

    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { subject_id, topic_id, subject_name, topic_name, count } =
      await req.json();

    if (!subject_id || !topic_id || !subject_name || !topic_name) {
      throw new Error(
        "Missing subject_id, topic_id, subject_name, or topic_name",
      );
    }

    const questionCount = count || 50;

    // Get API keys
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const togetherApiKey = Deno.env.get("TOGETHER_API_KEY");
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

    if (!lovableApiKey) throw new Error("AI not configured");

    console.log(
      `[Multi-AI Pipeline] Starting for ${subject_name} > ${topic_name} (${questionCount} questions)`,
    );
    console.log(`[Multi-AI Pipeline] APIs available: Lovable(✓) Together(${togetherApiKey ? "✓" : "✗"}) Gemini(${geminiApiKey ? "✓" : "✗"})`);

    // STEP 1: Generate with Lovable AI
    const lovablePrompt = `You are a JAMB CBT question generator for Nigeria. Generate exactly ${questionCount} high-quality multiple-choice questions.

Subject: ${subject_name}
Topic: ${topic_name}

REQUIREMENTS:
- Follow strict JAMB CBT standard
- Difficulty distribution: 30% easy, 50% medium, 20% hard
- Mix of theory questions and calculation-based questions
- Each question must have exactly 4 options (A, B, C, D)
- Include clear step-by-step explanations
- No duplicates, cover different aspects
- Exam-quality standards required

Return JSON only with "questions" array field. No extra text.`;

    let questions = await generateWithLovable(lovablePrompt, lovableApiKey);

    if (!questions.length) {
      throw new Error("Lovable AI generated no questions");
    }

    // STEP 2: Refine with Together AI (if available)
    if (togetherApiKey && togetherApiKey.length > 0) {
      try {
        questions = await refineWithTogetherAI(questions, togetherApiKey);
      } catch (e) {
        console.warn("[Multi-AI Pipeline] Refinement error:", e instanceof Error ? e.message : e);
      }
    } else {
      console.log("[Together AI] Not configured, skipping refinement");
    }

    // STEP 3: Validate with Gemini AI (if available)
    if (geminiApiKey && geminiApiKey.length > 0) {
      try {
        questions = await validateWithGemini(questions, geminiApiKey);
      } catch (e) {
        console.warn("[Multi-AI Pipeline] Validation error:", e instanceof Error ? e.message : e);
      }
    } else {
      console.log("[Gemini AI] Not configured, skipping validation");
    }

    // STEP 4: Quality Control
    console.log("[Multi-AI Pipeline] Running quality control...");
    const finalQuestions = performQualityControl(questions);

    if (!finalQuestions.length) {
      throw new Error("No questions passed quality control");
    }

    // STEP 5: Save to Database
    console.log("[Multi-AI Pipeline] Saving to database...");
    const adminClient = createClient(supabaseUrl, supabaseKey);

    const rows = finalQuestions.map((q) => ({
      subject_id,
      topic_id,
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
      if (error) {
        console.error("[Database] Insert error:", error);
        throw new Error("Failed to save questions: " + error.message);
      }
      totalInserted += batch.length;
    }

    console.log(
      `[Multi-AI Pipeline] ✓ Complete! ${totalInserted} questions generated and saved`,
    );

    return new Response(
      JSON.stringify({ success: true, count: totalInserted }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error("[Multi-AI Pipeline] Error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
