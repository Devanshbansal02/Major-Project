import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import SubjectCard from "../components/SubjectCard";
import { SUBJECTS } from "../constants/subjects";
import { getNotes } from "../api/client";
import type { Subject } from "../types";

export default function Dashboard() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<Subject[]>(
    SUBJECTS.map((s) => ({ ...s, noteCount: 0 }))
  );

  useEffect(() => {
    getNotes()
      .then((notes) => {
        setSubjects(
          SUBJECTS.map((s) => ({
            ...s,
            noteCount: notes.filter((n) => n.subjectId === s.id).length,
          }))
        );
      })
      .catch(() => {});
  }, []);

  return (
    <div className="page">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Bloom</h1>
          <p className="dashboard-subtitle">Your AI-powered revision partner</p>
        </div>
        <button className="icon-btn" onClick={() => navigate("/settings")} title="Settings">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>

      <div className="subject-grid">
        {subjects.map((subject) => (
          <SubjectCard key={subject.id} subject={subject} />
        ))}
      </div>

      <style>{`
        .dashboard-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 36px;
        }
        .dashboard-title {
          font-size: 32px;
          font-weight: 700;
          background: linear-gradient(135deg, #e8e8f0, #8888aa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .dashboard-subtitle {
          font-size: 14px;
          color: var(--text-muted);
          margin-top: 4px;
        }
        .icon-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: var(--radius-sm);
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          color: var(--text-secondary);
          transition: all 150ms ease;
        }
        .icon-btn:hover {
          color: var(--text-primary);
          border-color: var(--accent);
        }
        .subject-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
        }
        @media (max-width: 800px) {
          .subject-grid { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>
    </div>
  );
}
