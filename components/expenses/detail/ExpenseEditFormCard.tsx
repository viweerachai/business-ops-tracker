"use client";

import { useState } from "react";
import { CalendarDays, ChevronDown, FileText, Store, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ExpenseFormState } from "@/components/expenses/new/types";
import { CATEGORIES, type ReceiptCategory } from "@/lib/types/receipt";
import { cn } from "@/lib/utils";

function Field({
  label,
  required,
  children
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label className="text-sm font-bold text-slate-700">
        {label}
        {required ? <span className="ml-1 text-red-500">*</span> : null}
      </Label>
      {children}
    </div>
  );
}

export function ExpenseEditFormCard({
  form,
  onChange,
  companyName = "ธุรกิจของฉัน"
}: {
  form: ExpenseFormState;
  onChange: (form: ExpenseFormState) => void;
  companyName?: string;
}) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  function update(patch: Partial<ExpenseFormState>) {
    onChange({ ...form, ...patch });
  }

  return (
    <Card className="overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm">
      <CardHeader className="border-b border-slate-100 p-4 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">Step 2</Badge>
              <span className="text-sm font-bold text-slate-400">ข้อมูลหลัก</span>
            </div>
            <h2 className="mt-3 text-xl font-black text-slate-950 md:text-2xl">ตรวจข้อมูลรายจ่าย</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              ดูเฉพาะช่องที่ใช้บ่อยก่อน ส่วนภาษีและข้อมูลผู้ขายอยู่ในข้อมูลเพิ่มเติม
            </p>
          </div>
          <div className="rounded-2xl bg-blue-50 px-4 py-3 text-right">
            <p className="text-xs font-bold text-blue-600">รายจ่ายสำหรับ</p>
            <p className="mt-1 max-w-[220px] truncate text-sm font-black text-blue-950">{companyName}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="grid gap-6 p-4 md:p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="วันที่ออกใบเสร็จ" required>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" />
              <Input
                className="h-12 rounded-xl pl-10"
                value={form.receiptDate}
                type="date"
                onChange={(event) => update({ receiptDate: event.target.value })}
              />
            </div>
          </Field>
          <Field label="ร้านค้า" required>
            <div className="relative">
              <Store className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" />
              <Input
                className="h-12 rounded-xl pl-10"
                value={form.storeName}
                onChange={(event) => update({ storeName: event.target.value })}
              />
            </div>
          </Field>
        </div>

        <Field label="รายละเอียด" required>
          <Input
            className="h-12 rounded-xl"
            value={form.detail}
            onChange={(event) => update({ detail: event.target.value })}
          />
        </Field>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="ประเภทเอกสาร">
            <Select value={form.documentType} onValueChange={(value) => update({ documentType: value as ExpenseFormState["documentType"] })}>
              <SelectTrigger className="h-12 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="receipt">ใบเสร็จรับเงิน</SelectItem>
                <SelectItem value="tax_invoice">ใบกำกับภาษี</SelectItem>
                <SelectItem value="payment_voucher">ใบสำคัญจ่าย</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="หมวดหมู่">
            <Select value={form.category} onValueChange={(value) => update({ category: value as ReceiptCategory })}>
              <SelectTrigger className="h-12 rounded-xl">
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
          </Field>
          <Field label="สถานะการจ่าย">
            <Select value={form.paymentStatus} onValueChange={(value) => update({ paymentStatus: value as ExpenseFormState["paymentStatus"] })}>
              <SelectTrigger className="h-12 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="paid">จ่ายแล้ว</SelectItem>
                <SelectItem value="unpaid">ยังไม่จ่าย</SelectItem>
                <SelectItem value="review">รอตรวจสอบ</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="ผู้บันทึก/ผู้ขอเบิก" required>
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" />
              <Input
                className="h-12 rounded-xl pl-10"
                value={form.requester}
                onChange={(event) => update({ requester: event.target.value })}
              />
            </div>
          </Field>
        </div>

        <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="h-12 w-full justify-between rounded-xl bg-slate-50 px-4 text-left font-black text-slate-700"
            >
              <span className="inline-flex items-center gap-2">
                <FileText className="h-5 w-5 text-slate-500" />
                ข้อมูลภาษีและผู้ขายเพิ่มเติม
              </span>
              <ChevronDown className={cn("h-5 w-5 text-slate-500 transition-transform", advancedOpen ? "rotate-180" : "")} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4">
            <div className="grid gap-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm font-bold text-slate-700">
                <Checkbox
                  checked={form.hasTaxInvoice}
                  onCheckedChange={(checked) => update({ hasTaxInvoice: checked === true })}
                  className="rounded-md border-slate-300"
                />
                มีใบกำกับภาษี
                <FileText className="ml-auto h-4 w-4 text-slate-400" />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="เลขที่ใบกำกับภาษี">
                  <Input className="h-12 rounded-xl bg-white" value={form.invoiceNumber} onChange={(event) => update({ invoiceNumber: event.target.value })} />
                </Field>
                <Field label="ผู้ขาย/ผู้ให้บริการ">
                  <Input className="h-12 rounded-xl bg-white" value={form.vendorName} onChange={(event) => update({ vendorName: event.target.value })} />
                </Field>
                <Field label="เลขประจำตัวผู้เสียภาษีผู้ขาย">
                  <Input className="h-12 rounded-xl bg-white" value={form.vendorTaxId} onChange={(event) => update({ vendorTaxId: event.target.value })} />
                </Field>
                <Field label="สาขา">
                  <Input className="h-12 rounded-xl bg-white" value={form.vendorBranchName} onChange={(event) => update({ vendorBranchName: event.target.value })} />
                </Field>
                <Field label="รหัสสาขา">
                  <Input className="h-12 rounded-xl bg-white" value={form.vendorBranchCode} onChange={(event) => update({ vendorBranchCode: event.target.value })} />
                </Field>
                <Field label="ประเภทค่าใช้จ่าย">
                  <Input className="h-12 rounded-xl bg-white" value={form.expenseType} onChange={(event) => update({ expenseType: event.target.value })} />
                </Field>
                <Field label="หมวดหมู่ย่อย">
                  <Input className="h-12 rounded-xl bg-white" value={form.subCategory} onChange={(event) => update({ subCategory: event.target.value })} />
                </Field>
              </div>

              <Field label="ที่อยู่ผู้ขาย/ผู้ให้บริการ">
                <Input className="h-12 rounded-xl bg-white" value={form.vendorAddress} onChange={(event) => update({ vendorAddress: event.target.value })} />
              </Field>

              <Field label="หมายเหตุ">
                <Textarea
                  className="min-h-24 rounded-xl bg-white"
                  placeholder="เพิ่มหมายเหตุสำหรับรายจ่ายนี้"
                  value={form.note}
                  onChange={(event) => update({ note: event.target.value })}
                />
              </Field>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
