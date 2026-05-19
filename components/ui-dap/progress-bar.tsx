import { cn } from "@/lib/utils";

type DapProgressBarProps = {
  value: number;
  max?: number;
  label?: string;
  showPercentage?: boolean;
  className?: string;
};

function DapProgressBar({
  value,
  max = 100,
  label,
  showPercentage = true,
  className,
}: DapProgressBarProps) {
  const safeMax = max > 0 ? max : 100;
  const percentage = Math.max(0, Math.min(100, (value / safeMax) * 100));
  const rounded = Math.round(percentage);

  return (
    <div data-slot="dap-progress-bar" className={cn("w-full", className)}>
      {(label || showPercentage) && (
        <div className="mb-2 flex items-center justify-between font-inter text-sm text-text-secondary">
          {label && <span>{label}</span>}
          {showPercentage && (
            <span className="font-medium tabular-nums text-text-primary">
              {rounded}%
            </span>
          )}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={rounded}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]"
      >
        <div
          className="h-full rounded-full bg-gradient-brand transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export { DapProgressBar };
