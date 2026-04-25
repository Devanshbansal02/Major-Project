import { useNavigate } from "react-router-dom";
import type { Subject } from "../types";

interface Props {
  subject: Subject;
  index?: number;
}

export default function SubjectCard({ subject, index = 0 }: Props) {
  const navigate = useNavigate();

  return (
    <>
      <div
        className="subject-card"
        onClick={() => navigate(`/subject/${subject.id}`)}
        style={{
          "--accent-color": "var(--accent)",
          animationDelay: `${index * 55}ms`,
        } as React.CSSProperties}
      >
        {/* Left accent bar */}
        <div className="sc-bar" />

        <div className="sc-body">
          <h2 className="sc-name">{subject.name}</h2>
          <div className="sc-footer">
            <span className="sc-count">
              {subject.noteCount > 0 ? `${subject.noteCount} notes` : "No notes yet"}
            </span>
            <span className="sc-arrow">→</span>
          </div>
        </div>
      </div>

      <style>{`
        .subject-card {
          position: relative;
          display: flex;
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          cursor: pointer;
          transition: border-color 200ms var(--ease-out), background 200ms var(--ease-out);
          animation: fadeUp 400ms var(--ease-out) both;
          min-height: 130px;
        }

        @media (hover: hover) and (pointer: fine) {
          .subject-card:hover {
            border-color: var(--border);
            background: var(--bg-elevated);
          }
          .subject-card:hover .sc-arrow {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .subject-card:active {
          transform: scale(0.97);
        }

        .sc-bar {
          width: 3px;
          flex-shrink: 0;
          background: var(--accent-color);
          opacity: 0.75;
          transition: opacity 200ms;
        }

        .subject-card:hover .sc-bar {
          opacity: 1;
        }

        .sc-body {
          display: flex;
          flex-direction: column;
          gap: 7px;
          padding: 22px 20px;
          flex: 1;
          min-width: 0;
        }

        .sc-code {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--accent-color);
          font-family: var(--font-mono);
        }

        .sc-name {
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
          line-height: 1.35;
          font-family: var(--font-body);
        }

        .sc-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: auto;
          padding-top: 8px;
        }

        .sc-count {
          font-size: 11.5px;
          color: var(--text-muted);
          font-family: var(--font-body);
        }

        .sc-arrow {
          font-size: 14px;
          color: var(--text-primary);
          opacity: 0;
          transform: translateX(-6px);
          transition: opacity 200ms var(--ease-out), transform 200ms var(--ease-out);
        }
      `}</style>
    </>
  );
}
