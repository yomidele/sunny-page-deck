/**
 * Enhanced Question Generation with Multi-AI Pipeline
 * 
 * This replaces the existing generate-questions function to use a coordinated
 * approach with Lovable AI (generator), Together AI (refiner), and Gemini AI (validator).
 * 
 * API Endpoint: /generate-questions
 * This maintains the same request/response contract as the original function.
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

// ==================== PIPELINE FUNCTIONS ====================

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

async function generateWithLovable(
  prompt: string,
  apiKey: string,
  questionCount: number,
): Promise<Question[]> {
  console.log("[Lovable] Generating raw questions...");

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
    console.error("[Lovable] Error:", resp.status, errText);
    throw new Error(`Lovable AI failed: ${resp.status}`);
  }

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty response from Lovable AI");

  const parsed = parseJsonResponse(content);
  const questions = parsed.questions || [];
  console.log(`[Lovable] Generated ${questions.length} questions`);
  return questions;
}

async function refineWithTogetherAI(
  questions: Question[],
  apiKey: string,
): Promise<Question[]> {
  console.log("[Together] Refining questions...");

  if (!questions.length) return [];

  const prompt = `You are an expert JAMB exam question refiner. Improve these questions:

1. Clarify wording and fix grammar
2. Enhance JAMB exam style consistency
3. Improve distractors (make wrong options more challenging)
4. Ensure explanations are clear and step-by-step
5. Remove ambiguous phrasing
6. Standardize formatting

Questions:
${JSON.stringify(questions, null, 2)}

Return ONLY valid JSON with improved questions (same structure).`;

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
    console.error("[Together] Error:", resp.status, errText);
    console.warn("[Together] Skipping refinement, using unrefined questions");
    return questions;
  }

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) return questions;

  try {
    const parsed = parseJsonResponse(content);
    const refined = parsed.questions || [];
    console.log(`[Together] Refined ${refined.length} questions`);
    return refined.length > 0 ? refined : questions;
  } catch (e) {
    console.warn("[Together] Parse error, using unrefined questions");
    return questions;
  }
}

async function validateWithGemini(
  questions: Question[],
  apiKey: string,
): Promise<Question[]> {
  console.log("[Gemini] Validating questions...");

  if (!questions.length) return [];

  const prompt = `You are an academic validator for JAMB exam questions. Validate and correct:

1. Verify correct answer matches explanation
2. Check for duplicate options
3. Ensure only ONE correct answer
4. Validate question clarity and completeness
5. Verify explanations are accurate
6. Fix incorrect answers/explanations

Questions:
${JSON.stringify(questions, null, 2)}

Return ONLY valid JSON with corrected questions (same structure).`;

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
    console.error("[Gemini] Error:", resp.status, errText);
    console.warn("[Gemini] Skipping validation, using unvalidated questions");
    return questions;
  }

  const data = await resp.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) return questions;

  try {
    const parsed = parseJsonResponse(content);
    const validated = parsed.questions || [];
    console.log(`[Gemini] Validated ${validated.length} questions`);
    return validated.length > 0 ? validated : questions;
  } catch (e) {
    console.warn("[Gemini] Parse error, using unvalidated questions");
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
      `[Multi-AI Pipeline] Generating ${questionCount} questions for ${subject_name} > ${topic_name}`,
    );

    // Step 1: Generate with Lovable AI
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
- Exam-quality standards

Return JSON only, no extra text.`;

    let questions = await generateWithLovable(
      lovablePrompt,
      lovableApiKey,
      questionCount,
    );

    if (!questions.length) {
      throw new Error("Lovable AI generated no questions");
    }

    // Step 2: Refine with Together AI (if available)
    if (togetherApiKey && togetherApiKey.length > 0) {
      try {
        questions = await refineWithTogetherAI(questions, togetherApiKey);
      } catch (e) {
        console.warn("[Multi-AI Pipeline] Refinement skipped:", e);
      }
    } else {
      console.log("[Together] Not configured, skipping refinement");
    }

    // Step 3: Validate with Gemini AI (if available)
    if (geminiApiKey && geminiApiKey.length > 0) {
      try {
        questions = await validateWithGemini(questions, geminiApiKey);
      } catch (e) {
        console.warn("[Multi-AI Pipeline] Validation skipped:", e);
      }
    } else {
      console.log("[Gemini] Not configured, skipping validation");
    }

    // Step 4: Quality Control
    console.log("[Multi-AI Pipeline] Running quality control...");
    const finalQuestions = performQualityControl(questions);

    if (!finalQuestions.length) {
      throw new Error("No questions passed quality control");
    }

    // Step 5: Save to Database
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
      `[Multi-AI Pipeline] Successfully generated and saved ${totalInserted} questions`,
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
