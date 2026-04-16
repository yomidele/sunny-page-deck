/**
 * Multi-AI Pipeline Utilities
 * 
 * Shared utilities for orchestrating Lovable AI, Together AI, and Gemini AI
 * in a coordinated question generation, refinement, and validation pipeline.
 * 
 * Usage:
 * 1. Generate with Lovable AI
 * 2. Refine with Together AI (optional)
 * 3. Validate with Gemini AI (optional)
 * 4. Apply quality control
 * 5. Save to database
 */

export interface Question {
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

export interface AIResponse {
  questions: Question[];
  error?: string;
  status: "success" | "failed" | "partial";
}

/**
 * Parse JSON response from AI models
 * Handles various formatting issues like markdown code blocks
 */
export function parseJsonResponse(content: string): any {
  try {
    // Remove markdown code blocks
    let cleaned = content
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();

    // Extract JSON if wrapped in text
    if (!cleaned.startsWith("{")) {
      const startIdx = cleaned.indexOf("{");
      const endIdx = cleaned.lastIndexOf("}");
      if (startIdx !== -1 && endIdx !== -1) {
        cleaned = cleaned.slice(startIdx, endIdx + 1);
      }
    }

    return JSON.parse(cleaned);
  } catch (e) {
    throw new Error(`Failed to parse JSON: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * Validate individual question structure
 */
export function isValidQuestion(q: any): boolean {
  if (!q) return false;
  
  const required = [
    "question_text",
    "option_a",
    "option_b",
    "option_c",
    "option_d",
    "correct_option",
    "explanation",
  ];

  return (
    required.every((field) => q[field] && String(q[field]).trim().length > 0) &&
    ["A", "B", "C", "D"].includes(q.correct_option?.toUpperCase?.())
  );
}

/**
 * Normalize and clean question data
 */
export function normalizeQuestion(q: any): Question {
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

/**
 * Perform quality control on questions
 * - Remove duplicates
 * - Remove invalid questions
 * - Sanitize data
 */
export function performQualityControl(questions: Question[]): Question[] {
  const seenQuestions = new Set<string>();
  const cleaned: Question[] = [];

  for (const q of questions) {
    // Check validity
    if (!isValidQuestion(q)) {
      console.warn("[QC] Skipped invalid question");
      continue;
    }

    // Check for duplicates (by first 50 chars of question text)
    const hash = q.question_text.substring(0, 50).toLowerCase();
    if (seenQuestions.has(hash)) {
      console.warn("[QC] Skipped duplicate question");
      continue;
    }

    seenQuestions.add(hash);
    cleaned.push(normalizeQuestion(q));
  }

  return cleaned;
}

/**
 * Call Lovable AI for question generation
 */
export async function callLovableAI(
  prompt: string,
  apiKey: string,
  model: string = "google/gemini-2.5-flash",
  temperature: number = 0.7,
): Promise<any> {
  const url = "https://ai.gateway.lovable.dev/v1/chat/completions";

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error("[Lovable AI] Error:", resp.status, errText);
    throw new Error(`Lovable AI failed: ${resp.status}`);
  }

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty response from Lovable AI");

  return parseJsonResponse(content);
}

/**
 * Call Together AI for question refinement
 */
export async function callTogetherAI(
  questions: Question[],
  apiKey: string,
  model: string = "meta-llama/Llama-3-70b-chat-hf",
  temperature: number = 0.5,
): Promise<any> {
  const url = "https://api.together.ai/v1/chat/completions";

  const prompt = `You are an expert JAMB exam question refiner. Improve the following questions:

1. Clarify wording and grammar
2. Enhance JAMB exam style consistency
3. Improve distractors (make wrong options more challenging)
4. Ensure step-by-step explanations are clear
5. Remove ambiguous phrasing

Questions:
${JSON.stringify(questions, null, 2)}

Return ONLY valid JSON with improved questions (same structure).`;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature,
      max_tokens: 4000,
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

  return parseJsonResponse(content);
}

/**
 * Call Gemini AI for question validation
 */
export async function callGeminiAI(
  questions: Question[],
  apiKey: string,
  temperature: number = 0.3,
): Promise<any> {
  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent";

  const prompt = `Validate and correct these JAMB exam questions:

1. Verify correct answer matches explanation
2. Check for duplicate options
3. Ensure only ONE correct answer
4. Validate question clarity and completeness
5. Verify explanation accuracy
6. Fix any incorrect answers

Questions:
${JSON.stringify(questions, null, 2)}

Return ONLY valid JSON with corrected questions (same structure).`;

  const resp = await fetch(`${url}?key=${apiKey}`, {
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
        temperature,
        maxOutputTokens: 4000,
      },
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error("[Gemini AI] Error:", resp.status, errText);
    throw new Error(`Gemini AI failed: ${resp.status}`);
  }

  const data = await resp.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) throw new Error("Empty response from Gemini AI");

  return parseJsonResponse(content);
}

/**
 * Full multi-AI pipeline orchestration
 */
export async function executeMultiAIPipeline(
  prompt: string,
  questionCount: number,
  apiKeys: {
    lovable: string;
    together?: string;
    gemini?: string;
  },
): Promise<{
  questions: Question[];
  stats: {
    generated: number;
    refined: number;
    validated: number;
    final: number;
  };
  error?: string;
}> {
  const stats = {
    generated: 0,
    refined: 0,
    validated: 0,
    final: 0,
  };

  try {
    // Step 1: Generate
    console.log("[Pipeline] Step 1: Lovable AI Generation");
    const generated = await callLovableAI(
      `Generate exactly ${questionCount} high-quality JAMB CBT questions.\n\n${prompt}`,
      apiKeys.lovable,
    );
    const generated_questions = generated.questions || [];
    stats.generated = generated_questions.length;
    console.log(`[Pipeline] Generated: ${stats.generated} questions`);

    if (!generated_questions.length) {
      throw new Error("Lovable AI generated no questions");
    }

    // Step 2: Refine (optional)
    console.log("[Pipeline] Step 2: Together AI Refinement");
    let refined_questions = generated_questions;
    if (apiKeys.together) {
      try {
        const refined = await callTogetherAI(generated_questions, apiKeys.together);
        refined_questions = refined.questions || generated_questions;
        stats.refined = refined_questions.length;
      } catch (e) {
        console.warn("[Pipeline] Refinement skipped:", e instanceof Error ? e.message : e);
        stats.refined = generated_questions.length;
      }
    } else {
      stats.refined = generated_questions.length;
    }

    // Step 3: Validate (optional)
    console.log("[Pipeline] Step 3: Gemini AI Validation");
    let validated_questions = refined_questions;
    if (apiKeys.gemini) {
      try {
        const validated = await callGeminiAI(refined_questions, apiKeys.gemini);
        validated_questions = validated.questions || refined_questions;
        stats.validated = validated_questions.length;
      } catch (e) {
        console.warn("[Pipeline] Validation skipped:", e instanceof Error ? e.message : e);
        stats.validated = refined_questions.length;
      }
    } else {
      stats.validated = refined_questions.length;
    }

    // Step 4: Quality Control
    console.log("[Pipeline] Step 4: Quality Control");
    const final_questions = performQualityControl(validated_questions);
    stats.final = final_questions.length;
    console.log(`[Pipeline] Final: ${stats.final} questions`);

    if (!final_questions.length) {
      throw new Error("No questions passed quality control");
    }

    return {
      questions: final_questions,
      stats,
    };
  } catch (e) {
    const error = e instanceof Error ? e.message : "Unknown error";
    console.error("[Pipeline] Error:", error);
    return {
      questions: [],
      stats,
      error,
    };
  }
}
