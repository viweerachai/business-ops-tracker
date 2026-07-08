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

function money(value: number | null, currency: ChatReceipt["originalCurrency"] | ChatReceipt["baseCurrency"]) {
  if (value === null) return "-";
  return `${currency} ${String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
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
    <Card className="min-w-0 max-w-full overflow-hidden rounded-2xl border-slate-200 bg-white shadow-md">
      {/* Header */}
      <CardHeader className="gap-2 border-b border-emerald-100 bg-emerald-50 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
              <p className="text-[14px] font-bold text-emerald-950">อ่านใบเสร็จสำเร็จ</p>
            </div>
            <p className="mt-0.5 truncate text-[13px] font-semibold text-emerald-700">{receipt.storeName || "-"}</p>
          </div>
          <Badge className="shrink-0 rounded-full border border-emerald-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
            {receipt.items.length} รายการ
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="grid min-w-0 gap-3 overflow-x-hidden p-4">
        {/* Receipt info grid */}
        <div className="grid min-w-0 gap-1.5 text-sm">
          {/* Store row */}
          <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
            <p className="text-[11px] font-semibold text-slate-400">ร้าน</p>
            <p className="min-w-0 truncate text-right text-[13px] font-bold text-slate-950">{receipt.storeName || "-"}</p>
          </div>
          {/* Currency + Rate */}
          <div className="grid grid-cols-3 gap-1.5">
            <div className="rounded-lg bg-slate-50 px-2.5 py-2">
              <p className="text-[10px] font-semibold text-slate-400">สกุลเงิน</p>
              <p className="mt-1 truncate text-[13px] font-bold text-slate-950">{receipt.originalCurrency}</p>
            </div>
            <div className="rounded-lg bg-slate-50 px-2.5 py-2">
              <p className="text-[10px] font-semibold text-slate-400">สกุลหลัก</p>
              <p className="mt-1 truncate text-[13px] font-bold text-slate-950">{receipt.baseCurrency}</p>
            </div>
            <div className="rounded-lg bg-teal-50 px-2.5 py-2">
              <p className="text-[10px] font-semibold text-teal-600">เรท</p>
              <p className="mt-1 truncate text-[13px] font-bold text-teal-700">{receipt.exchangeRate > 0 ? receipt.exchangeRate.toFixed(4) : "-"}</p>
            </div>
          </div>
          {/* Date + Total */}
          <div className="grid grid-cols-2 gap-1.5">
            <div className="rounded-lg bg-slate-50 px-2.5 py-2">
              <p className="text-[10px] font-semibold text-slate-400">วันที่</p>
              <p className="mt-1 truncate text-[13px] font-bold text-slate-950">{receipt.purchaseDate || "-"}</p>
            </div>
            <div className="min-w-0 rounded-lg bg-teal-50 px-2.5 py-2">
              <p className="text-[10px] font-semibold text-teal-600">ยอดรวม</p>
              <p className="mt-1 truncate text-[16px] font-bold text-teal-700">{yen(receipt.total)}</p>
            </div>
          </div>
          {/* Subtotal + Shipping + Tax */}
          <div className="grid grid-cols-3 gap-1.5 text-[11px] text-slate-500">
            <div className="min-w-0 truncate rounded-lg bg-slate-50 px-2.5 py-2">
              <span>小計 </span><span className="font-bold text-slate-700">{yen(receipt.subtotal)}</span>
            </div>
            <div className="min-w-0 truncate rounded-lg bg-slate-50 px-2.5 py-2">
              <span>送料 </span><span className="font-bold text-slate-700">{yen(receipt.shipping)}</span>
            </div>
            <div className="min-w-0 truncate rounded-lg bg-slate-50 px-2.5 py-2">
              <span>税 </span><span className="font-bold text-slate-700">{yen(receipt.tax)}</span>
            </div>
          </div>
          {/* THB values */}
          <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-500">
            <div className="min-w-0 truncate rounded-lg bg-emerald-50 px-2.5 py-2">
              <span className="text-emerald-600">{receipt.baseCurrency} รวม </span>
              <span className="font-bold text-emerald-700">{money(receipt.total ? receipt.total * receipt.exchangeRate : null, receipt.baseCurrency)}</span>
            </div>
            <div className="min-w-0 truncate rounded-lg bg-emerald-50 px-2.5 py-2">
              <span className="text-emerald-600">{receipt.baseCurrency} เฉลี่ย </span>
              <span className="font-bold text-emerald-700">{money(receipt.total ? receipt.total * receipt.exchangeRate : null, receipt.baseCurrency)}</span>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="grid min-w-0 max-w-full gap-1.5 overflow-x-hidden">
          <p className="text-[13px] font-bold text-slate-950">รายการสินค้า ({receipt.items.length})</p>
          {receipt.items.map((item) => (
            <ReceiptItemCard
              key={item.id}
              item={item}
              onToggleResale={(checked) => onToggleResale(item.id, checked)}
            />
          ))}
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" className="h-10 rounded-xl border-slate-200 bg-white text-[13px] font-semibold text-slate-700 hover:bg-slate-50" onClick={onViewOcr}>
            <FileText className="h-4 w-4" />
            <span className="truncate">ดู OCR</span>
          </Button>
          <Button variant="outline" className="h-10 rounded-xl border-slate-200 bg-white text-[13px] font-semibold text-slate-700 hover:bg-slate-50" onClick={onEditAll}>
            <Pencil className="h-4 w-4" />
            <span className="truncate">แก้ไขทั้งหมด</span>
          </Button>
          <Button variant="outline" className="h-10 rounded-xl border-slate-200 bg-white text-[13px] font-semibold text-slate-700 hover:bg-slate-50" onClick={onAddItem}>
            <ListPlus className="h-4 w-4" />
            <span className="truncate">เพิ่มรายการ</span>
          </Button>
          <Button
            className={saved ? "h-10 rounded-xl bg-emerald-600 text-[13px] font-semibold text-white hover:bg-emerald-700" : "h-10 rounded-xl bg-teal-600 text-[13px] font-semibold text-white hover:bg-teal-700"}
            onClick={onSave}
          >
            <Save className="h-4 w-4" />
            <span className="truncate">{saved ? "บันทึกแล้ว" : "บันทึก"}</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
