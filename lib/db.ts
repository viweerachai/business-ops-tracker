"use client";

import Dexie, { type Table } from "dexie";
import type { AppSetting, Business, Expense, ExpenseItem, ReceiptImage } from "@/lib/expenseTypes";

class ExpensesDb extends Dexie {
  businesses!: Table<Business, string>;
  expenses!: Table<Expense, string>;
  expense_items!: Table<ExpenseItem, string>;
  receipt_images!: Table<ReceiptImage, string>;
  app_settings!: Table<AppSetting, string>;

  constructor() {
    super("expenseManagementDashboard");
    this.version(1).stores({
      expenses: "id, purchaseDate, uploadDate, documentType, storeName, payerName, paymentStatus, total, currency, syncStatus, createdAt, updatedAt",
      expense_items: "id, expenseId, category, displayName, rawName, isResaleItem, createdAt",
      receipt_images: "id, createdAt",
      app_settings: "key"
    });
    this.version(2).stores({
      businesses: "id, ownerEmail, name, plan, isActive, createdAt, updatedAt",
      expenses: "id, businessId, purchaseDate, uploadDate, documentType, storeName, payerName, paymentStatus, total, currency, syncStatus, createdAt, updatedAt",
      expense_items: "id, expenseId, businessId, category, displayName, rawName, isResaleItem, createdAt",
      receipt_images: "id, createdAt",
      app_settings: "key"
    });
  }
}

export const expensesDb = new ExpensesDb();

export async function listExpenses() {
  return expensesDb.expenses.orderBy("purchaseDate").reverse().toArray();
}

export async function addExpense(expense: Expense, items: ExpenseItem[] = [], image?: ReceiptImage | null) {
  await expensesDb.transaction("rw", expensesDb.expenses, expensesDb.expense_items, expensesDb.receipt_images, async () => {
    if (image) await expensesDb.receipt_images.put(image);
    await expensesDb.expenses.put(expense);
    await expensesDb.expense_items.where("expenseId").equals(expense.id).delete();
    if (items.length > 0) await expensesDb.expense_items.bulkPut(items);
  });
}

export async function updateExpense(expenseId: string, patch: Partial<Expense>) {
  await expensesDb.expenses.update(expenseId, {
    ...patch,
    updatedAt: new Date().toISOString()
  });
}

export async function deleteExpense(expenseId: string) {
  await expensesDb.transaction("rw", expensesDb.expenses, expensesDb.expense_items, async () => {
    await expensesDb.expense_items.where("expenseId").equals(expenseId).delete();
    await expensesDb.expenses.delete(expenseId);
  });
}

export async function getExpenseById(expenseId: string) {
  const expense = await expensesDb.expenses.get(expenseId);
  if (!expense) return null;
  const items = await expensesDb.expense_items.where("expenseId").equals(expenseId).toArray();
  const image = expense.imageBlobId ? await expensesDb.receipt_images.get(expense.imageBlobId) : null;
  return {
    ...expense,
    items,
    image
  };
}
