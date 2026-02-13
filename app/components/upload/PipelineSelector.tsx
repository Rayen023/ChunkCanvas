"use client";

import { useMemo, useEffect } from "react";
import { PIPELINE, PIPELINE_ALLOWED_EXTENSIONS } from "@/app/lib/constants";
import { useAppStore } from "@/app/lib/store";
import OpenRouterForm from "../pipeline-forms/OpenRouterForm";
import OllamaForm from "../pipeline-forms/OllamaForm";
import VllmForm from "../pipeline-forms/VllmForm";
import ExcelForm from "../pipeline-forms/ExcelForm";
import {
  ProviderSelector,
  ConfigContainer,
  ConfigHeader,
  ProviderOption,
} from "@/app/components/shared/ConfigSection";
import StatusMessage from "@/app/components/shared/StatusMessage";

const ALL_PIPELINES = Object.values(PIPELINE);

/** Whether a pipeline requires an API key */
const PIPELINE_NEEDS_KEY: Record<string, boolean> = {
  [PIPELINE.SIMPLE_TEXT]: false,
  [PIPELINE.EXCEL_SPREADSHEET]: false,
  [PIPELINE.CSV_SPREADSHEET]: false,
  [PIPELINE.OPENROUTER_PDF]: true,
  [PIPELINE.OPENROUTER_IMAGE]: true,
  [PIPELINE.OPENROUTER_AUDIO]: true,
  [PIPELINE.OPENROUTER_VIDEO]: true,
  [PIPELINE.OLLAMA_PDF]: false,
  [PIPELINE.OLLAMA_IMAGE]: false,
  [PIPELINE.VLLM_PDF]: false,
  [PIPELINE.VLLM_IMAGE]: false,
  [PIPELINE.VLLM_AUDIO]: false,
  [PIPELINE.VLLM_VIDEO]: false,
};

const PIPELINE_META: Record<string, Omit<ProviderOption, "id" | "label">> = {
  [PIPELINE.SIMPLE_TEXT]: {
    badge: "Local",
    icon: "/tech-icons/pdf-mammoth.svg",
    requiresApiKey: false,
  },
  [PIPELINE.EXCEL_SPREADSHEET]: {
    badge: "Local",
    icon: "/tech-icons/xlsx.svg",
    requiresApiKey: false,
  },
  [PIPELINE.CSV_SPREADSHEET]: {
    badge: "Local",
    icon: "/tech-icons/csv.svg",
    requiresApiKey: false,
  },
  [PIPELINE.OPENROUTER_PDF]: {
    badge: "Cloud",
    icon: "/tech-icons/openrouter.svg",
    requiresApiKey: true,
  },
  [PIPELINE.OPENROUTER_IMAGE]: {
    badge: "Cloud",
    icon: "/tech-icons/openrouter.svg",
    requiresApiKey: true,
  },
  [PIPELINE.OPENROUTER_AUDIO]: {
    badge: "Cloud",
    icon: "/tech-icons/openrouter.svg",
    requiresApiKey: true,
  },
  [PIPELINE.OPENROUTER_VIDEO]: {
    badge: "Cloud",
    icon: "/tech-icons/openrouter.svg",
    requiresApiKey: true,
  },
  [PIPELINE.OLLAMA_PDF]: {
    badge: "Local",
    icon: "/tech-icons/ollama.svg",
    requiresApiKey: false,
  },
  [PIPELINE.OLLAMA_IMAGE]: {
    badge: "Local",
    icon: "/tech-icons/ollama.svg",
    requiresApiKey: false,
  },
  [PIPELINE.VLLM_PDF]: {
    badge: "Local",
    icon: "/tech-icons/vllm-color.svg",
    requiresApiKey: false,
  },
  [PIPELINE.VLLM_IMAGE]: {
    badge: "Local",
    icon: "/tech-icons/vllm-color.svg",
    requiresApiKey: false,
  },
  [PIPELINE.VLLM_AUDIO]: {
    badge: "Local",
    icon: "/tech-icons/vllm-color.svg",
    requiresApiKey: false,
  },
  [PIPELINE.VLLM_VIDEO]: {
    badge: "Local",
    icon: "/tech-icons/vllm-color.svg",
    requiresApiKey: false,
  },
};

const PIPELINE_LABELS: Record<string, string> = {
  [PIPELINE.SIMPLE_TEXT]: "pdfjs + mammoth",
  [PIPELINE.EXCEL_SPREADSHEET]: "XLSX",
  [PIPELINE.CSV_SPREADSHEET]: "CSV Parser",
  [PIPELINE.OPENROUTER_PDF]: "OpenRouter",
  [PIPELINE.OPENROUTER_IMAGE]: "OpenRouter",
  [PIPELINE.OPENROUTER_AUDIO]: "OpenRouter",
  [PIPELINE.OPENROUTER_VIDEO]: "OpenRouter",
  [PIPELINE.OLLAMA_PDF]: "Ollama",
  [PIPELINE.OLLAMA_IMAGE]: "Ollama",
  [PIPELINE.VLLM_PDF]: "vLLM",
  [PIPELINE.VLLM_IMAGE]: "vLLM",
  [PIPELINE.VLLM_AUDIO]: "vLLM",
  [PIPELINE.VLLM_VIDEO]: "vLLM",
};

export default function PipelineSelector() {
  const files = useAppStore((s) => s.files);
  const pipelinesByExt = useAppStore((s) => s.pipelinesByExt);
  const setPipelineForExt = useAppStore((s) => s.setPipelineForExt);
  const lastPipelineByExt = useAppStore((s) => s.lastPipelineByExt);

  /** Group files by extension */
  const extGroups = useMemo(() => {
    const groups: Record<string, File[]> = {};
    for (const f of files) {
      const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
      if (!groups[ext]) groups[ext] = [];
      groups[ext].push(f);
    }
    return groups;
  }, [files]);

  /** For each extension, compute the list of compatible pipelines */
  const extPipelines = useMemo(() => {
    const result: Record<string, string[]> = {};
    for (const ext of Object.keys(extGroups)) {
      result[ext] = ALL_PIPELINES.filter(
        (p) => PIPELINE_ALLOWED_EXTENSIONS[p]?.has(ext) ?? false,
      );
    }
    return result;
  }, [extGroups]);

  const extKeys = Object.keys(extGroups);
  const multiGroup = extKeys.length > 1;


  // Auto-select: single compatible pipeline, or restore last-used if compatible
  useEffect(() => {
    for (const [ext, pipelines] of Object.entries(extPipelines)) {
      // Skip if already selected
      if (pipelinesByExt[ext]) continue;
      if (pipelines.length === 1) {
        setPipelineForExt(ext, pipelines[0]);
      } else if (pipelines.length > 1 && lastPipelineByExt[ext] && pipelines.includes(lastPipelineByExt[ext])) {
        // Restore last-used pipeline if it's still compatible
        setPipelineForExt(ext, lastPipelineByExt[ext]);
      }
    }
  }, [extPipelines, pipelinesByExt, setPipelineForExt, lastPipelineByExt]);

  // Clear invalid selections (e.g. after removing files)
  useEffect(() => {
    for (const [ext, selected] of Object.entries(pipelinesByExt)) {
      if (
        selected &&
        extPipelines[ext] &&
        !extPipelines[ext].includes(selected)
      ) {
        setPipelineForExt(ext, "");
      }
    }
  }, [extPipelines, pipelinesByExt, setPipelineForExt]);

  return (
    <div className="space-y-5">
      {/* Per-extension groups */}
      <div className="space-y-5">
        {extKeys.map((ext) => {
          const groupFiles = extGroups[ext];
          const pipelines = extPipelines[ext] ?? [];
          const selected = pipelinesByExt[ext] ?? "";
          const pipelineOptions: ProviderOption[] = pipelines.map((pipelineId) => ({
            id: pipelineId,
            label: PIPELINE_LABELS[pipelineId] ?? pipelineId,
            badge: PIPELINE_META[pipelineId]?.badge,
            icon: PIPELINE_META[pipelineId]?.icon,
            requiresApiKey: PIPELINE_NEEDS_KEY[pipelineId],
          }));
          const selectedOption = pipelineOptions.find((option) => option.id === selected);

          return (
            <div key={ext} className="space-y-2">
              {/* Extension group header */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gunmetal bg-sandy/15 px-2 py-0.5 rounded-full uppercase tracking-wide">
                  .{ext}
                </span>
                <span className="text-xs text-silver-dark">
                  {groupFiles.length} file
                  {groupFiles.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Pipeline options */}
              <div className="space-y-2 ml-1">
                <ProviderSelector
                  options={pipelineOptions}
                  selectedId={selected}
                  onSelect={(id) => setPipelineForExt(ext, id)}
                />

                {pipelines.length === 0 && (
                  <StatusMessage type="warning" label="Note:">
                    No compatible pipeline found for{" "}
                    <code className="font-mono">.{ext}</code> files.
                  </StatusMessage>
                )}
              </div>

              {/* Per-extension config form — appears below selected pipeline */}
              {selected && selected !== PIPELINE.SIMPLE_TEXT && (
                <ConfigContainer className="ml-1" active>
                  <ConfigHeader
                    title={`${selectedOption?.label || "Pipeline"} Configuration`}
                    icon={selectedOption?.icon}
                    description={
                      selectedOption?.badge === "Cloud"
                        ? "Cloud provider selected. API key is required."
                        : "Local provider selected."
                    }
                  />
                  {selected.startsWith("OpenRouter") && (
                    <OpenRouterForm ext={ext} />
                  )}
                  {selected.startsWith("Ollama") && (
                    <OllamaForm ext={ext} />
                  )}
                  {selected.startsWith("vLLM") && (
                    <VllmForm ext={ext} />
                  )}
                  {(selected === PIPELINE.EXCEL_SPREADSHEET ||
                    selected === PIPELINE.CSV_SPREADSHEET) && (
                    <ExcelForm ext={ext} />
                  )}
                </ConfigContainer>
              )}
              {selected === PIPELINE.SIMPLE_TEXT && (
                <ConfigContainer className="ml-1" active>
                  <ConfigHeader
                    title={`${selectedOption?.label || "Pipeline"} Configuration`}
                    icon={selectedOption?.icon}
                    description="Local provider selected."
                  />
                </ConfigContainer>
              )}

              {/* Separator between groups */}
              {multiGroup && ext !== extKeys[extKeys.length - 1] && (
                <div className="h-px bg-silver-light mt-3" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
