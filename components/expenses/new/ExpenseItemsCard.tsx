"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import type { ExpenseItemState } from "@/components/expenses/new/types";
import { CATEGORIES, type ReceiptCategory } from "@/lib/types/receipt";
import { createId } from "@/lib/utils";

function numberValue(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function blankItem(): ExpenseItemState {
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

export function ExpenseItemsCard({
  items,
  onChange
}: {
  items: ExpenseItemState[];
  onChange: (items: ExpenseItemState[]) => void;
}) {
  function updateItem(index: number, patch: Partial<ExpenseItemState>) {
    onChange(items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  }

  return (
    <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
      <CardHeader className="border-b border-slate-100 p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black">รายการสินค้า</h2>
            <p className="mt-1 text-sm text-slate-500">เพิ่ม แก้ไข หรือลบรายการก่อนบันทึกได้</p>
          </div>
          <Badge className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">{items.length} รายการ</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 p-4 md:p-5">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm font-semibold text-slate-500">
            ยังไม่มีรายการสินค้า
          </div>
        ) : null}

        {items.map((item, index) => (
          <div key={item.id} className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Badge className="rounded-full bg-orange-50 px-3 py-1 text-orange-700">{item.category}</Badge>
              <p className="text-lg font-black text-slate-900">¥{item.totalPrice.toLocaleString("en-US")}</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Input placeholder="ชื่อจากใบเสร็จ" value={item.rawName} onChange={(event) => updateItem(index, { rawName: event.target.value })} />
              <Input placeholder="ชื่ออ่านง่าย" value={item.displayName} onChange={(event) => updateItem(index, { displayName: event.target.value })} />
            </div>
            <div className="grid gap-3 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
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
              <Input inputMode="numeric" placeholder="จำนวน" value={item.quantity} onChange={(event) => updateItem(index, { quantity: numberValue(event.target.value) })} />
              <Input inputMode="numeric" placeholder="ราคา" value={item.unitPrice} onChange={(event) => updateItem(index, { unitPrice: numberValue(event.target.value) })} />
              <Input inputMode="numeric" placeholder="รวม" value={item.totalPrice} onChange={(event) => updateItem(index, { totalPrice: numberValue(event.target.value) })} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl bg-white"
                onClick={() => updateItem(index, { isResaleItem: !item.isResaleItem })}
              >
                <Pencil className="h-4 w-4" />
                {item.isResaleItem ? "สินค้ารีเซล" : "ไม่ใช่สินค้ารีเซล"}
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="rounded-xl"
                onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}
              >
                <Trash2 className="h-4 w-4" />
                ลบ
              </Button>
            </div>
          </div>
        ))}

        <Button variant="outline" className="h-12 rounded-xl bg-white" onClick={() => onChange([...items, blankItem()])}>
          <Plus className="h-5 w-5" />
          เพิ่มรายการ
        </Button>
      </CardContent>
    </Card>
  );
}
