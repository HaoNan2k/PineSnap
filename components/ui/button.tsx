import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "ghost" | "link" | "destructive" | "outline" | "secondary"
  size?: "default" | "sm" | "lg" | "icon"
}

const variantClassName: Record<NonNullable<ButtonProps["variant"]>, string> = {
  default: "bg-gray-900 text-white hover:bg-gray-900/90",
  ghost: "hover:bg-gray-100 hover:text-gray-900",
  link: "underline-offset-4 hover:underline text-gray-900",
  destructive: "bg-red-600 text-white hover:bg-red-600/90",
  outline: "border border-gray-200 hover:bg-gray-100 hover:text-gray-900",
  secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200",
}

const sizeClassName: Record<NonNullable<ButtonProps["size"]>, string> = {
  default: "h-9 px-4 py-2",
  sm: "h-8 rounded-md px-3 text-xs",
  lg: "h-10 rounded-md px-8",
  icon: "h-9 w-9",
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-400 disabled:pointer-events-none disabled:opacity-50",
          variantClassName[variant],
          sizeClassName[size],
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }

