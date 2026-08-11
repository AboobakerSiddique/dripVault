import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createGeminiClient, GEMINI_MODEL } from "@/lib/gemini-client";

const RESPONSE_SCHEMA = {
  type: "object",
  properties: { contains_person: { type: "boolean" } },
  required: ["contains_person"],
};

const PROMPT = `Does this photo's main subject show a real human person (portrait, head-and-shoulders, or full-body)? Answer contains_person: true only for an actual photo of a person suitable as a profile/try-on photo. Answer false for clothing-only product shots, objects, animals, landscapes, screenshots, documents, or any image that is not a photo of a person.`;

function log(context: string, detail: Record<string, unknown>) {
  console.log(`[profile-photo-upload] ${context}`, detail);
}
function logError(context: string, detail: Record<string, unknown>) {
  console.error(`[profile-photo-upload:error] ${context}`, detail);
}

// Validation happens here, BEFORE the client uploads to Storage - MyPhotos.tsx
// calls this first and only proceeds to the actual upload if it passes.
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
  if (!file) return NextResponse.json({ error: "No image provided" }, { status: 400 });

  const client = createGeminiClient();
  if ("error" in client) {
    logError("missing_api_key", {});
    return NextResponse.json({ error: client.error }, { status: 500 });
  }

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
      logError("empty_response", { userId: user.id });
      return NextResponse.json({ error: "Photo validation returned no result" }, { status: 502 });
    }

    const parsed = JSON.parse(text);
    log("checked", { userId: user.id, validationResult: parsed.contains_person ? "person" : "no_person" });

    if (!parsed.contains_person) {
      return NextResponse.json({ error: "not_a_person" }, { status: 422 });
    }
    return NextResponse.json({ valid: true });
  } catch (err) {
    logError("gemini_call_failed", { userId: user.id, message: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Photo validation failed" }, { status: 502 });
  }
}
