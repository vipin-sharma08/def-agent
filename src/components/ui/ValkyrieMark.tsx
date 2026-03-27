import { cn } from "@/lib/utils";

interface ValkyrieMarkProps {
  className?: string;
}

export const ValkyrieMark = ({ className }: ValkyrieMarkProps) => {
  return (
    <svg
      viewBox="0 0 22 22"
      fill="none"
      aria-hidden
      className={cn("h-5 w-5", className)}
    >
      <rect
        x="11"
        y="1.5"
        width="13"
        height="13"
        rx="1.5"
        transform="rotate(45 11 11)"
        stroke="var(--valk-accent)"
        strokeWidth="1.5"
      />
      <rect
        x="11"
        y="6"
        width="7"
        height="7"
        rx="0.5"
        transform="rotate(45 11 11)"
        fill="var(--valk-accent-muted)"
        stroke="var(--valk-accent)"
        strokeWidth="1"
      />
    </svg>
  );
};
