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
  console.log("[exchange-rate] resolve start", {
    originalCurrency: form.originalCurrency,
    baseCurrency: form.baseCurrency,
    receiptDate: form.receiptDate,
    effectiveDate,
    currentExchangeRate: form.exchangeRate
  });

  if (form.originalCurrency === form.baseCurrency) {
    console.log("[exchange-rate] same currency, forcing rate=1");
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

  console.log("[exchange-rate] api response", {
    ok: response.ok,
    status: response.status
  });

  const result = (await response.json()) as ExchangeRateApiRouteResponse;
  if (response.ok && result.success) {
    console.log("[exchange-rate] resolved rate", result);
    return {
      ...form,
      exchangeRate: result.rate,
      exchangeRateSource: result.source,
      exchangeRateDate: result.effectiveDate
    };
  }

  if (hasManualRate(form)) {
    console.log("[exchange-rate] fallback to manual rate", {
      exchangeRate: form.exchangeRate,
      exchangeRateDate: form.exchangeRateDate || effectiveDate
    });
    return {
      ...form,
      exchangeRateSource: "manual" as const,
      exchangeRateDate: form.exchangeRateDate || effectiveDate
    };
  }

  throw new Error(result.success ? "ไม่สามารถดึงอัตราแลกเปลี่ยนได้" : result.error);
}
