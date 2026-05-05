import { X } from "lucide-react";

export function TopAnnouncement() {
  return (
    <div className="relative flex h-13 shrink-0 items-center justify-center bg-[#10B981] px-6 text-center text-[14px] font-semibold text-white shadow-sm">
      <p className="truncate">
        ขอบคุณที่ทดลองใช้งานระบบต้นทุนผู้ช่วย หากพบปัญหาหรืออยากให้เพิ่มฟีเจอร์ สามารถส่ง feedback ได้
      </p>
      <button
        type="button"
        aria-label="Close announcement"
        className="absolute right-4 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-950/80 text-white"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
