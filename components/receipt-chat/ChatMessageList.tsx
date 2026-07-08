"use client";

import { Camera, ImagePlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BotBubble } from "@/components/receipt-chat/BotBubble";
import { LoadingBubble } from "@/components/receipt-chat/LoadingBubble";
import { ReceiptResultCard } from "@/components/receipt-chat/ReceiptResultCard";
import { UserImageBubble } from "@/components/receipt-chat/UserImageBubble";
import type { ChatReceiptEntry, ReceiptBatchProgress } from "@/components/receipt-chat/types";

function percentDone(batch: ReceiptBatchProgress) {
  if (batch.total <= 0) return 0;
  return Math.min(100, Math.round((batch.done / batch.total) * 100));
}

export function ChatMessageList({
  onCamera,
  onGallery,
  onLoadMock,
  onViewOcr,
  onEditAll,
  onAddItem,
  onSave,
  onToggleResale,
  receipts = [],
  batch
}: {
  onCamera: () => void;
  onGallery: () => void;
  onLoadMock: () => void;
  onViewOcr: (receiptId: string) => void;
  onEditAll: (receiptId: string) => void;
  onAddItem: (receiptId: string) => void;
  onSave: (receiptId: string) => void;
  onToggleResale: (receiptId: string, itemId: string, checked: boolean) => void;
  receipts?: ChatReceiptEntry[];
  batch: ReceiptBatchProgress;
}) {
  const processingPercent = percentDone(batch);
  const failedEntries = receipts.filter((entry) => entry.phase === "error");

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

      {batch.active ? (
        <Card className="overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm">
          <CardContent className="grid gap-3 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[13px] font-bold text-slate-950">กำลังประมวลผลหลายรูป</p>
                <p className="text-[12px] text-slate-500">{batch.currentFileName || "กำลังทำงาน..."}</p>
              </div>
              <Badge className="rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-semibold text-teal-700">
                {processingPercent}%
              </Badge>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-teal-600 transition-all duration-300" style={{ width: `${processingPercent}%` }} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700">
                ทั้งหมด {batch.total}
              </Badge>
              <Badge className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-700">
                สำเร็จ {batch.success}
              </Badge>
              <Badge className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-red-700">
                error {batch.failed}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {!batch.active && batch.total > 0 ? (
        <Card className="overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm">
          <CardContent className="grid gap-3 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[13px] font-bold text-slate-950">สรุปการประมวลผล</p>
                <p className="text-[12px] text-slate-500">
                  เสร็จ {batch.done}/{batch.total}
                </p>
              </div>
              <Badge className="rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-semibold text-teal-700">
                {percentDone(batch)}%
              </Badge>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-teal-600 transition-all duration-300" style={{ width: `${percentDone(batch)}%` }} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-700">
                สำเร็จ {batch.success}
              </Badge>
              <Badge className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-red-700">
                error {batch.failed}
              </Badge>
            </div>
            {failedEntries.length > 0 ? (
              <div className="grid gap-2 rounded-xl bg-red-50 p-3">
                <p className="text-[12px] font-bold text-red-800">ไฟล์ที่มีปัญหา</p>
                {failedEntries.map((entry) => (
                  <div key={entry.id} className="grid gap-0.5 rounded-lg bg-white px-3 py-2 ring-1 ring-red-100">
                    <p className="truncate text-[12px] font-semibold text-slate-900">{entry.sourceName}</p>
                    <p className="text-[12px] text-red-700">{entry.error || "ไม่ทราบสาเหตุ"}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {receipts.map((entry) => (
        <div key={entry.id} className="grid gap-3">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-[12px] font-semibold text-slate-500">{entry.sourceName}</p>
            {entry.phase === "error" ? (
              <Badge className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-red-700">
                error
              </Badge>
            ) : null}
          </div>
          <UserImageBubble imageUrl={entry.imageDataUrl} />
          {entry.phase === "vision" ? <LoadingBubble text="กำลังอ่านข้อความด้วย Google Vision..." /> : null}
          {entry.phase === "gemini" ? <LoadingBubble text="กำลังแปลงเป็นรายการสินค้า..." /> : null}
          {entry.qualityWarning ? <BotBubble className="bg-amber-50 text-amber-950">{entry.qualityWarning}</BotBubble> : null}
          {entry.error ? <BotBubble className="bg-red-50 text-red-900">{entry.error}</BotBubble> : null}
          {entry.receipt ? (
            <div className="min-w-0 max-w-full">
              <ReceiptResultCard
                receipt={entry.receipt}
                saved={entry.saved}
                onViewOcr={() => onViewOcr(entry.id)}
                onEditAll={() => onEditAll(entry.id)}
                onAddItem={() => onAddItem(entry.id)}
                onSave={() => onSave(entry.id)}
                onToggleResale={(itemId, checked) => onToggleResale(entry.id, itemId, checked)}
              />
            </div>
          ) : null}
          {entry.saved ? <BotBubble className="bg-emerald-50 text-emerald-900">บันทึกไว้ในเครื่องแล้ว</BotBubble> : null}
        </div>
      ))}
    </div>
  );
}
