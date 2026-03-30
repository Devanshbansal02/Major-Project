import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import NoteItem from "../components/NoteItem";
import { SUBJECTS } from "../constants/subjects";
import { getNotes } from "../api/client";
import type { Note } from "../types";

export default function SubjectView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const subjectId = Number(id);

  const subject = SUBJECTS.find((s) => s.id === subjectId);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getNotes(subjectId)
      .then(setNotes)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [subjectId]);

  if (!subject) return <div className="page"><p>Subject not found.</p></div>;

  return (
    <div className="page">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate("/")}>
          ← Back
        </button>
        <div className="sv-subject-badge" style={{ background: `color-mix(in srgb, ${subject.color} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${subject.color} 30%, transparent)`, color: subject.color }}>
          {subject.code}
        </div>
        <h1 className="sv-title">{subject.name}</h1>
      </div>

      <div className="sv-notes-section">
        <div className="sv-section-label">
          {loading ? "Loading notes…" : `${notes.length} note${notes.length !== 1 ? "s" : ""}`}
        </div>
        {!loading && notes.length === 0 && (
          <p className="sv-empty">No notes available for this subject yet.</p>
        )}
        <div className="sv-notes-list">
          {notes.map((note) => (
            <NoteItem key={note.notes_id} note={note} />
          ))}
        </div>
      </div>

      <div className="sv-actions">
        <button
          className="sv-action-btn doubt"
          onClick={() => navigate(`/subject/${subjectId}/chat?mode=doubt`)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          Ask a Doubt
        </button>
        <button
          className="sv-action-btn explain"
          onClick={() => navigate(`/subject/${subjectId}/chat?mode=explain`)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
          Explain Again
        </button>
        <button
          className="sv-action-btn trivia"
          onClick={() => navigate(`/subject/${subjectId}/trivia`)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          Take Trivia
        </button>
      </div>

      <style>{`
        .sv-subject-badge {
          padding: 4px 10px;
          border-radius: var(--radius-sm);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .sv-title { font-size: 22px; font-weight: 700; }
        .sv-notes-section { margin-bottom: 36px; }
        .sv-section-label { font-size: 12px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 14px; }
        .sv-empty { color: var(--text-muted); font-size: 14px; }
        .sv-notes-list { display: flex; flex-direction: column; gap: 8px; }
        .sv-actions { display: flex; gap: 12px; position: sticky; bottom: 32px; }
        .sv-action-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 16px;
          border-radius: var(--radius-md);
          font-size: 14px;
          font-weight: 600;
          border: 1px solid transparent;
          transition: all 150ms ease;
        }
        .sv-action-btn.doubt { background: color-mix(in srgb, #6366f1 15%, var(--bg-elevated)); border-color: color-mix(in srgb, #6366f1 30%, transparent); color: #818cf8; }
        .sv-action-btn.doubt:hover { background: color-mix(in srgb, #6366f1 25%, var(--bg-elevated)); transform: translateY(-2px); }
        .sv-action-btn.explain { background: color-mix(in srgb, #0ea5e9 15%, var(--bg-elevated)); border-color: color-mix(in srgb, #0ea5e9 30%, transparent); color: #38bdf8; }
        .sv-action-btn.explain:hover { background: color-mix(in srgb, #0ea5e9 25%, var(--bg-elevated)); transform: translateY(-2px); }
        .sv-action-btn.trivia { background: color-mix(in srgb, #10b981 15%, var(--bg-elevated)); border-color: color-mix(in srgb, #10b981 30%, transparent); color: #34d399; }
        .sv-action-btn.trivia:hover { background: color-mix(in srgb, #10b981 25%, var(--bg-elevated)); transform: translateY(-2px); }
      `}</style>
    </div>
  );
}
