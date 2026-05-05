import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadReceiptImage } from "@/lib/google/drive";
import { mapExpenseToSheetRows, type GoogleExpenseItemPayload, type GoogleExpensePayload } from "@/lib/google/expenseRowMapper";
import {
  appendRows,
  ensureHeaderRow,
  ensureSheetExists,
  getOrCreateExpenseSpreadsheet
} from "@/lib/google/sheets";
import {
  getOrCreateExpenseStorageStructure,
  getThaiMonthName,
  sanitizeDriveName
} from "@/lib/google/storageStructure";
import { CATEGORIES, type ReceiptCategory } from "@/lib/types/receipt";

export const runtime = "nodejs";

type SaveExpenseItem = {
  id?: string;
  rawName?: string;
  displayName?: string;
  category?: ReceiptCategory | string;
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
  isResaleItem?: boolean;
  memo?: string;
};

type SaveExpenseBody = {
  receiptId?: string;
  companyName?: string;
  imageDataUrl?: string | null;
  fileName?: string | null;
  ocrText?: string;
  form?: {
    receiptDate?: string;
    storeName?: string;
    detail?: string;
    documentType?: string;
    category?: string;
    paymentStatus?: string;
    amount?: number;
    currency?: string;
    requester?: string;
    hasTaxInvoice?: boolean;
    invoiceNumber?: string;
    subtotal?: number | null;
    tax?: number | null;
    withholdingTax?: number | null;
    expenseType?: string;
    subCategory?: string;
    vendorName?: string;
    vendorTaxId?: string;
    vendorBranchName?: string;
    vendorBranchCode?: string;
    vendorAddress?: string;
    note?: string;
    aiMemo?: string;
  };
  items?: SaveExpenseItem[];
};

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function categoryValue(value: unknown): ReceiptCategory {
  return CATEGORIES.includes(value as ReceiptCategory) ? (value as ReceiptCategory) : "Other";
}

function documentTypeLabel(value: string) {
  if (value === "tax_invoice") return "ใบกำกับภาษี";
  if (value === "payment_voucher") return "รายจ่ายอื่น ๆ";
  return "ใบเสร็จรับเงิน";
}

function paymentStatusLabel(value: string) {
  if (value === "unpaid" || value === "pending") return "ยังไม่จ่าย";
  if (value === "review" || value === "review_needed") return "รอตรวจสอบ";
  if (value === "failed") return "บันทึกไม่สำเร็จ";
  if (value === "draft") return "แบบร่าง";
  return "จ่ายแล้ว";
}

function dateCompact(date: string) {
  return date.replaceAll("-", "") || new Date().toISOString().slice(0, 10).replaceAll("-", "");
}

function normalizeBody(body: SaveExpenseBody) {
  const form = body.form ?? {};
  const timestampDate = new Date().toISOString().slice(0, 10);
  const purchaseDate = asText(form.receiptDate) || timestampDate;
  const receiptId = asText(body.receiptId) || crypto.randomUUID();
  const companyName = asText(body.companyName) || "หมาชัย จำกัด";
  const storeName = asText(form.storeName) || "ไม่ระบุร้านค้า";
  const imageDataUrl = asText(body.imageDataUrl);
  const fileName = `receipt_${dateCompact(purchaseDate)}_${sanitizeDriveName(storeName)}_${receiptId}.jpg`;

  const expense: GoogleExpensePayload = {
    id: receiptId,
    companyName,
    purchaseDate,
    invoiceNumber: asText(form.invoiceNumber),
    documentType: documentTypeLabel(asText(form.documentType)),
    paymentStatus: paymentStatusLabel(asText(form.paymentStatus)),
    hasTaxInvoice: form.hasTaxInvoice === true,
    storeName,
    vendorName: asText(form.vendorName) || storeName,
    detail: asText(form.detail) || `ค่า ${storeName}`,
    subtotal: numberValue(form.subtotal),
    tax: numberValue(form.tax),
    withholdingTax: numberValue(form.withholdingTax),
    total: numberValue(form.amount),
    expenseType: asText(form.expenseType) || "รายจ่าย",
    category: categoryValue(form.category),
    subCategory: asText(form.subCategory),
    requesterName: asText(form.requester),
    vendorTaxId: asText(form.vendorTaxId),
    vendorBranchName: asText(form.vendorBranchName),
    vendorBranchCode: asText(form.vendorBranchCode),
    vendorAddress: asText(form.vendorAddress),
    memo: asText(form.note),
    aiMemo: asText(form.aiMemo)
  };

  const items: GoogleExpenseItemPayload[] = (Array.isArray(body.items) ? body.items : []).map((item) => ({
    id: asText(item.id),
    rawName: asText(item.rawName),
    displayName: asText(item.displayName) || asText(item.rawName),
    category: categoryValue(item.category),
    quantity: numberValue(item.quantity) || 1,
    unitPrice: numberValue(item.unitPrice),
    totalPrice: numberValue(item.totalPrice),
    isResaleItem: item.isResaleItem === true,
    memo: asText(item.memo)
  }));

  return {
    receiptId,
    companyName,
    year: purchaseDate.slice(0, 4),
    monthName: getThaiMonthName(purchaseDate),
    imageDataUrl,
    fileName,
    ocrText: asText(body.ocrText),
    expense,
    items
  };
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const accessToken = session?.googleAccessToken;

  if (!accessToken) {
    return NextResponse.json(
      {
        success: false,
        error: "Google login is required."
      },
      { status: 401 }
    );
  }

  if (session.googleTokenError) {
    return NextResponse.json(
      {
        success: false,
        error: "Google session expired. Please sign in again."
      },
      { status: 401 }
    );
  }

  try {
    const body = normalizeBody((await request.json()) as SaveExpenseBody);
    const storage = await getOrCreateExpenseStorageStructure(accessToken, body.companyName, body.year);
    const spreadsheet = await getOrCreateExpenseSpreadsheet(accessToken, body.companyName, body.year, storage.yearFolder.id);

    await ensureSheetExists(accessToken, spreadsheet.id, "รวม");
    await ensureSheetExists(accessToken, spreadsheet.id, body.monthName);
    await ensureHeaderRow(accessToken, spreadsheet.id, "รวม");
    await ensureHeaderRow(accessToken, spreadsheet.id, body.monthName);

    const driveFile = body.imageDataUrl
      ? await uploadReceiptImage({
          accessToken,
          imagesFolderId: storage.imagesFolder.id,
          imageDataUrl: body.imageDataUrl,
          fileName: body.fileName
        })
      : null;

    const rows = mapExpenseToSheetRows(body.expense, body.items, driveFile?.webViewLink ?? "");
    await appendRows(accessToken, spreadsheet.id, "รวม", rows);
    await appendRows(accessToken, spreadsheet.id, body.monthName, rows);

    return NextResponse.json({
      success: true,
      driveFile,
      spreadsheet,
      folders: {
        rootFolderId: storage.rootFolder.id,
        companyFolderId: storage.companyFolder.id,
        yearFolderId: storage.yearFolder.id,
        imagesFolderId: storage.imagesFolder.id
      },
      sheetNames: ["รวม", body.monthName]
    });
  } catch (error) {
    console.error("Google save expense failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Could not save to Google."
      },
      { status: 500 }
    );
  }
}
