import { useSettingsStore } from "../store/settings";

export default function LearningStyleEditor() {
  const { learningStyle, setLearningStyle, resetLearningStyle } = useSettingsStore();

  return (
    <>
      <div className="lse">
        <div className="lse-header">
          <span className="lse-label">Prompt</span>
          <button className="lse-reset-btn" onClick={resetLearningStyle}>
            Reset to default
          </button>
        </div>
        <textarea
          className="lse-textarea"
          rows={6}
          value={learningStyle}
          onChange={(e) => setLearningStyle(e.target.value)}
          placeholder="Describe your preferred learning style…"
          spellCheck={false}
        />
        <p className="lse-hint">
          Injected into every "Explain Again" request. Be as specific as you like.
        </p>
      </div>

      <style>{`
        .lse { display: flex; flex-direction: column; gap: 10px; }

        .lse-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .lse-label {
          font-size: 11.5px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-family: var(--font-body);
        }

        .lse-reset-btn {
          font-size: 12px;
          font-weight: 500;
          color: var(--text-muted);
          font-family: var(--font-body);
          text-decoration: underline;
          text-underline-offset: 2px;
          transition: color 140ms;
        }

        .lse-reset-btn:hover { color: var(--text-secondary); }

        .lse-textarea {
          resize: vertical;
          min-height: 120px;
          font-size: 13.5px;
          line-height: 1.65;
          font-family: var(--font-body);
        }

        .lse-hint {
          font-size: 12px;
          color: var(--text-muted);
          line-height: 1.5;
        }
      `}</style>
    </>
  );
}
