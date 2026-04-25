import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import TriviaQuestion from "../components/TriviaQuestion";
import { useSettingsStore } from "../store/settings";
import { getTriviaQuestions } from "../api/client";
import type { TriviaQuestion as TriviaQuestionType } from "../types";

export default function TriviaView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const subjectId = Number(id);
  const noteIds: number[] = (location.state as { noteIds?: number[] })?.noteIds ?? [];

  const [subjectName, setSubjectName] = useState("");
  const { provider, baseUrl, model, customStyle, getApiKey } = useSettingsStore();
  const [questions, setQuestions] = useState<TriviaQuestionType[]>([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("http://localhost:8000/api/notes/subjects")
      .then(r => r.json())
      .then((subjects: { id: number; name: string }[]) => {
        const s = subjects.find(x => x.id === subjectId);
        if (s) setSubjectName(s.name);
      })
      .catch(() => {});
  }, [subjectId]);

  async function generate() {
    setLoading(true);
    setError("");
    setCurrent(0);
    setQuestions([]);
    try {
      const providerConfig = { provider, apiKey: getApiKey(), baseUrl, model, customStyle };
      const qs = await getTriviaQuestions(subjectId, providerConfig, noteIds);
      if (qs.length === 0) throw new Error("No questions returned.");
      setQuestions(qs);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to generate quiz.");
    } finally {
      setLoading(false);
    }
  }

  function restart() {
    setCurrent(0);
    setQuestions([]);
  }

  return (
    <div className="page">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(`/subject/${subjectId}`)}>← Back</button>
        <div>
          <div className="trivia-eyebrow section-label">
            Trivia Quiz
          </div>
          <h1 className="trivia-subject-name">{subjectName || `Subject ${subjectId}`}</h1>
        </div>
      </div>

      {/* Start screen */}
      {questions.length === 0 && !loading && (
        <div className="trivia-start" style={{ animationDelay: "60ms" }}>
          {error && (
            <div className="alert alert-danger">
              <svg className="alert-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>{error}</span>
            </div>
          )}
          <p className="trivia-desc">
            Generate a 5-question multiple choice quiz from your selected notes.
          </p>
          <button className="btn btn-primary trivia-gen-btn" onClick={generate}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            Generate Quiz
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="trivia-loading">
          <div className="trivia-loading-ring">
            <div />
            <div />
            <div />
          </div>
          <p>Generating questions from your notes…</p>
          <span>This may take 10–20 seconds</span>
        </div>
      )}

      {/* Question */}
      {questions.length > 0 && (
        <div className="trivia-content">
          <TriviaQuestion
            key={current}
            question={questions[current]}
            index={current}
            total={questions.length}
            isLast={current === questions.length - 1}
            onNext={() => setCurrent((c) => c + 1)}
            onRestart={restart}
          />
        </div>
      )}

      <style>{`
        .trivia-eyebrow {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-family: var(--font-mono);
          margin-bottom: 4px;
        }

        .trivia-subject-name {
          font-size: 20px;
          font-weight: 700;
          line-height: 1.2;
        }

        .trivia-start {
          display: flex;
          flex-direction: column;
          gap: 18px;
          max-width: 440px;
          animation: fadeUp 240ms var(--ease-out) both;
        }

        .trivia-desc {
          font-size: 14px;
          color: var(--text-secondary);
          line-height: 1.6;
        }

        .trivia-gen-btn {
          width: fit-content;
        }

        /* Loading */
        .trivia-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          padding: 72px 0;
          animation: fadeUp 200ms var(--ease-out) both;
        }

        .trivia-loading p {
          font-size: 14px;
          color: var(--text-secondary);
        }

        .trivia-loading span {
          font-size: 12px;
          color: var(--text-muted);
          font-family: var(--font-mono);
        }

        /* Three-dot ring loader */
        .trivia-loading-ring {
          width: 40px; height: 40px;
          position: relative;
        }

        .trivia-loading-ring div {
          position: absolute;
          width: 100%; height: 100%;
          border-radius: 50%;
          border: 2px solid transparent;
          border-top-color: var(--text-primary);
          animation: spin 1s linear infinite;
        }

        .trivia-loading-ring div:nth-child(2) {
          animation-delay: -0.33s;
          opacity: 0.6;
        }

        .trivia-loading-ring div:nth-child(3) {
          animation-delay: -0.66s;
          opacity: 0.35;
        }

        .trivia-content {
          max-width: 680px;
          animation: fadeUp 200ms var(--ease-out) both;
        }
      `}</style>
    </div>
  );
}
