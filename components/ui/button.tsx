import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/70 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[linear-gradient(0deg,#4D7EA9_0%,#89C9E6_100%)] text-white shadow-[0_10px_30px_-12px_rgba(143,211,255,.55)] hover:brightness-105",
        secondary:
          "bg-[linear-gradient(0deg,#4D7EA9_0%,#89C9E6_100%)] text-white border border-blue-300/30 hover:brightness-105",
        ghost: "bg-[linear-gradient(0deg,#4D7EA9_0%,#89C9E6_100%)] text-white hover:brightness-105",
        destructive:
          "bg-[linear-gradient(0deg,#4D7EA9_0%,#89C9E6_100%)] text-white hover:brightness-105",
        outline:
          "border border-blue-300/40 bg-[linear-gradient(0deg,#4D7EA9_0%,#89C9E6_100%)] text-white hover:brightness-105",
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "h-9 px-3 text-xs",
        lg: "h-12 px-6",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
