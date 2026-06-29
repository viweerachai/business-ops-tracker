import type { ExpenseCurrency } from "@/lib/expenseTypes";

type FrankfurterRateResponse =
  | {
      date?: string;
      base?: string;
      quote?: string;
      rate?: number;
    }
  | Array<{
      date?: string;
      base?: string;
      quote?: string;
      rate?: number;
    }>;

export type ResolvedExchangeRate = {
  rate: number;
  source: "manual" | "api";
  effectiveDate: string;
};

function normalizeDate(date: string | null | undefined) {
  const trimmed = typeof date === "string" ? date.trim() : "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  return new Date().toISOString().slice(0, 10);
}

function readFrankfurterRate(payload: FrankfurterRateResponse) {
  const item = Array.isArray(payload) ? payload[0] : payload;
  return typeof item?.rate === "number" && Number.isFinite(item.rate) && item.rate > 0 ? item.rate : null;
}

export async function fetchHistoricalExchangeRate({
  from,
  to,
  date
}: {
  from: ExpenseCurrency;
  to: ExpenseCurrency;
  date: string;
}): Promise<ResolvedExchangeRate> {
  const effectiveDate = normalizeDate(date);

  if (from === to) {
    return {
      rate: 1,
      source: "manual",
      effectiveDate
    };
  }

  const params = new URLSearchParams({
    date: effectiveDate
  });

  const response = await fetch(`https://api.frankfurter.dev/v2/rate/${from}/${to}?${params.toString()}`, {
    method: "GET",
    cache: "no-store"
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ดึงอัตราแลกเปลี่ยนไม่สำเร็จ (${response.status}): ${errorText.slice(0, 200)}`);
  }

  const payload = (await response.json()) as FrankfurterRateResponse;
  const rate = readFrankfurterRate(payload);
  if (!rate) {
    throw new Error(`ไม่พบอัตราแลกเปลี่ยน ${from} -> ${to} สำหรับวันที่ ${effectiveDate}`);
  }

  return {
    rate,
    source: "api",
    effectiveDate
  };
}
