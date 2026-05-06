"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateExpenseFooter } from "@/components/expenses/new/CreateExpenseFooter";
import { DocumentPreviewCard } from "@/components/expenses/new/DocumentPreviewCard";
import { ExpenseSummarySection } from "@/components/expenses/ExpenseSummarySection";
import { isCurrencyCode, patchSummaryAmounts } from "@/components/expenses/expenseSummaryUtils";
import { ExpenseEditFormCard } from "@/components/expenses/detail/ExpenseEditFormCard";
import { ExpenseItemsCard } from "@/components/expenses/new/ExpenseItemsCard";
import {
  defaultExpenseForm,
  type ExpenseFormState,
  type ExpenseItemState,
  type ExpenseProcessingStatus
} from "@/components/expenses/new/types";
import { useBusinesses } from "@/hooks/useBusinesses";
import { canCallVision, getVisionUsage, incrementVisionUsage } from "@/lib/local/vision-usage";
import {
  getExpenseWithItemsDoc,
  updateExpenseWithItemsDoc
} from "@/lib/firebase/firestore";
import type {
  ExpenseDocumentType,
  ExpensePaymentStatus,
  ExpenseWithItems
} from "@/lib/expenseTypes";
import { CATEGORIES, type ReceiptCategory } from "@/lib/types/receipt";

type GoogleUploadResponse =
  | {
      success: true;
      driveFile?: {
        id: string;
        name?: string;
        webViewLink?: string;
      } | null;
      imageFileName?: string;
    }
  | { success: false; error?: string };

type VisionOcrResponse =
  | { success: true; ocrText: string }
  | { success: false; error?: string };

type HeicConverter = (options: {
  blob: Blob;
  toType: string;
  quality: number;
}) => Promise<Blob | Blob[]>;

const placeholderImageDataUrl =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='900' viewBox='0 0 640 900'%3E%3Crect width='640' height='900' fill='%23f8fafc'/%3E%3Crect x='120' y='120' width='400' height='660' rx='28' fill='white' stroke='%23cbd5e1' stroke-width='4' stroke-dasharray='18 14'/%3E%3Ctext x='320' y='440' text-anchor='middle' font-family='Arial' font-size='34' font-weight='700' fill='%2364748b'%3EReceipt%3C/text%3E%3Ctext x='320' y='490' text-anchor='middle' font-family='Arial' font-size='24' fill='%2394a3b8'%3Eexisting evidence%3C/text%3E%3C/svg%3E";

function documentTypeToForm(value: ExpenseDocumentType): ExpenseFormState["documentType"] {
  if (value === "ใบกำกับภาษี") return "tax_invoice";
  if (value === "รายจ่ายอื่น ๆ") return "payment_voucher";
  return "receipt";
}

function documentTypeLabel(value: ExpenseFormState["documentType"]): ExpenseDocumentType {
  if (value === "tax_invoice") return "ใบกำกับภาษี";
  if (value === "payment_voucher") return "รายจ่ายอื่น ๆ";
  return "ใบเสร็จรับเงิน";
}

function paymentStatusToForm(value: ExpensePaymentStatus): ExpenseFormState["paymentStatus"] {
  if (value === "pending") return "unpaid";
  if (value === "review_needed" || value === "draft" || value === "failed") return "review";
  return "paid";
}

function paymentStatusValue(value: ExpenseFormState["paymentStatus"]): ExpensePaymentStatus {
  if (value === "unpaid") return "pending";
  if (value === "review") return "review_needed";
  return "paid";
}

function firestoreStatus(value: ExpenseFormState["paymentStatus"]) {
  if (value === "review") return "review_needed" as const;
  if (value === "unpaid") return "draft" as const;
  return "confirmed" as const;
}

function receiptCategory(value: string | undefined): ReceiptCategory {
  return CATEGORIES.includes(value as ReceiptCategory) ? (value as ReceiptCategory) : "Other";
}

function driveImagePreviewUrl(expense: ExpenseWithItems | null) {
  if (!expense) return null;
  if (expense.imageDriveFileId) {
    return `/api/google/drive-image/${encodeURIComponent(expense.imageDriveFileId)}`;
  }
  return expense.imageDriveUrl || null;
}

function driveImageDownloadUrl(expense: ExpenseWithItems | null) {
  if (!expense?.imageDriveFileId) return null;
  const fileName = `receipt-${expense.id}.jpg`;
  return `/api/google/drive-image/${encodeURIComponent(expense.imageDriveFileId)}?download=1&name=${encodeURIComponent(fileName)}`;
}

function formFromExpense(expense: ExpenseWithItems): ExpenseFormState {
  const originalCurrency = isCurrencyCode(expense.originalCurrency) ? expense.originalCurrency : expense.currency;
  const baseCurrency = isCurrencyCode(expense.baseCurrency) ? expense.baseCurrency : "THB";
  const exchangeRate = expense.exchangeRate ?? (originalCurrency === baseCurrency ? 1 : 1);
  const subtotalOriginal = expense.subtotalOriginal ?? expense.subtotal ?? 0;
  const vatOriginal = expense.vatOriginal ?? expense.tax ?? 0;
  const whtOriginal = expense.whtOriginal ?? expense.withholdingTax ?? 0;
  const totalOriginal = expense.totalOriginal ?? expense.total ?? 0;

  return {
    ...defaultExpenseForm,
    receiptDate: expense.purchaseDate,
    storeName: expense.storeName,
    detail: expense.detail,
    documentType: documentTypeToForm(expense.documentType),
    category: receiptCategory(expense.categorySummary),
    paymentStatus: paymentStatusToForm(expense.paymentStatus),
    amount: totalOriginal,
    currency: originalCurrency,
    originalCurrency,
    baseCurrency,
    exchangeRate,
    exchangeRateSource: "manual",
    exchangeRateDate: expense.exchangeRateDate ?? null,
    manualAmountOverride: expense.manualAmountOverride ?? true,
    subtotalOriginal,
    vatOriginal,
    whtOriginal,
    totalOriginal,
    subtotalBase: expense.subtotalBase ?? subtotalOriginal * exchangeRate,
    vatBase: expense.vatBase ?? vatOriginal * exchangeRate,
    whtBase: expense.whtBase ?? whtOriginal * exchangeRate,
    totalBase: expense.totalBase ?? totalOriginal * exchangeRate,
    requester: expense.requesterName || expense.payerName,
    hasTaxInvoice: expense.hasTaxInvoice ?? false,
    invoiceNumber: expense.invoiceNumber ?? "",
    subtotal: subtotalOriginal,
    tax: vatOriginal,
    withholdingTax: whtOriginal,
    expenseType: expense.expenseType || "รายจ่าย",
    subCategory: expense.subCategory ?? "",
    vendorName: expense.vendorName || expense.storeName,
    vendorTaxId: expense.vendorTaxId ?? "",
    vendorBranchName: expense.vendorBranchName ?? "",
    vendorBranchCode: expense.vendorBranchCode ?? "",
    vendorAddress: expense.vendorAddress ?? "",
    note: expense.aiMemo ?? ""
  };
}

function itemsFromExpense(expense: ExpenseWithItems): ExpenseItemState[] {
  return expense.items.map((item) => ({
    id: item.id,
    rawName: item.rawName,
    displayName: item.displayName,
    category: receiptCategory(item.category),
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    totalPrice: item.totalPrice,
    isResaleItem: item.isResaleItem,
    memo: item.memo ?? ""
  }));
}

function StepLabel({
  step,
  title,
  description
}: {
  step: number;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Badge className="mt-0.5 rounded-full bg-blue-50 px-3 py-1 text-blue-700">Step {step}</Badge>
      <div className="min-w-0">
        <h2 className="text-lg font-black text-slate-950">{title}</h2>
        {description ? <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p> : null}
      </div>
    </div>
  );
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

async function imageSourceToVisionBlob(source: string) {
  if (source.startsWith("data:image/")) {
    return compressImageForVision(source);
  }

  const response = await fetch(source);
  if (!response.ok) {
    throw new Error("โหลดรูปใบเสร็จสำหรับ OCR ไม่สำเร็จ");
  }
  return response.blob();
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

export function ExpenseDetailClient({ expenseId }: { expenseId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    activeBusiness,
    activeBusinessId,
    user,
    loading: businessLoading
  } = useBusinesses();
  const [expense, setExpense] = useState<ExpenseWithItems | null>(null);
  const [form, setForm] = useState<ExpenseFormState>(defaultExpenseForm);
  const [items, setItems] = useState<ExpenseItemState[]>([]);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [replacementImageDataUrl, setReplacementImageDataUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState("");
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<ExpenseProcessingStatus>("idle");
  const [, setMessage] = useState("พร้อมแก้ไข");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const companyName = activeBusiness?.name ?? "ธุรกิจของฉัน";

  useEffect(() => {
    let cancelled = false;

    async function loadExpense() {
      try {
        if (businessLoading) return;
        if (!user || !activeBusinessId) {
          setExpense(null);
          setLoading(false);
          return;
        }
        setLoading(true);
        const nextExpense = await getExpenseWithItemsDoc(user, activeBusinessId, expenseId);
        if (cancelled) return;
        setExpense(nextExpense);
        if (nextExpense) {
          setForm(formFromExpense(nextExpense));
          setItems(itemsFromExpense(nextExpense));
          setPreviewImageUrl(driveImagePreviewUrl(nextExpense));
          setFileName(nextExpense.imageDriveFileId ? "Google Drive evidence" : null);
          setOcrText(nextExpense.ocrText ?? "");
          setMessage("โหลดข้อมูลแล้ว พร้อมแก้ไข");
        }
        setError(null);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "โหลดข้อมูลรายจ่ายไม่สำเร็จ");
        setLoading(false);
      }
    }

    loadExpense();
    return () => {
      cancelled = true;
    };
  }, [expenseId, activeBusinessId, businessLoading, user]);

  async function handleUploadReplacement(file?: File | null) {
    const selectedFile = file ?? inputRef.current?.files?.[0];
    if (!selectedFile) {
      inputRef.current?.click();
      return;
    }

    try {
      setStatus(isHeicFile(selectedFile) ? "converting" : "idle");
      setMessage(isHeicFile(selectedFile) ? "กำลังแปลงไฟล์ HEIC..." : "เลือกรูปใหม่แล้ว");
      setError(null);
      const nextImageDataUrl = await imageFileToDataUrl(selectedFile);
      setReplacementImageDataUrl(nextImageDataUrl);
      setPreviewImageUrl(nextImageDataUrl);
      setFileName(selectedFile.name);
      setStatus("idle");
      setMessage("เลือกรูปใหม่แล้ว กดบันทึกเพื่อแทนหลักฐานเดิม");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "เปิดรูปไม่สำเร็จ");
      setMessage("เปิดรูปไม่สำเร็จ");
    }
  }

  async function uploadReplacementImage() {
    if (!replacementImageDataUrl) {
      return {
        imageDriveFileId: expense?.imageDriveFileId ?? "",
        imageDriveUrl: expense?.imageDriveUrl ?? "",
        imageFileName: ""
      };
    }

    const response = await fetch("/api/google/upload-receipt-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        expenseId,
        companyName,
        purchaseDate: form.receiptDate || new Date().toISOString().slice(0, 10),
        storeName: form.storeName,
        imageDataUrl: replacementImageDataUrl,
        fileName: fileName || `receipt-${expenseId}.jpg`
      })
    });
    const result = await parseJsonResponse<GoogleUploadResponse>(
      response,
      "Google Drive upload failed."
    );

    if (!response.ok || !result.success) {
      throw new Error(
        result.success
          ? `Google Drive upload failed with HTTP ${response.status}`
          : result.error || "Google Drive upload failed."
      );
    }

    return {
      imageDriveFileId: result.driveFile?.id ?? "",
      imageDriveUrl: result.driveFile?.webViewLink ?? "",
      imageFileName: result.imageFileName ?? ""
    };
  }

  async function handleRunVisionOcr() {
    const sourceImage = previewImageUrl || replacementImageDataUrl;
    if (!sourceImage) {
      setError("ยังไม่มีรูปใบเสร็จสำหรับ OCR");
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

      const imageBlob = await imageSourceToVisionBlob(sourceImage);
      const formData = new FormData();
      formData.append("image", imageBlob, fileName || "expense-receipt.jpg");

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
      setOcrText(visionResult.ocrText.trim());
      setStatus("done");
      setMessage("อ่านข้อความใหม่แล้ว ตรวจ OCR ก่อนบันทึก");
    } catch (err) {
      setStatus("error");
      setMessage("อ่าน OCR ไม่สำเร็จ");
      setError(err instanceof Error ? err.message : "อ่าน OCR ไม่สำเร็จ");
    }
  }

  async function handleSave() {
    if (!user || !activeBusinessId) {
      setError("กรุณาเข้าสู่ระบบและเลือกธุรกิจก่อนบันทึก");
      return;
    }
    if (!expense) {
      setError("ไม่พบรายจ่ายนี้");
      return;
    }
    if (!form.storeName.trim() || !form.detail.trim()) {
      setError("กรุณากรอกชื่อร้านค้าและรายละเอียด");
      return;
    }

    try {
      setStatus("saving");
      setMessage(replacementImageDataUrl ? "กำลังอัปโหลดรูปใหม่ไป Google Drive..." : "กำลังบันทึกข้อมูลไป Firestore...");
      setError(null);
      setSuccess(null);
      const amountFields = patchSummaryAmounts(form, items);
      const imageFields = await uploadReplacementImage();
      setMessage("กำลังอัปเดตรายจ่ายใน Firestore...");
      await updateExpenseWithItemsDoc({
        user,
        businessId: activeBusinessId,
        expenseId,
        expense: {
          purchaseDate: form.receiptDate || expense.purchaseDate,
          uploadDate: expense.uploadDate,
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
          aiConfidence: expense.ocrText ? "medium" : "low",
          status: firestoreStatus(form.paymentStatus),
          extractionMode: expense.ocrText ? "google_vision_ocr" : "manual",
          imageDriveFileId: imageFields.imageDriveFileId,
          imageDriveUrl: imageFields.imageDriveUrl,
          imageFileName: imageFields.imageFileName,
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
      setReplacementImageDataUrl(null);
      setStatus("saved");
      setMessage("บันทึกการแก้ไขแล้ว");
      setSuccess("บันทึกการแก้ไขลง Firestore แล้ว");
      window.setTimeout(() => router.push("/expenses"), 700);
    } catch (err) {
      setStatus("error");
      setMessage("บันทึกไม่สำเร็จ");
      setError(err instanceof Error ? err.message : "บันทึกการแก้ไขไม่สำเร็จ");
    }
  }

  function handleCancel() {
    router.push("/expenses");
  }

  return (
    <main className="flex min-h-screen flex-col bg-[#F6F8FB] text-slate-900">
      <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white/95 px-4 shadow-sm backdrop-blur md:px-8">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={handleCancel} aria-label="Back">
            <ArrowLeft className="h-6 w-6 text-slate-600" />
          </Button>
          <div>
            <h1 className="text-xl font-black tracking-normal md:text-2xl">แก้ไขรายจ่าย</h1>
            <p className="hidden text-sm text-slate-500 sm:block">แก้ข้อมูลใบเสร็จและรายการสินค้า แล้วบันทึกกลับ Firestore</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="rounded-full" aria-label="Close" onClick={handleCancel}>
          <X className="h-6 w-6 text-slate-500" />
        </Button>
      </header>

      <section className="mx-auto grid w-full max-w-[1440px] flex-1 grid-cols-1 gap-5 px-4 py-5 pb-28 md:px-8 lg:grid-cols-[minmax(360px,0.9fr)_minmax(520px,1.1fr)] lg:gap-7">
        {loading || businessLoading ? (
          <>
            <Skeleton className="h-[720px] rounded-2xl" />
            <div className="grid content-start gap-5">
              <Skeleton className="h-[520px] rounded-2xl" />
              <Skeleton className="h-[260px] rounded-2xl" />
            </div>
          </>
        ) : null}

        {!loading && error && !expense ? (
          <Card className="rounded-2xl border-red-200 bg-red-50 lg:col-span-2">
            <CardContent className="p-6 text-red-800">{error}</CardContent>
          </Card>
        ) : null}

        {!loading && !expense ? (
          <Card className="rounded-2xl lg:col-span-2">
            <CardContent className="p-10 text-center">
              <FileText className="mx-auto h-10 w-10 text-slate-400" />
              <p className="mt-3 text-lg font-black">ไม่พบรายจ่ายนี้</p>
              <Button className="mt-5 rounded-xl bg-slate-950 text-white" onClick={handleCancel}>
                กลับหน้ารายจ่าย
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {!loading && expense ? (
          <>
            <div className="grid content-start gap-4 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto lg:pr-1">
              <StepLabel
                step={1}
                title="ตรวจรูปใบเสร็จ"
                description="ดูหลักฐานเดิม หรืออัปโหลดรูปใหม่ก่อนบันทึกการแก้ไข"
              />
              <DocumentPreviewCard
                imageDataUrl={previewImageUrl || placeholderImageDataUrl}
                status={status}
                error={error}
                ocrText={ocrText}
                openUrl={replacementImageDataUrl ? null : expense.imageDriveUrl}
                downloadUrl={replacementImageDataUrl ? replacementImageDataUrl : driveImageDownloadUrl(expense)}
                downloadFileName={fileName || `receipt-${expense.id}.jpg`}
                onUploadClick={() => inputRef.current?.click()}
                onRunVisionOcr={handleRunVisionOcr}
              />
            </div>
            <div className="grid content-start gap-6">
              {success ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-black text-emerald-700">
                  {success}
                </div>
              ) : null}
              <ExpenseEditFormCard form={form} onChange={setForm} companyName={companyName} />

              <section className="grid gap-3">
                <StepLabel
                  step={3}
                  title="ตรวจรายการสินค้า"
                  description="แก้ชื่อ จำนวน ราคา และหมวดหมู่ของแต่ละรายการก่อนบันทึก"
                />
                <ExpenseItemsCard
                  items={items}
                  onChange={setItems}
                  originalCurrency={form.originalCurrency}
                  baseCurrency={form.baseCurrency}
                  exchangeRate={form.exchangeRate}
                />
              </section>

              <section className="grid gap-3">
                <StepLabel
                  step={4}
                  title="ตรวจยอดรวม"
                  description="เช็กยอดชำระ ภาษี และอัตราแลกเปลี่ยนก่อนกดบันทึก"
                />
                <ExpenseSummarySection form={form} items={items} onChange={setForm} />
              </section>
            </div>
          </>
        ) : null}
      </section>

      <CreateExpenseFooter
        saving={status === "saving"}
        disabled={loading || businessLoading || status === "saving"}
        saveLabel={status === "error" ? "ลองบันทึกใหม่" : "บันทึกการแก้ไข"}
        onCancel={handleCancel}
        onSave={handleSave}
      />

      <input
        ref={inputRef}
        type="file"
        accept="image/*,.heic,.heif"
        className="hidden"
        onChange={(event) => handleUploadReplacement(event.target.files?.[0] ?? null)}
      />
    </main>
  );
}
