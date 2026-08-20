import { NextRequest, NextResponse } from "next/server";

// ===========================================================================
// Server-side route: this is the ONLY place any provider's API key is used.
// Never call Groq/Gemini/etc directly from client code — that would ship
// your key to every visitor's browser.
//
// Which provider runs is controlled entirely by ONE env var in .env.local:
//
//   AI_PROVIDER=none    -> skip this step entirely. No key needed. The app
//                          just uses the local dictionary (lib/objectMap.ts).
//   AI_PROVIDER=groq    -> call Groq's hosted open-weight vision model.
//                          Needs GROQ_API_KEY.
//   AI_PROVIDER=gemini  -> call Google's Gemini vision model.
//                          Needs GEMINI_API_KEY.
//
// IMPORTANT: object detection (finding what's in the photo + where the
// bounding boxes are) is NEVER part of this file — that always runs 100%
// locally in the browser via TensorFlow.js + COCO-SSD (see lib/detect.ts).
// This route only handles the *enrichment* step: turning a tapped object's
// cropped image into a sharper name + a short organizing tip. Every mode
// below, including "none", still gets a real answer — "none" and any
// provider failure just mean that answer comes from the local dictionary
// instead of an LLM.
// ===========================================================================

type Provider = "none" | "groq" | "gemini";

const PROVIDER = (process.env.AI_PROVIDER || "none").toLowerCase() as Provider;

interface RequestBody {
  image?: string; // data URL of the cropped object
  label?: string; // COCO-SSD's guess, used as a hint + fallback
}

interface AiResult {
  object: string;
  location: string;
  tip: string;
}

class NoApiKeyError extends Error {}
class ProviderError extends Error {
  code: string;
  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

// ---------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------

function buildPrompt(label?: string): string {
  return `This is a cropped photo of a single object sitting in a messy room${
    label ? ` (an object detector guessed it might be a "${label}")` : ""
  }.

Look at the crop and identify it. Reply with ONLY a JSON object — no markdown
code fences, no explanation before or after — in exactly this shape:
{"object": "<short name of what it actually is>", "location": "<where it should ideally be stored or put away>", "tip": "<one short, practical organizing tip, under 15 words>"}`;
}

// Models sometimes wrap JSON in ```json fences or add a stray sentence
// before/after it. Pull out just the {...} block before parsing.
function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : raw;
  const braceMatch = candidate.match(/\{[\s\S]*\}/);
  return (braceMatch ? braceMatch[0] : candidate).trim();
}

// Reasoning models (e.g. Groq's qwen3.6-27b) can emit a <think>...</think>
// block ahead of the real answer. Strip it as a safety net.
function stripThinking(raw: string): string {
  return raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

function normalize(
  parsed: { object?: string; location?: string; tip?: string },
  label?: string,
): AiResult {
  return {
    object: parsed.object || label || "Item",
    location: parsed.location || "Find its home and put it there",
    tip: parsed.tip || "",
  };
}

// ---------------------------------------------------------------------
// Provider: Groq — https://console.groq.com
// ---------------------------------------------------------------------

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
// Groq's open-weight vision lineup changes fairly often. Check
// https://console.groq.com/docs/models for the current vision-capable
// model if this one gets deprecated.
const GROQ_MODEL = process.env.GROQ_VISION_MODEL || "qwen/qwen3.6-27b";

async function callGroq(image: string, label?: string): Promise<AiResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new NoApiKeyError();

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.3,
      max_tokens: 200,
      // qwen3.6-27b is a hybrid "thinking"/"non-thinking" model. Without
      // this it burns tokens on a <think> block before writing JSON,
      // risking truncation before real content appears. Qwen3-family
      // specific param — harmless to leave in, but remove it if you swap
      // GROQ_VISION_MODEL for a non-Qwen model that doesn't support it.
      reasoning_effort: "none",
      // Intentionally NOT using response_format: { type: "json_object" } —
      // some Groq vision models fail (400 json_validate_failed) when
      // strict JSON mode is combined with an image input.
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: buildPrompt(label) },
            { type: "image_url", image_url: { url: image } },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Groq API error:", res.status, errText);
    throw new ProviderError("groq_error");
  }

  const data = await res.json();
  const raw: string = data?.choices?.[0]?.message?.content ?? "";

  try {
    return normalize(JSON.parse(extractJson(stripThinking(raw))), label);
  } catch {
    console.error("Groq returned unparsable content:", raw);
    throw new ProviderError("parse_error");
  }
}

// ---------------------------------------------------------------------
// Provider: Gemini — https://aistudio.google.com
// ---------------------------------------------------------------------

// Gemini's model lineup also changes often — check
// https://ai.google.dev/gemini-api/docs/models for the current
// vision-capable Flash/Flash-Lite model if this one is retired.
const GEMINI_MODEL = process.env.GEMINI_VISION_MODEL || "gemini-3.5-flash-lite";

function dataUrlToBase64(dataUrl: string): { mimeType: string; data: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.*)$/);
  if (!match) return { mimeType: "image/jpeg", data: dataUrl };
  return { mimeType: match[1], data: match[2] };
}

async function callGemini(image: string, label?: string): Promise<AiResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new NoApiKeyError();

  const { mimeType, data } = dataUrlToBase64(image);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: buildPrompt(label) },
            { inline_data: { mime_type: mimeType, data } },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 200,
        // Gemini's native structured-output mode — reliably returns raw
        // JSON with no markdown fences, even with image input, and
        // doesn't have Groq/Qwen's hidden-thinking-tokens issue.
        responseMimeType: "application/json",
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Gemini API error:", res.status, errText);
    throw new ProviderError("gemini_error");
  }

  const data2 = await res.json();
  const raw: string = data2?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  try {
    return normalize(JSON.parse(extractJson(raw)), label);
  } catch {
    console.error("Gemini returned unparsable content:", raw);
    throw new ProviderError("parse_error");
  }
}

// ---------------------------------------------------------------------
// Route — dispatches to whichever provider AI_PROVIDER selects.
// To add a fourth provider: write a callXxx() function above following
// the same shape (throw NoApiKeyError / ProviderError, return AiResult),
// add "xxx" to the Provider type, and add one line to the switch below.
// ---------------------------------------------------------------------

export async function POST(req: NextRequest) {
  if (PROVIDER === "none") {
    return NextResponse.json({ error: "ai_disabled" }, { status: 501 });
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const { image, label } = body;
  if (!image) {
    return NextResponse.json({ error: "missing_image" }, { status: 400 });
  }

  try {
    const result =
      PROVIDER === "gemini"
        ? await callGemini(image, label)
        : await callGroq(image, label);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof NoApiKeyError) {
      return NextResponse.json({ error: "no_api_key" }, { status: 501 });
    }
    if (err instanceof ProviderError) {
      return NextResponse.json({ error: err.code }, { status: 502 });
    }
    console.error(`${PROVIDER} request failed:`, err);
    return NextResponse.json({ error: "network_error" }, { status: 502 });
  }
}
