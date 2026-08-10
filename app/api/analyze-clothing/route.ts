import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@/lib/supabase/server";

// Current GA multimodal model as of Aug 2026 (gemini-3.6-flash, released
// Jul 21 2026). Do NOT revert to gemini-2.5-flash: as of early July 2026
// Google returns 404 "no longer available to new users" for that model on
// any API key created after the cutoff - confirmed in Google's own AI
// Developer forum threads. If Google deprecates this one too, the fix is
// only ever this one constant.
const MODEL = "gemini-3.6-flash";

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    category: { type: "string", enum: ["top", "bottom", "shoes", "accessory", "bag", "outerwear"] },
    sub_category: { type: "string" },
    primary_color: { type: "string" },
    secondary_colors: { type: "array", items: { type: "string" } },
    pattern: { type: "string" },
    fit: { type: "string" },
    silhouette: { type: "string" },
    material: { type: "string" },
    style: { type: "array", items: { type: "string" } },
    formality: { type: "integer" },
    season: { type: "array", items: { type: "string" } },
  },
  required: ["category", "primary_color", "style", "formality"],
};

const PROMPT = `You are a fashion cataloguing assistant. Look at this single clothing item photo and return ONLY structured JSON describing it - no other clothing in frame, ignore background. Be specific about primary_color (e.g. "olive green", "charcoal grey", not just "dark"). formality is an integer 1-10, 1 = loungewear, 10 = black tie. style should be 2-4 tags from: minimal, streetwear, smart casual, formal, vintage, y2k, old money, workwear, athletic, casual.`;

// Never log the key itself - only whether it's present, and never include
// it (or any header/URL containing it) in any error we log or return.
function safeLog(context: string, detail: unknown) {
  console.error(`[analyze-clothing] ${context}`, detail);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    safeLog("unauthenticated request", {});
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    safeLog("Missing GEMINI_API_KEY", "server env var is not set");
    return NextResponse.json({ error: "GEMINI_API_KEY is not set on the server" }, { status: 500 });
  }

  const formData = await req.formData();
  const file = formData.get("image") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }

  console.log("[analyze-clothing] request", { userId: user.id, mimeType: file.type, sizeBytes: file.size });

  const mimeType = file.type || "image/jpeg";
  const bytes = Buffer.from(await file.arrayBuffer());
  const base64 = bytes.toString("base64");

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: "user",
          parts: [{ text: PROMPT }, { inlineData: { mimeType, data: base64 } }],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    });

    const text = response.text;
    if (!text) {
      safeLog("Empty response from Gemini", { model: MODEL, candidateCount: response.candidates?.length ?? 0 });
      return NextResponse.json({ error: "AI analysis returned no content" }, { status: 502 });
    }

    try {
      const parsed = JSON.parse(text);
      console.log("[analyze-clothing] success", { userId: user.id, category: parsed.category, formality: parsed.formality });
      return NextResponse.json(parsed);
    } catch (parseErr) {
      safeLog("Failed to parse Gemini JSON output", { model: MODEL, rawTextLength: text.length, parseErr: String(parseErr) });
      return NextResponse.json({ error: "AI analysis returned malformed JSON" }, { status: 502 });
    }
  } catch (err: unknown) {
    // This is the log that was missing before - real status/message,
    // never the key, never the raw request (which contains the key in
    // the old fetch-URL approach; the SDK never puts it in an error object).
    const status = (err as { status?: number })?.status;
    const message = err instanceof Error ? err.message : String(err);
    safeLog("Gemini API call failed", { model: MODEL, status, message });

    return NextResponse.json(
      { error: "AI analysis failed", status: status ?? null, message },
      { status: 502 }
    );
  }
}
