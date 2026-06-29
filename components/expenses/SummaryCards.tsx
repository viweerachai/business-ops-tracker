import { Receipt, TrendingDown, Calendar } from "lucide-react";

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

export function SummaryCards({
  monthLabel,
  yearLabel,
  receiptCountThisMonth,
  totalThisMonth,
  totalThisYear
}: {
  monthLabel: string;
  yearLabel: string;
  receiptCountThisMonth: number;
  totalThisMonth: number;
  totalThisYear: number;
}) {
  const cards = [
    {
      label: "ใบเสร็จเดือนนี้",
      sublabel: monthLabel,
      value: receiptCountThisMonth.toLocaleString("th-TH"),
      unit: "รายการ",
      ...cardConfigs[0]
    },
    {
      label: "ค่าใช้จ่ายเดือนนี้",
      sublabel: monthLabel,
      value: `฿${totalThisMonth.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      unit: "บาท",
      ...cardConfigs[1]
    },
    {
      label: "ค่าใช้จ่ายปีนี้",
      sublabel: yearLabel,
      value: `฿${totalThisYear.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      unit: "บาท",
      ...cardConfigs[2]
    }
  ];

  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className={`relative overflow-hidden rounded-xl border border-slate-200 border-l-4 bg-white shadow-sm ${card.accent}`}
          >
            <div className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-slate-500">{card.label}</p>
                  <p className="mt-0.5 text-[11px] font-medium text-slate-400">{card.sublabel}</p>
                </div>
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${card.iconBg}`}>
                  <Icon className={`h-4.5 w-4.5 ${card.iconColor}`} />
                </div>
              </div>
              <p className="mt-3 text-[26px] font-bold leading-none tracking-tight text-slate-900 sm:text-[28px]">
                {card.value}
              </p>
            </div>
          </div>
        );
      })}
    </section>
  );
}
