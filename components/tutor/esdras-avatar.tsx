import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * Avatar de Esdras — tutor IA del DAP.
 *
 * Usa /public/esdras-avatar.jpg (512px optimizado). Renderiza con un
 * anillo violeta/coral sutil que refleja el brand DAP y un glow suave
 * para que se sienta "presente" en el chat sin distraer.
 *
 * Tamaños:
 *  - sm  (32px) — inline con mensajes en chat
 *  - md  (48px) — header / sidebar
 *  - lg  (96px) — empty state / welcome
 *  - xl  (160px) — landing/promo
 */
type Size = "sm" | "md" | "lg" | "xl";

const SIZE_PX: Record<Size, number> = {
  sm: 32,
  md: 48,
  lg: 96,
  xl: 160,
};

const RING_CX: Record<Size, string> = {
  sm: "ring-1",
  md: "ring-1",
  lg: "ring-2",
  xl: "ring-2",
};

export function EsdrasAvatar({
  size = "md",
  className,
  showGlow = false,
}: {
  size?: Size;
  className?: string;
  showGlow?: boolean;
}) {
  const px = SIZE_PX[size];

  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: px, height: px }}
    >
      {showGlow && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 scale-150 rounded-full blur-xl"
          style={{
            background:
              "radial-gradient(50% 50% at 50% 50%, rgba(123,97,255,0.45), transparent 60%)",
          }}
        />
      )}
      <div
        className={cn(
          "relative overflow-hidden rounded-full bg-[#04081A]",
          RING_CX[size],
          "ring-brand-violet/40 ring-offset-2 ring-offset-transparent",
        )}
        style={{ width: px, height: px }}
      >
        <Image
          src="/esdras-avatar.jpg"
          alt="Esdras — Tutor del DAP"
          width={px}
          height={px}
          priority={size === "lg" || size === "xl"}
          className="size-full object-cover"
        />
      </div>
    </div>
  );
}
