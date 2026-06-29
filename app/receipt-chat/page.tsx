"use client";

import Link from "next/link";
import { Lock, ReceiptText } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { ChatShell } from "@/components/receipt-chat/ChatShell";
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
      <main className="min-h-[100dvh] bg-background px-5 py-10 text-slate-900">
        <div className="mx-auto max-w-sm">
          {/* Icon */}
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 shadow-sm">
            <Lock className="h-7 w-7 text-teal-600" />
          </div>

          {/* Heading */}
          <div className="mt-5">
            <p className="text-[11px] font-bold uppercase tracking-widest text-teal-600">ต้องเข้าสู่ระบบก่อน</p>
            <h1 className="mt-2 text-[24px] font-bold leading-tight tracking-tight text-slate-950">
              ต้นทุนผู้ช่วย
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              หน้า Receipt Chat ผูกกับบัญชี Google เพื่อดึงข้อมูลธุรกิจและบันทึกรายจ่าย
            </p>
          </div>

          {/* Info card */}
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                <ReceiptText className="h-4 w-4 text-slate-500" />
              </div>
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-slate-900">หลังเข้าสู่ระบบแล้ว</p>
                <p className="mt-1 text-[13px] leading-relaxed text-slate-500">
                  คุณจะกลับหน้า receipt-chat นี้ได้ทันที และเริ่ม flow ถ่ายรูปใบเสร็จได้เลย
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
      </main>
    );
  }

  return (
    <main className="h-[100dvh] w-full max-w-full overflow-hidden bg-background">
      <ChatShell mockMode={mockMode} />
    </main>
  );
}
