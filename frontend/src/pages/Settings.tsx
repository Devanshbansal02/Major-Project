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

      <div className="settings-body">
        <section className="settings-section">
          <div className="settings-section-header">
            <h2 className="settings-section-title">LLM Provider</h2>
            <p className="settings-section-desc">Configure your language model for AI responses.</p>
          </div>
          <div className="settings-section-content card">
            <ProviderSelector />
          </div>
        </section>

        <section className="settings-section">
          <div className="settings-section-header">
            <h2 className="settings-section-title">Learning Style</h2>
            <p className="settings-section-desc">Personalise how the AI explains topics to you.</p>
          </div>
          <div className="settings-section-content card">
            <LearningStyleEditor />
          </div>
        </section>
      </div>

      <style>{`
        .settings-title {
          font-size: 20px;
          font-weight: 700;
          font-family: var(--font-body);
        }

        .settings-body {
          display: flex;
          flex-direction: column;
          gap: 36px;
        }

        .settings-section {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .settings-section-header {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .settings-section-title {
          font-size: 13.5px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .settings-section-desc {
          font-size: 12.5px;
          color: var(--text-muted);
        }

        .settings-section-content.card {
          padding: 22px 24px;
        }
      `}</style>
    </div>
  );
}
