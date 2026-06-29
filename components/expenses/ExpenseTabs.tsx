import { ClipboardList, FileText } from "lucide-react";

export type ExpenseTab = "expenses" | "vouchers";

export function ExpenseTabs({
  activeTab,
  onChange
}: {
  activeTab: ExpenseTab;
  onChange: (tab: ExpenseTab) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100/60 p-1 shadow-sm">
      <button
        type="button"
        onClick={() => onChange("expenses")}
        className={[
          "flex h-8 items-center gap-1.5 rounded-md px-4 text-[13px] font-semibold transition-all",
          activeTab === "expenses"
            ? "bg-white text-slate-900 shadow-sm"
            : "text-slate-500 hover:text-slate-700"
        ].join(" ")}
      >
        <ClipboardList className="h-3.5 w-3.5" />
        รายการค่าใช้จ่าย
      </button>
      <button
        type="button"
        onClick={() => onChange("vouchers")}
        className={[
          "flex h-8 items-center gap-1.5 rounded-md px-4 text-[13px] font-semibold transition-all",
          activeTab === "vouchers"
            ? "bg-white text-slate-900 shadow-sm"
            : "text-slate-500 hover:text-slate-700"
        ].join(" ")}
      >
        <FileText className="h-3.5 w-3.5" />
        ใบสำคัญจ่าย
      </button>
    </div>
  );
}
