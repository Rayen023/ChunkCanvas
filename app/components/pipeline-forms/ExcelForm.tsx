"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useAppStore } from "@/app/lib/store";
import type { ExtPipelineConfig } from "@/app/lib/types";

interface ExcelFormProps {
  ext: string;
  file?: File;
}

export default function ExcelForm({ ext, file: propFile }: ExcelFormProps) {
  const files = useAppStore((s) => s.files);
  
  // Use passed file or find first matching extension (legacy mode)
  const file = useMemo(
    () => propFile ?? files.find(f => (f.name.split(".").pop()?.toLowerCase() ?? "") === ext) ?? null,
    [files, ext, propFile],
  );

  const configByExt = useAppStore((s) => s.configByExt);
  const configByFile = useAppStore((s) => s.configByFile);

  // Determine effective config: prefer file-specific, fallback to extension-wide
  const config = useMemo(() => {
    if (file && configByFile[file.name]) {
      return configByFile[file.name];
    }
    return configByExt[ext];
  }, [file, configByFile, configByExt, ext]);

  const setConfigForExt = useAppStore((s) => s.setConfigForExt);
  const setConfigForFile = useAppStore((s) => s.setConfigForFile);

  // Helper to update config based on mode
  const updateConfig = useCallback((update: Partial<ExtPipelineConfig>) => {
    if (file) {
      setConfigForFile(file.name, update);
    } else {
      setConfigForExt(ext, update);
    }
  }, [file, ext, setConfigForFile, setConfigForExt]);

  const excelSheet = config?.excelSheet ?? "";
  const excelSheets = config?.excelSheets ?? [];
  const excelSelectedColumns = config?.excelSelectedColumns ?? (config?.excelColumn ? [config.excelColumn] : []);
  const excelColumns = config?.excelColumns ?? [];

  const setExcelSheet = useCallback((v: string) => updateConfig({ excelSheet: v }), [updateConfig]);
  const setExcelSheets = useCallback((v: string[]) => updateConfig({ excelSheets: v }), [updateConfig]);
  const setExcelSelectedColumns = useCallback((v: string[]) => updateConfig({ excelSelectedColumns: v }), [updateConfig]);
  const setExcelColumns = useCallback((v: string[]) => updateConfig({ excelColumns: v }), [updateConfig]);
  
  const [loadingSheets, setLoadingSheets] = useState(false);
  const [loadingColumns, setLoadingColumns] = useState(false);

  // 1. Load Sheets on file change
  useEffect(() => {
    async function loadSheets() {
      if (!file) return;
      setLoadingSheets(true);
      try {
        const { getExcelSheets } = await import("@/app/lib/parsers");
        const sheets = await getExcelSheets(file);
        
        // Only update if sheets changed to avoid loops/resets
        // We can compare lengths or content, but simpler to just set it.
        // However, we must be careful not to overwrite user selection if sheets are same.
        // For now, we just update the list.
        setExcelSheets(sheets);
        
        // Auto-select logic:
        // If current selection is invalid or empty, and we have sheets:
        const currentSheet = config?.excelSheet;
        if (sheets.length === 1 && currentSheet !== sheets[0]) {
          setExcelSheet(sheets[0]);
        } else if (sheets.length > 0 && !sheets.includes(currentSheet || "")) {
           // If current sheet is invalid, reset to empty
           setExcelSheet("");
        }
      } catch (err) {
        console.error("Failed to read Excel sheets:", err);
        setExcelSheets([]);
      } finally {
        setLoadingSheets(false);
      }
    }
    loadSheets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]); // Run when file changes. We intentionally omit setters to avoid loops.

  // 2. Load Columns when sheet changes
  useEffect(() => {
    async function loadColumns() {
      if (!file || !excelSheet) {
        setExcelColumns([]);
        return;
      }
      setLoadingColumns(true);
      try {
        const { getExcelColumns } = await import("@/app/lib/parsers");
        const cols = await getExcelColumns(file, excelSheet);
        setExcelColumns(cols);
        
        // Auto-select first column if nothing selected
        const currentSelection = config?.excelSelectedColumns ?? [];
        if (cols.length > 0) {
           // Only default if empty selection or invalid selection
           if (currentSelection.length === 0) {
              setExcelSelectedColumns([cols[0]]);
           }
        } else {
           setExcelSelectedColumns([]);
        }
      } catch (err) {
        console.error("Failed to read columns:", err);
        setExcelColumns([]);
      } finally {
        setLoadingColumns(false);
      }
    }
    loadColumns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, excelSheet]);

  if (!file) {
    return (
      <div className="text-sm text-silver-dark italic">
        No file selected.
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-2 border-t border-silver-light/50 mt-2">
      <div className="flex items-center gap-2 mb-2">
         <span className="text-xs font-mono bg-silver/10 px-1.5 py-0.5 rounded text-gunmetal">
            {file.name}
         </span>
      </div>

      {/* Sheet Selector */}
      <div>
        <label className="block text-sm font-medium text-gunmetal mb-1">
          Select Sheet
          {loadingSheets && (
            <span className="ml-2 text-xs text-silver-dark animate-pulse">
              Loading sheets…
            </span>
          )}
        </label>
        <select
          value={excelSheet}
          onChange={(e) => setExcelSheet(e.target.value)}
          disabled={loadingSheets || excelSheets.length === 0}
          className="w-full rounded-lg border border-silver px-3 py-2 text-sm bg-card focus:ring-2 focus:ring-sandy/50 focus:border-sandy outline-none appearance-none disabled:opacity-50"
        >
          <option value="" disabled>
            -- Select a sheet --
          </option>
          {excelSheets.map((sheet) => (
            <option key={sheet} value={sheet}>
              {sheet}
            </option>
          ))}
        </select>
        {!loadingSheets && excelSheets.length === 0 && (
          <p className="mt-1 text-xs text-amber-600">
            No sheets found. Is this a valid spreadsheet?
          </p>
        )}
      </div>

      {/* Column Selector */}
      <div>
        <label className="block text-sm font-medium text-gunmetal mb-1">
          Columns to extract
          <span className="ml-2 text-xs text-silver-dark font-normal">
            (Hold Ctrl/Cmd to select multiple)
          </span>
          {loadingColumns && (
            <span className="ml-2 text-xs text-silver-dark animate-pulse">
              Reading columns…
            </span>
          )}
        </label>
        <select
          multiple
          value={excelSelectedColumns}
          onChange={(e) => {
            const selected = Array.from(e.target.selectedOptions, option => option.value);
            setExcelSelectedColumns(selected);
          }}
          disabled={!excelSheet || excelColumns.length === 0}
          className="w-full h-48 rounded-lg border border-silver px-3 py-2 text-sm bg-card focus:ring-2 focus:ring-sandy/50 focus:border-sandy outline-none appearance-none disabled:opacity-50"
        >
          {excelColumns.length === 0 && !loadingColumns ? (
            <option value="" disabled>
               -- No columns found --
            </option>
          ) : null}
          {excelColumns.map((col) => (
            <option key={col} value={col}>
              {col}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-silver-dark">
            Selected columns will be extracted row by row, maintaining the order of selection.
        </p>
      </div>
    </div>
  );
}
