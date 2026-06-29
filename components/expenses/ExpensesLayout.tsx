"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Upload } from "lucide-react";
import { signIn, useSession } from "next-auth/react";
import { CreateBusinessDialog } from "@/components/business/CreateBusinessDialog";
import { BusinessSwitcher } from "@/components/business/BusinessSwitcher";
import { AppSidebar } from "@/components/expenses/AppSidebar";
import { BusinessHeader } from "@/components/expenses/BusinessHeader";
import { DeleteExpenseDialog } from "@/components/expenses/DeleteExpenseDialog";
import { ExpenseFilters } from "@/components/expenses/ExpenseFilters";
import { MobileBottomNav } from "@/components/expenses/MobileBottomNav";
import { ExpenseTable, type ExpenseMonthGroupData } from "@/components/expenses/ExpenseTable";
import { ExpenseTabs, type ExpenseTab } from "@/components/expenses/ExpenseTabs";
import { SummaryCards } from "@/components/expenses/SummaryCards";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useBusinesses } from "@/hooks/useBusinesses";
import { downloadExpensesCsv } from "@/lib/exportCsv";
import type { Expense } from "@/lib/expenseTypes";
import { useExpenses } from "@/hooks/useExpenses";

const thaiMonths = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน",
  "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม",
  "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

function monthLabelFromDate(date: Date) {
  return `${thaiMonths[date.getMonth()]} ${date.getFullYear()}`;
}

function monthLabelFromKey(key: string) {
  const [year, month] = key.split("-").map(Number);
  if (!year || !month) return key;
  return `${thaiMonths[month - 1]} ${year}`;
}

function groupExpensesByMonth(expenses: Expense[]): ExpenseMonthGroupData[] {
  const groups = new Map<string, Expense[]>();
  for (const expense of expenses) {
    const key = expense.purchaseDate?.slice(0, 7) || "ไม่ระบุเดือน";
    groups.set(key, [...(groups.get(key) ?? []), expense]);
  }
  return Array.from(groups.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, groupExpenses]) => ({
      key,
      label: monthLabelFromKey(key),
      expenses: groupExpenses,
      total: groupExpenses.reduce((sum, e) => sum + e.total, 0)
    }));
}

function sameMonth(date: string, current: Date) {
  return date.startsWith(`${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`);
}

function sameYear(date: string, current: Date) {
  return date.startsWith(String(current.getFullYear()));
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 pt-2">
      {[0, 1].map((i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <Skeleton className="h-6 w-48 rounded-lg" />
          <div className="mt-4 space-y-3">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-3/4 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

type GoogleClientSession = {
  googleAccessToken?: string;
  googleTokenError?: string;
};

export function ExpensesLayout() {
  const router = useRouter();
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<ExpenseTab>("expenses");
  const [createBusinessOpen, setCreateBusinessOpen] = useState(false);
  const [loginPrompt, setLoginPrompt] = useState<{ open: boolean; callbackUrl: string }>({
    open: false,
    callbackUrl: "/expenses"
  });
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  const {
    activeBusiness,
    activeBusinessId,
    isLoggedIn,
    loading: businessLoading,
    error: businessError,
    createBusiness
  } = useBusinesses();

  const {
    expenses,
    filteredExpenses,
    filters,
    setFilters,
    payerOptions,
    loading,
    error,
    deleteExpense
  } = useExpenses(activeBusinessId);

  const currentDate = new Date();
  const monthLabel = monthLabelFromDate(currentDate);
  const yearLabel = String(currentDate.getFullYear());
  const receiptCountThisMonth = expenses.filter((e) => sameMonth(e.purchaseDate, currentDate)).length;
  const totalThisMonth = expenses
    .filter((e) => sameMonth(e.purchaseDate, currentDate))
    .reduce((sum, e) => sum + e.total, 0);
  const totalThisYear = expenses
    .filter((e) => sameYear(e.purchaseDate, currentDate))
    .reduce((sum, e) => sum + e.total, 0);
  const groups = useMemo(() => groupExpensesByMonth(filteredExpenses), [filteredExpenses]);
  const hasBusiness = Boolean(activeBusinessId);
  const ownerEmail = session?.user?.email ?? "";

  async function getGoogleClientSession() {
    try {
      const response = await fetch("/api/auth/session", { cache: "no-store", credentials: "same-origin" });
      if (!response.ok) return null;
      return (await response.json()) as GoogleClientSession;
    } catch {
      return null;
    }
  }

  async function requireGoogleLogin(callbackUrl = "/expenses") {
    const s = await getGoogleClientSession();
    if (!s?.googleAccessToken || s.googleTokenError) {
      setLoginPrompt({ open: true, callbackUrl });
      return false;
    }
    return true;
  }

  async function runWithGoogleLogin(action: () => void | Promise<void>, callbackUrl = "/expenses") {
    const allowed = await requireGoogleLogin(callbackUrl);
    if (!allowed) return;
    await action();
  }

  async function confirmDelete() {
    if (!expenseToDelete) return;
    const allowed = await requireGoogleLogin();
    if (!allowed) return;
    await deleteExpense(expenseToDelete.id);
    setExpenseToDelete(null);
  }

  return (
    <main className="h-[100dvh] overflow-hidden bg-slate-50 text-slate-900">
      <div className="flex h-[100dvh] min-h-0">
        <AppSidebar />

        {/* Main content */}
        <section className="min-w-0 flex-1 overflow-auto">
          {/* Mobile top bar */}
          <div className="sticky top-0 z-20 flex h-14 items-center border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:hidden">
            <BusinessSwitcher />
          </div>

          <div className="px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-8 lg:pt-7">
            {/* Page header */}
            <BusinessHeader
              businessName={activeBusiness?.name}
              phone={activeBusiness?.phone}
              onUpload={() =>
                runWithGoogleLogin(() => {
                  if (!hasBusiness) { setCreateBusinessOpen(true); return; }
                  router.push("/expenses/new");
                }, "/expenses/new")
              }
              onEditBusiness={() => {}}
              onGoogleDrive={() => {}}
              onGoogleSheets={() => {}}
              onExportCsv={() => runWithGoogleLogin(() => downloadExpensesCsv(filteredExpenses))}
              editBusinessDisabled
              googleDriveDisabled
              googleSheetsDisabled
            />

            {/* Not logged in */}
            {!businessLoading && !isLoggedIn ? (
              <div className="mt-8 rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50">
                  <Upload className="h-6 w-6 text-teal-600" />
                </div>
                <p className="text-lg font-bold text-slate-900">กรุณาเข้าสู่ระบบ</p>
                <p className="mt-1.5 text-sm text-slate-500">เชื่อมต่อ Google เพื่อโหลดและบันทึกข้อมูลรายจ่าย</p>
                <Button
                  className="mt-5 h-10 rounded-lg bg-teal-600 px-5 text-[14px] font-semibold text-white hover:bg-teal-700"
                  onClick={() => signIn("google", { callbackUrl: "/expenses" })}
                >
                  เข้าสู่ระบบด้วย Google
                </Button>
              </div>
            ) : null}

            {/* No business yet */}
            {isLoggedIn && !businessLoading && !hasBusiness ? (
              <div className="mt-8 rounded-xl border border-dashed border-teal-200 bg-teal-50/50 p-10 text-center">
                <p className="text-xl font-bold text-slate-900">สร้างธุรกิจแรกของคุณ</p>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
                  ระบบจะแยกรายจ่าย, Google Drive และ Firestore ตามแต่ละธุรกิจ
                </p>
                <Button
                  className="mt-6 h-10 rounded-lg bg-teal-600 px-5 text-[14px] font-semibold text-white hover:bg-teal-700"
                  onClick={() => setCreateBusinessOpen(true)}
                >
                  สร้างธุรกิจ
                </Button>
              </div>
            ) : null}

            {/* Error */}
            {businessError || error ? (
              <div className="mt-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
                <AlertCircle className="mt-0.5 h-4.5 w-4.5 shrink-0 text-red-500" />
                <div>
                  <p className="text-sm font-bold text-red-800">โหลดข้อมูลไม่สำเร็จ</p>
                  <p className="mt-0.5 text-xs text-red-600">{businessError || error}</p>
                  <Button
                    size="sm"
                    className="mt-3 h-8 rounded-lg bg-red-600 px-3 text-xs font-semibold text-white hover:bg-red-700"
                    onClick={() => signIn("google", { callbackUrl: "/expenses" })}
                  >
                    เข้าสู่ระบบอีกครั้ง
                  </Button>
                </div>
              </div>
            ) : null}

            {/* Dashboard content */}
            {isLoggedIn && hasBusiness ? (
              <>
                {/* KPI cards */}
                <div className="mt-6">
                  <SummaryCards
                    monthLabel={monthLabel}
                    yearLabel={yearLabel}
                    receiptCountThisMonth={receiptCountThisMonth}
                    totalThisMonth={totalThisMonth}
                    totalThisYear={totalThisYear}
                  />
                </div>

                {/* Tabs + Filters row */}
                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <ExpenseTabs
                    activeTab={activeTab}
                    onChange={(tab) => runWithGoogleLogin(() => setActiveTab(tab))}
                  />
                </div>

                <div className="mt-3">
                  <ExpenseFilters filters={filters} payerOptions={payerOptions} onChange={setFilters} />
                </div>

                {/* Loading */}
                {(loading || businessLoading) ? <LoadingSkeleton /> : null}

                {/* Vouchers placeholder */}
                {!loading && !businessLoading && activeTab === "vouchers" ? (
                  <div className="mt-6 rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                    <p className="font-bold text-slate-500">ยังไม่มีข้อมูลใบสำคัญจ่าย</p>
                  </div>
                ) : null}

                {/* Empty state */}
                {!loading && !businessLoading && activeTab === "expenses" && filteredExpenses.length === 0 ? (
                  <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                      <Upload className="h-6 w-6 text-slate-400" />
                    </div>
                    <p className="font-bold text-slate-700">ยังไม่มีรายจ่าย</p>
                    <p className="mt-1 text-sm text-slate-400">อัปโหลดใบเสร็จเพื่อเริ่มบันทึก</p>
                    <Button
                      className="mt-5 h-10 rounded-lg bg-teal-600 px-5 text-[14px] font-semibold text-white hover:bg-teal-700"
                      onClick={() => runWithGoogleLogin(() => router.push("/expenses/new"), "/expenses/new")}
                    >
                      <Upload className="h-4 w-4" />
                      อัปโหลดค่าใช้จ่าย
                    </Button>
                  </div>
                ) : null}

                {/* Expense table */}
                {!loading && !businessLoading && activeTab === "expenses" && filteredExpenses.length > 0 ? (
                  <ExpenseTable
                    groups={groups}
                    onDelete={(expense) => runWithGoogleLogin(() => setExpenseToDelete(expense))}
                    onOpen={(expenseId) => runWithGoogleLogin(() => router.push(`/expenses/${expenseId}`))}
                  />
                ) : null}
              </>
            ) : null}
          </div>
        </section>
      </div>

      {/* Login prompt modal */}
      {loginPrompt.open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <p className="text-lg font-bold text-slate-900">ต้องเข้าสู่ระบบก่อน</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              เชื่อมต่อ Google เพื่อบันทึกข้อมูลลง Drive และ Firestore
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="ghost"
                className="h-10 rounded-lg text-slate-600"
                onClick={() => setLoginPrompt({ open: false, callbackUrl: "/expenses" })}
              >
                ยกเลิก
              </Button>
              <Button
                className="h-10 rounded-lg bg-teal-600 px-4 font-semibold text-white hover:bg-teal-700"
                onClick={() => signIn("google", { callbackUrl: loginPrompt.callbackUrl })}
              >
                Sign in with Google
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <DeleteExpenseDialog
        open={Boolean(expenseToDelete)}
        expenseName={expenseToDelete?.storeName ?? ""}
        onCancel={() => setExpenseToDelete(null)}
        onConfirm={confirmDelete}
      />
      <CreateBusinessDialog
        open={createBusinessOpen}
        onClose={() => setCreateBusinessOpen(false)}
        onCreate={(input) => createBusiness({ ownerEmail, ...input })}
      />
      <MobileBottomNav />
    </main>
  );
}
