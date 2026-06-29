import type { ExpenseFormState } from "@/components/expenses/new/types";

type ExchangeRateApiRouteResponse =
  | {
      success: true;
      rate: number;
      source: "manual" | "api";
      effectiveDate: string;
    }
  | {
      success: false;
      error: string;
    };

function hasManualRate(form: ExpenseFormState) {
  return Number.isFinite(form.exchangeRate) && form.exchangeRate > 0;
}

export async function resolveExpenseFormExchangeRate(form: ExpenseFormState) {
  const effectiveDate = form.receiptDate || new Date().toISOString().slice(0, 10);

  if (form.originalCurrency === form.baseCurrency) {
    return {
      ...form,
      exchangeRate: 1,
      exchangeRateSource: "manual" as const,
      exchangeRateDate: effectiveDate
    };
  }

  const response = await fetch("/api/exchange-rate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: form.originalCurrency,
      to: form.baseCurrency,
      date: effectiveDate
    })
  });

  const result = (await response.json()) as ExchangeRateApiRouteResponse;
  if (response.ok && result.success) {
    return {
      ...form,
      exchangeRate: result.rate,
      exchangeRateSource: result.source,
      exchangeRateDate: result.effectiveDate
    };
  }

  if (hasManualRate(form)) {
    return {
      ...form,
      exchangeRateSource: "manual" as const,
      exchangeRateDate: form.exchangeRateDate || effectiveDate
    };
  }

  throw new Error(result.success ? "ไม่สามารถดึงอัตราแลกเปลี่ยนได้" : result.error);
}
