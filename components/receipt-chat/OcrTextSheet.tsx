"use client";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

export function OcrTextSheet({
  open,
  onOpenChange,
  ocrText
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ocrText: string;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="min-h-[100dvh] rounded-none bg-[#F7F8FA] sm:min-h-0 sm:rounded-2xl">
        <SheetHeader>
          <div>
            <SheetTitle>ข้อความ OCR</SheetTitle>
            <SheetDescription>ผลลัพธ์จำลองจาก Google Vision</SheetDescription>
          </div>
        </SheetHeader>
        <ScrollArea className="min-h-0 flex-1 p-4">
          <pre className="whitespace-pre-wrap rounded-2xl bg-white p-4 text-sm leading-7 text-slate-900 shadow-sm ring-1 ring-slate-200/70">
            {ocrText}
          </pre>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
