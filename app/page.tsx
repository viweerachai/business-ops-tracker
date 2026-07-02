"use client";

import Link from "next/link";
import { ArrowRight, LayoutDashboard, Lock, Sparkles } from "lucide-react";
import { useSession } from "next-auth/react";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <Skeleton className="h-6 w-36 rounded-lg" />
          <Skeleton className="mt-4 h-20 w-full rounded-2xl" />
          <Skeleton className="mt-4 h-11 w-full rounded-xl" />
        </div>
      </main>
    );
  }

  if (session?.user) {
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50">
            <LayoutDashboard className="h-7 w-7 text-teal-600" />
          </div>
          <h1 className="mt-4 text-[24px] font-black tracking-tight text-slate-950">Business Ops</h1>
          <p className="mt-2 text-[14px] leading-relaxed text-slate-500">
            ล็อกอินแล้ว พร้อมไปหน้าแดชบอร์ดรายจ่าย
          </p>
          <Button asChild className="mt-5 h-11 w-full rounded-xl bg-teal-600 text-white hover:bg-teal-700">
            <Link href="/expenses">
              ไปหน้ารายจ่าย
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="grid min-h-[100dvh] place-items-center bg-[radial-gradient(circle_at_top,rgba(20,184,166,0.14),transparent_42%),linear-gradient(180deg,#f8fafc_0%,#eef6f5_100%)] px-4 text-slate-900">
      <div className="w-full max-w-md rounded-3xl border border-white/70 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.10)] backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-md">
            <LayoutDashboard className="h-7 w-7" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-teal-600">Business Ops</p>
            <h1 className="text-[26px] font-black tracking-tight text-slate-950">จัดการรายจ่ายธุรกิจ</h1>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50">
              <Lock className="h-4.5 w-4.5 text-teal-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[14px] font-bold text-slate-950">ยังไม่ได้เข้าสู่ระบบ</p>
              <p className="mt-1 text-[13px] leading-relaxed text-slate-500">
                กดเข้าสู่ระบบเพื่อโหลดข้อมูลธุรกิจ รายจ่าย และสินค้าจาก Firestore
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-2.5">
          <GoogleSignInButton callbackUrl="/expenses" className="h-11 w-full justify-center rounded-xl font-semibold" />
          <Button asChild variant="outline" className="h-11 w-full rounded-xl border-slate-200 bg-white font-semibold text-slate-700 hover:bg-slate-50">
            <Link href="/receipt-chat?mock=1">
              ลองโหมดเดโม
              <Sparkles className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
