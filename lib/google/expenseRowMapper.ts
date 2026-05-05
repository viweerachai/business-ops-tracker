import type { ReceiptCategory } from "@/lib/types/receipt";

export type GoogleExpenseItemPayload = {
  id?: string;
  rawName?: string;
  displayName?: string;
  category?: ReceiptCategory | string;
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
  totalBeforeTax?: number;
  isResaleItem?: boolean;
  memo?: string;
};

export type GoogleExpensePayload = {
  id: string;
  companyName: string;
  purchaseDate: string;
  invoiceNumber?: string;
  documentType: string;
  paymentStatus: string;
  hasTaxInvoice?: boolean;
  storeName?: string;
  vendorName?: string;
  detail: string;
  subtotal?: number | null;
  tax?: number | null;
  withholdingTax?: number | null;
  total: number;
  unitPrice?: number;
  expenseType?: string;
  category?: string;
  subCategory?: string;
  requesterName?: string;
  vendorTaxId?: string;
  vendorBranchName?: string;
  vendorBranchCode?: string;
  vendorAddress?: string;
  memo?: string;
  aiMemo?: string;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function mapExpenseToSheetRows(expense: GoogleExpensePayload, items: GoogleExpenseItemPayload[], imageDriveUrl: string) {
  const rowItems = items.length > 0 ? items : [{}];

  return rowItems.map((item) => {
    const quantity = numberValue(item.quantity) || 1;
    const totalPrice = numberValue(item.totalPrice) || expense.total || 0;

    return [
      expense.purchaseDate,
      expense.id,
      text(expense.invoiceNumber),
      expense.documentType,
      expense.paymentStatus,
      expense.hasTaxInvoice ? "มี" : "ไม่มี",
      text(item.displayName) || expense.detail,
      quantity,
      numberValue(item.unitPrice) || numberValue(expense.unitPrice),
      numberValue(item.totalBeforeTax) || numberValue(expense.subtotal),
      numberValue(expense.tax),
      numberValue(expense.withholdingTax),
      totalPrice,
      text(expense.expenseType) || "รายจ่าย",
      text(item.category) || text(expense.category),
      text(expense.subCategory),
      text(expense.vendorName) || text(expense.storeName),
      text(expense.vendorTaxId),
      text(expense.vendorBranchName),
      text(expense.vendorBranchCode),
      text(expense.vendorAddress),
      text(expense.requesterName),
      imageDriveUrl,
      text(item.memo) || text(expense.memo) || text(expense.aiMemo)
    ];
  });
}
