"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Upload } from "lucide-react";
import { signIn, useSession } from "next-auth/react";
import { CreateBusinessDialog } from "@/components/business/CreateBusinessDialog";
import { AppSidebar } from "@/components/expenses/AppSidebar";
import { BusinessHeader } from "@/components/expenses/BusinessHeader";
import { DeleteExpenseDialog } from "@/components/expenses/DeleteExpenseDialog";
import { ExpenseFilters } from "@/components/expenses/ExpenseFilters";
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
      total: groupExpenses.reduce((sum, expense) => sum + expense.total, 0)
    }));
}

function sameMonth(date: string, current: Date) {
  return date.startsWith(`${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`);
}

function sameYear(date: string, current: Date) {
  return date.startsWith(String(current.getFullYear()));
}

function LoadingTable() {
  return (
    <div className="mt-8 grid gap-6">
      {[0, 1].map((item) => (
        <div key={item} className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
          <Skeleton className="h-8 w-64" />
          <div className="mt-6 grid gap-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-20 w-full" />
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
  const [toast, setToast] = useState<string | null>(null);
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
  const receiptCountThisMonth = expenses.filter((expense) => sameMonth(expense.purchaseDate, currentDate)).length;
  const totalThisMonth = expenses
    .filter((expense) => sameMonth(expense.purchaseDate, currentDate))
    .reduce((sum, expense) => sum + expense.total, 0);
  const totalThisYear = expenses
    .filter((expense) => sameYear(expense.purchaseDate, currentDate))
    .reduce((sum, expense) => sum + expense.total, 0);
  const groups = useMemo(() => groupExpensesByMonth(filteredExpenses), [filteredExpenses]);
  const hasBusiness = Boolean(activeBusinessId);
  const ownerEmail = session?.user?.email ?? "";

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2500);
  }

  async function getGoogleClientSession() {
    try {
      const response = await fetch("/api/auth/session", {
        cache: "no-store",
        credentials: "same-origin"
      });
      if (!response.ok) return null;
      return (await response.json()) as GoogleClientSession;
    } catch {
      return null;
    }
  }

  async function requireGoogleLogin(callbackUrl = "/expenses") {
    const session = await getGoogleClientSession();
    if (!session?.googleAccessToken || session.googleTokenError) {
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
    <main className="h-screen overflow-hidden bg-[#F5F7FB] text-slate-900">
      <div className="flex h-screen min-h-0">
        <AppSidebar />
        <section className="min-w-0 flex-1 overflow-auto bg-[#F5F7FB]">
          <div className="w-full max-w-full px-5 py-7 lg:px-7 2xl:px-9">
            <BusinessHeader
              businessName={activeBusiness?.name}
              phone={activeBusiness?.phone}
              onUpload={() =>
                runWithGoogleLogin(() => {
                  if (!hasBusiness) {
                    setCreateBusinessOpen(true);
                    return;
                  }
                  router.push("/expenses/new");
                }, "/expenses/new")
              }
              onEditBusiness={() =>
                runWithGoogleLogin(() => {
                  if (!hasBusiness) {
                    setCreateBusinessOpen(true);
                    return;
                  }
                  showToast("ยังไม่ได้เปิดใช้งานการแก้ไขธุรกิจ");
                })
              }
              onGoogleDrive={() => runWithGoogleLogin(() => showToast("เชื่อมต่อ Google แล้ว ระบบจะอัปโหลดรูปตอนกดบันทึกรายจ่าย"))}
              onGoogleSheets={() => runWithGoogleLogin(() => showToast("Google Sheets จะเป็น export/backup ภายหลัง ตอนนี้ใช้ Firestore เป็นฐานข้อมูลหลัก"))}
              onExportCsv={() => runWithGoogleLogin(() => downloadExpensesCsv(filteredExpenses))}
            />
            <div className="mt-5 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
              Cloud DB: Firestore
            </div>

            {!businessLoading && !isLoggedIn ? (
              <div className="mt-8 rounded-2xl border border-blue-100 bg-white p-10 text-center shadow-sm">
                <p className="text-xl font-black text-slate-900">กรุณาเข้าสู่ระบบ Google เพื่อดูและบันทึกข้อมูล</p>
                <p className="mt-2 text-slate-500">ข้อมูลรายจ่ายหลักจะโหลดจาก Firestore หลังเข้าสู่ระบบ</p>
                <Button className="mt-5 h-12 rounded-xl bg-slate-950 px-6 text-white" onClick={() => signIn("google", { callbackUrl: "/expenses" })}>
                  เข้าสู่ระบบ Google
                </Button>
              </div>
            ) : null}

            {isLoggedIn && !businessLoading && !hasBusiness ? (
              <div className="mt-8 rounded-2xl border border-dashed border-blue-200 bg-white p-10 text-center shadow-sm">
                <p className="text-2xl font-black text-slate-950">สร้างธุรกิจก่อนเริ่มใช้งาน</p>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
                  ระบบจะแยกรายจ่าย, Google Drive folder และ Firestore data ตามแต่ละธุรกิจ เพื่อไม่ให้ข้อมูลร้านปนกัน
                </p>
                <Button
                  className="mt-6 h-12 rounded-xl bg-slate-950 px-6 text-white hover:bg-slate-800"
                  onClick={() => setCreateBusinessOpen(true)}
                >
                  สร้างธุรกิจแรก
                </Button>
              </div>
            ) : null}

            {isLoggedIn && hasBusiness ? <div className="mt-8">
              <SummaryCards
                monthLabel={monthLabel}
                yearLabel={yearLabel}
                receiptCountThisMonth={receiptCountThisMonth}
                totalThisMonth={totalThisMonth}
                totalThisYear={totalThisYear}
              />
            </div> : null}
            {isLoggedIn && hasBusiness ? <div className="mt-9">
              <ExpenseTabs activeTab={activeTab} onChange={(tab) => runWithGoogleLogin(() => setActiveTab(tab))} />
            </div> : null}
            {isLoggedIn && hasBusiness ? <div className="mt-3">
              <ExpenseFilters filters={filters} payerOptions={payerOptions} onChange={setFilters} />
            </div> : null}

            {businessError || error ? (
              <div className="mt-8 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
                <AlertCircle className="mt-0.5 h-5 w-5" />
                <div>
                  <p className="font-black">โหลดข้อมูล DB ไม่สำเร็จ</p>
                  <p className="mt-1 text-sm">{businessError || error}</p>
                  <Button
                    className="mt-4 h-10 rounded-xl bg-slate-950 px-4 text-white hover:bg-slate-800"
                    onClick={() => signIn("google", { callbackUrl: "/expenses" })}
                  >
                    เข้าสู่ระบบ Google
                  </Button>
                </div>
              </div>
            ) : null}

            {isLoggedIn && hasBusiness && (loading || businessLoading) ? <LoadingTable /> : null}

            {isLoggedIn && hasBusiness && !loading && !businessLoading && activeTab === "vouchers" ? (
              <div className="mt-8 rounded-2xl border border-slate-100 bg-white p-10 text-center shadow-sm">
                <p className="text-xl font-black text-slate-900">ยังไม่มีข้อมูลใบสำคัญจ่าย</p>
              </div>
            ) : null}

            {isLoggedIn && hasBusiness && !loading && !businessLoading && activeTab === "expenses" && filteredExpenses.length === 0 ? (
              <div className="mt-8 rounded-2xl border border-slate-100 bg-white p-10 text-center shadow-sm">
                <p className="text-xl font-black text-slate-900">ยังไม่มีรายจ่าย</p>
                <p className="mt-2 text-slate-500">กดอัปโหลดค่าใช้จ่ายเพื่อเริ่มบันทึกใบเสร็จ</p>
                <Button className="mt-5 h-12 rounded-xl bg-slate-950 px-6 text-white" onClick={() => runWithGoogleLogin(() => router.push("/expenses/new"), "/expenses/new")}>
                  <Upload className="h-5 w-5" />
                  อัปโหลดค่าใช้จ่าย
                </Button>
              </div>
            ) : null}

            {isLoggedIn && hasBusiness && !loading && !businessLoading && activeTab === "expenses" && filteredExpenses.length > 0 ? (
              <ExpenseTable
                groups={groups}
                onDelete={(expense) => runWithGoogleLogin(() => setExpenseToDelete(expense))}
                onOpen={(expenseId) => runWithGoogleLogin(() => router.push(`/expenses/${expenseId}`))}
              />
            ) : null}
          </div>
        </section>
      </div>
      {toast ? (
        <div className="fixed bottom-24 right-6 z-30 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white shadow-xl">
          {toast}
        </div>
      ) : null}
      {loginPrompt.open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <p className="text-xl font-black text-slate-950">กรุณาเข้าสู่ระบบ Google</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              ต้องเข้าสู่ระบบ Google ก่อน เพื่อบันทึกรูปลง Google Drive และข้อมูลลง Firestore
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                className="h-11 rounded-xl"
                onClick={() => setLoginPrompt({ open: false, callbackUrl: "/expenses" })}
              >
                ยกเลิก
              </Button>
              <Button
                className="h-11 rounded-xl bg-slate-950 px-5 text-white hover:bg-slate-800"
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
    </main>
  );
}
