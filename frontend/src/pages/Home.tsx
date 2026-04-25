import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="home-page">
      <div className="home-header">
        <span className="home-bloom">Bloom</span>
        <span className="home-dot" />
      </div>

      <div className="home-body">
        <p className="home-tagline">Choose your role to get started</p>

        <div className="home-cards">
          <div className="home-card" onClick={() => navigate("/student")}>
            <div className="home-card-icon student-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
              </svg>
            </div>
            <div className="home-card-text">
              <h2 className="home-card-title">Student</h2>
              <p className="home-card-desc">Access subjects, ask doubts, and generate quizzes from your notes.</p>
            </div>
            <span className="home-card-arrow">→</span>
          </div>

          <div className="home-card" onClick={() => navigate("/faculty")}>
            <div className="home-card-icon faculty-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
            </div>
            <div className="home-card-text">
              <h2 className="home-card-title">Faculty</h2>
              <p className="home-card-desc">Manage subjects and upload class notes, slides, and handwritten PDFs.</p>
            </div>
            <span className="home-card-arrow">→</span>
          </div>
        </div>
      </div>

      <style>{`
        .home-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 24px;
          gap: 52px;
        }

        .home-header {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .home-bloom {
          font-family: var(--font-display);
          font-size: 32px;
          color: var(--text-primary);
          letter-spacing: -0.02em;
          line-height: 1;
        }

        .home-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--accent);
          margin-bottom: 2px;
        }

        .home-body {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 28px;
        }

        .home-tagline {
          font-size: 14px;
          color: var(--text-muted);
          text-align: center;
        }

        .home-cards {
          display: flex;
          gap: 14px;
          flex-wrap: wrap;
          justify-content: center;
        }

        .home-card {
          display: flex;
          align-items: center;
          gap: 18px;
          width: 340px;
          padding: 24px;
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: var(--r-lg);
          cursor: pointer;
          transition: border-color 200ms var(--ease-out), background 200ms var(--ease-out), transform 180ms var(--ease-out);
          animation: fadeUp 260ms var(--ease-out) both;
        }

        .home-card:first-of-type { animation-delay: 60ms; }
        .home-card:last-of-type  { animation-delay: 120ms; }

        @media (hover: hover) and (pointer: fine) {
          .home-card:hover {
            border-color: var(--border-strong);
            background: var(--bg-elevated);
            transform: translateY(-2px);
          }
          .home-card:hover .home-card-arrow {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .home-card:active { transform: scale(0.98); }

        .home-card-icon {
          width: 46px; height: 46px;
          border-radius: var(--r-md);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }

        .student-icon, .faculty-icon {
          background: var(--bg-elevated);
          color: var(--text-primary);
          border: 1px solid var(--border-strong);
        }

        .home-card-text { flex: 1; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
        .home-card-title { font-size: 15px; font-weight: 700; color: var(--text-primary); }
        .home-card-desc { font-size: 13px; color: var(--text-muted); line-height: 1.5; }

        .home-card-arrow {
          font-size: 16px;
          color: var(--text-muted);
          flex-shrink: 0;
          opacity: 0;
          transform: translateX(-6px);
          transition: opacity 200ms var(--ease-out), transform 200ms var(--ease-out);
        }
      `}</style>
    </div>
  );
}
