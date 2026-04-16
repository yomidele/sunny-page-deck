import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

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
    if (!subject_id || !topic_id || !subject_name || !topic_name)
      throw new Error(
        "Missing subject_id, topic_id, subject_name, or topic_name",
      );

    const questionCount = count || 50;

    const prompt = `You are a JAMB CBT question generator for Nigeria. Generate exactly ${questionCount} high-quality multiple-choice questions for:

Subject: ${subject_name}
Topic: ${topic_name}

REQUIREMENTS:
- Follow strict JAMB CBT standard
- Difficulty distribution: 30% easy, 50% medium, 20% hard
- Mix of theory questions and calculation-based questions
- Each question must have exactly 4 options (A, B, C, D)
- Include a clear step-by-step explanation for each answer
- Questions must be exam-quality, no duplicates
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

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) throw new Error("AI not configured");

    console.log(
      `Generating ${questionCount} questions for ${subject_name} > ${topic_name}...`,
    );

    const aiResp = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${lovableApiKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          temperature: 0.7,
        }),
      },
    );

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("AI error:", aiResp.status, errText);
      if (aiResp.status === 429)
        throw new Error("AI rate limit. Please try again in a moment.");
      if (aiResp.status === 402)
        throw new Error("AI credits required. Please add funds.");
      throw new Error("AI processing failed");
    }

    const aiData = await aiResp.json();
    const aiResult = aiData.choices?.[0]?.message?.content ?? "";

    // Parse response
    let parsed: any;
    try {
      let cleaned = aiResult
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();
      if (!cleaned.startsWith("{")) {
        const s = cleaned.indexOf("{");
        if (s !== -1) cleaned = cleaned.slice(s, cleaned.lastIndexOf("}") + 1);
      }
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", aiResult.slice(0, 500));
      throw new Error("AI returned invalid format");
    }

    const questions = parsed.questions || [];
    if (!questions.length) throw new Error("No questions generated");

    // Validate each question
    const validDifficulties = ["easy", "medium", "hard"];
    const validTypes = ["theory", "calculation"];
    const validOptions = ["A", "B", "C", "D"];

    const validQuestions = questions.filter(
      (q: any) =>
        q.question_text &&
        q.option_a &&
        q.option_b &&
        q.option_c &&
        q.option_d &&
        validOptions.includes(q.correct_option?.toUpperCase?.()),
    );

    if (!validQuestions.length)
      throw new Error("No valid questions after validation");

    // Insert into database
    const adminClient = createClient(supabaseUrl, supabaseKey);

    const rows = validQuestions.map((q: any) => ({
      subject_id,
      topic_id,
      question_text: q.question_text,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_option: q.correct_option.toUpperCase(),
      explanation: q.explanation || null,
      difficulty: validDifficulties.includes(q.difficulty)
        ? q.difficulty
        : "medium",
      type: validTypes.includes(q.type) ? q.type : "theory",
    }));

    // Insert in batches
    let totalInserted = 0;
    for (let i = 0; i < rows.length; i += 50) {
      const batch = rows.slice(i, i + 50);
      const { error } = await adminClient.from("questions").insert(batch);
      if (error) {
        console.error("Insert error:", error);
        throw new Error("Failed to save questions: " + error.message);
      }
      totalInserted += batch.length;
    }

    console.log(`Generated and saved ${totalInserted} questions`);

    return new Response(
      JSON.stringify({ success: true, count: totalInserted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("generate-questions error:", e);
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
