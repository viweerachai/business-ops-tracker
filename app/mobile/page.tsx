"use client";

import Link from "next/link";
import { useMemo } from "react";
import { signIn } from "next-auth/react";
import {
  ArrowRight,
  Camera,
  ChevronRight,
  CircleDollarSign,
  Plus,
  ReceiptText,
  Search,
  Store,
  UserRound
} from "lucide-react";
import { BusinessSwitcher } from "@/components/business/BusinessSwitcher";
import { UserAccountMenu } from "@/components/layout/UserAccountMenu";
import { MobileBottomNav } from "@/components/expenses/MobileBottomNav";
import { ExpenseFilters } from "@/components/expenses/ExpenseFilters";
import { SummaryCards } from "@/components/expenses/SummaryCards";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useBusinesses } from "@/hooks/useBusinesses";
import { useExpenses } from "@/hooks/useExpenses";
import type { Expense } from "@/lib/expenseTypes";

const thaiMonths = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม"
];

function formatDate(value: string) {
  if (!value) return "ไม่ระบุวันที่";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getDate()} ${thaiMonths[date.getMonth()]} ${date.getFullYear()}`;
}

function isThisMonth(value: string, current: Date) {
  return value.startsWith(`${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`);
}

function expenseIcon(expense: Expense) {
  if (expense.documentType === "ใบกำกับภาษี") return ReceiptText;
  if (expense.categorySummary === "Transport") return Search;
  return CircleDollarSign;
}

function LoadingMobile() {
  return (
    <main className="min-h-[100dvh] bg-background px-4 py-5 text-foreground">
      <div className="mx-auto grid max-w-md gap-4">
        <Skeleton className="h-14 rounded-xl" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-44 rounded-xl" />
      </div>
    </main>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
  primary
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  primary?: boolean;
}) {
  return (
    <Button
      asChild
      className={[
        "h-11 rounded-xl px-4 text-[14px] font-semibold shadow-sm",
        primary
          ? "bg-teal-600 text-white hover:bg-teal-700"
          : "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
      ].join(" ")}
      variant={primary ? "default" : "outline"}
    >
      <Link href={href}>
        <Icon className="h-4 w-4" />
        <span className="min-w-0 truncate">{label}</span>
      </Link>
    </Button>
  );
}

function RecentExpenseRow({ expense }: { expense: Expense }) {
  const Icon = expenseIcon(expense);

  return (
    <Link
      href={`/expenses/${expense.id}`}
      className="grid grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm active:scale-[0.99] hover:border-slate-300"
    >
      <span className="flex h-9.5 w-9.5 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
        <Icon className="h-4.5 w-4.5" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[14px] font-semibold text-slate-950">{expense.storeName || expense.detail}</span>
        <span className="mt-0.5 block truncate text-[12px] text-slate-400">
          {formatDate(expense.purchaseDate)} · {expense.payerName || "ไม่ระบุผู้เบิก"}
        </span>
      </span>
      <span className="flex items-center gap-0.5 text-[14px] font-semibold text-slate-900">
        ฿{expense.total.toLocaleString("en-US", { maximumFractionDigits: 0 })}
        <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
      </span>
    </Link>
  );
}

export default function MobilePage() {
  const {
    activeBusiness,
    activeBusinessId,
    isLoggedIn,
    loading: businessLoading,
    error: businessError
  } = useBusinesses();
  const { expenses, filteredExpenses, filters, setFilters, payerOptions, loading: expensesLoading, error: expensesError } =
    useExpenses(activeBusinessId);
  const currentDate = useMemo(() => new Date(), []);
  const loading = businessLoading || expensesLoading;
  const monthExpenses = useMemo(
    () => expenses.filter((expense) => isThisMonth(expense.purchaseDate, currentDate)),
    [expenses, currentDate]
  );
  const monthTotal = monthExpenses.reduce((sum, expense) => sum + expense.total, 0);
  const yearTotal = expenses
    .filter((expense) => expense.purchaseDate.startsWith(String(currentDate.getFullYear())))
    .reduce((sum, expense) => sum + expense.total, 0);
  const recentExpenses = filteredExpenses.slice(0, 5);
  const error = businessError || expensesError;

  if (loading && isLoggedIn) {
    return <LoadingMobile />;
  }

  return (
    <main className="min-h-[100dvh] bg-background pb-24 text-foreground">
      <section className="mx-auto grid w-full max-w-md gap-4 px-4 pb-5 pt-4">
        {/* Sticky header */}
        <header className="sticky top-0 z-20 -mx-4 border-b border-slate-200 bg-background/98 px-4 py-2.5 backdrop-blur">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-[13px] font-bold text-white">
                B
              </div>
              <h1 className="truncate text-[16px] font-bold tracking-tight text-slate-950">{activeBusiness?.name || "รายจ่าย"}</h1>
            </div>
            <div className="shrink-0">
              <UserAccountMenu />
            </div>
          </div>
        </header>

        {/* Not logged in */}
        {!isLoggedIn ? (
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50">
              <UserRound className="h-5.5 w-5.5 text-teal-600" />
            </div>
            <h2 className="mt-4 text-[17px] font-bold text-slate-950">เข้าสู่ระบบ Google</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-500">ข้อมูลรายจ่ายหลักโหลดจาก Firestore หลังเข้าสู่ระบบ</p>
            <Button
              className="mt-5 h-11 w-full rounded-xl bg-teal-600 text-[14px] font-semibold text-white hover:bg-teal-700"
              onClick={() => signIn("google", { callbackUrl: "/mobile" })}
            >
              เข้าสู่ระบบ
              <ArrowRight className="h-4.5 w-4.5" />
            </Button>
          </section>
        ) : null}

        {isLoggedIn ? (
          <>
            {/* Business switcher */}
            <BusinessSwitcher />

            {/* No business */}
            {!activeBusinessId ? (
              <section className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center shadow-sm">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                  <Store className="h-6 w-6 text-slate-500" />
                </div>
                <h2 className="mt-3 text-[17px] font-bold text-slate-950">สร้างธุรกิจก่อน</h2>
                <p className="mt-1 text-sm text-slate-500">เพิ่มข้อมูลธุรกิจเพื่อเริ่มบันทึกรายจ่าย</p>
                <Button asChild className="mt-5 h-11 w-full rounded-xl bg-slate-950 text-[14px] font-semibold text-white hover:bg-slate-800">
                  <Link href="/settings/businesses">
                    ไปจัดการธุรกิจ
                    <ChevronRight className="h-4.5 w-4.5" />
                  </Link>
                </Button>
              </section>
            ) : null}

            {activeBusinessId ? (
              <>
                {/* Summary KPI */}
                <SummaryCards
                  monthLabel={`${thaiMonths[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
                  yearLabel={String(currentDate.getFullYear())}
                  receiptCountThisMonth={monthExpenses.length}
                  totalThisMonth={monthTotal}
                  totalThisYear={yearTotal}
                />

                {/* Quick actions */}
                <div className="grid grid-cols-2 gap-2.5">
                  <QuickAction href="/expenses/new" icon={Plus} label="เพิ่มรายจ่าย" primary />
                  <QuickAction href="/receipt-chat?mock=1" icon={Camera} label="สแกน mock" />
                </div>

                {/* Filters */}
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
                  <ExpenseFilters filters={filters} payerOptions={payerOptions} onChange={setFilters} />
                </div>

                {/* Error */}
                {error ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
                    {error}
                  </div>
                ) : null}

                {/* Recent expenses */}
                <section className="grid gap-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-[16px] font-bold text-slate-950">รายการล่าสุด</h2>
                    <Button asChild variant="ghost" className="h-8 rounded-lg px-2.5 text-[13px] font-semibold text-teal-700 hover:bg-teal-50">
                      <Link href="/expenses">
                        ดูทั้งหมด
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>

                  {recentExpenses.length > 0 ? (
                    <div className="grid gap-2">
                      {recentExpenses.map((expense) => (
                        <RecentExpenseRow key={expense.id} expense={expense} />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                        <ReceiptText className="h-6 w-6 text-slate-400" />
                      </div>
                      <p className="mt-3 text-[14px] font-semibold text-slate-700">ยังไม่มีรายจ่าย</p>
                      <p className="mt-1 text-[13px] text-slate-400">เริ่มต้นโดยการเพิ่มรายจ่ายแรก</p>
                    </div>
                  )}
                </section>
              </>
            ) : null}
          </>
        ) : null}
      </section>

      <MobileBottomNav />
    </main>
  );
}
