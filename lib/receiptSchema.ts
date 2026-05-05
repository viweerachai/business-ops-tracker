import { CATEGORIES } from "@/lib/types/receipt";

export const receiptExtractionSchema = {
  type: "object",
  properties: {
    storeName: {
      type: ["string", "null"],
      description: "Receipt store name, or null when not found."
    },
    purchaseDate: {
      type: ["string", "null"],
      description: "Purchase date in YYYY-MM-DD format, or null when not found."
    },
    subtotal: {
      type: ["number", "null"],
      description: "Receipt subtotal in JPY, or null."
    },
    tax: {
      type: ["number", "null"],
      description: "Receipt tax amount in JPY, or null."
    },
    total: {
      type: ["number", "null"],
      description: "Receipt total amount in JPY, or null."
    },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          rawName: {
            type: "string",
            description: "Original Japanese or Thai product text from OCR."
          },
          displayName: {
            type: "string",
            description: "Readable simplified product name."
          },
          category: {
            type: "string",
            enum: [...CATEGORIES]
          },
          quantity: {
            type: "number"
          },
          unitPrice: {
            type: "number"
          },
          totalPrice: {
            type: "number"
          },
          isResaleItem: {
            type: "boolean"
          },
          memo: {
            type: "string"
          }
        },
        required: [
          "rawName",
          "displayName",
          "category",
          "quantity",
          "unitPrice",
          "totalPrice",
          "isResaleItem",
          "memo"
        ],
        additionalProperties: false
      }
    },
    aiMemo: {
      type: "string"
    }
  },
  required: [
    "storeName",
    "purchaseDate",
    "subtotal",
    "tax",
    "total",
    "items",
    "aiMemo"
  ],
  additionalProperties: false
} as const;

export type GeminiReceiptItem = {
  rawName: string;
  displayName: string;
  category: (typeof CATEGORIES)[number];
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  isResaleItem: boolean;
  memo: string;
};

export type GeminiReceiptExtraction = {
  storeName: string | null;
  purchaseDate: string | null;
  subtotal: number | null;
  tax: number | null;
  total: number | null;
  items: GeminiReceiptItem[];
  aiMemo: string;
};
