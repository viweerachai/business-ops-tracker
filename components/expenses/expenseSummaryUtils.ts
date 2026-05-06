import type { ExpenseFormState, ExpenseItemState } from "@/components/expenses/new/types";

export const CURRENCY_CODES = ["THB", "JPY", "USD", "EUR"] as const;
export type CurrencyCode = (typeof CURRENCY_CODES)[number];

export type ExpenseSummaryAmounts = {
  subtotalOriginal: number;
  vatOriginal: number;
  whtOriginal: number;
  totalOriginal: number;
  subtotalBase: number;
  vatBase: number;
  whtBase: number;
  totalBase: number;
  exchangeRate: number;
};

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return CURRENCY_CODES.includes(value as CurrencyCode);
}

export function safeNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function itemTotal(items: ExpenseItemState[]) {
  return items.reduce((sum, item) => sum + safeNumber(item.totalPrice), 0);
}

export function normalizedExchangeRate(form: Pick<ExpenseFormState, "originalCurrency" | "baseCurrency" | "exchangeRate">) {
  if (form.originalCurrency === form.baseCurrency) return 1;
  const rate = safeNumber(form.exchangeRate);
  return rate > 0 ? rate : 1;
}

export function calculateExpenseSummaryAmounts(
  form: ExpenseFormState,
  items: ExpenseItemState[]
): ExpenseSummaryAmounts {
  const exchangeRate = normalizedExchangeRate(form);
  const itemsTotal = itemTotal(items);
  const subtotalOriginal = form.manualAmountOverride ? safeNumber(form.subtotalOriginal) : itemsTotal;
  const vatOriginal = form.manualAmountOverride ? safeNumber(form.vatOriginal) : 0;
  const whtOriginal = form.manualAmountOverride ? safeNumber(form.whtOriginal) : 0;
  const totalOriginal = form.manualAmountOverride ? safeNumber(form.totalOriginal) : itemsTotal;

  return {
    subtotalOriginal,
    vatOriginal,
    whtOriginal,
    totalOriginal,
    subtotalBase: subtotalOriginal * exchangeRate,
    vatBase: vatOriginal * exchangeRate,
    whtBase: whtOriginal * exchangeRate,
    totalBase: totalOriginal * exchangeRate,
    exchangeRate
  };
}

export function patchSummaryAmounts(
  form: ExpenseFormState,
  items: ExpenseItemState[]
): Pick<
  ExpenseFormState,
  | "subtotal"
  | "tax"
  | "withholdingTax"
  | "amount"
  | "currency"
  | "exchangeRate"
  | "exchangeRateSource"
  | "subtotalOriginal"
  | "vatOriginal"
  | "whtOriginal"
  | "totalOriginal"
  | "subtotalBase"
  | "vatBase"
  | "whtBase"
  | "totalBase"
> {
  const amounts = calculateExpenseSummaryAmounts(form, items);
  return {
    subtotal: amounts.subtotalOriginal,
    tax: amounts.vatOriginal,
    withholdingTax: amounts.whtOriginal,
    amount: amounts.totalOriginal,
    currency: form.originalCurrency,
    exchangeRate: amounts.exchangeRate,
    exchangeRateSource: "manual",
    subtotalOriginal: amounts.subtotalOriginal,
    vatOriginal: amounts.vatOriginal,
    whtOriginal: amounts.whtOriginal,
    totalOriginal: amounts.totalOriginal,
    subtotalBase: amounts.subtotalBase,
    vatBase: amounts.vatBase,
    whtBase: amounts.whtBase,
    totalBase: amounts.totalBase
  };
}
