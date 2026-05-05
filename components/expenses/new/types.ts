import type { ReceiptCategory } from "@/lib/types/receipt";

export type ExpenseFormState = {
  receiptDate: string;
  storeName: string;
  detail: string;
  documentType: "receipt" | "tax_invoice" | "payment_voucher";
  category: ReceiptCategory;
  paymentStatus: "paid" | "unpaid" | "review";
  amount: number;
  currency: "JPY" | "THB";
  requester: string;
  hasTaxInvoice: boolean;
  invoiceNumber: string;
  subtotal: number;
  tax: number;
  withholdingTax: number;
  expenseType: string;
  subCategory: string;
  vendorName: string;
  vendorTaxId: string;
  vendorBranchName: string;
  vendorBranchCode: string;
  vendorAddress: string;
  note: string;
};

export type ExpenseItemState = {
  id: string;
  rawName: string;
  displayName: string;
  category: ReceiptCategory;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  isResaleItem: boolean;
  memo: string;
};

export type ExpenseProcessingStatus = "idle" | "converting" | "ocr" | "gemini" | "done" | "saving" | "saved" | "error";

export const defaultExpenseForm: ExpenseFormState = {
  receiptDate: "",
  storeName: "",
  detail: "",
  documentType: "receipt",
  category: "Other",
  paymentStatus: "paid",
  amount: 0,
  currency: "JPY",
  requester: "",
  hasTaxInvoice: false,
  invoiceNumber: "",
  subtotal: 0,
  tax: 0,
  withholdingTax: 0,
  expenseType: "รายจ่าย",
  subCategory: "",
  vendorName: "",
  vendorTaxId: "",
  vendorBranchName: "",
  vendorBranchCode: "",
  vendorAddress: "",
  note: ""
};

export const defaultExpenseItem: Omit<ExpenseItemState, "id"> = {
  rawName: "",
  displayName: "",
  category: "Other",
  quantity: 1,
  unitPrice: 0,
  totalPrice: 0,
  isResaleItem: true,
  memo: "要確認"
};
