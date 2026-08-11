import { GoogleGenAI } from "@google/genai";

// Shared by every route that calls Gemini (analyze-clothing, validate-photo)
// so the key-presence check, client construction, and model constant live
// in exactly one place instead of drifting across routes.
//
// Current GA multimodal model as of Aug 2026 (gemini-3.6-flash, released
// Jul 21 2026). Do NOT revert to gemini-2.5-flash - see analyze-clothing
// route history for why.
export const GEMINI_MODEL = "gemini-3.6-flash";

export function createGeminiClient(): { ai: GoogleGenAI } | { error: string } {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { error: "GEMINI_API_KEY is not set on the server" };
  }
  return { ai: new GoogleGenAI({ apiKey }) };
}
