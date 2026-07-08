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
      description:
        "Purchase date in YYYY-MM-DD format only when it is explicit and unambiguous, or null when the OCR only shows an ambiguous numeric date, month/day without a year, or a shipping/dispatch date."
    },
    subtotal: {
      type: ["number", "null"],
      description: "Receipt subtotal in JPY, or null."
    },
    tax: {
      type: ["number", "null"],
      description: "Receipt tax amount in JPY, or null."
    },
    shipping: {
      type: ["number", "null"],
      description: "Receipt shipping/delivery fee in JPY, or null. Use labels like Shipping, 送料, 配送, delivery."
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
            description:
              "Readable easy English product name. Use common English translation when known, otherwise use a simple romanized name."
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
    "shipping",
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
  shipping: number | null;
  total: number | null;
  items: GeminiReceiptItem[];
  aiMemo: string;
};
