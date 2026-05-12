import type { ShortAnswerQuestion } from "../types";
import { useState } from "react";

interface Props {
  question: ShortAnswerQuestion;
  index: number;
  total: number;
  onNext: () => void;
  isLast: boolean;
  onRestart: () => void;
}

export default function ShortAnswerQuestionCard({ question, index, total, onNext, isLast, onRestart }: Props) {
  const [userAnswer, setUserAnswer] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [grade, setGrade] = useState<"correct" | "partial" | "wrong" | null>(null);

  const progress = ((index + 1) / total) * 100;

  function reveal() {
    if (!userAnswer.trim()) return;
    setRevealed(true);
  }

  return (
    <>
      <div className="sa-card">
        {/* Progress */}
        <div className="tq-progress-row">
          <span className="tq-progress-label">
            {index + 1} <span className="tq-progress-sep">/</span> {total}
          </span>
          <div className="tq-progress-track">
            <div className="tq-progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Question */}
        <p className="tq-question">{question.question}</p>

        {/* Answer input */}
        {!revealed && (
          <div className="sa-input-area">
            <textarea
              className="sa-textarea"
              value={userAnswer}
              onChange={e => setUserAnswer(e.target.value)}
              placeholder="Type your answer here…"
              rows={4}
              autoFocus
              onKeyDown={e => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) reveal();
              }}
            />
            <div className="sa-input-footer">
              <span className="sa-hint">Ctrl+Enter to reveal</span>
              <button
                className="btn btn-primary"
                onClick={reveal}
                disabled={!userAnswer.trim()}
              >
                Reveal Answer →
              </button>
            </div>
          </div>
        )}

        {/* Revealed: model answer + explanation */}
        {revealed && (
          <div className="sa-revealed">
            {/* Your answer */}
            <div className="sa-your-answer">
              <span className="sa-section-label">Your Answer</span>
              <p className="sa-your-text">{userAnswer}</p>
            </div>

            {/* Model answer */}
            <div className="sa-model-answer">
              <span className="sa-section-label">Model Answer</span>
              <p className="sa-model-text">{question.answer}</p>
            </div>

            {/* Explanation */}
            <div className="sa-explanation">
              <span className="sa-section-label">Explanation</span>
              <p className="sa-exp-text">{question.explanation}</p>
            </div>

            {/* Self-grade */}
            {!grade && (
              <div className="sa-grade-row">
                <span className="sa-grade-label">How did you do?</span>
                <div className="sa-grade-btns">
                  <button className="sa-grade-btn correct" onClick={() => setGrade("correct")}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Got it
                  </button>
                  <button className="sa-grade-btn partial" onClick={() => setGrade("partial")}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    Partially
                  </button>
                  <button className="sa-grade-btn wrong" onClick={() => setGrade("wrong")}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                    Missed it
                  </button>
                </div>
              </div>
            )}

            {/* Grade badge + nav */}
            {grade && (
              <div className="sa-post-grade">
                <span className={`sa-grade-badge ${grade}`}>
                  {grade === "correct" ? "✓ Got it" : grade === "partial" ? "◐ Partially" : "✗ Missed it"}
                </span>
                <div className="tq-actions">
                  {isLast ? (
                    <button className="btn btn-ghost" onClick={onRestart}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/>
                      </svg>
                      Restart quiz
                    </button>
                  ) : (
                    <button className="btn btn-primary" onClick={onNext}>
                      Next question →
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .sa-card {
          display: flex;
          flex-direction: column;
          gap: 22px;
          animation: fadeUp 220ms var(--ease-out) both;
        }

        /* Reuse progress styles from TriviaQuestion */
        .tq-progress-row {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .tq-progress-label {
          font-family: var(--font-mono);
          font-size: 12px;
          color: var(--text-muted);
          white-space: nowrap;
          flex-shrink: 0;
        }
        .tq-progress-sep { opacity: 0.4; }
        .tq-progress-track {
          flex: 1;
          height: 2px;
          background: var(--border-subtle);
          border-radius: 1px;
          overflow: hidden;
        }
        .tq-progress-fill {
          height: 100%;
          background: var(--accent);
          border-radius: 1px;
          transition: width 350ms var(--ease-out);
        }
        .tq-question {
          font-size: 17px;
          font-weight: 600;
          line-height: 1.5;
          color: var(--text-primary);
          font-family: var(--font-body);
        }
        .tq-actions {
          display: flex;
          justify-content: flex-end;
          animation: fadeUp 180ms var(--ease-out) 100ms both;
        }

        /* Input area */
        .sa-input-area {
          display: flex;
          flex-direction: column;
          gap: 10px;
          animation: fadeUp 180ms var(--ease-out) both;
        }

        .sa-textarea {
          width: 100%;
          padding: 14px 16px;
          border: 1px solid var(--border);
          border-radius: var(--r-sm);
          background: var(--bg-elevated);
          color: var(--text-primary);
          font-size: 14px;
          font-family: var(--font-body);
          line-height: 1.6;
          resize: vertical;
          outline: none;
          transition: border-color 150ms;
          box-sizing: border-box;
        }

        .sa-textarea:focus {
          border-color: var(--accent);
        }

        .sa-input-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .sa-hint {
          font-size: 11.5px;
          color: var(--text-muted);
          font-family: var(--font-mono);
        }

        /* Revealed */
        .sa-revealed {
          display: flex;
          flex-direction: column;
          gap: 16px;
          animation: fadeUp 220ms var(--ease-out) both;
        }

        .sa-section-label {
          display: block;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          font-family: var(--font-mono);
          color: var(--text-muted);
          margin-bottom: 6px;
        }

        .sa-your-answer {
          padding: 14px 16px;
          border-radius: var(--r-sm);
          border: 1px solid var(--border-subtle);
          background: var(--bg-elevated);
        }

        .sa-your-text {
          font-size: 14px;
          color: var(--text-secondary);
          line-height: 1.6;
          white-space: pre-wrap;
        }

        .sa-model-answer {
          padding: 14px 16px;
          border-radius: var(--r-sm);
          border: 1px solid rgba(34,197,94,0.25);
          background: rgba(34,197,94,0.06);
        }

        .sa-model-text {
          font-size: 14px;
          color: var(--success);
          line-height: 1.6;
          font-weight: 500;
        }

        .sa-explanation {
          padding: 14px 16px;
          border-radius: var(--r-sm);
          border: 1px solid var(--border-subtle);
          background: var(--bg-elevated);
        }

        .sa-exp-text {
          font-size: 13.5px;
          color: var(--text-secondary);
          line-height: 1.65;
        }

        /* Self-grade */
        .sa-grade-row {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
          animation: fadeUp 200ms var(--ease-out) both;
        }

        .sa-grade-label {
          font-size: 12px;
          color: var(--text-muted);
          font-weight: 500;
          white-space: nowrap;
        }

        .sa-grade-btns {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .sa-grade-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 7px 13px;
          border-radius: var(--r-sm);
          border: 1px solid var(--border);
          background: var(--bg-elevated);
          font-size: 13px;
          font-weight: 500;
          font-family: var(--font-body);
          cursor: pointer;
          transition: border-color 140ms, background 140ms, color 140ms, transform 100ms;
        }
        .sa-grade-btn:active { transform: scale(0.96); }

        .sa-grade-btn.correct { color: var(--success); }
        .sa-grade-btn.correct:hover { border-color: rgba(34,197,94,0.4); background: rgba(34,197,94,0.08); }

        .sa-grade-btn.partial { color: var(--warning, #f59e0b); }
        .sa-grade-btn.partial:hover { border-color: rgba(245,158,11,0.4); background: rgba(245,158,11,0.08); }

        .sa-grade-btn.wrong { color: var(--danger); }
        .sa-grade-btn.wrong:hover { border-color: rgba(244,63,94,0.4); background: rgba(244,63,94,0.08); }

        /* Post-grade */
        .sa-post-grade {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          animation: fadeUp 180ms var(--ease-out) both;
        }

        .sa-grade-badge {
          font-size: 12px;
          font-weight: 700;
          font-family: var(--font-mono);
          padding: 5px 10px;
          border-radius: 99px;
          letter-spacing: 0.04em;
        }

        .sa-grade-badge.correct {
          background: rgba(34,197,94,0.1);
          color: var(--success);
          border: 1px solid rgba(34,197,94,0.25);
        }

        .sa-grade-badge.partial {
          background: rgba(245,158,11,0.1);
          color: var(--warning, #f59e0b);
          border: 1px solid rgba(245,158,11,0.25);
        }

        .sa-grade-badge.wrong {
          background: rgba(244,63,94,0.1);
          color: var(--danger);
          border: 1px solid rgba(244,63,94,0.25);
        }
      `}</style>
    </>
  );
}
