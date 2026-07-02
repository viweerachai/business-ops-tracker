"use client";

import { useState } from "react";
import { ArrowLeft, Building2, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { CreateBusinessDialog } from "@/components/business/CreateBusinessDialog";
import { EditBusinessDialog } from "@/components/business/EditBusinessDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { useBusinesses } from "@/hooks/useBusinesses";
import { signOutEverywhere } from "@/lib/auth-client";
import type { Business } from "@/lib/expenseTypes";

export default function BusinessSettingsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const {
    businesses,
    activeBusinessId,
    isLoggedIn: hasBusinessLogin,
    createBusiness,
    updateBusiness,
    deleteBusiness,
    setActiveBusinessId,
    loading
  } = useBusinesses();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const isLoggedIn = Boolean(session?.user);

  async function handleDelete(business: Business) {
    if (businesses.length <= 1) {
      alert("ต้องมีธุรกิจอย่างน้อย 1 รายการ");
      return;
    }
    const ok = window.confirm(
      `ลบธุรกิจ "${business.name}" ใช่ไหม?`
    );
    if (!ok) return;
    await deleteBusiness(business.id);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 md:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Button
              variant="ghost"
              className="mb-3 rounded-xl"
              onClick={() => router.push("/expenses")}
            >
              <ArrowLeft className="h-5 w-5" />
              กลับรายจ่าย
            </Button>
            <h1 className="text-3xl font-black">จัดการธุรกิจ</h1>
            <p className="mt-2 text-slate-500">
              แต่ละธุรกิจมีรายจ่ายและข้อมูลแยกกัน
            </p>
          </div>
          <Button
            className="h-11 rounded-xl bg-teal-600 text-white hover:bg-teal-700"
            onClick={() => setCreateOpen(true)}
          disabled={!hasBusinessLogin}
        >
            <Plus className="h-5 w-5" />
            สร้างธุรกิจใหม่
          </Button>
        </div>

        {!isLoggedIn ? (
          <Card className="mb-6 rounded-2xl border-teal-200 bg-teal-50 shadow-sm">
            <CardContent className="p-5">
              <div className="max-w-md">
                <p className="text-[11px] font-bold uppercase tracking-widest text-teal-700">ต้องเข้าสู่ระบบก่อน</p>
                <h2 className="mt-1 text-xl font-black text-slate-950">เข้าสู่ระบบ Google เพื่อจัดการธุรกิจ</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  กดปุ่มด้านล่างเพื่อเชื่อมบัญชี แล้วกลับมาสร้างหรือแก้ไขธุรกิจได้จากหน้านี้
                </p>
                <div className="mt-4">
                  <GoogleSignInButton callbackUrl="/settings/businesses" className="h-11 w-full justify-center rounded-xl font-semibold" />
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {isLoggedIn ? (
          <Card className="mb-6 rounded-2xl border-slate-200 bg-white shadow-sm">
            <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">บัญชี</p>
                <h2 className="mt-1 text-lg font-black text-slate-950">จัดการการเข้าสู่ระบบ</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {session?.user?.email || "บัญชี Google ที่เชื่อมต่ออยู่"}
                </p>
              </div>
              <Button
                variant="outline"
                className="h-11 rounded-xl border-slate-200 bg-white font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  void signOutEverywhere("/");
                }}
              >
                ออกจากระบบ
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
          <CardHeader className="border-b border-slate-100 p-5">
            <h2 className="text-lg font-black">ธุรกิจทั้งหมด</h2>
          </CardHeader>
          <CardContent className="grid gap-3 p-5">
            {loading ? (
              <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
            ) : null}
            {!loading && businesses.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <Building2 className="mx-auto h-10 w-10 text-slate-400" />
                <p className="mt-3 font-black text-slate-700">ยังไม่มีธุรกิจ</p>
              </div>
            ) : null}
            {businesses.map((business) => (
              <div
                key={business.id}
                className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-600 font-bold text-white shadow-sm">
                  {business.name.slice(0, 1)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-lg font-black text-slate-900">
                      {business.name}
                    </p>
                    {business.id === activeBusinessId ? (
                      <Badge className="bg-teal-50 text-teal-700">ใช้งานอยู่</Badge>
                    ) : null}
                    <Badge className="bg-slate-100 text-slate-600">{business.plan}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {business.phone || "ยังไม่มีเบอร์โทร"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    className="rounded-xl bg-white"
                    onClick={() => setActiveBusinessId(business.id)}
                  >
                    ใช้งาน
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-xl bg-white"
                    onClick={() => setEditingBusiness(business)}
                  >
                    <Pencil className="h-4 w-4" />
                    แก้ไข
                  </Button>
                  <Button
                    variant="destructive"
                    className="rounded-xl"
                    onClick={() => handleDelete(business)}
                  >
                    <Trash2 className="h-4 w-4" />
                    ลบ
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <CreateBusinessDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={createBusiness}
      />
      <EditBusinessDialog
        business={editingBusiness}
        onClose={() => setEditingBusiness(null)}
        onSave={updateBusiness}
      />
    </main>
  );
}
