"use client";

import { Camera, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BotBubble } from "@/components/receipt-chat/BotBubble";
import { LoadingBubble } from "@/components/receipt-chat/LoadingBubble";
import { ReceiptResultCard } from "@/components/receipt-chat/ReceiptResultCard";
import { UserImageBubble } from "@/components/receipt-chat/UserImageBubble";
import type { ChatReceipt } from "@/components/receipt-chat/types";

export type ChatPhase = "idle" | "vision" | "gemini" | "ready";

export function ChatMessageList({
  phase,
  imageUrl,
  receipt,
  saved,
  error,
  qualityWarning,
  onCamera,
  onGallery,
  onLoadMock,
  onViewOcr,
  onEditAll,
  onAddItem,
  onSave,
  onToggleResale
}: {
  phase: ChatPhase;
  imageUrl: string | null;
  receipt: ChatReceipt | null;
  saved: boolean;
  error: string | null;
  qualityWarning: string | null;
  onCamera: () => void;
  onGallery: () => void;
  onLoadMock: () => void;
  onViewOcr: () => void;
  onEditAll: () => void;
  onAddItem: () => void;
  onSave: () => void;
  onToggleResale: (itemId: string, checked: boolean) => void;
}) {
  return (
    <div className="grid min-w-0 max-w-full gap-4 overflow-x-hidden px-3 py-4 sm:px-4">
      <BotBubble>
        สวัสดี 👋 ส่งรูปใบเสร็จมาได้เลย
        <br />
        ฉันจะช่วยอ่านและบันทึกต้นทุนให้
      </BotBubble>

      <div className="grid grid-cols-2 gap-2">
        <Button className="h-11 rounded-xl bg-teal-600 px-4 text-[14px] font-semibold text-white shadow-sm hover:bg-teal-700" onClick={onCamera}>
          <Camera className="h-4.5 w-4.5" />
          ถ่ายรูปใบเสร็จ
        </Button>
        <Button variant="outline" className="h-11 rounded-xl border-slate-200 bg-white px-4 text-[14px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50" onClick={onGallery}>
          <ImagePlus className="h-4.5 w-4.5" />
          อัปโหลดรูป
        </Button>
        <Button variant="outline" className="col-span-2 h-10 rounded-xl border-amber-200 bg-amber-50 px-4 text-[13px] font-semibold text-amber-800 shadow-sm hover:bg-amber-100" onClick={onLoadMock}>
          ใช้ mock data
        </Button>
      </div>

      {imageUrl ? <UserImageBubble imageUrl={imageUrl} /> : null}
      {phase === "vision" ? <LoadingBubble text="กำลังอ่านข้อความด้วย Google Vision..." /> : null}
      {phase === "gemini" ? <LoadingBubble text="กำลังแปลงเป็นรายการสินค้า..." /> : null}
      {qualityWarning ? <BotBubble className="bg-amber-50 text-amber-950">{qualityWarning}</BotBubble> : null}
      {error ? <BotBubble className="bg-red-50 text-red-900">{error}</BotBubble> : null}
      {phase === "ready" && receipt ? (
        <div className="min-w-0 max-w-full">
          <ReceiptResultCard
            receipt={receipt}
            saved={saved}
            onViewOcr={onViewOcr}
            onEditAll={onEditAll}
            onAddItem={onAddItem}
            onSave={onSave}
            onToggleResale={onToggleResale}
          />
        </div>
      ) : null}
      {saved ? <BotBubble className="bg-emerald-50 text-emerald-900">บันทึกไว้ในเครื่องแล้ว</BotBubble> : null}
    </div>
  );
}
