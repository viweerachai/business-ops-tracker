"use client";

import { useEffect, useMemo, useState } from "react";
import { Boxes, Package, Search, Tag } from "lucide-react";
import { CreateBusinessDialog } from "@/components/business/CreateBusinessDialog";
import { BusinessSwitcher } from "@/components/business/BusinessSwitcher";
import { AppSidebar } from "@/components/expenses/AppSidebar";
import { MobileBottomNav } from "@/components/expenses/MobileBottomNav";
import { Skeleton } from "@/components/ui/skeleton";
import { useBusinesses } from "@/hooks/useBusinesses";
import { useProductCatalog } from "@/hooks/useProductCatalog";
import type { ExpenseCurrency, ProductCatalogEntry } from "@/lib/expenseTypes";

const supportedCurrencies: ExpenseCurrency[] = ["JPY", "THB"];
const currencySymbols: Record<ExpenseCurrency, string> = {
  JPY: "JPY",
  THB: "THB"
};
const displayCurrencyOptions = ["JPY", "THB"] as const;

function safeCurrency(currency: ExpenseCurrency | string | null | undefined): ExpenseCurrency {
  return supportedCurrencies.includes(currency as ExpenseCurrency) ? (currency as ExpenseCurrency) : "JPY";
}

function formatMoney(value: number, currency: ExpenseCurrency | string | null | undefined) {
  const normalizedCurrency = safeCurrency(currency);
  return `${currencySymbols[normalizedCurrency]} ${new Intl.NumberFormat("th-TH", {
    maximumFractionDigits: 0
  }).format(value)}`;
}

function totalForCurrency(product: ProductCatalogEntry, currency: "JPY" | "THB") {
  return product.totalsByCurrency[currency] ?? null;
}

function quantityForCurrency(product: ProductCatalogEntry, currency: "JPY" | "THB") {
  return product.quantitiesByCurrency[currency] ?? null;
}

function averageUnitPrice(product: ProductCatalogEntry, currency: "JPY" | "THB") {
  const total = totalForCurrency(product, currency);
  const quantity = quantityForCurrency(product, currency);
  if (total === null || quantity === null || quantity <= 0) return null;
  return total / quantity;
}

function formatDisplayMoney(product: ProductCatalogEntry, currency: "JPY" | "THB") {
  const total = totalForCurrency(product, currency);
  return total === null ? "-" : formatMoney(total, currency);
}

function formatAverageMoney(product: ProductCatalogEntry, currency: "JPY" | "THB") {
  const average = averageUnitPrice(product, currency);
  return average === null ? "-" : formatMoney(average, currency);
}

function getDisplayCurrencies(product: ProductCatalogEntry) {
  return Array.from(new Set(product.availableCurrencies)).filter(
    (currency): currency is "JPY" | "THB" => currency === "JPY" || currency === "THB"
  );
}

function LoadingCards() {
  return (
    <div className="mt-6 grid gap-3">
      {[0, 1, 2].map((item) => (
        <div key={item} className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <Skeleton className="h-6 w-52" />
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  accent = "slate"
}: {
  label: string;
  value: string;
  hint: string;
  accent?: "teal" | "blue" | "slate";
}) {
  const accentMap = {
    teal: "border-l-teal-500 bg-teal-50/40",
    blue: "border-l-blue-500 bg-blue-50/40",
    slate: "border-l-slate-300 bg-slate-50/40"
  };
  return (
    <div className={`rounded-xl border border-slate-200 border-l-4 bg-white p-4 shadow-sm ${accentMap[accent]}`}>
      <p className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-[26px] font-bold leading-none tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-xs font-medium text-slate-400">{hint}</p>
    </div>
  );
}

function ProductCard({ product }: { product: ProductCatalogEntry }) {
  const displayCurrencies = getDisplayCurrencies(product);
  const [currencyView, setCurrencyView] = useState<"JPY" | "THB">(displayCurrencies[0] ?? "JPY");
  const hasActiveCurrency = displayCurrencies.includes(currencyView);

  useEffect(() => {
    if (displayCurrencies.length === 0) return;
    if (!displayCurrencies.includes(currencyView)) {
      setCurrencyView(displayCurrencies[0]);
    }
  }, [currencyView, displayCurrencies]);

  return (
    <div className="group rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Card header */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[17px] font-bold text-slate-950">{product.name}</p>
          {product.rawNames.length > 1 ? (
            <p className="mt-0.5 line-clamp-1 text-[13px] text-slate-400">{product.rawNames.slice(0, 3).join(" · ")}</p>
          ) : null}
        </div>
        <div className="inline-flex shrink-0 rounded-lg border border-slate-200 bg-slate-50 p-0.5">
          {displayCurrencyOptions.map((currency) => {
            const disabled = !displayCurrencies.includes(currency);
            const active = currencyView === currency;
            return (
              <button
                key={currency}
                type="button"
                onClick={() => { if (!disabled) setCurrencyView(currency); }}
                disabled={disabled}
                className={[
                  "min-w-[52px] rounded-md px-2.5 py-1 text-[11px] font-bold transition",
                  active ? "bg-slate-900 text-white shadow-sm" : "",
                  disabled ? "cursor-not-allowed text-slate-300" : active ? "" : "text-slate-500 hover:bg-white hover:text-slate-800"
                ].join(" ")}
              >
                {currency}
              </button>
            );
          })}
        </div>
      </div>

      {/* Card body */}
      <div className="grid gap-3 p-5 sm:grid-cols-3">
        {/* Quantity */}
        <div className="rounded-lg bg-slate-50 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">จำนวนรวม</p>
          <p className="mt-1.5 text-xl font-bold text-slate-900">{product.totalQuantity.toLocaleString("th-TH")}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">ชิ้น</p>
        </div>
        {/* Total value */}
        <div className="rounded-lg bg-slate-50 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">มูลค่ารวม</p>
          <p className="mt-1.5 truncate text-xl font-bold text-slate-900">
            {hasActiveCurrency ? formatDisplayMoney(product, currencyView) : "-"}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">{currencyView}</p>
        </div>
        {/* Avg price */}
        <div className="rounded-lg bg-slate-50 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">ราคาเฉลี่ย</p>
          <p className="mt-1.5 truncate text-xl font-bold text-slate-900">
            {hasActiveCurrency ? formatAverageMoney(product, currencyView) : "-"}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">{hasActiveCurrency ? "ต่อชิ้น" : "ไม่มีข้อมูลสกุลนี้"}</p>
        </div>
      </div>

      {/* Card footer */}
      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-5 py-3">
        <div className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-500">
          <Tag className="h-3.5 w-3.5 text-slate-400" />
          {product.categories.join(", ") || "ยังไม่ระบุหมวดหมู่"}
        </div>
        <span className="ml-auto flex flex-wrap gap-1.5">
          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">ขายต่อ {product.resaleCount}x</span>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500">ไม่ขายต่อ {product.nonResaleCount}x</span>
          <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">{product.latestPurchaseDate}</span>
        </span>
      </div>
    </div>
  );
}

export function ProductCatalogLayout() {
  const [createBusinessOpen, setCreateBusinessOpen] = useState(false);
  const [search, setSearch] = useState("");
  const {
    activeBusiness,
    activeBusinessId,
    createBusiness
  } = useBusinesses();
  const { products, sourceItems, loading, error } = useProductCatalog(activeBusinessId);
  const hasBusiness = Boolean(activeBusinessId);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return products;
    return products.filter((product) =>
      `${product.name} ${product.rawNames.join(" ")} ${product.categories.join(" ")} ${product.stores.join(" ")}`
        .toLocaleLowerCase()
        .includes(query)
    );
  }, [products, search]);

  const totalQuantity = useMemo(
    () => filteredProducts.reduce((sum, product) => sum + product.totalQuantity, 0),
    [filteredProducts]
  );
  const totalStores = useMemo(
    () => new Set(filteredProducts.flatMap((product) => product.stores)).size,
    [filteredProducts]
  );

  return (
    <main className="h-[100dvh] overflow-hidden bg-background text-foreground">
      <div className="flex h-[100dvh] min-h-0">
        <AppSidebar />
        <section className="min-w-0 flex-1 overflow-auto">
          {/* Mobile top bar */}
          <div className="sticky top-0 z-20 border-b border-slate-200 bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
            <BusinessSwitcher />
          </div>

          <div className="w-full max-w-full px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-8 lg:pt-7">
            {/* Page header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[12px] font-semibold text-blue-700">
                  <Boxes className="h-3.5 w-3.5" />
                  รวมสินค้าจากทุกร้านค้าในธุรกิจนี้
                </div>
                <h1 className="text-[26px] font-bold tracking-tight text-slate-950">สินค้าและบริการ</h1>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                  รวมจากทุกใบเสร็จ — ถ้าชื่อตรงกัน ระบบรวมเป็นรายการเดียวอัตโนมัติ
                </p>
              </div>
              {activeBusiness ? (
                <div className="shrink-0 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">ธุรกิจปัจจุบัน</p>
                  <p className="mt-1 text-[15px] font-bold text-slate-900">{activeBusiness.name}</p>
                </div>
              ) : null}
            </div>

            {hasBusiness ? (
              <>
                {/* KPI row */}
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <SummaryCard
                    label="สินค้าไม่ซ้ำ"
                    value={String(filteredProducts.length)}
                    hint="รวมตามชื่อสินค้าเดียวกัน"
                    accent="teal"
                  />
                  <SummaryCard
                    label="จำนวนชิ้นรวม"
                    value={totalQuantity.toLocaleString("th-TH")}
                    hint={`จาก ${sourceItems.length.toLocaleString("th-TH")} รายการย่อย`}
                    accent="blue"
                  />
                  <SummaryCard
                    label="ร้านค้าที่พบ"
                    value={totalStores.toLocaleString("th-TH")}
                    hint="นับจากชื่อร้านในใบเสร็จ"
                    accent="slate"
                  />
                </div>

                {/* Search */}
                <div className="mt-5 flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm focus-within:border-teal-400 focus-within:ring-2 focus-within:ring-teal-100">
                  <Search className="h-4 w-4 shrink-0 text-slate-400" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-[14px] text-slate-700 outline-none placeholder:text-slate-400"
                    placeholder="ค้นหาชื่อสินค้า, หมวดหมู่, ร้านค้า..."
                  />
                  {search ? (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-slate-500 hover:bg-slate-300"
                      aria-label="ล้างการค้นหา"
                    >
                      <span className="text-[10px] font-bold">×</span>
                    </button>
                  ) : null}
                </div>
              </>
            ) : null}

            {hasBusiness && loading ? <LoadingCards /> : null}

            {hasBusiness && !loading && filteredProducts.length === 0 ? (
              <div className="mt-8 rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                  <Package className="h-7 w-7 text-slate-400" />
                </div>
                <p className="mt-4 text-[17px] font-bold text-slate-900">ยังไม่มีสินค้าในคลัง</p>
                <p className="mt-2 text-sm text-slate-500">เพิ่มรายจ่ายที่มีรายการสินค้า ระบบจะรวมให้อัตโนมัติ</p>
              </div>
            ) : null}

            {hasBusiness && !loading && filteredProducts.length > 0 ? (
              <div className="mt-5 grid gap-3">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.key} product={product} />
                ))}
              </div>
            ) : null}
          </div>
        </section>
      </div>
      <CreateBusinessDialog open={createBusinessOpen} onClose={() => setCreateBusinessOpen(false)} onCreate={createBusiness} />
      <MobileBottomNav />
    </main>
  );
}
