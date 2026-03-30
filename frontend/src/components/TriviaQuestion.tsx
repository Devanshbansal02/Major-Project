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

  return (
    <div className="trivia-question">
      <div className="trivia-progress">Question {index + 1} of {total}</div>
      <div className="trivia-progress-bar">
        <div className="trivia-progress-fill" style={{ width: `${((index + 1) / total) * 100}%` }} />
      </div>

      <p className="trivia-q-text">{question.question}</p>

      <div className="trivia-options">
        {question.options.map((opt) => {
          let cls = "trivia-option";
          if (selected) {
            if (opt === question.answer) cls += " correct";
            else if (opt === selected) cls += " wrong";
            else cls += " dimmed";
          }
          return (
            <button key={opt} className={cls} onClick={() => handleSelect(opt)}>
              {opt}
            </button>
          );
        })}
      </div>

      {selected && (
        <div className={`trivia-explanation ${isCorrect ? "correct" : "wrong"}`}>
          <strong>{isCorrect ? "✓ Correct!" : `✗ The answer is: ${question.answer}`}</strong>
          <p>{question.explanation}</p>
        </div>
      )}

      {selected && (
        <div className="trivia-actions">
          {isLast ? (
            <button className="btn btn-primary" onClick={onRestart}>Restart Quiz</button>
          ) : (
            <button className="btn btn-primary" onClick={onNext}>Next Question →</button>
          )}
        </div>
      )}

      <style>{`
        .trivia-question { display: flex; flex-direction: column; gap: 20px; }
        .trivia-progress { font-size: 12px; color: var(--text-muted); font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; }
        .trivia-progress-bar { height: 3px; background: var(--border); border-radius: 2px; overflow: hidden; }
        .trivia-progress-fill { height: 100%; background: var(--accent); border-radius: 2px; transition: width 400ms ease; }
        .trivia-q-text { font-size: 17px; font-weight: 600; color: var(--text-primary); line-height: 1.5; }
        .trivia-options { display: flex; flex-direction: column; gap: 10px; }
        .trivia-option {
          text-align: left;
          padding: 14px 18px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border);
          background: var(--bg-elevated);
          color: var(--text-primary);
          font-size: 14px;
          font-weight: 500;
          transition: all 150ms ease;
        }
        .trivia-option:not(.correct):not(.wrong):not(.dimmed):hover {
          border-color: var(--accent);
          color: var(--accent-hover);
        }
        .trivia-option.correct { border-color: var(--success); background: color-mix(in srgb, var(--success) 12%, var(--bg-elevated)); color: var(--success); }
        .trivia-option.wrong { border-color: var(--danger); background: color-mix(in srgb, var(--danger) 12%, var(--bg-elevated)); color: var(--danger); }
        .trivia-option.dimmed { opacity: 0.4; }
        .trivia-explanation {
          padding: 14px 18px;
          border-radius: var(--radius-md);
          font-size: 14px;
          line-height: 1.6;
        }
        .trivia-explanation.correct { background: color-mix(in srgb, var(--success) 10%, transparent); border: 1px solid color-mix(in srgb, var(--success) 25%, transparent); color: var(--text-primary); }
        .trivia-explanation.wrong { background: color-mix(in srgb, var(--danger) 10%, transparent); border: 1px solid color-mix(in srgb, var(--danger) 25%, transparent); color: var(--text-primary); }
        .trivia-explanation strong { display: block; margin-bottom: 6px; }
        .trivia-explanation p { color: var(--text-secondary); }
        .trivia-actions { display: flex; justify-content: flex-end; }
      `}</style>
    </div>
  );
}
