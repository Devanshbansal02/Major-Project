import ReactMarkdown from "react-markdown";
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
            <ReactMarkdown>{message.content}</ReactMarkdown>
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
        .markdown-body p { margin-bottom: 8px; }
        .markdown-body p:last-child { margin-bottom: 0; }
        .markdown-body ul, .markdown-body ol { padding-left: 20px; margin-bottom: 8px; }
        .markdown-body li { margin-bottom: 4px; }
        .markdown-body code {
          background: rgba(255,255,255,0.08);
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 13px;
          font-family: monospace;
        }
        .markdown-body pre {
          background: rgba(0,0,0,0.3);
          padding: 12px;
          border-radius: var(--radius-sm);
          overflow-x: auto;
          margin: 8px 0;
        }
        .markdown-body pre code { background: none; padding: 0; }
        .markdown-body strong { color: #fff; }
      `}</style>
    </div>
  );
}
