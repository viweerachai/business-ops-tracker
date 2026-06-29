import Link from "next/link";
import { ReceiptText, RefreshCcw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <main className="min-h-[100dvh] bg-[radial-gradient(circle_at_top,_#dff4ef_0%,_#f8fafc_42%,_#eef3f7_100%)] px-5 py-8 text-slate-900">
      <div className="mx-auto grid max-w-md gap-5 pt-10">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white shadow-[0_20px_40px_rgba(15,23,42,0.08)]">
          <WifiOff className="h-8 w-8 text-teal-700" />
        </div>
        <div>
          <p className="text-sm font-black uppercase text-teal-700">Offline Mode</p>
          <h1 className="mt-2 text-3xl font-black tracking-normal">ตอนนี้ไม่มีอินเทอร์เน็ต</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            แอปยังเปิดได้ แต่บางส่วนที่ต้องใช้ Google Drive, Firestore, หรือ OCR cloud จะยังทำงานไม่ครบจนกว่าจะกลับมาออนไลน์
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_20px_40px_rgba(15,23,42,0.06)]">
          <div className="flex items-start gap-3">
            <ReceiptText className="mt-0.5 h-5 w-5 text-slate-500" />
            <div className="min-w-0">
              <p className="font-black text-slate-900">สิ่งที่ยังทำได้</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                เปิดหน้าเดิมที่ cache ไว้, ดูบางข้อมูลในเครื่อง, และกลับมาบันทึกต่อเมื่อเน็ตกลับมา
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3">
          <Button asChild className="h-12 rounded-2xl bg-slate-950 text-white hover:bg-slate-800">
            <Link href="/mobile">
              เปิดหน้ามือถือ
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-12 rounded-2xl bg-white">
            <Link href="/receipt-chat">
              เปิด receipt chat
            </Link>
          </Button>
          <Button asChild variant="ghost" className="h-12 rounded-2xl text-slate-700">
            <Link href="/">
              <RefreshCcw className="h-4 w-4" />
              กลับหน้าแรก
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
