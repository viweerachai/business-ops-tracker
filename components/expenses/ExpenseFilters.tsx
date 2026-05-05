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
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 flex-1 flex-wrap gap-3">
        <input
          type="date"
          value={filters.date}
          onChange={(event) => update({ date: event.target.value })}
          className="h-11 w-[170px] rounded-xl border border-slate-200 bg-white px-4 text-[14px] font-semibold text-slate-600 shadow-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
        />
        <div className="flex h-11 min-w-[240px] flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 text-[14px] font-semibold text-slate-500 shadow-sm lg:max-w-sm">
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
          className="w-[150px]"
        />
        <SelectFilter
          icon={FileText}
          value={filters.documentType}
          options={documentTypeOptions}
          onChange={(documentType) => update({ documentType })}
          className="w-[170px]"
        />
        <SelectFilter
          icon={Check}
          value={filters.paymentStatus}
          options={statusOptions}
          onChange={(paymentStatus) => update({ paymentStatus })}
          className="w-[170px]"
        />
      </div>
      <button
        type="button"
        onClick={() => update({ dateMode: filters.dateMode === "purchaseDate" ? "uploadDate" : "purchaseDate" })}
        className="flex shrink-0 items-center gap-3 rounded-full bg-white px-4 py-2 text-[14px] font-bold text-slate-800 shadow-sm ring-1 ring-slate-200"
      >
        <span className={filters.dateMode === "purchaseDate" ? "text-slate-900" : "text-slate-400"}>วันที่ในใบเสร็จ</span>
        <ToggleLeft className={["h-8 w-8", filters.dateMode === "purchaseDate" ? "text-slate-300" : "rotate-180 text-blue-500"].join(" ")} />
        <span className={filters.dateMode === "uploadDate" ? "text-slate-900" : "text-slate-400"}>วันที่อัปโหลด</span>
      </button>
    </div>
  );
}
