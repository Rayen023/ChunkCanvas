"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { useAppStore } from "@/app/lib/store";
import { useTheme } from "next-themes";
import ChunkCard from "./ChunkCard";
import { countTokens } from "@/app/lib/tokenizer";

export default function ChunkList() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const editedChunks = useAppStore((s) => s.editedChunks);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const chunkSourceFiles = useAppStore((s) => s.chunkSourceFiles);
  const updateChunk = useAppStore((s) => s.updateChunk);
  const deleteChunk = useAppStore((s) => s.deleteChunk);
  const allChunksCollapsed = useAppStore((s) => s.allChunksCollapsed);
  const setAllChunksCollapsed = useAppStore((s) => s.setAllChunksCollapsed);

  const onUpdate = useCallback(
    (index: number, text: string) => updateChunk(index, text),
    [updateChunk],
  );

  const onDelete = useCallback(
    (index: number) => deleteChunk(index),
    [deleteChunk],
  );

  const totalTokens = useMemo(() => {
    return editedChunks.reduce((acc, chunk) => acc + countTokens(chunk), 0);
  }, [editedChunks]);

  if (editedChunks.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gunmetal whitespace-nowrap">Chunks</h2>
          <div className="flex items-center gap-1.5 text-xs text-silver-dark border-l border-silver-light/60 pl-3">
            <span className="h-1 w-1 rounded-full bg-sandy" />
            Changes auto-save as you edit
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setAllChunksCollapsed(!allChunksCollapsed)}
            className="flex items-center gap-1.5 rounded-lg border border-silver-light px-3 py-1.5 text-xs font-medium text-gunmetal-light hover:border-sandy hover:text-sandy transition-colors cursor-pointer"
          >
            {allChunksCollapsed ? (
              <>
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
                Expand All
              </>
            ) : (
              <>
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                </svg>
                Collapse All
              </>
            )}
          </button>
          <span className="text-sm text-gunmetal-light">
            <strong>{editedChunks.length}</strong> chunks
            <span className="mx-2 text-silver">•</span>
            <strong>{totalTokens.toLocaleString()}</strong> tokens
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {editedChunks.map((text, i) => (
          <ChunkCard
            key={`chunk-${i}`}
            index={i}
            text={text}
            sourceFile={chunkSourceFiles[i]}
            onUpdate={onUpdate}
            onDelete={onDelete}
            forceCollapsed={allChunksCollapsed}
            isLightMode={mounted && resolvedTheme === "light"}
          />
        ))}
      </div>
    </div>
  );
}
