import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-semibold uppercase tracking-wide transition-all focus:outline-none focus:ring-2 focus:ring-[hsl(var(--brand)/0.5)] focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-[hsl(var(--brand)/0.35)] bg-[hsl(var(--brand)/0.18)] text-[hsl(var(--brand)/0.85)] dark:text-[hsl(var(--brand)/0.92)]",
        secondary:
          "border-border bg-secondary/60 text-foreground",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground",
        outline: "border-border text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
