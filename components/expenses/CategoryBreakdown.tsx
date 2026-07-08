"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import type { Expense } from "@/lib/expenseTypes";
import {
  expenseAmountForCurrency,
  formatMoney,
  type DisplayCurrency
} from "@/components/expenses/currency";

const COLORS = [
  "#0f766e", // teal-700
  "#0284c7", // sky-600
  "#d97706", // amber-600
  "#7c3aed", // violet-600
  "#dc2626", // red-600
  "#059669", // emerald-600
];

function buildCategoryData(expenses: Expense[], currency: DisplayCurrency) {
  const map = new Map<string, number>();
  for (const e of expenses) {
    const cat = e.categorySummary || "อื่นๆ";
    map.set(cat, (map.get(cat) ?? 0) + expenseAmountForCurrency(e, currency));
  }
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
}

function CustomTooltip({
  active,
  payload,
  currency
}: {
  active?: boolean;
  payload?: { name: string; value: number }[];
  currency: DisplayCurrency;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg">
      <p className="text-[12px] font-semibold text-slate-600">{payload[0].name}</p>
      <p className="mt-0.5 text-[14px] font-bold text-slate-900">
        {formatMoney(payload[0].value, currency)}
      </p>
    </div>
  );
}

export function CategoryBreakdown({ expenses, currency }: { expenses: Expense[]; currency: DisplayCurrency }) {
  const data = buildCategoryData(expenses, currency);
  const total = data.reduce((s, d) => s + d.value, 0);

  if (data.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-3.5">
        <h2 className="text-[14px] font-bold text-slate-800">หมวดหมู่รายจ่าย</h2>
        <p className="mt-0.5 text-[12px] text-slate-400">ทั้งหมด</p>
      </div>

      <div className="flex items-center gap-0 px-4 pb-3 pt-2">
        {/* Donut */}
        <div className="h-[140px] w-[140px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={42}
                outerRadius={62}
                paddingAngle={2}
                dataKey="value"
                strokeWidth={0}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip currency={currency} />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="min-w-0 flex-1 space-y-2 pl-2">
          {data.map((d, i) => {
            const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
            return (
              <div key={d.name} className="flex items-center gap-2 min-w-0">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: COLORS[i % COLORS.length] }}
                />
                <span className="truncate text-[12px] font-medium text-slate-600 flex-1 min-w-0">
                  {d.name}
                </span>
                <span className="shrink-0 text-[11px] font-semibold text-slate-400">{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
