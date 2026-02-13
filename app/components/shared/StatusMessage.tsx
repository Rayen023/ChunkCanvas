import React from "react";

export type StatusMessageType = "success" | "error" | "warning" | "info";

interface StatusMessageProps {
  type?: StatusMessageType;
  label?: string;
  children: React.ReactNode;
  className?: string;
}

export default function StatusMessage({
  type = "info",
  label,
  children,
  className = "",
}: StatusMessageProps) {
  // Common container style: Light orange background for ALL types
  const containerClass =
    "rounded-lg bg-sandy/10 border border-sandy/20 p-3 text-xs text-gunmetal";

  // Label color based on type
  let labelClass = "font-bold mr-1";
  let defaultLabel = "";

  switch (type) {
    case "success":
      labelClass += " text-emerald-600 dark:text-emerald-400";
      defaultLabel = "Success:";
      break;
    case "error":
      labelClass += " text-red-600 dark:text-red-400";
      defaultLabel = "Error:";
      break;
    case "warning":
      labelClass += " text-sandy-dark dark:text-sandy";
      defaultLabel = "Note:";
      break;
    case "info":
    default:
      labelClass += " text-sandy-dark dark:text-sandy";
      defaultLabel = "Note:";
      break;
  }

  const finalLabel = label !== undefined ? label : defaultLabel;

  return (
    <div className={`${containerClass} ${className}`}>
      {finalLabel && <strong className={labelClass}>{finalLabel}</strong>}
      {children}
    </div>
  );
}
