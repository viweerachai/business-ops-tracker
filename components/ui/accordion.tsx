"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function Accordion({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("grid gap-2", className)} {...props} />;
}

export function AccordionItem({ className, ...props }: React.DetailsHTMLAttributes<HTMLDetailsElement>) {
  return <details className={cn("rounded-xl border bg-card", className)} {...props} />;
}

export function AccordionTrigger({ className, children, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <summary
      className={cn("flex cursor-pointer list-none items-center justify-between gap-3 p-3 text-sm font-semibold", className)}
      {...props}
    >
      {children}
      <ChevronDown className="h-4 w-4 text-muted-foreground" />
    </summary>
  );
}

export function AccordionContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("border-t p-3", className)} {...props} />;
}
