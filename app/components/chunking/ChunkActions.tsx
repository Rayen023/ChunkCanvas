"use client";

import { useCallback, useState } from "react";
import { useAppStore } from "@/app/lib/store";
import { PIPELINE } from "@/app/lib/constants";
import ActionRow from "@/app/components/downloads/ActionRow";
import type { ChunksJson } from "@/app/lib/types";
import type { ScriptConfig } from "@/app/lib/script-generator";

export default function ChunkActions() {
  const editedChunks = useAppStore((s) => s.editedChunks);
  const parsedFilename = useAppStore((s) => s.parsedFilename);
  const pipeline = useAppStore((s) => s.pipeline);
  const chunkingParams = useAppStore((s) => s.chunkingParams);
  
  // Script dependencies
  const openrouterModel = useAppStore((s) => s.openrouterModel);
  const openrouterPrompt = useAppStore((s) => s.openrouterPrompt);
  const pdfEngine = useAppStore((s) => s.pdfEngine);
  const excelColumn = useAppStore((s) => s.excelColumn);
  const excelSheet = useAppStore((s) => s.excelSheet);
  const embeddingProvider = useAppStore((s) => s.embeddingProvider);
  const voyageModel = useAppStore((s) => s.voyageModel);
  const cohereModel = useAppStore((s) => s.cohereModel);
  const openrouterEmbeddingModel = useAppStore((s) => s.openrouterEmbeddingModel);
  const embeddingDimensions = useAppStore((s) => s.embeddingDimensions);
  const pineconeIndexName = useAppStore((s) => s.pineconeIndexName);
  const pineconeEnvKey = useAppStore((s) => s.pineconeEnvKey);

  const [downloadingJson, setDownloadingJson] = useState(false);
  const [generatingScript, setGeneratingScript] = useState(false);

  const handleDownloadJson = useCallback(async () => {
    setDownloadingJson(true);
    try {
      const data: ChunksJson = {
        metadata: {
          source_file: parsedFilename,
          pipeline,
          num_chunks: editedChunks.length,
        },
        chunks: editedChunks.map((text, i) => ({ index: i, text })),
      };

      const stem = parsedFilename.replace(/\.[^.]+$/, "");
      const { downloadJson } = await import("@/app/lib/downloads");
      await downloadJson(data, `${stem}_chunks.json`);
    } finally {
      setDownloadingJson(false);
    }
  }, [editedChunks, parsedFilename, pipeline]);

  const handleGenerateScript = useCallback(async () => {
    setGeneratingScript(true);
    try {
      const { generatePipelineScript } = await import("@/app/lib/script-generator");
      const { downloadZip } = await import("@/app/lib/downloads");
      const { PINECONE_ENVIRONMENTS } = await import("@/app/lib/constants");

      const env = PINECONE_ENVIRONMENTS.find((e) => e.key === pineconeEnvKey);
      const isSpreadsheet = pipeline === PIPELINE.EXCEL_SPREADSHEET || pipeline === PIPELINE.CSV_SPREADSHEET;

      const config: ScriptConfig = {
        pipeline,
        chunkingParams,
        filename: parsedFilename,
        openrouterModel,
        openrouterPrompt,
        pdfEngine,
        excelColumn: isSpreadsheet ? excelColumn : undefined,
        excelSheet: isSpreadsheet ? excelSheet : undefined,
        embeddingProvider,
        voyageModel,
        cohereModel,
        openrouterEmbeddingModel,
        embeddingDimensions,
        pineconeIndexName,
        pineconeCloud: env?.cloud,
        pineconeRegion: env?.region,
      };

      const files = generatePipelineScript("chunks", config);
      const stem = parsedFilename.replace(/\.[^.]+$/, "") || "document";
      await downloadZip(files as unknown as Record<string, string>, `${stem}_chunks_pipeline.zip`);
    } finally {
      setGeneratingScript(false);
    }
  }, [
    pipeline, chunkingParams, parsedFilename, openrouterModel, openrouterPrompt,
    pdfEngine, excelColumn, excelSheet, embeddingProvider, voyageModel, cohereModel,
    openrouterEmbeddingModel, embeddingDimensions, pineconeIndexName, pineconeEnvKey
  ]);

  if (editedChunks.length === 0) return null;

  return (
    <ActionRow
      onDownload={handleDownloadJson}
      downloadLabel="Download Chunks (JSON)"
      isDownloading={downloadingJson}
      onGenerateScript={handleGenerateScript}
      scriptLabel="Generate Script"
      isGeneratingScript={generatingScript}
    />
  );
}
