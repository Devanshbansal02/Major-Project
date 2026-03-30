import { useNavigate } from "react-router-dom";
import type { Subject } from "../types";

interface Props {
  subject: Subject;
}

export default function SubjectCard({ subject }: Props) {
  const navigate = useNavigate();

  return (
    <div
      className="subject-card"
      onClick={() => navigate(`/subject/${subject.id}`)}
      style={{ "--accent-color": subject.color } as React.CSSProperties}
    >
      <div className="subject-card-accent" />
      <div className="subject-card-body">
        <span className="subject-code">{subject.code}</span>
        <h2 className="subject-name">{subject.name}</h2>
        <span className="subject-note-count">
          {subject.noteCount > 0 ? `${subject.noteCount} notes` : "—"}
        </span>
      </div>
      <style>{`
        .subject-card {
          position: relative;
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          overflow: hidden;
          cursor: pointer;
          transition: transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease;
        }
        .subject-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 28px rgba(0,0,0,0.5);
          border-color: var(--accent-color);
        }
        .subject-card-accent {
          height: 4px;
          background: var(--accent-color);
          width: 100%;
        }
        .subject-card-body {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .subject-code {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--accent-color);
          background: color-mix(in srgb, var(--accent-color) 12%, transparent);
          padding: 3px 8px;
          border-radius: 4px;
          width: fit-content;
        }
        .subject-name {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
          line-height: 1.3;
        }
        .subject-note-count {
          font-size: 12px;
          color: var(--text-muted);
          margin-top: 4px;
        }
      `}</style>
    </div>
  );
}
