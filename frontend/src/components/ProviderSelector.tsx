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

  // Current provider's key, derived from per-provider map
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
    // Re-run when provider changes, or the current provider's key/baseUrl/customStyle changes
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
    <div className="provider-sel">
      <div className="field">
        <label>Provider</label>
        <div className="radio-group">
          {PROVIDERS.map((p) => (
            <label key={p} className={`radio-opt ${provider === p ? "active" : ""}`}>
              <input type="radio" name="provider" value={p} checked={provider === p} onChange={() => setProvider(p)} />
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </label>
          ))}
        </div>
      </div>

      {provider !== "ollama" && (
        <div className="field">
          <label>API Key</label>
          {/* Each provider shows its own persisted key independently */}
          <input
            type="password"
            name={`bloom-api-key-${provider}`}
            autoComplete="new-password"
            value={apiKeys[provider] ?? ""}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            style={{ width: "100%" }}
          />
        </div>
      )}

      {provider === "custom" && (
        <>
          <div className="field">
            <label>Base URL</label>
            <input type="text" name="bloom-base-url" autoComplete="off" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://your-api.com/v1" style={{ width: "100%" }} />
          </div>

          <div className="field">
            <label>Endpoint Style</label>
            <p className="field-hint">Does your custom provider use the OpenAI API format or the Anthropic API format?</p>
            <div className="radio-group">
              {(["openai", "anthropic"] as const).map((style) => (
                <label key={style} className={`radio-opt ${customStyle === style ? "active" : ""}`}>
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

      <div className="field">
        <label>Model</label>
        <select value={model} onChange={(e) => setModel(e.target.value)} disabled={loadingModels} style={{ width: "100%" }}>
          {loadingModels && <option>Fetching models…</option>}
          {!loadingModels && models.length === 0 && <option value="">No models found</option>}
          {models.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <button
        className={`btn btn-primary test-btn ${testStatus !== "idle" ? testStatus : ""}`}
        onClick={handleTest}
        disabled={testStatus === "testing"}
      >
        {testStatus === "testing" ? "Testing…" : testStatus === "ok" ? "✓ Connected" : testStatus === "err" ? "✗ Failed" : "Save & Test"}
      </button>

      <style>{`
        .provider-sel { display: flex; flex-direction: column; gap: 18px; }
        .field { display: flex; flex-direction: column; gap: 6px; }
        .field > label { font-size: 12px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.06em; }
        .field-hint { font-size: 12px; color: var(--text-muted); margin: 0 0 4px; }
        .radio-group { display: flex; gap: 8px; flex-wrap: wrap; }
        .radio-opt {
          display: flex; align-items: center; gap: 6px;
          padding: 8px 14px;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 150ms ease;
        }
        .radio-opt input { display: none; }
        .radio-opt.active { border-color: var(--accent); color: var(--accent-hover); background: color-mix(in srgb, var(--accent) 10%, transparent); }
        .radio-opt:hover:not(.active) { border-color: var(--border); color: var(--text-primary); }
        .test-btn { align-self: flex-start; }
        .test-btn.ok { background: var(--success); }
        .test-btn.err { background: var(--danger); }
      `}</style>
    </div>
  );
}
