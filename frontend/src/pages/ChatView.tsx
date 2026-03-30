import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import ChatMessage from "../components/ChatMessage";
import { SUBJECTS } from "../constants/subjects";
import { useSettingsStore } from "../store/settings";
import { streamChat } from "../api/client";
import type { ChatMessage as ChatMessageType } from "../types";

export default function ChatView() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const subjectId = Number(id);
  const mode = searchParams.get("mode") ?? "doubt";
  const topicParam = searchParams.get("topic") ?? "";

  const subject = SUBJECTS.find((s) => s.id === subjectId);
  const { provider, apiKey, baseUrl, model, learningStyle, customStyle } = useSettingsStore();

  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [input, setInput] = useState("");
  const [topic, setTopic] = useState(topicParam);
  const [topicConfirmed, setTopicConfirmed] = useState(mode === "doubt" || !!topicParam);
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const providerConfig = { provider, api_key: apiKey, base_url: baseUrl, model, custom_style: customStyle };

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
        body = { subject_id: subjectId, question: text, provider_config: providerConfig };
      } else {
        endpoint = "/api/chat/explain";
        body = { subject_id: subjectId, topic: topic || text, learning_style: learningStyle, provider_config: providerConfig };
      }

      let full = "";
      for await (const chunk of streamChat(endpoint, body)) {
        full += chunk;
        setStreamingContent(full);
      }

      setMessages((prev) => [...prev, { role: "assistant", content: full }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: "assistant", content: "⚠️ Error: couldn't get a response. Check your provider config in Settings." }]);
    } finally {
      setStreaming(false);
      setStreamingContent("");
    }
  }

  const modeLabel = mode === "doubt" ? "Ask a Doubt" : "Explain Again";
  const modeColor = mode === "doubt" ? "#6366f1" : "#0ea5e9";

  return (
    <div className="chat-page">
      <div className="chat-header">
        <button className="back-btn" onClick={() => navigate(`/subject/${subjectId}`)}>← Back</button>
        <div>
          <div className="chat-mode-label" style={{ color: modeColor }}>{modeLabel}</div>
          <div className="chat-subject-name">{subject?.name}</div>
        </div>
        <button className="btn btn-ghost clear-btn" onClick={() => setMessages([])}>Clear</button>
      </div>

      {/* Explain: topic input gate */}
      {mode === "explain" && !topicConfirmed && (
        <div className="topic-gate">
          <p className="topic-gate-label">What topic would you like explained?</p>
          <div className="topic-gate-row">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. ACID properties"
              onKeyDown={(e) => { if (e.key === "Enter" && topic.trim()) setTopicConfirmed(true); }}
              style={{ flex: 1 }}
            />
            <button className="btn btn-primary" onClick={() => { if (topic.trim()) setTopicConfirmed(true); }}>
              Explain →
            </button>
          </div>
        </div>
      )}

      {topicConfirmed && (
        <>
          {mode === "explain" && topic && messages.length === 0 && (
            <div className="topic-chip">Explaining: <strong>{topic}</strong></div>
          )}

          <div className="chat-messages">
            {messages.map((m, i) => <ChatMessage key={i} message={m} />)}

            {streaming && (
              <>
                {streamingContent
                  ? <ChatMessage message={{ role: "assistant", content: streamingContent }} />
                  : <div className="typing-indicator"><span /><span /><span /></div>
                }
              </>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="chat-input-bar">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={mode === "doubt" ? "Ask your question…" : "Follow up…"}
              onKeyDown={(e) => { if (e.key === "Enter") send(input); }}
              disabled={streaming}
              style={{ flex: 1 }}
            />
            <button className="btn btn-primary" onClick={() => send(input)} disabled={streaming || !input.trim()}>
              {streaming ? "…" : "Send"}
            </button>
          </div>
        </>
      )}

      <style>{`
        .chat-page { display: flex; flex-direction: column; height: 100vh; padding: 0; }
        .chat-header {
          display: flex; align-items: center; gap: 14px;
          padding: 18px 28px;
          border-bottom: 1px solid var(--border-subtle);
          background: var(--bg-surface);
          flex-shrink: 0;
        }
        .chat-mode-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; }
        .chat-subject-name { font-size: 15px; font-weight: 600; }
        .clear-btn { margin-left: auto; font-size: 12px; padding: 6px 12px; }
        .topic-gate { padding: 48px 28px 0; max-width: 640px; }
        .topic-gate-label { font-size: 18px; font-weight: 600; margin-bottom: 16px; }
        .topic-gate-row { display: flex; gap: 10px; }
        .topic-chip { margin: 16px 28px 0; padding: 8px 14px; background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-sm); font-size: 13px; color: var(--text-secondary); }
        .chat-messages { flex: 1; overflow-y: auto; padding: 24px 28px; display: flex; flex-direction: column; }
        .chat-input-bar { display: flex; gap: 10px; padding: 16px 28px; border-top: 1px solid var(--border-subtle); background: var(--bg-surface); flex-shrink: 0; }
        .typing-indicator { display: flex; gap: 5px; padding: 14px 16px; background: var(--bg-elevated); border-radius: var(--radius-md); width: fit-content; }
        .typing-indicator span { width: 7px; height: 7px; border-radius: 50%; background: var(--text-muted); animation: bounce 1.2s infinite; }
        .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
        .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes bounce { 0%,60%,100% { transform: translateY(0); } 30% { transform: translateY(-6px); } }
      `}</style>
    </div>
  );
}
