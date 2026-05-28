import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const sizeMap = {
  sm: 28,
  md: 40,
  lg: 64,
  xl: 96,
} as const;

type LogoSize = keyof typeof sizeMap;

type LogoVariant = "dark" | "light";

type LogoProps = {
  size?: LogoSize;
  href?: string | null;
  priority?: boolean;
  className?: string;
  showWordmark?: boolean;
  /**
   * "dark" (default) → logo con letras navy sobre fondo claro. Úsalo
   * cuando el contenedor sea claro (cards de auth, dashboard).
   * "light" → logo blanco sobre transparente. Úsalo cuando el
   * contenedor sea oscuro (header/footer de la landing).
   */
  variant?: LogoVariant;
};

export function Logo({
  size = "md",
  href = "/",
  priority = false,
  className,
  showWordmark = false,
  variant = "dark",
}: LogoProps) {
  const px = sizeMap[size];
  const src = variant === "light" ? "/dap-logo-white.png" : "/dap-logo.png";
  const wordmarkColor =
    variant === "light" ? "text-neutral-50" : "text-foreground";
  const wordmarkSubColor =
    variant === "light" ? "text-neutral-400" : "text-muted-foreground";
  // El variant "dark" tiene fondo claro propio → rounded-md para tarjeta;
  // el "light" es transparente → sin rounded.
  const imgClass = variant === "light" ? "" : "rounded-md";

  const content = (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <Image
        src={src}
        alt="DAP — Diplomado Apostólico Pastoral"
        width={px}
        height={px}
        priority={priority}
        className={imgClass}
      />
      {showWordmark && (
        <span className="flex flex-col leading-tight">
          <span
            className={cn(
              "text-base font-semibold tracking-tight",
              wordmarkColor,
            )}
          >
            DAP
          </span>
          <span
            className={cn(
              "text-[10px] font-medium uppercase tracking-widest",
              wordmarkSubColor,
            )}
          >
            Diplomado Apostólico
          </span>
        </span>
      )}
    </span>
  );

  if (href === null) return content;
  return (
    <Link href={href} aria-label="DAP — Inicio" className="inline-flex">
      {content}
    </Link>
  );
}
