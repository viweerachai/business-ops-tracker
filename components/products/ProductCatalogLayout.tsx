"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Boxes, Package, Search, Tag } from "lucide-react";
import { signIn } from "next-auth/react";
import { CreateBusinessDialog } from "@/components/business/CreateBusinessDialog";
import { BusinessSwitcher } from "@/components/business/BusinessSwitcher";
import { AppSidebar } from "@/components/expenses/AppSidebar";
import { MobileBottomNav } from "@/components/expenses/MobileBottomNav";
import { Button } from "@/components/ui/button";
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
    <div className="mt-6 grid gap-4">
      {[0, 1, 2].map((item) => (
        <div key={item} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <Skeleton className="h-7 w-48" />
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-xs font-medium text-slate-400">{hint}</p>
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
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xl font-black text-slate-950">{product.name}</p>
          {product.rawNames.length > 1 ? (
            <p className="mt-1 line-clamp-2 text-sm text-slate-500">{product.rawNames.slice(0, 3).join(" / ")}</p>
          ) : null}
        </div>
        <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
          {displayCurrencyOptions.map((currency) => {
            const disabled = !displayCurrencies.includes(currency);
            const active = currencyView === currency;
            return (
              <button
                key={currency}
                type="button"
                onClick={() => {
                  if (!disabled) {
                    setCurrencyView(currency);
                  }
                }}
                disabled={disabled}
                className={[
                  "min-w-[60px] rounded-xl px-3 py-1.5 text-xs font-black transition",
                  active ? "bg-slate-950 text-white shadow-sm" : "",
                  disabled ? "cursor-not-allowed text-slate-300" : active ? "" : "text-slate-500 hover:bg-white"
                ].join(" ")}
              >
                {currency}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 px-4 py-3">
          <p className="text-xs font-bold text-slate-400">จำนวนรวม</p>
          <p className="mt-1 text-lg font-black text-slate-900">{product.totalQuantity}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 px-4 py-3">
          <p className="text-xs font-bold text-slate-400">ราคา</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <div className="min-w-0 rounded-xl bg-white/80 px-3 py-2">
              <p className="text-[11px] font-bold text-slate-400">มูลค่ารวม</p>
              <p className="mt-1 truncate text-base font-black text-slate-900">
                {hasActiveCurrency ? formatDisplayMoney(product, currencyView) : "-"}
              </p>
            </div>
            <div className="min-w-0 rounded-xl bg-white/80 px-3 py-2">
              <p className="text-[11px] font-bold text-slate-400">ราคาเฉลี่ย</p>
              <p className="mt-1 truncate text-base font-black text-slate-900">
                {hasActiveCurrency ? formatAverageMoney(product, currencyView) : "-"}
              </p>
              <p className="text-[11px] font-medium text-slate-400">
                {hasActiveCurrency ? "ต่อชิ้น" : "ยังไม่มีข้อมูลสกุลนี้"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        <div className="rounded-2xl border border-slate-100 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
            <Tag className="h-4 w-4" />
            หมวดหมู่
          </div>
          <p className="mt-2 text-sm font-semibold text-slate-700">{product.categories.join(", ") || "ยังไม่ระบุ"}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">ขายต่อ {product.resaleCount} ครั้ง</span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">ไม่ขายต่อ {product.nonResaleCount} ครั้ง</span>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">ล่าสุด {product.latestPurchaseDate}</span>
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
    isLoggedIn,
    loading: businessLoading,
    error: businessError,
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
    <main className="h-[100dvh] overflow-hidden bg-[#F5F7FB] text-slate-900">
      <div className="flex h-[100dvh] min-h-0">
        <AppSidebar />
        <section className="min-w-0 flex-1 overflow-auto bg-[#F5F7FB]">
          <div className="sticky top-0 z-20 border-b border-slate-200 bg-[#F5F7FB]/95 px-4 py-3 backdrop-blur lg:hidden">
            <BusinessSwitcher />
          </div>
          <div className="w-full max-w-full px-4 py-5 pb-28 sm:px-5 lg:px-7 lg:py-7 lg:pb-7 2xl:px-9">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                  <Boxes className="h-4 w-4" />
                  รวมสินค้าจากทุกร้านค้าในธุรกิจนี้
                </div>
                <h1 className="mt-3 text-3xl font-black text-slate-950">สินค้าและบริการของฉัน</h1>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  รวมสินค้าจากทุกใบเสร็จในธุรกิจเดียวกัน ถ้าชื่อสินค้าตรงกัน ระบบจะรวมเป็นรายการเดียวให้
                </p>
              </div>
              {activeBusiness ? (
                <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3 text-sm shadow-sm">
                  <p className="font-bold text-slate-500">ธุรกิจที่กำลังดู</p>
                  <p className="mt-1 text-lg font-black text-slate-900">{activeBusiness.name}</p>
                </div>
              ) : null}
            </div>

            {!businessLoading && !isLoggedIn ? (
              <div className="mt-8 rounded-2xl border border-blue-100 bg-white p-10 text-center shadow-sm">
                <p className="text-xl font-black text-slate-900">กรุณาเข้าสู่ระบบ Google เพื่อดูคลังสินค้า</p>
                <p className="mt-2 text-slate-500">ข้อมูลสินค้าจะโหลดจาก Firestore หลังเข้าสู่ระบบ</p>
                <Button className="mt-5 h-12 rounded-xl bg-slate-950 px-6 text-white" onClick={() => signIn("google", { callbackUrl: "/products" })}>
                  เข้าสู่ระบบ Google
                </Button>
              </div>
            ) : null}

            {isLoggedIn && !businessLoading && !hasBusiness ? (
              <div className="mt-8 rounded-2xl border border-dashed border-blue-200 bg-white p-10 text-center shadow-sm">
                <p className="text-2xl font-black text-slate-950">สร้างธุรกิจก่อนเริ่มใช้งาน</p>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
                  เมื่อมีธุรกิจแล้ว ระบบจะรวมสินค้าและบริการจากใบเสร็จทั้งหมดของธุรกิจนั้นให้โดยอัตโนมัติ
                </p>
                <Button
                  className="mt-6 h-12 rounded-xl bg-slate-950 px-6 text-white hover:bg-slate-800"
                  onClick={() => setCreateBusinessOpen(true)}
                >
                  สร้างธุรกิจแรก
                </Button>
              </div>
            ) : null}

            {businessError || error ? (
              <div className="mt-8 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
                <AlertCircle className="mt-0.5 h-5 w-5" />
                <div>
                  <p className="font-black">โหลดข้อมูลสินค้าไม่สำเร็จ</p>
                  <p className="mt-1 text-sm">{businessError || error}</p>
                  <Button
                    className="mt-4 h-10 rounded-xl bg-slate-950 px-4 text-white hover:bg-slate-800"
                    onClick={() => signIn("google", { callbackUrl: "/products" })}
                  >
                    เข้าสู่ระบบ Google
                  </Button>
                </div>
              </div>
            ) : null}

            {isLoggedIn && hasBusiness ? (
              <>
                <div className="mt-8 grid gap-4 md:grid-cols-3">
                  <SummaryCard
                    label="จำนวนสินค้าที่ไม่ซ้ำ"
                    value={String(filteredProducts.length)}
                    hint="รวมตามชื่อสินค้าเดียวกัน"
                  />
                  <SummaryCard
                    label="จำนวนชิ้นทั้งหมด"
                    value={totalQuantity.toLocaleString("th-TH")}
                    hint={`จาก ${sourceItems.length.toLocaleString("th-TH")} รายการย่อย`}
                  />
                  <SummaryCard
                    label="ร้านค้าที่พบ"
                    value={totalStores.toLocaleString("th-TH")}
                    hint="นับจากชื่อร้านในใบเสร็จ"
                  />
                </div>

                <div className="mt-5 flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <Search className="h-4.5 w-4.5 shrink-0 text-slate-500" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-[14px] font-semibold text-slate-700 outline-none placeholder:text-slate-400"
                    placeholder="ค้นหาชื่อสินค้า, ชื่อเดิม, หมวดหมู่, ร้านค้า"
                  />
                </div>
              </>
            ) : null}

            {isLoggedIn && hasBusiness && (loading || businessLoading) ? <LoadingCards /> : null}

            {isLoggedIn && hasBusiness && !loading && !businessLoading && filteredProducts.length === 0 ? (
              <div className="mt-8 rounded-2xl border border-slate-100 bg-white p-10 text-center shadow-sm">
                <Package className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-4 text-xl font-black text-slate-900">ยังไม่มีสินค้าในคลังรวม</p>
                <p className="mt-2 text-slate-500">เพิ่มรายจ่ายที่มีรายการสินค้า แล้วหน้าคลังสินค้าจะรวมให้เองอัตโนมัติ</p>
              </div>
            ) : null}

            {isLoggedIn && hasBusiness && !loading && !businessLoading && filteredProducts.length > 0 ? (
              <div className="mt-6 grid gap-4">
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
