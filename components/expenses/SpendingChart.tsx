"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from "recharts";
import type { Expense } from "@/lib/expenseTypes";
import {
  expenseAmountForCurrency,
  formatMoney,
  type DisplayCurrency
} from "@/components/expenses/currency";

const thaiMonthsShort = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
];

function buildChartData(expenses: Expense[], currency: DisplayCurrency) {
  // Last 6 months from current date
  const now = new Date();
  const months: { key: string; label: string; total: number }[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months.push({ key, label: thaiMonthsShort[d.getMonth()], total: 0 });
  }

  for (const expense of expenses) {
    const monthKey = expense.purchaseDate?.slice(0, 7);
    const slot = months.find((m) => m.key === monthKey);
    if (slot) slot.total += expenseAmountForCurrency(expense, currency);
  }

  return months;
}

function CustomTooltip({
  active,
  payload,
  label,
  currency
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  currency: DisplayCurrency;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg">
      <p className="text-[12px] font-semibold text-slate-500">{label}</p>
      <p className="mt-0.5 text-[15px] font-bold text-slate-900">
        {formatMoney(payload[0].value ?? 0, currency)}
      </p>
    </div>
  );
}

export function SpendingChart({ expenses, currency }: { expenses: Expense[]; currency: DisplayCurrency }) {
  const data = buildChartData(expenses, currency);
  const maxVal = Math.max(...data.map((d) => d.total), 1);
  const currentMonthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
        <div>
          <h2 className="text-[14px] font-bold text-slate-800">ค่าใช้จ่ายรายเดือน</h2>
          <p className="mt-0.5 text-[12px] text-slate-400">6 เดือนล่าสุด</p>
        </div>
        <span className="rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-semibold text-teal-700">
          {formatMoney(data.reduce((s, d) => s + d.total, 0), currency)}
        </span>
      </div>
      <div className="px-4 pb-4 pt-3">
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={data} barCategoryGap="30%" margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "#94a3b8", fontFamily: "Sarabun, sans-serif" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#94a3b8", fontFamily: "Sarabun, sans-serif" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
              domain={[0, Math.ceil(maxVal * 1.2)]}
            />
            <Tooltip content={<CustomTooltip currency={currency} />} cursor={{ fill: "#f8fafc" }} />
            <Bar
              dataKey="total"
              radius={[6, 6, 0, 0]}
              fill="#0f766e"
              // highlight current month
              label={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
