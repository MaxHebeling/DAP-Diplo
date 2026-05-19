import * as React from "react";

import { cn } from "@/lib/utils";

function DapCard({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dap-card"
      className={cn(
        "rounded-xl border border-white/[0.06] bg-surface-elevated p-6 text-text-primary shadow-card",
        className,
      )}
      {...props}
    />
  );
}

function DapCardGlass({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dap-card-glass"
      className={cn(
        "rounded-xl p-6 text-text-primary shadow-card glass",
        className,
      )}
      {...props}
    />
  );
}

function DapCardGradientBorder({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dap-card-gradient"
      className={cn(
        "relative rounded-xl bg-surface-elevated p-6 text-text-primary shadow-card",
        className,
      )}
      {...props}
    >
      <div className="pointer-events-none absolute inset-0 -z-10 rounded-xl bg-gradient-brand opacity-[0.08]" />
      {children}
    </div>
  );
}

function DapCardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dap-card-header"
      className={cn("mb-4 flex flex-col gap-1.5", className)}
      {...props}
    />
  );
}

function DapCardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      data-slot="dap-card-title"
      className={cn(
        "font-grotesk text-h4 font-semibold text-text-primary",
        className,
      )}
      {...props}
    />
  );
}

function DapCardDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="dap-card-description"
      className={cn("text-sm text-text-secondary", className)}
      {...props}
    />
  );
}

export {
  DapCard,
  DapCardGlass,
  DapCardGradientBorder,
  DapCardHeader,
  DapCardTitle,
  DapCardDescription,
};
