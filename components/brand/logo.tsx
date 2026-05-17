import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

const sizeMap = {
  sm: 28,
  md: 40,
  lg: 64,
  xl: 96,
} as const;

type LogoSize = keyof typeof sizeMap;

type LogoProps = {
  size?: LogoSize;
  href?: string | null;
  priority?: boolean;
  className?: string;
  showWordmark?: boolean;
};

export function Logo({
  size = "md",
  href = "/",
  priority = false,
  className,
  showWordmark = false,
}: LogoProps) {
  const px = sizeMap[size];
  const content = (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <Image
        src="/dap-logo.png"
        alt="DAP — Diplomado Apostólico para Pastores"
        width={px}
        height={px}
        priority={priority}
        className="rounded-md"
      />
      {showWordmark && (
        <span className="flex flex-col leading-tight">
          <span className="text-base font-semibold tracking-tight text-foreground">
            DAP
          </span>
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
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
