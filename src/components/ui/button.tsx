import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--valk-radius-md)] text-dense ring-offset-background transition-[background-color,border-color,color,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--valk-border-accent)] focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.97]",
  {
    variants: {
      variant: {
        default:
          "border border-accent bg-accent text-primary hover:bg-[var(--valk-accent-hover)]",
        destructive:
          "border border-[var(--valk-loss)] bg-loss text-[var(--valk-loss)] hover:bg-[var(--valk-loss-bg)]",
        outline:
          "border border-subtle bg-surface-alt text-primary hover:bg-hover",
        secondary:
          "border border-subtle bg-surface text-secondary hover:bg-surface-alt hover:text-primary",
        ghost: "text-secondary hover:bg-hover hover:text-primary",
        link: "text-accent underline-offset-4 hover:underline",
      },
      size: {
        default: "min-h-10 px-5 py-3 font-semibold",
        sm: "min-h-9 px-3 py-2 text-caption font-medium",
        lg: "min-h-11 px-6 py-3 font-semibold",
        icon: "h-10 w-10 px-0 py-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
