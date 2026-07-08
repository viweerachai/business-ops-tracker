import * as React from "react";
import { cn } from "@/lib/utils";

export const Badge = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    className={cn(
      "inline-flex items-center rounded-sm bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground",
      className
    )}
    {...props}
  />
));

Badge.displayName = "Badge";
