import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold select-none",
  {
    variants: {
      variant: {
        success: "bg-success-soft text-success",
        warning: "bg-warning-soft text-warning",
        danger: "bg-danger-soft text-danger",
        info: "bg-info-soft text-info",
        primary: "bg-primary-soft text-primary",
        neutral: "bg-surface-muted text-text-muted",
        outline: "border border-border text-text-muted bg-transparent",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
);

const dotColors: Record<string, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
  primary: "bg-primary",
  neutral: "bg-text-subtle",
  outline: "bg-text-subtle",
};

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  withDot?: boolean;
}

function Badge({ className, variant = "neutral", withDot = true, children, ...props }: BadgeProps) {
  const currentVariant = variant || "neutral";
  return (
    <div className={cn(badgeVariants({ variant: currentVariant }), className)} {...props}>
      {withDot && (
        <span
          className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotColors[currentVariant] || "bg-text-subtle")}
        />
      )}
      <span>{children}</span>
    </div>
  );
}

export { Badge, badgeVariants };

