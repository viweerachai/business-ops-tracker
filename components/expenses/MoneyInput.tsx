"use client";

import { Input } from "@/components/ui/input";
import type { CurrencyCode } from "@/components/expenses/expenseSummaryUtils";
import { safeNumber } from "@/components/expenses/expenseSummaryUtils";

function formatMoneyInputValue(value: number, currency: CurrencyCode, variant: "default" | "summary") {
  if (variant !== "summary") return String(value ?? 0);
  return (value ?? 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function MoneyInput({
  value,
  currency,
  disabled,
  readOnly,
  variant = "default",
  onChange
}: {
  value: number;
  currency: CurrencyCode;
  disabled?: boolean;
  readOnly?: boolean;
  variant?: "default" | "summary";
  onChange: (value: number) => void;
}) {
  const summaryTone =
    variant === "summary"
      ? disabled || readOnly
        ? "bg-[#F7F7F7] text-slate-600"
        : "bg-white text-[#222222]"
      : "";

  return (
    <div className="relative">
      <Input
        inputMode="decimal"
        value={formatMoneyInputValue(value, currency, variant)}
        disabled={disabled}
        readOnly={readOnly}
        className={[
          "pr-16",
          variant === "summary"
            ? "h-11 w-full rounded-xl border-slate-300 px-4 text-base font-normal shadow-none disabled:cursor-not-allowed disabled:opacity-100"
            : "",
          summaryTone
        ]
          .filter(Boolean)
          .join(" ")}
        onChange={(event) => onChange(safeNumber(event.target.value))}
      />
      <span
        className={[
          "pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 font-medium text-[#8A8A8A]",
          variant === "summary" ? "text-base" : "text-sm"
        ].join(" ")}
      >
        {currency}
      </span>
    </div>
  );
}
