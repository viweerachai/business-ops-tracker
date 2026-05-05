"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type SheetContextValue = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const SheetContext = React.createContext<SheetContextValue | null>(null);

function useSheet() {
  const context = React.useContext(SheetContext);
  if (!context) throw new Error("Sheet components must be used inside Sheet.");
  return context;
}

export function Sheet({
  open,
  onOpenChange,
  children
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <SheetContext.Provider value={{ open, onOpenChange }}>
      {children}
    </SheetContext.Provider>
  );
}

export function SheetTrigger({
  children
}: {
  children: React.ReactElement<{ onClick?: React.MouseEventHandler }>;
}) {
  const { onOpenChange } = useSheet();
  return React.cloneElement(children, {
    onClick: (event: React.MouseEvent) => {
      children.props.onClick?.(event);
      onOpenChange(true);
    }
  });
}

export function SheetContent({
  className,
  children
}: React.HTMLAttributes<HTMLDivElement>) {
  const { open, onOpenChange } = useSheet();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        aria-label="Close sheet overlay"
        className="absolute inset-0 bg-black/35"
        onClick={() => onOpenChange(false)}
      />
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 flex max-h-[100dvh] min-h-[80dvh] flex-col rounded-t-2xl border bg-background shadow-xl sm:left-1/2 sm:top-1/2 sm:h-[min(760px,92dvh)] sm:min-h-0 sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { onOpenChange } = useSheet();
  return (
    <div className={cn("flex items-start justify-between gap-3 border-b p-4", className)} {...props}>
      <div className="min-w-0">{props.children}</div>
      <Button variant="ghost" size="icon" title="Close" onClick={() => onOpenChange(false)}>
        <X className="h-5 w-5" />
      </Button>
    </div>
  );
}

export function SheetTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-lg font-bold", className)} {...props} />;
}

export function SheetDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("mt-1 text-sm text-muted-foreground", className)} {...props} />;
}
