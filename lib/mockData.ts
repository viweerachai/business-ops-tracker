import type { Business, Expense, ExpenseItem, ProductCatalogSourceItem } from "@/lib/expenseTypes";

// Demo/test data kept on purpose.
// The app now defaults to real Firestore data, but these fixtures remain
// available for local testing and mock flows.

export const MOCK_USER = {
  name: "วีระชัย ทรัพย์สมบูรณ์",
  email: "weerachai@gmail.com",
  image: null as string | null
};

export const MOCK_BUSINESSES: Business[] = [
  {
    id: "biz-weerachai-trading",
    ownerEmail: MOCK_USER.email,
    name: "วีระชัยเทรดดิ้ง",
    phone: "081-234-5678",
    plan: "pro",
    createdAt: "2025-01-10T09:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    isActive: true
  },
  {
    id: "biz-japan-resell",
    ownerEmail: MOCK_USER.email,
    name: "Japan Resell Shop",
    phone: "089-765-4321",
    plan: "free",
    createdAt: "2025-06-01T09:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
    isActive: false
  }
];

export const MOCK_ACTIVE_BUSINESS_ID = "biz-weerachai-trading";

export const MOCK_EXPENSES: Expense[] = [
  {
    id: "exp-001",
    businessId: MOCK_ACTIVE_BUSINESS_ID,
    ownerUid: "mock-uid",
    createdAt: "2026-06-25T08:00:00.000Z",
    updatedAt: "2026-06-25T08:00:00.000Z",
    purchaseDate: "2026-06-25",
    uploadDate: "2026-06-25",
    documentType: "ใบกำกับภาษี",
    storeName: "บริษัท สยามซัพพลาย จำกัด",
    detail: "ค่าซื้อกระดาษ A4 และอุปกรณ์สำนักงาน",
    payerName: "วีระชัย ทรัพย์สมบูรณ์",
    paymentStatus: "paid",
    subtotal: 1400,
    tax: 98,
    total: 1498,
    currency: "THB",
    categorySummary: "อุปกรณ์สำนักงาน",
    invoiceNumber: "INV-2026-0625",
    hasTaxInvoice: true,
    vendorName: "บริษัท สยามซัพพลาย จำกัด",
    vendorTaxId: "0105565012345",
    syncStatus: "synced"
  }
];

export const MOCK_EXPENSE_ITEMS: ExpenseItem[] = [
  {
    id: "item-001-1",
    expenseId: "exp-001",
    businessId: MOCK_ACTIVE_BUSINESS_ID,
    rawName: "กระดาษ A4 80g 500 แผ่น",
    displayName: "กระดาษ A4 80g",
    category: "อุปกรณ์สำนักงาน",
    quantity: 5,
    unitPrice: 220,
    totalPrice: 1100,
    isResaleItem: false,
    memo: "",
    createdAt: "2026-06-25T08:00:00.000Z"
  }
];

export const MOCK_PRODUCT_SOURCE_ITEMS: ProductCatalogSourceItem[] = [
  {
    id: "item-001-1",
    expenseId: "exp-001",
    businessId: MOCK_ACTIVE_BUSINESS_ID,
    rawName: "กระดาษ A4 80g 500 แผ่น",
    displayName: "กระดาษ A4 80g",
    category: "อุปกรณ์สำนักงาน",
    quantity: 5,
    unitPrice: 220,
    totalPrice: 1100,
    isResaleItem: false,
    memo: "",
    createdAt: "2026-06-25T08:00:00.000Z",
    storeName: "บริษัท สยามซัพพลาย จำกัด",
    purchaseDate: "2026-06-25",
    originalCurrency: "THB",
    baseCurrency: "THB",
    exchangeRate: 1
  }
];
