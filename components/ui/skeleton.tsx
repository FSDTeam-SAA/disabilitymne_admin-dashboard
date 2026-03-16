import * as React from "react";

import { cn } from "@/lib/utils";

const Skeleton = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("animate-pulse rounded-md bg-white/10", className)} {...props} />
);

export { Skeleton };
