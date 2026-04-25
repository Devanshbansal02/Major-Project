import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getNotes, triggerIngest, type NoteInfo } from "../api/client";

const FILE_TYPE_LABELS: Record<string, string> = {
  pdf_typed: "PDF",
  pdf_handwritten: "PDF·HW",
  pptx: "PPTX",
  docx: "DOCX",
  image: "IMG",
};



interface SubjectMeta { id: number; name: string; code: string; color: string; }

export default function SubjectView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const subjectId = Number(id);

  const [subject, setSubject] = useState<SubjectMeta | null>(null);
  const [notes, setNotes] = useState<NoteInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectionMode, setSelectionMode] = useState<"all" | "last_class" | "custom">(() => {
    return (sessionStorage.getItem(`sv_mode_${id}`) as any) || "last_class";
  });
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => {
    const saved = sessionStorage.getItem(`sv_selected_${id}`);
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  useEffect(() => { sessionStorage.setItem(`sv_mode_${id}`, selectionMode); }, [id, selectionMode]);
  useEffect(() => { sessionStorage.setItem(`sv_selected_${id}`, JSON.stringify(Array.from(selectedIds))); }, [id, selectedIds]);

  const [embedding, setEmbedding] = useState(false);
  const [embedMsg, setEmbedMsg] = useState("");
  const [embedSuccess, setEmbedSuccess] = useState(false);

  async function fetchData() {
    setLoading(true);
    const [notesData, subjectsRes] = await Promise.all([
      getNotes(subjectId),
      fetch("http://localhost:8000/api/notes/subjects").then(r => r.json()),
    ]);
    const s = subjectsRes.find((x: SubjectMeta) => x.id === subjectId) || null;
    setSubject(s);
    setNotes(notesData);
    applyMode(selectionMode, notesData);
    setLoading(false);
  }

  function applyMode(mode: "all" | "last_class" | "custom", noteList: NoteInfo[]) {
    if (mode === "all") {
      setSelectedIds(new Set(noteList.map(n => n.id)));
    } else if (mode === "last_class") {
      if (noteList.length === 0) { setSelectedIds(new Set()); return; }
      const maxDate = noteList.reduce((m, n) => n.class_date > m ? n.class_date : m, noteList[0].class_date);
      setSelectedIds(new Set(noteList.filter(n => n.class_date === maxDate).map(n => n.id)));
    }
  }

  useEffect(() => { fetchData(); }, [subjectId]);

  function handleModeChange(mode: "all" | "last_class" | "custom") {
    setSelectionMode(mode);
    applyMode(mode, notes);
  }

  function toggleNote(noteId: number) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(noteId)) next.delete(noteId); else next.add(noteId);
      return next;
    });
  }

  async function handleEmbed() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) { setEmbedMsg("Select at least one note."); return; }
    setEmbedding(true);
    setEmbedMsg("");
    setEmbedSuccess(false);
    try {
      const r = await triggerIngest(ids, selectionMode);
      setEmbedMsg(`Embedding ${r.count} note${r.count !== 1 ? "s" : ""}…`);
      const deadline = Date.now() + 60_000;
      const poll = async () => {
        const fresh = await getNotes(subjectId);
        setNotes(fresh);
        applyMode(selectionMode, fresh);
        const allDone = ids.every(id => {
          const n = fresh.find(x => x.id === id);
          return n && (n.is_embedded === true || n.is_embedded === 1);
        });
        if (allDone) {
          setEmbedMsg("Embedding complete");
          setEmbedSuccess(true);
          setTimeout(() => { setEmbedMsg(""); setEmbedSuccess(false); }, 2500);
          setEmbedding(false);
        } else if (Date.now() < deadline) {
          setTimeout(poll, 3000);
        } else {
          setEmbedMsg("Taking longer than expected: check backend logs.");
          setEmbedding(false);
        }
      };
      setTimeout(poll, 3000);
    } catch {
      setEmbedMsg("Embedding failed. Check backend logs.");
      setEmbedding(false);
    }
  }

  function formatDate(iso: string) {
    return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  }

  const selectedList = Array.from(selectedIds);
  const embeddedSelected = notes.filter(n => selectedIds.has(n.id) && n.is_embedded).length;

  if (!loading && !subject) return <div className="page"><p style={{ color: "var(--text-muted)" }}>Subject not found.</p></div>;

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate("/student")}>← Back</button>
        {subject && (
          <div className="sv-header-info">
            <h1 className="sv-title">{subject?.name ?? "Loading…"}</h1>
          </div>
        )}
      </div>

      {/* Mode selector */}
      <div className="sv-mode-row">
        <span className="section-label">Context</span>
        <div className="sv-mode-pills">
          {(["last_class", "all", "custom"] as const).map(m => (
            <button
              key={m}
              className={`sv-pill ${selectionMode === m ? "active" : ""}`}
              onClick={() => handleModeChange(m)}
            >
              {m === "last_class" ? "Last class" : m === "all" ? "All notes" : "Custom"}
            </button>
          ))}
        </div>
      </div>

      {/* Notes list */}
      <div className="sv-notes-wrap">
        <div className="sv-notes-meta">
          <span className="section-label">
            {loading ? "Loading…" : `${notes.length} file${notes.length !== 1 ? "s" : ""}`}
          </span>
          {!loading && selectedIds.size > 0 && (
            <span className="sv-sel-count">{selectedIds.size} selected</span>
          )}
        </div>

        {!loading && notes.length === 0 && (
          <p className="sv-empty">No notes uploaded for this subject yet.</p>
        )}

        <div className="sv-notes-list">
          {notes.map((note, i) => {
            const selected = selectedIds.has(note.id);
            const isCustom = selectionMode === "custom";
            return (
              <div
                key={note.id}
                className={`sv-note-row ${selected ? "selected" : ""}`}
                onClick={() => { if (isCustom) toggleNote(note.id); }}
                style={{
                  cursor: isCustom ? "pointer" : "default",
                  animationDelay: `${i * 35}ms`,
                }}
              >
                {isCustom && (
                  <div className={`sv-checkbox ${selected ? "checked" : ""}`}>
                    {selected && (
                      <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                        <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                )}

                <div className="sv-note-left">
                  <span className="sv-type-badge">
                    {FILE_TYPE_LABELS[note.file_type] ?? note.file_type}
                  </span>
                  <span className="sv-note-name">{note.original_name}</span>
                </div>

                <div className="sv-note-right">
                  <span className="sv-note-date">{formatDate(note.class_date)}</span>
                  <span className={`sv-embed-dot ${note.is_embedded ? "embedded" : ""}`} title={note.is_embedded ? "Indexed" : "Not indexed"} />
                  {selected && selectionMode !== "custom" && (
                    <span className="sv-selected-check">✓</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Embed bar */}
      {notes.length > 0 && (
        <div className="sv-embed-bar">
          <div className="sv-embed-text" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span>{selectedIds.size} selected · {embeddedSelected} indexed</span>
            {embedMsg && (
              <span className={`sv-embed-msg ${embedSuccess ? "success" : "error"}`}>
                {embedSuccess ? "✓ " : ""}{embedMsg}
              </span>
            )}
          </div>
          <button
            className="sv-embed-btn"
            onClick={handleEmbed}
            disabled={embedding || selectedIds.size === 0}
          >
            {embedding ? (
              <span className="sv-embed-spinner" />
            ) : null}
            {embedding ? "Embedding…" : "Build Index"}
          </button>
        </div>
      )}

      {/* Action buttons */}
      <div className="sv-actions">
        <button
          className="sv-action-btn"
          data-type="doubt"
          onClick={() => navigate(`/subject/${subjectId}/chat?mode=doubt`, { state: { noteIds: selectedList } })}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          Ask a Doubt
        </button>
        <button
          className="sv-action-btn"
          data-type="explain"
          onClick={() => navigate(`/subject/${subjectId}/chat?mode=explain`, { state: { noteIds: selectedList } })}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
          Explain Again
        </button>
        <button
          className="sv-action-btn"
          data-type="trivia"
          onClick={() => navigate(`/subject/${subjectId}/trivia`, { state: { noteIds: selectedList } })}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
          Take Trivia
        </button>
      </div>

      <style>{`
        .sv-header-info { display: flex; align-items: baseline; gap: 12px; min-width: 0; }
        .sv-code { font-family: var(--font-mono); font-size: 11px; font-weight: 700; letter-spacing: 0.10em; text-transform: uppercase; flex-shrink: 0; }
        .sv-title { font-size: 20px; font-weight: 700; line-height: 1.2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        .sv-mode-row { display: flex; align-items: center; gap: 14px; margin-bottom: 24px; }
        .sv-mode-pills { display: flex; gap: 6px; }
        .sv-pill {
          padding: 5px 14px;
          border-radius: 99px;
          border: 1px solid var(--border);
          background: transparent;
          font-size: 12.5px;
          font-weight: 500;
          color: var(--text-muted);
          font-family: var(--font-body);
          transition: color 140ms, border-color 140ms, background 140ms, transform 100ms;
        }
        .sv-pill:hover { color: var(--text-secondary); border-color: var(--border-strong); }
        .sv-pill:active { transform: scale(0.96); }
        .sv-pill.active { background: var(--accent); border-color: var(--accent); color: #fff; font-weight: 600; }

        .sv-notes-wrap { margin-bottom: 16px; }
        .sv-notes-meta { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
        .sv-sel-count { font-size: 11.5px; color: var(--accent); font-family: var(--font-mono); font-weight: 600; }
        .sv-empty { color: var(--text-muted); font-size: 14px; margin-top: 8px; }
        .sv-notes-list { display: flex; flex-direction: column; gap: 4px; }

        .sv-note-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 14px;
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: var(--r-sm);
          transition: background 200ms var(--ease-out), border-color 200ms var(--ease-out), transform 150ms var(--ease-out);
          animation: fadeUp 240ms var(--ease-out) both;
        }
        .sv-note-row:hover { background: var(--bg-elevated); }
        .sv-note-row:active { transform: scale(0.98); }
        .sv-note-row.selected {
          border-color: var(--text-primary);
          background: var(--bg-hover);
        }

        /* Custom checkbox */
        .sv-checkbox {
          width: 16px; height: 16px;
          border-radius: 4px;
          border: 1.5px solid var(--border);
          flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          transition: background 140ms, border-color 140ms;
        }
        .sv-checkbox.checked { background: var(--accent); border-color: var(--accent); }

        .sv-note-left { display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1; }
        .sv-type-badge { font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; padding: 2px 6px; border: 1px solid var(--border-strong); color: var(--text-primary); font-family: var(--font-mono); flex-shrink: 0; }
        .sv-note-name { font-size: 14px; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        .sv-note-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
        .sv-note-date { font-size: 11px; color: var(--text-muted); font-family: var(--font-mono); white-space: nowrap; }

        .sv-embed-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--border); flex-shrink: 0; }
        .sv-embed-dot.embedded { background: var(--success); }
        .sv-selected-check { font-size: 11px; color: var(--accent); font-weight: 700; }

        /* Embed bar */
        .sv-embed-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: var(--r-sm);
          padding: 10px 14px;
          margin-bottom: 20px;
        }
        .sv-embed-msg { font-size: 12px; color: var(--text-muted); font-family: var(--font-mono); }
        .sv-embed-msg.success { color: var(--success); }
        .sv-embed-msg.error   { color: var(--danger); }
        .sv-embed-btn {
          display: flex; align-items: center; gap: 7px;
          padding: 7px 16px;
          border-radius: var(--r-sm);
          border: 1px solid var(--border);
          background: var(--bg-elevated);
          color: var(--text-secondary);
          font-size: 12.5px; font-weight: 600;
          font-family: var(--font-body);
          transition: background 150ms var(--ease-out), color 150ms var(--ease-out), border-color 150ms var(--ease-out), transform 100ms;
          white-space: nowrap;
        }
        .sv-embed-btn:not(:disabled):hover { background: var(--accent); border-color: var(--accent); color: #fff; }
        .sv-embed-btn:not(:disabled):active { transform: scale(0.97); }
        .sv-embed-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .sv-embed-spinner { width: 13px; height: 13px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; }

        /* Action buttons */
        .sv-actions { display: flex; gap: 10px; position: sticky; bottom: 32px; }
        .sv-action-btn {
          flex: 1;
          display: flex; align-items: center; justify-content: center; gap: 7px;
          padding: 14px;
          border-radius: var(--r-md);
          font-size: 13.5px; font-weight: 600;
          font-family: var(--font-body);
          border: 1px solid transparent;
          transition: background 150ms var(--ease-out), transform 120ms var(--ease-out), border-color 150ms;
          backdrop-filter: blur(8px);
        }
        .sv-action-btn:active { transform: scale(0.97); }

        .sv-action-btn[data-type="doubt"],
        .sv-action-btn[data-type="explain"],
        .sv-action-btn[data-type="trivia"] {
          background: var(--bg-elevated);
          border-color: var(--border-strong);
          color: var(--text-primary);
        }
        .sv-action-btn[data-type="doubt"]:hover,
        .sv-action-btn[data-type="explain"]:hover,
        .sv-action-btn[data-type="trivia"]:hover {
          background: var(--bg-hover);
          border-color: var(--text-primary);
        }
      `}</style>
    </div>
  );
}
