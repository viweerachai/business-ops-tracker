"use client";

import { CalendarDays, FileText, Store, UserRound } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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

function numberValue(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function ExpenseFormCard({
  form,
  onChange,
  companyName = "ธุรกิจของฉัน"
}: {
  form: ExpenseFormState;
  onChange: (form: ExpenseFormState) => void;
  companyName?: string;
}) {
  function update(patch: Partial<ExpenseFormState>) {
    onChange({ ...form, ...patch });
  }

  return (
    <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
      <CardHeader className="border-b border-slate-100 p-4 md:p-5">
        <div>
          <h2 className="text-lg font-black">ข้อมูลรายจ่าย</h2>
          <p className="mt-1 text-sm text-slate-500">แก้ข้อมูลก่อนสร้างรายจ่ายได้ทุกช่อง</p>
        </div>
      </CardHeader>
      <CardContent className="grid gap-5 p-4 md:p-5">
        <div className="rounded-2xl bg-blue-50 p-4">
          <p className="text-sm text-blue-700">รายจ่ายสำหรับ</p>
          <p className="mt-1 text-base font-black text-blue-950">{companyName}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="วันที่ออกใบเสร็จ" required>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" />
              <Input className="pl-10" value={form.receiptDate} type="date" onChange={(event) => update({ receiptDate: event.target.value })} />
            </div>
          </Field>
          <Field label="ร้านค้า" required>
            <div className="relative">
              <Store className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" />
              <Input className="pl-10" value={form.storeName} onChange={(event) => update({ storeName: event.target.value })} />
            </div>
          </Field>
        </div>

        <Field label="รายละเอียด" required>
          <Input value={form.detail} onChange={(event) => update({ detail: event.target.value })} />
        </Field>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="ประเภทเอกสาร">
            <Select value={form.documentType} onValueChange={(value) => update({ documentType: value as ExpenseFormState["documentType"] })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="receipt">ใบเสร็จรับเงิน</SelectItem>
                <SelectItem value="tax_invoice">ใบกำกับภาษี</SelectItem>
                <SelectItem value="payment_voucher">ใบสำคัญจ่าย</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="เลขที่ใบกำกับภาษี">
            <Input value={form.invoiceNumber} onChange={(event) => update({ invoiceNumber: event.target.value })} />
          </Field>
          <Field label="หมวดหมู่">
            <Select value={form.category} onValueChange={(value) => update({ category: value as ReceiptCategory })}>
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
          </Field>
          <Field label="สถานะการจ่าย">
            <Select value={form.paymentStatus} onValueChange={(value) => update({ paymentStatus: value as ExpenseFormState["paymentStatus"] })}>
              <SelectTrigger>
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
              <Input className="pl-10" value={form.requester} onChange={(event) => update({ requester: event.target.value })} />
            </div>
          </Field>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Field label="ยอดก่อนภาษี">
            <Input inputMode="numeric" value={form.subtotal} onChange={(event) => update({ subtotal: numberValue(event.target.value) })} />
          </Field>
          <Field label="ภาษีมูลค่าเพิ่ม">
            <Input inputMode="numeric" value={form.tax} onChange={(event) => update({ tax: numberValue(event.target.value) })} />
          </Field>
          <Field label="ภาษีหัก ณ ที่จ่าย">
            <Input inputMode="numeric" value={form.withholdingTax} onChange={(event) => update({ withholdingTax: numberValue(event.target.value) })} />
          </Field>
          <Field label="ยอดชำระ" required>
            <Input inputMode="numeric" value={form.amount} onChange={(event) => update({ amount: numberValue(event.target.value) })} />
          </Field>
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_1fr_160px]">
          <Field label="ประเภทค่าใช้จ่าย">
            <Input value={form.expenseType} onChange={(event) => update({ expenseType: event.target.value })} />
          </Field>
          <Field label="หมวดหมู่ย่อย">
            <Input value={form.subCategory} onChange={(event) => update({ subCategory: event.target.value })} />
          </Field>
          <Field label="สกุลเงิน">
            <Select value={form.currency} onValueChange={(value) => update({ currency: value as ExpenseFormState["currency"] })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="JPY">JPY</SelectItem>
                <SelectItem value="THB">THB</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="ผู้ขาย/ผู้ให้บริการ">
            <Input value={form.vendorName} onChange={(event) => update({ vendorName: event.target.value })} />
          </Field>
          <Field label="เลขประจำตัวผู้เสียภาษีผู้ขาย">
            <Input value={form.vendorTaxId} onChange={(event) => update({ vendorTaxId: event.target.value })} />
          </Field>
          <Field label="สาขา">
            <Input value={form.vendorBranchName} onChange={(event) => update({ vendorBranchName: event.target.value })} />
          </Field>
          <Field label="รหัสสาขา">
            <Input value={form.vendorBranchCode} onChange={(event) => update({ vendorBranchCode: event.target.value })} />
          </Field>
        </div>

        <Field label="ที่อยู่ผู้ขาย/ผู้ให้บริการ">
          <Input value={form.vendorAddress} onChange={(event) => update({ vendorAddress: event.target.value })} />
        </Field>

        <label className="flex items-center gap-3 rounded-xl border bg-slate-50 p-3 text-sm font-bold text-slate-700">
          <Checkbox checked={form.hasTaxInvoice} onCheckedChange={(checked) => update({ hasTaxInvoice: checked === true })} className="rounded-md border-slate-300" />
          มีใบกำกับภาษี
          <FileText className="ml-auto h-4 w-4 text-slate-400" />
        </label>

        <Field label="หมายเหตุ">
          <Textarea className="min-h-24" placeholder="เพิ่มหมายเหตุสำหรับรายจ่ายนี้" value={form.note} onChange={(event) => update({ note: event.target.value })} />
        </Field>
      </CardContent>
    </Card>
  );
}
