import Image from "next/image";
import { ReactNode } from "react";

export interface ProviderOption {
  id: string;
  label: string;
  icon?: string; // path to icon
  description?: string;
  badge?: string; // e.g. "Local", "Cloud"
  requiresApiKey?: boolean;
}

interface ProviderSelectorProps {
  options: ProviderOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  className?: string;
}

export function ProviderSelector({
  options,
  selectedId,
  onSelect,
  className = "",
}: ProviderSelectorProps) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {options.map((option) => {
        const isSelected = selectedId === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onSelect(option.id)}
            className={`flex-1 min-w-[140px] flex flex-col items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium border transition-colors cursor-pointer relative ${
              isSelected
                ? "bg-sandy text-white border-sandy shadow-sm"
                : "bg-card text-gunmetal border-sandy hover:bg-sandy/4"
            }`}
            title={option.description}
          >
            <div className="flex items-center gap-2">
              {option.icon && (
                <Image
                  src={option.icon}
                  alt=""
                  width={16}
                  height={16}
                  className="h-4 w-4 object-contain"
                />
              )}
              <span>{option.label}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

interface ConfigHeaderProps {
  title: string;
  icon?: string;
  description?: string;
  className?: string;
}

export function ConfigHeader({
  title,
  icon,
  description,
  className = "",
}: ConfigHeaderProps) {
  return (
    <div className={`flex flex-col gap-1 mb-4 ${className}`}>
      <div className="flex items-center gap-2">
        {icon && (
          <Image
            src={icon}
            alt=""
            width={20}
            height={20}
            className="h-5 w-5 object-contain"
          />
        )}
        <h3 className="text-sm font-semibold text-gunmetal">{title}</h3>
      </div>
      {description && (
        <p className="text-xs text-silver-dark leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
}

interface ConfigContainerProps {
  children: ReactNode;
  className?: string;
  active?: boolean;
}

export function ConfigContainer({
  children,
  className = "",
  active = false,
}: ConfigContainerProps) {
  return (
    <div
      className={`p-4 bg-transparent rounded-lg border space-y-4 animate-in fade-in slide-in-from-top-1 duration-300 ${
        active ? "border-sandy" : "border-silver-light"
      } ${className}`}
    >
      {children}
    </div>
  );
}
