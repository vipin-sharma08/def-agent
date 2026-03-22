"use client";

// src/components/ui/WarningBanner.tsx
// ═══════════════════════════════════════════════════════════════════
// Dismissible banner for warnings, errors, and info messages.
// Three variants: warning (amber), error (rose), info (teal).
// ═══════════════════════════════════════════════════════════════════

import { AlertTriangle, AlertCircle, Info, X, type LucideProps } from "lucide-react";

export type WarningVariant = "warning" | "error" | "info";

interface WarningBannerProps {
  variant?: WarningVariant;
  title?: string;
  message: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  /** Optional CTA button rendered on the right */
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const VARIANT_STYLES: Record<
  WarningVariant,
  { container: string; icon: string; title: string; text: string; btn: string }
> = {
  warning: {
    container: "bg-amber-950/30 border-amber-500/30",
    icon:      "text-amber-400",
    title:     "text-amber-300",
    text:      "text-amber-400/90",
    btn:       "text-amber-400 hover:bg-amber-500/10 border-amber-500/30 hover:border-amber-500/50",
  },
  error: {
    container: "bg-neg-surface border-neg-border",
    icon:      "text-negative",
    title:     "text-negative/80",
    text:      "text-negative/70",
    btn:       "text-negative hover:bg-neg-surface border-neg-border hover:border-negative/40",
  },
  info: {
    container: "bg-teal-surface border-teal-border",
    icon:      "text-teal",
    title:     "text-teal",
    text:      "text-zinc-400",
    btn:       "text-teal hover:bg-teal/10 border-teal-border hover:border-teal/40",
  },
};

const ICONS: Record<WarningVariant, React.FC<LucideProps>> = {
  warning: AlertTriangle,
  error:   AlertCircle,
  info:    Info,
};

export const WarningBanner = ({
  variant = "warning",
  title,
  message,
  dismissible = false,
  onDismiss,
  action,
  className = "",
}: WarningBannerProps) => {
  const styles = VARIANT_STYLES[variant];
  const Icon   = ICONS[variant];

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-lg border ${styles.container} ${className}`}
      role="alert"
    >
      <Icon size={15} className={`${styles.icon} flex-shrink-0 mt-0.5`} />

      <div className="flex-1 min-w-0">
        {title && (
          <p className={`text-xs font-semibold ${styles.title} mb-0.5`}>{title}</p>
        )}
        <p className={`text-xs leading-relaxed ${styles.text}`}>{message}</p>
      </div>

      {/* Action button */}
      {action && (
        <button
          onClick={action.onClick}
          className={`flex-shrink-0 text-xs font-mono px-2.5 py-1 rounded border transition-colors ${styles.btn}`}
        >
          {action.label}
        </button>
      )}

      {/* Dismiss button */}
      {dismissible && (
        <button
          onClick={onDismiss}
          className={`flex-shrink-0 p-1 rounded transition-colors ${styles.icon} hover:opacity-70`}
          aria-label="Dismiss"
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
};
