// lib/aiSuggest.ts
// Client-side helper that asks the /api/identify route (Groq vision model)
// for a richer object identification + storage tip. Always has a caller-side
// fallback available (lib/objectMap.ts) since this can fail or be disabled.

export interface AiSuggestion {
  object: string;
  location: string;
  tip: string;
}

export async function fetchAiSuggestion(
  imageDataUrl: string,
  label?: string,
): Promise<AiSuggestion | null> {
  try {
    const res = await fetch("/api/identify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: imageDataUrl, label }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (data.error) return null;

    return data as AiSuggestion;
  } catch (err) {
    console.warn("AI suggestion unavailable, using local fallback:", err);
    return null;
  }
}
