import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams, useNavigate, useLocation } from "react-router-dom";
import ChatMessage from "../components/ChatMessage";
import { useSettingsStore } from "../store/settings";
import { streamChat } from "../api/client";
import type { ChatMessage as ChatMessageType } from "../types";

export default function ChatView() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const subjectId = Number(id);
  const mode = searchParams.get("mode") ?? "doubt";
  const topicParam = searchParams.get("topic") ?? "";
  const noteIds: number[] = (location.state as { noteIds?: number[] })?.noteIds ?? [];

  const [subjectName, setSubjectName] = useState("");
  const { provider, baseUrl, model, learningStyle, customStyle, getApiKey } = useSettingsStore();

  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [input, setInput] = useState("");
  const [topic, setTopic] = useState(topicParam);
  const [topicConfirmed, setTopicConfirmed] = useState(mode === "doubt" || !!topicParam);
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`http://localhost:8000/api/notes/subjects`)
      .then(r => r.json())
      .then((subjects: { id: number; name: string }[]) => {
        const s = subjects.find(x => x.id === subjectId);
        if (s) setSubjectName(s.name);
      })
      .catch(() => {});
  }, [subjectId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  useEffect(() => {
    if (mode === "explain" && topicParam) {
      send(topicParam);
    }
  }, []);

  // Focus input when topic confirmed
  useEffect(() => {
    if (topicConfirmed) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [topicConfirmed]);

  const providerConfig = { provider, api_key: getApiKey(), base_url: baseUrl, model, custom_style: customStyle };

  async function send(text: string) {
    if (!text.trim() || streaming) return;

    const userMsg: ChatMessageType = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setStreaming(true);
    setStreamingContent("");

    try {
      let endpoint = "/api/chat/doubt";
      let body: object;

      if (mode === "doubt") {
        endpoint = "/api/chat/doubt";
        body = { subject_id: subjectId, question: text, note_ids: noteIds, provider_config: providerConfig };
      } else {
        endpoint = "/api/chat/explain";
        body = { subject_id: subjectId, topic: text, learning_style: learningStyle, note_ids: noteIds, provider_config: providerConfig };
      }

      let full = "";
      for await (const chunk of streamChat(endpoint, body)) {
        full += chunk;
        setStreamingContent(full);
      }

      setMessages((prev) => [...prev, { role: "assistant", content: full }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "⚠️ Couldn't get a response. Check your provider config in Settings." }]);
    } finally {
      setStreaming(false);
      setStreamingContent("");
    }
  }

  const modeLabel = mode === "doubt" ? "Ask a Doubt" : "Explain Again";
  const modeAccent = mode === "doubt" ? "#818cf8" : "#38bdf8";

  return (
    <div className="chat-page">
      {/* Header */}
      <div className="chat-header">
        <button className="back-btn" onClick={() => navigate(`/subject/${subjectId}`)}>← Back</button>

        <div className="chat-header-center">
          <span className="chat-mode-pill" style={{ color: modeAccent, borderColor: `${modeAccent}40`, background: `${modeAccent}12` }}>
            {modeLabel}
          </span>
          <span className="chat-subject-name">{subjectName || `Subject ${subjectId}`}</span>
        </div>

        <button
          className="chat-clear-btn"
          onClick={() => setMessages([])}
          disabled={messages.length === 0}
          title="Clear conversation"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
          </svg>
          Clear
        </button>
      </div>

      {/* Topic gate for Explain mode */}
      {mode === "explain" && !topicConfirmed && (
        <div className="chat-topic-gate">
          <p className="chat-topic-gate-label">What topic would you like explained?</p>
          <div className="chat-topic-gate-row">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. ACID properties, OSI model, Dijkstra's algorithm…"
              onKeyDown={(e) => {
                if (e.key === "Enter" && topic.trim()) {
                  setTopicConfirmed(true);
                  send(topic);
                }
              }}
              autoFocus
            />
            <button
              className="btn btn-primary"
              onClick={() => {
                if (topic.trim()) {
                  setTopicConfirmed(true);
                  send(topic);
                }
              }}
            >
              Explain →
            </button>
          </div>
        </div>
      )}

      {/* Chat area */}
      {topicConfirmed && (
        <>
          {mode === "explain" && topic && messages.length === 0 && (
            <div className="chat-topic-chip">
              Explaining <strong>{topic}</strong>
            </div>
          )}

          <div className="chat-messages">
            {messages.length === 0 && !streaming && (
              <div className="chat-empty-state">
                <div className="chat-empty-icon">
                  {mode === "doubt" ? (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                  ) : (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                    </svg>
                  )}
                </div>
                <p>{mode === "doubt" ? "Ask anything about your notes." : "Type your first follow-up or wait for the explanation."}</p>
              </div>
            )}

            {messages.map((m, i) => <ChatMessage key={i} message={m} />)}

            {streaming && (
              <>
                {streamingContent
                  ? <ChatMessage message={{ role: "assistant", content: streamingContent }} isStreaming />
                  : (
                    <div className="chat-typing">
                      <span /><span /><span />
                    </div>
                  )
                }
              </>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="chat-input-bar">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={mode === "doubt" ? "Ask your question…" : "Follow up…"}
              onKeyDown={(e) => { if (e.key === "Enter") send(input); }}
              disabled={streaming}
            />
            <button
              className="chat-send-btn"
              onClick={() => send(input)}
              disabled={streaming || !input.trim()}
              aria-label="Send"
            >
              {streaming ? (
                <span className="chat-send-spinner" />
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              )}
            </button>
          </div>
        </>
      )}

      <style>{`
        .chat-page {
          display: flex;
          flex-direction: column;
          height: 100vh;
          overflow: hidden;
        }

        /* Header */
        .chat-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 24px;
          border-bottom: 1px solid var(--border-subtle);
          background: var(--bg-surface);
          flex-shrink: 0;
        }

        .chat-header-center {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
          min-width: 0;
        }

        .chat-mode-pill {
          display: inline-block;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.10em;
          text-transform: uppercase;
          padding: 2px 8px;
          border-radius: 99px;
          border: 1px solid;
          font-family: var(--font-mono);
          width: fit-content;
        }

        .chat-subject-name {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .chat-clear-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border: 1px solid var(--border);
          border-radius: var(--r-sm);
          font-size: 12.5px;
          font-weight: 500;
          color: var(--text-muted);
          font-family: var(--font-body);
          flex-shrink: 0;
          transition: color 140ms, border-color 140ms, transform 100ms;
        }
        .chat-clear-btn:not(:disabled):hover { color: var(--danger); border-color: rgba(244,63,94,0.35); }
        .chat-clear-btn:not(:disabled):active { transform: scale(0.96); }
        .chat-clear-btn:disabled { opacity: 0.3; cursor: not-allowed; }

        /* Topic gate */
        .chat-topic-gate {
          padding: 56px 28px 0;
          max-width: 640px;
          animation: fadeUp 220ms var(--ease-out) both;
        }

        .chat-topic-gate-label {
          font-size: 20px;
          font-weight: 600;
          margin-bottom: 18px;
          font-family: var(--font-display);
          color: var(--text-primary);
        }

        .chat-topic-gate-row {
          display: flex;
          gap: 10px;
        }

        .chat-topic-gate-row input {
          flex: 1;
          width: auto;
        }

        /* Topic chip */
        .chat-topic-chip {
          margin: 16px 24px 0;
          padding: 7px 13px;
          background: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
          border-radius: var(--r-sm);
          font-size: 12.5px;
          color: var(--text-muted);
          display: inline-block;
          animation: fadeUp 200ms var(--ease-out) both;
        }

        .chat-topic-chip strong {
          color: var(--text-secondary);
          font-weight: 600;
        }

        /* Messages */
        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 24px 24px;
          display: flex;
          flex-direction: column;
        }

        /* Empty state */
        .chat-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          margin: auto;
          color: var(--text-muted);
          font-size: 13.5px;
          text-align: center;
          opacity: 0.7;
          animation: fadeUp 300ms var(--ease-out) 200ms both;
        }

        .chat-empty-icon {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
        }

        /* Typing indicator */
        .chat-typing {
          display: flex;
          gap: 5px;
          padding: 14px 16px;
          background: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
          border-radius: var(--r-md);
          border-bottom-left-radius: 3px;
          width: fit-content;
          margin-bottom: 12px;
        }
        .chat-typing span {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: var(--text-muted);
          animation: typingDot 1.2s ease infinite;
        }
        .chat-typing span:nth-child(2) { animation-delay: 0.18s; }
        .chat-typing span:nth-child(3) { animation-delay: 0.36s; }

        /* Input bar */
        .chat-input-bar {
          display: flex;
          gap: 10px;
          align-items: center;
          padding: 14px 24px;
          border-top: 1px solid var(--border-subtle);
          background: var(--bg-surface);
          flex-shrink: 0;
        }

        .chat-input-bar input {
          flex: 1;
          width: auto;
        }

        .chat-send-btn {
          width: 40px;
          height: 40px;
          border-radius: var(--r-sm);
          background: var(--accent);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: background 140ms, transform 100ms, opacity 140ms;
        }
        .chat-send-btn:not(:disabled):hover { background: var(--accent-hover); }
        .chat-send-btn:not(:disabled):active { transform: scale(0.94); }
        .chat-send-btn:disabled { opacity: 0.35; cursor: not-allowed; }

        .chat-send-spinner {
          width: 15px; height: 15px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.65s linear infinite;
        }
      `}</style>
    </div>
  );
}
