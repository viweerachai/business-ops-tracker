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
    <main className="min-h-[100dvh] bg-[#F5F7FB] px-4 py-5 text-slate-900">
      <div className="mx-auto grid max-w-md gap-4">
        <Skeleton className="h-16 rounded-2xl" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-52 rounded-2xl" />
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
        "h-12 rounded-2xl px-4 text-sm font-black shadow-sm",
        primary
          ? "bg-slate-950 text-white hover:bg-slate-800"
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
      className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm active:scale-[0.99]"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-black text-slate-950">{expense.storeName || expense.detail}</span>
        <span className="mt-1 block truncate text-xs font-semibold text-slate-500">
          {formatDate(expense.purchaseDate)} · {expense.payerName || "ไม่ระบุผู้เบิก"}
        </span>
      </span>
      <span className="flex items-center gap-1 text-sm font-black text-slate-950">
        ฿{expense.total.toLocaleString("en-US", { maximumFractionDigits: 0 })}
        <ChevronRight className="h-4 w-4 text-slate-400" />
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
    <main className="min-h-[100dvh] bg-[#F5F7FB] pb-24 text-slate-900">
      <section className="mx-auto grid w-full max-w-md gap-5 px-4 pb-5 pt-4">
        <header className="sticky top-0 z-20 -mx-4 border-b border-slate-200 bg-[#F5F7FB]/95 px-4 pb-3 pt-3 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase text-slate-400">Receipt Reader</p>
              <h1 className="truncate text-2xl font-black tracking-normal">{activeBusiness?.name || "รายจ่าย"}</h1>
            </div>
            <div className="shrink-0">
              <UserAccountMenu />
            </div>
          </div>
        </header>

        {!isLoggedIn ? (
          <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <UserRound className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-xl font-black tracking-normal">เข้าสู่ระบบ Google</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">ข้อมูลรายจ่ายหลักโหลดจาก Firestore หลังเข้าสู่ระบบ</p>
            <Button
              className="mt-5 h-12 w-full rounded-2xl bg-slate-950 text-white hover:bg-slate-800"
              onClick={() => signIn("google", { callbackUrl: "/mobile" })}
            >
              เข้าสู่ระบบ
              <ArrowRight className="h-5 w-5" />
            </Button>
          </section>
        ) : null}

        {isLoggedIn ? (
          <>
            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <BusinessSwitcher />
            </div>

            {!activeBusinessId ? (
              <section className="rounded-2xl border border-dashed border-blue-200 bg-white p-5 text-center shadow-sm">
                <Store className="mx-auto h-10 w-10 text-blue-600" />
                <h2 className="mt-3 text-xl font-black tracking-normal">สร้างธุรกิจก่อน</h2>
                <Button asChild className="mt-5 h-12 w-full rounded-2xl bg-slate-950 text-white hover:bg-slate-800">
                  <Link href="/settings/businesses">
                    ไปจัดการธุรกิจ
                    <ChevronRight className="h-5 w-5" />
                  </Link>
                </Button>
              </section>
            ) : null}

            {activeBusinessId ? (
              <>
                <SummaryCards
                  monthLabel={`${thaiMonths[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
                  yearLabel={String(currentDate.getFullYear())}
                  receiptCountThisMonth={monthExpenses.length}
                  totalThisMonth={monthTotal}
                  totalThisYear={yearTotal}
                />

                <div className="grid grid-cols-2 gap-3">
                  <QuickAction href="/expenses/new" icon={Plus} label="เพิ่มรายจ่าย" primary />
                  <QuickAction href="/receipt-chat?mock=1" icon={Camera} label="สแกน mock" />
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                  <ExpenseFilters filters={filters} payerOptions={payerOptions} onChange={setFilters} />
                </div>

                {error ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">
                    {error}
                  </div>
                ) : null}

                <section className="grid gap-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-black tracking-normal">ล่าสุด</h2>
                    <Button asChild variant="ghost" className="h-10 rounded-xl px-3 text-sm font-black text-blue-700">
                      <Link href="/expenses">
                        ทั้งหมด
                        <ChevronRight className="h-4 w-4" />
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
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center shadow-sm">
                      <ReceiptText className="mx-auto h-9 w-9 text-slate-400" />
                      <p className="mt-3 text-sm font-black text-slate-700">ยังไม่มีรายจ่าย</p>
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
