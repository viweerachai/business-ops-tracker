import type { Expense } from "@/lib/expenseTypes";

function escapeCsv(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function exportExpensesToCsv(expenses: Expense[]) {
  const headers = [
    "purchaseDate",
    "documentType",
    "storeName",
    "detail",
    "payerName",
    "paymentStatus",
    "total",
    "currency",
    "syncStatus"
  ];
  const rows = expenses.map((expense) => [
    expense.purchaseDate,
    expense.documentType,
    expense.storeName,
    expense.detail,
    expense.payerName,
    expense.paymentStatus,
    expense.total,
    expense.currency,
    expense.syncStatus
  ]);
  return [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
}

export function downloadExpensesCsv(expenses: Expense[]) {
  const csv = exportExpensesToCsv(expenses);
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const yyyymmdd = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  link.href = url;
  link.download = `expenses_${yyyymmdd}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
