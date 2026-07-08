"use client";

import type { Expense, ExpenseCurrency } from "@/lib/expenseTypes";

export type DisplayCurrency = ExpenseCurrency;
export type CurrencyDisplayMode = "auto" | ExpenseCurrency;

const currencySymbols: Record<DisplayCurrency, string> = {
  THB: "฿",
  JPY: "¥"
};

const currencyFractionDigits: Record<DisplayCurrency, number> = {
  THB: 2,
  JPY: 0
};

export function safeDisplayCurrency(value: unknown, fallback: DisplayCurrency = "JPY") {
  return value === "THB" || value === "JPY" ? value : fallback;
}

export function inferDisplayCurrency(expenses: Expense[], fallback: DisplayCurrency = "JPY") {
  const counts = new Map<DisplayCurrency, number>();

  for (const expense of expenses) {
    const currency = safeDisplayCurrency(expense.originalCurrency ?? expense.currency, fallback);
    counts.set(currency, (counts.get(currency) ?? 0) + 1);
  }

  const thbCount = counts.get("THB") ?? 0;
  const jpyCount = counts.get("JPY") ?? 0;
  if (thbCount === 0 && jpyCount === 0) return fallback;
  if (thbCount === jpyCount) return fallback;
  return thbCount > jpyCount ? "THB" : "JPY";
}

export function resolveDisplayCurrency(
  expenses: Expense[],
  mode: CurrencyDisplayMode,
  fallback: DisplayCurrency = "JPY"
) {
  return mode === "auto" ? inferDisplayCurrency(expenses, fallback) : mode;
}

export function cycleDisplayCurrencyMode(mode: CurrencyDisplayMode): CurrencyDisplayMode {
  if (mode === "auto") return "THB";
  if (mode === "THB") return "JPY";
  return "auto";
}

export function displayCurrencyLabel(mode: CurrencyDisplayMode, resolvedCurrency: DisplayCurrency) {
  if (mode === "auto") return "อัตโนมัติ";
  return resolvedCurrency;
}

export function expenseAmountForCurrency(expense: Expense, currency: DisplayCurrency) {
  const originalCurrency = safeDisplayCurrency(expense.originalCurrency ?? expense.currency, currency);
  const baseCurrency = safeDisplayCurrency(expense.baseCurrency ?? expense.currency, currency);
  const exchangeRate = Number.isFinite(expense.exchangeRate ?? NaN) && (expense.exchangeRate ?? 0) > 0 ? (expense.exchangeRate as number) : 0;
  const totalOriginal = Number(expense.totalOriginal ?? expense.total ?? 0);
  const totalBase = Number(
    expense.totalBase ??
      (exchangeRate > 0 ? totalOriginal * exchangeRate : expense.total ?? 0)
  );

  if (currency === originalCurrency) return totalOriginal;
  if (currency === baseCurrency) return totalBase;
  return totalOriginal;
}

export function formatMoney(value: number, currency: DisplayCurrency) {
  const digits = currencyFractionDigits[currency];
  return `${currencySymbols[currency]}${Number(value ?? 0).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  })}`;
}
