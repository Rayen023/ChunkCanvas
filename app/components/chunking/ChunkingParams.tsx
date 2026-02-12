"use client";

import { useMemo, useState } from "react";
import { useAppStore } from "@/app/lib/store";
import {
  DEFAULT_SEPARATORS,
  DEFAULT_SEPARATOR_LABELS,
  DEFAULT_CHUNK_SIZE,
  DEFAULT_CHUNK_OVERLAP,
} from "@/app/lib/constants";
import { ChunkingParams as ChunkingParamsType } from "@/app/lib/types";

/** All known separators the user can toggle on/off */
const ALL_SEPARATORS = DEFAULT_SEPARATORS;

export default function ChunkingParams() {
  const chunkingParams = useAppStore((s) => s.chunkingParams);
  const setChunkingParams = useAppStore((s) => s.setChunkingParams);
  const resetChunkingDefaults = useAppStore((s) => s.resetChunkingDefaults);
  const editedChunks = useAppStore((s) => s.editedChunks);
  const parsedContent = useAppStore((s) => s.parsedContent);
  const [showCustom, setShowCustom] = useState(false);
  const [customSep, setCustomSep] = useState("");

  const maxContentLength = useMemo(() => {
    return parsedContent ? parsedContent.length : 8192;
  }, [parsedContent]);

  /** Whether current params differ from defaults */
  const isModified = useMemo(() => {
    if (chunkingParams.chunkingType !== "recursive") return true;
    if (chunkingParams.chunkSize !== DEFAULT_CHUNK_SIZE) return true;
    if (chunkingParams.chunkOverlap !== DEFAULT_CHUNK_OVERLAP) return true;
    if (chunkingParams.separators.length !== DEFAULT_SEPARATORS.length) return true;
    return chunkingParams.separators.some((s, i) => s !== DEFAULT_SEPARATORS[i]);
  }, [chunkingParams]);

  const activeSeps = useMemo(
    () => new Set(chunkingParams.separators),
    [chunkingParams.separators],
  );

  /** Handle chunk size change with auto-clamping for overlap */
  const handleChunkSizeChange = (size: number) => {
    const nextSize = Math.max(128, size);
    const updates: Partial<ChunkingParamsType> = { chunkSize: nextSize };
    
    // Force overlap to be at most 50% of chunk size or at least less than chunk size
    if (chunkingParams.chunkOverlap >= nextSize) {
      updates.chunkOverlap = Math.floor(nextSize / 2);
    }
    
    setChunkingParams(updates);
  };

  /** Toggle a separator on/off */
  const toggleSep = (sep: string) => {
    const next = activeSeps.has(sep)
      ? chunkingParams.separators.filter((s) => s !== sep)
      : [...chunkingParams.separators, sep];
    setChunkingParams({ separators: next });
  };

  /** Add a custom separator */
  const addCustom = () => {
    const sep = customSep
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "\t");
    if (!sep || activeSeps.has(sep)) return;
    setChunkingParams({ separators: [...chunkingParams.separators, sep] });
    setCustomSep("");
    setShowCustom(false);
  };

  /** Remove a custom (non-default) separator */
  const removeCustomSep = (sep: string) => {
    setChunkingParams({
      separators: chunkingParams.separators.filter((s) => s !== sep),
    });
  };

  /** Human-readable label for a separator */
  const label = (sep: string): string =>
    DEFAULT_SEPARATOR_LABELS[sep] ??
    JSON.stringify(sep).slice(1, -1); // fallback: escaped string

  // Custom separators that aren't in the default list
  const extraSeps = chunkingParams.separators.filter(
    (s) => !ALL_SEPARATORS.includes(s),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-gunmetal">
            Chunking Parameters
          </h3>
          {editedChunks.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-sandy/10 px-2 py-0.5 text-xs font-semibold text-sandy tabular-nums">
              {editedChunks.length}
              <span className="text-[10px] font-medium text-sandy/70">Chunk{editedChunks.length !== 1 ? "s" : ""}</span>
            </span>
          )}
        </div>
        {isModified && (
          <button
            type="button"
            onClick={resetChunkingDefaults}
            className="flex items-center gap-1 rounded-md border border-silver-light px-2 py-1 text-[11px] font-medium text-silver-dark hover:border-sandy hover:text-sandy transition-colors cursor-pointer"
            title="Reset chunking parameters to defaults"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Defaults
          </button>
        )}
      </div>

      {/* Chunking Type Selector */}
      <div>
        <label className="block text-sm font-medium text-gunmetal mb-2">
          Chunking Strategy
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Recursive */}
          <button
            type="button"
            onClick={() => setChunkingParams({ chunkingType: "recursive" })}
            className={`
              relative flex items-start gap-3 rounded-xl border p-4 text-left transition-all cursor-pointer
              ${chunkingParams.chunkingType === "recursive"
                ? "border-sandy bg-sandy/5 ring-1 ring-sandy shadow-sm"
                : "border-silver-light bg-card hover:border-sandy hover:bg-sandy/5"
              }
            `}
          >
            <div className={`mt-0.5 shrink-0 rounded-lg p-2.5 transition-colors ${chunkingParams.chunkingType === "recursive" ? "bg-sandy text-white" : "bg-silver/20 text-gunmetal"}`}>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <div>
              <div className="font-semibold text-sm text-gunmetal">Recursive Character</div>
              <div className="text-xs text-silver-dark mt-1 leading-relaxed">
                Splits text by separators (newlines, spaces) to fit within a specific size. Best for general text.
              </div>
            </div>
          </button>

          {/* Parent-Child */}
          <button
            type="button"
            onClick={() => setChunkingParams({ chunkingType: "parent-child" })}
            className={`
              relative flex items-start gap-3 rounded-xl border p-4 text-left transition-all cursor-pointer
              ${chunkingParams.chunkingType === "parent-child"
                ? "border-sandy bg-sandy/5 ring-1 ring-sandy shadow-sm"
                : "border-silver-light bg-card hover:border-sandy hover:bg-sandy/5"
              }
            `}
          >
            <div className={`mt-0.5 shrink-0 rounded-lg p-2.5 transition-colors ${chunkingParams.chunkingType === "parent-child" ? "bg-sandy text-white" : "bg-silver/20 text-gunmetal"}`}>
               <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                 <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />
                 <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
               </svg>
            </div>
            <div>
              <div className="font-semibold text-sm text-gunmetal">Parent-Child</div>
              <div className="text-xs text-silver-dark mt-1 leading-relaxed">
                Creates large parent chunks for context and small child chunks for precise retrieval.
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Separators — tag cloud */}
      {chunkingParams.chunkingType === "recursive" ? (
        <>
          <div>
            <label className="block text-xs font-medium text-gunmetal-light mb-2">
              Separators
              <span className="ml-1.5 text-[10px] text-silver-dark font-normal">
                (ordered coarsest → finest; click to toggle)
              </span>
            </label>

            <div className="flex flex-wrap gap-1.5">
              {ALL_SEPARATORS.map((sep) => {
                const active = activeSeps.has(sep);
                return (
                  <button
                    key={sep}
                    type="button"
                    onClick={() => toggleSep(sep)}
                    className={`
                      inline-flex items-center rounded-md border px-2.5 py-1 text-[11px] font-medium transition-all cursor-pointer 
                      ${active
                        ? "border-sandy bg-sandy/10 text-sandy-dark"
                        : "border-silver-light bg-card text-silver-dark line-through opacity-60 hover:opacity-80"
                      }
                    `}
                    title={active ? `Click to remove "${label(sep)}"` : `Click to add "${label(sep)}"`}
                  >
                    {label(sep)}
                  </button>
                );
              })}

              {/* Extra custom separators */}
              {extraSeps.map((sep) => (
                <span
                  key={sep}
                  className="inline-flex items-center gap-1 rounded-md border border-sandy bg-sandy/10 px-2.5 py-1 text-[11px] font-medium text-sandy-dark"
                >
                  {label(sep)}
                  <button
                    type="button"
                    onClick={() => removeCustomSep(sep)}
                    className="ml-0.5 hover:text-red-500 transition-colors cursor-pointer"
                    title="Remove custom separator"
                  >
                    &times;
                  </button>
                </span>
              ))}

              {/* Add custom separator */}
              {showCustom ? (
                <span className="inline-flex items-center gap-1">
                  <input
                    type="text"
                    value={customSep}
                    onChange={(e) => setCustomSep(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addCustom()}
                    placeholder="e.g. \\n\\n or |"
                    className="w-28 rounded-md border border-silver px-2 py-1 text-[11px] focus:ring-1 focus:ring-sandy/50 focus:border-sandy outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={addCustom}
                    className="rounded-md bg-sandy px-2 py-1 text-[11px] font-medium text-white hover:bg-sandy-light transition-colors cursor-pointer"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowCustom(false); setCustomSep(""); }}
                    className="text-silver-dark hover:text-gunmetal transition-colors text-xs cursor-pointer"
                  >
                    &times;
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowCustom(true)}
                  className="inline-flex items-center rounded-md border border-dashed border-silver px-2.5 py-1 text-[11px] text-silver-dark hover:border-sandy hover:text-sandy transition-colors cursor-pointer"
                >
                  + Custom
                </button>
              )}
            </div>

            <p className="mt-2 text-[10px] text-silver-dark leading-relaxed">
              The splitter tries separators left-to-right, keeping paragraphs and tables intact when possible.
            </p>
          </div>

          <div className="space-y-4">
            {/* Chunk size */}
            <div className="rounded-lg border border-silver bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-gunmetal">
                  Maximum Chunk Length (Characters)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={128}
                    step={128}
                    value={chunkingParams.chunkSize}
                    onChange={(e) => handleChunkSizeChange(Number(e.target.value))}
                    className="w-20 rounded border border-silver px-2 py-1 text-right text-xs font-mono font-medium text-sandy tabular-nums focus:ring-1 focus:ring-sandy/50 focus:border-sandy outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-[10px] font-medium text-silver-dark uppercase tracking-wider">Chars</span>
                </div>
              </div>
              <div className="space-y-1">
                <input
                  type="range"
                  min={128}
                  max={Math.max(128, maxContentLength)}
                  step={128}
                  value={chunkingParams.chunkSize}
                  onChange={(e) => handleChunkSizeChange(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-sandy bg-silver/40 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-sandy [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-sandy [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-medium text-silver-dark tabular-nums">
                  <span>128</span>
                  <span>{Math.max(128, maxContentLength)}</span>
                </div>
              </div>
            </div>

            {/* Chunk overlap */}
            <div className="rounded-lg border border-silver bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-gunmetal">
                  Chunk Overlap (Characters)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={chunkingParams.chunkSize - 1}
                    step={10}
                    value={chunkingParams.chunkOverlap}
                    onChange={(e) => setChunkingParams({ chunkOverlap: Math.min(Number(e.target.value), chunkingParams.chunkSize - 1) })}
                    className="w-20 rounded border border-silver px-2 py-1 text-right text-xs font-mono font-medium text-sandy tabular-nums focus:ring-1 focus:ring-sandy/50 focus:border-sandy outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-[10px] font-medium text-silver-dark uppercase tracking-wider">Chars</span>
                </div>
              </div>
              <div className="space-y-1">
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, chunkingParams.chunkSize - 1)}
                  step={10}
                  value={chunkingParams.chunkOverlap}
                  onChange={(e) => setChunkingParams({ chunkOverlap: Number(e.target.value) })}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-sandy bg-silver/40 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-sandy [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-sandy [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-medium text-silver-dark tabular-nums">
                  <span>0</span>
                  <span>{Math.max(0, chunkingParams.chunkSize - 1)}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-lg border border-silver-light bg-card p-4 text-center">
          <p className="text-xs text-silver-dark italic">
            Hierarchical parent-child chunking parameters will be configurable here in a future update.
          </p>
        </div>
      )}
    </div>
  );
}
