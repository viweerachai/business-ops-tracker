"use client";

import Link from "next/link";
import { Lock, ReceiptText } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { ChatShell } from "@/components/receipt-chat/ChatShell";
import { MobileBottomNav } from "@/components/expenses/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function ReceiptChatPage() {
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const mockMode = searchParams.get("mock") === "1";

  if (status === "loading") {
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-background px-5 py-8">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-md">
          <Skeleton className="h-6 w-32 rounded-lg" />
          <Skeleton className="mt-4 h-16 w-full rounded-xl" />
          <Skeleton className="mt-4 h-11 w-full rounded-xl" />
        </div>
      </main>
    );
  }

  if (!session?.user && !mockMode) {
    return (
      <main className="flex min-h-[100dvh] flex-col bg-background pb-24 text-slate-900">
        <div className="px-5 pb-6 pt-10">
          <div className="mx-auto w-full max-w-sm">
            {/* Icon + heading */}
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-teal-50">
                <Lock className="h-7 w-7 text-teal-600" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-widest text-teal-600">ต้องเข้าสู่ระบบก่อน</p>
                <h1 className="mt-0.5 text-[22px] font-bold leading-tight tracking-tight text-slate-950">
                  ต้นทุนผู้ช่วย
                </h1>
              </div>
            </div>

            <p className="mt-4 text-[14px] leading-relaxed text-slate-500">
              หน้า Receipt Chat ผูกกับบัญชี Google เพื่อดึงข้อมูลธุรกิจและบันทึกรายจ่าย
            </p>

            {/* Info card */}
            <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-50">
                  <ReceiptText className="h-4 w-4 text-teal-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-slate-900">หลังเข้าสู่ระบบแล้ว</p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-slate-500">
                    คุณจะกลับหน้านี้ได้ทันที และเริ่ม flow ถ่ายรูปใบเสร็จได้เลย
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-5 grid gap-2.5">
              <GoogleSignInButton callbackUrl="/receipt-chat" className="h-11 w-full justify-center rounded-xl font-semibold" />
              <Button asChild variant="outline" className="h-11 rounded-xl border-slate-200 bg-white font-semibold text-slate-700 hover:bg-slate-50">
                <Link href="/mobile">กลับหน้ามือถือ</Link>
              </Button>
            </div>
          </div>
        </div>
        <MobileBottomNav />
      </main>

    );
  }

  return (
    <main className="h-[100dvh] w-full max-w-full overflow-hidden bg-background">
      <ChatShell mockMode={mockMode} />
    </main>
  );
}
