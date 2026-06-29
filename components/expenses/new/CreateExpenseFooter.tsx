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
    <footer className="sticky bottom-0 z-20 border-t border-slate-200 bg-white/98 px-4 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.06)] backdrop-blur md:px-6">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3">
        <Button
          variant="outline"
          className="h-10 rounded-lg border-slate-200 bg-white px-6 text-[14px] font-semibold text-slate-700 hover:bg-slate-50"
          onClick={onCancel}
        >
          ยกเลิก
        </Button>
        <Button
          className="h-10 rounded-lg bg-teal-600 px-6 text-[14px] font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
          onClick={onSave}
          disabled={disabled || saving}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "กำลังบันทึก..." : saveLabel ?? "สร้างรายจ่าย"}
        </Button>
      </div>
    </footer>
  );
}
