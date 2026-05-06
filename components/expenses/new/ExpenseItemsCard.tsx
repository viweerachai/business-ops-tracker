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
import { normalizedExchangeRate, type CurrencyCode } from "@/components/expenses/expenseSummaryUtils";
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

function formatAmount(value: number, currency: CurrencyCode) {
  const symbol = currency === "JPY" ? "¥" : currency === "THB" ? "฿" : "";
  return `${symbol}${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: currency === "JPY" ? 0 : 2,
    maximumFractionDigits: currency === "JPY" ? 0 : 2
  })}`;
}

function MoneyField({
  label,
  value,
  currency,
  readOnly,
  onChange
}: {
  label: string;
  value: number;
  currency: CurrencyCode;
  readOnly?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-bold text-slate-800">{label}</span>
      <div className="relative">
        <Input
          inputMode="decimal"
          readOnly={readOnly}
          value={Number(value || 0).toLocaleString("en-US", {
            minimumFractionDigits: readOnly ? 2 : 0,
            maximumFractionDigits: readOnly ? 2 : 2
          })}
          className={[
            "h-12 rounded-xl border-slate-300 pr-16 text-base shadow-none",
            readOnly ? "bg-slate-50 text-slate-500" : "bg-white text-slate-950"
          ].join(" ")}
          onChange={(event) => onChange(numberValue(event.target.value.replace(/,/g, "")))}
        />
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-base font-semibold text-slate-400">
          {currency}
        </span>
      </div>
    </label>
  );
}

export function ExpenseItemsCard({
  items,
  onChange,
  originalCurrency = "JPY",
  baseCurrency = "THB",
  exchangeRate = 1
}: {
  items: ExpenseItemState[];
  onChange: (items: ExpenseItemState[]) => void;
  originalCurrency?: CurrencyCode;
  baseCurrency?: CurrencyCode;
  exchangeRate?: number;
}) {
  const rate = normalizedExchangeRate({ originalCurrency, baseCurrency, exchangeRate });
  const showBaseCurrency = originalCurrency !== baseCurrency;

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
          <div key={item.id} className="grid gap-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Badge className="rounded-full bg-orange-50 px-3 py-1 text-orange-700">{item.category}</Badge>
              <div className="text-right">
                <p className="text-lg font-black text-slate-900">
                  {formatAmount(item.totalPrice, originalCurrency)}
                </p>
                {showBaseCurrency ? (
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    ≈ {formatAmount(item.totalPrice * rate, baseCurrency)}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Input className="h-12 rounded-xl bg-white" placeholder="ชื่อจากใบเสร็จ" value={item.rawName} onChange={(event) => updateItem(index, { rawName: event.target.value })} />
              <Input className="h-12 rounded-xl bg-white" placeholder="ชื่ออ่านง่าย" value={item.displayName} onChange={(event) => updateItem(index, { displayName: event.target.value })} />
            </div>
            <div className="grid gap-3 md:grid-cols-[1fr_0.85fr]">
              <label className="grid gap-2">
                <span className="text-sm font-bold text-slate-800">หมวดหมู่</span>
                <Select value={item.category} onValueChange={(value) => updateItem(index, { category: value as ReceiptCategory })}>
                  <SelectTrigger className="h-12 rounded-xl bg-white">
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
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-bold text-slate-800">จำนวน</span>
                <Input className="h-12 rounded-xl bg-white" inputMode="numeric" value={item.quantity} onChange={(event) => updateItem(index, { quantity: numberValue(event.target.value) })} />
              </label>
            </div>

            {showBaseCurrency ? (
              <div className="grid gap-4 md:grid-cols-2">
                <MoneyField
                  label={`ราคาต่อหน่วย (${originalCurrency})`}
                  value={item.unitPrice}
                  currency={originalCurrency}
                  onChange={(value) => updateItem(index, { unitPrice: value })}
                />
                <MoneyField
                  label={`ราคาต่อหน่วย (${baseCurrency})`}
                  value={item.unitPrice * rate}
                  currency={baseCurrency}
                  readOnly
                  onChange={() => undefined}
                />
                <MoneyField
                  label={`ยอดรวม (${originalCurrency})`}
                  value={item.totalPrice}
                  currency={originalCurrency}
                  onChange={(value) => updateItem(index, { totalPrice: value })}
                />
                <MoneyField
                  label={`ยอดรวม (${baseCurrency})`}
                  value={item.totalPrice * rate}
                  currency={baseCurrency}
                  readOnly
                  onChange={() => undefined}
                />
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                <MoneyField
                  label={`ราคาต่อหน่วย (${originalCurrency})`}
                  value={item.unitPrice}
                  currency={originalCurrency}
                  onChange={(value) => updateItem(index, { unitPrice: value })}
                />
                <MoneyField
                  label={`ยอดรวม (${originalCurrency})`}
                  value={item.totalPrice}
                  currency={originalCurrency}
                  onChange={(value) => updateItem(index, { totalPrice: value })}
                />
              </div>
            )}
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
