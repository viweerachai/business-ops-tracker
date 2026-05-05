"use client";

import { FileSearch, ImagePlus, Loader2, ScanText, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { ExpenseProcessingStatus } from "@/components/expenses/new/types";

function statusTone(status: ExpenseProcessingStatus) {
  if (status === "error") return "bg-red-50 text-red-700";
  if (status === "done" || status === "saved") return "bg-emerald-50 text-emerald-700";
  if (status === "ocr" || status === "gemini" || status === "converting" || status === "saving") {
    return "bg-blue-50 text-blue-700";
  }
  return "bg-slate-100 text-slate-600";
}

export function DocumentPreviewCard({
  imageDataUrl,
  fileName,
  status,
  message,
  error,
  ocrText,
  onUploadClick,
  onRunVisionOcr
}: {
  imageDataUrl: string | null;
  fileName: string | null;
  status: ExpenseProcessingStatus;
  message: string;
  error: string | null;
  ocrText: string;
  onUploadClick: () => void;
  onRunVisionOcr: () => void;
}) {
  const busy = status === "converting" || status === "ocr" || status === "gemini";

  return (
    <Card className="overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm">
      <CardHeader className="border-b border-slate-100 p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black">พรีวิวใบเสร็จ</h2>
            <p className="mt-1 text-sm text-slate-500">{fileName || "อัปโหลดรูปเพื่ออ่าน OCR ภายหลัง"}</p>
          </div>
          <Badge className={`rounded-full px-3 py-1 ${statusTone(status)}`}>
            {busy ? <Loader2 className="mr-1 inline h-3.5 w-3.5 animate-spin" /> : null}
            {message}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 p-4 md:p-5">
        <div className="flex min-h-[420px] items-center justify-center overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-3 md:min-h-[560px]">
          {imageDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageDataUrl} alt="Receipt preview" className="max-h-[540px] w-full rounded-xl object-contain" />
          ) : (
            <div className="p-6 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
                <FileSearch className="h-10 w-10" />
              </div>
              <p className="mt-5 text-lg font-black text-slate-700">ยังไม่มีรูปใบเสร็จ</p>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-slate-500">
                เลือกรูปใบเสร็จจากเครื่อง หรือถ่ายรูปจากมือถือ แล้วใช้ Google Vision อ่านข้อความ
              </p>
            </div>
          )}
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <Button className="h-12 rounded-xl bg-slate-950 text-white hover:bg-slate-800" onClick={onUploadClick} disabled={busy}>
            <Upload className="h-5 w-5" />
            อัปโหลดรูป
          </Button>
          <Button variant="outline" className="h-12 rounded-xl bg-white" onClick={onRunVisionOcr} disabled={busy}>
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ScanText className="h-5 w-5" />}
            อ่านด้วย Google Vision
          </Button>
        </div>

        <div className="grid grid-cols-[72px_1fr] gap-3 rounded-2xl bg-slate-50 p-3">
          <div className="flex aspect-[3/4] items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-white">
            {imageDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageDataUrl} alt="Receipt thumbnail" className="h-full w-full object-cover" />
            ) : (
              <ImagePlus className="h-6 w-6 text-slate-300" />
            )}
          </div>
          <div className="flex min-w-0 flex-col justify-center">
            <p className="text-sm font-bold text-slate-700">เอกสารรายจ่าย</p>
            <p className="mt-1 truncate text-xs text-slate-500">
              {ocrText ? `OCR ${ocrText.length} ตัวอักษร` : imageDataUrl ? "มีไฟล์แนบแล้ว" : "ยังไม่มีไฟล์แนบ"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
