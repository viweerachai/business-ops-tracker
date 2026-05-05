"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Loader2, Plus, ReceiptText, Save, Trash2 } from "lucide-react";
import { GeminiExtractButton } from "@/components/GeminiExtractButton";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { clearDraftFromSession, loadDraftFromSession } from "@/lib/local/draft";
import { saveReceiptWithItems } from "@/lib/local/db";
import type { GeminiReceiptExtraction } from "@/lib/receiptSchema";
import { CATEGORIES, type Receipt, type ReceiptCategory, type ReceiptDraft } from "@/lib/types/receipt";
import { createId } from "@/lib/utils";

function now() {
  return new Date().toISOString();
}

function toNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toNullableNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

const blankItem = () => ({
  id: createId(),
  rawName: "",
  displayName: "",
  category: "Other" as ReceiptCategory,
  quantity: 1,
  unitPrice: 0,
  totalPrice: 0,
  isResaleItem: true,
  memo: "要確認"
});

export default function ReviewReceiptPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<ReceiptDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawGeminiOutput, setRawGeminiOutput] = useState<string | null>(null);

  useEffect(() => {
    setDraft(loadDraftFromSession());
  }, []);

  const resaleCount = useMemo(
    () => draft?.items.filter((item) => item.isResaleItem).length ?? 0,
    [draft]
  );

  function updateDraft(patch: Partial<ReceiptDraft>) {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  }

  function updateItem(index: number, patch: Partial<ReceiptDraft["items"][number]>) {
    setDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        items: current.items.map((item, itemIndex) =>
          itemIndex === index ? { ...item, ...patch } : item
        )
      };
    });
  }

  function applyGeminiExtraction(data: GeminiReceiptExtraction) {
    setError(null);
    setRawGeminiOutput(null);
    setDraft((current) => {
      if (!current) return current;

      return {
        ...current,
        storeName: data.storeName,
        purchaseDate: data.purchaseDate,
        subtotal: data.subtotal,
        tax: data.tax,
        total: data.total,
        aiMemo: data.aiMemo,
        items: data.items.map((item) => ({
          id: createId(),
          rawName: item.rawName,
          displayName: item.displayName,
          category: item.category,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          isResaleItem: item.isResaleItem,
          memo: item.memo
        }))
      };
    });
  }

  async function saveReceipt() {
    if (!draft) return;
    setSaving(true);
    setError(null);

    try {
      const timestamp = now();
      const receiptId = createId();
      const receipt: Receipt = {
        id: receiptId,
        imageDataUrl: draft.imageDataUrl,
        storeName: draft.storeName,
        purchaseDate: draft.purchaseDate,
        subtotal: draft.subtotal,
        tax: draft.tax,
        total: draft.total,
        aiMemo: draft.aiMemo,
        ocrLanguage: draft.ocrLanguage,
        ocrText: draft.ocrText,
        status: "saved",
        createdAt: timestamp,
        updatedAt: timestamp
      };

      await saveReceiptWithItems(
        receipt,
        draft.items.map((item) => ({
          ...item,
          receiptId,
          createdAt: timestamp,
          updatedAt: timestamp
        }))
      );

      clearDraftFromSession();
      router.push("/receipts/history");
    } catch (err) {
      console.error(err);
      setError("บันทึกลงเครื่องไม่สำเร็จ พื้นที่ browser อาจเต็ม");
      setSaving(false);
    }
  }

  if (!draft) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl items-center px-4">
        <div className="w-full rounded-lg border bg-card p-5 text-center shadow-sm">
          <ReceiptText className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="font-semibold">ยังไม่มี draft สำหรับตรวจรายการ</p>
          <Button className="mt-4 w-full" onClick={() => router.push("/receipts/new")}>
            ถ่าย/อัปโหลดใบเสร็จ
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 px-4 py-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-normal">ตรวจและแก้รายการ</h1>
          <p className="mt-1 text-sm text-muted-foreground">{resaleCount} รายการถูกเลือกเป็นสินค้ารีเซล</p>
        </div>
        <Button variant="ghost" onClick={() => router.push("/receipts/new")}>
          ใหม่
        </Button>
      </header>

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm font-medium text-destructive">
          {error}
        </div>
      ) : null}

      {rawGeminiOutput ? (
        <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md border border-destructive/30 bg-card p-3 text-xs">
          {rawGeminiOutput}
        </pre>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={draft.imageDataUrl} alt="Receipt" className="max-h-[70vh] w-full object-contain" />
        </div>

        <div className="grid gap-4 rounded-lg border bg-card p-4 shadow-sm">
          <div className="grid gap-2">
            <Label>ร้านค้า</Label>
            <Input value={draft.storeName ?? ""} onChange={(event) => updateDraft({ storeName: event.target.value || null })} />
          </div>
          <div className="grid gap-2">
            <Label>วันที่ซื้อ</Label>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                className="pl-10"
                type="date"
                value={draft.purchaseDate ?? ""}
                onChange={(event) => updateDraft({ purchaseDate: event.target.value || null })}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="grid gap-2">
              <Label>小計</Label>
              <Input inputMode="numeric" value={draft.subtotal ?? ""} onChange={(event) => updateDraft({ subtotal: toNullableNumber(event.target.value) })} />
            </div>
            <div className="grid gap-2">
              <Label>税</Label>
              <Input inputMode="numeric" value={draft.tax ?? ""} onChange={(event) => updateDraft({ tax: toNullableNumber(event.target.value) })} />
            </div>
            <div className="grid gap-2">
              <Label>合計</Label>
              <Input inputMode="numeric" value={draft.total ?? ""} onChange={(event) => updateDraft({ total: toNullableNumber(event.target.value) })} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>ข้อความ OCR</Label>
            <Textarea value={draft.ocrText} className="min-h-48" onChange={(event) => updateDraft({ ocrText: event.target.value })} />
          </div>
          <GeminiExtractButton
            ocrText={draft.ocrText}
            ocrLanguage={draft.ocrLanguage}
            onExtracted={applyGeminiExtraction}
            onError={(message, rawOutput) => {
              setError(message || null);
              setRawGeminiOutput(rawOutput || null);
            }}
          />
          {draft.aiMemo ? (
            <div className="rounded-md border border-secondary/40 bg-secondary/15 p-3 text-sm font-semibold">
              {draft.aiMemo}
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">รายการสินค้า</h2>
            <p className="text-sm text-muted-foreground">แก้ OCR และเอาติ๊กออกจากรายการส่วนตัวได้</p>
          </div>
          <Button variant="outline" size="icon" title="Add item" onClick={() => updateDraft({ items: [...draft.items, blankItem()] })}>
            <Plus className="h-5 w-5" />
          </Button>
        </div>

        {draft.items.length === 0 ? (
          <div className="rounded-md border border-dashed bg-muted/50 p-6 text-center text-sm text-muted-foreground">
            ยังไม่มีรายการ เพิ่มเองได้จากปุ่ม +
          </div>
        ) : (
          <div className="grid gap-4">
            {draft.items.map((item, index) => (
              <div
                key={item.id}
                className={
                  item.memo.includes("要確認")
                    ? "rounded-md border border-secondary bg-secondary/10 p-3"
                    : "rounded-md border bg-background p-3"
                }
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <label className="flex items-center gap-3 text-sm font-semibold">
                    <Checkbox checked={item.isResaleItem} onCheckedChange={(checked) => updateItem(index, { isResaleItem: checked === true })} />
                    สินค้ารีเซล
                  </label>
                  <Button variant="ghost" size="icon" title="Delete item" onClick={() => updateDraft({ items: draft.items.filter((_, itemIndex) => itemIndex !== index) })}>
                    <Trash2 className="h-5 w-5 text-destructive" />
                  </Button>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>ชื่อจาก OCR</Label>
                    <Input value={item.rawName} onChange={(event) => updateItem(index, { rawName: event.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>ชื่ออ่านง่าย</Label>
                    <Input value={item.displayName} onChange={(event) => updateItem(index, { displayName: event.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label>หมวดหมู่</Label>
                    <Select value={item.category} onValueChange={(value) => updateItem(index, { category: value as ReceiptCategory })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="grid gap-2">
                      <Label>จำนวน</Label>
                      <Input inputMode="decimal" value={item.quantity} onChange={(event) => updateItem(index, { quantity: toNumber(event.target.value) })} />
                    </div>
                    <div className="grid gap-2">
                      <Label>単価</Label>
                      <Input inputMode="numeric" value={item.unitPrice} onChange={(event) => updateItem(index, { unitPrice: toNumber(event.target.value) })} />
                    </div>
                    <div className="grid gap-2">
                      <Label>合計</Label>
                      <Input inputMode="numeric" value={item.totalPrice} onChange={(event) => updateItem(index, { totalPrice: toNumber(event.target.value) })} />
                    </div>
                  </div>
                  <div className="grid gap-2 md:col-span-2">
                    <Label>メモ</Label>
                    <Textarea value={item.memo} onChange={(event) => updateItem(index, { memo: event.target.value })} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="sticky bottom-0 -mx-4 border-t bg-background/95 p-4 backdrop-blur">
        <Button className="mx-auto flex w-full max-w-3xl" size="lg" disabled={saving} onClick={saveReceipt}>
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          บันทึก
        </Button>
      </div>
    </main>
  );
}
