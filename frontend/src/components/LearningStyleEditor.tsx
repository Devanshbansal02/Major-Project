import { useSettingsStore } from "../store/settings";

export default function LearningStyleEditor() {
  const { learningStyle, setLearningStyle, resetLearningStyle } = useSettingsStore();

  return (
    <div className="ls-editor">
      <div className="ls-header">
        <label className="ls-label">Learning Style</label>
        <button className="btn btn-ghost ls-reset-btn" onClick={resetLearningStyle}>
          Reset to default
        </button>
      </div>
      <textarea
        className="ls-textarea"
        rows={5}
        value={learningStyle}
        onChange={(e) => setLearningStyle(e.target.value)}
        placeholder="Describe your preferred learning style..."
      />
      <p className="ls-hint">This prompt is injected into every "Explain Again" request to personalise responses.</p>
      <style>{`
        .ls-editor { display: flex; flex-direction: column; gap: 10px; }
        .ls-header { display: flex; align-items: center; justify-content: space-between; }
        .ls-label { font-size: 13px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.06em; }
        .ls-reset-btn { font-size: 12px; padding: 6px 12px; }
        .ls-textarea { width: 100%; resize: vertical; min-height: 110px; font-size: 13px; line-height: 1.6; }
        .ls-hint { font-size: 12px; color: var(--text-muted); }
      `}</style>
    </div>
  );
}
