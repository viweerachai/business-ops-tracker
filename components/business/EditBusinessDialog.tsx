"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Business } from "@/lib/expenseTypes";

export function EditBusinessDialog({
  business,
  onClose,
  onSave
}: {
  business: Business | null;
  onClose: () => void;
  onSave: (businessId: string, patch: { name: string; phone?: string }) => Promise<void> | void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(business?.name ?? "");
    setPhone(business?.phone ?? "");
    setError(null);
  }, [business]);

  if (!business) return null;

  async function handleSave() {
    const currentBusiness = business;
    if (!currentBusiness) return;
    if (!name.trim()) {
      setError("กรุณากรอกชื่อธุรกิจ");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await onSave(currentBusiness.id, { name, phone });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกธุรกิจไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <h2 className="text-xl font-black text-slate-950">แก้ไขธุรกิจ</h2>
        <div className="mt-5 grid gap-4">
          <div className="grid gap-2">
            <Label className="font-bold">ชื่อธุรกิจ *</Label>
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label className="font-bold">เบอร์โทร</Label>
            <Input value={phone} onChange={(event) => setPhone(event.target.value)} />
          </div>
          {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" className="h-11 rounded-xl bg-white" onClick={onClose} disabled={saving}>
            ยกเลิก
          </Button>
          <Button className="h-11 rounded-xl bg-slate-950 px-5 text-white hover:bg-slate-800" onClick={handleSave} disabled={saving}>
            {saving ? "กำลังบันทึก..." : "บันทึก"}
          </Button>
        </div>
      </div>
    </div>
  );
}
