"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Building2, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { liveQuery } from "dexie";
import { CreateBusinessDialog } from "@/components/business/CreateBusinessDialog";
import { EditBusinessDialog } from "@/components/business/EditBusinessDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useBusinesses } from "@/hooks/useBusinesses";
import { expensesDb } from "@/lib/db";
import { saveExpenseWithItemsDoc } from "@/lib/firebase/firestore";
import type { Business } from "@/lib/expenseTypes";

export default function BusinessSettingsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const {
    businesses,
    activeBusinessId,
    createBusiness,
    updateBusiness,
    deleteBusiness,
    setActiveBusinessId,
    user,
    loading
  } = useBusinesses();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [createOpen, setCreateOpen] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [migrationMessage, setMigrationMessage] = useState<string | null>(null);
  const ownerEmail = session?.user?.email ?? "local";

  useEffect(() => {
    const subscription = liveQuery(async () => {
      const expenses = await expensesDb.expenses.toArray();
      return expenses.reduce<Record<string, number>>((acc, expense) => {
        if (!expense.businessId) return acc;
        acc[expense.businessId] = (acc[expense.businessId] ?? 0) + 1;
        return acc;
      }, {});
    }).subscribe((nextCounts) => setCounts(nextCounts));

    return () => subscription.unsubscribe();
  }, []);

  async function handleDelete(business: Business) {
    if (businesses.length <= 1) {
      alert("ต้องมีธุรกิจอย่างน้อย 1 รายการ");
      return;
    }
    const ok = window.confirm(`ลบธุรกิจ "${business.name}" ใช่ไหม? ข้อมูลรายจ่ายเดิมจะยังอยู่ในเครื่อง แต่จะไม่ถูกแสดงในธุรกิจอื่น`);
    if (!ok) return;
    await deleteBusiness(business.id);
  }

  async function migrateLocalData() {
    if (!user || !activeBusinessId || !businesses.length) {
      setMigrationMessage("กรุณาเลือกธุรกิจก่อนย้ายข้อมูล");
      return;
    }
    const activeBusiness = businesses.find((business) => business.id === activeBusinessId);
    if (!activeBusiness) return;

    try {
      setMigrationMessage("กำลังย้ายข้อมูลจากเครื่องไป Firestore...");
      const localExpenses = await expensesDb.expenses.toArray();
      let migrated = 0;
      for (const expense of localExpenses) {
        const expenseBusinessId = expense.businessId || activeBusinessId;
        if (expenseBusinessId !== activeBusinessId) continue;
        const items = await expensesDb.expense_items.where("expenseId").equals(expense.id).toArray();
        await saveExpenseWithItemsDoc({
          user,
          businessId: activeBusinessId,
          expense: {
            id: expense.id,
            purchaseDate: expense.purchaseDate,
            uploadDate: expense.uploadDate,
            documentType: expense.documentType,
            paymentStatus: expense.paymentStatus,
            hasTaxInvoice: expense.hasTaxInvoice ?? false,
            invoiceNumber: expense.invoiceNumber ?? "",
            storeName: expense.storeName,
            vendorName: expense.vendorName || expense.storeName,
            vendorTaxId: expense.vendorTaxId ?? "",
            vendorBranchName: expense.vendorBranchName ?? "",
            vendorBranchCode: expense.vendorBranchCode ?? "",
            vendorAddress: expense.vendorAddress ?? "",
            detail: expense.detail,
            subtotal: expense.subtotal,
            tax: expense.tax,
            withholdingTax: expense.withholdingTax ?? null,
            total: expense.total,
            currency: expense.currency,
            expenseType: expense.expenseType || "รายจ่าย",
            category: expense.categorySummary,
            subCategory: expense.subCategory ?? "",
            requesterName: expense.requesterName || expense.payerName,
            memo: "",
            aiMemo: expense.aiMemo ?? "",
            aiConfidence: "low",
            status: expense.paymentStatus === "paid" ? "confirmed" : "review_needed",
            extractionMode: expense.ocrText ? "google_vision_ocr" : "manual",
            imageDriveFileId: expense.imageDriveFileId ?? "",
            imageDriveUrl: expense.imageDriveUrl ?? "",
            imageFileName: "",
            ocrText: expense.ocrText ?? ""
          },
          items: items.map((item) => ({
            id: item.id,
            rawName: item.rawName,
            displayName: item.displayName,
            category: item.category,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            isResaleItem: item.isResaleItem,
            productId: null,
            memo: item.memo ?? ""
          }))
        });
        migrated += 1;
      }
      await expensesDb.app_settings.put({
        key: "indexedDbMigratedToFirestore",
        value: true,
        updatedAt: new Date().toISOString()
      });
      setMigrationMessage(`ย้ายข้อมูลสำเร็จ ${migrated} รายการ`);
    } catch (err) {
      setMigrationMessage(err instanceof Error ? err.message : "ย้ายข้อมูลไม่สำเร็จ");
    }
  }

  return (
    <main className="min-h-screen bg-[#F6F8FB] px-4 py-6 text-slate-900 md:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Button variant="ghost" className="mb-3 rounded-xl" onClick={() => router.push("/expenses")}>
              <ArrowLeft className="h-5 w-5" />
              กลับรายจ่าย
            </Button>
            <h1 className="text-3xl font-black">จัดการธุรกิจ</h1>
            <p className="mt-2 text-slate-500">แต่ละธุรกิจมีรายจ่าย, Google Drive folder และ Google Spreadsheet แยกกัน</p>
          </div>
          <Button className="h-11 rounded-xl bg-slate-950 text-white hover:bg-slate-800" onClick={() => setCreateOpen(true)}>
            <Plus className="h-5 w-5" />
            สร้างธุรกิจใหม่
          </Button>
        </div>

        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
          <CardHeader className="border-b border-slate-100 p-5">
            <h2 className="text-lg font-black">ธุรกิจทั้งหมด</h2>
          </CardHeader>
          <CardContent className="grid gap-3 p-5">
            {loading ? <div className="h-24 animate-pulse rounded-2xl bg-slate-100" /> : null}
            {!loading && businesses.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <Building2 className="mx-auto h-10 w-10 text-slate-400" />
                <p className="mt-3 font-black text-slate-700">ยังไม่มีธุรกิจ</p>
              </div>
            ) : null}
            {businesses.map((business) => (
              <div key={business.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white font-black text-slate-700 shadow-sm">
                  {business.name.slice(0, 1)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-lg font-black text-slate-900">{business.name}</p>
                    {business.id === activeBusinessId ? <Badge className="bg-blue-50 text-blue-700">ใช้งานอยู่</Badge> : null}
                    <Badge className="bg-indigo-50 text-indigo-700">{business.plan}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {business.phone || "ยังไม่มีเบอร์โทร"} · {counts[business.id] ?? 0} รายจ่าย
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" className="rounded-xl bg-white" onClick={() => setActiveBusinessId(business.id)}>
                    ใช้งาน
                  </Button>
                  <Button variant="outline" className="rounded-xl bg-white" onClick={() => setEditingBusiness(business)}>
                    <Pencil className="h-4 w-4" />
                    แก้ไข
                  </Button>
                  <Button variant="destructive" className="rounded-xl" onClick={() => handleDelete(business)}>
                    <Trash2 className="h-4 w-4" />
                    ลบ
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="mt-5 rounded-2xl border-slate-200 bg-white shadow-sm">
          <CardHeader className="border-b border-slate-100 p-5">
            <h2 className="text-lg font-black">Migration</h2>
          </CardHeader>
          <CardContent className="p-5">
            <p className="text-sm leading-6 text-slate-500">
              ใช้ปุ่มนี้ครั้งเดียวถ้าต้องการย้ายข้อมูลเก่าที่อยู่ในเครื่องไป Firestore ข้อมูลในเครื่องจะไม่ถูกลบ
            </p>
            <Button className="mt-4 rounded-xl bg-slate-950 text-white hover:bg-slate-800" onClick={migrateLocalData}>
              ย้ายข้อมูลจากเครื่องไป Firestore
            </Button>
            {migrationMessage ? <p className="mt-3 text-sm font-semibold text-slate-600">{migrationMessage}</p> : null}
          </CardContent>
        </Card>
      </div>

      <CreateBusinessDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={(input) => createBusiness({ ownerEmail, ...input })}
      />
      <EditBusinessDialog business={editingBusiness} onClose={() => setEditingBusiness(null)} onSave={updateBusiness} />
    </main>
  );
}
