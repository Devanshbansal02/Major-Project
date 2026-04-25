import type { TriviaQuestion as TriviaQuestionType } from "../types";
import { useState } from "react";

interface Props {
  question: TriviaQuestionType;
  index: number;
  total: number;
  onNext: () => void;
  isLast: boolean;
  onRestart: () => void;
}

export default function TriviaQuestion({ question, index, total, onNext, isLast, onRestart }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = (option: string) => {
    if (selected) return;
    setSelected(option);
  };

  const isCorrect = selected === question.answer;
  const progress = ((index + 1) / total) * 100;

  return (
    <>
      <div className="tq-card">
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

        {/* Options */}
        <div className="tq-options">
          {question.options.map((opt, i) => {
            let state = "";
            if (selected) {
              if (opt === question.answer) state = "correct";
              else if (opt === selected) state = "wrong";
              else state = "dimmed";
            }
            return (
              <button
                key={opt}
                className={`tq-option ${state}`}
                onClick={() => handleSelect(opt)}
                style={{ animationDelay: `${i * 45}ms` }}
              >
                <span className="tq-option-letter">{String.fromCharCode(65 + i)}</span>
                <span className="tq-option-text">{opt}</span>
                {selected && opt === question.answer && (
                  <svg className="tq-option-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
                {selected && opt === selected && opt !== question.answer && (
                  <svg className="tq-option-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                )}
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {selected && (
          <div className={`tq-explanation ${isCorrect ? "correct" : "wrong"}`}>
            <div className="tq-exp-header">
              <span className={`tq-exp-verdict ${isCorrect ? "correct" : "wrong"}`}>
                {isCorrect ? "Correct" : `Answer: ${question.answer}`}
              </span>
            </div>
            <p className="tq-exp-text">{question.explanation}</p>
          </div>
        )}

        {/* Navigation */}
        {selected && (
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
        )}
      </div>

      <style>{`
        .tq-card {
          display: flex;
          flex-direction: column;
          gap: 22px;
          animation: fadeUp 220ms var(--ease-out) both;
        }

        /* Progress */
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
          background: var(--success);
          border-radius: 1px;
          transition: width 350ms var(--ease-out);
        }

        /* Question */
        .tq-question {
          font-size: 17px;
          font-weight: 600;
          line-height: 1.5;
          color: var(--text-primary);
          font-family: var(--font-body);
        }

        /* Options */
        .tq-options {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .tq-option {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 13px 16px;
          border-radius: var(--r-sm);
          border: 1px solid var(--border);
          background: var(--bg-elevated);
          color: var(--text-primary);
          font-size: 14px;
          font-weight: 500;
          font-family: var(--font-body);
          text-align: left;
          transition: border-color 140ms, background 140ms, color 140ms, transform 100ms, opacity 200ms;
          animation: fadeUp 200ms var(--ease-out) both;
          cursor: pointer;
        }

        @media (hover: hover) and (pointer: fine) {
          .tq-option:not(.correct):not(.wrong):not(.dimmed):hover {
            border-color: var(--border-strong);
            background: var(--bg-hover);
          }
        }

        .tq-option:not(.correct):not(.wrong):not(.dimmed):active { transform: scale(0.98); }

        .tq-option.correct {
          border-color: rgba(34,197,94,0.4);
          background: rgba(34,197,94,0.08);
          color: var(--success);
        }

        .tq-option.wrong {
          border-color: rgba(244,63,94,0.4);
          background: rgba(244,63,94,0.08);
          color: var(--danger);
        }

        .tq-option.dimmed { opacity: 0.35; }

        .tq-option-letter {
          width: 22px; height: 22px;
          border-radius: var(--r-xs);
          background: var(--bg-surface);
          border: 1px solid var(--border);
          font-size: 10.5px;
          font-weight: 700;
          font-family: var(--font-mono);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          transition: background 140ms, border-color 140ms, color 140ms;
        }

        .tq-option.correct .tq-option-letter { background: rgba(34,197,94,0.15); border-color: rgba(34,197,94,0.4); color: var(--success); }
        .tq-option.wrong .tq-option-letter { background: rgba(244,63,94,0.15); border-color: rgba(244,63,94,0.4); color: var(--danger); }

        .tq-option-text { flex: 1; }

        .tq-option-icon { flex-shrink: 0; }

        /* Explanation */
        .tq-explanation {
          padding: 16px 18px;
          border-radius: var(--r-sm);
          display: flex;
          flex-direction: column;
          gap: 8px;
          animation: fadeUp 220ms var(--ease-out) both;
        }

        .tq-explanation.correct {
          background: rgba(34,197,94,0.06);
          border: 1px solid rgba(34,197,94,0.2);
        }

        .tq-explanation.wrong {
          background: rgba(244,63,94,0.06);
          border: 1px solid rgba(244,63,94,0.2);
        }

        .tq-exp-header { display: flex; align-items: center; gap: 10px; }

        .tq-exp-verdict {
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-family: var(--font-mono);
        }
        .tq-exp-verdict.correct { color: var(--success); }
        .tq-exp-verdict.wrong { color: var(--danger); }

        .tq-exp-text {
          font-size: 13.5px;
          color: var(--text-secondary);
          line-height: 1.65;
        }

        /* Actions */
        .tq-actions {
          display: flex;
          justify-content: flex-end;
          animation: fadeUp 180ms var(--ease-out) 100ms both;
        }
      `}</style>
    </>
  );
}
