"use client";

import { useState } from "react";
import { ChevronDown, FileCheck2, FolderSync, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import type { Expense } from "@/lib/expenseTypes";

function statusLabel(status: Expense["paymentStatus"]) {
  const labels: Record<Expense["paymentStatus"], string> = {
    draft: "ร่าง",
    review_needed: "ต้องตรวจ",
    paid: "จ่ายแล้ว",
    pending: "รอจ่าย",
    failed: "ผิดพลาด"
  };
  return labels[status];
}

function statusClass(status: Expense["paymentStatus"]) {
  if (status === "paid") return "bg-green-100 text-green-700";
  if (status === "failed") return "bg-red-100 text-red-700";
  if (status === "pending") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

function shortThaiDate(date: string) {
  const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return date;
  return `${day} ${months[month - 1]} ${year}`;
}

export function ExpenseMonthGroup({
  month,
  total,
  expenses,
  onDelete,
  onOpen
}: {
  month: string;
  total: number;
  expenses: Expense[];
  onDelete: (expense: Expense) => void;
  onOpen: (expenseId: string) => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <section className="max-w-full overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
      <div className="flex min-h-[76px] w-full flex-wrap items-center justify-between gap-4 bg-[#F5F5F5] px-5 py-4 text-left">
        <div className="flex items-center gap-4">
          <Checkbox className="h-6 w-6 rounded-md border-slate-300" />
          <button
            type="button"
            className="flex flex-wrap items-center gap-3 text-left"
            onClick={() => setOpen((value) => !value)}
          >
            <h2 className="text-[20px] font-black text-slate-900 2xl:text-[22px]">{month}</h2>
            <Badge className="rounded-md bg-indigo-50 px-2 py-1 text-[15px] font-bold text-indigo-700">
              {expenses.length} รายการ
            </Badge>
          </button>
        </div>
        <div className="flex items-center gap-4 2xl:gap-6">
          <FolderSync className="h-6 w-6 text-slate-400" />
          <p className="text-[18px] font-black text-slate-700 2xl:text-[20px]">ยอดรวม ฿{total.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
          <button
            type="button"
            aria-label={open ? "Collapse month group" : "Expand month group"}
            className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-white"
            onClick={() => setOpen((value) => !value)}
          >
            <ChevronDown className={["h-5 w-5 text-slate-400 transition", open ? "rotate-180" : ""].join(" ")} />
          </button>
        </div>
      </div>

      {open ? (
        <div className="max-w-full overflow-x-auto px-5">
          <div className="min-w-[1160px]">
            <div className="grid h-12 grid-cols-[34px_36px_120px_160px_minmax(150px,1fr)_minmax(190px,1.2fr)_160px_140px_150px] items-center border-b border-slate-200 text-[14px] font-bold text-slate-600">
              <div />
              <div />
              <div>วันที่</div>
              <div>ประเภทเอกสาร</div>
              <div>ร้านค้า</div>
              <div>รายละเอียด</div>
              <div>ผู้อนุญาตเบิกจ่าย</div>
              <div>สถานะการจ่าย</div>
              <div className="text-right">ยอดชำระ</div>
            </div>
            {expenses.map((expense) => (
              <div
                key={expense.id}
                role="button"
                tabIndex={0}
                onClick={() => onOpen(expense.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") onOpen(expense.id);
                }}
                className="grid min-h-20 cursor-pointer grid-cols-[34px_36px_120px_160px_minmax(150px,1fr)_minmax(190px,1.2fr)_160px_140px_150px] items-center border-b border-slate-100 text-[15px] text-slate-600 hover:bg-slate-50 last:border-b-0"
              >
                <Checkbox className="h-5 w-5 rounded-md border-slate-300" onClick={(event) => event.stopPropagation()} />
                <FileCheck2 className="h-5 w-5 text-green-500" />
                <div>{shortThaiDate(expense.purchaseDate)}</div>
                <div>
                  <Badge className="rounded-md bg-indigo-50 px-2 py-1 text-[13px] font-bold text-indigo-700">
                    {expense.documentType}
                  </Badge>
                </div>
                <div className="truncate pr-5">{expense.storeName}</div>
                <div className="truncate pr-5">{expense.detail}</div>
                <div className="truncate pr-4">{expense.payerName}</div>
                <div>
                  <Badge className={`rounded-full px-3 py-1.5 text-[13px] font-black ${statusClass(expense.paymentStatus)}`}>
                    {statusLabel(expense.paymentStatus)}
                  </Badge>
                </div>
                <div className="flex items-center justify-end gap-3">
                  <div className="text-right">
                    <p className="text-[15px] font-black text-slate-700">฿{expense.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {expense.total.toLocaleString("en-US", { minimumFractionDigits: 2 })} {expense.currency}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="Delete expense"
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-red-500 shadow-sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDelete(expense);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
