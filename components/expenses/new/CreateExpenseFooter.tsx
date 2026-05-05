import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CreateExpenseFooter({
  saving,
  disabled,
  saveLabel,
  onCancel,
  onSave
}: {
  saving: boolean;
  disabled: boolean;
  saveLabel?: string;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <footer className="sticky bottom-0 z-20 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur md:px-8">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3">
        <Button variant="outline" className="h-12 rounded-xl bg-white px-8 text-base" onClick={onCancel}>
          ยกเลิก
        </Button>
        <Button
          className="h-12 rounded-xl bg-slate-950 px-8 text-base font-black text-white hover:bg-slate-800"
          onClick={onSave}
          disabled={disabled || saving}
        >
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          {saving ? "กำลังสร้าง..." : saveLabel ?? "สร้างรายจ่าย"}
        </Button>
      </div>
    </footer>
  );
}
