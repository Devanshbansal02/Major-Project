import { useNavigate } from "react-router-dom";
import ProviderSelector from "../components/ProviderSelector";
import LearningStyleEditor from "../components/LearningStyleEditor";

export default function Settings() {
  const navigate = useNavigate();

  return (
    <div className="page">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate("/student")}>← Back</button>
        <h1 className="settings-title">Settings</h1>
      </div>

      <div className="settings-sections">
        <section className="card settings-section">
          <h2 className="settings-section-title">LLM Provider</h2>
          <ProviderSelector />
        </section>

        <section className="card settings-section">
          <h2 className="settings-section-title">Learning Style</h2>
          <LearningStyleEditor />
        </section>
      </div>

      <style>{`
        .settings-title { font-size: 22px; font-weight: 700; }
        .settings-sections { display: flex; flex-direction: column; gap: 20px; max-width: 680px; }
        .settings-section { display: flex; flex-direction: column; gap: 20px; }
        .settings-section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); padding-bottom: 16px; border-bottom: 1px solid var(--border-subtle); }
      `}</style>
    </div>
  );
}
