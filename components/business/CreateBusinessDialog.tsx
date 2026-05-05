"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateBusinessDialog({
  open,
  onClose,
  onCreate
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (input: { name: string; phone?: string }) => Promise<unknown> | unknown;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleCreate() {
    if (!name.trim()) {
      setError("กรุณากรอกชื่อธุรกิจ");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await onCreate({ name, phone });
      setName("");
      setPhone("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "สร้างธุรกิจไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <h2 className="text-xl font-black text-slate-950">สร้างธุรกิจใหม่</h2>
        <p className="mt-1 text-sm text-slate-500">ข้อมูลรายจ่ายและ Google Sheets จะแยกตามธุรกิจ</p>

        <div className="mt-5 grid gap-4">
          <div className="grid gap-2">
            <Label className="font-bold">ชื่อธุรกิจ *</Label>
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="เช่น ร้านการ์ดของวี" />
          </div>
          <div className="grid gap-2">
            <Label className="font-bold">เบอร์โทร</Label>
            <Input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="optional" />
          </div>
          {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" className="h-11 rounded-xl bg-white" onClick={onClose} disabled={saving}>
            ยกเลิก
          </Button>
          <Button className="h-11 rounded-xl bg-slate-950 px-5 text-white hover:bg-slate-800" onClick={handleCreate} disabled={saving}>
            {saving ? "กำลังสร้าง..." : "สร้างธุรกิจ"}
          </Button>
        </div>
      </div>
    </div>
  );
}
