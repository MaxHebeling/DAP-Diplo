import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const dapButtonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 font-inter font-semibold whitespace-nowrap rounded-md outline-none select-none transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-brand-violet focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-brand text-white shadow-card hover:scale-[1.02] hover:shadow-glow-violet active:scale-[0.99]",
        secondary:
          "border border-brand-coral bg-transparent text-white hover:bg-brand-coral/10 active:bg-brand-coral/15",
        ghost: "text-white hover:text-brand-coral",
      },
      size: {
        sm: "h-9 px-4 text-sm [&_svg]:size-3.5",
        md: "h-11 px-6 text-base [&_svg]:size-4",
        lg: "h-12 px-8 text-base font-bold [&_svg]:size-5",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

function DapButton({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof dapButtonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="dap-button"
      className={cn(dapButtonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { DapButton, dapButtonVariants };
