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

interface PipelineResult {
  success: boolean;
  count: number;
  stats?: {
    generated: number;
    refined: number;
    validated: number;
    failed_validation: number;
    final_count: number;
  };
  error?: string;
}

// ============================================
// STEP 1: LOVABLE AI - GENERATOR
// ============================================
async function generateWithLovable(
  prompt: string,
  _lovableApiKey: string,
  questionCount: number,
): Promise<Question[]> {
  console.log("[Lovable AI] Generating raw questions...");

  const lovableUrl = "https://ai.gateway.lovable.dev/v1/chat/completions";
  const fullPrompt = `You are a JAMB CBT question generator for Nigeria. Generate exactly ${questionCount} high-quality multiple-choice questions.

${prompt}

REQUIREMENTS:
- Follow strict JAMB CBT standard format
- Difficulty distribution: 30% easy, 50% medium, 20% hard
- Mix of theory questions and calculation-based questions
- Each question must have exactly 4 options (A, B, C, D)
- Include a clear step-by-step explanation for each answer
- No duplicates within the batch
- Cover different aspects of the topic

Return a JSON object with this exact format:
{
  "questions": [
    {
      "question_text": "...",
      "option_a": "...",
      "option_b": "...",
      "option_c": "...",
      "option_d": "...",
      "correct_option": "A",
      "explanation": "...",
      "difficulty": "easy|medium|hard",
      "type": "theory|calculation"
    }
  ]
}

IMPORTANT: Return ONLY valid JSON. No extra text.`;

  const resp = await fetch(lovableUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${_lovableApiKey}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user", content: fullPrompt }],
      response_format: { type: "json_object" },
      temperature: 0.7,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error("[Lovable AI] Error:", resp.status, errText);
    throw new Error(`Lovable AI failed: ${resp.status}`);
  }

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content ?? "";

  let parsed: any;
  try {
    let cleaned = content
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();
    if (!cleaned.startsWith("{")) {
      const s = cleaned.indexOf("{");
      if (s !== -1) cleaned = cleaned.slice(s, cleaned.lastIndexOf("}") + 1);
    }
    parsed = JSON.parse(cleaned);
  } catch {
    console.error("[Lovable AI] Failed to parse:", content.slice(0, 500));
    throw new Error("Invalid JSON response from Lovable AI");
  }

  const questions = parsed.questions || [];
  console.log(`[Lovable AI] Generated ${questions.length} questions`);
  return questions;
}

// ============================================
// STEP 2: TOGETHER AI - REFINER
// ============================================
async function refineWithTogetherAI(
  questions: Question[],
  _togetherApiKey: string,
): Promise<Question[]> {
  console.log("[Together AI] Refining questions...");

  if (!questions.length) return [];

  const togetherUrl = "https://api.together.ai/v1/chat/completions";

  const refinePrompt = `You are an expert JAMB exam question refiner. Your job is to improve the quality of exam questions to meet JAMB standards.

Given the following questions, please:
1. Improve wording and clarity
2. Fix any grammar or spelling errors
3. Ensure JAMB exam style consistency
4. Improve distractors (make wrong options more plausible and challenging)
5. Ensure explanations are clear and step-by-step
6. Remove ambiguous phrasing
7. Standardize formatting

Questions to refine:
${JSON.stringify(questions, null, 2)}

REQUIREMENTS:
- Maintain the same number of questions
- Keep all field names exactly the same
- Ensure correct_option matches the best answer after improvements
- Return ONLY valid JSON
- Do NOT change question numbers or add new fields

Return JSON in this exact format:
{
  "questions": [
    {
      "question_text": "...",
      "option_a": "...",
      "option_b": "...",
      "option_c": "...",
      "option_d": "...",
      "correct_option": "A",
      "explanation": "...",
      "difficulty": "easy|medium|hard",
      "type": "theory|calculation"
    }
  ]
}`;

  const resp = await fetch(togetherUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${_togetherApiKey}`,
    },
    body: JSON.stringify({
      model: "meta-llama/Llama-3-70b-chat-hf",
      messages: [{ role: "user", content: refinePrompt }],
      temperature: 0.5,
      max_tokens: 4000,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error("[Together AI] Error:", resp.status, errText);
    console.warn(
      "[Together AI] Refinement failed, continuing with unrefined questions",
    );
    return questions; // Fallback: return unrefined questions
  }

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content ?? "";

  let parsed: any;
  try {
    let cleaned = content
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();
    if (!cleaned.startsWith("{")) {
      const s = cleaned.indexOf("{");
      if (s !== -1) cleaned = cleaned.slice(s, cleaned.lastIndexOf("}") + 1);
    }
    parsed = JSON.parse(cleaned);
  } catch {
    console.error("[Together AI] Failed to parse:", content.slice(0, 300));
    console.warn(
      "[Together AI] Parse error, continuing with unrefined questions",
    );
    return questions; // Fallback: return unrefined questions
  }

  const refined = parsed.questions || [];
  console.log(`[Together AI] Refined ${refined.length} questions`);
  return refined.length > 0 ? refined : questions;
}

// ============================================
// STEP 3: GEMINI AI - VALIDATOR
// ============================================
async function validateWithGemini(
  questions: Question[],
  _geminiApiKey: string,
): Promise<Question[]> {
  console.log("[Gemini AI] Validating questions...");

  if (!questions.length) return [];

  const geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent";

  const validationPrompt = `You are an academic validator for JAMB CBT exam questions. Your job is to validate and correct exam questions.

Review the following questions and:
1. Verify correct answer matches the explanation
2. Check for duplicate options
3. Ensure only ONE correct answer
4. Verify questions are clear and complete
5. Check for ambiguous wording
6. Validate explanations are accurate and educational
7. Fix any incorrect answers or explanations

If a question has issues:
- Correct the answer if wrong
- Rewrite explanation for clarity
- Fix ambiguous wording
- Replace duplicate options with better distractors

Questions to validate:
${JSON.stringify(questions, null, 2)}

REQUIREMENTS:
- Return same number of questions
- Keep all fields exactly the same names
- Ensure corrected questions maintain JAMB standard
- Return ONLY valid JSON

Return JSON in this exact format:
{
  "questions": [
    {
      "question_text": "...",
      "option_a": "...",
      "option_b": "...",
      "option_c": "...",
      "option_d": "...",
      "correct_option": "A",
      "explanation": "...",
      "difficulty": "easy|medium|hard",
      "type": "theory|calculation"
    }
  ]
}`;

  const resp = await fetch(`${geminiUrl}?key=${_geminiApiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: validationPrompt,
        }],
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 4000,
      },
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error("[Gemini AI] Error:", resp.status, errText);
    console.warn(
      "[Gemini AI] Validation failed, continuing with unvalidated questions",
    );
    return questions; // Fallback: return unvalidated questions
  }

  const data = await resp.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  let parsed: any;
  try {
    let cleaned = content
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();
    if (!cleaned.startsWith("{")) {
      const s = cleaned.indexOf("{");
      if (s !== -1) cleaned = cleaned.slice(s, cleaned.lastIndexOf("}") + 1);
    }
    parsed = JSON.parse(cleaned);
  } catch {
    console.error("[Gemini AI] Failed to parse:", content.slice(0, 300));
    console.warn(
      "[Gemini AI] Parse error, continuing with unvalidated questions",
    );
    return questions; // Fallback: return unvalidated questions
  }

  const validated = parsed.questions || [];
  console.log(`[Gemini AI] Validated ${validated.length} questions`);
  return validated.length > 0 ? validated : questions;
}

// ============================================
// QUALITY CONTROL
// ============================================
function performQualityControl(questions: Question[]): Question[] {
  console.log("[QC] Running quality control checks...");

  const validOptions = ["A", "B", "C", "D"];
  const validDifficulties = ["easy", "medium", "hard"];
  const validTypes = ["theory", "calculation"];
  const seenQuestions = new Set<string>();
  let duplicatesRemoved = 0;

  const cleaned = questions.filter((q) => {
    // Check required fields
    if (
      !q.question_text ||
      !q.option_a ||
      !q.option_b ||
      !q.option_c ||
      !q.option_d ||
      !q.correct_option ||
      !q.explanation
    ) {
      console.warn("[QC] Skipped question with missing fields");
      return false;
    }

    // Normalize correct_option
    const normalizedOption = q.correct_option.toUpperCase();
    if (!validOptions.includes(normalizedOption)) {
      console.warn(`[QC] Invalid correct_option: ${q.correct_option}`);
      return false;
    }

    // Check for duplicates
    const questionHash = q.question_text.substring(0, 50).toLowerCase();
    if (seenQuestions.has(questionHash)) {
      duplicatesRemoved++;
      return false;
    }
    seenQuestions.add(questionHash);

    // Check for empty options
    const options = [q.option_a, q.option_b, q.option_c, q.option_d];
    if (options.some((opt) => !opt || opt.trim().length === 0)) {
      console.warn("[QC] Skipped question with empty options");
      return false;
    }

    // Normalize values
    q.correct_option = normalizedOption as "A" | "B" | "C" | "D";
    q.difficulty = validDifficulties.includes(q.difficulty)
      ? (q.difficulty as "easy" | "medium" | "hard")
      : "medium";
    q.type = validTypes.includes(q.type) ? (q.type as "theory" | "calculation") : "theory";

    return true;
  });

  if (duplicatesRemoved > 0) {
    console.log(`[QC] Removed ${duplicatesRemoved} duplicate questions`);
  }

  console.log(`[QC] Quality control complete: ${cleaned.length} questions passed`);
  return cleaned;
}

// ============================================
// MAIN PIPELINE
// ============================================
async function generateMultiAIQuestions(
  prompt: string,
  subject_id: string,
  topic_id: string,
  subject_name: string,
  topic_name: string,
  questionCount: number,
  supabaseUrl: string,
  supabaseKey: string,
): Promise<PipelineResult> {
  const stats = {
    generated: 0,
    refined: 0,
    validated: 0,
    failed_validation: 0,
    final_count: 0,
  };

  try {
    // Get API keys
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const togetherApiKey = Deno.env.get("TOGETHER_API_KEY");
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

    if (!lovableApiKey) throw new Error("Lovable AI not configured");
    if (!togetherApiKey) {
      console.warn("Together AI not configured, will skip refinement");
    }
    if (!geminiApiKey) {
      console.warn("Gemini AI not configured, will skip validation");
    }

    // Step 1: Generate with Lovable AI
    console.log("[Pipeline] Step 1: Lovable AI Generation");
    const userPrompt = `Subject: ${subject_name}\nTopic: ${topic_name}\n\n${prompt}`;
    let generated = await generateWithLovable(userPrompt, lovableApiKey, questionCount);
    stats.generated = generated.length;
    console.log(`[Pipeline] Generated: ${stats.generated} questions`);

    if (!generated.length) {
      throw new Error("Lovable AI generated no questions");
    }

    // Step 2: Refine with Together AI (if available)
    console.log("[Pipeline] Step 2: Together AI Refinement");
    let refined = generated;
    if (togetherApiKey) {
      try {
        refined = await refineWithTogetherAI(generated, togetherApiKey);
        stats.refined = refined.length;
      } catch (e) {
        console.warn("[Pipeline] Together AI refinement failed, continuing...", e);
        refined = generated;
        stats.refined = generated.length;
      }
    } else {
      stats.refined = generated.length;
    }
    console.log(`[Pipeline] Refined: ${stats.refined} questions`);

    // Step 3: Validate with Gemini AI (if available)
    console.log("[Pipeline] Step 3: Gemini AI Validation");
    let validated = refined;
    if (geminiApiKey) {
      try {
        validated = await validateWithGemini(refined, geminiApiKey);
        stats.validated = validated.length;
      } catch (e) {
        console.warn("[Pipeline] Gemini AI validation failed, continuing...", e);
        validated = refined;
        stats.validated = refined.length;
      }
    } else {
      stats.validated = refined.length;
    }
    console.log(`[Pipeline] Validated: ${stats.validated} questions`);

    // Step 4: Quality Control
    console.log("[Pipeline] Step 4: Quality Control");
    const finalQuestions = performQualityControl(validated);
    stats.final_count = finalQuestions.length;
    stats.failed_validation = stats.validated - finalQuestions.length;
    console.log(`[Pipeline] Final: ${stats.final_count} questions after QC`);

    if (!finalQuestions.length) {
      throw new Error("No questions passed quality control");
    }

    // Step 5: Save to Database
    console.log("[Pipeline] Step 5: Saving to Database");
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
        console.error("[DB] Insert error:", error);
        throw new Error("Failed to save questions: " + error.message);
      }
      totalInserted += batch.length;
    }

    console.log(`[Pipeline] Successfully saved ${totalInserted} questions`);

    return {
      success: true,
      count: totalInserted,
      stats,
    };
  } catch (e) {
    const error = e instanceof Error ? e.message : "Unknown error";
    console.error("[Pipeline] Error:", error);
    return {
      success: false,
      count: 0,
      error,
    };
  }
}

// ============================================
// HTTP HANDLER
// ============================================
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

    // Verify admin role
    const {
      data: { session },
    } = await userClient.auth.getSession();
    const userRole = session?.user?.user_metadata?.role;
    if (userRole !== "admin") throw new Error("Admin access required");

    const {
      subject_id,
      topic_id,
      subject_name,
      topic_name,
      count,
      prompt,
    } = await req.json();

    if (!subject_id || !topic_id || !subject_name || !topic_name) {
      throw new Error(
        "Missing required fields: subject_id, topic_id, subject_name, topic_name",
      );
    }

    const questionCount = count || 50;
    const customPrompt = prompt || "Generate diverse questions covering different difficulty levels and aspects of the topic.";

    console.log(
      `[Start] Multi-AI generation for ${subject_name} > ${topic_name}: ${questionCount} questions`,
    );

    const result = await generateMultiAIQuestions(
      customPrompt,
      subject_id,
      topic_id,
      subject_name,
      topic_name,
      questionCount,
      supabaseUrl,
      supabaseKey,
    );

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: result.success ? 200 : 400,
    });
  } catch (e) {
    console.error("[Handler] Error:", e);
    return new Response(
      JSON.stringify({
        success: false,
        count: 0,
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
