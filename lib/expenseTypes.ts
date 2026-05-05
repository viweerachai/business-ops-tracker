export type ExpenseDocumentType = "ใบเสร็จรับเงิน" | "ใบกำกับภาษี" | "รายจ่ายอื่น ๆ";
export type ExpensePaymentStatus = "draft" | "review_needed" | "paid" | "pending" | "failed";
export type ExpenseCurrency = "JPY" | "THB";
export type ExpenseSyncStatus = "local" | "pending" | "synced" | "failed";

export type BusinessPlan = "free" | "pro";

export type Business = {
  id: string;
  ownerEmail: string;
  name: string;
  phone?: string;
  avatarUrl?: string;
  plan: BusinessPlan;
  createdAt: string;
  updatedAt: string;
  googleDriveRootFolderId?: string;
  googleSpreadsheetIdByYear?: Record<string, string>;
  isActive?: boolean;
};

export type Expense = {
  id: string;
  businessId?: string;
  ownerUid?: string;
  createdAt: string;
  updatedAt: string;
  purchaseDate: string;
  uploadDate: string;
  documentType: ExpenseDocumentType;
  storeName: string;
  detail: string;
  payerName: string;
  paymentStatus: ExpensePaymentStatus;
  subtotal: number | null;
  tax: number | null;
  withholdingTax?: number | null;
  total: number;
  currency: ExpenseCurrency;
  categorySummary: string;
  companyName?: string;
  invoiceNumber?: string;
  hasTaxInvoice?: boolean;
  expenseType?: string;
  subCategory?: string;
  requesterName?: string;
  vendorName?: string;
  vendorTaxId?: string;
  vendorBranchName?: string;
  vendorBranchCode?: string;
  vendorAddress?: string;
  imageBlobId?: string;
  driveFolderId?: string;
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  imageDriveFileId?: string;
  imageDriveUrl?: string;
  ocrText?: string;
  aiMemo?: string;
  syncStatus: ExpenseSyncStatus;
};

export type ExpenseItem = {
  id: string;
  expenseId: string;
  businessId?: string;
  rawName: string;
  displayName: string;
  category: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  isResaleItem: boolean;
  memo?: string;
  createdAt: string;
};

export type ReceiptImage = {
  id: string;
  imageDataUrl: string;
  createdAt: string;
};

export type AppSetting = {
  key: string;
  value: unknown;
  updatedAt: string;
};

export type ExpenseFiltersState = {
  search: string;
  date: string;
  documentType: ExpenseDocumentType | "ทั้งหมด";
  paymentStatus: ExpensePaymentStatus | "ทั้งหมด";
  payerName: string;
  dateMode: "purchaseDate" | "uploadDate";
};

export type ExpenseWithItems = Expense & {
  items: ExpenseItem[];
  image?: ReceiptImage | null;
};
