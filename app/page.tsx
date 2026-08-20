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
  const [activeSuggestion, setActiveSuggestion] = useState<Suggestion | null>(
    null,
  );

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

  // Shared by both auto-detected taps and manual taps (see handleManualTap
  // below). isManual controls only the fallback text shown before/without
  // an AI response — everything else behaves identically either way.
  function respondToTap(
    detection: Detection,
    index: number,
    cropDataUrl: string,
    isManual: boolean,
  ) {
    const fallback: Suggestion = isManual
      ? {
          name: "Unidentified item",
          dest: "Not auto-detected — checking with AI…",
        }
      : getSuggestion(detection.class);

    setActiveSuggestion(fallback);
    setSheetOpen(true);
    setTidied((prev) => new Set(prev).add(index));

    if (!cropDataUrl) return;

    setSheetLoading(true);
    fetchAiSuggestion(cropDataUrl, isManual ? undefined : detection.class)
      .then((ai) => {
        if (ai) {
          setActiveSuggestion({
            name: ai.object,
            dest: ai.location,
            tip: ai.tip,
          });
        } else if (isManual) {
          // A manual tap has no COCO-SSD class to fall back on — if the AI
          // call also failed or no provider is configured, say so plainly
          // instead of showing a generic dictionary answer that doesn't
          // apply here.
          setActiveSuggestion({
            name: "Unidentified item",
            dest: "Set AI_PROVIDER (groq or gemini) in .env.local to identify custom taps",
          });
        }
      })
      .finally(() => setSheetLoading(false));
  }

  function handleTap(index: number, cropDataUrl: string) {
    const detection = detections[index];
    if (!detection) return;
    respondToTap(detection, index, cropDataUrl, false);
  }

  function handleManualTap(
    bbox: [number, number, number, number],
    cropDataUrl: string,
  ) {
    const manualDetection: Detection = {
      class: "unidentified",
      score: 1,
      bbox,
    };
    const newIndex = detections.length;
    setDetections((prev) => [...prev, manualDetection]);
    respondToTap(manualDetection, newIndex, cropDataUrl, true);
  }

  return (
    <main className="phone">
      {!imageUrl && <CameraCapture onCapture={handleCapture} />}

      {imageUrl && (
        <>
          <ProgressStrip
            total={detections.length}
            tidiedCount={tidied.size}
            onRetake={handleRetake}
          />
          <SceneCanvas
            imageUrl={imageUrl}
            onDetections={setDetections}
            tidiedIndices={tidied}
            onTap={handleTap}
            onManualTap={handleManualTap}
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
