export const CATEGORIES = [
  "Trading Card",
  "Figure",
  "Ichiban Kuji",
  "Book",
  "Toy",
  "Game",
  "Monchhichi",
  "Food",
  "Daily Goods",
  "Transport",
  "Other"
] as const;

export const OCR_LANGUAGES = [
  "jpn",
  "tha",
  "eng",
  "jpn+eng",
  "tha+jpn+eng"
] as const;

export type ReceiptCategory = (typeof CATEGORIES)[number];
export type OcrLanguage = (typeof OCR_LANGUAGES)[number];
export type ReceiptStatus = "draft" | "saved";

export type CategoryRule = {
  id?: number;
  category: ReceiptCategory;
  keyword: string;
  language: "ja" | "th" | "en" | "any";
  createdAt: string;
  updatedAt: string;
};

export type Receipt = {
  id: string;
  imageDataUrl: string;
  storeName: string | null;
  purchaseDate: string | null;
  subtotal: number | null;
  tax: number | null;
  total: number | null;
  aiMemo: string;
  ocrLanguage: OcrLanguage;
  ocrText: string;
  status: ReceiptStatus;
  createdAt: string;
  updatedAt: string;
};

export type ReceiptItem = {
  id: string;
  receiptId: string;
  rawName: string;
  displayName: string;
  category: ReceiptCategory;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  isResaleItem: boolean;
  memo: string;
  createdAt: string;
  updatedAt: string;
};

export type ReceiptDraft = Omit<Receipt, "id" | "status" | "createdAt" | "updatedAt"> & {
  items: Omit<ReceiptItem, "receiptId" | "createdAt" | "updatedAt">[];
};
