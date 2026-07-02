"use client";

import { useEffect, useMemo, useState } from "react";
import type { ExpenseCurrency, ProductCatalogEntry, ProductCatalogSourceItem } from "@/lib/expenseTypes";
import { subscribeProductSourceItems, useFirebaseUser } from "@/lib/firebase/firestore";

const supportedCurrencies: ExpenseCurrency[] = ["JPY", "THB"];

function safeCurrency(
  currency: ExpenseCurrency | string | null | undefined,
  fallback: ExpenseCurrency = "JPY"
): ExpenseCurrency {
  return supportedCurrencies.includes(currency as ExpenseCurrency)
    ? (currency as ExpenseCurrency)
    : fallback;
}

function safeNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeProductName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

function displayProductName(item: ProductCatalogSourceItem) {
  return item.displayName.trim() || item.rawName.trim() || "ไม่ระบุชื่อสินค้า";
}

function appendCurrencyAmount(
  totalsByCurrency: Partial<Record<ExpenseCurrency, number>>,
  quantitiesByCurrency: Partial<Record<ExpenseCurrency, number>>,
  currency: ExpenseCurrency | string | null | undefined,
  amount: number,
  quantity: number
) {
  const c = safeCurrency(currency);
  totalsByCurrency[c] = (totalsByCurrency[c] ?? 0) + amount;
  quantitiesByCurrency[c] = (quantitiesByCurrency[c] ?? 0) + quantity;
}

function addConvertibleAmounts(entry: ProductCatalogEntry, item: ProductCatalogSourceItem) {
  const originalCurrency = safeCurrency(item.originalCurrency);
  const baseCurrency = safeCurrency(item.baseCurrency, "THB");
  const totalPrice = safeNumber(item.totalPrice);
  const quantity = safeNumber(item.quantity);
  const exchangeRate = safeNumber(
    item.exchangeRate,
    originalCurrency === baseCurrency ? 1 : 0
  );

  appendCurrencyAmount(
    entry.totalsByCurrency,
    entry.quantitiesByCurrency,
    originalCurrency,
    totalPrice,
    quantity
  );

  if (baseCurrency !== originalCurrency && exchangeRate > 0) {
    appendCurrencyAmount(
      entry.totalsByCurrency,
      entry.quantitiesByCurrency,
      baseCurrency,
      totalPrice * exchangeRate,
      quantity
    );
  }
}

function aggregateProducts(items: ProductCatalogSourceItem[]) {
  const map = new Map<string, ProductCatalogEntry>();

  for (const item of items) {
    const name = displayProductName(item);
    const key = normalizeProductName(name);
    const existing = map.get(key);

    if (!existing) {
      const entry: ProductCatalogEntry = {
        key,
        name,
        totalQuantity: safeNumber(item.quantity),
        purchaseCount: 1,
        latestPurchaseDate: item.purchaseDate,
        categories: item.category ? [item.category] : [],
        stores: item.storeName ? [item.storeName] : [],
        rawNames: [item.rawName || item.displayName].filter(Boolean),
        memos: item.memo ? [item.memo] : [],
        resaleCount: item.isResaleItem ? 1 : 0,
        nonResaleCount: item.isResaleItem ? 0 : 1,
        availableCurrencies: [],
        totalsByCurrency: {},
        quantitiesByCurrency: {}
      };
      addConvertibleAmounts(entry, item);
      entry.availableCurrencies = Object.keys(entry.totalsByCurrency) as ExpenseCurrency[];
      map.set(key, entry);
      continue;
    }

    existing.totalQuantity += safeNumber(item.quantity);
    existing.purchaseCount += 1;
    if (item.purchaseDate > existing.latestPurchaseDate) {
      existing.latestPurchaseDate = item.purchaseDate;
    }
    if (item.category && !existing.categories.includes(item.category)) {
      existing.categories.push(item.category);
    }
    if (item.storeName && !existing.stores.includes(item.storeName)) {
      existing.stores.push(item.storeName);
    }
    const rawName = item.rawName || item.displayName;
    if (rawName && !existing.rawNames.includes(rawName)) {
      existing.rawNames.push(rawName);
    }
    if (item.memo && !existing.memos.includes(item.memo)) {
      existing.memos.push(item.memo);
    }
    if (item.isResaleItem) {
      existing.resaleCount += 1;
    } else {
      existing.nonResaleCount += 1;
    }
    addConvertibleAmounts(existing, item);
    existing.availableCurrencies = Object.keys(existing.totalsByCurrency) as ExpenseCurrency[];
  }

  return Array.from(map.values()).sort((a, b) => {
    if (a.latestPurchaseDate !== b.latestPurchaseDate) {
      return b.latestPurchaseDate.localeCompare(a.latestPurchaseDate);
    }
    return (
      (b.totalsByCurrency.JPY ?? b.totalsByCurrency.THB ?? 0) -
      (a.totalsByCurrency.JPY ?? a.totalsByCurrency.THB ?? 0)
    );
  });
}

export function useProductCatalog(activeBusinessId?: string | null) {
  const { user, loading: authLoading, error: authError } = useFirebaseUser();
  const [sourceItems, setSourceItems] = useState<ProductCatalogSourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(authError);

  useEffect(() => {
    setError(authError);
  }, [authError]);

  useEffect(() => {
    if (!user || !activeBusinessId) {
      setSourceItems([]);
      setLoading(false);
      return;
    }

    let unsubscribe: () => void = () => {};
    let cancelled = false;

    setLoading(true);
    setError(null);

    unsubscribe = subscribeProductSourceItems(
      user,
      activeBusinessId,
      (items) => {
        if (cancelled) return;
        setSourceItems(items);
        setLoading(false);
      },
      (nextError) => {
        if (cancelled) return;
        setError(nextError.message);
        setLoading(false);
      }
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [activeBusinessId, user]);

  const products = useMemo(() => aggregateProducts(sourceItems), [sourceItems]);

  return {
    products,
    sourceItems,
    loading: authLoading || loading,
    error
  };
}
