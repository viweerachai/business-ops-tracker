"use client";

import { Camera, ImagePlus, SendHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ChatComposer({
  onCamera,
  onGallery
}: {
  onCamera: () => void;
  onGallery: () => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-full border-t border-slate-200/80 bg-white px-2.5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2.5 shadow-[0_-8px_28px_rgba(15,23,42,0.06)] sm:max-w-[480px] sm:border-x sm:border-slate-200">
      <div className="flex min-w-0 items-center gap-1.5">
        <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 rounded-full bg-slate-50 text-slate-700 sm:h-11 sm:w-11" title="Camera" aria-label="Camera" onClick={onCamera}>
          <Camera className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 rounded-full bg-slate-50 text-slate-700 sm:h-11 sm:w-11" title="Gallery" aria-label="Gallery" onClick={onGallery}>
          <ImagePlus className="h-5 w-5" />
        </Button>
        <Input
          className="h-10 min-w-0 flex-1 rounded-full border-slate-200 bg-slate-50 px-3 text-sm shadow-inner sm:h-11 sm:px-4"
          placeholder="เช่น: เปลี่ยนร้านเป็น LAWSON"
        />
        <Button size="icon" className="h-10 w-10 shrink-0 rounded-full bg-teal-600 text-white hover:bg-teal-700 sm:h-11 sm:w-11" title="Send" aria-label="Send">
          <SendHorizontal className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
