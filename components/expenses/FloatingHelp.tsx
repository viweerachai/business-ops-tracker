import { BookOpen, PartyPopper } from "lucide-react";

export function FloatingHelp() {
  return (
    <div className="fixed bottom-6 right-6 z-20 flex gap-3">
      <button className="flex h-12 items-center gap-2 rounded-lg border border-slate-600 bg-white px-4 text-[16px] font-bold text-slate-800 shadow-md">
        <PartyPopper className="h-5 w-5" />
        มีอะไรใหม่
      </button>
      <button className="flex h-12 items-center gap-2 rounded-lg border border-slate-600 bg-white px-4 text-[16px] font-bold text-slate-800 shadow-md">
        <BookOpen className="h-5 w-5" />
        คู่มือใช้งาน
      </button>
    </div>
  );
}
