"use client";

import { useEffect, useRef, useState } from "react";
import { ChatComposer } from "@/components/receipt-chat/ChatComposer";
import { ChatHeader } from "@/components/receipt-chat/ChatHeader";
import { ChatMessageList, type ChatPhase } from "@/components/receipt-chat/ChatMessageList";
import { OcrTextSheet } from "@/components/receipt-chat/OcrTextSheet";
import { ReceiptEditSheet } from "@/components/receipt-chat/ReceiptEditSheet";
import type { ChatReceipt, ChatReceiptItem } from "@/components/receipt-chat/types";
import { defaultExpenseForm, type ExpenseFormState } from "@/components/expenses/new/types";
import { saveReceiptWithItems } from "@/lib/local/db";
import { canCallGemini, getGeminiUsage, incrementGeminiUsage } from "@/lib/local/gemini-usage";
import { canCallVision, getVisionUsage, incrementVisionUsage } from "@/lib/local/vision-usage";
import { resolveExpenseFormExchangeRate } from "@/lib/exchange-rate-client";
import { saveExpenseWithItemsDoc, useFirebaseUser } from "@/lib/firebase/firestore";
import { useBusinesses } from "@/hooks/useBusinesses";
import { checkOcrQuality } from "@/lib/ocr-quality";
import type { GeminiReceiptExtraction } from "@/lib/receiptSchema";
import type { OcrLanguage, Receipt, ReceiptItem } from "@/lib/types/receipt";
import { createId } from "@/lib/utils";

type VisionOcrResponse =
  | { success: true; ocrText: string }
  | { success: false; error?: string };

type GeminiExtractResponse =
  | { success: true; data: GeminiReceiptExtraction }
  | { success: false; error?: string; rawOutput?: string };

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

function chatReceiptFromExtraction(data: GeminiReceiptExtraction, ocrText: string): ChatReceipt {
  return {
    storeName: data.storeName ?? "",
    purchaseDate: data.purchaseDate ?? "",
    originalCurrency: "JPY",
    baseCurrency: "THB",
    exchangeRate: 0,
    subtotal: data.subtotal,
    tax: data.tax,
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
    isResaleItem: true,
    memo: "要確認"
  };
}

export function ChatShell() {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const lastResolvedRateKeyRef = useRef<string | null>(null);
  const [phase, setPhase] = useState<ChatPhase>("idle");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ChatReceipt | null>(null);
  const [ocrOpen, setOcrOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qualityWarning, setQualityWarning] = useState<string | null>(null);
  const [visionUsage, setVisionUsage] = useState(() => getVisionUsage());
  const [geminiUsage, setGeminiUsage] = useState(() => getGeminiUsage());
  const { user } = useFirebaseUser();
  const { activeBusinessId, isLoggedIn } = useBusinesses();
  const ocrLanguage: OcrLanguage = "jpn+eng";

  useEffect(() => {
    void fetch("/api/vision/ocr", {
      method: "GET",
      cache: "no-store"
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!receipt) return;
    if (!receipt.purchaseDate || receipt.exchangeRate > 0) return;

    const key = `${receipt.purchaseDate}:${receipt.originalCurrency}->${receipt.baseCurrency}`;
    if (lastResolvedRateKeyRef.current === key) return;

    let cancelled = false;
    lastResolvedRateKeyRef.current = key;

    void (async () => {
      try {
        const resolved = await resolveExpenseFormExchangeRate(receiptToExpenseForm(receipt));
        if (cancelled) return;
        setReceipt((current) =>
          current
            ? {
                ...current,
                originalCurrency: resolved.originalCurrency,
                baseCurrency: resolved.baseCurrency,
                exchangeRate: resolved.exchangeRate
              }
            : current
        );
      } catch {
        if (!cancelled) {
          lastResolvedRateKeyRef.current = null;
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [receipt]);

  async function handleFile(file: File | null) {
    if (!file) return;

    setReceipt(null);
    setSaved(false);
    setError(null);
    setQualityWarning(null);
    setPhase("vision");

    try {
      const nextImageDataUrl = await imageFileToDataUrl(file);
      setImageDataUrl(nextImageDataUrl);

      const nextVisionUsage = getVisionUsage();
      setVisionUsage(nextVisionUsage);
      if (!canCallVision(nextVisionUsage)) {
        throw new Error("ถึงลิมิต OCR แล้ว กรุณารอหรือปรับ limit ใน Settings");
      }

      const imageBlob = await compressImageForVision(nextImageDataUrl);
      const formData = new FormData();
      formData.append("image", imageBlob, "receipt.jpg");

      const visionResponse = await fetch("/api/vision/ocr", {
        method: "POST",
        body: formData
      });
      const visionResult = await parseJsonResponse<VisionOcrResponse>(
        visionResponse,
        "Google Vision OCR failed."
      );

      if (!visionResponse.ok || !visionResult.success) {
        throw new Error(
          visionResult.success
            ? `Google Vision OCR failed with HTTP ${visionResponse.status}`
            : visionResult.error || "Google Vision OCR failed."
        );
      }

      setVisionUsage(incrementVisionUsage());
      const ocrText = visionResult.ocrText.trim();
      const quality = checkOcrQuality(ocrText);
      if (quality.lowQuality) {
        setQualityWarning("OCRの精度が低い可能性があります。レシート部分だけをクロップするか、撮り直してください。");
      }

      setPhase("gemini");
      const nextGeminiUsage = getGeminiUsage();
      setGeminiUsage(nextGeminiUsage);
      if (!canCallGemini(nextGeminiUsage)) {
        throw new Error("ถึงลิมิต Gemini แล้ว กรุณารอหรือเพิ่มลิมิตก่อนใช้งานต่อ");
      }
      const geminiResponse = await fetch("/api/gemini/extract-receipt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ocrText,
          ocrLanguage
        })
      });
      const geminiResult = await parseJsonResponse<GeminiExtractResponse>(
        geminiResponse,
        "Gemini extraction failed."
      );

      if (!geminiResponse.ok || !geminiResult.success) {
        throw new Error(
          geminiResult.success
            ? `Gemini extraction failed with HTTP ${geminiResponse.status}`
            : geminiResult.error || "Gemini extraction failed."
        );
      }

      setGeminiUsage(incrementGeminiUsage());
      setReceipt(chatReceiptFromExtraction(geminiResult.data, ocrText));
      setPhase("ready");
    } catch (err) {
      setPhase("idle");
      setError(err instanceof Error ? err.message : "อ่านข้อความไม่สำเร็จ");
    }
  }

  function addItem() {
    setReceipt((current) => {
      if (!current) return current;
      return { ...current, items: [...current.items, blankItem()] };
    });
    setEditOpen(true);
  }

  function toggleResale(itemId: string, checked: boolean) {
    setReceipt((current) => {
      if (!current) return current;
      return {
        ...current,
        items: current.items.map((item) =>
          item.id === itemId ? { ...item, isResaleItem: checked } : item
        )
      };
    });
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
      vatOriginal: nextReceipt.tax ?? 0,
      whtOriginal: 0,
      totalOriginal: nextReceipt.total ?? 0,
      subtotalBase: 0,
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

  async function saveReceipt() {
    if (!receipt || !imageDataUrl) return;

    try {
      const timestamp = new Date().toISOString();
      const nextReceipt = receipt;
      const resolvedReceiptForm = await resolveExpenseFormExchangeRate(receiptToExpenseForm(nextReceipt));
      const subtotalOriginal = nextReceipt.subtotal ?? nextReceipt.total ?? 0;
      const vatOriginal = nextReceipt.tax ?? 0;
      const totalOriginal = nextReceipt.total ?? 0;
      const amountFields = {
        subtotalOriginal,
        vatOriginal,
        whtOriginal: 0,
        totalOriginal,
        subtotalBase: subtotalOriginal * resolvedReceiptForm.exchangeRate,
        vatBase: vatOriginal * resolvedReceiptForm.exchangeRate,
        whtBase: 0,
        totalBase: totalOriginal * resolvedReceiptForm.exchangeRate,
        exchangeRate: resolvedReceiptForm.exchangeRate
      };
      const receiptId = createId();
      const savedReceipt: Receipt = {
        id: receiptId,
        imageDataUrl,
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
        receiptId,
        createdAt: timestamp,
        updatedAt: timestamp
      }));

      if (isLoggedIn && user && activeBusinessId) {
        await saveExpenseWithItemsDoc({
          user,
          businessId: activeBusinessId,
          expense: {
            id: receiptId,
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
      } else {
        await saveReceiptWithItems(savedReceipt, savedItems);
      }

      setSaved(true);
      setError(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "บันทึกไม่สำเร็จ");
    }
  }

  return (
    <div className="relative mx-auto flex h-[100dvh] w-full max-w-full flex-col overflow-x-hidden bg-[#F7F8FA] shadow-2xl sm:max-w-[480px] sm:border-x sm:border-slate-200">
      <ChatHeader visionUsage={visionUsage} geminiUsage={geminiUsage} />

      <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain pb-24">
        <ChatMessageList
          phase={phase}
          imageUrl={imageDataUrl}
          receipt={receipt}
          saved={saved}
          error={error}
          qualityWarning={qualityWarning}
          onCamera={() => cameraInputRef.current?.click()}
          onGallery={() => galleryInputRef.current?.click()}
          onViewOcr={() => setOcrOpen(true)}
          onEditAll={() => setEditOpen(true)}
          onAddItem={addItem}
          onSave={saveReceipt}
          onToggleResale={toggleResale}
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
        onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*,.heic,.heif"
        className="hidden"
        onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
      />

      {receipt ? (
        <>
          <OcrTextSheet open={ocrOpen} onOpenChange={setOcrOpen} ocrText={receipt.ocrText} />
          <ReceiptEditSheet
            open={editOpen}
            onOpenChange={setEditOpen}
            receipt={receipt}
            onChange={setReceipt}
          />
        </>
      ) : null}
    </div>
  );
}
