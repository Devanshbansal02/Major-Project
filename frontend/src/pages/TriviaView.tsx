import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import TriviaQuestion from "../components/TriviaQuestion";
import ShortAnswerQuestionCard from "../components/ShortAnswerQuestionCard";
import { useSettingsStore } from "../store/settings";
import { getTriviaQuestions } from "../api/client";
import type { TriviaQuestion as TriviaQuestionType, ShortAnswerQuestion, QuizType } from "../types";

const QUESTION_COUNTS = [5, 10, 15, 20] as const;

export default function TriviaView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const subjectId = Number(id);
  const noteIds: number[] = (location.state as { noteIds?: number[] })?.noteIds ?? [];

  const [subjectName, setSubjectName] = useState("");
  const { provider, baseUrl, model, customStyle, getApiKey } = useSettingsStore();

  // Config state
  const [quizType, setQuizType] = useState<QuizType>("mcq");
  const [numQuestions, setNumQuestions] = useState<number>(5);
  const [customCount, setCustomCount] = useState<string>("");
  const [useCustom, setUseCustom] = useState(false);

  // Quiz state
  const [mcqQuestions, setMcqQuestions] = useState<TriviaQuestionType[]>([]);
  const [saQuestions, setSaQuestions] = useState<ShortAnswerQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const questions = quizType === "mcq" ? mcqQuestions : saQuestions;

  useEffect(() => {
    fetch("http://localhost:8000/api/notes/subjects")
      .then(r => r.json())
      .then((subjects: { id: number; name: string }[]) => {
        const s = subjects.find(x => x.id === subjectId);
        if (s) setSubjectName(s.name);
      })
      .catch(() => {});
  }, [subjectId]);

  const effectiveCount = useCustom ? (parseInt(customCount) || 5) : numQuestions;

  async function generate() {
    setLoading(true);
    setError("");
    setCurrent(0);
    setMcqQuestions([]);
    setSaQuestions([]);
    try {
      const providerConfig = { provider, apiKey: getApiKey(), baseUrl, model, customStyle };
      const qs = await getTriviaQuestions(subjectId, providerConfig, noteIds, quizType, effectiveCount);
      if (qs.length === 0) throw new Error("No questions returned.");
      if (quizType === "mcq") {
        setMcqQuestions(qs as TriviaQuestionType[]);
      } else {
        setSaQuestions(qs as ShortAnswerQuestion[]);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to generate quiz.");
    } finally {
      setLoading(false);
    }
  }

  function restart() {
    setCurrent(0);
    setMcqQuestions([]);
    setSaQuestions([]);
  }

  function saveQuiz() {
    let text = "";
    if (quizType === "mcq") {
      text = mcqQuestions.map((q, i) =>
        `Q${i + 1}: ${q.question}\nOptions:\n${q.options.map(o => `  - ${o}`).join("\n")}\n\nAnswer: ${q.answer}\nExplanation: ${q.explanation}\n`
      ).join("\n---\n\n");
    } else {
      text = saQuestions.map((q, i) =>
        `Q${i + 1}: ${q.question}\n\nAnswer: ${q.answer}\nExplanation: ${q.explanation}\n`
      ).join("\n---\n\n");
    }
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bloom-quiz-${subjectName || "subject"}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const hasQuestions = questions.length > 0;

  return (
    <div className="page">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(`/subject/${subjectId}`)}>← Back</button>
        <div style={{ flex: 1 }}>
          <div className="trivia-eyebrow section-label">Trivia Quiz</div>
          <h1 className="trivia-subject-name">{subjectName || `Subject ${subjectId}`}</h1>
        </div>
        {hasQuestions && (
          <button
            className="btn btn-ghost"
            onClick={saveQuiz}
            style={{ padding: "8px 12px", height: "fit-content" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Save Quiz
          </button>
        )}
      </div>

      {/* Start screen */}
      {!hasQuestions && !loading && (
        <div className="trivia-start">
          {error && (
            <div className="alert alert-danger">
              <svg className="alert-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Quiz type picker */}
          <div className="trivia-config-section">
            <p className="trivia-config-label">Quiz Type</p>
            <div className="trivia-type-row">
              <button
                className={`trivia-type-btn ${quizType === "mcq" ? "active" : ""}`}
                onClick={() => setQuizType("mcq")}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 8 8 12 12 16"/><line x1="16" y1="12" x2="8" y2="12"/>
                </svg>
                Multiple Choice
                <span className="trivia-type-badge">MCQ</span>
              </button>
              <button
                className={`trivia-type-btn ${quizType === "short_answer" ? "active" : ""}`}
                onClick={() => setQuizType("short_answer")}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="14" y2="12"/><line x1="4" y1="17" x2="11" y2="17"/>
                </svg>
                Short Answer
                <span className="trivia-type-badge">SA</span>
              </button>
            </div>
          </div>

          {/* Question count */}
          {(
            <div className="trivia-config-section">
              <p className="trivia-config-label">Number of Questions</p>
              <div className="trivia-count-row">
                {QUESTION_COUNTS.map(n => (
                  <button
                    key={n}
                    className={`trivia-count-btn ${!useCustom && numQuestions === n ? "active" : ""}`}
                    onClick={() => { setNumQuestions(n); setUseCustom(false); }}
                  >
                    {n}
                  </button>
                ))}
                <button
                  className={`trivia-count-btn ${useCustom ? "active" : ""}`}
                  onClick={() => setUseCustom(true)}
                >
                  Custom
                </button>
              </div>
              {useCustom && (
                <div className="trivia-custom-row">
                  <input
                    className="trivia-custom-input"
                    type="number"
                    min={1}
                    max={50}
                    placeholder="e.g. 8"
                    value={customCount}
                    onChange={e => setCustomCount(e.target.value)}
                    autoFocus
                  />
                  <span className="trivia-custom-hint">questions (1–50)</span>
                </div>
              )}
            </div>
          )}

          <p className="trivia-desc">
            {quizType === "mcq"
              ? `Generate ${effectiveCount} multiple choice questions from your selected notes.`
              : `Generate ${effectiveCount} short-answer questions from your selected notes. Type your answer before revealing the correct one.`
            }
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
            <div /><div /><div />
          </div>
          <p>Generating questions from your notes…</p>
          <span>This may take 10–20 seconds</span>
        </div>
      )}

      {/* MCQ Questions */}
      {hasQuestions && quizType === "mcq" && (
        <div className="trivia-content">
          <TriviaQuestion
            key={current}
            question={mcqQuestions[current]}
            index={current}
            total={mcqQuestions.length}
            isLast={current === mcqQuestions.length - 1}
            onNext={() => setCurrent(c => c + 1)}
            onRestart={restart}
          />
        </div>
      )}

      {/* Short Answer Questions */}
      {hasQuestions && quizType === "short_answer" && (
        <div className="trivia-content">
          <ShortAnswerQuestionCard
            key={current}
            question={saQuestions[current]}
            index={current}
            total={saQuestions.length}
            isLast={current === saQuestions.length - 1}
            onNext={() => setCurrent(c => c + 1)}
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
          gap: 22px;
          max-width: 520px;
          animation: fadeUp 240ms var(--ease-out) both;
        }

        /* Config sections */
        .trivia-config-section {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .trivia-config-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--text-muted);
          font-family: var(--font-mono);
        }

        /* Quiz type toggle */
        .trivia-type-row {
          display: flex;
          gap: 10px;
        }

        .trivia-type-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 11px 16px;
          border: 1px solid var(--border);
          border-radius: var(--r-sm);
          background: var(--bg-elevated);
          color: var(--text-secondary);
          font-size: 13.5px;
          font-weight: 500;
          font-family: var(--font-body);
          cursor: pointer;
          flex: 1;
          transition: border-color 150ms, background 150ms, color 150ms;
        }

        .trivia-type-btn:hover {
          border-color: var(--border-strong);
          color: var(--text-primary);
        }

        .trivia-type-btn.active {
          border-color: var(--accent);
          background: color-mix(in srgb, var(--accent) 8%, transparent);
          color: var(--accent);
        }

        .trivia-type-badge {
          margin-left: auto;
          font-size: 9.5px;
          font-weight: 700;
          letter-spacing: 0.08em;
          font-family: var(--font-mono);
          padding: 2px 6px;
          border-radius: 4px;
          background: var(--bg-surface);
          border: 1px solid var(--border);
          color: var(--text-muted);
        }

        .trivia-type-btn.active .trivia-type-badge {
          border-color: color-mix(in srgb, var(--accent) 40%, transparent);
          color: var(--accent);
          background: color-mix(in srgb, var(--accent) 12%, transparent);
        }

        /* Question count picker */
        .trivia-count-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .trivia-count-btn {
          padding: 8px 16px;
          border: 1px solid var(--border);
          border-radius: var(--r-sm);
          background: var(--bg-elevated);
          color: var(--text-secondary);
          font-size: 13px;
          font-weight: 600;
          font-family: var(--font-mono);
          cursor: pointer;
          transition: border-color 150ms, background 150ms, color 150ms;
          min-width: 52px;
        }

        .trivia-count-btn:hover {
          border-color: var(--border-strong);
          color: var(--text-primary);
        }

        .trivia-count-btn.active {
          border-color: var(--accent);
          background: color-mix(in srgb, var(--accent) 10%, transparent);
          color: var(--accent);
        }

        /* Custom count input */
        .trivia-custom-row {
          display: flex;
          align-items: center;
          gap: 10px;
          animation: fadeUp 180ms var(--ease-out) both;
        }

        .trivia-custom-input {
          width: 90px;
          padding: 8px 12px;
          border: 1px solid var(--accent);
          border-radius: var(--r-sm);
          background: var(--bg-elevated);
          color: var(--text-primary);
          font-size: 14px;
          font-family: var(--font-mono);
          font-weight: 600;
          outline: none;
        }

        .trivia-custom-hint {
          font-size: 12px;
          color: var(--text-muted);
          font-family: var(--font-mono);
        }

        .trivia-desc {
          font-size: 13.5px;
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
