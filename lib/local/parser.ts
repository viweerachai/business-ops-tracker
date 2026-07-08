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
const dateTimeZone = "Asia/Tokyo";
const dateContextPatterns = [
  /confirmed/i,
  /order/i,
  /purchase/i,
  /receipt date/i,
  /date/i,
  /ご注文日/,
  /注文日/,
  /購入日/,
  /発行日/,
  /納品日/,
  /商品出荷日/,
  /取引日/,
  /会計日/,
  /決済日/
];
const shippingDatePatterns = [/shipping/i, /delivery/i, /発送/, /出荷/, /以降発送/];
const englishMonthPattern =
  /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+(\d{1,2})(?:,?\s*(20\d{2}|\d{2}))?\b/i;

function normalizeLine(line: string) {
  return line.replace(/\s+/g, " ").trim();
}

function hasDateContext(line: string, nearbyLines: string[] = []) {
  const haystack = [line, ...nearbyLines].join(" ").trim();
  return dateContextPatterns.some((pattern) => pattern.test(haystack));
}

function hasShippingContext(line: string, nearbyLines: string[] = []) {
  const haystack = [line, ...nearbyLines].join(" ").trim();
  return shippingDatePatterns.some((pattern) => pattern.test(haystack));
}

function todayDateString(referenceDate = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: dateTimeZone
  }).format(referenceDate);
}

function currentYear(referenceDate = new Date()) {
  return Number(todayDateString(referenceDate).slice(0, 4));
}

function normalizeYear(year: string) {
  if (year.length === 4) return year;
  return Number(year) >= 70 ? `19${year}` : `20${year}`;
}

function normalizeDateParts(year: string, month: string, day: string) {
  return `${normalizeYear(year)}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function isValidDateParts(year: number, month: number, day: number) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function withCurrentYear(month: number, day: number, referenceDate = new Date()) {
  const year = currentYear(referenceDate);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (candidate > referenceDate) {
    candidate.setUTCFullYear(candidate.getUTCFullYear() - 1);
  }
  return candidate.toISOString().slice(0, 10);
}

function monthNameToNumber(month: string) {
  const lower = month.toLowerCase();
  if (lower.startsWith("jan")) return 1;
  if (lower.startsWith("feb")) return 2;
  if (lower.startsWith("mar")) return 3;
  if (lower.startsWith("apr")) return 4;
  if (lower === "may") return 5;
  if (lower.startsWith("jun")) return 6;
  if (lower.startsWith("jul")) return 7;
  if (lower.startsWith("aug")) return 8;
  if (lower.startsWith("sep")) return 9;
  if (lower.startsWith("oct")) return 10;
  if (lower.startsWith("nov")) return 11;
  if (lower.startsWith("dec")) return 12;
  return null;
}

function parseEnglishMonthDate(value: string, referenceDate = new Date()) {
  const match = value.match(englishMonthPattern);
  if (!match) return null;
  const month = monthNameToNumber(match[1]);
  const day = Number(match[2]);
  if (!month || !Number.isFinite(day)) return null;
  const year = match[3] ? normalizeYear(match[3]) : null;
  if (year) {
    const parsedYear = Number(year);
    if (!isValidDateParts(parsedYear, month, day)) return null;
    return normalizeDateParts(year, String(month), String(day));
  }
  return withCurrentYear(month, day, referenceDate);
}

function parseNumericMonthDay(value: string, referenceDate = new Date()) {
  const match = value.match(/(?:^|[^\d])(\d{1,2})[\/.-](\d{1,2})(?:$|[^\d])/);
  if (!match) return null;
  const first = Number(match[1]);
  const second = Number(match[2]);
  if (!Number.isFinite(first) || !Number.isFinite(second)) return null;
  if (first > 12 && second <= 12) {
    if (!isValidDateParts(currentYear(referenceDate), second, first)) return null;
    return withCurrentYear(second, first, referenceDate);
  }
  if (second > 12 && first <= 12) {
    if (!isValidDateParts(currentYear(referenceDate), first, second)) return null;
    return withCurrentYear(first, second, referenceDate);
  }
  return null;
}

export function normalizePurchaseDateValue(
  value: string | null | undefined,
  referenceDate = new Date()
) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return null;

  const exact = text.match(/^(20\d{2})[\/.-](\d{1,2})[\/.-](\d{1,2})$/);
  if (exact) return normalizeDateParts(exact[1], exact[2], exact[3]);

  const japanese = text.match(/^(?:(20)?(\d{2}))年\s*(\d{1,2})月\s*(\d{1,2})日$/);
  if (japanese) {
    const year = japanese[1] ? `${japanese[1]}${japanese[2]}` : `20${japanese[2]}`;
    return normalizeDateParts(year, japanese[3], japanese[4]);
  }

  const englishMonth = parseEnglishMonthDate(text, referenceDate);
  if (englishMonth) return englishMonth;

  const partialNumeric = text.match(/^(\d{1,2})[\/.-](\d{1,2})$/);
  if (partialNumeric) {
    const first = Number(partialNumeric[1]);
    const second = Number(partialNumeric[2]);
    if (first > 12 || second > 12) {
      return parseNumericMonthDay(text, referenceDate);
    }
  }

  const partialJapanese = text.match(/^(\d{1,2})月\s*(\d{1,2})日$/);
  if (partialJapanese) {
    return withCurrentYear(Number(partialJapanese[1]), Number(partialJapanese[2]), referenceDate);
  }

  return null;
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

function extractDate(lines: string[], referenceDate = new Date()) {
  for (const [index, line] of lines.entries()) {
    const previous = lines[index - 1] ?? "";
    const next = lines[index + 1] ?? "";
    const nearby = [previous, next].filter(Boolean);

    const exact = line.match(/^(20\d{2})[\/.-](\d{1,2})[\/.-](\d{1,2})$/) || line.match(/^(?:(20)?(\d{2}))年\s*(\d{1,2})月\s*(\d{1,2})日$/);
    if (exact) {
      const value =
        exact.length === 4
          ? normalizeDateParts(exact[1], exact[2], exact[3])
          : normalizeDateParts(exact[1] ? `${exact[1]}${exact[2]}` : `20${exact[2]}`, exact[3], exact[4]);
      return { value, source: "exact" as const };
    }

    const englishMonth = parseEnglishMonthDate(line, referenceDate);
    if (englishMonth) {
      return {
        value: englishMonth,
        source: line.match(/\b20\d{2}\b/) ? ("exact" as const) : ("filled-year" as const)
      };
    }

    if (hasShippingContext(line, nearby)) continue;

    const numeric = line.match(/(?:^|[^\d])(\d{1,2})[\/.-](\d{1,2})(?:$|[^\d])/);
    if (numeric) {
      const first = Number(numeric[1]);
      const second = Number(numeric[2]);
      if (first > 12 || second > 12) {
        const value = parseNumericMonthDay(line, referenceDate);
        if (value) {
          return { value, source: "filled-year" as const };
        }
      }

      if (hasDateContext(line, nearby)) {
        continue;
      }
    }

    const partialJapanese = line.match(/(?:^|[^\d])(\d{1,2})月\s*(\d{1,2})日/);
    if (partialJapanese) {
      return {
        value: withCurrentYear(Number(partialJapanese[1]), Number(partialJapanese[2]), referenceDate),
        source: "filled-year" as const
      };
    }
  }

  return { value: null, source: "missing" as const };
}

export function extractPurchaseDateFromOcrText(ocrText: string): string | null {
  const lines = ocrText
    .split(/\r?\n/)
    .map(normalizeLine)
    .filter(Boolean);
  return extractDate(lines).value;
}

export function resolvePurchaseDate(
  ocrText: string,
  candidateDate?: string | null
): { value: string | null; source: "exact" | "filled-year" | "today-fallback" } {
  const lines = ocrText
    .split(/\r?\n/)
    .map(normalizeLine)
    .filter(Boolean);
  const ocrDate = extractDate(lines);
  if (ocrDate.value) {
    return {
      value: ocrDate.value,
      source: ocrDate.source === "filled-year" ? "filled-year" : "exact"
    };
  }
  const normalizedCandidate = normalizePurchaseDateValue(candidateDate);
  if (normalizedCandidate) return { value: normalizedCandidate, source: "exact" };
  return { value: null, source: "today-fallback" };
}

function extractStoreName(lines: string[]) {
  const candidate = lines
    .slice(0, 6)
    .find((line) => line.length > 1 && !yenFromText(line) && !extractDate([line]).value && !hasIgnoredLabel(line));
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
    purchaseDate: extractDate(lines).value,
    subtotal: extractReceiptNumber(lines, ["小計"]),
    tax: extractReceiptNumber(lines, ["消費税", "税"]),
    total: extractReceiptNumber(lines, ["合計", "税込合計", "総合計"]),
    aiMemo: "",
    ocrLanguage,
    ocrText,
    items
  };
}
