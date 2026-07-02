"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Upload } from "lucide-react";
import { CreateBusinessDialog } from "@/components/business/CreateBusinessDialog";
import { BusinessSwitcher } from "@/components/business/BusinessSwitcher";
import { AppSidebar } from "@/components/expenses/AppSidebar";
import { BusinessHeader } from "@/components/expenses/BusinessHeader";
import { CategoryBreakdown } from "@/components/expenses/CategoryBreakdown";
import { DeleteExpenseDialog } from "@/components/expenses/DeleteExpenseDialog";
import { ExpenseFilters } from "@/components/expenses/ExpenseFilters";
import { MobileBottomNav } from "@/components/expenses/MobileBottomNav";
import { ExpenseTable, type ExpenseMonthGroupData } from "@/components/expenses/ExpenseTable";
import { ExpenseTabs, type ExpenseTab } from "@/components/expenses/ExpenseTabs";
import { SpendingChart } from "@/components/expenses/SpendingChart";
import { SummaryCards } from "@/components/expenses/SummaryCards";
import { Button } from "@/components/ui/button";
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
  return date.startsWith(
    `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`
  );
}

function sameYear(date: string, current: Date) {
  return date.startsWith(String(current.getFullYear()));
}

export function ExpensesLayout() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ExpenseTab>("expenses");
  const [createBusinessOpen, setCreateBusinessOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [showChart, setShowChart] = useState(true);

  const {
    activeBusiness,
    activeBusinessId,
    createBusiness
  } = useBusinesses();

  const {
    expenses,
    filteredExpenses,
    filters,
    setFilters,
    payerOptions,
    deleteExpense
  } = useExpenses(activeBusinessId);

  const currentDate = new Date();
  const monthLabel = monthLabelFromDate(currentDate);
  const yearLabel = String(currentDate.getFullYear());

  const receiptCountThisMonth = expenses.filter((e) =>
    sameMonth(e.purchaseDate, currentDate)
  ).length;
  const totalThisMonth = expenses
    .filter((e) => sameMonth(e.purchaseDate, currentDate))
    .reduce((sum, e) => sum + e.total, 0);
  const totalThisYear = expenses
    .filter((e) => sameYear(e.purchaseDate, currentDate))
    .reduce((sum, e) => sum + e.total, 0);

  // pending/review count for notification badge
  const pendingCount = expenses.filter(
    (e) => e.paymentStatus === "pending" || e.paymentStatus === "review_needed"
  ).length;

  const groups = useMemo(
    () => groupExpensesByMonth(filteredExpenses),
    [filteredExpenses]
  );

  async function confirmDelete() {
    if (!expenseToDelete) return;
    await deleteExpense(expenseToDelete.id);
    setExpenseToDelete(null);
  }

  return (
    <main className="h-[100dvh] overflow-hidden bg-slate-50 text-slate-900">
      <div className="flex h-[100dvh] min-h-0">
        <AppSidebar pendingCount={pendingCount} />

        {/* Main content */}
        <section className="min-w-0 flex-1 overflow-auto">
          {/* Mobile top bar */}
          <div className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:hidden">
            <div className="flex-1 min-w-0 pr-3">
              <BusinessSwitcher />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="การแจ้งเตือน"
                className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                onClick={() => router.push("/expenses/new")}
              >
                <Bell className="h-5 w-5" />
                {pendingCount > 0 ? (
                  <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white leading-none">
                    {pendingCount}
                  </span>
                ) : null}
              </button>
            </div>
          </div>

          <div className="px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-8 lg:pt-7">
            {/* Page header */}
            <BusinessHeader
              businessName={activeBusiness?.name}
              phone={activeBusiness?.phone}
              plan={activeBusiness?.plan}
              onUpload={() => router.push("/expenses/new")}
              onEditBusiness={() => {}}
              onGoogleDrive={() => {}}
              onGoogleSheets={() => {}}
              onExportCsv={() => downloadExpensesCsv(filteredExpenses)}
              editBusinessDisabled
              googleDriveDisabled
              googleSheetsDisabled
            />

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

            {/* Charts row */}
            <div className="mt-2 flex items-center justify-end">
              <button
                type="button"
                className="text-[12px] font-semibold text-slate-400 hover:text-teal-600 transition-colors"
                onClick={() => setShowChart((v) => !v)}
              >
                {showChart ? "ซ่อนกราฟ" : "แสดงกราฟ"}
              </button>
            </div>

            {showChart ? (
              <div className="mt-2 grid gap-4 xl:grid-cols-[1fr_320px]">
                <SpendingChart expenses={expenses} />
                <CategoryBreakdown expenses={expenses} />
              </div>
            ) : null}

            {/* Tabs + Filters */}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <ExpenseTabs activeTab={activeTab} onChange={setActiveTab} />
            </div>

            <div className="mt-3">
              <ExpenseFilters
                filters={filters}
                payerOptions={payerOptions}
                onChange={setFilters}
              />
            </div>

            {/* Vouchers placeholder */}
            {activeTab === "vouchers" ? (
              <div className="mt-6 rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                <p className="font-bold text-slate-500">ยังไม่มีข้อมูลใบสำคัญจ่าย</p>
              </div>
            ) : null}

            {/* Empty state */}
            {activeTab === "expenses" && filteredExpenses.length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                  <Upload className="h-6 w-6 text-slate-400" />
                </div>
                <p className="font-bold text-slate-700">ไม่พบรายจ่ายที่ตรงกับตัวกรอง</p>
                <p className="mt-1 text-sm text-slate-400">ลองปรับเงื่อนไขการค้นหาใหม่</p>
                <Button
                  className="mt-5 h-10 rounded-lg bg-teal-600 px-5 text-[14px] font-semibold text-white hover:bg-teal-700"
                  onClick={() => router.push("/expenses/new")}
                >
                  <Upload className="h-4 w-4" />
                  อัปโหลดค่าใช้จ่าย
                </Button>
              </div>
            ) : null}

            {/* Expense table */}
            {activeTab === "expenses" && filteredExpenses.length > 0 ? (
              <ExpenseTable
                groups={groups}
                onDelete={(expense) => setExpenseToDelete(expense)}
                onOpen={(expenseId) => router.push(`/expenses/${expenseId}`)}
              />
            ) : null}
          </div>
        </section>
      </div>

      <DeleteExpenseDialog
        open={Boolean(expenseToDelete)}
        expenseName={expenseToDelete?.storeName ?? ""}
        onCancel={() => setExpenseToDelete(null)}
        onConfirm={confirmDelete}
      />
      <CreateBusinessDialog
        open={createBusinessOpen}
        onClose={() => setCreateBusinessOpen(false)}
        onCreate={createBusiness}
      />
      <MobileBottomNav />
    </main>
  );
}
