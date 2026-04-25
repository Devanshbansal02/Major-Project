import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/auth";

const BASE_URL = "http://localhost:8000";

export default function FacultyLogin() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "register") {
        const r = await fetch(`${BASE_URL}/api/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password, name }),
        });
        if (!r.ok) {
          const d = await r.json();
          throw new Error(d.detail || "Registration failed");
        }
      }

      const r = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!r.ok) {
        const d = await r.json();
        throw new Error(d.detail || "Login failed");
      }
      const { token, name: facultyName } = await r.json();
      setAuth(token, facultyName);
      navigate("/faculty");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fl-root">
      <div className="fl-card">
        <div className="fl-logo">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
          Bloom
        </div>
        <h1 className="fl-title">Faculty Portal</h1>
        <p className="fl-sub">{mode === "login" ? "Sign in to manage your subjects and notes." : "Create your faculty account."}</p>

        <form onSubmit={handleSubmit} className="fl-form">
          {mode === "register" && (
            <div className="fl-field">
              <label className="fl-label">Full Name</label>
              <input
                className="fl-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dr. Priya Sharma"
                required
              />
            </div>
          )}
          <div className="fl-field">
            <label className="fl-label">Username</label>
            <input
              className="fl-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="priya.sharma"
              autoComplete="username"
              required
            />
          </div>
          <div className="fl-field">
            <label className="fl-label">Password</label>
            <input
              className="fl-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          {error && <p className="fl-error">{error}</p>}

          <button className="fl-submit" type="submit" disabled={loading}>
            {loading ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <button className="fl-toggle" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>
          {mode === "login" ? "New faculty? Create account" : "Already have an account? Sign in"}
        </button>
      </div>

      <style>{`
        .fl-root {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-base);
          padding: 24px;
        }
        .fl-card {
          width: 100%;
          max-width: 420px;
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: 40px;
        }
        .fl-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 18px;
          font-weight: 700;
          color: var(--accent);
          margin-bottom: 28px;
        }
        .fl-title { font-size: 22px; font-weight: 700; margin-bottom: 6px; }
        .fl-sub { font-size: 13px; color: var(--text-muted); margin-bottom: 28px; }
        .fl-form { display: flex; flex-direction: column; gap: 16px; }
        .fl-field { display: flex; flex-direction: column; gap: 6px; }
        .fl-label { font-size: 12px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.06em; }
        .fl-input {
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          padding: 10px 14px;
          font-size: 14px;
          color: var(--text-primary);
          outline: none;
          transition: border-color 150ms;
        }
        .fl-input:focus { border-color: var(--accent); }
        .fl-error { font-size: 13px; color: #f87171; background: rgba(248,113,113,0.1); border: 1px solid rgba(248,113,113,0.2); padding: 10px 14px; border-radius: var(--radius-sm); }
        .fl-submit {
          background: var(--accent);
          color: #fff;
          border: none;
          border-radius: var(--radius-md);
          padding: 12px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 150ms;
          margin-top: 4px;
        }
        .fl-submit:disabled { opacity: 0.5; cursor: not-allowed; }
        .fl-submit:not(:disabled):hover { opacity: 0.9; }
        .fl-toggle {
          margin-top: 20px;
          width: 100%;
          background: none;
          border: none;
          font-size: 13px;
          color: var(--text-muted);
          cursor: pointer;
          text-decoration: underline;
        }
        .fl-toggle:hover { color: var(--text-secondary); }
      `}</style>
    </div>
  );
}
