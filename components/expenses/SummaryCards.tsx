import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
    { label: "จำนวนใบเสร็จเดือนนี้", badge: monthLabel, value: String(receiptCountThisMonth) },
    { label: "ค่าใช้จ่ายเดือนนี้", badge: monthLabel, value: `฿${totalThisMonth.toLocaleString("en-US")}` },
    { label: "ค่าใช้จ่ายปีนี้", badge: yearLabel, value: `฿${totalThisYear.toLocaleString("en-US")}` }
  ];

  return (
    <section className="grid grid-cols-1 gap-4 xl:grid-cols-3 2xl:gap-6">
      {cards.map((card) => (
        <Card key={card.label} className="min-w-0 rounded-2xl border-slate-100 bg-white shadow-sm">
          <CardContent className="p-4 sm:p-5 2xl:p-6">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-slate-500 sm:text-[16px] 2xl:text-[18px]">{card.label}</p>
              <Badge className="rounded-md bg-indigo-50 px-2 py-1 text-[12px] font-black text-indigo-800 sm:text-[13px] 2xl:text-[15px]">
                {card.badge}
              </Badge>
            </div>
            <p className="mt-3 truncate text-[26px] font-black leading-none tracking-normal text-slate-500 sm:mt-4 sm:text-[34px] 2xl:text-[38px]">
              {card.value}
            </p>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
