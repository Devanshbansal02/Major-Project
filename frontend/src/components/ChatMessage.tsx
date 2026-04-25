import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import type { ChatMessage as ChatMessageType } from "../types";

interface Props {
  message: ChatMessageType;
  isStreaming?: boolean;
}

export default function ChatMessage({ message, isStreaming = false }: Props) {
  const isUser = message.role === "user";

  return (
    <>
      <div className={`cm ${isUser ? "cm--user" : "cm--assistant"}`}>
        {!isUser && (
          <div className="cm-avatar">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
        )}
        <div className={`cm-bubble ${isStreaming ? "cm-bubble--streaming" : ""}`}>
          {isUser ? (
            <span>{message.content}</span>
          ) : (
            <div className="markdown-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .cm {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 14px;
          animation: fadeUp 200ms var(--ease-out) both;
        }

        .cm--user {
          flex-direction: row-reverse;
        }

        .cm-avatar {
          width: 28px; height: 28px;
          border-radius: 50%;
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          display: flex; align-items: center; justify-content: center;
          color: var(--text-muted);
          flex-shrink: 0;
          margin-top: 1px;
        }

        .cm-bubble {
          max-width: 75%;
          padding: 11px 15px;
          border-radius: var(--r-md);
          font-size: 14px;
          line-height: 1.7;
        }

        .cm--user .cm-bubble {
          background: var(--accent);
          color: #fff;
          border-bottom-right-radius: 3px;
        }

        .cm--assistant .cm-bubble {
          background: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
          color: var(--text-primary);
          border-bottom-left-radius: 3px;
        }

        .cm-bubble--streaming {
          border-color: rgba(99,102,241,0.2) !important;
        }

        /* ── Markdown ───────────────────────────────────── */
        .markdown-body p { margin: 0 0 10px; }
        .markdown-body p:last-child { margin-bottom: 0; }
        .markdown-body ul, .markdown-body ol { padding-left: 20px; margin: 0 0 10px; }
        .markdown-body li { margin-bottom: 5px; }
        .markdown-body li > p { margin: 0; }

        .markdown-body table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 13px; }
        .markdown-body th, .markdown-body td { border: 1px solid var(--border); padding: 6px 12px; text-align: left; }
        .markdown-body th { background: rgba(255,255,255,0.04); font-weight: 600; font-size: 12px; letter-spacing: 0.03em; }

        .markdown-body blockquote {
          border-left: 2px solid var(--accent);
          margin: 10px 0;
          padding: 4px 14px;
          color: var(--text-secondary);
          font-style: italic;
        }

        .markdown-body h1, .markdown-body h2, .markdown-body h3,
        .markdown-body h4, .markdown-body h5, .markdown-body h6 {
          margin: 16px 0 7px;
          font-weight: 700;
          line-height: 1.3;
          font-family: var(--font-body);
        }
        .markdown-body h1 { font-size: 18px; }
        .markdown-body h2 { font-size: 16px; }
        .markdown-body h3 { font-size: 14px; }

        .markdown-body code:not(pre code) {
          background: rgba(255,255,255,0.08);
          padding: 1.5px 5px;
          border-radius: 3px;
          font-size: 12.5px;
          font-family: var(--font-mono);
        }

        .markdown-body pre {
          background: rgba(0,0,0,0.4);
          padding: 12px 16px;
          border-radius: var(--r-sm);
          overflow-x: auto;
          margin: 12px 0;
          border: 1px solid var(--border-subtle);
        }

        .markdown-body pre code {
          background: none;
          padding: 0;
          font-size: 12.5px;
          font-family: var(--font-mono);
        }

        .markdown-body strong { font-weight: 700; }
        .markdown-body em { font-style: italic; color: var(--text-secondary); }
        .markdown-body del { opacity: 0.5; }
        .markdown-body a { color: var(--accent-hover); text-decoration: underline; text-underline-offset: 2px; }
        .markdown-body hr { border: none; border-top: 1px solid var(--border-subtle); margin: 14px 0; }
        .markdown-body input[type="checkbox"] { margin-right: 6px; accent-color: var(--accent); }
      `}</style>
    </>
  );
}
