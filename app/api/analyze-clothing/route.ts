import { NextRequest, NextResponse } from "next/server";

// Stub for Phase 3: accepts an uploaded image, calls a vision-capable
// AI model, and returns structured clothing metadata (brief section 6).
// Swap GEMINI_API_KEY for ANTHROPIC_API_KEY to switch providers - keep
// provider logic behind this route so nothing else in the app changes.
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("image");

  if (!file) {
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }

  // TODO: send `file` to Gemini/Claude vision endpoint, request strict
  // JSON matching types/clothing.ts, and return it here.
  return NextResponse.json({
    category: "top",
    primary_color: "black",
    style: ["minimal"],
    formality: 3,
    note: "stub response - wire up the real AI call in Phase 3",
  });
}
