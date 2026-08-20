"use client";

import { useState } from "react";
import CameraCapture from "@/components/CameraCapture";
import SceneCanvas from "@/components/SceneCanvas";
import SuggestionSheet from "@/components/SuggestionSheet";
import ProgressStrip from "@/components/ProgressStrip";
import { Detection } from "@/lib/detect";
import { getSuggestion, Suggestion } from "@/lib/objectMap";
import { fetchAiSuggestion } from "@/lib/aiSuggest";

export default function Home() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [tidied, setTidied] = useState<Set<number>>(new Set());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState<Suggestion | null>(null);

  function handleCapture(url: string) {
    setImageUrl(url);
    setDetections([]);
    setTidied(new Set());
    setSheetOpen(false);
  }

  function handleRetake() {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(null);
    setDetections([]);
    setTidied(new Set());
    setSheetOpen(false);
  }

  function handleTap(index: number, cropDataUrl: string) {
    const detection = detections[index];
    if (!detection) return;

    // 1. Show the instant, local dictionary answer right away — no waiting.
    const fallback = getSuggestion(detection.class);
    setActiveSuggestion(fallback);
    setSheetOpen(true);
    setTidied((prev) => new Set(prev).add(index));

    // 2. In the background, ask the Groq vision model for a sharper
    //    identification + a short organizing tip, and upgrade the card
    //    when (if) it comes back. If it fails or no key is configured,
    //    the fallback above just stays as the final answer.
    if (cropDataUrl) {
      setSheetLoading(true);
      fetchAiSuggestion(cropDataUrl, detection.class)
        .then((ai) => {
          if (ai) {
            setActiveSuggestion({ name: ai.object, dest: ai.location, tip: ai.tip });
          }
        })
        .finally(() => setSheetLoading(false));
    }
  }

  return (
    <main className="phone">
      {!imageUrl && <CameraCapture onCapture={handleCapture} />}

      {imageUrl && (
        <>
          <ProgressStrip total={detections.length} tidiedCount={tidied.size} onRetake={handleRetake} />
          <SceneCanvas
            imageUrl={imageUrl}
            onDetections={setDetections}
            tidiedIndices={tidied}
            onTap={handleTap}
          />
          <SuggestionSheet
            open={sheetOpen}
            suggestion={activeSuggestion}
            loading={sheetLoading}
            onClose={() => setSheetOpen(false)}
          />
        </>
      )}
    </main>
  );
}
