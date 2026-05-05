import type { Receipt, ReceiptItem } from "@/lib/types/receipt";

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export function buildReceiptItemsCsv(rows: Array<{ receipt: Receipt; item: ReceiptItem | null }>) {
  const headers = [
    "receiptId",
    "storeName",
    "purchaseDate",
    "receiptTotal",
    "ocrLanguage",
    "itemId",
    "rawName",
    "displayName",
    "category",
    "quantity",
    "unitPrice",
    "totalPrice",
    "isResaleItem",
    "memo",
    "createdAt"
  ];

  return [
    headers.map(csvCell).join(","),
    ...rows.map(({ receipt, item }) =>
      [
        receipt.id,
        receipt.storeName,
        receipt.purchaseDate,
        receipt.total,
        receipt.ocrLanguage,
        item?.id,
        item?.rawName,
        item?.displayName,
        item?.category,
        item?.quantity,
        item?.unitPrice,
        item?.totalPrice,
        item?.isResaleItem,
        item?.memo,
        receipt.createdAt
      ]
        .map(csvCell)
        .join(",")
    )
  ].join("\n");
}

export function downloadTextFile(filename: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
