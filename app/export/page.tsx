"use client";

import { ChangeEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Database, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { localDb } from "@/lib/local/db";
import { buildReceiptItemsCsv, downloadTextFile } from "@/lib/local/export";
import type { CategoryRule, Receipt, ReceiptItem } from "@/lib/types/receipt";

type Backup = {
  version: 1;
  exportedAt: string;
  receipts: Receipt[];
  items: ReceiptItem[];
  categoryRules: CategoryRule[];
};

function stripRuleId(rule: CategoryRule): Omit<CategoryRule, "id"> {
  return {
    category: rule.category,
    keyword: rule.keyword,
    language: rule.language,
    createdAt: rule.createdAt,
    updatedAt: rule.updatedAt
  };
}

export default function ExportPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function exportCsv() {
    const receipts = await localDb.receipts.toArray();
    const rows = [];
    for (const receipt of receipts) {
      const items = await localDb.items.where("receiptId").equals(receipt.id).toArray();
      if (items.length === 0) rows.push({ receipt, item: null });
      items.forEach((item) => rows.push({ receipt, item }));
    }
    downloadTextFile("receipt-items.csv", buildReceiptItemsCsv(rows), "text/csv;charset=utf-8");
  }

  async function exportJson() {
    const backup: Backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      receipts: await localDb.receipts.toArray(),
      items: await localDb.items.toArray(),
      categoryRules: await localDb.categoryRules.toArray()
    };
    downloadTextFile("receipt-reader-backup.json", JSON.stringify(backup, null, 2), "application/json");
  }

  async function importJson(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const backup = JSON.parse(await file.text()) as Backup;
      if (backup.version !== 1 || !Array.isArray(backup.receipts) || !Array.isArray(backup.items)) {
        throw new Error("Invalid backup");
      }

      await localDb.transaction("rw", localDb.receipts, localDb.items, localDb.categoryRules, async () => {
        for (const receipt of backup.receipts) {
          await localDb.receipts.put(receipt);
          await localDb.items.where("receiptId").equals(receipt.id).delete();
          const items = backup.items.filter((item) => item.receiptId === receipt.id);
          if (items.length > 0) await localDb.items.bulkPut(items);
        }
        if (Array.isArray(backup.categoryRules)) {
          await localDb.categoryRules.clear();
          await localDb.categoryRules.bulkAdd(backup.categoryRules.map(stripRuleId));
        }
      });

      setMessage("Import backup สำเร็จ");
    } catch (error) {
      console.error(error);
      setMessage("Import ไม่สำเร็จ ไฟล์อาจไม่ใช่ backup JSON ของแอปนี้");
    } finally {
      event.target.value = "";
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-4 px-4 py-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-normal">Export / Backup</h1>
          <p className="mt-1 text-sm text-muted-foreground">ย้ายข้อมูลออกจาก IndexedDB เป็น CSV หรือ JSON</p>
        </div>
        <Button variant="ghost" size="icon" title="Back" onClick={() => router.push("/receipts/history")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </header>

      {message ? (
        <div className="rounded-md border bg-card p-3 text-sm font-semibold">{message}</div>
      ) : null}

      <section className="grid gap-3 rounded-lg border bg-card p-4 shadow-sm">
        <Button size="lg" onClick={exportCsv}>
          <Download className="h-5 w-5" />
          Export CSV
        </Button>
        <Button size="lg" variant="secondary" onClick={exportJson}>
          <Database className="h-5 w-5" />
          Export backup JSON
        </Button>
        <input ref={inputRef} className="hidden" type="file" accept="application/json,.json" onChange={importJson} />
        <Button size="lg" variant="outline" onClick={() => inputRef.current?.click()}>
          <Upload className="h-5 w-5" />
          Import backup JSON
        </Button>
      </section>
    </main>
  );
}
