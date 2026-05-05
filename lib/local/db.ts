"use client";

import Dexie, { type Table } from "dexie";
import { createDefaultCategoryRules } from "@/lib/local/category-rules";
import type { CategoryRule, Receipt, ReceiptItem } from "@/lib/types/receipt";

class ReceiptReaderDb extends Dexie {
  receipts!: Table<Receipt, string>;
  items!: Table<ReceiptItem, string>;
  categoryRules!: Table<CategoryRule, number>;

  constructor() {
    super("japanResellerReceiptReader");
    this.version(1).stores({
      receipts: "id, storeName, purchaseDate, total, status, createdAt, updatedAt",
      items: "id, receiptId, category, rawName, displayName, isResaleItem, createdAt",
      categoryRules: "++id, category, keyword, language"
    });
  }
}

export const localDb = new ReceiptReaderDb();

export async function ensureDefaultCategoryRules() {
  const count = await localDb.categoryRules.count();
  if (count === 0) {
    await localDb.categoryRules.bulkAdd(createDefaultCategoryRules());
  }
}

export async function saveReceiptWithItems(
  receipt: Receipt,
  items: ReceiptItem[]
) {
  await localDb.transaction("rw", localDb.receipts, localDb.items, async () => {
    await localDb.receipts.put(receipt);
    await localDb.items.where("receiptId").equals(receipt.id).delete();
    if (items.length > 0) {
      await localDb.items.bulkPut(items);
    }
  });
}

export async function deleteReceipt(receiptId: string) {
  await localDb.transaction("rw", localDb.receipts, localDb.items, async () => {
    await localDb.items.where("receiptId").equals(receiptId).delete();
    await localDb.receipts.delete(receiptId);
  });
}
