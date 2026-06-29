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
      <main className="grid min-h-[100dvh] place-items-center bg-[#E9EDF2] px-5 py-8">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
          <Skeleton className="h-8 w-40 rounded-xl" />
          <Skeleton className="mt-4 h-20 w-full rounded-2xl" />
          <Skeleton className="mt-4 h-12 w-full rounded-2xl" />
        </div>
      </main>
    );
  }

  if (!session?.user && !mockMode) {
    return (
      <main className="min-h-[100dvh] bg-[radial-gradient(circle_at_top,_#dff4ef_0%,_#f8fafc_42%,_#eef3f7_100%)] px-5 py-8 text-slate-900">
        <div className="mx-auto grid max-w-md gap-5 pt-10">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white shadow-[0_20px_40px_rgba(15,23,42,0.08)]">
            <Lock className="h-8 w-8 text-teal-700" />
          </div>
          <div>
            <p className="text-sm font-black uppercase text-teal-700">Protected</p>
            <h1 className="mt-2 text-3xl font-black tracking-normal">ต้นทุนผู้ช่วยต้องล็อกอินก่อน</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              หน้า receipt chat ใช้ข้อมูลธุรกิจและ workflow ที่ผูกกับบัญชี Google เพราะฉะนั้นถ้ายังไม่เข้าสู่ระบบจะยังเข้าใช้งานหน้านี้ไม่ได้
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_20px_40px_rgba(15,23,42,0.06)]">
            <div className="flex items-start gap-3">
              <ReceiptText className="mt-0.5 h-5 w-5 text-slate-500" />
              <div className="min-w-0">
                <p className="font-black text-slate-900">หลังล็อกอินแล้ว</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  คุณจะกลับเข้าหน้า `receipt-chat` นี้ได้ทันที และค่อยต่อ flow ถ่ายรูปใบเสร็จบนมือถือได้เลย
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3">
            <GoogleSignInButton callbackUrl="/receipt-chat" className="h-12 w-full justify-center rounded-2xl" />
            <Button asChild variant="outline" className="h-12 rounded-2xl bg-white">
              <Link href="/mobile">กลับหน้ามือถือ</Link>
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="h-[100dvh] w-full max-w-full overflow-hidden bg-[#E9EDF2]">
      <ChatShell mockMode={mockMode} />
    </main>
  );
}
