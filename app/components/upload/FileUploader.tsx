"use client";

import { useCallback, useRef, useState } from "react";
import { ALL_ACCEPTED_EXTENSIONS } from "@/app/lib/constants";
import { useAppStore } from "@/app/lib/store";

/** Get file extension in lowercase */
function getExt(f: File): string {
  return f.name.split(".").pop()?.toLowerCase() ?? "";
}

export default function FileUploader() {
  const files = useAppStore((s) => s.files);
  const setFiles = useAppStore((s) => s.setFiles);
  const addFiles = useAppStore((s) => s.addFiles);
  const removeFile = useAppStore((s) => s.removeFile);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [typeError, setTypeError] = useState<string | null>(null);

  /** Validate and add files — all must share the same extension */
  const handleFiles = useCallback(
    (incoming: FileList | null) => {
      if (!incoming || incoming.length === 0) return;
      setTypeError(null);

      const arr = Array.from(incoming);
      const existingExt = files.length > 0 ? getExt(files[0]) : null;
      const targetExt = existingExt ?? getExt(arr[0]);

      // Filter to only files with the same extension
      const valid = arr.filter((f) => getExt(f) === targetExt);
      const rejected = arr.length - valid.length;

      if (rejected > 0) {
        setTypeError(
          `${rejected} file(s) skipped — all files must be .${targetExt}`,
        );
      }

      if (valid.length === 0) return;

      if (files.length === 0) {
        setFiles(valid);
      } else {
        addFiles(valid);
      }
    },
    [files, setFiles, addFiles],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => inputRef.current?.click()}
        className={`relative cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
          dragActive
            ? "border-sandy bg-sandy/5"
            : "border-silver hover:border-sandy-light"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ALL_ACCEPTED_EXTENSIONS.join(",")}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-2">
          <svg
            className="h-10 w-10 text-silver-dark"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </svg>

          {files.length > 0 ? (
            <div>
              <p className="text-sm font-medium text-gunmetal">
                {files.length} file{files.length !== 1 ? "s" : ""} selected
              </p>
              <p className="text-xs text-silver-dark">
                {(totalSize / 1024).toFixed(1)} KB total — click or drag to add
                more .{getExt(files[0])} files
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium text-gunmetal">
                Drop file(s) here or click to browse
              </p>
              <p className="text-xs text-silver-dark mt-1">
                PDF, DOCX, TXT, MD, XLSX, images, audio, video
              </p>
              <p className="text-xs text-silver-dark mt-0.5">
                Multiple files of the same type supported
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Type mismatch warning */}
      {typeError && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-2 text-xs text-amber-700">
          {typeError}
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-1.5">
          {files.map((f, i) => (
            <div
              key={`${f.name}-${i}`}
              className="flex items-center justify-between rounded-lg border border-silver-light bg-white px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-2 min-w-0">
                <svg
                  className="h-4 w-4 text-sandy flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                  />
                </svg>
                <span className="truncate text-gunmetal font-medium">
                  {f.name}
                </span>
                <span className="text-xs text-silver-dark flex-shrink-0">
                  {(f.size / 1024).toFixed(1)} KB
                </span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(i);
                }}
                className="ml-2 flex-shrink-0 rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
                title="Remove file"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ))}

          {/* Clear all */}
          {files.length > 1 && (
            <button
              type="button"
              onClick={() => setFiles([])}
              className="text-xs text-red-500 hover:text-red-700 transition-colors cursor-pointer"
            >
              Clear all files
            </button>
          )}
        </div>
      )}
    </div>
  );
}
