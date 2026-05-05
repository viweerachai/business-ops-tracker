"use client";

import { Button } from "@/components/ui/button";

export function DeleteExpenseDialog({
  open,
  expenseName,
  onCancel,
  onConfirm
}: {
  open: boolean;
  expenseName: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
        <h2 className="text-lg font-black text-slate-950">ลบรายจ่ายนี้?</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          ต้องการลบ “{expenseName}” และรายการสินค้าที่เกี่ยวข้องออกจากเครื่องนี้หรือไม่
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="outline" className="rounded-xl bg-white" onClick={onCancel}>
            ยกเลิก
          </Button>
          <Button variant="destructive" className="rounded-xl" onClick={onConfirm}>
            ยืนยันลบ
          </Button>
        </div>
      </div>
    </div>
  );
}
