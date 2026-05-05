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
    <div className="shrink-0 border-t border-slate-200/80 bg-white px-3 pt-2.5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-8px_28px_rgba(15,23,42,0.06)]">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-11 w-11 rounded-full bg-slate-50 text-slate-700" title="Camera" aria-label="Camera" onClick={onCamera}>
          <Camera className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-11 w-11 rounded-full bg-slate-50 text-slate-700" title="Gallery" aria-label="Gallery" onClick={onGallery}>
          <ImagePlus className="h-5 w-5" />
        </Button>
        <Input
          className="h-11 min-w-0 flex-1 rounded-full border-slate-200 bg-slate-50 px-4 text-sm shadow-inner"
          placeholder="เช่น: เปลี่ยนร้านเป็น LAWSON"
        />
        <Button size="icon" className="h-11 w-11 rounded-full bg-blue-600 text-white hover:bg-blue-700" title="Send" aria-label="Send">
          <SendHorizontal className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
