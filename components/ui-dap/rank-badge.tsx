import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type RankOrder = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type RankBadgeSize = "sm" | "md" | "lg" | "xl";

type DapRankBadgeProps = {
  rankOrder: RankOrder;
  size?: RankBadgeSize;
  icon?: LucideIcon;
  /** Muestra el número del rango (1-9) si no se pasa icon. */
  showNumber?: boolean;
  /** Glow detrás del badge. */
  glow?: boolean;
  className?: string;
  label?: string;
};

const RANK_TINT: Record<RankOrder, string> = {
  1: "#A78BFA",
  2: "#7B61FF",
  3: "#5B4FFF",
  4: "#FF6B9D",
  5: "#FF4D6D",
  6: "#FF3B5C",
  7: "#FFB84D",
  8: "#4DFFB8",
  9: "#FFD700",
};

const SIZE_PX: Record<RankBadgeSize, number> = {
  sm: 32,
  md: 56,
  lg: 80,
  xl: 112,
};

function DapRankBadge({
  rankOrder,
  size = "md",
  icon: Icon,
  showNumber = true,
  glow = true,
  className,
  label,
}: DapRankBadgeProps) {
  const tint = RANK_TINT[rankOrder];
  const px = SIZE_PX[size];
  const id = React.useId();
  const gradId = `dap-rank-${id}`;
  const glowId = `dap-rank-glow-${id}`;

  const iconSize = Math.round(px * 0.4);
  const numberFontSize = Math.round(px * 0.36);

  return (
    <span
      data-slot="dap-rank-badge"
      role="img"
      aria-label={label ?? `Rango ${rankOrder}`}
      className={cn(
        "relative inline-flex items-center justify-center",
        className,
      )}
      style={{ width: px, height: px }}
    >
      <svg
        viewBox="0 0 100 100"
        width={px}
        height={px}
        aria-hidden
        className="absolute inset-0"
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={tint} stopOpacity="0.95" />
            <stop offset="100%" stopColor={tint} stopOpacity="0.55" />
          </linearGradient>
          {glow && (
            <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3.5" />
            </filter>
          )}
        </defs>

        {glow && (
          <polygon
            points="50,5 95,28 95,72 50,95 5,72 5,28"
            fill={tint}
            opacity="0.45"
            filter={`url(#${glowId})`}
          />
        )}

        <polygon
          points="50,5 95,28 95,72 50,95 5,72 5,28"
          fill={`url(#${gradId})`}
          stroke={tint}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <polygon
          points="50,12 88,32 88,68 50,88 12,68 12,32"
          fill="none"
          stroke="white"
          strokeOpacity="0.18"
          strokeWidth="0.8"
          strokeLinejoin="round"
        />
      </svg>

      <span className="relative z-10 flex items-center justify-center text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]">
        {Icon ? (
          <Icon size={iconSize} strokeWidth={1.8} />
        ) : showNumber ? (
          <span
            className="font-grotesk font-bold leading-none tabular-nums"
            style={{ fontSize: numberFontSize }}
          >
            {rankOrder}
          </span>
        ) : null}
      </span>
    </span>
  );
}

export { DapRankBadge, RANK_TINT };
