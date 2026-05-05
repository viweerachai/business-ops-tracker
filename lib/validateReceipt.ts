import {
  CATEGORIES,
  type OcrLanguage,
  type ReceiptCategory
} from "@/lib/types/receipt";
import type { GeminiReceiptExtraction, GeminiReceiptItem } from "@/lib/receiptSchema";

const blockedLinePatterns = [
  /\b\d{2,4}-\d{2,4}-\d{3,4}\b/,
  /\b0\d{1,4}-\d{1,4}-\d{3,4}\b/,
  /\b20\d{2}[/-]\d{1,2}[/-]\d{1,2}\b/,
  /\b\d{1,2}:\d{2}\b/,
  /ポイント|point|POINT|残高|利用ポイント|獲得ポイント/i,
  /消費税|税率|税込|税抜|内税|対象計/,
  /小計|合計|総合計|お預り|お釣り|現金|クレジット|カード支払|電子マネー|支払/,
  /領収書|レシート|レジ|店No|伝票|取引|登録番号|インボイス/i
];

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function nullableText(value: unknown) {
  const stringValue = text(value);
  return stringValue ? stringValue : null;
}

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function numberOrDefault(value: unknown, fallback: number) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function categoryOrOther(value: unknown): ReceiptCategory {
  return CATEGORIES.includes(value as ReceiptCategory)
    ? (value as ReceiptCategory)
    : "Other";
}

function shouldBeResaleItem(category: ReceiptCategory) {
  return [
    "Trading Card",
    "Figure",
    "Ichiban Kuji",
    "Book",
    "Toy",
    "Game",
    "Monchhichi"
  ].includes(category);
}

function hasBlockedLineText(value: string) {
  return blockedLinePatterns.some((pattern) => pattern.test(value));
}

function normalizeMemo(existingMemo: string, nextMemo: string) {
  const parts = [existingMemo, nextMemo].map((part) => part.trim()).filter(Boolean);
  return Array.from(new Set(parts)).join(" / ");
}

export function parseGeminiJson(rawText: string) {
  try {
    return {
      ok: true as const,
      value: JSON.parse(rawText) as unknown
    };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Invalid JSON"
    };
  }
}

export function validateReceiptExtraction(
  value: unknown,
  options?: { ocrLanguage?: OcrLanguage }
): GeminiReceiptExtraction {
  void options;
  const source = asRecord(value);
  const total = numberOrNull(source.total);
  const rawItems = Array.isArray(source.items) ? source.items : [];

  const items = rawItems
    .map((rawItem): GeminiReceiptItem | null => {
      const item = asRecord(rawItem);
      const rawName = text(item.rawName);
      if (!rawName || hasBlockedLineText(rawName)) return null;

      const category = categoryOrOther(item.category);
      const quantity = Math.max(numberOrDefault(item.quantity, 1), 1);
      const totalPrice = Math.max(numberOrDefault(item.totalPrice, 0), 0);
      const unitPrice = Math.max(numberOrDefault(item.unitPrice, totalPrice), 0);
      let memo = text(item.memo);

      if (totalPrice <= 0 || totalPrice > 1_000_000) {
        memo = normalizeMemo(memo, "要確認");
      }

      if (typeof total === "number" && totalPrice > total) {
        memo = normalizeMemo(memo, "要確認");
      }

      const unsure = category === "Other";
      if (unsure) memo = normalizeMemo(memo, "要確認");

      return {
        rawName,
        displayName: text(item.displayName) || rawName,
        category,
        quantity,
        unitPrice,
        totalPrice,
        isResaleItem:
          category === "Food"
            ? false
            : typeof item.isResaleItem === "boolean"
              ? item.isResaleItem
              : shouldBeResaleItem(category) || unsure,
        memo
      };
    })
    .filter((item): item is GeminiReceiptItem => item !== null);

  let aiMemo = text(source.aiMemo);
  const itemSum = items.reduce((sum, item) => sum + item.totalPrice, 0);
  if (typeof total === "number" && items.length > 0 && Math.abs(itemSum - total) > 2) {
    aiMemo = normalizeMemo(aiMemo, "合計金額要確認");
  }

  return {
    storeName: nullableText(source.storeName),
    purchaseDate: nullableText(source.purchaseDate),
    subtotal: numberOrNull(source.subtotal),
    tax: numberOrNull(source.tax),
    total,
    items,
    aiMemo
  };
}
