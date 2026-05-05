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
    <div className="inline-flex rounded-xl bg-slate-100 p-1">
      <button
        type="button"
        onClick={() => onChange("expenses")}
        className={[
          "flex h-12 items-center gap-2 rounded-lg px-5 text-[16px] font-bold",
          activeTab === "expenses" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
        ].join(" ")}
      >
        <ClipboardList className="h-5 w-5" />
        รายการค่าใช้จ่าย
      </button>
      <button
        type="button"
        onClick={() => onChange("vouchers")}
        className={[
          "flex h-12 items-center gap-2 rounded-lg px-5 text-[16px] font-bold",
          activeTab === "vouchers" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
        ].join(" ")}
      >
        <FileText className="h-5 w-5" />
        ใบสำคัญจ่าย
      </button>
    </div>
  );
}
