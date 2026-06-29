"use client";

import { ChevronDown, FileText, Search, UserRound, Check, CalendarDays } from "lucide-react";
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

const statusLabels: Record<string, string> = {
  "ทั้งหมด": "สถานะทั้งหมด",
  paid: "จ่ายแล้ว",
  pending: "รอจ่าย",
  draft: "ร่าง",
  review_needed: "ต้องตรวจ",
  failed: "ผิดพลาด"
};

function SelectFilter<T extends string>({
  icon: Icon,
  value,
  options,
  onChange,
  labelMap,
  className = ""
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: T;
  options: T[];
  onChange: (value: T) => void;
  labelMap?: Record<string, string>;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <Icon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white pl-9 pr-7 text-[13px] font-medium text-slate-700 shadow-sm outline-none transition-colors hover:border-slate-300 focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {labelMap ? (labelMap[option] ?? option) : option}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
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

  const isUploadDate = filters.dateMode === "uploadDate";

  return (
    <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
      {/* Search */}
      <div className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 shadow-sm transition-colors focus-within:border-teal-400 focus-within:ring-2 focus-within:ring-teal-100 sm:max-w-xs">
        <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        <input
          value={filters.search}
          onChange={(e) => update({ search: e.target.value })}
          className="min-w-0 flex-1 bg-transparent text-[13px] font-medium text-slate-700 outline-none placeholder:text-slate-400"
          placeholder="ค้นหา ร้านค้า, รายละเอียด..."
        />
      </div>

      {/* Date */}
      <div className="relative">
        <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <input
          type="date"
          value={filters.date}
          onChange={(e) => update({ date: e.target.value })}
          className="h-9 rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-[13px] font-medium text-slate-700 shadow-sm outline-none transition-colors hover:border-slate-300 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 sm:w-[160px]"
        />
      </div>

      {/* Payer */}
      <SelectFilter
        icon={UserRound}
        value={filters.payerName}
        options={["ทั้งหมด", ...payerOptions]}
        onChange={(payerName) => update({ payerName })}
        className="sm:w-[150px]"
      />

      {/* Document type */}
      <SelectFilter
        icon={FileText}
        value={filters.documentType}
        options={documentTypeOptions}
        onChange={(documentType) => update({ documentType })}
        className="sm:w-[160px]"
      />

      {/* Status */}
      <SelectFilter
        icon={Check}
        value={filters.paymentStatus}
        options={statusOptions}
        onChange={(paymentStatus) => update({ paymentStatus })}
        labelMap={statusLabels}
        className="sm:w-[150px]"
      />

      {/* Date mode toggle */}
      <button
        type="button"
        onClick={() => update({ dateMode: isUploadDate ? "purchaseDate" : "uploadDate" })}
        className={[
          "flex h-9 shrink-0 items-center gap-2 rounded-lg border px-3 text-[12px] font-semibold transition-colors",
          isUploadDate
            ? "border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100"
            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
        ].join(" ")}
      >
        <CalendarDays className="h-3.5 w-3.5" />
        {isUploadDate ? "วันที่อัปโหลด" : "วันที่ในใบเสร็จ"}
      </button>
    </div>
  );
}
