"use client";

import { useEffect, useRef, useState } from "react";
import { Download, ExternalLink, FileSearch, ImagePlus, Loader2, ScanText, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ExpenseProcessingStatus } from "@/components/expenses/new/types";

export function DocumentPreviewCard({
  imageDataUrl,
  status,
  error,
  ocrText,
  openUrl,
  downloadUrl,
  downloadFileName,
  onUploadClick,
  onRunVisionOcr
}: {
  imageDataUrl: string | null;
  status: ExpenseProcessingStatus;
  error: string | null;
  ocrText: string;
  openUrl?: string | null;
  downloadUrl?: string | null;
  downloadFileName?: string | null;
  onUploadClick: () => void;
  onRunVisionOcr: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"preview" | "ocr">("preview");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const busy = status === "converting" || status === "ocr" || status === "gemini";
  const resolvedDownloadUrl = downloadUrl || imageDataUrl;
  const isPlaceholderImage = imageDataUrl?.startsWith("data:image/svg+xml") ?? false;
  const hasImageActions = Boolean(imageDataUrl && !isPlaceholderImage && (openUrl || resolvedDownloadUrl));

  useEffect(() => {
    if (status === "done" && ocrText) {
      setActiveTab("ocr");
    }
  }, [ocrText, status]);

  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [imageDataUrl]);

  useEffect(() => {
    const previewElement = previewRef.current;
    if (!previewElement || !imageDataUrl || isPlaceholderImage || activeTab !== "preview") return;

    function handleWheel(event: WheelEvent) {
      event.preventDefault();
      event.stopPropagation();

      setZoom((currentZoom) => {
        const nextZoom = Math.min(4, Math.max(1, currentZoom + (event.deltaY < 0 ? 0.15 : -0.15)));
        if (nextZoom === 1) {
          setPan({ x: 0, y: 0 });
        }
        return nextZoom;
      });
    }

    previewElement.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      previewElement.removeEventListener("wheel", handleWheel);
    };
  }, [activeTab, imageDataUrl, isPlaceholderImage]);

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (zoom <= 1) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragStart({ x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y });
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragStart) return;
    setPan({
      x: dragStart.panX + event.clientX - dragStart.x,
      y: dragStart.panY + event.clientY - dragStart.y
    });
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragStart) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    setDragStart(null);
  }

  return (
    <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
      <CardContent className="grid gap-3 p-3">
        <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            className={[
              "h-10 rounded-lg text-sm font-black transition",
              activeTab === "preview" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-800"
            ].join(" ")}
            onClick={() => setActiveTab("preview")}
          >
            พรีวิวใบเสร็จ
          </button>
          <button
            type="button"
            className={[
              "h-10 rounded-lg text-sm font-black transition",
              activeTab === "ocr" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-800"
            ].join(" ")}
            onClick={() => setActiveTab("ocr")}
          >
            OCR text {ocrText ? `(${ocrText.length})` : ""}
          </button>
        </div>

        {activeTab === "preview" ? (
          <div
            ref={previewRef}
            className={[
              "relative flex h-[min(42dvh,380px)] min-h-[260px] touch-none items-center justify-center overflow-hidden overscroll-contain rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-3",
              zoom > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"
            ].join(" ")}
            onDoubleClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            {imageDataUrl ? (
              <>
                {hasImageActions ? (
                  <div className="absolute right-4 top-4 z-10 flex items-center gap-2 rounded-full bg-white/90 p-1 shadow-sm backdrop-blur">
                    {resolvedDownloadUrl ? (
                      <a
                        href={resolvedDownloadUrl}
                        download={downloadFileName || "receipt-image.jpg"}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100"
                        title="ดาวน์โหลดรูป"
                        aria-label="ดาวน์โหลดรูป"
                      >
                        <Download className="h-5 w-5" />
                      </a>
                    ) : null}
                    {openUrl ? (
                      <a
                        href={openUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100"
                        title="เปิดใน Google Drive"
                        aria-label="เปิดใน Google Drive"
                      >
                        <ExternalLink className="h-5 w-5" />
                      </a>
                    ) : null}
                  </div>
                ) : null}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageDataUrl}
                  alt="Receipt preview"
                  className="h-full w-full rounded-xl object-contain"
                  style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: "center",
                    transition: dragStart ? "none" : "transform 120ms ease"
                  }}
                  draggable={false}
                />
              </>
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
        ) : (
          <div className="h-[min(42dvh,380px)] min-h-[260px] overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-4">
            {ocrText ? (
              <pre className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{ocrText}</pre>
            ) : (
              <div className="flex min-h-[240px] items-center justify-center text-center">
                <div>
                  <ScanText className="mx-auto h-10 w-10 text-slate-300" />
                  <p className="mt-4 text-base font-black text-slate-700">ยังไม่มี OCR text</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">กดอ่านด้วย Google Vision เพื่ออ่านข้อความจากใบเสร็จ</p>
                </div>
              </div>
            )}
          </div>
        )}

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

        <div className="grid grid-cols-[52px_1fr] gap-3 rounded-2xl bg-slate-50 p-3">
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
