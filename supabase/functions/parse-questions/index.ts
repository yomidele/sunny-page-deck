import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Simple CSV parser that handles quoted fields
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) continue;
    const row: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          current += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ",") {
          row.push(current.trim());
          current = "";
        } else {
          current += ch;
        }
      }
    }
    row.push(current.trim());
    rows.push(row);
  }
  return rows;
}

// Match answer text to correct option letter
function matchAnswerToLetter(
  answer: string,
  optA: string,
  optB: string,
  optC: string,
  optD: string,
): string {
  const ans = answer.trim().toLowerCase();
  if (ans === "a") return "A";
  if (ans === "b") return "B";
  if (ans === "c") return "C";
  if (ans === "d") return "D";
  if (ans === optA.trim().toLowerCase()) return "A";
  if (ans === optB.trim().toLowerCase()) return "B";
  if (ans === optC.trim().toLowerCase()) return "C";
  if (ans === optD.trim().toLowerCase()) return "D";
  // Partial match
  if (
    optA.trim().toLowerCase().includes(ans) ||
    ans.includes(optA.trim().toLowerCase())
  )
    return "A";
  if (
    optB.trim().toLowerCase().includes(ans) ||
    ans.includes(optB.trim().toLowerCase())
  )
    return "B";
  if (
    optC.trim().toLowerCase().includes(ans) ||
    ans.includes(optC.trim().toLowerCase())
  )
    return "C";
  if (
    optD.trim().toLowerCase().includes(ans) ||
    ans.includes(optD.trim().toLowerCase())
  )
    return "D";
  return "A"; // fallback
}

// Try to detect CSV column mapping from header row
function detectColumns(header: string[]): {
  topic: number;
  question: number;
  optA: number;
  optB: number;
  optC: number;
  optD: number;
  answer: number;
} | null {
  const h = header.map((c) => c.toLowerCase().replace(/[^a-z0-9]/g, ""));

  const find = (patterns: string[]) =>
    h.findIndex((c) => patterns.some((p) => c.includes(p)));

  const question = find(["question", "quest"]);
  const optA = find(["optiona", "opta", "choicea"]);
  const optB = find(["optionb", "optb", "choiceb"]);
  const optC = find(["optionc", "optc", "choicec"]);
  const optD = find(["optiond", "optd", "choiced"]);
  const answer = find(["answer", "correct", "ans"]);
  const topic = find(["topic", "chapter", "section", "category"]);

  if (
    question === -1 ||
    optA === -1 ||
    optB === -1 ||
    optC === -1 ||
    optD === -1 ||
    answer === -1
  ) {
    return null;
  }

  return {
    topic: topic === -1 ? -1 : topic,
    question,
    optA,
    optB,
    optC,
    optD,
    answer,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing auth");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify admin
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

    const adminClient = createClient(supabaseUrl, supabaseKey);
    const { data: userData } = await adminClient
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    if (userData?.role !== "admin") throw new Error("Admin only");

    const { file_base64, file_type, subject_id } = await req.json();
    if (!file_base64 || !file_type || !subject_id)
      throw new Error("Missing file_base64, file_type, or subject_id");

    // Get subject name
    const { data: subject } = await adminClient
      .from("subjects")
      .select("name")
      .eq("id", subject_id)
      .single();
    if (!subject) throw new Error("Subject not found");

    // Get existing topics for this subject
    const { data: existingTopics } = await adminClient
      .from("topics")
      .select("id, name")
      .eq("subject_id", subject_id);

    // Build topic map
    const topicMap = new Map<string, string>();
    for (const t of existingTopics ?? []) {
      topicMap.set(t.name.toLowerCase(), t.id);
    }

    type ParsedQuestion = {
      question_text: string;
      option_a: string;
      option_b: string;
      option_c: string;
      option_d: string;
      correct_option: string;
      explanation: string;
      topic_name: string;
    };

    let parsedQuestions: ParsedQuestion[] = [];

    if (file_type === "csv") {
      // ========== DIRECT CSV PARSING (no AI needed) ==========
      console.log("Parsing CSV directly (no AI)...");
      const textContent = atob(file_base64);
      const rows = parseCSV(textContent);

      if (rows.length < 2)
        throw new Error("CSV file is empty or has no data rows");

      const cols = detectColumns(rows[0]);
      if (!cols) {
        throw new Error(
          "Could not detect CSV columns. Expected headers: Topic, Question, Option A, Option B, Option C, Option D, Answer",
        );
      }

      console.log(`CSV detected ${rows.length - 1} data rows`);

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const questionText = row[cols.question] || "";
        const optA = row[cols.optA] || "";
        const optB = row[cols.optB] || "";
        const optC = row[cols.optC] || "";
        const optD = row[cols.optD] || "";
        const answerRaw = row[cols.answer] || "";
        const topicName =
          cols.topic >= 0 ? row[cols.topic] || "General" : "General";

        if (!questionText || !optA || !optB) continue; // skip empty rows

        const correctOption = matchAnswerToLetter(
          answerRaw,
          optA,
          optB,
          optC,
          optD,
        );

        parsedQuestions.push({
          question_text: questionText,
          option_a: optA,
          option_b: optB,
          option_c: optC,
          option_d: optD,
          correct_option: correctOption,
          explanation: "",
          topic_name: topicName,
        });
      }

      console.log(`CSV parsed ${parsedQuestions.length} valid questions`);
    } else {
      // ========== AI PARSING FOR PDFs ==========
      const topicList = (existingTopics ?? []).map((t) => t.name).join(", ");
      const prompt = `You are a JAMB CBT question parser. Extract ALL questions from this document for the subject "${subject.name}".

Existing topics for this subject: ${topicList || "None yet - create appropriate topic names"}

For each question, extract:
- question_text: The question
- option_a, option_b, option_c, option_d: The four options
- correct_option: The correct answer letter (A, B, C, or D)
- explanation: Brief explanation of the correct answer
- topic_name: Which topic this question belongs to

IMPORTANT:
- Extract EVERY SINGLE question. Do not skip any.
- If options are labeled 1,2,3,4 convert them to A,B,C,D
- If the correct answer is given as text, match it to the correct option letter
- Return valid JSON only

Return a JSON object: { "questions": [ { "question_text": "...", "option_a": "...", "option_b": "...", "option_c": "...", "option_d": "...", "correct_option": "A", "explanation": "...", "topic_name": "..." } ] }`;

      const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
      const geminiKey = Deno.env.get("GEMINI_API_KEY");
      let aiResult = "";

      if (lovableApiKey) {
        console.log("Using Lovable AI Gateway for PDF...");
        const messages = [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:application/pdf;base64,${file_base64}`,
                },
              },
              { type: "text", text: prompt },
            ],
          },
        ];

        const aiResp = await fetch(
          "https://ai.gateway.lovable.dev/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${lovableApiKey}`,
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-pro",
              messages,
              response_format: { type: "json_object" },
              temperature: 0.1,
            }),
          },
        );

        if (!aiResp.ok) {
          const errText = await aiResp.text();
          console.error("Lovable AI error:", aiResp.status, errText);
          if (aiResp.status === 429)
            throw new Error(
              "AI rate limit reached. Please try again in a moment.",
            );
          if (aiResp.status === 402)
            throw new Error("AI credits required. Please add funds.");
          throw new Error("AI processing failed");
        }

        const aiData = await aiResp.json();
        aiResult = aiData.choices?.[0]?.message?.content ?? "";
      } else if (geminiKey) {
        console.log("Using direct Gemini API for PDF...");
        const geminiBody = {
          contents: [
            {
              parts: [
                {
                  inline_data: {
                    mime_type: "application/pdf",
                    data: file_base64,
                  },
                },
                { text: prompt },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.1,
          },
        };

        let geminiData: Record<string, unknown> | null = null;
        let lastError = "";
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
        const bodyStr = JSON.stringify(geminiBody);

        for (let attempt = 0; attempt < 3; attempt++) {
          const resp = await fetch(geminiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: bodyStr,
          });
          if (resp.ok) {
            geminiData = await resp.json();
            break;
          }
          lastError = await resp.text();
          if (resp.status !== 503 && resp.status !== 429) {
            throw new Error("AI processing failed");
          }
          console.log(`Gemini ${resp.status}, retrying (${attempt + 1}/3)...`);
          await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
        }
        if (!geminiData) throw new Error("AI processing failed after retries");
        aiResult =
          (geminiData as any).candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      } else {
        throw new Error("No AI API key configured");
      }

      // Parse AI JSON response
      try {
        let cleaned = aiResult
          .replace(/```json\s*/gi, "")
          .replace(/```\s*/g, "")
          .trim();
        if (!cleaned.startsWith("{") && !cleaned.startsWith("[")) {
          const s = cleaned.indexOf("{");
          if (s !== -1)
            cleaned = cleaned.slice(s, cleaned.lastIndexOf("}") + 1);
        }
        const parsed = JSON.parse(cleaned);
        parsedQuestions = parsed.questions || [];
      } catch {
        console.error("Failed to parse AI response:", aiResult.slice(0, 500));
        throw new Error("AI returned invalid format");
      }
    }

    if (!parsedQuestions.length)
      throw new Error("No questions extracted from document");

    // Create missing topics
    for (const q of parsedQuestions) {
      const key = q.topic_name.toLowerCase();
      if (!topicMap.has(key)) {
        const { data: newTopic, error } = await adminClient
          .from("topics")
          .insert({ name: q.topic_name, subject_id })
          .select("id")
          .single();
        if (error) {
          console.error("Topic insert error:", error);
          continue;
        }
        topicMap.set(key, newTopic.id);
      }
    }

    // Normalize correct_option
    const normalizeOption = (opt: string): string | null => {
      const letter = opt
        .trim()
        .toUpperCase()
        .replace(/[^A-D]/g, "");
      if (letter.length === 1 && "ABCD".includes(letter)) return letter;
      return null;
    };

    // Build insert rows
    const rows = parsedQuestions
      .filter((q) => topicMap.has(q.topic_name.toLowerCase()))
      .map((q) => ({
        subject_id,
        topic_id: topicMap.get(q.topic_name.toLowerCase())!,
        question_text: q.question_text,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        correct_option: normalizeOption(q.correct_option) ?? "A",
        explanation: q.explanation || null,
      }))
      .filter((r) => r.question_text && r.option_a);

    if (!rows.length) throw new Error("No valid questions after processing");

    // Insert in batches of 100 to avoid payload limits
    let totalInserted = 0;
    for (let i = 0; i < rows.length; i += 100) {
      const batch = rows.slice(i, i + 100);
      const { error: insertErr } = await adminClient
        .from("questions")
        .insert(batch);
      if (insertErr) {
        console.error(`Batch insert error at ${i}:`, insertErr);
        throw new Error("Failed to save questions: " + insertErr.message);
      }
      totalInserted += batch.length;
    }

    console.log(`Successfully inserted ${totalInserted} questions`);

    return new Response(
      JSON.stringify({
        success: true,
        count: totalInserted,
        topics_created: Math.max(
          0,
          parsedQuestions
            .map((q) => q.topic_name)
            .filter((v, i, a) => a.indexOf(v) === i).length -
            (existingTopics?.length ?? 0),
        ),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("parse-questions error:", e);
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
