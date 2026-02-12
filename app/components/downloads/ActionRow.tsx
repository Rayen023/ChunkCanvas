"use client";

interface ActionRowProps {
  onDownload?: () => void;
  downloadLabel?: string;
  isDownloading?: boolean;
  
  onGenerateScript: () => void;
  scriptLabel?: string;
  isGeneratingScript?: boolean;

  /** If true, the generate script button is the only action shown */
  scriptOnly?: boolean;

  /** Disable buttons */
  disabled?: boolean;
}

export default function ActionRow({
  onDownload,
  downloadLabel = "Download Data",
  isDownloading = false,
  onGenerateScript,
  scriptLabel = "Generate Script",
  isGeneratingScript = false,
  scriptOnly = false,
  disabled = false,
}: ActionRowProps) {
  return (
    <div className={`grid gap-4 ${scriptOnly ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"}`}>
      {!scriptOnly && onDownload && (
        <button
          onClick={onDownload}
          disabled={isDownloading || disabled}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-card border border-silver px-4 py-3 text-sm font-medium text-gunmetal hover:border-sandy hover:bg-sandy/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isDownloading ? (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          )}
          {isDownloading ? "Downloading…" : downloadLabel}
        </button>
      )}

      <button
        onClick={onGenerateScript}
        disabled={isGeneratingScript || disabled}
        className="w-full flex items-center justify-center gap-2 rounded-lg bg-card border border-silver px-4 py-3 text-sm font-medium text-gunmetal hover:border-sandy hover:bg-sandy/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {isGeneratingScript ? (
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
          </svg>
        )}
        {isGeneratingScript ? "Generating…" : scriptLabel}
      </button>
    </div>
  );
}
