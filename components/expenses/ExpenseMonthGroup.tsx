"use client";

import { useState } from "react";
import { ChevronDown, FileCheck2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
  if (status === "paid") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "failed") return "bg-red-50 text-red-700 border-red-200";
  if (status === "pending") return "bg-amber-50 text-amber-700 border-amber-200";
  if (status === "review_needed") return "bg-blue-50 text-blue-700 border-blue-200";
  return "bg-slate-50 text-slate-600 border-slate-200";
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
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Group header */}
      <button
        type="button"
        className="flex w-full items-center justify-between gap-4 bg-slate-50 px-4 py-3.5 text-left transition-colors hover:bg-slate-100 sm:px-5"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-3">
          <h2 className="text-[15px] font-bold text-slate-900">{month}</h2>
          <Badge className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[12px] font-semibold text-slate-600 shadow-none">
            {expenses.length} รายการ
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[14px] font-bold text-slate-700">
            ฿{total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </span>
          <ChevronDown
            className={[
              "h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200",
              open ? "rotate-180" : ""
            ].join(" ")}
          />
        </div>
      </button>

      {open ? (
        <>
          {/* Mobile cards */}
          <div className="divide-y divide-slate-100 md:hidden">
            {expenses.map((expense) => (
              <article
                key={expense.id}
                role="button"
                tabIndex={0}
                onClick={() => onOpen(expense.id)}
                onKeyDown={(e) => { if (e.key === "Enter") onOpen(expense.id); }}
                className="cursor-pointer px-4 py-3.5 transition-colors hover:bg-slate-50 active:bg-slate-100"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-bold text-slate-900">
                      {expense.storeName || "ไม่ระบุร้าน"}
                    </p>
                    {expense.detail ? (
                      <p className="mt-0.5 truncate text-[12px] text-slate-500">{expense.detail}</p>
                    ) : null}
                  </div>
                  <Badge className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold shadow-none ${statusClass(expense.paymentStatus)}`}>
                    {statusLabel(expense.paymentStatus)}
                  </Badge>
                </div>

                <div className="mt-3 flex items-end justify-between gap-3">
                  <div className="text-[12px] text-slate-400">
                    <p>{shortThaiDate(expense.purchaseDate)}</p>
                    <p className="mt-0.5 truncate">
                      {expense.documentType}
                      {expense.payerName ? ` · ${expense.payerName}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-[16px] font-bold text-slate-900">
                        ฿{expense.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label="ลบรายการ"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                      onClick={(e) => { e.stopPropagation(); onDelete(expense); }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">วันที่</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">ประเภท</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">ร้านค้า</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">รายละเอียด</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">ผู้เบิก</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">สถานะ</th>
                  <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-400">ยอดชำระ</th>
                  <th className="w-12 px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {expenses.map((expense) => (
                  <tr
                    key={expense.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => onOpen(expense.id)}
                    onKeyDown={(e) => { if (e.key === "Enter") onOpen(expense.id); }}
                    className="cursor-pointer transition-colors hover:bg-slate-50"
                  >
                    <td className="px-5 py-3.5">
                      <span className="text-[13px] text-slate-600">{shortThaiDate(expense.purchaseDate)}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <FileCheck2 className="h-3.5 w-3.5 shrink-0 text-teal-500" />
                        <span className="text-[13px] text-slate-600">{expense.documentType}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-[13px] font-semibold text-slate-800">{expense.storeName || "—"}</span>
                    </td>
                    <td className="px-4 py-3.5 max-w-[200px]">
                      <span className="block truncate text-[13px] text-slate-500">{expense.detail || "—"}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-[13px] text-slate-600">{expense.payerName || "—"}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold shadow-none ${statusClass(expense.paymentStatus)}`}>
                        {statusLabel(expense.paymentStatus)}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <p className="text-[14px] font-bold text-slate-900">
                        ฿{expense.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[11px] text-slate-400">{expense.currency}</p>
                    </td>
                    <td className="px-3 py-3.5">
                      <button
                        type="button"
                        aria-label="ลบรายการ"
                        className="flex h-7 w-7 items-center justify-center rounded-md text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500"
                        onClick={(e) => { e.stopPropagation(); onDelete(expense); }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </section>
  );
}
