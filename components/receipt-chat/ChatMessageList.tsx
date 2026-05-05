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
  onViewOcr: () => void;
  onEditAll: () => void;
  onAddItem: () => void;
  onSave: () => void;
  onToggleResale: (itemId: string, checked: boolean) => void;
}) {
  return (
    <div className="grid gap-4 px-4 py-4">
      <BotBubble>
        สวัสดี 👋 ส่งรูปใบเสร็จมาได้เลย
        <br />
        ฉันจะช่วยอ่านและบันทึกต้นทุนให้
      </BotBubble>

      <div className="mr-7 grid max-w-[88%] grid-cols-1 gap-2 min-[360px]:grid-cols-2">
        <Button size="lg" className="h-12 rounded-2xl bg-blue-600 shadow-sm hover:bg-blue-700" onClick={onCamera}>
          <Camera className="h-5 w-5" />
          ถ่ายรูปใบเสร็จ
        </Button>
        <Button size="lg" variant="outline" className="h-12 rounded-2xl bg-white shadow-sm" onClick={onGallery}>
          <ImagePlus className="h-5 w-5" />
          อัปโหลดรูป
        </Button>
      </div>

      {imageUrl ? <UserImageBubble imageUrl={imageUrl} /> : null}
      {phase === "vision" ? <LoadingBubble text="กำลังอ่านข้อความด้วย Google Vision..." /> : null}
      {phase === "gemini" ? <LoadingBubble text="กำลังแปลงเป็นรายการสินค้า..." /> : null}
      {qualityWarning ? <BotBubble className="bg-amber-50 text-amber-950">{qualityWarning}</BotBubble> : null}
      {error ? <BotBubble className="bg-red-50 text-red-900">{error}</BotBubble> : null}
      {phase === "ready" && receipt ? (
        <div className="max-w-full">
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
