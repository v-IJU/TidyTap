"use client";

import { Suggestion } from "@/lib/objectMap";

interface Props {
  open: boolean;
  suggestion: Suggestion | null;
  loading: boolean;
  onClose: () => void;
}

export default function SuggestionSheet({ open, suggestion, loading, onClose }: Props) {
  return (
    <div className={`sheet ${open ? "show" : ""}`}>
      <div className="sheet-tape" />
      <div className="sheet-content">
        <div className="sheet-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path
              d="M4 12l5 5L20 6"
              stroke="var(--coral)"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="sheet-text">
          <div className="sheet-obj">{suggestion?.name ?? "—"}</div>
          <div className="sheet-arrow">goes to</div>
          <div className="sheet-dest">{suggestion?.dest ?? "—"}</div>
          {(loading || suggestion?.tip) && (
            <div className={`sheet-tip ${loading ? "loading" : ""}`}>
              {loading ? "Asking AI for a tip…" : suggestion?.tip}
            </div>
          )}
        </div>
        <button className="sheet-close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>
    </div>
  );
}
