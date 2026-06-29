import { Loader2 } from "lucide-react";

export function AppLoadingScreen({
  title = "กำลังโหลดข้อมูล",
  description = "รอสักครู่ ระบบกำลังดึงข้อมูลล่าสุดให้"
}: {
  title?: string;
  description?: string;
}) {
  return (
    <main className="grid min-h-[100dvh] place-items-center bg-[#F5F7FB] px-6 text-slate-900">
      <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white px-6 py-8 text-center shadow-sm">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-blue-50 text-blue-600">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
        <p className="mt-5 text-xl font-black">{title}</p>
        <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
      </div>
    </main>
  );
}
