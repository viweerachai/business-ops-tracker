"use client";

import { Plus, Trash2 } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORIES, type ReceiptCategory } from "@/lib/types/receipt";
import { createId } from "@/lib/utils";
import type { ChatReceipt, ChatReceiptItem } from "@/components/receipt-chat/types";

function numberValue(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function blankItem(): ChatReceiptItem {
  return {
    id: createId(),
    rawName: "",
    displayName: "",
    category: "Other",
    quantity: 1,
    unitPrice: 0,
    totalPrice: 0,
    isResaleItem: true,
    memo: "要確認"
  };
}

export function ReceiptEditSheet({
  open,
  onOpenChange,
  receipt,
  onChange
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipt: ChatReceipt;
  onChange: (receipt: ChatReceipt) => void;
}) {
  function updateReceipt(patch: Partial<ChatReceipt>) {
    onChange({ ...receipt, ...patch });
  }

  function updateItem(index: number, patch: Partial<ChatReceiptItem>) {
    updateReceipt({
      items: receipt.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      )
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="min-h-[100dvh] rounded-none bg-[#F7F8FA] sm:min-h-0 sm:rounded-2xl">
        <SheetHeader>
          <div>
            <SheetTitle>แก้ไขใบเสร็จ</SheetTitle>
            <SheetDescription>แก้ด้วยฟอร์มเท่านั้น ยังไม่ใช้คำสั่งแชต</SheetDescription>
          </div>
        </SheetHeader>
        <ScrollArea className="min-h-0 flex-1 px-4 py-4">
          <div className="grid gap-4 pb-8">
            <div className="grid gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
              <div className="grid gap-2">
                <Label>ร้านค้า</Label>
                <Input value={receipt.storeName} onChange={(event) => updateReceipt({ storeName: event.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>วันที่ซื้อ</Label>
                <Input value={receipt.purchaseDate} onChange={(event) => updateReceipt({ purchaseDate: event.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="grid gap-2">
                  <Label>小計</Label>
                  <Input inputMode="numeric" value={receipt.subtotal ?? ""} onChange={(event) => updateReceipt({ subtotal: event.target.value ? numberValue(event.target.value) : null })} />
                </div>
                <div className="grid gap-2">
                  <Label>税</Label>
                  <Input inputMode="numeric" value={receipt.tax ?? ""} onChange={(event) => updateReceipt({ tax: event.target.value ? numberValue(event.target.value) : null })} />
                </div>
                <div className="grid gap-2">
                  <Label>合計</Label>
                  <Input inputMode="numeric" value={receipt.total ?? ""} onChange={(event) => updateReceipt({ total: event.target.value ? numberValue(event.target.value) : null })} />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <h3 className="font-bold">รายการสินค้า</h3>
              <Button size="default" variant="outline" onClick={() => updateReceipt({ items: [...receipt.items, blankItem()] })}>
                <Plus className="h-4 w-4" />
                เพิ่มรายการ
              </Button>
            </div>

            <Accordion>
              {receipt.items.map((item, index) => (
                <AccordionItem key={item.id} className="rounded-2xl bg-white shadow-sm" open={index === 0 ? true : undefined}>
                  <AccordionTrigger>{item.displayName || item.rawName || `รายการ ${index + 1}`}</AccordionTrigger>
                  <AccordionContent>
                    <div className="grid gap-3">
                      <div className="grid gap-2">
                        <Label>ชื่อจาก OCR</Label>
                        <Input value={item.rawName} onChange={(event) => updateItem(index, { rawName: event.target.value })} />
                      </div>
                      <div className="grid gap-2">
                        <Label>ชื่ออ่านง่าย</Label>
                        <Input value={item.displayName} onChange={(event) => updateItem(index, { displayName: event.target.value })} />
                      </div>
                      <div className="grid gap-2">
                        <Label>หมวดหมู่</Label>
                        <Select value={item.category} onValueChange={(value) => updateItem(index, { category: value as ReceiptCategory })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="grid gap-2">
                          <Label>จำนวน</Label>
                          <Input inputMode="numeric" value={item.quantity} onChange={(event) => updateItem(index, { quantity: numberValue(event.target.value) })} />
                        </div>
                        <div className="grid gap-2">
                          <Label>単価</Label>
                          <Input inputMode="numeric" value={item.unitPrice} onChange={(event) => updateItem(index, { unitPrice: numberValue(event.target.value) })} />
                        </div>
                        <div className="grid gap-2">
                          <Label>合計</Label>
                          <Input inputMode="numeric" value={item.totalPrice} onChange={(event) => updateItem(index, { totalPrice: numberValue(event.target.value) })} />
                        </div>
                      </div>
                      <label className="flex items-center gap-3 rounded-xl bg-muted/60 p-3 text-sm font-semibold">
                        <Checkbox checked={item.isResaleItem} onCheckedChange={(checked) => updateItem(index, { isResaleItem: checked === true })} />
                        สินค้ารีเซล
                      </label>
                      <div className="grid gap-2">
                        <Label>เมโม</Label>
                        <Textarea value={item.memo} onChange={(event) => updateItem(index, { memo: event.target.value })} />
                      </div>
                      <Button
                        variant="destructive"
                        onClick={() => updateReceipt({ items: receipt.items.filter((_, itemIndex) => itemIndex !== index) })}
                      >
                        <Trash2 className="h-4 w-4" />
                        ลบรายการนี้
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </ScrollArea>
        <div className="border-t bg-background p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <Button className="w-full" size="lg" onClick={() => onOpenChange(false)}>
            ยืนยันการแก้ไข
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
