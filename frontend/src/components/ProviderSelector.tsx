import { useState, useEffect } from "react";
import { useSettingsStore } from "../store/settings";
import { getModels } from "../api/client";

const PROVIDERS = ["openai", "anthropic", "ollama", "custom"] as const;

interface Props {
  onTestResult?: (ok: boolean) => void;
}

export default function ProviderSelector({ onTestResult }: Props) {
  const {
    provider, apiKeys, baseUrl, model, customStyle,
    setProvider, setApiKey, setBaseUrl, setModel, setCustomStyle, getApiKey,
  } = useSettingsStore();

  const apiKey = getApiKey();

  const [models, setModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "ok" | "err">("idle");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingModels(true);
      try {
        const list = await getModels(
          provider,
          apiKey,
          provider === "custom" ? baseUrl : undefined,
          provider === "custom" ? customStyle : undefined,
        );
        if (!cancelled) {
          setModels(list);
          if (list.length > 0 && !list.includes(model)) setModel(list[0]);
        }
      } catch {
        if (!cancelled) setModels([]);
      } finally {
        if (!cancelled) setLoadingModels(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [provider, apiKey, baseUrl, customStyle]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleTest() {
    setTestStatus("testing");
    try {
      const list = await getModels(
        provider,
        apiKey,
        provider === "custom" ? baseUrl : undefined,
        provider === "custom" ? customStyle : undefined,
      );
      const ok = list.length > 0;
      setTestStatus(ok ? "ok" : "err");
      onTestResult?.(ok);
    } catch {
      setTestStatus("err");
      onTestResult?.(false);
    }
    setTimeout(() => setTestStatus("idle"), 3000);
  }

  return (
    <>
      <form className="ps-form" autoComplete="off" onSubmit={(e) => e.preventDefault()}>
        {/* Provider select */}
        <div className="ps-field">
          <label className="ps-label">Provider</label>
          <div className="ps-radio-group">
            {PROVIDERS.map((p) => (
              <label key={p} className={`ps-radio-opt ${provider === p ? "active" : ""}`}>
                <input type="radio" name="provider" value={p} checked={provider === p} onChange={() => setProvider(p)} />
                {p === "openai" ? "OpenAI" : p === "anthropic" ? "Anthropic" : p === "ollama" ? "Ollama" : "Custom"}
              </label>
            ))}
          </div>
        </div>

        {/* API key */}
        {provider !== "ollama" && (
          <div className="ps-field">
            <label className="ps-label">API Key</label>
            <input
              type="password"
              name={`bloom-api-key-${provider}`}
              autoComplete="off"
              value={apiKeys[provider] ?? ""}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={provider === "openai" ? "sk-..." : provider === "anthropic" ? "sk-ant-..." : "Your API key"}
            />
          </div>
        )}

        {/* Custom provider fields */}
        {provider === "custom" && (
          <>
            <div className="ps-field">
              <label className="ps-label">Base URL</label>
              <input
                type="text"
                name="bloom-base-url"
                autoComplete="off"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://your-api.com/v1"
              />
            </div>

            <div className="ps-field">
              <label className="ps-label">Endpoint style</label>
              <p className="ps-hint">Which API format does your provider use?</p>
              <div className="ps-radio-group">
                {(["openai", "anthropic"] as const).map((style) => (
                  <label key={style} className={`ps-radio-opt ${customStyle === style ? "active" : ""}`}>
                    <input
                      type="radio"
                      name="custom_style"
                      value={style}
                      checked={customStyle === style}
                      onChange={() => setCustomStyle(style)}
                    />
                    {style === "openai" ? "OpenAI-compatible" : "Anthropic-compatible"}
                  </label>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Model dropdown */}
        <div className="ps-field">
          <label className="ps-label">
            Model
            {loadingModels && <span className="ps-loading-dot" />}
          </label>
          <select value={model} onChange={(e) => setModel(e.target.value)} disabled={loadingModels}>
            {loadingModels && <option>Fetching models…</option>}
            {!loadingModels && models.length === 0 && <option value="">No models found</option>}
            {models.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {/* Test button */}
        <button
          type="button"
          className={`ps-test-btn ${testStatus !== "idle" ? testStatus : ""}`}
          onClick={handleTest}
          disabled={testStatus === "testing"}
        >
          {testStatus === "testing" && <span className="ps-test-spinner" />}
          {testStatus === "idle" && "Save & Test Connection"}
          {testStatus === "testing" && "Testing…"}
          {testStatus === "ok" && (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Connected
            </>
          )}
          {testStatus === "err" && (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
              Connection failed
            </>
          )}
        </button>
      </form>

      <style>{`
        .ps-form { display: flex; flex-direction: column; gap: 20px; }

        .ps-field { display: flex; flex-direction: column; gap: 7px; }

        .ps-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11.5px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-family: var(--font-body);
        }

        .ps-loading-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: var(--accent);
          animation: skeletonPulse 1s ease-in-out infinite;
        }

        .ps-hint { font-size: 12px; color: var(--text-muted); margin-bottom: 2px; }

        .ps-radio-group { display: flex; gap: 6px; flex-wrap: wrap; }

        .ps-radio-opt {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 7px 14px;
          border: 1px solid var(--border);
          border-radius: var(--r-sm);
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary);
          cursor: pointer;
          font-family: var(--font-body);
          transition: border-color 140ms, color 140ms, background 140ms, transform 100ms;
        }

        .ps-radio-opt input { display: none; }

        .ps-radio-opt:hover:not(.active) {
          color: var(--text-primary);
          border-color: var(--border-strong);
        }

        .ps-radio-opt:active { transform: scale(0.97); }

        .ps-radio-opt.active {
          border-color: rgba(99,102,241,0.5);
          color: var(--accent-hover);
          background: var(--accent-dim);
        }

        /* Test button */
        .ps-test-btn {
          display: flex;
          align-items: center;
          gap: 7px;
          align-self: flex-start;
          padding: 9px 18px;
          border-radius: var(--r-sm);
          border: 1px solid var(--border);
          background: var(--bg-elevated);
          color: var(--text-secondary);
          font-size: 13px;
          font-weight: 600;
          font-family: var(--font-body);
          transition: background 140ms, border-color 140ms, color 140ms, transform 100ms;
        }

        .ps-test-btn:not(:disabled):hover {
          border-color: var(--border-strong);
          color: var(--text-primary);
        }

        .ps-test-btn:not(:disabled):active { transform: scale(0.97); }
        .ps-test-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .ps-test-btn.ok {
          background: rgba(34,197,94,0.1);
          border-color: rgba(34,197,94,0.35);
          color: var(--success);
        }

        .ps-test-btn.err {
          background: rgba(244,63,94,0.1);
          border-color: rgba(244,63,94,0.35);
          color: var(--danger);
        }

        .ps-test-spinner {
          width: 13px; height: 13px;
          border: 2px solid rgba(255,255,255,0.2);
          border-top-color: var(--text-secondary);
          border-radius: 50%;
          animation: spin 0.65s linear infinite;
        }
      `}</style>
    </>
  );
}
