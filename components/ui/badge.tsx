import * as React from "react";

import { cn } from "@/lib/utils";

type BadgeVariant = "blue" | "green" | "orange" | "red" | "neutral" | "outline";

const variantClasses: Record<BadgeVariant, string> = {
  blue: "bg-[#1890ff] text-white",
  green: "bg-[#3dcc5f] text-white",
  orange: "bg-[#ff9f31] text-white",
  red: "bg-[#ff194f] text-white",
  neutral: "border border-blue-300/40 text-slate-200",
  outline: "border border-blue-300/40 text-slate-200 bg-transparent",
};

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ className, variant = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold capitalize",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}
