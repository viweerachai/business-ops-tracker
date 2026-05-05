"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Eye, Plus, Search, Settings, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { deleteReceipt, localDb } from "@/lib/local/db";
import { CATEGORIES, type Receipt, type ReceiptCategory, type ReceiptItem } from "@/lib/types/receipt";

type ReceiptWithItems = Receipt & { items: ReceiptItem[] };

function yen(value: number | null) {
  if (typeof value !== "number") return "-";
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0
  }).format(value);
}

export default function ReceiptHistoryPage() {
  const router = useRouter();
  const [receipts, setReceipts] = useState<ReceiptWithItems[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ReceiptCategory | "All">("All");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  async function loadReceipts() {
    const savedReceipts = await localDb.receipts.orderBy("createdAt").reverse().toArray();
    const rows = await Promise.all(
      savedReceipts.map(async (receipt) => ({
        ...receipt,
        items: await localDb.items.where("receiptId").equals(receipt.id).toArray()
      }))
    );
    setReceipts(rows);
  }

  useEffect(() => {
    void loadReceipts();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return receipts.filter((receipt) => {
      const matchesQuery =
        !q ||
        receipt.storeName?.toLowerCase().includes(q) ||
        receipt.items.some(
          (item) =>
            item.rawName.toLowerCase().includes(q) ||
            item.displayName.toLowerCase().includes(q)
        );
      const matchesCategory =
        category === "All" || receipt.items.some((item) => item.category === category);
      return matchesQuery && matchesCategory;
    });
  }, [category, query, receipts]);

  async function removeReceipt(receiptId: string) {
    await deleteReceipt(receiptId);
    if (selectedId === receiptId) setSelectedId(null);
    await loadReceipts();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-4 px-4 py-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-normal">ประวัติใบเสร็จ</h1>
          <p className="mt-1 text-sm text-muted-foreground">ข้อมูลนี้อยู่ใน IndexedDB ของ browser นี้</p>
        </div>
        <Button size="icon" title="New receipt" onClick={() => router.push("/receipts/new")}>
          <Plus className="h-5 w-5" />
        </Button>
      </header>

      <section className="grid gap-3 rounded-lg border bg-card p-4 shadow-sm md:grid-cols-[1fr_220px]">
        <div className="grid gap-2">
          <Label>ค้นหา</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            <Input className="pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ร้านค้า หรือชื่อสินค้า" />
          </div>
        </div>
        <div className="grid gap-2">
          <Label>หมวดหมู่</Label>
          <Select value={category} onValueChange={(value) => setCategory(value as ReceiptCategory | "All")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              {CATEGORIES.map((itemCategory) => (
                <SelectItem key={itemCategory} value={itemCategory}>
                  {itemCategory}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={() => router.push("/settings/categories")}>
          <Settings className="h-4 w-4" />
          กฎหมวดหมู่
        </Button>
        <Button variant="outline" className="flex-1" onClick={() => router.push("/export")}>
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>

      {filtered.length === 0 ? (
        <section className="rounded-lg border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
          ยังไม่มีใบเสร็จที่ตรงกับเงื่อนไข
        </section>
      ) : (
        <section className="grid gap-3">
          {filtered.map((receipt) => (
            <article key={receipt.id} className="rounded-lg border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-bold">{receipt.storeName || "ไม่ทราบร้านค้า"}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {receipt.purchaseDate || "ไม่ทราบวันที่"} · {yen(receipt.total)} · {receipt.items.length} รายการ
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" title="View details" onClick={() => setSelectedId(selectedId === receipt.id ? null : receipt.id)}>
                    <Eye className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon" title="Delete receipt" onClick={() => void removeReceipt(receipt.id)}>
                    <Trash2 className="h-5 w-5 text-destructive" />
                  </Button>
                </div>
              </div>

              {selectedId === receipt.id ? (
                <div className="mt-4 grid gap-3 border-t pt-4">
                  <div className="overflow-hidden rounded-md border bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={receipt.imageDataUrl} alt="Receipt" className="max-h-96 w-full object-contain" />
                  </div>
                  <div className="grid gap-2">
                    {receipt.items.map((item) => (
                      <div key={item.id} className="rounded-md border bg-background p-3 text-sm">
                        <div className="flex justify-between gap-3">
                          <strong>{item.displayName || item.rawName}</strong>
                          <span>{yen(item.totalPrice)}</span>
                        </div>
                        <p className="mt-1 text-muted-foreground">
                          {item.category} · {item.quantity} ชิ้น · {item.isResaleItem ? "รีเซล" : "ส่วนตัว"}
                        </p>
                        {item.memo ? <p className="mt-1 text-muted-foreground">{item.memo}</p> : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
