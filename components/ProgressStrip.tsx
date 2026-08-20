"use client";

interface Props {
  total: number;
  tidiedCount: number;
  onRetake: () => void;
}

export default function ProgressStrip({ total, tidiedCount, onRetake }: Props) {
  return (
    <div className="topbar">
      <div className="topbar-row">
        <div className="brand">
          <span className="dot" />
          TidyTap
        </div>
        <button className="retake-btn" onClick={onRetake}>
          ↻ Retake photo
        </button>
      </div>
      <div className="progress-strip">
        <span>
          {total === 0 ? "Looking for objects…" : `${tidiedCount} of ${total} tidied`}
        </span>
        {total > 0 && (
          <div className="dots">
            {Array.from({ length: total }).map((_, i) => (
              <span key={i} className={i < tidiedCount ? "done" : ""} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
