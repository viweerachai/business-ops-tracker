"use client";

import { Check, ChevronDown, FileText, Search, ToggleLeft, UserRound } from "lucide-react";
import type { ExpenseDocumentType, ExpenseFiltersState, ExpensePaymentStatus } from "@/lib/expenseTypes";

const documentTypeOptions: Array<ExpenseDocumentType | "ทั้งหมด"> = [
  "ทั้งหมด",
  "ใบเสร็จรับเงิน",
  "ใบกำกับภาษี",
  "รายจ่ายอื่น ๆ"
];
const statusOptions: Array<ExpensePaymentStatus | "ทั้งหมด"> = [
  "ทั้งหมด",
  "paid",
  "pending",
  "draft",
  "review_needed",
  "failed"
];

function SelectFilter<T extends string>({
  icon: Icon,
  value,
  options,
  onChange,
  className = ""
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: T;
  options: T[];
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <Icon className="pointer-events-none absolute left-4 top-3.5 h-4.5 w-4.5 text-slate-500" />
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-11 pr-9 text-[14px] font-semibold text-slate-600 shadow-sm outline-none hover:border-blue-200 focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-slate-400" />
    </div>
  );
}

export function ExpenseFilters({
  filters,
  payerOptions,
  onChange
}: {
  filters: ExpenseFiltersState;
  payerOptions: string[];
  onChange: (filters: ExpenseFiltersState) => void;
}) {
  function update(patch: Partial<ExpenseFiltersState>) {
    onChange({ ...filters, ...patch });
  }

  return (
    <div className="grid gap-3 lg:flex lg:flex-wrap lg:items-center lg:justify-between lg:gap-4">
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:flex lg:flex-1 lg:flex-wrap">
        <input
          type="date"
          value={filters.date}
          onChange={(event) => update({ date: event.target.value })}
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-[14px] font-semibold text-slate-600 shadow-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 lg:w-[170px]"
        />
        <div className="flex h-11 min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 text-[14px] font-semibold text-slate-500 shadow-sm sm:col-span-2 lg:min-w-[240px] lg:flex-1 lg:max-w-sm">
          <Search className="h-4.5 w-4.5 text-slate-500" />
          <input
            value={filters.search}
            onChange={(event) => update({ search: event.target.value })}
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-slate-400"
            placeholder="ชื่อร้านค้า, รายละเอียด"
          />
        </div>
        <SelectFilter
          icon={UserRound}
          value={filters.payerName}
          options={["ทั้งหมด", ...payerOptions]}
          onChange={(payerName) => update({ payerName })}
          className="w-full lg:w-[150px]"
        />
        <SelectFilter
          icon={FileText}
          value={filters.documentType}
          options={documentTypeOptions}
          onChange={(documentType) => update({ documentType })}
          className="w-full lg:w-[170px]"
        />
        <SelectFilter
          icon={Check}
          value={filters.paymentStatus}
          options={statusOptions}
          onChange={(paymentStatus) => update({ paymentStatus })}
          className="w-full lg:w-[170px]"
        />
      </div>
      <button
        type="button"
        onClick={() => update({ dateMode: filters.dateMode === "purchaseDate" ? "uploadDate" : "purchaseDate" })}
        className="flex min-w-0 shrink-0 items-center justify-center gap-2 rounded-full bg-white px-3 py-2 text-[12px] font-bold text-slate-800 shadow-sm ring-1 ring-slate-200 sm:text-[14px] lg:gap-3 lg:px-4"
      >
        <span className={["truncate", filters.dateMode === "purchaseDate" ? "text-slate-900" : "text-slate-400"].join(" ")}>วันที่ในใบเสร็จ</span>
        <ToggleLeft className={["h-8 w-8", filters.dateMode === "purchaseDate" ? "text-slate-300" : "rotate-180 text-blue-500"].join(" ")} />
        <span className={["truncate", filters.dateMode === "uploadDate" ? "text-slate-900" : "text-slate-400"].join(" ")}>วันที่อัปโหลด</span>
      </button>
    </div>
  );
}
