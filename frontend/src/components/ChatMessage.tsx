import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import type { ChatMessage as ChatMessageType } from "../types";

interface Props {
  message: ChatMessageType;
}

export default function ChatMessage({ message }: Props) {
  const isUser = message.role === "user";
  return (
    <div className={`chat-message ${isUser ? "user" : "assistant"}`}>
      <div className="chat-bubble">
        {isUser ? (
          <span>{message.content}</span>
        ) : (
          <div className="markdown-body">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
      <style>{`
        .chat-message {
          display: flex;
          margin-bottom: 16px;
        }
        .chat-message.user {
          justify-content: flex-end;
        }
        .chat-message.assistant {
          justify-content: flex-start;
        }
        .chat-bubble {
          max-width: 72%;
          padding: 12px 16px;
          border-radius: var(--radius-md);
          font-size: 14px;
          line-height: 1.65;
        }
        .chat-message.user .chat-bubble {
          background: var(--accent);
          color: #fff;
          border-bottom-right-radius: 3px;
        }
        .chat-message.assistant .chat-bubble {
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          color: var(--text-primary);
          border-bottom-left-radius: 3px;
        }
        /* --- Markdown body styles --- */
        .markdown-body p { margin: 0 0 8px; }
        .markdown-body p:last-child { margin-bottom: 0; }
        .markdown-body ul, .markdown-body ol { padding-left: 20px; margin: 0 0 8px; }
        .markdown-body li { margin-bottom: 4px; }
        .markdown-body li > p { margin: 0; }
        /* GFM tables */
        .markdown-body table { border-collapse: collapse; width: 100%; margin: 10px 0; font-size: 13px; }
        .markdown-body th, .markdown-body td { border: 1px solid var(--border); padding: 6px 10px; text-align: left; }
        .markdown-body th { background: rgba(255,255,255,0.06); font-weight: 600; }
        /* GFM task-list checkboxes */
        .markdown-body input[type="checkbox"] { margin-right: 6px; }
        /* Strikethrough */
        .markdown-body del { opacity: 0.5; }
        /* Blockquote */
        .markdown-body blockquote {
          border-left: 3px solid var(--accent);
          margin: 8px 0;
          padding: 4px 12px;
          color: var(--text-secondary);
          font-style: italic;
        }
        /* Headings */
        .markdown-body h1, .markdown-body h2, .markdown-body h3,
        .markdown-body h4, .markdown-body h5, .markdown-body h6 {
          margin: 14px 0 6px;
          font-weight: 700;
          line-height: 1.3;
        }
        .markdown-body h1 { font-size: 18px; }
        .markdown-body h2 { font-size: 16px; }
        .markdown-body h3 { font-size: 14px; }
        /* Inline code */
        .markdown-body code:not(pre code) {
          background: rgba(255,255,255,0.1);
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 12.5px;
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
        }
        /* Code blocks */
        .markdown-body pre {
          background: rgba(0,0,0,0.35);
          padding: 12px 14px;
          border-radius: var(--radius-sm);
          overflow-x: auto;
          margin: 10px 0;
          border: 1px solid var(--border-subtle);
        }
        .markdown-body pre code {
          background: none;
          padding: 0;
          font-size: 12.5px;
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
        }
        .markdown-body strong { font-weight: 700; }
        .markdown-body a { color: var(--accent-hover); text-decoration: underline; text-underline-offset: 2px; }
        .markdown-body hr { border: none; border-top: 1px solid var(--border-subtle); margin: 12px 0; }
      `}</style>
    </div>
  );
}
