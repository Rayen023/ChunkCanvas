import { ReactNode } from "react";

interface TooltipProps {
  content: string;
  children: ReactNode;
}

export default function Tooltip({ content, children }: TooltipProps) {
  return (
    <div className="group relative flex items-center">
      {children}
      <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded bg-gunmetal px-2 py-1 text-xs text-card opacity-0 shadow-sm transition-opacity group-hover:opacity-100 z-50">
        {content}
        {/* Arrow */}
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gunmetal" />
      </div>
    </div>
  );
}
