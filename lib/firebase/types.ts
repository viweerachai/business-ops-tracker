import type { Timestamp } from "firebase/firestore";

export type FirestoreBusiness = {
  id: string;
  ownerUid: string;
  ownerEmail: string;
  name: string;
  phone: string;
  businessType: "personal" | "shop" | "company" | "side_hustle" | "other";
  taxId: string;
  branchName: string;
  branchCode: string;
  address: string;
  color: string;
  plan: "free" | "pro";
  googleDriveCompanyFolderId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type FirestoreAppSettings = {
  activeBusinessId: string;
  receiptRootFolderId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type FirestoreExpense = {
  id: string;
  businessId: string;
  ownerUid: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  purchaseDate: string;
  uploadDate: string;
  documentType: string;
  paymentStatus: string;
  hasTaxInvoice: boolean;
  invoiceNumber: string;
  storeName: string;
  vendorName: string;
  vendorTaxId: string;
  vendorBranchName: string;
  vendorBranchCode: string;
  vendorAddress: string;
  detail: string;
  subtotal: number | null;
  tax: number | null;
  withholdingTax: number | null;
  total: number | null;
  currency: "JPY" | "THB";
  expenseType: string;
  category: string;
  subCategory: string;
  requesterName: string;
  memo: string;
  aiMemo: string;
  aiConfidence: "high" | "medium" | "low";
  status: "draft" | "review_needed" | "confirmed" | "failed";
  extractionMode: "google_vision_ocr" | "gemini_vision" | "manual";
  imageDriveFileId: string;
  imageDriveUrl: string;
  imageFileName: string;
  ocrText: string;
  sheetSyncStatus?: "pending" | "synced" | "failed";
  spreadsheetId?: string;
  spreadsheetUrl?: string;
};

export type FirestoreExpenseItem = {
  id: string;
  expenseId: string;
  businessId: string;
  ownerUid: string;
  rawName: string;
  displayName: string;
  category: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  isResaleItem: boolean;
  productId?: string | null;
  memo: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};
