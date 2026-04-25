import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuthStore } from "../store/auth";

const BASE_URL = "http://localhost:8000";

interface Note {
  id: number;
  original_name: string;
  file_type: string;
  class_date: string;
  uploaded_at: string;
  is_embedded: boolean | number;
}

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

export default function FacultySubjectNotes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const subjectId = Number(id);

  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [subjectName, setSubjectName] = useState("");

  // Upload form state
  const [file, setFile] = useState<File | null>(null);
  const [classDate, setClassDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [isHandwritten, setIsHandwritten] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function fetchNotes() {
    const r = await fetch(`${BASE_URL}/api/faculty/subjects/${subjectId}/notes`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (r.status === 403) { navigate("/faculty"); return; }
    if (r.ok) setNotes(await r.json());
    setLoading(false);
  }

  async function fetchSubjectName() {
    const r = await fetch(`${BASE_URL}/api/faculty/subjects`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (r.ok) {
      const subjects = await r.json();
      const s = subjects.find((x: { id: number; name: string }) => x.id === subjectId);
      if (s) setSubjectName(s.name);
    }
  }

  useEffect(() => {
    fetchSubjectName();
    fetchNotes();
  }, [subjectId]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { setUploadError("Please select a file"); return; }
    setUploadError("");
    setUploading(true);
    setUploadProgress("Uploading…");

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("class_date", classDate);
      fd.append("is_handwritten", String(isHandwritten));

      const r = await fetch(`${BASE_URL}/api/faculty/subjects/${subjectId}/notes`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      if (!r.ok) {
        const d = await r.json();
        throw new Error(d.detail || "Upload failed");
      }

      setUploadProgress("Upload complete ✓");
      setFile(null);
      setIsHandwritten(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await fetchNotes();
      setTimeout(() => setUploadProgress(null), 2000);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
      setUploadProgress(null);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(noteId: number) {
    if (!confirm("Delete this note?")) return;
    await fetch(`${BASE_URL}/api/faculty/subjects/${subjectId}/notes/${noteId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    await fetchNotes();
  }

  function formatDate(iso: string) {
    return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }

  return (
    <div className="page">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate("/faculty")}>← Back</button>
        <div>
          <p className="fsn-subject-label">Subject Notes</p>
          <h1 className="fsn-title">{subjectName || `Subject ${subjectId}`}</h1>
        </div>
      </div>

      {/* Upload form */}
      <div className="fsn-upload-card">
        <h2 className="fsn-upload-title">Upload Note</h2>
        <form onSubmit={handleUpload} className="fsn-upload-form">
          <div className="fsn-field-row">
            <div className="fsn-field">
              <label className="fsn-label">File</label>
              <input
                ref={fileInputRef}
                type="file"
                className="fsn-file-input"
                accept=".pdf,.pptx,.docx,.png,.jpg,.jpeg,.webp"
                onChange={e => setFile(e.target.files?.[0] ?? null)}
                required
              />
              <p className="fsn-file-hint">PDF, PPTX, DOCX, PNG, JPG, WEBP — max 100 MB</p>
            </div>

            <div className="fsn-field">
              <label className="fsn-label">Class Date</label>
              <input
                type="date"
                className="fsn-date-input"
                value={classDate}
                onChange={e => setClassDate(e.target.value)}
                required
              />
            </div>
          </div>

          <label className="fsn-check-label">
            <input
              type="checkbox"
              checked={isHandwritten}
              onChange={e => setIsHandwritten(e.target.checked)}
            />
            <span>This PDF contains handwritten content (use OCR)</span>
          </label>

          {uploadError && <p className="fsn-upload-error">{uploadError}</p>}
          {uploadProgress && <p className="fsn-upload-progress">{uploadProgress}</p>}

          <button className="fsn-upload-btn" type="submit" disabled={uploading}>
            {uploading ? "Uploading…" : "Upload Note"}
          </button>
        </form>
      </div>

      {/* Notes list */}
      <div className="fsn-section-label">
        {loading ? "Loading…" : `${notes.length} note${notes.length !== 1 ? "s" : ""}`}
      </div>

      {!loading && notes.length === 0 && (
        <p className="fsn-empty">No notes uploaded yet.</p>
      )}

      <div className="fsn-list">
        {notes.map(note => (
          <div key={note.id} className="fsn-note-row">
            <div className="fsn-note-meta">
              <span
                className="fsn-type-badge"
                style={{ background: `${FILE_TYPE_COLORS[note.file_type]}22`, color: FILE_TYPE_COLORS[note.file_type], border: `1px solid ${FILE_TYPE_COLORS[note.file_type]}44` }}
              >
                {FILE_TYPE_LABELS[note.file_type] ?? note.file_type}
              </span>
              <span className="fsn-date">{formatDate(note.class_date)}</span>
              {note.is_embedded ? (
                <span className="fsn-embedded">✓ Embedded</span>
              ) : (
                <span className="fsn-not-embedded">Not embedded</span>
              )}
            </div>
            <span className="fsn-note-name" title={note.original_name}>{note.original_name}</span>
            <button className="fsn-delete" onClick={() => handleDelete(note.id)} title="Delete">✕</button>
          </div>
        ))}
      </div>

      <style>{`
        .fsn-subject-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; }
        .fsn-title { font-size: 20px; font-weight: 700; }
        .fsn-upload-card { background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 24px; margin-bottom: 28px; }
        .fsn-upload-title { font-size: 15px; font-weight: 600; margin-bottom: 16px; }
        .fsn-upload-form { display: flex; flex-direction: column; gap: 14px; }
        .fsn-field-row { display: flex; gap: 16px; flex-wrap: wrap; }
        .fsn-field { display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 200px; }
        .fsn-label { font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; }
        .fsn-file-input { font-size: 13px; color: var(--text-secondary); }
        .fsn-file-hint { font-size: 11px; color: var(--text-muted); }
        .fsn-date-input { background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 8px 12px; font-size: 13px; color: var(--text-primary); outline: none; transition: border-color 150ms; }
        .fsn-date-input:focus { border-color: var(--accent); }
        .fsn-check-label { display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--text-secondary); cursor: pointer; }
        .fsn-upload-error { font-size: 13px; color: #f87171; }
        .fsn-upload-progress { font-size: 13px; color: #34d399; }
        .fsn-upload-btn { background: var(--accent); color: #fff; border: none; border-radius: var(--radius-md); padding: 10px 20px; font-size: 13px; font-weight: 600; cursor: pointer; align-self: flex-start; transition: opacity 150ms; }
        .fsn-upload-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .fsn-section-label { font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 12px; }
        .fsn-empty { color: var(--text-muted); font-size: 14px; }
        .fsn-list { display: flex; flex-direction: column; gap: 8px; }
        .fsn-note-row { background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 14px 18px; display: flex; align-items: center; gap: 14px; transition: border-color 150ms; }
        .fsn-note-row:hover { border-color: var(--border); }
        .fsn-note-meta { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        .fsn-type-badge { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; padding: 3px 7px; border-radius: 4px; }
        .fsn-date { font-size: 12px; color: var(--text-muted); }
        .fsn-embedded { font-size: 11px; color: #34d399; }
        .fsn-not-embedded { font-size: 11px; color: var(--text-muted); }
        .fsn-note-name { font-size: 13px; color: var(--text-primary); flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .fsn-delete { background: none; border: none; cursor: pointer; color: var(--text-muted); font-size: 14px; padding: 4px 8px; border-radius: var(--radius-sm); transition: color 150ms; flex-shrink: 0; }
        .fsn-delete:hover { color: #f87171; }
      `}</style>
    </div>
  );
}
