"use client";

import { useEffect, useMemo, useState } from "react";
import { getExpenseById, updateExpense, addExpense } from "@/lib/db";
import { formatFirestoreError } from "@/lib/firebase/errors";
import { deleteExpenseDoc, subscribeExpenses, useFirebaseUser } from "@/lib/firebase/firestore";
import type { Expense, ExpenseFiltersState } from "@/lib/expenseTypes";

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
    const haystack = `${expense.storeName} ${expense.detail} ${expense.payerName} ${expense.vendorName ?? ""}`.toLowerCase();
    if (!haystack.includes(search)) return false;
  }

  if (filters.date) {
    const dateValue = filters.dateMode === "purchaseDate" ? expense.purchaseDate : expense.uploadDate;
    if (dateValue !== filters.date) return false;
  }

  if (filters.documentType !== "ทั้งหมด" && expense.documentType !== filters.documentType) return false;
  if (filters.paymentStatus !== "ทั้งหมด" && expense.paymentStatus !== filters.paymentStatus) return false;
  if (filters.payerName !== "ทั้งหมด" && expense.payerName !== filters.payerName) return false;
  return true;
}

export function useExpenses(activeBusinessId?: string | null, initialFilters: ExpenseFiltersState = defaultFilters) {
  const { user, loading: authLoading, error: authError } = useFirebaseUser();
  const [filters, setFilters] = useState<ExpenseFiltersState>(initialFilters);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !activeBusinessId) {
      setExpenses([]);
      setLoading(false);
      setError(authError);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeExpenses(
      user,
      activeBusinessId,
      (nextExpenses) => {
        setExpenses(nextExpenses);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(formatFirestoreError(err));
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [activeBusinessId, authError, authLoading, user]);

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
    listExpenses: () => Promise.resolve(filteredExpenses),
    addExpense,
    updateExpense,
    deleteExpense: async (expenseId: string) => {
      if (!user || !activeBusinessId) throw new Error("กรุณาเข้าสู่ระบบ Google ก่อนลบรายจ่าย");
      await deleteExpenseDoc(user, activeBusinessId, expenseId);
    },
    getExpenseById
  };
}
