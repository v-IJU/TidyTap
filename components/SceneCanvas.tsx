"use client";

import { useEffect, useRef, useState } from "react";
import { detectObjects, Detection } from "@/lib/detect";

interface Props {
  imageUrl: string;
  onDetections: (detections: Detection[]) => void;
  tidiedIndices: Set<number>;
  onTap: (index: number, cropDataUrl: string) => void;
}

// Crops the tapped object out of the full photo so we only send that
// object (not the whole messy room) to the vision model — smaller
// payload, faster upload, and keeps the rest of the room private.
// Also downscales it: vision models bill/rate-limit by image tokens,
// which scale with resolution, and a small crop of a chair leg doesn't
// need to be full camera resolution to be identified.
const MAX_CROP_DIMENSION = 320;

function cropToDataUrl(img: HTMLImageElement, bbox: [number, number, number, number]): string {
  const [x, y, w, h] = bbox;
  const scale = Math.min(1, MAX_CROP_DIMENSION / Math.max(w, h));
  const outW = Math.max(1, Math.round(w * scale));
  const outH = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.drawImage(img, x, y, w, h, 0, 0, outW, outH);
  return canvas.toDataURL("image/jpeg", 0.75);
}

export default function SceneCanvas({ imageUrl, onDetections, tidiedIndices, onTap }: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [status, setStatus] = useState<"scanning" | "done" | "error">("scanning");

  useEffect(() => {
    setStatus("scanning");
    setDetections([]);
  }, [imageUrl]);

  async function handleImageLoad() {
    if (!imgRef.current) return;
    try {
      const img = imgRef.current;

      // Detect on an offscreen canvas locked to the photo's true
      // resolution (naturalWidth/naturalHeight), not the <img> element
      // directly. coco-ssd reads an <img>'s *rendered* CSS size — since
      // this photo is displayed responsively (width: 100%), that mismatch
      // made every bounding box collapse toward one corner once we scaled
      // it back up. A same-resolution canvas keeps bbox coordinates in
      // the same pixel space we use for positioning and cropping below.
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context unavailable");
      ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight);

      const results = await detectObjects(canvas);
      setDetections(results);
      onDetections(results);
      setStatus("done");
    } catch (err) {
      console.error("Detection failed:", err);
      setStatus("error");
    }
  }

  return (
    <div className="scene-wrap">
      {status === "scanning" && <div className="hint-toast">Scanning the photo…</div>}
      {status === "done" && detections.length === 0 && (
        <div className="hint-toast">No objects recognized — try a clearer photo</div>
      )}
      {status === "error" && (
        <div className="hint-toast">Couldn&apos;t load the detector — check your connection</div>
      )}

      <div className="scene">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={imageUrl}
          alt="Captured room"
          className="room-photo"
          onLoad={handleImageLoad}
        />

        {status === "scanning" && (
          <>
            <div className="scan-line" />
            <div className="scanning-label">Scanning room…</div>
          </>
        )}

        {status === "done" &&
          detections.map((d, i) => {
            const [x, y, w, h] = d.bbox;
            const imgEl = imgRef.current;
            if (!imgEl) return null;
            const leftPct = ((x + w / 2) / imgEl.naturalWidth) * 100;
            const topPct = ((y + h / 2) / imgEl.naturalHeight) * 100;
            const tidied = tidiedIndices.has(i);
            return (
              <button
                key={i}
                className={`obj ${tidied ? "tidied" : ""}`}
                style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                onClick={() => onTap(i, cropToDataUrl(imgEl, d.bbox))}
              >
                <span className="hit">
                  <span className="ring" />
                  <span className="obj-dot" />
                  <span className="badge">✓</span>
                </span>
              </button>
            );
          })}
      </div>
    </div>
  );
}
