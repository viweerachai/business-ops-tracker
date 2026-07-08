import type { ReceiptCategory } from "@/lib/types/receipt";

export type ChatReceiptItem = {
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

export type ChatReceipt = {
  storeName: string;
  purchaseDate: string;
  originalCurrency: "JPY" | "THB";
  baseCurrency: "JPY" | "THB";
  exchangeRate: number;
  subtotal: number | null;
  tax: number | null;
  shipping: number | null;
  total: number | null;
  ocrText: string;
  aiMemo: string;
  items: ChatReceiptItem[];
};

export type ChatReceiptEntry = {
  id: string;
  sourceName: string;
  imageDataUrl: string;
  receipt: ChatReceipt | null;
  phase: "vision" | "gemini" | "ready" | "error";
  saved: boolean;
  error: string | null;
  qualityWarning: string | null;
};

export type ReceiptBatchProgress = {
  active: boolean;
  total: number;
  done: number;
  success: number;
  failed: number;
  currentFileName: string | null;
};

export const mockReceipt: ChatReceipt = {
  storeName: "DOUTOR 西新井西口店",
  purchaseDate: "2026/05/02",
  originalCurrency: "JPY",
  baseCurrency: "THB",
  exchangeRate: 0.23,
  subtotal: null,
  tax: null,
  shipping: null,
  total: 440,
  ocrText:
    "DOUTOR\n西新井西口店\n2026/05/02\nM・アイスカフェラテ ¥440\n合計 ¥440",
  aiMemo: "",
  items: [
  {
    id: "mock-item-1",
      rawName: "M・アイスカフェラテ",
      displayName: "M アイスカフェラテ",
      category: "Food",
      quantity: 1,
      unitPrice: 440,
      totalPrice: 440,
      isResaleItem: false,
      memo: ""
    }
  ]
};
