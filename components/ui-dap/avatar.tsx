import * as React from "react";
import { User } from "lucide-react";

import { cn } from "@/lib/utils";

type DapAvatarProps = {
  src?: string | null;
  alt?: string;
  name?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const SIZE_CLASS: Record<NonNullable<DapAvatarProps["size"]>, string> = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-base",
};

function getInitials(name?: string | null): string | null {
  if (!name) return null;
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

function DapAvatar({
  src,
  alt,
  name,
  size = "md",
  className,
}: DapAvatarProps) {
  const sizeClass = SIZE_CLASS[size];

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        data-slot="dap-avatar"
        src={src}
        alt={alt ?? name ?? "Avatar"}
        className={cn(
          "rounded-full object-cover ring-2 ring-white/10",
          sizeClass,
          className,
        )}
      />
    );
  }

  const initials = getInitials(name);

  return (
    <div
      data-slot="dap-avatar"
      aria-label={alt ?? name ?? "Avatar"}
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-gradient-brand font-grotesk font-semibold text-white",
        sizeClass,
        className,
      )}
    >
      {initials ?? <User className="size-1/2" />}
    </div>
  );
}

export { DapAvatar };
