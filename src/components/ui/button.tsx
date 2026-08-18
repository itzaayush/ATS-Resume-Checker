import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-[background,color,box-shadow,transform] duration-200 disabled:pointer-events-none disabled:opacity-50 active:translate-y-px",
  {
    variants: {
      variant: {
        primary:
          "bg-accent text-accent-contrast shadow-[0_1px_0_0_rgba(255,255,255,0.12)_inset,0_8px_24px_-12px_var(--glow)] hover:brightness-110",
        secondary: "border border-border bg-surface-raised text-foreground hover:border-border-strong",
        ghost: "text-muted hover:bg-surface-raised hover:text-foreground",
        outline: "border border-border-strong text-foreground hover:bg-surface-raised",
        danger: "bg-danger text-white hover:brightness-110",
      },
      size: {
        sm: "h-8 px-3 text-[13px]",
        md: "h-10 px-4",
        lg: "h-12 px-6 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { buttonVariants };
