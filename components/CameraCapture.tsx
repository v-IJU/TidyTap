"use client";

import { useRef } from "react";

interface Props {
  onCapture: (imageUrl: string) => void;
}

export default function CameraCapture({ onCapture }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    onCapture(url);
    // reset so picking the same file again still fires onChange
    e.target.value = "";
  }

  return (
    <div className="capture-screen">
      <div className="capture-icon" aria-hidden="true">
        <svg viewBox="0 0 64 64" fill="none">
          <rect x="6" y="18" width="52" height="36" rx="8" fill="var(--wall)" />
          <rect x="22" y="10" width="20" height="12" rx="4" fill="var(--wall)" />
          <circle cx="32" cy="36" r="12" fill="var(--card)" stroke="var(--ink)" strokeWidth="3" />
          <circle cx="32" cy="36" r="5" fill="var(--coral)" />
        </svg>
      </div>
      <h1>TidyTap</h1>
      <p>Take a photo of the messy space. Tap anything in it to see where it goes.</p>
      <button className="capture-btn" onClick={() => inputRef.current?.click()}>
        Scan a messy space
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        hidden
      />
      <span className="capture-hint">Works with the camera or an existing photo</span>
    </div>
  );
}
