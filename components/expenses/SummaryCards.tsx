import { ArrowDownRight, ArrowUpRight, Calendar, Minus, Receipt, TrendingDown } from "lucide-react";
import { formatMoney, type DisplayCurrency } from "@/components/expenses/currency";

const cardConfigs = [
  {
    icon: Receipt,
    iconBg: "bg-teal-50",
    iconColor: "text-teal-600",
    accent: "border-l-teal-500"
  },
  {
    icon: TrendingDown,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    accent: "border-l-blue-500"
  },
  {
    icon: Calendar,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    accent: "border-l-amber-500"
  }
];

type TrendDir = "up" | "down" | "flat";

function TrendBadge({ dir, label }: { dir: TrendDir; label: string }) {
  if (dir === "up") {
    return (
      <div className="flex items-center gap-0.5 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-600">
        <ArrowUpRight className="h-3 w-3" />
        {label}
      </div>
    );
  }
  if (dir === "down") {
    return (
      <div className="flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">
        <ArrowDownRight className="h-3 w-3" />
        {label}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-0.5 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-400">
      <Minus className="h-3 w-3" />
      เท่ากัน
    </div>
  );
}

export function SummaryCards({
  monthLabel,
  yearLabel,
  receiptCountThisMonth,
  totalThisMonth,
  totalThisYear,
  currency,
  receiptCountPrevMonth = 3,
  totalPrevMonth = 18240,
}: {
  monthLabel: string;
  yearLabel: string;
  receiptCountThisMonth: number;
  totalThisMonth: number;
  totalThisYear: number;
  currency: DisplayCurrency;
  receiptCountPrevMonth?: number;
  totalPrevMonth?: number;
}) {
  // Trend vs previous month
  const countDiff = receiptCountThisMonth - receiptCountPrevMonth;
  const countTrend: TrendDir = countDiff > 0 ? "up" : countDiff < 0 ? "down" : "flat";
  const countTrendLabel = `${Math.abs(countDiff)} รายการ`;

  const amtDiffPct = totalPrevMonth > 0
    ? Math.round(((totalThisMonth - totalPrevMonth) / totalPrevMonth) * 100)
    : 0;
  const amtTrend: TrendDir = amtDiffPct > 0 ? "up" : amtDiffPct < 0 ? "down" : "flat";
  const amtTrendLabel = `${Math.abs(amtDiffPct)}%`;

  const cards = [
    {
      label: "ใบเสร็จเดือนนี้",
      sublabel: monthLabel,
      value: receiptCountThisMonth.toLocaleString("th-TH"),
      unit: "รายการ",
      trend: countTrend,
      trendLabel: countTrendLabel,
      ...cardConfigs[0]
    },
    {
      label: "ค่าใช้จ่ายเดือนนี้",
      sublabel: monthLabel,
      value: formatMoney(totalThisMonth, currency),
      unit: currency === "JPY" ? "เยน" : "บาท",
      trend: amtTrend,
      trendLabel: amtTrendLabel,
      ...cardConfigs[1]
    },
    {
      label: "ค่าใช้จ่ายปีนี้",
      sublabel: yearLabel,
      value: formatMoney(totalThisYear, currency),
      unit: currency === "JPY" ? "เยน" : "บาท",
      trend: "flat" as TrendDir,
      trendLabel: "",
      ...cardConfigs[2]
    }
  ];

  return (
    <section className="grid grid-cols-1 gap-2.5">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className={`relative overflow-hidden rounded-xl border border-slate-200 border-l-4 bg-white shadow-sm ${card.accent}`}
          >
            {/* Always horizontal compact on mobile, vertical on lg+ */}
            <div className="flex items-center gap-3 p-3 lg:hidden">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${card.iconBg}`}>
                <Icon className={`h-4 w-4 ${card.iconColor}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-medium text-slate-500">{card.label}</p>
                <p className="mt-0.5 truncate text-[18px] font-bold leading-tight tracking-tight text-slate-900">
                  {card.value}
                </p>
              </div>
              {card.trendLabel ? (
                <div className="shrink-0">
                  <TrendBadge dir={card.trend} label={card.trendLabel} />
                </div>
              ) : null}
            </div>
            {/* Desktop vertical card */}
            <div className="hidden p-5 lg:block">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-slate-500">{card.label}</p>
                  <p className="mt-0.5 text-[11px] font-medium text-slate-400">{card.sublabel}</p>
                </div>
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${card.iconBg}`}>
                  <Icon className={`h-4 w-4 ${card.iconColor}`} />
                </div>
              </div>
              <p className="mt-3 text-[28px] font-bold leading-none tracking-tight text-slate-900">
                {card.value}
              </p>
              <div className="mt-3 flex items-center gap-2">
                {card.trendLabel ? (
                  <TrendBadge dir={card.trend} label={card.trendLabel} />
                ) : null}
                <span className="text-[11px] text-slate-400">vs เดือนที่แล้ว</span>
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
