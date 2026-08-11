import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createGeminiClient, GEMINI_MODEL } from "@/lib/gemini-client";

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    is_clothing: { type: "boolean" },
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
  required: ["is_clothing", "category", "primary_color", "style", "formality"],
};

const PROMPT = `You are a fashion cataloguing assistant. First decide is_clothing: true only if the image's main subject is a single wearable clothing/fashion item (shirt, trousers, shoes, jacket, bag, watch, etc) suitable for a wardrobe catalog. Set is_clothing: false for photos of people/selfies, food, landscapes, screenshots, documents, animals, vehicles, furniture, or any other non-clothing subject - even if clothing is visible being worn by a person, since we need a clean product-style shot, not a person wearing it. If is_clothing is false, you may leave the other fields as best-effort defaults; they will be ignored. If is_clothing is true, return the rest of the structured JSON describing it - no other clothing in frame, ignore background. Be specific about primary_color (e.g. "olive green", "charcoal grey", not just "dark"). formality is an integer 1-10, 1 = loungewear, 10 = black tie. style should be 2-4 tags from: minimal, streetwear, smart casual, formal, vintage, y2k, old money, workwear, athletic, casual.`;

function log(context: string, detail: Record<string, unknown>) {
  console.log(`[clothing-upload] ${context}`, detail);
}
function logError(context: string, detail: Record<string, unknown>) {
  console.error(`[clothing-upload:error] ${context}`, detail);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    logError("unauthenticated_request", {});
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("image") as File | null;
  const hash = formData.get("hash") as string | null;
  if (!file) {
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }

  // Server-side duplicate check, BEFORE any Gemini call and before Storage
  // upload - this is the authoritative check now, not just a client-side
  // pre-check. The database's own unique index (0009 migration) is the
  // final backstop against the race this used to have.
  if (hash) {
    const { data: existing } = await supabase
      .from("clothing_items")
      .select("id, name")
      .eq("user_id", user.id)
      .eq("image_hash", hash)
      .maybeSingle();

    if (existing) {
      log("duplicate_blocked", { userId: user.id, duplicateDetected: true, existingItemId: existing.id });
      return NextResponse.json({ error: "duplicate", existingItem: existing }, { status: 409 });
    }
  }

  const client = createGeminiClient();
  if ("error" in client) {
    logError("missing_api_key", {});
    return NextResponse.json({ error: client.error }, { status: 500 });
  }

  log("request", { userId: user.id, mimeType: file.type, sizeBytes: file.size, duplicateDetected: false });

  const mimeType = file.type || "image/jpeg";
  const bytes = Buffer.from(await file.arrayBuffer());
  const base64 = bytes.toString("base64");

  try {
    const response = await client.ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ text: PROMPT }, { inlineData: { mimeType, data: base64 } }] }],
      config: { responseMimeType: "application/json", responseSchema: RESPONSE_SCHEMA },
    });

    const text = response.text;
    if (!text) {
      logError("empty_response", { model: GEMINI_MODEL, candidateCount: response.candidates?.length ?? 0 });
      return NextResponse.json({ error: "AI analysis returned no content" }, { status: 502 });
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(text);
    } catch (parseErr) {
      logError("malformed_json", { model: GEMINI_MODEL, rawTextLength: text.length, parseErr: String(parseErr) });
      return NextResponse.json({ error: "AI analysis returned malformed JSON" }, { status: 502 });
    }

    if (parsed.is_clothing === false) {
      log("rejected_not_clothing", { userId: user.id, validationResult: "not_clothing" });
      return NextResponse.json({ error: "not_clothing" }, { status: 422 });
    }

    log("success", { userId: user.id, validationResult: "clothing", category: parsed.category, formality: parsed.formality });
    return NextResponse.json(parsed);
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status;
    const message = err instanceof Error ? err.message : String(err);
    logError("gemini_call_failed", { model: GEMINI_MODEL, status, message });
    return NextResponse.json({ error: "AI analysis failed", status: status ?? null, message }, { status: 502 });
  }
}
