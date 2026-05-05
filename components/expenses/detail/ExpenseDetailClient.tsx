"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateExpenseFooter } from "@/components/expenses/new/CreateExpenseFooter";
import { DocumentPreviewCard } from "@/components/expenses/new/DocumentPreviewCard";
import { ExpenseFormCard } from "@/components/expenses/new/ExpenseFormCard";
import { ExpenseItemsCard } from "@/components/expenses/new/ExpenseItemsCard";
import {
  defaultExpenseForm,
  type ExpenseFormState,
  type ExpenseItemState,
  type ExpenseProcessingStatus
} from "@/components/expenses/new/types";
import { useBusinesses } from "@/hooks/useBusinesses";
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

function formFromExpense(expense: ExpenseWithItems): ExpenseFormState {
  return {
    ...defaultExpenseForm,
    receiptDate: expense.purchaseDate,
    storeName: expense.storeName,
    detail: expense.detail,
    documentType: documentTypeToForm(expense.documentType),
    category: receiptCategory(expense.categorySummary),
    paymentStatus: paymentStatusToForm(expense.paymentStatus),
    amount: expense.total,
    currency: expense.currency,
    requester: expense.requesterName || expense.payerName,
    hasTaxInvoice: expense.hasTaxInvoice ?? false,
    invoiceNumber: expense.invoiceNumber ?? "",
    subtotal: expense.subtotal ?? 0,
    tax: expense.tax ?? 0,
    withholdingTax: expense.withholdingTax ?? 0,
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
  const [message, setMessage] = useState("พร้อมแก้ไข");
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
          subtotal: form.subtotal || null,
          tax: form.tax || null,
          withholdingTax: form.withholdingTax || null,
          total: form.amount || null,
          currency: form.currency,
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
            <div className="grid content-start gap-5">
              <DocumentPreviewCard
                imageDataUrl={previewImageUrl || placeholderImageDataUrl}
                fileName={fileName}
                status={status}
                message={message}
                error={error}
                ocrText={ocrText}
                onUploadClick={() => inputRef.current?.click()}
                onRunVisionOcr={() => setError("ถ้าต้องการ OCR ใหม่ ให้อัปโหลดรูปแทนที่ก่อน แล้วใช้หน้าสร้างรายจ่ายสำหรับ OCR เต็มรูปแบบ")}
              />
              <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
                <CardContent className="p-4 md:p-5">
                  <h2 className="text-lg font-black">OCR text</h2>
                  {ocrText ? (
                    <pre className="mt-4 max-h-80 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                      {ocrText}
                    </pre>
                  ) : (
                    <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">
                      ไม่มี OCR text ในเอกสารนี้
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
            <div className="grid content-start gap-5">
              {success ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-black text-emerald-700">
                  {success}
                </div>
              ) : null}
              <ExpenseFormCard form={form} onChange={setForm} companyName={companyName} />
              <ExpenseItemsCard items={items} onChange={setItems} />
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
