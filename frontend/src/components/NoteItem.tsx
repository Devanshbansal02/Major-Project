import type { Note } from "../types";

interface Props {
  note: Note;
}

export default function NoteItem({ note }: Props) {
  return (
    <div className="note-item">
      <span className="note-name">{note.notesname}</span>
      <a
        href={note.link}
        target="_blank"
        rel="noopener noreferrer"
        className="note-link-btn"
        onClick={(e) => e.stopPropagation()}
        title="Open PDF"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
        Open PDF
      </a>
      <style>{`
        .note-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 18px;
          background: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
          border-radius: var(--r-md);
          gap: 16px;
          transition: border-color 200ms var(--ease-out), transform 180ms var(--ease-out);
        }
        .note-item:hover {
          border-color: var(--border-strong);
        }
        .note-item:active {
          transform: scale(0.98);
        }
        .note-name {
          font-size: 14px;
          color: var(--text-primary);
          font-weight: 500;
          flex: 1;
          min-width: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .note-link-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: var(--r-sm);
          padding: 6px 12px;
          white-space: nowrap;
          transition: all 150ms var(--ease-out);
        }
        .note-link-btn:hover {
          color: var(--text-primary);
          border-color: var(--border-strong);
        }
        .note-link-btn:active {
          transform: scale(0.96);
        }
      `}</style>
    </div>
  );
}
