"use client";

import { useCallback, useState } from "react";
import { useAppStore } from "@/app/lib/store";

export default function ChromaStatus() {
  const localUrl = useAppStore((s) => s.chromaLocalUrl);
  const setLocalUrl = useAppStore((s) => s.setChromaLocalUrl);

  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const [message, setMessage] = useState<string>("");
  const [checking, setChecking] = useState(false);
  const [showExamples, setShowExamples] = useState(false);

  const check = useCallback(async () => {
    setChecking(true);
    setStatus("idle");
    setMessage("");

    try {
      const base = localUrl.replace(/\/+$/, "");
      const res = await fetch(`${base}/api/v1/heartbeat`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStatus("ok");
      setMessage("Chroma server is reachable");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setChecking(false);
    }
  }, [localUrl]);

  const cliExample = [
    "pip install chromadb",
    "chroma run --host localhost --port 8000 --path ./my_chroma_data",
  ].join("\n");

  const dockerExample = [
    "docker run -d --rm --name chromadb \\",
    "  -p 8000:8000 \\",
    "  -v ./chroma:/chroma/chroma \\",
    "  -e IS_PERSISTENT=TRUE \\",
    "  -e ANONYMIZED_TELEMETRY=TRUE \\",
    "  chromadb/chroma:0.6.3",
  ].join("\n");

  return (
    <details className="group">
      <summary className="cursor-pointer text-sm font-semibold text-gunmetal flex items-center gap-2">
        <svg
          className="h-4 w-4 transition-transform group-open:rotate-90"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        Chroma Server Status
      </summary>

      <div className="mt-3 space-y-2 p-3 rounded-lg bg-gray-50 dark:bg-white/5 border border-silver-light/50">
        <label className="block text-xs text-gunmetal-light">Chroma URL</label>
        <input
          type="text"
          value={localUrl}
          onChange={(e) => setLocalUrl(e.target.value)}
          placeholder="http://localhost:8000"
          className="w-full rounded-lg border border-silver px-3 py-1.5 text-sm focus:ring-2 focus:ring-sandy/50 focus:border-sandy outline-none"
        />

        <button
          onClick={check}
          disabled={checking}
          className="w-full rounded-lg bg-sandy px-3 py-1.5 text-sm font-medium text-white hover:bg-sandy-light active:bg-sandy-dark disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
        >
          {checking ? "Checking…" : "Check"}
        </button>

        {status === "ok" && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2 text-xs text-emerald-700">
            <span className="font-semibold">&#x2714; {message}</span>
          </div>
        )}

        {status === "error" && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-2 text-xs text-amber-700">
            {message || "Chroma is not reachable"}
          </div>
        )}

        <div className="mt-1">
          <button
            type="button"
            onClick={() => setShowExamples((v) => !v)}
            className="text-[10px] text-sandy hover:underline cursor-pointer"
          >
            {showExamples ? "Hide example commands" : "Show example commands"}
          </button>
          {showExamples && (
            <div className="mt-2 space-y-2">
              <div className="p-2 bg-slate-900 rounded text-[10px] font-mono text-slate-300 break-all select-all">
                {cliExample}
              </div>
              <div className="p-2 bg-slate-900 rounded text-[10px] font-mono text-slate-300 break-all select-all">
                {dockerExample}
              </div>
            </div>
          )}
        </div>
      </div>
    </details>
  );
}
