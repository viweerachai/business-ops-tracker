"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { Button } from "@/components/ui/button";
import { CreateExpenseFooter } from "@/components/expenses/new/CreateExpenseFooter";
import { DocumentPreviewCard } from "@/components/expenses/new/DocumentPreviewCard";
import { ExpenseSummarySection } from "@/components/expenses/ExpenseSummarySection";
import { patchSummaryAmounts } from "@/components/expenses/expenseSummaryUtils";
import { ExpenseFormCard } from "@/components/expenses/new/ExpenseFormCard";
import { ExpenseItemsCard } from "@/components/expenses/new/ExpenseItemsCard";
import {
  defaultExpenseForm,
  type ExpenseFormState,
  type ExpenseItemState,
  type ExpenseProcessingStatus
} from "@/components/expenses/new/types";
import { addExpense as addDashboardExpense } from "@/lib/db";
import type { Expense, ExpenseDocumentType, ExpenseItem, ExpensePaymentStatus, ReceiptImage } from "@/lib/expenseTypes";
import { useBusinesses } from "@/hooks/useBusinesses";
import { saveExpenseWithItemsDoc, useFirebaseUser } from "@/lib/firebase/firestore";
import { saveReceiptWithItems } from "@/lib/local/db";
import { canCallVision, getVisionUsage, incrementVisionUsage } from "@/lib/local/vision-usage";
import type { GeminiReceiptExtraction } from "@/lib/receiptSchema";
import type { OcrLanguage, Receipt, ReceiptItem as LocalReceiptItem } from "@/lib/types/receipt";
import { createId } from "@/lib/utils";

type HeicConverter = (options: {
  blob: Blob;
  toType: string;
  quality: number;
}) => Promise<Blob | Blob[]>;

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

const placeholderImageDataUrl =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='900' viewBox='0 0 640 900'%3E%3Crect width='640' height='900' fill='%23f8fafc'/%3E%3Crect x='120' y='120' width='400' height='660' rx='28' fill='white' stroke='%23cbd5e1' stroke-width='4' stroke-dasharray='18 14'/%3E%3Ctext x='320' y='440' text-anchor='middle' font-family='Arial' font-size='34' font-weight='700' fill='%2364748b'%3EReceipt%3C/text%3E%3Ctext x='320' y='490' text-anchor='middle' font-family='Arial' font-size='24' fill='%2394a3b8'%3Emanual entry%3C/text%3E%3C/svg%3E";
const googleSignInDraftKey = "expense-new-google-signin-draft";

function documentTypeLabel(value: ExpenseFormState["documentType"]): ExpenseDocumentType {
  if (value === "tax_invoice") return "ใบกำกับภาษี";
  if (value === "payment_voucher") return "รายจ่ายอื่น ๆ";
  return "ใบเสร็จรับเงิน";
}

function paymentStatusValue(value: ExpenseFormState["paymentStatus"]): ExpensePaymentStatus {
  if (value === "unpaid") return "pending";
  if (value === "review") return "review_needed";
  return "paid";
}

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
  const heic2any = (heicModule.default ?? heicModule) as HeicConverter;
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

function itemFromGemini(item: GeminiReceiptExtraction["items"][number]): ExpenseItemState {
  return {
    id: createId(),
    rawName: item.rawName,
    displayName: item.displayName,
    category: item.category,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    totalPrice: item.totalPrice,
    isResaleItem: item.isResaleItem,
    memo: item.memo
  };
}

export function NewExpenseClient() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const { activeBusiness, activeBusinessId, loading: businessLoading } = useBusinesses();
  const { user: firebaseUser, loading: firebaseLoading } = useFirebaseUser();
  const ocrLanguage: OcrLanguage = "jpn+eng";
  const [expenseId, setExpenseId] = useState(() => createId());
  const [form, setForm] = useState<ExpenseFormState>(defaultExpenseForm);
  const [items, setItems] = useState<ExpenseItemState[]>([]);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState("");
  const [status, setStatus] = useState<ExpenseProcessingStatus>("idle");
  const [, setMessage] = useState("พร้อมอ่าน OCR");
  const [error, setError] = useState<string | null>(null);
  const [showGoogleDialog, setShowGoogleDialog] = useState(false);
  const companyName = activeBusiness?.name ?? "ธุรกิจของฉัน";

  useEffect(() => {
    const rawDraft = sessionStorage.getItem(googleSignInDraftKey);
    if (!rawDraft) return;

    try {
      const draft = JSON.parse(rawDraft) as {
        expenseId?: string;
        form?: ExpenseFormState;
        items?: ExpenseItemState[];
        imageDataUrl?: string | null;
        fileName?: string | null;
        ocrText?: string;
      };
      if (draft.expenseId) setExpenseId(draft.expenseId);
      if (draft.form) setForm(draft.form);
      if (Array.isArray(draft.items)) setItems(draft.items);
      if (draft.imageDataUrl) setImageDataUrl(draft.imageDataUrl);
      if (draft.fileName) setFileName(draft.fileName);
      if (draft.ocrText) setOcrText(draft.ocrText);
      setMessage("เข้าสู่ระบบแล้ว กดสร้างรายจ่ายอีกครั้งเพื่อบันทึกลง Google");
    } catch {
      sessionStorage.removeItem(googleSignInDraftKey);
    }
  }, []);

  function saveDraftBeforeGoogleSignIn() {
    sessionStorage.setItem(
      googleSignInDraftKey,
      JSON.stringify({
        form,
        items,
        expenseId,
        imageDataUrl,
        fileName,
        ocrText
      })
    );
  }

  async function handleUploadImage(file?: File | null) {
    const selectedFile = file ?? inputRef.current?.files?.[0];
    if (!selectedFile) {
      inputRef.current?.click();
      return;
    }

    setStatus(isHeicFile(selectedFile) ? "converting" : "idle");
    setMessage(isHeicFile(selectedFile) ? "กำลังแปลงไฟล์ HEIC..." : "เลือกรูปแล้ว พร้อมอ่าน OCR");
    setError(null);
    setOcrText("");
    setFileName(selectedFile.name);

    try {
      const nextImageDataUrl = await imageFileToDataUrl(selectedFile);
      setImageDataUrl(nextImageDataUrl);
      setStatus("idle");
      setMessage("เลือกรูปแล้ว กำลังเริ่ม OCR...");
      await handleRunVisionOcr(nextImageDataUrl);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "เปิดรูปไม่สำเร็จ");
      setMessage("เปิดรูปไม่สำเร็จ");
    }
  }

  async function handleRunVisionOcr(sourceImageDataUrl = imageDataUrl) {
    if (!sourceImageDataUrl) {
      setError("กรุณาอัปโหลดรูปใบเสร็จก่อน");
      inputRef.current?.click();
      return;
    }

    try {
      setStatus("ocr");
      setMessage("กำลังอ่านข้อความด้วย Google Vision...");
      setError(null);

      const usage = getVisionUsage();
      if (!canCallVision(usage)) {
        throw new Error("ถึงลิมิต OCR แล้ว กรุณารอหรือปรับ limit ใน Settings");
      }

      const imageBlob = await compressImageForVision(sourceImageDataUrl);
      const formData = new FormData();
      formData.append("image", imageBlob, "expense-receipt.jpg");
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

      incrementVisionUsage();
      const nextOcrText = visionResult.ocrText.trim();
      setOcrText(nextOcrText);

      setStatus("gemini");
      setMessage("กำลังแปลงข้อมูลใบเสร็จด้วย Gemini...");
      const geminiResponse = await fetch("/api/gemini/extract-receipt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ocrText: nextOcrText,
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

      const data = geminiResult.data;
      const nextItems = data.items.map(itemFromGemini);
      const extractedAmount = data.total ?? data.items.reduce((sum, item) => sum + item.totalPrice, 0);
      setForm((current) => ({
        ...current,
        receiptDate: data.purchaseDate ?? current.receiptDate,
        storeName: data.storeName ?? current.storeName,
        detail: data.items[0]?.displayName ? `ค่า ${data.items[0].displayName}` : current.detail,
        category: data.items[0]?.category ?? current.category,
        amount: extractedAmount || current.amount,
        totalOriginal: extractedAmount || current.totalOriginal,
        subtotal: data.subtotal ?? current.subtotal,
        subtotalOriginal: data.subtotal ?? current.subtotalOriginal,
        tax: data.tax ?? current.tax,
        vatOriginal: data.tax ?? current.vatOriginal,
        vendorName: data.storeName ?? current.vendorName,
        currency: "JPY",
        originalCurrency: "JPY",
        exchangeRate: current.baseCurrency === "JPY" ? 1 : current.exchangeRate
      }));
      setItems(nextItems.length > 0 ? nextItems : items);
      setStatus("done");
      setMessage("อ่านข้อมูลสำเร็จ ตรวจแก้ก่อนสร้างรายจ่าย");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "อ่านข้อมูลไม่สำเร็จ");
      setMessage("อ่านข้อมูลไม่สำเร็จ");
    }
  }

  async function saveLocalExpense({
    syncStatus,
    googleResult,
    imageDataUrlToSave,
    timestamp
  }: {
    syncStatus: Expense["syncStatus"];
    googleResult?: Extract<GoogleUploadResponse, { success: true }>;
    imageDataUrlToSave: string;
    timestamp: string;
  }) {
    const amountFields = patchSummaryAmounts(form, items);
    const receipt: Receipt = {
      id: expenseId,
      imageDataUrl: imageDataUrlToSave,
      storeName: form.storeName,
      purchaseDate: form.receiptDate || null,
      subtotal: amountFields.subtotalOriginal || null,
      tax: amountFields.vatOriginal || null,
      total: amountFields.totalOriginal,
      aiMemo: form.note,
      ocrLanguage,
      ocrText,
      status: "saved",
      createdAt: timestamp,
      updatedAt: timestamp
    };
    const receiptItems: LocalReceiptItem[] = items.map((item) => ({
      id: item.id,
      receiptId: expenseId,
      rawName: item.rawName,
      displayName: item.displayName,
      category: item.category,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      isResaleItem: item.isResaleItem,
      memo: item.memo,
      createdAt: timestamp,
      updatedAt: timestamp
    }));

    await saveReceiptWithItems(receipt, receiptItems);
    const imageBlobId = imageDataUrlToSave ? `expense-image-${expenseId}` : undefined;
    const dashboardExpense: Expense = {
      id: expenseId,
      businessId: activeBusinessId ?? undefined,
      createdAt: timestamp,
      updatedAt: timestamp,
      purchaseDate: form.receiptDate || timestamp.slice(0, 10),
      uploadDate: timestamp.slice(0, 10),
      documentType: documentTypeLabel(form.documentType),
      storeName: form.storeName,
      detail: form.detail,
      payerName: form.requester || "ไม่ระบุ",
      paymentStatus: paymentStatusValue(form.paymentStatus),
      subtotal: amountFields.subtotalOriginal || null,
      tax: amountFields.vatOriginal || null,
      withholdingTax: amountFields.whtOriginal || null,
      total: amountFields.totalOriginal,
      currency: form.originalCurrency,
      originalCurrency: form.originalCurrency,
      baseCurrency: form.baseCurrency,
      exchangeRate: amountFields.exchangeRate,
      exchangeRateSource: "manual",
      exchangeRateDate: form.exchangeRateDate,
      manualAmountOverride: form.manualAmountOverride,
      subtotalOriginal: amountFields.subtotalOriginal,
      vatOriginal: amountFields.vatOriginal,
      whtOriginal: amountFields.whtOriginal,
      totalOriginal: amountFields.totalOriginal,
      subtotalBase: amountFields.subtotalBase,
      vatBase: amountFields.vatBase,
      whtBase: amountFields.whtBase,
      totalBase: amountFields.totalBase,
      categorySummary: form.category,
      companyName,
      invoiceNumber: form.invoiceNumber,
      hasTaxInvoice: form.hasTaxInvoice,
      expenseType: form.expenseType,
      subCategory: form.subCategory,
      requesterName: form.requester,
      vendorName: form.vendorName || form.storeName,
      vendorTaxId: form.vendorTaxId,
      vendorBranchName: form.vendorBranchName,
      vendorBranchCode: form.vendorBranchCode,
      vendorAddress: form.vendorAddress,
      imageBlobId,
      driveFolderId: googleResult?.folders?.yearFolderId,
      imageDriveFileId: googleResult?.driveFile?.id,
      imageDriveUrl: googleResult?.driveFile?.webViewLink,
      ocrText,
      aiMemo: form.note,
      syncStatus
    };
    const dashboardItems: ExpenseItem[] = items.map((item) => ({
      id: item.id,
      expenseId,
      businessId: activeBusinessId ?? undefined,
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
    const dashboardImage: ReceiptImage | null = imageBlobId
      ? {
          id: imageBlobId,
          imageDataUrl: imageDataUrlToSave,
          createdAt: timestamp
        }
      : null;
    await addDashboardExpense(dashboardExpense, dashboardItems, dashboardImage);
  }

  async function handleSaveExpense() {
    if (!form.storeName.trim() || !form.detail.trim()) {
      setError("กรุณากรอกชื่อร้านค้าและรายละเอียด");
      return;
    }
    if (!activeBusinessId) {
      setError("กรุณาสร้างหรือเลือกธุรกิจก่อนบันทึกรายจ่าย");
      return;
    }
    if (!firebaseUser) {
      setStatus("idle");
      setMessage("กรุณาเข้าสู่ระบบ Google ก่อนบันทึก");
      setShowGoogleDialog(true);
      return;
    }

    const timestamp = new Date().toISOString();
    const nextImageDataUrl = imageDataUrl ?? placeholderImageDataUrl;
    const saveStepTimers: number[] = [];
    const amountFields = patchSummaryAmounts(form, items);

    try {
      setStatus("saving");
      setMessage("กำลังอัปโหลดรูปไป Google Drive...");
      saveStepTimers.push(window.setTimeout(() => setMessage("กำลังบันทึกข้อมูลรายจ่ายไป Firestore..."), 1200));
      setError(null);
      const googleResponse = await fetch("/api/google/upload-receipt-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          expenseId,
          companyName,
          purchaseDate: form.receiptDate || timestamp.slice(0, 10),
          storeName: form.storeName,
          imageDataUrl: nextImageDataUrl,
          fileName: fileName || `receipt-${expenseId}.jpg`
        })
      });
      const googleResult = await parseJsonResponse<GoogleUploadResponse>(
        googleResponse,
        "Google Drive upload failed."
      );

      if (googleResponse.status === 401) {
        setStatus("idle");
        setMessage("กรุณาเข้าสู่ระบบ Google ก่อนบันทึก");
        setShowGoogleDialog(true);
        return;
      }

      if (!googleResponse.ok || !googleResult.success) {
        throw new Error(
          googleResult.success
            ? `Google Drive upload failed with HTTP ${googleResponse.status}`
            : googleResult.error || "Google Drive upload failed."
        );
      }

      setMessage("กำลังบันทึกข้อมูลรายจ่ายไป Firestore...");
      await saveExpenseWithItemsDoc({
        user: firebaseUser,
        businessId: activeBusinessId,
        expense: {
          id: expenseId,
          purchaseDate: form.receiptDate || timestamp.slice(0, 10),
          uploadDate: timestamp.slice(0, 10),
          documentType: documentTypeLabel(form.documentType),
          paymentStatus: paymentStatusValue(form.paymentStatus),
          hasTaxInvoice: form.hasTaxInvoice,
          invoiceNumber: form.invoiceNumber,
          storeName: form.storeName,
          vendorName: form.vendorName || form.storeName,
          vendorTaxId: form.vendorTaxId,
          vendorBranchName: form.vendorBranchName,
          vendorBranchCode: form.vendorBranchCode,
          vendorAddress: form.vendorAddress,
          detail: form.detail,
          subtotal: amountFields.subtotalOriginal || null,
          tax: amountFields.vatOriginal || null,
          withholdingTax: amountFields.whtOriginal || null,
          total: amountFields.totalOriginal || null,
          currency: form.originalCurrency,
          originalCurrency: form.originalCurrency,
          baseCurrency: form.baseCurrency,
          exchangeRate: amountFields.exchangeRate,
          exchangeRateSource: "manual",
          exchangeRateDate: form.exchangeRateDate,
          manualAmountOverride: form.manualAmountOverride,
          subtotalOriginal: amountFields.subtotalOriginal,
          vatOriginal: amountFields.vatOriginal,
          whtOriginal: amountFields.whtOriginal,
          totalOriginal: amountFields.totalOriginal,
          subtotalBase: amountFields.subtotalBase,
          vatBase: amountFields.vatBase,
          whtBase: amountFields.whtBase,
          totalBase: amountFields.totalBase,
          expenseType: form.expenseType || "รายจ่าย",
          category: form.category,
          subCategory: form.subCategory,
          requesterName: form.requester,
          memo: form.note,
          aiMemo: form.note,
          aiConfidence: ocrText ? "medium" : "low",
          status: "confirmed",
          extractionMode: ocrText ? "google_vision_ocr" : "manual",
          imageDriveFileId: googleResult.driveFile?.id ?? "",
          imageDriveUrl: googleResult.driveFile?.webViewLink ?? "",
          imageFileName: googleResult.imageFileName ?? "",
          ocrText
        },
        items: items.map((item) => ({
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
      sessionStorage.removeItem(googleSignInDraftKey);
      setStatus("saved");
      setMessage("บันทึกลง Firestore และ Google Drive แล้ว");
      router.push("/expenses");
    } catch (err) {
      await saveLocalExpense({
        syncStatus: "failed",
        imageDataUrlToSave: nextImageDataUrl,
        timestamp
      }).catch((localError) => {
        console.error("Could not save failed local draft:", localError);
      });
      setStatus("error");
      setError(err instanceof Error ? err.message : "บันทึกรายจ่ายไม่สำเร็จ");
      setMessage("บันทึก Google ไม่สำเร็จ เก็บ local draft แล้ว");
    } finally {
      saveStepTimers.forEach((timer) => window.clearTimeout(timer));
    }
  }

  function handleCancel() {
    router.push("/expenses");
  }

  return (
    <main className="flex min-h-screen flex-col bg-[#F6F8FB] text-slate-900">
      <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white/95 px-4 shadow-sm backdrop-blur md:px-8">
        <div>
          <h1 className="text-xl font-black tracking-normal md:text-2xl">สร้างรายจ่าย</h1>
          <p className="hidden text-sm text-slate-500 sm:block">กรอกข้อมูลจากใบเสร็จและตรวจรายการก่อนบันทึก</p>
        </div>
        <Button variant="ghost" size="icon" className="rounded-full" aria-label="Close" onClick={handleCancel}>
          <X className="h-6 w-6 text-slate-500" />
        </Button>
      </header>

      <section className="mx-auto grid w-full max-w-[1440px] flex-1 grid-cols-1 gap-5 px-4 py-5 pb-28 md:px-8 lg:grid-cols-[minmax(360px,0.9fr)_minmax(520px,1.1fr)] lg:gap-7">
        <DocumentPreviewCard
          imageDataUrl={imageDataUrl}
          status={status}
          error={error}
          ocrText={ocrText}
          downloadFileName={fileName}
          onUploadClick={() => inputRef.current?.click()}
          onRunVisionOcr={handleRunVisionOcr}
        />
        <div className="grid content-start gap-5">
          <ExpenseFormCard form={form} onChange={setForm} companyName={companyName} />
          <ExpenseItemsCard
            items={items}
            onChange={setItems}
            originalCurrency={form.originalCurrency}
            baseCurrency={form.baseCurrency}
            exchangeRate={form.exchangeRate}
          />
          <ExpenseSummarySection form={form} items={items} onChange={setForm} />
        </div>
      </section>

      <CreateExpenseFooter
        saving={status === "saving"}
        disabled={businessLoading || firebaseLoading || status === "ocr" || status === "gemini" || status === "converting"}
        saveLabel={status === "error" ? "ลองบันทึกใหม่" : "สร้างรายจ่าย"}
        onCancel={handleCancel}
        onSave={handleSaveExpense}
      />

      <input
        ref={inputRef}
        type="file"
        accept="image/*,.heic,.heif"
        className="hidden"
        onChange={(event) => handleUploadImage(event.target.files?.[0] ?? null)}
      />

      {showGoogleDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <h2 className="text-lg font-black text-slate-950">ต้องเข้าสู่ระบบ Google</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              กรุณาเข้าสู่ระบบ Google เพื่อบันทึกรูปลง Google Drive และข้อมูลลง Firestore
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Button variant="outline" className="h-12 rounded-xl bg-white" onClick={() => setShowGoogleDialog(false)}>
                ยกเลิก
              </Button>
              <GoogleSignInButton
                callbackUrl="/expenses/new"
                className="h-12 justify-center"
                onBeforeSignIn={saveDraftBeforeGoogleSignIn}
              />
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
