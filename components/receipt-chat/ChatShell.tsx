"use client";

import { useEffect, useRef, useState } from "react";
import { ChatComposer } from "@/components/receipt-chat/ChatComposer";
import { ChatHeader } from "@/components/receipt-chat/ChatHeader";
import { ChatMessageList } from "@/components/receipt-chat/ChatMessageList";
import { OcrTextSheet } from "@/components/receipt-chat/OcrTextSheet";
import { ReceiptEditSheet } from "@/components/receipt-chat/ReceiptEditSheet";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type {
  ChatReceipt,
  ChatReceiptEntry,
  ChatReceiptItem,
  ReceiptBatchProgress
} from "@/components/receipt-chat/types";
import { mockReceipt } from "@/components/receipt-chat/types";
import { defaultExpenseForm, type ExpenseFormState } from "@/components/expenses/new/types";
import { addExpense as addDashboardExpense } from "@/lib/db";
import { saveReceiptWithItems } from "@/lib/local/db";
import {
  GEMINI_MODEL_AUTO,
  GEMINI_MODEL_OPTIONS,
  isGeminiModelPreference,
  type GeminiModelPreference
} from "@/lib/gemini-models";
import { getGeminiUsage, incrementGeminiUsage, type GeminiUsage } from "@/lib/local/gemini-usage";
import { getVisionUsage, incrementVisionUsage, type VisionUsage } from "@/lib/local/vision-usage";
import { extractPurchaseDateFromOcrText } from "@/lib/local/parser";
import { resolveExpenseFormExchangeRate } from "@/lib/exchange-rate-client";
import { saveExpenseWithItemsDoc, updateExpenseWithItemsDoc, useFirebaseUser } from "@/lib/firebase/firestore";
import { useBusinesses } from "@/hooks/useBusinesses";
import { checkOcrQuality } from "@/lib/ocr-quality";
import type { GeminiReceiptExtraction } from "@/lib/receiptSchema";
import type { OcrLanguage, Receipt, ReceiptItem } from "@/lib/types/receipt";
import type { Expense, ExpenseItem, ReceiptImage } from "@/lib/expenseTypes";
import { createId } from "@/lib/utils";

const mockReceiptImageDataUrl =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='900' viewBox='0 0 640 900'%3E%3Crect width='640' height='900' fill='%23f8fafc'/%3E%3Crect x='110' y='120' width='420' height='660' rx='28' fill='white' stroke='%23cbd5e1' stroke-width='4'/%3E%3Ctext x='320' y='430' text-anchor='middle' font-family='Arial' font-size='34' font-weight='700' fill='%2364748b'%3EMock Receipt%3C/text%3E%3Ctext x='320' y='480' text-anchor='middle' font-family='Arial' font-size='24' fill='%2394a3b8'%3Ereceipt-chat mock mode%3C/text%3E%3C/svg%3E";

const geminiModelStorageKey = "receipt-chat-gemini-model";

type VisionOcrResponse =
  | { success: true; ocrText: string }
  | { success: false; error?: string };

type GeminiExtractResponse =
  | { success: true; data: GeminiReceiptExtraction }
  | { success: false; error?: string; rawOutput?: string };

type GoogleUploadResponse =
  | {
      success: true;
      driveFile?: {
        id: string;
        name?: string;
        webViewLink?: string;
      } | null;
      folders?: {
        rootFolderId?: string;
        companyFolderId?: string;
        yearFolderId?: string;
        imagesFolderId?: string;
      };
      imageFileName?: string;
    }
  | { success: false; error?: string };

type DriveUploadInput = {
  expenseId: string;
  companyName: string;
  purchaseDate: string;
  storeName: string;
  imageDataUrl: string;
  fileName: string;
};

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Cannot read image file."));
    reader.readAsDataURL(blob);
  });
}

function isHeicFile(file: File) {
  const name = file.name.toLowerCase();
  return file.type === "image/heic" || file.type === "image/heif" || name.endsWith(".heic") || name.endsWith(".heif");
}

async function imageFileToDataUrl(file: File) {
  if (!isHeicFile(file)) return blobToDataUrl(file);

  const heicModule = await import("heic2any");
  const heic2any = (heicModule.default ?? heicModule) as (options: {
    blob: Blob;
    toType: string;
    quality: number;
  }) => Promise<Blob | Blob[]>;
  const converted = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: 0.9
  });
  return blobToDataUrl(Array.isArray(converted) ? converted[0] : converted);
}

function loadImage(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Cannot load receipt image."));
    image.src = dataUrl;
  });
}

function dataUrlToBlob(dataUrl: string) {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/data:(.*?);base64/)?.[1] || "image/jpeg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mime });
}

async function compressImageForVision(dataUrl: string, maxWidth = 1600, quality = 0.82) {
  const image = await loadImage(dataUrl);
  const scale = Math.min(1, maxWidth / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  const context = canvas.getContext("2d");
  if (!context) return dataUrlToBlob(dataUrl);

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  return new Promise<Blob>((resolve) => {
    canvas.toBlob((blob) => resolve(blob ?? dataUrlToBlob(dataUrl)), "image/jpeg", quality);
  });
}

async function parseJsonResponse<T>(response: Response, fallbackMessage: string) {
  const responseText = await response.text();

  try {
    return JSON.parse(responseText) as T;
  } catch {
    return {
      success: false,
      error: responseText || `${fallbackMessage} HTTP ${response.status}`
    } as T;
  }
}

async function fetchGeminiExtraction(
  ocrText: string,
  ocrLanguage: OcrLanguage,
  geminiModel: GeminiModelPreference
) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 60_000);

  try {
    const response = await fetch("/api/gemini/extract-receipt", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      signal: controller.signal,
      body: JSON.stringify({
        ocrText,
        ocrLanguage,
        geminiModel
      })
    });
    const result = await parseJsonResponse<GeminiExtractResponse>(response, "Gemini extraction failed.");
    return { response, result };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Gemini ใช้เวลานานเกิน 1 นาที ข้ามรายการนี้");
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function uploadReceiptImageToDrive(input: DriveUploadInput) {
  const response = await fetch("/api/google/upload-receipt-image", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });
  const result = (await parseJsonResponse<GoogleUploadResponse>(
    response,
    "Google Drive upload failed."
  )) as GoogleUploadResponse;

  if (response.status === 401) {
    throw new Error("กรุณาเข้าสู่ระบบ Google ก่อนอัปโหลดรูป");
  }

  if (!response.ok || !result.success) {
    throw new Error(
      result.success
        ? `Google Drive upload failed with HTTP ${response.status}`
        : result.error || "Google Drive upload failed."
    );
  }

  return result;
}

function chatReceiptFromExtraction(
  data: GeminiReceiptExtraction,
  ocrText: string,
  purchaseDateOverride?: string | null
): ChatReceipt {
  return {
    storeName: data.storeName ?? "",
    purchaseDate: purchaseDateOverride ?? data.purchaseDate ?? "",
    originalCurrency: "JPY",
    baseCurrency: "THB",
    exchangeRate: 0,
    subtotal: data.subtotal,
    tax: data.tax,
    shipping: data.shipping,
    total: data.total,
    ocrText,
    aiMemo: data.aiMemo,
    items: data.items.map((item) => ({
      id: createId(),
      rawName: item.rawName,
      displayName: item.displayName,
      category: item.category,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      isResaleItem: item.isResaleItem,
      memo: item.memo
    }))
  };
}

function blankItem(): ChatReceiptItem {
  return {
    id: createId(),
    rawName: "",
    displayName: "",
    category: "Other",
    quantity: 1,
    unitPrice: 0,
    totalPrice: 0,
    isResaleItem: false,
    memo: "要確認"
  };
}

function emptyBatchProgress(): ReceiptBatchProgress {
  return {
    active: false,
    total: 0,
    done: 0,
    success: 0,
    failed: 0,
    currentFileName: null
  };
}

const initialVisionUsage: VisionUsage = {
  todayKey: "",
  monthKey: "",
  callsToday: 0,
  callsThisMonth: 0,
  dailyLimit: 30,
  monthlyLimit: 900
};

const initialGeminiUsage: GeminiUsage = {
  todayKey: "",
  callsToday: 0,
  dailyLimit: 50
};

export function ChatShell({ mockMode = false }: { mockMode?: boolean }) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [receipts, setReceipts] = useState<ChatReceiptEntry[]>([]);
  const [batch, setBatch] = useState<ReceiptBatchProgress>(emptyBatchProgress());
  const [ocrReceiptId, setOcrReceiptId] = useState<string | null>(null);
  const [editReceiptId, setEditReceiptId] = useState<string | null>(null);
  const [refreshingExchangeRateReceiptId, setRefreshingExchangeRateReceiptId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [geminiModel, setGeminiModel] = useState<GeminiModelPreference>(GEMINI_MODEL_AUTO);
  const [visionUsage, setVisionUsage] = useState(initialVisionUsage);
  const [geminiUsage, setGeminiUsage] = useState(initialGeminiUsage);
  const { user } = useFirebaseUser();
  const { activeBusiness, activeBusinessId, isLoggedIn } = useBusinesses();
  const ocrLanguage: OcrLanguage = "jpn+eng";

  useEffect(() => {
    setVisionUsage(getVisionUsage());
    setGeminiUsage(getGeminiUsage());
    const storedModel = localStorage.getItem(geminiModelStorageKey);
    if (isGeminiModelPreference(storedModel)) {
      setGeminiModel(storedModel);
    }
  }, []);

  useEffect(() => {
    if (!mockMode) return;
    setReceipts([
      {
        id: "mock-receipt",
        sourceName: "mock receipt",
        imageDataUrl: mockReceiptImageDataUrl,
        receipt: mockReceipt,
        phase: "ready",
        saved: false,
        error: null,
        qualityWarning: null
      }
    ]);
    setBatch(emptyBatchProgress());
    setOcrReceiptId("mock-receipt");
    setEditReceiptId("mock-receipt");
  }, [mockMode]);

  useEffect(() => {
    void fetch("/api/vision/ocr", {
      method: "GET",
      cache: "no-store"
    }).catch(() => undefined);
  }, []);

  function loadMockReceipt() {
    setReceipts([
      {
        id: "mock-receipt",
        sourceName: "mock receipt",
        imageDataUrl: mockReceiptImageDataUrl,
        receipt: mockReceipt,
        phase: "ready",
        saved: false,
        error: null,
        qualityWarning: null
      }
    ]);
    setBatch(emptyBatchProgress());
    setOcrReceiptId("mock-receipt");
    setEditReceiptId("mock-receipt");
  }

  function updateReceiptEntry(receiptId: string, updater: (entry: ChatReceiptEntry) => ChatReceiptEntry) {
    setReceipts((current) => current.map((entry) => (entry.id === receiptId ? updater(entry) : entry)));
  }

  function updateReceipt(receiptId: string, updater: (receipt: ChatReceipt) => ChatReceipt) {
    updateReceiptEntry(receiptId, (entry) => {
      if (!entry.receipt) return entry;
      return {
        ...entry,
        receipt: updater(entry.receipt),
        saved: false
      };
    });
  }

  function selectedReceipt(receiptId: string | null) {
    if (!receiptId) return null;
    return receipts.find((entry) => entry.id === receiptId)?.receipt ?? null;
  }

  function updateGeminiModel(nextModel: GeminiModelPreference) {
    setGeminiModel(nextModel);
    localStorage.setItem(geminiModelStorageKey, nextModel);
  }

  async function processFileToEntry(file: File): Promise<ChatReceiptEntry> {
    const receiptId = createId();
    let nextImageDataUrl = "";
    let qualityWarning: string | null = null;
    let ocrPurchaseDate: string | null = null;

    try {
      nextImageDataUrl = await imageFileToDataUrl(file);

      const nextVisionUsage = getVisionUsage();
      setVisionUsage(nextVisionUsage);
      // Limit display stays visible, but receipt-chat no longer blocks OCR calls.
      // if (!canCallVision(nextVisionUsage)) {
      //   throw new Error("ถึงลิมิต OCR แล้ว กรุณารอหรือปรับ limit ใน Settings");
      // }

      const imageBlob = await compressImageForVision(nextImageDataUrl);
      const formData = new FormData();
      formData.append("image", imageBlob, "receipt.jpg");

      const visionResponse = await fetch("/api/vision/ocr", {
        method: "POST",
        body: formData
      });
      const visionResult = await parseJsonResponse<VisionOcrResponse>(visionResponse, "Google Vision OCR failed.");

      if (!visionResponse.ok || !visionResult.success) {
        throw new Error(
          visionResult.success
            ? `Google Vision OCR failed with HTTP ${visionResponse.status}`
            : visionResult.error || "Google Vision OCR failed."
        );
      }

      setVisionUsage(incrementVisionUsage());
      const ocrText = visionResult.ocrText.trim();
      ocrPurchaseDate = extractPurchaseDateFromOcrText(ocrText);
      console.log("[receipt-chat] vision ocr result", {
        ocrLength: ocrText.length,
        ocrPreview: ocrText.slice(0, 500),
        ocrPurchaseDate
      });
      const quality = checkOcrQuality(ocrText);
      qualityWarning = quality.lowQuality
        ? "OCRの精度が低い可能性があります。レシート部分だけをクロップするか、撮り直してください。"
        : null;

      const nextGeminiUsage = getGeminiUsage();
      setGeminiUsage(nextGeminiUsage);
      // Limit display stays visible, but receipt-chat no longer blocks Gemini calls.
      // if (!canCallGemini(nextGeminiUsage)) {
      //   throw new Error("ถึงลิมิต Gemini แล้ว กรุณารอหรือเพิ่มลิมิตก่อนใช้งานต่อ");
      // }
      const { response: geminiResponse, result: geminiResult } = await fetchGeminiExtraction(ocrText, ocrLanguage, geminiModel);

      if (!geminiResponse.ok || !geminiResult.success) {
        console.log("[receipt-chat] gemini extraction failed", {
          status: geminiResponse.status,
          error: geminiResult.success ? null : geminiResult.error ?? null,
          rawOutput: geminiResult.success ? null : geminiResult.rawOutput ?? null
        });
        throw new Error(
          geminiResult.success
            ? `Gemini extraction failed with HTTP ${geminiResponse.status}`
            : geminiResult.error || "Gemini extraction failed."
        );
      }

      setGeminiUsage(incrementGeminiUsage());
      const dateWarning =
        !ocrPurchaseDate && !geminiResult.data.purchaseDate
          ? "ไม่พบวันที่ซื้อที่ชัดเจน ระบบจะปล่อยวันที่ว่างไว้ให้กรอกเอง"
          : null;
      console.log("[receipt-chat] gemini extraction success", {
        storeName: geminiResult.data.storeName,
        purchaseDate: ocrPurchaseDate ?? geminiResult.data.purchaseDate,
        geminiPurchaseDate: geminiResult.data.purchaseDate,
        ocrPurchaseDate,
        subtotal: geminiResult.data.subtotal,
        tax: geminiResult.data.tax,
        shipping: geminiResult.data.shipping,
        total: geminiResult.data.total,
        itemCount: geminiResult.data.items.length,
        items: geminiResult.data.items.map((item) => ({
          rawName: item.rawName,
          displayName: item.displayName,
          category: item.category,
          quantity: item.quantity,
          totalPrice: item.totalPrice,
          isResaleItem: item.isResaleItem,
          memo: item.memo
        }))
      });

      const extractedReceipt = chatReceiptFromExtraction(geminiResult.data, ocrText, ocrPurchaseDate);
      const resolved = await resolveExpenseFormExchangeRate(receiptToExpenseForm(extractedReceipt));
      const finalReceipt: ChatReceipt = {
        ...extractedReceipt,
        originalCurrency: resolved.originalCurrency,
        baseCurrency: resolved.baseCurrency,
        exchangeRate: resolved.exchangeRate
      };

      return {
        id: receiptId,
        sourceName: file.name,
        imageDataUrl: nextImageDataUrl,
        receipt: finalReceipt,
        phase: "ready",
        saved: false,
        error: null,
        qualityWarning: [qualityWarning, dateWarning].filter(Boolean).join(" ") || null
      };
    } catch (err) {
      return {
        id: receiptId,
        sourceName: file.name,
        imageDataUrl: nextImageDataUrl,
        receipt: null,
        phase: "error",
        saved: false,
        error: err instanceof Error ? err.message : "อ่านข้อความไม่สำเร็จ",
        qualityWarning
      };
    }
  }

  async function handleFiles(files: FileList | File[]) {
    const nextFiles = Array.from(files).filter((file): file is File => Boolean(file));
    if (nextFiles.length === 0) return;

    if (mockMode) {
      loadMockReceipt();
      return;
    }

    setOcrReceiptId(null);
    setEditReceiptId(null);
    setReceipts([]);
    setBatch({
      active: true,
      total: nextFiles.length,
      done: 0,
      success: 0,
      failed: 0,
      currentFileName: nextFiles[0]?.name ?? null
    });

    const nextReceipts: ChatReceiptEntry[] = [];
    let successCount = 0;
    let failedCount = 0;

    for (const file of nextFiles) {
      setBatch((current) => ({
        ...current,
        currentFileName: file.name
      }));

      console.log("[receipt-chat] batch file start", {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size
      });

      const entry = await processFileToEntry(file);
      nextReceipts.push(entry);

      if (entry.phase === "ready") {
        successCount += 1;
      } else {
        failedCount += 1;
      }

      setBatch((current) => ({
        ...current,
        done: Math.min(current.total, current.done + 1),
        success: successCount,
        failed: failedCount,
        currentFileName: file.name
      }));
    }

    setReceipts(nextReceipts);
    setBatch({
      active: false,
      total: nextFiles.length,
      done: nextFiles.length,
      success: successCount,
      failed: failedCount,
      currentFileName: null
    });
  }

  function addItem(receiptId: string) {
    updateReceipt(receiptId, (current) => ({
      ...current,
      items: [...current.items, blankItem()]
    }));
    setEditReceiptId(receiptId);
  }

  function toggleResale(receiptId: string, itemId: string, checked: boolean) {
    updateReceipt(receiptId, (current) => ({
      ...current,
      items: current.items.map((item) => (item.id === itemId ? { ...item, isResaleItem: checked } : item))
    }));
  }

  function receiptToExpenseForm(nextReceipt: ChatReceipt): ExpenseFormState {
    return {
      ...defaultExpenseForm,
      receiptDate: nextReceipt.purchaseDate || "",
      storeName: nextReceipt.storeName || "",
      detail: nextReceipt.items[0]?.displayName ? `ค่า ${nextReceipt.items[0].displayName}` : "",
      documentType: "receipt",
      category: nextReceipt.items[0]?.category ?? "Other",
      paymentStatus: "paid",
      amount: nextReceipt.total ?? 0,
      currency: nextReceipt.originalCurrency,
      originalCurrency: nextReceipt.originalCurrency,
      baseCurrency: nextReceipt.baseCurrency,
      exchangeRate: nextReceipt.exchangeRate,
      exchangeRateSource: "manual",
      exchangeRateDate: nextReceipt.purchaseDate || null,
      manualAmountOverride: true,
      subtotalOriginal: nextReceipt.subtotal ?? nextReceipt.total ?? 0,
      shipping: nextReceipt.shipping ?? 0,
      vatOriginal: nextReceipt.tax ?? 0,
      whtOriginal: 0,
      totalOriginal: nextReceipt.total ?? 0,
      subtotalBase: 0,
      shippingBase: 0,
      vatBase: 0,
      whtBase: 0,
      totalBase: 0,
      requester: "",
      hasTaxInvoice: false,
      invoiceNumber: "",
      subtotal: nextReceipt.subtotal ?? 0,
      tax: nextReceipt.tax ?? 0,
      withholdingTax: 0,
      expenseType: "รายจ่าย",
      subCategory: "",
      vendorName: nextReceipt.storeName || "",
      vendorTaxId: "",
      vendorBranchName: "",
      vendorBranchCode: "",
      vendorAddress: "",
      note: nextReceipt.aiMemo || ""
    };
  }

  async function refreshReceiptExchangeRate(receiptId: string) {
    const currentReceipt = receipts.find((entry) => entry.id === receiptId)?.receipt;
    if (!currentReceipt) return;

    try {
      console.log("[receipt-chat] refresh exchange rate clicked", {
        originalCurrency: currentReceipt.originalCurrency,
        baseCurrency: currentReceipt.baseCurrency,
        purchaseDate: currentReceipt.purchaseDate,
        exchangeRate: currentReceipt.exchangeRate
      });
      setRefreshingExchangeRateReceiptId(receiptId);
      const resolved = await resolveExpenseFormExchangeRate(receiptToExpenseForm(currentReceipt));
      console.log("[receipt-chat] refresh exchange rate resolved", {
        exchangeRate: resolved.exchangeRate,
        exchangeRateSource: resolved.exchangeRateSource,
        exchangeRateDate: resolved.exchangeRateDate
      });
      updateReceipt(receiptId, (nextReceipt) => ({
        ...nextReceipt,
        originalCurrency: resolved.originalCurrency,
        baseCurrency: resolved.baseCurrency,
        exchangeRate: resolved.exchangeRate
      }));
      console.log("[receipt-chat] receipt updated after refresh");
    } catch (err) {
      console.error("[receipt-chat] refresh exchange rate failed", err);
      updateReceiptEntry(receiptId, (entry) => ({
        ...entry,
        error: err instanceof Error ? err.message : "ดึงอัตราแลกเปลี่ยนไม่สำเร็จ"
      }));
    } finally {
      setRefreshingExchangeRateReceiptId((current) => (current === receiptId ? null : current));
    }
  }

  async function saveReceipt(receiptId: string) {
    const currentEntry = receipts.find((entry) => entry.id === receiptId);
    const receipt = currentEntry?.receipt;
    if (!receipt || !currentEntry) return;

    try {
      const timestamp = new Date().toISOString();
      const nextReceipt = receipt;
      const resolvedReceiptForm = await resolveExpenseFormExchangeRate(receiptToExpenseForm(nextReceipt));
      const companyName = activeBusiness?.name ?? "ธุรกิจของฉัน";
      const subtotalOriginal = nextReceipt.subtotal ?? nextReceipt.total ?? 0;
      const vatOriginal = nextReceipt.tax ?? 0;
      const shippingOriginal = nextReceipt.shipping ?? 0;
      const totalOriginal = nextReceipt.total ?? 0;
      const amountFields = {
        subtotalOriginal: subtotalOriginal + shippingOriginal,
        shipping: shippingOriginal,
        vatOriginal,
        whtOriginal: 0,
        totalOriginal,
        subtotalBase: (subtotalOriginal + shippingOriginal) * resolvedReceiptForm.exchangeRate,
        shippingBase: shippingOriginal * resolvedReceiptForm.exchangeRate,
        vatBase: vatOriginal * resolvedReceiptForm.exchangeRate,
        whtBase: 0,
        totalBase: totalOriginal * resolvedReceiptForm.exchangeRate,
        exchangeRate: resolvedReceiptForm.exchangeRate
      };
      const savedReceiptId = createId();
      const savedReceipt: Receipt = {
        id: savedReceiptId,
        imageDataUrl: currentEntry.imageDataUrl,
        storeName: nextReceipt.storeName || null,
        purchaseDate: nextReceipt.purchaseDate || null,
        subtotal: amountFields.subtotalOriginal || null,
        tax: amountFields.vatOriginal || null,
        total: amountFields.totalOriginal,
        aiMemo: nextReceipt.aiMemo,
        ocrLanguage,
        ocrText: nextReceipt.ocrText,
        status: "saved",
        createdAt: timestamp,
        updatedAt: timestamp
      };
      const savedItems: ReceiptItem[] = nextReceipt.items.map((item) => ({
        ...item,
        receiptId: savedReceiptId,
        createdAt: timestamp,
        updatedAt: timestamp
      }));
      const amountFieldsWithRate = amountFields;

      await saveReceiptWithItems(savedReceipt, savedItems);

      if (isLoggedIn && user && activeBusinessId) {
        const dashboardExpense: Expense = {
          id: savedReceiptId,
          businessId: activeBusinessId,
          createdAt: timestamp,
          updatedAt: timestamp,
          purchaseDate: resolvedReceiptForm.receiptDate || nextReceipt.purchaseDate || timestamp.slice(0, 10),
          uploadDate: timestamp.slice(0, 10),
          documentType: "ใบเสร็จรับเงิน",
          storeName: nextReceipt.storeName || "",
          detail: nextReceipt.items[0]?.displayName ? `ค่า ${nextReceipt.items[0].displayName}` : "",
          payerName: nextReceipt.storeName || "",
          paymentStatus: "paid",
          subtotal: amountFieldsWithRate.subtotalOriginal || null,
          tax: amountFieldsWithRate.vatOriginal || null,
          withholdingTax: 0,
          total: amountFieldsWithRate.totalOriginal ?? 0,
          currency: resolvedReceiptForm.originalCurrency,
          originalCurrency: resolvedReceiptForm.originalCurrency,
          baseCurrency: resolvedReceiptForm.baseCurrency,
          exchangeRate: amountFieldsWithRate.exchangeRate,
          exchangeRateSource: resolvedReceiptForm.exchangeRateSource,
          exchangeRateDate: resolvedReceiptForm.exchangeRateDate,
          manualAmountOverride: true,
          subtotalOriginal: amountFieldsWithRate.subtotalOriginal,
          shipping: amountFieldsWithRate.shipping,
          vatOriginal: amountFieldsWithRate.vatOriginal,
          whtOriginal: 0,
          totalOriginal: amountFieldsWithRate.totalOriginal,
          subtotalBase: amountFieldsWithRate.subtotalBase,
          shippingBase: amountFieldsWithRate.shippingBase,
          vatBase: amountFieldsWithRate.vatBase,
          whtBase: 0,
          totalBase: amountFieldsWithRate.totalBase,
          categorySummary: nextReceipt.items[0]?.category ?? "Other",
          companyName,
          invoiceNumber: "",
          hasTaxInvoice: false,
          expenseType: "รายจ่าย",
          subCategory: "",
          requesterName: "",
          vendorName: nextReceipt.storeName || "",
          vendorTaxId: "",
          vendorBranchName: "",
          vendorBranchCode: "",
          vendorAddress: "",
          imageBlobId: `expense-image-${savedReceiptId}`,
          driveFolderId: undefined,
          imageDriveFileId: "",
          imageDriveUrl: "",
          ocrText: nextReceipt.ocrText,
          aiMemo: nextReceipt.aiMemo,
          syncStatus: "synced"
        };
        const dashboardItems: ExpenseItem[] = savedItems.map((item) => ({
          id: item.id,
          expenseId: savedReceiptId,
          businessId: activeBusinessId,
          rawName: item.rawName,
          displayName: item.displayName,
          category: item.category,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          isResaleItem: item.isResaleItem,
          memo: item.memo,
          createdAt: timestamp
        }));
        const dashboardImage: ReceiptImage = {
          id: `expense-image-${savedReceiptId}`,
          imageDataUrl: currentEntry.imageDataUrl,
          createdAt: timestamp
        };

        void (async () => {
          try {
            const drivePurchaseDate = resolvedReceiptForm.receiptDate || nextReceipt.purchaseDate || timestamp.slice(0, 10);
            await saveExpenseWithItemsDoc({
              user,
              businessId: activeBusinessId,
              expense: {
                id: savedReceiptId,
                purchaseDate: resolvedReceiptForm.receiptDate || nextReceipt.purchaseDate || timestamp.slice(0, 10),
                uploadDate: timestamp.slice(0, 10),
                documentType: "ใบเสร็จรับเงิน",
                paymentStatus: "paid",
                hasTaxInvoice: false,
                invoiceNumber: "",
                storeName: nextReceipt.storeName || "",
                vendorName: nextReceipt.storeName || "",
                vendorTaxId: "",
                vendorBranchName: "",
                vendorBranchCode: "",
                vendorAddress: "",
                detail: nextReceipt.items[0]?.displayName ? `ค่า ${nextReceipt.items[0].displayName}` : "",
                subtotal: amountFields.subtotalOriginal || null,
                shipping: amountFields.shipping || null,
                tax: amountFields.vatOriginal || null,
                withholdingTax: 0,
                total: amountFields.totalOriginal || null,
                currency: resolvedReceiptForm.originalCurrency,
                originalCurrency: resolvedReceiptForm.originalCurrency,
                baseCurrency: resolvedReceiptForm.baseCurrency,
                exchangeRate: amountFields.exchangeRate,
                exchangeRateSource: resolvedReceiptForm.exchangeRateSource,
                exchangeRateDate: resolvedReceiptForm.exchangeRateDate,
                manualAmountOverride: true,
                subtotalOriginal: amountFields.subtotalOriginal,
                vatOriginal: amountFields.vatOriginal,
                whtOriginal: 0,
                totalOriginal: amountFields.totalOriginal,
                subtotalBase: amountFields.subtotalBase,
                shippingBase: amountFields.shippingBase,
                vatBase: amountFields.vatBase,
                whtBase: 0,
                totalBase: amountFields.totalBase,
                expenseType: "รายจ่าย",
                category: nextReceipt.items[0]?.category ?? "Other",
                subCategory: "",
                requesterName: "",
                memo: nextReceipt.aiMemo,
                aiMemo: nextReceipt.aiMemo,
                aiConfidence: "medium",
                status: "confirmed",
                extractionMode: "manual",
                imageDriveFileId: "",
                imageDriveUrl: "",
                imageFileName: "",
                ocrText: nextReceipt.ocrText
              },
              items: nextReceipt.items.map((item) => ({
                id: item.id,
                rawName: item.rawName,
                displayName: item.displayName,
                category: item.category,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice,
                isResaleItem: item.isResaleItem,
                productId: null,
                memo: item.memo
              }))
            });
            await addDashboardExpense(dashboardExpense, dashboardItems, dashboardImage);
            console.log("[receipt-chat] background drive upload started", {
              expenseId: savedReceiptId,
              companyName,
              purchaseDate: drivePurchaseDate
            });
            const googleResult = await uploadReceiptImageToDrive({
              expenseId: savedReceiptId,
              companyName,
              purchaseDate: drivePurchaseDate,
              storeName: nextReceipt.storeName || "",
              imageDataUrl: currentEntry.imageDataUrl,
              fileName: `receipt-${savedReceiptId}.jpg`
            });
            console.log("[receipt-chat] background drive upload success", {
              expenseId: savedReceiptId,
              driveFileId: googleResult.driveFile?.id ?? null,
              driveUrl: googleResult.driveFile?.webViewLink ?? null,
              imageFileName: googleResult.imageFileName ?? null
            });
            await updateExpenseWithItemsDoc({
              user,
              businessId: activeBusinessId,
              expenseId: savedReceiptId,
              expense: {
                imageDriveFileId: googleResult.driveFile?.id ?? "",
                imageDriveUrl: googleResult.driveFile?.webViewLink ?? "",
                imageFileName: googleResult.imageFileName ?? ""
              },
              items: nextReceipt.items.map((item) => ({
                id: item.id,
                rawName: item.rawName,
                displayName: item.displayName,
                category: item.category,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice,
                isResaleItem: item.isResaleItem,
                productId: null,
                memo: item.memo
              }))
            });
          } catch (backgroundError) {
            console.error("[receipt-chat] background drive upload failed", backgroundError);
          }
        })();
      }

      updateReceiptEntry(receiptId, (entry) => ({
        ...entry,
        saved: true,
        error: null
      }));
    } catch (saveError) {
      updateReceiptEntry(receiptId, (entry) => ({
        ...entry,
        error: saveError instanceof Error ? saveError.message : "บันทึกไม่สำเร็จ"
      }));
    }
  }

  const selectedOcrReceipt = selectedReceipt(ocrReceiptId);
  const selectedEditReceipt = selectedReceipt(editReceiptId);
  const refreshingExchangeRate = refreshingExchangeRateReceiptId !== null;
  const selectedGeminiModelOption = GEMINI_MODEL_OPTIONS.find((option) => option.value === geminiModel);

  return (
    <div className="relative mx-auto flex h-[100dvh] w-full max-w-full flex-col overflow-x-hidden bg-[#F7F8FA] shadow-2xl sm:max-w-[480px] sm:border-x sm:border-slate-200">
      <ChatHeader
        visionUsage={visionUsage}
        geminiUsage={geminiUsage}
        onSettingsClick={() => setSettingsOpen(true)}
      />

      <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain pb-28">
        <ChatMessageList
          onCamera={() => cameraInputRef.current?.click()}
          onGallery={() => galleryInputRef.current?.click()}
          onLoadMock={loadMockReceipt}
          onViewOcr={setOcrReceiptId}
          onEditAll={setEditReceiptId}
          onAddItem={addItem}
          onSave={saveReceipt}
          onToggleResale={toggleResale}
          receipts={receipts}
          batch={batch}
        />
      </div>

      <ChatComposer
        onCamera={() => cameraInputRef.current?.click()}
        onGallery={() => galleryInputRef.current?.click()}
      />

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*,.heic,.heif"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          void handleFiles(event.target.files ?? []);
          event.currentTarget.value = "";
        }}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*,.heic,.heif"
        multiple
        className="hidden"
        onChange={(event) => {
          void handleFiles(event.target.files ?? []);
          event.currentTarget.value = "";
        }}
      />

      {selectedOcrReceipt ? (
        <OcrTextSheet
          open={ocrReceiptId !== null}
          onOpenChange={(open) => setOcrReceiptId(open ? ocrReceiptId : null)}
          ocrText={selectedOcrReceipt.ocrText}
        />
      ) : null}
      {selectedEditReceipt && editReceiptId ? (
        <ReceiptEditSheet
          open={editReceiptId !== null}
          onOpenChange={(open) => setEditReceiptId(open ? editReceiptId : null)}
          receipt={selectedEditReceipt}
          onChange={(nextReceipt) => {
            if (!editReceiptId) return;
            updateReceiptEntry(editReceiptId, (entry) => ({
              ...entry,
              receipt: nextReceipt,
              saved: false
            }));
          }}
          onRefreshExchangeRate={() => refreshReceiptExchangeRate(editReceiptId)}
          refreshingExchangeRate={refreshingExchangeRate}
        />
      ) : null}

      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetContent className="min-h-[100dvh] rounded-none bg-[#F7F8FA] sm:min-h-0 sm:rounded-2xl">
          <SheetHeader>
            <SheetTitle>ตั้งค่า AI</SheetTitle>
            <SheetDescription>เลือก Gemini model สำหรับแปลง OCR เป็นรายการสินค้า</SheetDescription>
          </SheetHeader>
          <div className="grid gap-4 px-4 py-4">
            <div className="grid gap-2 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
              <Label>Gemini model</Label>
              <Select value={geminiModel} onValueChange={(value) => updateGeminiModel(value as GeminiModelPreference)}>
                <SelectTrigger className="h-11 rounded-xl bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GEMINI_MODEL_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[12px] leading-5 text-slate-500">
                {selectedGeminiModelOption?.description ?? "ใช้ model ที่เลือกสำหรับใบเสร็จถัดไป"}
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
