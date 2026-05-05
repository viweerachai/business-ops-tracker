import { shouldBeResaleItem } from "@/lib/local/category-rules";
import type {
  CategoryRule,
  OcrLanguage,
  ReceiptCategory,
  ReceiptDraft
} from "@/lib/types/receipt";
import { createId } from "@/lib/utils";

const ignoredLabels = [
  "合計",
  "小計",
  "税込",
  "税率",
  "お預り",
  "お釣り",
  "クレジット",
  "現金",
  "レジ",
  "領収書",
  "消費税",
  "対象計",
  "割引",
  "釣銭"
];

const pricePattern = /(?:[¥￥]\s*)?(\d{1,3}(?:,\d{3})+|\d+)\s*円?/g;

function normalizeLine(line: string) {
  return line.replace(/\s+/g, " ").trim();
}

function yenFromText(text: string): number | null {
  const matches = [...text.matchAll(pricePattern)]
    .map((match) => Number(match[1].replaceAll(",", "")))
    .filter((value) => Number.isFinite(value));
  if (matches.length === 0) return null;
  return matches[matches.length - 1];
}

function stripPrice(text: string) {
  return normalizeLine(text.replace(pricePattern, "").replace(/[※*＊]/g, ""));
}

function hasIgnoredLabel(line: string) {
  return ignoredLabels.some((label) => line.includes(label));
}

function extractDate(lines: string[]): string | null {
  for (const line of lines) {
    const numeric = line.match(/(20\d{2})[\/.-](\d{1,2})[\/.-](\d{1,2})/);
    if (numeric) {
      return `${numeric[1]}-${numeric[2].padStart(2, "0")}-${numeric[3].padStart(2, "0")}`;
    }

    const japanese = line.match(/(?:(20)?(\d{2}))年\s*(\d{1,2})月\s*(\d{1,2})日/);
    if (japanese) {
      const year = japanese[1] ? `${japanese[1]}${japanese[2]}` : `20${japanese[2]}`;
      return `${year}-${japanese[3].padStart(2, "0")}-${japanese[4].padStart(2, "0")}`;
    }
  }

  return null;
}

function extractStoreName(lines: string[]) {
  const candidate = lines
    .slice(0, 6)
    .find((line) => line.length > 1 && !yenFromText(line) && !extractDate([line]) && !hasIgnoredLabel(line));
  return candidate ?? null;
}

function extractReceiptNumber(lines: string[], labels: string[]) {
  for (const label of labels) {
    const line = lines.find((candidate) => candidate.includes(label));
    if (line) return yenFromText(line);
  }
  return null;
}

function classifyItem(text: string, rules: CategoryRule[]): ReceiptCategory {
  const lowerText = text.toLowerCase();
  const matched = rules.find((rule) => {
    const keyword = rule.keyword.trim();
    return keyword && lowerText.includes(keyword.toLowerCase());
  });

  return matched?.category ?? "Other";
}

function displayNameFromRaw(rawName: string) {
  return normalizeLine(rawName.replace(/[0-9０-９]+\s*(点|個|コ|x|X)$/g, ""));
}

function parseQuantity(line: string) {
  const match = line.match(/(\d+(?:\.\d+)?)\s*(?:点|個|コ|x|X)/);
  if (!match) return 1;
  const quantity = Number(match[1]);
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
}

function buildItem(line: string, previousLine: string | null, rules: CategoryRule[]) {
  const price = yenFromText(line);
  if (price === null) return null;

  let rawName = stripPrice(line);
  if ((!rawName || rawName.length <= 1 || /^\d+$/.test(rawName)) && previousLine) {
    rawName = stripPrice(previousLine);
  }

  rawName = rawName.replace(/(\d+(?:\.\d+)?)\s*(点|個|コ|x|X)/, "").trim();
  if (!rawName || hasIgnoredLabel(rawName)) return null;

  const quantity = parseQuantity(line);
  const category = classifyItem(rawName, rules);
  const totalPrice = price;
  const unitPrice = quantity > 1 ? Math.round(totalPrice / quantity) : totalPrice;
  const unclear = category === "Other";

  return {
    id: createId(),
    rawName,
    displayName: displayNameFromRaw(rawName),
    category,
    quantity,
    unitPrice,
    totalPrice,
    isResaleItem: category === "Food" ? false : shouldBeResaleItem(category),
    memo: unclear ? "要確認" : ""
  };
}

export function parseReceiptText({
  imageDataUrl,
  ocrLanguage,
  ocrText,
  rules
}: {
  imageDataUrl: string;
  ocrLanguage: OcrLanguage;
  ocrText: string;
  rules: CategoryRule[];
}): ReceiptDraft {
  const lines = ocrText
    .split(/\r?\n/)
    .map(normalizeLine)
    .filter(Boolean);

  const items = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (hasIgnoredLabel(line)) continue;
    const item = buildItem(line, lines[index - 1] ?? null, rules);
    if (item) items.push(item);
  }

  return {
    imageDataUrl,
    storeName: extractStoreName(lines),
    purchaseDate: extractDate(lines),
    subtotal: extractReceiptNumber(lines, ["小計"]),
    tax: extractReceiptNumber(lines, ["消費税", "税"]),
    total: extractReceiptNumber(lines, ["合計", "税込合計", "総合計"]),
    aiMemo: "",
    ocrLanguage,
    ocrText,
    items
  };
}
