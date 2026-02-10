import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-all duration-200 ease-apple focus:outline-none focus:ring-2 focus:ring-ring/25",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary/10 text-primary hover:bg-primary/15",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/70",
        destructive: "border-transparent bg-destructive/10 text-destructive hover:bg-destructive/15",
        outline: "border-border/60 text-foreground bg-background/50",
        success: "border-transparent bg-success/10 text-success hover:bg-success/15",
        warning: "border-transparent bg-warning/10 text-warning hover:bg-warning/15",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
