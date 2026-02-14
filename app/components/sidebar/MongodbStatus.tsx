"use client";

import { useCallback, useState } from "react";
import { useAppStore } from "@/app/lib/store";
import StatusMessage from "@/app/components/shared/StatusMessage";

export default function MongodbStatus() {
  const mongodbUri = useAppStore((s) => s.mongodbUri);
  const setMongodbUri = useAppStore((s) => s.setMongodbUri);

  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const [message, setMessage] = useState<string>("");
  const [checking, setChecking] = useState(false);

  const check = useCallback(async () => {
    if (!mongodbUri) {
      setStatus("error");
      setMessage("Connection string is required");
      return;
    }

    setChecking(true);
    setStatus("idle");
    setMessage("");

    try {
      const res = await fetch("/api/mongodb/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uri: mongodbUri }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || `HTTP ${res.status}`);
      setStatus("ok");
      setMessage("MongoDB Atlas is reachable");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setChecking(false);
    }
  }, [mongodbUri]);

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
        MongoDB Atlas Status
      </summary>

      <div className="mt-3 space-y-2 p-3 rounded-lg bg-config-bg border border-config-border">
        <div className="flex items-center justify-between">
          <label className="block text-xs text-gunmetal-light">Connection String</label>
          <button
            onClick={check}
            disabled={checking}
            className="text-xs text-sandy hover:text-sandy-dark cursor-pointer disabled:opacity-50 flex items-center gap-1"
          >
            {checking ? "Refreshing..." : "Refresh"}
          </button>
        </div>
        <input
          type="password"
          value={mongodbUri}
          onChange={(e) => setMongodbUri(e.target.value)}
          placeholder="mongodb+srv://..."
          className="w-full rounded-lg border border-silver bg-card text-gunmetal px-3 py-1.5 text-sm focus:ring-2 focus:ring-sandy/50 focus:border-sandy outline-none"
        />

        <button
          onClick={check}
          disabled={checking}
          className="w-full rounded-lg bg-sandy px-3 py-1.5 text-sm font-medium text-white hover:bg-sandy-light active:bg-sandy-dark disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
        >
          {checking ? "Checking…" : "Check Connection"}
        </button>

        {status === "ok" && (
          <StatusMessage type="success" label="Success:">
            <span className="font-semibold">&#x2714; {message}</span>
          </StatusMessage>
        )}

        {status === "error" && (
          <StatusMessage type="error" label="Error:">
            {message || "MongoDB is not reachable"}
          </StatusMessage>
        )}
      </div>
    </details>
  );
}
