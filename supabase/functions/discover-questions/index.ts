import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface DiscoveredQuestion {
  question: string;
  options: { A: string; B: string; C: string; D: string };
  answer: string;
  explanation: string;
  difficulty: string;
  topic?: string;
  source_url?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { subject_name, topic_name, exam_type, count, subject_id, topic_id } =
      await req.json();
    if (!subject_name || !subject_id) {
      return new Response(
        JSON.stringify({ error: "subject_name and subject_id are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const SERPER_API_KEY = Deno.env.get("SERPER_API_KEY");
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!SERPER_API_KEY) throw new Error("SERPER_API_KEY not configured");
    if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY not configured");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const requestedCount = Math.min(count || 50, 200);
    const examLabel = exam_type || "JAMB";
    const topicLabel = topic_name || "";

    // STEP 1: Search for questions using Serper
    console.log("Step 1: Searching for questions...");
    const searchQueries = [
      `${examLabel} ${subject_name} ${topicLabel} past questions and answers`,
      `${examLabel} ${subject_name} ${topicLabel} objective questions with answers`,
      `${subject_name} ${topicLabel} multiple choice questions CBT`,
    ];

    const allUrls: string[] = [];
    for (const query of searchQueries) {
      try {
        console.log("Searching:", query);
        const searchRes = await fetch("https://google.serper.dev/search", {
          method: "POST",
          headers: {
            "X-API-KEY": SERPER_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ q: query, num: 10 }),
        });
        const searchData = await searchRes.json();
        console.log(
          "Search status:",
          searchRes.status,
          "results:",
          JSON.stringify(searchData).slice(0, 500),
        );
        if (searchRes.ok) {
          const urls = (searchData.organic || [])
            .map((r: any) => r.link)
            .filter(Boolean);
          console.log("Found URLs:", urls.length);
          allUrls.push(...urls);
        } else {
          console.error(
            "Serper error:",
            searchRes.status,
            JSON.stringify(searchData),
          );
          if (searchData.message?.includes("Not enough credits")) {
            return new Response(
              JSON.stringify({
                error:
                  "Serper API credits exhausted. Please top up your Serper account at serper.dev.",
              }),
              {
                status: 402,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              },
            );
          }
        }
      } catch (e) {
        console.error("Search query failed:", query, e);
      }
    }

    // Deduplicate URLs, limit to 15
    const uniqueUrls = [...new Set(allUrls)].slice(0, 15);
    console.log(`Found ${uniqueUrls.length} unique URLs`);

    if (uniqueUrls.length === 0) {
      return new Response(
        JSON.stringify({
          error: "No search results found. Try a different subject/topic.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // STEP 2: Scrape URLs with Firecrawl
    console.log("Step 2: Scraping URLs with Firecrawl...");
    const scrapedTexts: { text: string; url: string }[] = [];

    for (const url of uniqueUrls.slice(0, 10)) {
      try {
        const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url,
            formats: ["markdown"],
            onlyMainContent: true,
          }),
        });
        if (scrapeRes.ok) {
          const scrapeData = await scrapeRes.json();
          const markdown =
            scrapeData.data?.markdown || scrapeData.markdown || "";
          if (markdown.length > 100) {
            // Truncate to avoid huge payloads - keep first 8000 chars per page
            scrapedTexts.push({ text: markdown.slice(0, 8000), url });
          }
        }
      } catch (e) {
        console.error("Scrape failed for:", url, e);
      }
    }

    console.log(`Successfully scraped ${scrapedTexts.length} pages`);

    if (scrapedTexts.length === 0) {
      return new Response(
        JSON.stringify({
          error: "Could not scrape any pages. Sites may be blocked.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // STEP 3: AI Cleaning & Structuring
    console.log("Step 3: AI cleaning and structuring...");

    // Combine scraped content, limit total size
    const combinedContent = scrapedTexts
      .map((s, i) => `--- SOURCE ${i + 1}: ${s.url} ---\n${s.text}`)
      .join("\n\n")
      .slice(0, 60000);

    const aiPrompt = `You are a JAMB/WAEC/NECO question extraction expert. Extract ${examLabel}-standard multiple choice questions from the scraped web content below.

SUBJECT: ${subject_name}
${topicLabel ? `TOPIC: ${topicLabel}` : ""}
TARGET COUNT: ${requestedCount} questions

RULES:
- Extract ONLY valid multiple choice questions with exactly 4 options (A-D)
- Each question MUST have a clear correct answer
- Generate an explanation for each question if not provided
- Assign difficulty: "easy" (30%), "medium" (50%), "hard" (20%)
- Remove duplicates and incomplete questions
- Fix any formatting issues
- If you cannot extract enough from the content, generate additional high-quality ${examLabel}-standard questions to reach the target count
- For each question, include the source_url it came from (use "ai_generated" if you created it)

SCRAPED CONTENT:
${combinedContent}

Return ONLY a valid JSON array. No other text.`;

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You extract and clean exam questions. Return ONLY a JSON array of objects with these exact fields: question, options (object with A/B/C/D keys), answer (A/B/C/D), explanation, difficulty (easy/medium/hard), topic (string), source_url (string). No markdown fences, no extra text.`,
            },
            { role: "user", content: aiPrompt },
          ],
        }),
      },
    );

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({
            error: "AI rate limit reached. Please try again in a moment.",
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({
            error:
              "AI credits exhausted. Please add funds in Settings > Workspace > Usage.",
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      throw new Error("AI processing failed");
    }

    const aiData = await aiResponse.json();
    let rawContent = aiData.choices?.[0]?.message?.content || "";

    // Clean markdown fences
    rawContent = rawContent
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/gi, "")
      .trim();

    let questions: DiscoveredQuestion[];
    try {
      questions = JSON.parse(rawContent);
    } catch {
      // Try to find JSON array in the response
      const match = rawContent.match(/\[[\s\S]*\]/);
      if (match) {
        questions = JSON.parse(match[0]);
      } else {
        throw new Error("AI returned invalid JSON");
      }
    }

    if (!Array.isArray(questions))
      throw new Error("AI did not return an array");

    // STEP 4: Validation
    console.log(`Step 4: Validating ${questions.length} questions...`);

    // Check for existing questions in DB to avoid duplicates
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: existingQuestions } = await supabase
      .from("questions")
      .select("question_text")
      .eq("subject_id", subject_id);

    const existingTexts = new Set(
      (existingQuestions || []).map((q: any) =>
        q.question_text.toLowerCase().trim().slice(0, 80),
      ),
    );

    const validQuestions: any[] = [];
    const duplicates: string[] = [];
    const rejected: string[] = [];
    const seenTexts = new Set<string>();

    for (const q of questions) {
      // Validate structure
      if (!q.question || !q.options || !q.answer) {
        rejected.push(q.question || "Missing question text");
        continue;
      }
      if (!q.options.A || !q.options.B || !q.options.C || !q.options.D) {
        rejected.push(q.question);
        continue;
      }
      if (!["A", "B", "C", "D"].includes(q.answer)) {
        rejected.push(q.question);
        continue;
      }

      const normalizedText = q.question.toLowerCase().trim().slice(0, 80);

      // Check for duplicates within batch
      if (seenTexts.has(normalizedText)) {
        duplicates.push(q.question);
        continue;
      }

      // Check for duplicates in DB
      if (existingTexts.has(normalizedText)) {
        duplicates.push(q.question);
        continue;
      }

      seenTexts.add(normalizedText);

      const difficulty = ["easy", "medium", "hard"].includes(q.difficulty)
        ? q.difficulty
        : "medium";

      validQuestions.push({
        question_text: q.question,
        option_a: q.options.A,
        option_b: q.options.B,
        option_c: q.options.C,
        option_d: q.options.D,
        correct_option: q.answer,
        explanation: q.explanation || null,
        difficulty,
        type: "theory",
        topic_name: q.topic || topicLabel || "General",
        source_url: q.source_url || null,
        subject_id,
        topic_id: topic_id || null,
      });
    }

    console.log(
      `Valid: ${validQuestions.length}, Duplicates: ${duplicates.length}, Rejected: ${rejected.length}`,
    );

    return new Response(
      JSON.stringify({
        questions: validQuestions,
        stats: {
          total_found: questions.length,
          valid: validQuestions.length,
          duplicates: duplicates.length,
          rejected: rejected.length,
          urls_searched: uniqueUrls.length,
          urls_scraped: scrapedTexts.length,
        },
        duplicate_questions: duplicates,
        rejected_questions: rejected,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("discover-questions error:", e);
    return new Response(
      JSON.stringify({ error: e.message || "Something went wrong" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
