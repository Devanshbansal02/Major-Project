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
      if (qs.length === 0) throw new Error("No questions returned");
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
          <div className="trivia-mode-label">Trivia Quiz</div>
          <h1 className="trivia-subject-name">{subjectName || `Subject ${subjectId}`}</h1>
        </div>
      </div>

      {questions.length === 0 && !loading && (
        <div className="trivia-start">
          {error && <p className="trivia-error">{error}</p>}
          <p className="trivia-desc">Generate a 5-question quiz based on your notes for this subject.</p>
          <button className="btn btn-primary" onClick={generate}>Generate Quiz</button>
        </div>
      )}

      {loading && (
        <div className="trivia-loading">
          <div className="trivia-spinner" />
          <p>Generating questions from your notes…</p>
        </div>
      )}

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
        .trivia-mode-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--success); }
        .trivia-subject-name { font-size: 20px; font-weight: 700; }
        .trivia-start { display: flex; flex-direction: column; gap: 16px; max-width: 480px; }
        .trivia-desc { font-size: 14px; color: var(--text-secondary); }
        .trivia-error { font-size: 13px; color: var(--danger); }
        .trivia-loading { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 64px 0; color: var(--text-secondary); font-size: 14px; }
        .trivia-spinner { width: 36px; height: 36px; border: 3px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .trivia-content { max-width: 680px; }
      `}</style>
    </div>
  );
}
