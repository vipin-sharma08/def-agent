import type { LucideIcon } from "lucide-react";

interface StepIndicatorProps {
  icon: LucideIcon;
  step: number;
  total?: number;
}

export const StepIndicator = ({
  icon: Icon,
  step,
  total = 4,
}: StepIndicatorProps) => {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-9 w-9 items-center justify-center rounded-[var(--valk-radius-sm)] bg-accent-muted text-accent">
        <Icon className="h-5 w-5" strokeWidth={1.8} />
      </div>
      <p className="text-caption uppercase tracking-label-wide text-muted">
        Step {step} of {total}
      </p>
    </div>
  );
};
