"use client";

import { useEffect, useMemo, useState } from "react";
import type { Expense, ExpenseFiltersState } from "@/lib/expenseTypes";
import {
  deleteExpenseDoc,
  getExpenseWithItemsDoc,
  subscribeExpenses,
  useFirebaseUser
} from "@/lib/firebase/firestore";

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
      filters.dateMode === "purchaseDate" ? expense.purchaseDate : expense.uploadDate;
    if (dateValue !== filters.date) return false;
  }

  if (filters.documentType !== "ทั้งหมด" && expense.documentType !== filters.documentType) return false;
  if (filters.paymentStatus !== "ทั้งหมด" && expense.paymentStatus !== filters.paymentStatus) return false;
  if (filters.payerName !== "ทั้งหมด" && expense.payerName !== filters.payerName) return false;

  return true;
}

export function useExpenses(
  activeBusinessId?: string | null,
  initialFilters: ExpenseFiltersState = defaultFilters
) {
  const { user, loading: authLoading, error: authError } = useFirebaseUser();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filters, setFilters] = useState<ExpenseFiltersState>(initialFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(authError);

  useEffect(() => {
    setError(authError);
  }, [authError]);

  useEffect(() => {
    if (!user || !activeBusinessId) {
      setExpenses([]);
      setLoading(false);
      return;
    }

    let unsubscribe: () => void = () => {};
    let cancelled = false;

    setLoading(true);
    setError(null);

    unsubscribe = subscribeExpenses(
      user,
      activeBusinessId,
      (nextExpenses) => {
        if (cancelled) return;
        setExpenses(nextExpenses);
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

  const filteredExpenses = useMemo(
    () => expenses.filter((expense) => matchesFilters(expense, filters)),
    [expenses, filters]
  );

  const payerOptions = useMemo(
    () => Array.from(new Set(expenses.map((expense) => expense.payerName).filter(Boolean))).sort(),
    [expenses]
  );

  return {
    expenses,
    filteredExpenses,
    filters,
    setFilters,
    payerOptions,
    loading: authLoading || loading,
    error,
    listExpenses: () => Promise.resolve(expenses),
    addExpense: async () => {
      throw new Error("เพิ่มรายจ่ายต้องใช้ flow การบันทึกจากหน้า new/review");
    },
    updateExpense: async () => {
      throw new Error("อัปเดตรายจ่ายให้ใช้หน้ารายละเอียด");
    },
    deleteExpense: async (expenseId: string) => {
      if (!user || !activeBusinessId) {
        throw new Error("ยังไม่ได้เข้าสู่ระบบ");
      }
      await deleteExpenseDoc(user, activeBusinessId, expenseId);
    },
    getExpenseById: async (id: string) => {
      if (!user || !activeBusinessId) return null;
      return getExpenseWithItemsDoc(user, activeBusinessId, id);
    }
  };
}
