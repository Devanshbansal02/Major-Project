import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import SubjectCard from "../components/SubjectCard";
import { getSubjects, type SubjectInfo } from "../api/client";
import { useSettingsStore } from "../store/settings";
import type { Subject } from "../types";

export default function Dashboard() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);

  const { provider, model, getApiKey } = useSettingsStore();

  useEffect(() => {
    const needsKey = provider !== "ollama";
    const apiKey = getApiKey();
    const configured = !needsKey || (apiKey.trim() !== "" && model.trim() !== "");
    if (!configured) {
      const timer = setTimeout(() => setShowToast(true), 800);
      return () => clearTimeout(timer);
    }
  }, [provider, model, getApiKey]);

  useEffect(() => {
    if (!showToast) return;
    const timer = setTimeout(() => setShowToast(false), 6000);
    return () => clearTimeout(timer);
  }, [showToast]);

  useEffect(() => {
    getSubjects()
      .then((data: SubjectInfo[]) => {
        setSubjects(data.map(s => ({ id: s.id, name: s.name, code: s.code, color: s.color, noteCount: s.note_count })));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page">
      {/* Header */}
      <header className="dash-header">
        <div className="dash-wordmark">
          <span className="dash-wordmark-bloom">Bloom</span>
          <span className="dash-wordmark-dot" />
        </div>

        <div className="dash-header-actions">
          <button
            className="dash-role-btn"
            onClick={() => navigate("/home")}
          >
            Switch role
          </button>
          <button
            className="dash-settings-btn"
            onClick={() => navigate("/settings")}
            title="Settings"
            aria-label="Settings"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Eyebrow */}
      <div className="dash-eyebrow">
        <span className="section-label">Your subjects</span>
        {!loading && subjects.length > 0 && (
          <span className="dash-count">{subjects.length} enrolled</span>
        )}
      </div>

      {/* States */}
      {loading && (
        <div className="dash-loading">
          {[0,1,2,3,4,5].map(i => (
            <div key={i} className="dash-skeleton" style={{ animationDelay: `${i * 80}ms` }} />
          ))}
        </div>
      )}

      {!loading && subjects.length === 0 && (
        <p className="dash-empty">
          No subjects configured yet. Ask your faculty to set up the course.
        </p>
      )}

      {!loading && subjects.length > 0 && (
        <div className="subject-grid">
          {subjects.map((subject, i) => (
            <SubjectCard key={subject.id} subject={subject} index={i} />
          ))}
        </div>
      )}

      {/* Toast */}
      <div className={`toast toast-warning ${showToast ? "toast-visible" : ""}`} role="status">
        <svg className="toast-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span>LLM provider not configured.</span>
        <button
          className="toast-action"
          onClick={() => { setShowToast(false); navigate("/settings"); }}
        >
          Open Settings
        </button>
      </div>

      <style>{`
        .dash-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 48px;
        }

        .dash-wordmark {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .dash-wordmark-bloom {
          font-family: var(--font-display);
          font-size: 28px;
          color: var(--text-primary);
          letter-spacing: -0.02em;
          line-height: 1;
          font-style: italic;
          text-shadow: 0 2px 10px rgba(255,255,255,0.05);
        }

        .dash-wordmark-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--accent);
          margin-bottom: 2px;
          flex-shrink: 0;
        }

        .dash-header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .dash-role-btn {
          padding: 7px 14px;
          border: 1px solid var(--border);
          border-radius: var(--r-sm);
          font-size: 13px;
          font-weight: 500;
          color: var(--text-muted);
          font-family: var(--font-body);
          transition: color 150ms var(--ease-out), border-color 150ms var(--ease-out), transform 120ms var(--ease-out), filter 150ms;
        }

        .dash-role-btn:hover {
          color: var(--text-primary);
          border-color: var(--border-strong);
        }

        .dash-role-btn:active { transform: scale(0.97); }

        .dash-settings-btn {
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--border);
          border-radius: var(--r-sm);
          color: var(--text-muted);
          transition: color 150ms var(--ease-out), border-color 150ms var(--ease-out), transform 120ms var(--ease-out);
        }

        .dash-settings-btn:hover {
          color: var(--text-primary);
          border-color: var(--border-strong);
        }

        .dash-settings-btn:active { transform: scale(0.95); }

        .dash-eyebrow {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .dash-count {
          font-size: 11px;
          color: var(--text-muted);
          font-family: var(--font-mono);
        }

        .subject-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        @media (max-width: 820px) {
          .subject-grid { grid-template-columns: repeat(2, 1fr); }
        }

        @media (max-width: 520px) {
          .subject-grid { grid-template-columns: 1fr; }
          .page { padding: 28px 20px; }
        }

        /* Loading skeletons */
        .dash-loading {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        .dash-skeleton {
          height: 130px;
          border-radius: var(--r-md);
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          animation: skeletonPulse 1.6s ease-in-out infinite both;
        }

        @keyframes skeletonPulse {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 0.7; }
        }

        .dash-empty {
          color: var(--text-muted);
          font-size: 14px;
          margin-top: 8px;
        }

        /* Toast handled by global .toast system in index.css */
      `}</style>
    </div>
  );
}
