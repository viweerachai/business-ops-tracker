"use client";

import { useMemo, useState } from "react";
import { MOCK_EXPENSES } from "@/lib/mockData";
import type { Expense, ExpenseFiltersState } from "@/lib/expenseTypes";

// ---------------------------------------------------------------------------
// Mock version — bypasses Firebase/auth entirely for demo purposes
// ---------------------------------------------------------------------------

const defaultFilters: ExpenseFiltersState = {
  search: "",
  date: "",
  documentType: "ทั้งหมด",
  paymentStatus: "ทั้งหมด",
  payerName: "ทั้งหมด",
  dateMode: "purchaseDate"
};

function matchesFilters(expense: Expense, filters: ExpenseFiltersState) {
  const search = filters.search.trim().toLowerCase();
  if (search) {
    const haystack =
      `${expense.storeName} ${expense.detail} ${expense.payerName} ${expense.vendorName ?? ""}`.toLowerCase();
    if (!haystack.includes(search)) return false;
  }

  if (filters.date) {
    const dateValue =
      filters.dateMode === "purchaseDate"
        ? expense.purchaseDate
        : expense.uploadDate;
    if (dateValue !== filters.date) return false;
  }

  if (
    filters.documentType !== "ทั้งหมด" &&
    expense.documentType !== filters.documentType
  )
    return false;
  if (
    filters.paymentStatus !== "ทั้งหมด" &&
    expense.paymentStatus !== filters.paymentStatus
  )
    return false;
  if (
    filters.payerName !== "ทั้งหมด" &&
    expense.payerName !== filters.payerName
  )
    return false;

  return true;
}

export function useExpenses(
  activeBusinessId?: string | null,
  initialFilters: ExpenseFiltersState = defaultFilters
) {
  const [expenses, setExpenses] = useState<Expense[]>(() =>
    activeBusinessId
      ? MOCK_EXPENSES.filter((e) => e.businessId === activeBusinessId)
      : MOCK_EXPENSES
  );
  const [filters, setFilters] = useState<ExpenseFiltersState>(initialFilters);

  const filteredExpenses = useMemo(
    () => expenses.filter((e) => matchesFilters(e, filters)),
    [expenses, filters]
  );

  const payerOptions = useMemo(
    () =>
      Array.from(
        new Set(expenses.map((e) => e.payerName).filter(Boolean))
      ).sort(),
    [expenses]
  );

  return {
    expenses,
    filteredExpenses,
    filters,
    setFilters,
    payerOptions,
    loading: false,
    error: null,
    listExpenses: () => Promise.resolve(filteredExpenses),
    addExpense: async (expense: Expense) => {
      setExpenses((prev) => [expense, ...prev]);
    },
    updateExpense: async (id: string, patch: Partial<Expense>) => {
      setExpenses((prev) =>
        prev.map((e) =>
          e.id === id ? { ...e, ...patch, updatedAt: new Date().toISOString() } : e
        )
      );
    },
    deleteExpense: async (expenseId: string) => {
      setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
    },
    getExpenseById: async (id: string) =>
      MOCK_EXPENSES.find((e) => e.id === id) ?? null
  };
}
