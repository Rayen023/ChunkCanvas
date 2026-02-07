"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { useAppStore } from "@/app/lib/store";
import { VOYAGE_MODELS, EMBEDDING_MODELS, OPENROUTER_DEFAULT_EMBEDDING_MODEL, OPENROUTER_DEFAULT_EMBEDDING_DIMENSIONS } from "@/app/lib/constants";
import DownloadScriptButton from "../downloads/DownloadScriptButton";
import type { EmbeddingsJson, EmbeddingProvider } from "@/app/lib/types";

/** Format pricing for display: convert per-token price to $/M tokens */
function formatPricing(pricePerToken: string): string {
  const val = parseFloat(pricePerToken);
  if (isNaN(val) || val === 0) return "Free";
  const perMillion = val * 1_000_000;
  if (perMillion < 0.01) return `$${perMillion.toFixed(4)}/M`;
  if (perMillion < 1) return `$${perMillion.toFixed(3)}/M`;
  return `$${perMillion.toFixed(2)}/M`;
}

/** Format context length for display */
function formatCtx(ctx: number): string {
  if (!ctx || ctx === 0) return "?";
  if (ctx >= 1_000_000) return `${(ctx / 1_000_000).toFixed(1)}M`;
  if (ctx >= 1_000) return `${Math.round(ctx / 1_000)}k`;
  return String(ctx);
}

export default function EmbeddingsSection() {
  const editedChunks = useAppStore((s) => s.editedChunks);
  const parsedFilename = useAppStore((s) => s.parsedFilename);
  const pipeline = useAppStore((s) => s.pipeline);

  // Embedding provider
  const embeddingProvider = useAppStore((s) => s.embeddingProvider);
  const setEmbeddingProvider = useAppStore((s) => s.setEmbeddingProvider);

  // Voyage state
  const voyageApiKey = useAppStore((s) => s.voyageApiKey);
  const voyageModel = useAppStore((s) => s.voyageModel);
  const envVoyageKey = useAppStore((s) => s.envKeys.voyage);
  const setVoyageApiKey = useAppStore((s) => s.setVoyageApiKey);
  const setVoyageModel = useAppStore((s) => s.setVoyageModel);

  // OpenRouter state
  const openrouterApiKey = useAppStore((s) => s.openrouterApiKey);
  const envOpenrouterKey = useAppStore((s) => s.envKeys.openrouter);
  const openrouterEmbeddingModel = useAppStore((s) => s.openrouterEmbeddingModel);
  const openrouterEmbeddingDimensions = useAppStore((s) => s.openrouterEmbeddingDimensions);
  const setOpenrouterApiKey = useAppStore((s) => s.setOpenrouterApiKey);
  const setOpenrouterEmbeddingModel = useAppStore((s) => s.setOpenrouterEmbeddingModel);
  const setOpenrouterEmbeddingDimensions = useAppStore((s) => s.setOpenrouterEmbeddingDimensions);

  // Shared embedding state
  const embeddingsData = useAppStore((s) => s.embeddingsData);
  const isEmbedding = useAppStore((s) => s.isEmbedding);
  const embeddingError = useAppStore((s) => s.embeddingError);
  const setEmbeddingsData = useAppStore((s) => s.setEmbeddingsData);
  const setIsEmbedding = useAppStore((s) => s.setIsEmbedding);
  const setEmbeddingError = useAppStore((s) => s.setEmbeddingError);

  const [downloadingJson, setDownloadingJson] = useState(false);

  // OpenRouter embedding models — loaded from generated JSON (run `npm run update-models` to refresh)
  const orEmbeddingModels = useMemo(() => {
    const sorted = [...EMBEDDING_MODELS];
    sorted.sort((a, b) => {
      if (a.id === OPENROUTER_DEFAULT_EMBEDDING_MODEL) return -1;
      if (b.id === OPENROUTER_DEFAULT_EMBEDDING_MODEL) return 1;
      return a.name.localeCompare(b.name);
    });
    return sorted;
  }, []);

  // Auto-fill env keys
  useEffect(() => {
    if (!voyageApiKey && envVoyageKey) setVoyageApiKey(envVoyageKey);
  }, [voyageApiKey, envVoyageKey, setVoyageApiKey]);

  useEffect(() => {
    if (!openrouterApiKey && envOpenrouterKey) setOpenrouterApiKey(envOpenrouterKey);
  }, [openrouterApiKey, envOpenrouterKey, setOpenrouterApiKey]);

  // Ensure selected OR embedding model is valid
  useEffect(() => {
    if (
      embeddingProvider === "openrouter" &&
      orEmbeddingModels.length > 0 &&
      !orEmbeddingModels.find((m) => m.id === openrouterEmbeddingModel)
    ) {
      setOpenrouterEmbeddingModel(orEmbeddingModels[0].id);
    }
  }, [orEmbeddingModels, openrouterEmbeddingModel, embeddingProvider, setOpenrouterEmbeddingModel]);

  // Current active model name for display
  const activeModelLabel = useMemo(() => {
    if (embeddingProvider === "voyage") {
      return VOYAGE_MODELS.find((m) => m.key === voyageModel)?.label ?? voyageModel;
    }
    return orEmbeddingModels.find((m) => m.id === openrouterEmbeddingModel)?.name ?? openrouterEmbeddingModel;
  }, [embeddingProvider, voyageModel, openrouterEmbeddingModel, orEmbeddingModels]);

  // Can generate?
  const canGenerate =
    embeddingProvider === "voyage"
      ? !!voyageApiKey && editedChunks.length > 0
      : !!openrouterApiKey && editedChunks.length > 0;

  // The embedding model key for metadata
  const embeddingModelKey =
    embeddingProvider === "voyage" ? voyageModel : openrouterEmbeddingModel;

  // Generate embeddings
  const handleGenerate = useCallback(async () => {
    if (!canGenerate) return;
    setIsEmbedding(true);
    setEmbeddingError(null);
    setEmbeddingsData(null);

    try {
      if (embeddingProvider === "voyage") {
        const { generateEmbeddings } = await import("@/app/lib/voyage");
        const embeddings = await generateEmbeddings(
          voyageApiKey,
          voyageModel,
          editedChunks,
        );
        setEmbeddingsData(embeddings);
      } else {
        const { generateOpenRouterEmbeddings } = await import("@/app/lib/openrouter");
        const dims = openrouterEmbeddingDimensions > 0 ? openrouterEmbeddingDimensions : undefined;
        const embeddings = await generateOpenRouterEmbeddings(
          openrouterApiKey,
          openrouterEmbeddingModel,
          editedChunks,
          undefined, // batchSize — use default
          dims,
        );
        setEmbeddingsData(embeddings);
      }
    } catch (err) {
      setEmbeddingError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsEmbedding(false);
    }
  }, [
    canGenerate, embeddingProvider,
    voyageApiKey, voyageModel,
    openrouterApiKey, openrouterEmbeddingModel, openrouterEmbeddingDimensions,
    editedChunks,
    setIsEmbedding, setEmbeddingError, setEmbeddingsData,
  ]);

  // Download embeddings JSON
  const handleDownloadEmbeddings = useCallback(async () => {
    if (!embeddingsData) return;
    setDownloadingJson(true);
    try {
      const dims = embeddingsData[0]?.length ?? 0;
      const data: EmbeddingsJson = {
        metadata: {
          source_file: parsedFilename,
          pipeline,
          embedding_model: embeddingModelKey,
          num_chunks: editedChunks.length,
          embedding_dimensions: dims,
        },
        chunks: editedChunks.map((text, i) => ({
          index: i,
          text,
          embedding: embeddingsData[i],
        })),
      };
      const stem = parsedFilename.replace(/\.[^.]+$/, "");
      const { downloadJson } = await import("@/app/lib/downloads");
      await downloadJson(data, `${stem}_embeddings.json`);
    } finally {
      setDownloadingJson(false);
    }
  }, [embeddingsData, editedChunks, parsedFilename, pipeline, embeddingModelKey]);

  if (editedChunks.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-silver-light p-6 space-y-4">
      <h2 className="text-lg font-semibold text-gunmetal">
        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-sandy text-white text-xs font-bold mr-2">
          5
        </span>
        Embeddings
      </h2>

      {/* Provider Toggle */}
      <div>
        <label className="block text-sm font-medium text-gunmetal mb-2">
          Embedding Provider
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => setEmbeddingProvider("openrouter")}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium border transition-colors cursor-pointer ${
              embeddingProvider === "openrouter"
                ? "bg-sandy text-white border-sandy"
                : "bg-white text-gunmetal border-silver hover:border-sandy"
            }`}
          >
            OpenRouter
          </button>
          <button
            onClick={() => setEmbeddingProvider("voyage")}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium border transition-colors cursor-pointer ${
              embeddingProvider === "voyage"
                ? "bg-sandy text-white border-sandy"
                : "bg-white text-gunmetal border-silver hover:border-sandy"
            }`}
          >
            Voyage AI
          </button>
        </div>
      </div>

      {/* ── OpenRouter Embeddings ── */}
      {embeddingProvider === "openrouter" && (
        <>
          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-gunmetal mb-1">
              OpenRouter API Key
            </label>
            <input
              type="password"
              value={openrouterApiKey}
              onChange={(e) => setOpenrouterApiKey(e.target.value)}
              placeholder="sk-or-..."
              className="w-full rounded-lg border border-silver px-3 py-2 text-sm focus:ring-2 focus:ring-sandy/50 focus:border-sandy outline-none"
            />
            {!openrouterApiKey && (
              <p className="mt-1 text-xs text-amber-600">
                An OpenRouter API key is required.
              </p>
            )}
          </div>

          {/* OR Embedding Model */}
          <div>
            <label className="block text-sm font-medium text-gunmetal mb-1">
              Embedding Model
              <span className="ml-2 text-xs text-silver-dark font-normal">
                ({orEmbeddingModels.length} models)
              </span>
            </label>
            <select
              value={openrouterEmbeddingModel}
              onChange={(e) => setOpenrouterEmbeddingModel(e.target.value)}
              className="w-full rounded-lg border border-silver px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-sandy/50 focus:border-sandy outline-none appearance-none"
            >
              {orEmbeddingModels.map((m) => {
                const inPrice = formatPricing(m.pricing.prompt);
                const outPrice = formatPricing(m.pricing.completion);
                const ctx = formatCtx(m.context_length);
                const dims = m.dimensions;
                const dimsLabel = dims ? `${dims}d` : "";
                return (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.id}) — In: {inPrice} · Out: {outPrice}{dimsLabel ? ` · ${dimsLabel}` : ""} · {ctx} ctx
                  </option>
                );
              })}
            </select>
          </div>

          {/* Embedding Dimensions */}
          <div>
            <label className="block text-sm font-medium text-gunmetal mb-1">
              Output Dimensions
              <span className="ml-1 text-xs text-silver-dark font-normal">
                (0 = model default)
              </span>
            </label>
            <input
              type="number"
              min={0}
              step={1}
              value={openrouterEmbeddingDimensions}
              onChange={(e) => setOpenrouterEmbeddingDimensions(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full rounded-lg border border-silver px-3 py-2 text-sm focus:ring-2 focus:ring-sandy/50 focus:border-sandy outline-none"
            />
            <p className="mt-1 text-xs text-silver-dark">
              Reduce dimensions to lower storage costs. Set to 0 to use the model&apos;s native dimensions
              {orEmbeddingModels.find((m) => m.id === openrouterEmbeddingModel)?.dimensions
                ? ` (${orEmbeddingModels.find((m) => m.id === openrouterEmbeddingModel)!.dimensions}d for this model)`
                : ""
              }.
            </p>
          </div>
        </>
      )}

      {/* ── Voyage AI Embeddings ── */}
      {embeddingProvider === "voyage" && (
        <>
          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-gunmetal mb-1">
              Voyage AI API Key
            </label>
            <input
              type="password"
              value={voyageApiKey}
              onChange={(e) => setVoyageApiKey(e.target.value)}
              placeholder="pa-..."
              className="w-full rounded-lg border border-silver px-3 py-2 text-sm focus:ring-2 focus:ring-sandy/50 focus:border-sandy outline-none"
            />
          </div>

          {/* Voyage Model */}
          <div>
            <label className="block text-sm font-medium text-gunmetal mb-1">
              Embedding Model
            </label>
            <select
              value={voyageModel}
              onChange={(e) => setVoyageModel(e.target.value)}
              className="w-full rounded-lg border border-silver px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-sandy/50 focus:border-sandy outline-none appearance-none"
            >
              {VOYAGE_MODELS.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label} — {m.description} ({m.dimensions}d)
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={!canGenerate || isEmbedding}
        className="w-full flex items-center justify-center gap-2 rounded-lg bg-sandy px-4 py-3 text-sm font-medium text-white hover:bg-sandy-light active:bg-sandy-dark disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
      >
        {isEmbedding ? (
          <>
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Generating embeddings with {activeModelLabel}…
          </>
        ) : (
          <>Generate Embeddings</>
        )}
      </button>

      {/* Error */}
      {embeddingError && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700">
          {embeddingError}
        </div>
      )}

      {/* Success + Downloads */}
      {embeddingsData && (
        <div className="space-y-3">
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-700">
            Generated {embeddingsData.length} embeddings (
            {embeddingsData[0]?.length ?? 0} dimensions each) using{" "}
            {embeddingProvider === "voyage" ? "Voyage AI" : "OpenRouter"}.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={handleDownloadEmbeddings}
              disabled={downloadingJson}
              className="flex items-center justify-center gap-2 rounded-lg bg-white border border-silver px-4 py-3 text-sm font-medium text-gunmetal hover:border-sandy hover:text-sandy transition-colors disabled:opacity-50 cursor-pointer"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {downloadingJson ? "Preparing…" : "Download JSON"}
            </button>

            <DownloadScriptButton
              stage="embeddings"
              label="Download Script (.zip)"
            />
          </div>
        </div>
      )}
    </div>
  );
}
