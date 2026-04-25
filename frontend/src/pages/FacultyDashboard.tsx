import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/auth";

const BASE_URL = "http://localhost:8000";
const PALETTE = ["#6366f1","#0ea5e9","#10b981","#f59e0b","#ef4444","#a855f7","#ec4899","#14b8a6"];

interface Subject { id: number; name: string; code: string; color: string; }

function authHeaders(token: string) {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

export default function FacultyDashboard() {
  const navigate = useNavigate();
  const { token, facultyName, logout } = useAuthStore();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", color: PALETTE[0] });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  async function fetchSubjects() {
    if (!token) return;
    const r = await fetch(`${BASE_URL}/api/faculty/subjects`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (r.ok) setSubjects(await r.json());
    setLoading(false);
  }

  useEffect(() => { fetchSubjects(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!form.name.trim() || !form.code.trim()) { setFormError("Name and code are required"); return; }
    setSaving(true);
    try {
      const r = await fetch(`${BASE_URL}/api/faculty/subjects`, {
        method: "POST",
        headers: authHeaders(token!),
        body: JSON.stringify(form),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.detail); }
      setForm({ name: "", code: "", color: PALETTE[0] });
      setShowForm(false);
      await fetchSubjects();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this subject and all its notes?")) return;
    await fetch(`${BASE_URL}/api/faculty/subjects/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token!}` },
    });
    await fetchSubjects();
  }

  async function handleLogout() {
    await fetch(`${BASE_URL}/api/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token!}` },
    });
    logout();
    navigate("/faculty/login");
  }

  return (
    <div className="page">
      <div className="fd-header">
        <div>
          <p className="fd-welcome">Faculty Portal</p>
          <h1 className="fd-name">{facultyName}</h1>
        </div>
        <div className="fd-header-actions">
          <button className="fd-student-btn" onClick={() => navigate("/")}>Student View</button>
          <button className="fd-logout" onClick={handleLogout}>Sign Out</button>
        </div>
      </div>

      <div className="fd-section-header">
        <span className="fd-section-label">{loading ? "Loading…" : `${subjects.length} subject${subjects.length !== 1 ? "s" : ""}`}</span>
        <button className="fd-add-btn" onClick={() => setShowForm(!showForm)}>
          {showForm ? "✕ Cancel" : "+ New Subject"}
        </button>
      </div>

      {showForm && (
        <form className="fd-form" onSubmit={handleCreate}>
          <input className="fd-input" placeholder="Subject name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          <input className="fd-input fd-input-sm" placeholder="Code (e.g. DBMS)" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} required />
          <div className="fd-colors">
            {PALETTE.map(c => (
              <button key={c} type="button" className={`fd-color-swatch ${form.color === c ? "active" : ""}`}
                style={{ background: c }} onClick={() => setForm(f => ({ ...f, color: c }))} />
            ))}
          </div>
          {formError && <p className="fd-form-error">{formError}</p>}
          <button className="fd-submit" type="submit" disabled={saving}>{saving ? "Saving…" : "Create Subject"}</button>
        </form>
      )}

      {!loading && subjects.length === 0 && !showForm && (
        <p className="fd-empty">No subjects yet. Click "+ New Subject" to add one.</p>
      )}

      <div className="fd-grid">
        {subjects.map(s => (
          <div key={s.id} className="fd-subject-card" style={{ borderTopColor: s.color }}>
            <div className="fd-card-top">
              <span className="fd-code" style={{ color: s.color }}>{s.code}</span>
              <button className="fd-delete" onClick={() => handleDelete(s.id)} title="Delete subject">✕</button>
            </div>
            <p className="fd-subject-name">{s.name}</p>
            <button className="fd-manage" onClick={() => navigate(`/faculty/subjects/${s.id}`)}>
              Manage Notes →
            </button>
          </div>
        ))}
      </div>

      <style>{`
        .fd-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 32px; }
        .fd-welcome { font-size: 12px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4px; }
        .fd-name { font-size: 24px; font-weight: 700; }
        .fd-header-actions { display: flex; gap: 10px; align-items: center; }
        .fd-student-btn { background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 8px 14px; font-size: 13px; cursor: pointer; color: var(--text-secondary); transition: all 150ms; }
        .fd-student-btn:hover { border-color: var(--accent); color: var(--accent); }
        .fd-logout { background: none; border: 1px solid var(--border); border-radius: var(--radius-md); padding: 8px 14px; font-size: 13px; cursor: pointer; color: var(--text-muted); transition: all 150ms; }
        .fd-logout:hover { border-color: #f87171; color: #f87171; }
        .fd-section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .fd-section-label { font-size: 12px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; }
        .fd-add-btn { background: var(--accent); color: #fff; border: none; border-radius: var(--radius-md); padding: 8px 16px; font-size: 13px; font-weight: 600; cursor: pointer; transition: opacity 150ms; }
        .fd-add-btn:hover { opacity: 0.85; }
        .fd-form { background: var(--bg-elevated); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 20px; margin-bottom: 24px; display: flex; flex-direction: column; gap: 12px; }
        .fd-input { background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 10px 14px; font-size: 14px; color: var(--text-primary); outline: none; transition: border-color 150ms; }
        .fd-input:focus { border-color: var(--accent); }
        .fd-input-sm { max-width: 200px; }
        .fd-colors { display: flex; gap: 8px; flex-wrap: wrap; }
        .fd-color-swatch { width: 24px; height: 24px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; transition: transform 150ms; }
        .fd-color-swatch.active { border-color: #fff; transform: scale(1.2); }
        .fd-form-error { font-size: 13px; color: #f87171; }
        .fd-submit { background: var(--accent); color: #fff; border: none; border-radius: var(--radius-md); padding: 10px 20px; font-size: 13px; font-weight: 600; cursor: pointer; align-self: flex-start; }
        .fd-empty { color: var(--text-muted); font-size: 14px; }
        .fd-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }
        .fd-subject-card { background: var(--bg-surface); border: 1px solid var(--border-subtle); border-top: 3px solid; border-radius: var(--radius-md); padding: 20px; display: flex; flex-direction: column; gap: 10px; transition: border-color 150ms; }
        .fd-subject-card:hover { border-color: var(--border); }
        .fd-card-top { display: flex; justify-content: space-between; align-items: center; }
        .fd-code { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; }
        .fd-delete { background: none; border: none; cursor: pointer; color: var(--text-muted); font-size: 14px; padding: 2px 6px; border-radius: var(--radius-sm); transition: color 150ms; }
        .fd-delete:hover { color: #f87171; }
        .fd-subject-name { font-size: 15px; font-weight: 600; flex: 1; }
        .fd-manage { background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 8px 14px; font-size: 13px; font-weight: 500; cursor: pointer; color: var(--text-secondary); transition: all 150ms; }
        .fd-manage:hover { border-color: var(--accent); color: var(--accent); }
      `}</style>
    </div>
  );
}
