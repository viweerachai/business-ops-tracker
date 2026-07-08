"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, RefreshCw, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/expenses/MoneyInput";
import type { ExpenseFormState, ExpenseItemState } from "@/components/expenses/new/types";
import { resolveExpenseFormExchangeRate } from "@/lib/exchange-rate-client";
import {
  CURRENCY_CODES,
  calculateExpenseSummaryAmounts,
  itemTotal,
  patchSummaryAmounts,
  safeNumber,
  type CurrencyCode
} from "@/components/expenses/expenseSummaryUtils";
import { ArrowLeftRight } from "lucide-react";

function CompactField({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label className="text-sm font-bold text-slate-700">{label}</Label>
      {children}
    </div>
  );
}

function AmountBox({
  label,
  value,
  currency,
  disabled,
  readOnly,
  onChange
}: {
  label: string;
  value: number;
  currency: CurrencyCode;
  disabled: boolean;
  readOnly?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <div className="grid grid-rows-[40px_auto] gap-2">
      <Label className="flex items-end text-sm font-bold leading-5 text-slate-800">
        {label}
      </Label>
      <MoneyInput
        value={value}
        currency={currency}
        disabled={disabled}
        readOnly={readOnly}
        variant="summary"
        onChange={onChange}
      />
    </div>
  );
}

const amountRows = [
  {
    key: "total",
    label: "ยอดชำระ",
    originalKey: "totalOriginal" as const,
    baseKey: "totalBase" as const
  },
  {
    key: "subtotal",
    label: "ยอดรวมก่อนภาษี",
    originalKey: "subtotalOriginal" as const,
    baseKey: "subtotalBase" as const
  },
  {
    key: "vat",
    label: "ภาษีมูลค่าเพิ่ม (VAT)",
    originalKey: "vatOriginal" as const,
    baseKey: "vatBase" as const
  },
  {
    key: "wht",
    label: "ภาษีหัก ณ ที่จ่าย (WHT)",
    originalKey: "whtOriginal" as const,
    baseKey: "whtBase" as const
  }
] as const;

function AmountRow({
  amounts,
  currency,
  disabled,
  readOnly,
  valueKey,
  onAmountChange
}: {
  amounts: ReturnType<typeof calculateExpenseSummaryAmounts>;
  currency: CurrencyCode;
  disabled: boolean;
  readOnly?: boolean;
  valueKey: "original" | "base";
  onAmountChange: (key: (typeof amountRows)[number]["originalKey"], value: number) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-4">
      {amountRows.map((row) => {
        const value = valueKey === "original" ? amounts[row.originalKey] : amounts[row.baseKey];
        return (
          <AmountBox
            key={`${valueKey}-${row.key}`}
            label={row.label}
            value={value}
            currency={currency}
            disabled={disabled}
            readOnly={readOnly}
            onChange={(nextValue) => onAmountChange(row.originalKey, nextValue)}
          />
        );
      })}
    </div>
  );
}

function convertAmount(value: number, fromCurrency: CurrencyCode, toCurrency: CurrencyCode, rate: number) {
  if (fromCurrency === toCurrency) return value;
  if (rate <= 0) return value;
  if (fromCurrency === "JPY" && toCurrency === "THB") return value * rate;
  if (fromCurrency === "THB" && toCurrency === "JPY") return value / rate;
  return value;
}

export function ExpenseSummarySection({
  form,
  items,
  onChange,
  mobileLayout = "paired"
}: {
  form: ExpenseFormState;
  items: ExpenseItemState[];
  onChange: (form: ExpenseFormState) => void;
  mobileLayout?: "paired" | "switch";
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [refreshingRate, setRefreshingRate] = useState(false);
  const [mobileDisplayCurrency, setMobileDisplayCurrency] = useState<CurrencyCode>(form.originalCurrency);
  const amounts = calculateExpenseSummaryAmounts(form, items);
  const itemsTotal = itemTotal(items);
  const hasCurrencyConversion = form.originalCurrency !== form.baseCurrency;
  const mismatch = form.manualAmountOverride && Math.abs(itemsTotal - amounts.totalOriginal) > 0.01;
  const moneyDisabled = !form.manualAmountOverride;

  useEffect(() => {
    setMobileDisplayCurrency(form.originalCurrency);
  }, [form.originalCurrency, form.baseCurrency, form.exchangeRate]);

  function update(patch: Partial<ExpenseFormState>) {
    const nextForm = { ...form, ...patch };
    if (nextForm.originalCurrency === nextForm.baseCurrency) {
      nextForm.exchangeRate = 1;
    }
    onChange({
      ...nextForm,
      ...patchSummaryAmounts(nextForm, items)
    });
  }

  function updateMobileAmount(key: (typeof amountRows)[number]["originalKey"], value: number) {
    const nextValue =
      mobileDisplayCurrency === form.originalCurrency
        ? value
        : convertAmount(value, mobileDisplayCurrency, form.originalCurrency, form.exchangeRate);
    update({ [key]: nextValue } as Partial<ExpenseFormState>);
  }

  function displayAmount(valueOriginal: number) {
    return mobileDisplayCurrency === form.originalCurrency
      ? valueOriginal
      : convertAmount(valueOriginal, form.originalCurrency, mobileDisplayCurrency, form.exchangeRate);
  }

  async function refreshExchangeRate() {
    if (!hasCurrencyConversion || refreshingRate) return;
    try {
      console.log("[expense-summary] refresh exchange rate clicked", {
        originalCurrency: form.originalCurrency,
        baseCurrency: form.baseCurrency,
        receiptDate: form.receiptDate,
        exchangeRate: form.exchangeRate
      });
      setRefreshingRate(true);
      const resolved = await resolveExpenseFormExchangeRate({
        ...form,
        receiptDate: form.receiptDate || new Date().toISOString().slice(0, 10)
      });
      console.log("[expense-summary] refresh exchange rate resolved", {
        exchangeRate: resolved.exchangeRate,
        exchangeRateSource: resolved.exchangeRateSource,
        exchangeRateDate: resolved.exchangeRateDate
      });
      onChange({
        ...resolved,
        ...patchSummaryAmounts(resolved, items)
      });
      console.log("[expense-summary] form updated after refresh");
    } finally {
      setRefreshingRate(false);
    }
  }

  return (
    <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
      <CardContent className="grid gap-5 p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-lg font-black tracking-normal text-slate-950">
            สรุปรวมค่าใช้จ่าย
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
              <SheetTrigger>
                <Button type="button" variant="outline" className="h-10 rounded-xl bg-white px-3 text-sm text-slate-700">
                  <Settings2 className="h-4 w-4" />
                  ตั้งค่า
                </Button>
              </SheetTrigger>
              <SheetContent className="sm:max-w-3xl">
                <SheetHeader>
                  <div>
                    <SheetTitle>ตั้งค่าสกุลเงินและอัตราแลกเปลี่ยน</SheetTitle>
                    <SheetDescription>
                      ตั้งค่าสกุลเงินในใบเสร็จ สกุลเงินหลัก และตรวจยอดเทียบเท่า
                    </SheetDescription>
                  </div>
                </SheetHeader>
                <div className="grid gap-6 overflow-y-auto p-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <CompactField label="สกุลเงินในใบเสร็จ">
                      <Select value={form.originalCurrency} onValueChange={(value) => update({ originalCurrency: value as CurrencyCode })}>
                        <SelectTrigger className="h-12 rounded-xl bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CURRENCY_CODES.map((currency) => (
                            <SelectItem key={currency} value={currency}>
                              {currency}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </CompactField>
                    <CompactField label="สกุลเงินหลัก">
                      <Select value={form.baseCurrency} onValueChange={(value) => update({ baseCurrency: value as CurrencyCode })}>
                        <SelectTrigger className="h-12 rounded-xl bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CURRENCY_CODES.map((currency) => (
                            <SelectItem key={currency} value={currency}>
                              {currency}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </CompactField>
                  </div>

                  {hasCurrencyConversion ? (
                    <>
                      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-slate-50 p-4">
                        <span className="text-sm font-semibold text-slate-700">1 {form.originalCurrency} =</span>
                        <Input
                          type="number"
                          step="any"
                          inputMode="decimal"
                          value={String(form.exchangeRate)}
                          className="h-11 w-32 rounded-xl bg-white text-base font-medium"
                          onChange={(event) => update({ exchangeRate: safeNumber(event.target.value), exchangeRateSource: "manual" })}
                        />
                        <span className="text-sm font-semibold text-slate-700">{form.baseCurrency}</span>
                      </div>

                      <div className="border-t border-dashed border-[#E5E5E5]" />

                      <div className="grid gap-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <h3 className="text-[19px] font-bold tracking-normal text-[#222222] md:text-[21px]">
                            ยอดเทียบเท่า {form.baseCurrency} (ตามอัตราปัจจุบัน)
                          </h3>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={refreshExchangeRate}
                            disabled={refreshingRate}
                          className="h-11 rounded-xl border-blue-500/30 bg-blue-50 px-4 text-sm font-bold text-blue-700 hover:bg-blue-100"
                        >
                            {refreshingRate ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                            อัปเดตเรทตามวันที่ซื้อ
                          </Button>
                        </div>
                        <AmountRow
                          amounts={amounts}
                          currency={form.baseCurrency}
                          disabled={false}
                          readOnly
                          valueKey="base"
                          onAmountChange={() => undefined}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-600">
                      สกุลเงินในใบเสร็จและสกุลเงินหลักเหมือนกัน จึงไม่ต้องแปลงค่าเงิน
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500">
              <Switch
                className="shrink-0"
                checked={form.manualAmountOverride}
                onCheckedChange={(checked) => update({ manualAmountOverride: checked })}
              />
              <span className="leading-6">แก้ไขยอดรวมด้วยตนเอง</span>
            </label>
          </div>
        </div>

        {mobileLayout === "switch" ? (
          <div className="grid gap-4 md:hidden">
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-slate-500">สกุลเงินสำหรับแก้ไขบนมือถือ</p>
                <p className="mt-1 text-[15px] font-black text-slate-900">
                  {mobileDisplayCurrency}
                  {hasCurrencyConversion ? (
                    <span className="ml-2 text-[12px] font-semibold text-slate-500">
                      / {mobileDisplayCurrency === form.originalCurrency ? form.baseCurrency : form.originalCurrency}
                    </span>
                  ) : null}
                </p>
              </div>
              {hasCurrencyConversion ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-xl bg-white px-3 text-sm font-semibold text-slate-700"
                  onClick={() =>
                    setMobileDisplayCurrency((current) =>
                      current === form.originalCurrency ? form.baseCurrency : form.originalCurrency
                    )
                  }
                  disabled={form.exchangeRate <= 0}
                >
                  <ArrowLeftRight className="h-4 w-4" />
                  สลับ
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}

        {mismatch ? (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>ยอดรวมสินค้าไม่ตรงกับยอดชำระ</span>
          </div>
        ) : null}

        {mobileLayout === "switch" ? (
          <div className="grid gap-4 md:hidden">
            {amountRows.map((row) => (
              <AmountBox
                key={`mobile-${row.key}`}
                label={row.label}
                value={displayAmount(amounts[row.originalKey])}
                currency={mobileDisplayCurrency}
                disabled={moneyDisabled}
                readOnly={moneyDisabled}
                onChange={(nextValue) => updateMobileAmount(row.originalKey, nextValue)}
              />
            ))}
          </div>
        ) : (
          <AmountRow
            amounts={amounts}
            currency={form.originalCurrency}
            disabled={moneyDisabled}
            valueKey="original"
            onAmountChange={(key, value) => update({ [key]: value })}
          />
        )}

        {hasCurrencyConversion ? (
          <>
            {mobileLayout === "switch" ? null : (
              <>
                <div className="border-t border-dashed border-[#E5E5E5]" />

                <div className="grid gap-4">
                  <h3 className="text-lg font-black tracking-normal text-slate-950">
                    ยอดเทียบเท่า {form.baseCurrency} (ตามอัตราปัจจุบัน)
                  </h3>
                  <AmountRow
                    amounts={amounts}
                    currency={form.baseCurrency}
                    disabled={false}
                    readOnly
                    valueKey="base"
                    onAmountChange={() => undefined}
                  />
                </div>
              </>
            )}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
