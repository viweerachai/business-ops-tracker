"use client";

import { FileText, ListPlus, Pencil, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ReceiptItemCard } from "@/components/receipt-chat/ReceiptItemCard";
import type { ChatReceipt } from "@/components/receipt-chat/types";

function yen(value: number | null) {
  if (value === null) return "-";
  return `¥${String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

export function ReceiptResultCard({
  receipt,
  saved,
  onViewOcr,
  onEditAll,
  onAddItem,
  onSave,
  onToggleResale
}: {
  receipt: ChatReceipt;
  saved: boolean;
  onViewOcr: () => void;
  onEditAll: () => void;
  onAddItem: () => void;
  onSave: () => void;
  onToggleResale: (itemId: string, checked: boolean) => void;
}) {
  return (
    <Card className="w-full overflow-hidden rounded-3xl border-slate-200 bg-white shadow-[0_12px_34px_rgba(15,23,42,0.09)]">
      <CardHeader className="gap-3 border-b border-emerald-100 bg-emerald-50 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-base font-black text-emerald-950">✅ อ่านใบเสร็จสำเร็จ</p>
            <p className="mt-1 truncate text-sm font-semibold text-emerald-800">{receipt.storeName || "DOUTOR 西新井西口店"}</p>
          </div>
          <Badge className="shrink-0 rounded-full border border-emerald-100 bg-white px-2.5 py-1 text-emerald-700">
            {receipt.items.length} รายการ
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 p-4">
        <div className="grid gap-2 text-sm">
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2.5">
            <p className="text-xs font-bold text-slate-500">ร้าน</p>
            <p className="min-w-0 truncate text-right font-black text-slate-950">{receipt.storeName || "DOUTOR 西新井西口店"}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-xs font-bold text-slate-500">วันที่</p>
              <p className="mt-1 font-black text-slate-950">{receipt.purchaseDate || "2026/05/02"}</p>
            </div>
            <div className="rounded-2xl bg-blue-50 p-3">
              <p className="text-xs font-bold text-blue-700">รวม</p>
              <p className="mt-1 text-lg font-black text-blue-700">{yen(receipt.total)}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
            <div className="rounded-2xl bg-slate-50 p-3">小計 <span className="font-bold text-slate-800">{yen(receipt.subtotal)}</span></div>
            <div className="rounded-2xl bg-slate-50 p-3">税 <span className="font-bold text-slate-800">{yen(receipt.tax)}</span></div>
          </div>
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-black text-slate-950">รายการสินค้า ({receipt.items.length})</p>
          </div>
          {receipt.items.map((item) => (
            <ReceiptItemCard
              key={item.id}
              item={item}
              onToggleResale={(checked) => onToggleResale(item.id, checked)}
            />
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" className="h-11 rounded-2xl bg-white" onClick={onViewOcr}>
            <FileText className="h-4 w-4" />
            ดู OCR
          </Button>
          <Button variant="outline" className="h-11 rounded-2xl bg-white" onClick={onEditAll}>
            <Pencil className="h-4 w-4" />
            แก้ไขทั้งหมด
          </Button>
          <Button variant="outline" className="h-11 rounded-2xl bg-white" onClick={onAddItem}>
            <ListPlus className="h-4 w-4" />
            เพิ่มรายการ
          </Button>
          <Button className="h-11 rounded-2xl bg-blue-600 text-white hover:bg-blue-700" onClick={onSave}>
            <Save className="h-4 w-4" />
            {saved ? "บันทึกแล้ว" : "บันทึก"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
