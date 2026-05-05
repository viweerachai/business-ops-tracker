import { addExpense, expensesDb } from "@/lib/db";
import type { Expense, ExpenseItem, ReceiptImage } from "@/lib/expenseTypes";

const placeholderReceiptImage =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='480' height='640' viewBox='0 0 480 640'%3E%3Crect width='480' height='640' fill='%23f8fafc'/%3E%3Crect x='120' y='70' width='240' height='500' rx='18' fill='white' stroke='%23cbd5e1' stroke-width='3'/%3E%3Ctext x='240' y='170' text-anchor='middle' font-family='Arial' font-size='42' font-weight='700' fill='%230f172a'%3EDOUTOR%3C/text%3E%3Ctext x='240' y='240' text-anchor='middle' font-family='Arial' font-size='18' fill='%2364748b'%3E2026/05/02%3C/text%3E%3Ctext x='240' y='310' text-anchor='middle' font-family='Arial' font-size='20' fill='%230f172a'%3EM%E3%83%BB%E3%82%A2%E3%82%A4%E3%82%B9%E3%82%AB%E3%83%95%E3%82%A7%E3%83%A9%E3%83%86%3C/text%3E%3Ctext x='240' y='380' text-anchor='middle' font-family='Arial' font-size='24' font-weight='700' fill='%230f172a'%3E%C2%A5440%3C/text%3E%3C/svg%3E";

export async function seedExpensesIfEmpty(businessId?: string | null) {
  const count = await expensesDb.expenses.count();
  if (count > 0) return;

  const now = new Date().toISOString();
  const image: ReceiptImage = {
    id: "seed-image-doutor",
    imageDataUrl: placeholderReceiptImage,
    createdAt: now
  };
  const expenses: Expense[] = [
    {
      id: "seed-expense-doutor-20260502",
      businessId: businessId ?? undefined,
      createdAt: "2026-05-02T03:34:00.000Z",
      updatedAt: now,
      purchaseDate: "2026-05-02",
      uploadDate: "2026-05-02",
      documentType: "ใบเสร็จรับเงิน",
      storeName: "沼田クリーン株式会社",
      detail: "ค่าอาหาร 沼田クリーン株式会社",
      payerName: "wee wee",
      paymentStatus: "paid",
      subtotal: null,
      tax: null,
      total: 440,
      currency: "JPY",
      categorySummary: "Food",
      imageBlobId: image.id,
      ocrText: "DOUTOR\n西新井西口店\n2026/05/02\nM・アイスカフェラテ ¥440\n合計 ¥440",
      aiMemo: "",
      syncStatus: "local"
    },
    {
      id: "seed-expense-tsutaya-20260419",
      businessId: businessId ?? undefined,
      createdAt: "2026-04-19T06:10:00.000Z",
      updatedAt: now,
      purchaseDate: "2026-04-19",
      uploadDate: "2026-04-19",
      documentType: "ใบเสร็จรับเงิน",
      storeName: "TSUTAYA TRADING CARD",
      detail: "ค่า TSUTAYA Trading Card",
      payerName: "wee wee",
      paymentStatus: "paid",
      subtotal: null,
      tax: null,
      total: 1980,
      currency: "JPY",
      categorySummary: "Trading Card",
      ocrText: "TSUTAYA TRADING CARD\n2026/04/19\nTrading Card ¥1980\n合計 ¥1980",
      aiMemo: "",
      syncStatus: "local"
    }
  ];
  const items: ExpenseItem[] = [
    {
      id: "seed-item-doutor-1",
      expenseId: expenses[0].id,
      businessId: businessId ?? undefined,
      rawName: "M・アイスカフェラテ",
      displayName: "M アイスカフェラテ",
      category: "Food",
      quantity: 1,
      unitPrice: 440,
      totalPrice: 440,
      isResaleItem: false,
      memo: "",
      createdAt: expenses[0].createdAt
    },
    {
      id: "seed-item-tsutaya-1",
      expenseId: expenses[1].id,
      businessId: businessId ?? undefined,
      rawName: "Trading Card",
      displayName: "TSUTAYA Trading Card",
      category: "Trading Card",
      quantity: 1,
      unitPrice: 1980,
      totalPrice: 1980,
      isResaleItem: true,
      memo: "",
      createdAt: expenses[1].createdAt
    }
  ];

  await addExpense(expenses[0], [items[0]], image);
  await addExpense(expenses[1], [items[1]]);
}
