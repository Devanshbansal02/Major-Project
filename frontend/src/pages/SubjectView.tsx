import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getNotes, triggerIngest, type NoteInfo } from "../api/client";

const FILE_TYPE_LABELS: Record<string, string> = {
  pdf_typed: "PDF",
  pdf_handwritten: "PDF (HW)",
  pptx: "PPTX",
  docx: "DOCX",
  image: "Image",
};
const FILE_TYPE_COLORS: Record<string, string> = {
  pdf_typed: "#ef4444",
  pdf_handwritten: "#f59e0b",
  pptx: "#f97316",
  docx: "#3b82f6",
  image: "#10b981",
};

interface SubjectMeta { id: number; name: string; code: string; color: string; }

export default function SubjectView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const subjectId = Number(id);

  const [subject, setSubject] = useState<SubjectMeta | null>(null);
  const [notes, setNotes] = useState<NoteInfo[]>([]);
  const [loading, setLoading] = useState(true);

  // Selection state
  const [selectionMode, setSelectionMode] = useState<"all" | "last_class" | "custom">(() => {
    return (sessionStorage.getItem(`sv_mode_${id}`) as any) || "last_class";
  });
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => {
    const saved = sessionStorage.getItem(`sv_selected_${id}`);
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  useEffect(() => {
    sessionStorage.setItem(`sv_mode_${id}`, selectionMode);
  }, [id, selectionMode]);

  useEffect(() => {
    sessionStorage.setItem(`sv_selected_${id}`, JSON.stringify(Array.from(selectedIds)));
  }, [id, selectedIds]);

  // Embed state
  const [embedding, setEmbedding] = useState(false);
  const [embedMsg, setEmbedMsg] = useState("");

  async function fetchData() {
    setLoading(true);
    // Fetch subject info from subjects list
    const [notesData, subjectsRes] = await Promise.all([
      getNotes(subjectId),
      fetch("http://localhost:8000/api/notes/subjects").then(r => r.json()),
    ]);
    const s = subjectsRes.find((x: SubjectMeta) => x.id === subjectId) || null;
    setSubject(s);
    setNotes(notesData);
    // Apply auto-selection
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
    // custom — don't change
  }

  useEffect(() => { fetchData(); }, [subjectId]);

  function handleModeChange(mode: "all" | "last_class" | "custom") {
    setSelectionMode(mode);
    applyMode(mode, notes);
  }

  function toggleNote(id: number) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleEmbed() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) { setEmbedMsg("Select at least one note"); return; }
    setEmbedding(true);
    setEmbedMsg("");
    try {
      const r = await triggerIngest(ids, selectionMode);
      setEmbedMsg(`Embedding ${r.count} note${r.count !== 1 ? "s" : ""}…`);

      // Poll every 3 s until all selected notes are embedded or 60 s elapses.
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
          setEmbedMsg("✓ Embedding complete");
          setTimeout(() => setEmbedMsg(""), 2000);
          setEmbedding(false);
        } else if (Date.now() < deadline) {
          setTimeout(poll, 3000);
        } else {
          setEmbedMsg("Embedding is taking longer than expected — check backend logs.");
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
    return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }

  const selectedList = Array.from(selectedIds);
  const embeddedSelected = notes.filter(n => selectedIds.has(n.id) && n.is_embedded).length;

  if (!loading && !subject) return <div className="page"><p>Subject not found.</p></div>;

  return (
    <div className="page">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate("/student")}>← Back</button>
        {subject && (
          <div className="sv-subject-badge" style={{
            background: `color-mix(in srgb, ${subject.color} 12%, transparent)`,
            border: `1px solid color-mix(in srgb, ${subject.color} 30%, transparent)`,
            color: subject.color,
          }}>
            {subject.code}
          </div>
        )}
        <h1 className="sv-title">{subject?.name ?? "Loading…"}</h1>
      </div>

      {/* Selection mode */}
      <div className="sv-mode-bar">
        <span className="sv-mode-label">Select:</span>
        {(["last_class", "all", "custom"] as const).map(m => (
          <button
            key={m}
            className={`sv-mode-btn ${selectionMode === m ? "active" : ""}`}
            onClick={() => handleModeChange(m)}
          >
            {m === "last_class" ? "Last Class" : m === "all" ? "All Notes" : "Custom"}
          </button>
        ))}
      </div>

      {/* Notes list */}
      <div className="sv-notes-section">
        <div className="sv-section-label">
          {loading ? "Loading notes…" : `${notes.length} note${notes.length !== 1 ? "s" : ""} · ${selectedIds.size} selected`}
        </div>

        {!loading && notes.length === 0 && (
          <p className="sv-empty">No notes uploaded for this subject yet.</p>
        )}

        <div className="sv-notes-list">
          {notes.map(note => {
            const selected = selectedIds.has(note.id);
            return (
              <div
                key={note.id}
                className={`sv-note-row ${selected ? "selected" : ""}`}
                onClick={() => { if (selectionMode === "custom") toggleNote(note.id); }}
                style={{ cursor: selectionMode === "custom" ? "pointer" : "default" }}
              >
                {selectionMode === "custom" && (
                  <input type="checkbox" checked={selected} onChange={() => toggleNote(note.id)} onClick={e => e.stopPropagation()} className="sv-check" />
                )}
                <div className="sv-note-meta">
                  <span className="sv-type-badge" style={{ background: `${FILE_TYPE_COLORS[note.file_type]}22`, color: FILE_TYPE_COLORS[note.file_type], border: `1px solid ${FILE_TYPE_COLORS[note.file_type]}44` }}>
                    {FILE_TYPE_LABELS[note.file_type] ?? note.file_type}
                  </span>
                  <span className="sv-note-date">{formatDate(note.class_date)}</span>
                  {note.is_embedded ? <span className="sv-embedded">✓</span> : <span className="sv-not-embedded">○</span>}
                </div>
                <span className="sv-note-name">{note.original_name}</span>
                {selected && selectionMode !== "custom" && <span className="sv-sel-indicator">✓</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Embed + Actions */}
      {notes.length > 0 && (
        <div className="sv-embed-bar">
          <div className="sv-embed-info">
            <span>{selectedIds.size} selected · {embeddedSelected} already embedded</span>
            {embedMsg && <span className="sv-embed-msg">{embedMsg}</span>}
          </div>
          <button className="sv-embed-btn" onClick={handleEmbed} disabled={embedding || selectedIds.size === 0}>
            {embedding ? "Embedding…" : "Embed Selected"}
          </button>
        </div>
      )}

      <div className="sv-actions">
        <button
          className="sv-action-btn doubt"
          onClick={() => navigate(`/subject/${subjectId}/chat?mode=doubt`, { state: { noteIds: selectedList } })}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          Ask a Doubt
        </button>
        <button
          className="sv-action-btn explain"
          onClick={() => navigate(`/subject/${subjectId}/chat?mode=explain`, { state: { noteIds: selectedList } })}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
          Explain Again
        </button>
        <button
          className="sv-action-btn trivia"
          onClick={() => navigate(`/subject/${subjectId}/trivia`, { state: { noteIds: selectedList } })}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          Take Trivia
        </button>
      </div>

      <style>{`
        .sv-subject-badge { padding: 4px 10px; border-radius: var(--radius-sm); font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
        .sv-title { font-size: 22px; font-weight: 700; }
        .sv-mode-bar { display: flex; align-items: center; gap: 8px; margin-bottom: 20px; }
        .sv-mode-label { font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; }
        .sv-mode-btn { padding: 6px 14px; border-radius: 20px; border: 1px solid var(--border); background: var(--bg-elevated); font-size: 12px; font-weight: 600; cursor: pointer; color: var(--text-secondary); transition: all 150ms; }
        .sv-mode-btn.active { background: var(--accent); border-color: var(--accent); color: #fff; }
        .sv-notes-section { margin-bottom: 20px; }
        .sv-section-label { font-size: 12px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 12px; }
        .sv-empty { color: var(--text-muted); font-size: 14px; }
        .sv-notes-list { display: flex; flex-direction: column; gap: 6px; }
        .sv-note-row { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); transition: all 150ms; }
        .sv-note-row.selected { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 8%, var(--bg-surface)); }
        .sv-check { accent-color: var(--accent); width: 16px; height: 16px; flex-shrink: 0; }
        .sv-note-meta { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        .sv-type-badge { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; padding: 2px 6px; border-radius: 4px; }
        .sv-note-date { font-size: 11px; color: var(--text-muted); white-space: nowrap; }
        .sv-embedded { font-size: 12px; color: #34d399; }
        .sv-not-embedded { font-size: 12px; color: var(--text-muted); }
        .sv-note-name { font-size: 13px; color: var(--text-primary); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .sv-sel-indicator { font-size: 12px; color: var(--accent); flex-shrink: 0; }
        .sv-embed-bar { display: flex; justify-content: space-between; align-items: center; background: var(--bg-elevated); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 12px 16px; margin-bottom: 20px; gap: 12px; }
        .sv-embed-info { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--text-muted); }
        .sv-embed-msg { color: #34d399; font-size: 12px; }
        .sv-embed-btn { background: var(--bg-surface); border: 1px solid var(--accent); border-radius: var(--radius-md); padding: 8px 18px; font-size: 13px; font-weight: 600; color: var(--accent); cursor: pointer; transition: all 150ms; white-space: nowrap; }
        .sv-embed-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .sv-embed-btn:not(:disabled):hover { background: var(--accent); color: #fff; }
        .sv-actions { display: flex; gap: 12px; position: sticky; bottom: 32px; }
        .sv-action-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 16px; border-radius: var(--radius-md); font-size: 14px; font-weight: 600; border: 1px solid transparent; transition: all 150ms ease; }
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
