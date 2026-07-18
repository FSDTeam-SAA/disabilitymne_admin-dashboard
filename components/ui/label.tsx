import * as React from "react";

import { cn } from "@/lib/utils";

const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => {
    // "block" + "pb-1.5" give every label consistent breathing room above
    // its form field across the dashboard (padding is used instead of margin
    // so it can't collapse with the parent's space-y-* spacing).
    return <label ref={ref} className={cn("block pb-1.5 text-sm font-medium text-slate-100", className)} {...props} />;
  }
);
Label.displayName = "Label";

export { Label };
