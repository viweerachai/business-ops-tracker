"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Crop, FileText, Loader2, RefreshCcw, RotateCcw, RotateCw, UploadCloud } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { preprocessReceiptImage } from "@/lib/image/receipt-preprocess";
import { saveDraftToSession } from "@/lib/local/draft";
import {
  canCallVision,
  getVisionUsage,
  incrementVisionUsage,
  type VisionUsage
} from "@/lib/local/vision-usage";
import { checkOcrQuality } from "@/lib/ocr-quality";
import { OCR_LANGUAGES, type OcrLanguage } from "@/lib/types/receipt";

type OcrStatus = "idle" | "reading" | "done";
type FileStatus = "idle" | "converting";
type OcrEngine = "vision" | "tesseract";
type OcrImageMode = "receipt-detect" | "enhanced" | "center-crop" | "original";
type CropMargins = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};
type HeicConverter = (options: {
  blob: Blob;
  toType?: string;
  quality?: number;
  multiple?: boolean;
}) => Promise<Blob | Blob[]>;

const OCR_IMAGE_MODES: Array<{ value: OcrImageMode; label: string }> = [
  { value: "receipt-detect", label: "ตรวจจับใบเสร็จ + ปรับ perspective" },
  { value: "enhanced", label: "ปรับภาพอัตโนมัติ" },
  { value: "center-crop", label: "ครอปกลางสำหรับใบเสร็จยาว" },
  { value: "original", label: "ใช้ภาพเดิม" }
];

const OCR_ENGINES: Array<{ value: OcrEngine; label: string }> = [
  { value: "vision", label: "Google Vision OCR - recommended" },
  { value: "tesseract", label: "Tesseract local OCR - fallback" }
];

const emptyCrop: CropMargins = {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0
};

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl: string) {
  const [meta, base64] = dataUrl.split(",");
  const mimeType = meta.match(/data:(.*?);/)?.[1] || "image/jpeg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mimeType });
}

function isHeicFile(file: File) {
  return (
    /\.(heic|heif)$/i.test(file.name) ||
    file.type === "image/heic" ||
    file.type === "image/heif"
  );
}

function loadImage(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image failed to load"));
    image.src = dataUrl;
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function hasManualCrop(crop: CropMargins) {
  return crop.top > 0 || crop.right > 0 || crop.bottom > 0 || crop.left > 0;
}

function safeCropMargins(crop: CropMargins) {
  return {
    top: clamp(crop.top, 0, 80),
    right: clamp(crop.right, 0, 80),
    bottom: clamp(crop.bottom, 0, 80),
    left: clamp(crop.left, 0, 80)
  };
}

async function cropImageDataUrl(dataUrl: string, crop: CropMargins) {
  const safeCrop = safeCropMargins(crop);
  if (!hasManualCrop(safeCrop)) return dataUrl;

  const image = await loadImage(dataUrl);
  const left = image.width * (safeCrop.left / 100);
  const top = image.height * (safeCrop.top / 100);
  const right = image.width * (safeCrop.right / 100);
  const bottom = image.height * (safeCrop.bottom / 100);
  const cropWidth = Math.max(image.width - left - right, image.width * 0.1);
  const cropHeight = Math.max(image.height - top - bottom, image.height * 0.1);

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(cropWidth);
  canvas.height = Math.round(cropHeight);
  const context = canvas.getContext("2d");
  if (!context) return dataUrl;

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(
    image,
    left,
    top,
    cropWidth,
    cropHeight,
    0,
    0,
    canvas.width,
    canvas.height
  );

  return canvas.toDataURL("image/jpeg", 0.94);
}

async function rotateImageDataUrl(dataUrl: string, degrees: -90 | 90) {
  const image = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = image.height;
  canvas.height = image.width;
  const context = canvas.getContext("2d");
  if (!context) return dataUrl;

  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate((degrees * Math.PI) / 180);
  context.drawImage(image, -image.width / 2, -image.height / 2);
  return canvas.toDataURL("image/jpeg", 0.92);
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

async function prepareImageForOcr(dataUrl: string, mode: OcrImageMode) {
  if (mode === "original") return dataUrl;
  if (mode === "receipt-detect") {
    return (await preprocessReceiptImage(dataUrl)).dataUrl;
  }

  const image = await loadImage(dataUrl);
  const crop =
    mode === "center-crop"
      ? {
          x: image.width * 0.23,
          y: image.height * 0.03,
          width: image.width * 0.54,
          height: image.height * 0.94
        }
      : {
          x: 0,
          y: 0,
          width: image.width,
          height: image.height
        };

  const targetLongSide = 2600;
  const cropLongSide = Math.max(crop.width, crop.height);
  const scale = clamp(targetLongSide / cropLongSide, 0.75, 2.25);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(crop.width * scale);
  canvas.height = Math.round(crop.height * scale);

  const context = canvas.getContext("2d", {
    willReadFrequently: true
  });
  if (!context) return dataUrl;

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    canvas.width,
    canvas.height
  );

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  for (let index = 0; index < data.length; index += 4) {
    const gray = data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
    const contrasted = clamp((gray - 128) * 1.65 + 142, 0, 255);
    data[index] = contrasted;
    data[index + 1] = contrasted;
    data[index + 2] = contrasted;
  }

  context.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/jpeg", 0.94);
}

async function imageFileToDataUrl(file: File) {
  if (!isHeicFile(file)) return blobToDataUrl(file);

  const heicModule = await import("heic2any");
  const heic2any = (heicModule.default ?? heicModule) as HeicConverter;
  const converted = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: 0.92
  });
  const jpegBlob = Array.isArray(converted) ? converted[0] : converted;
  return blobToDataUrl(jpegBlob);
}

export default function NewReceiptPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [ocrLanguage, setOcrLanguage] = useState<OcrLanguage>("jpn+eng");
  const [ocrText, setOcrText] = useState("");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<OcrStatus>("idle");
  const [fileStatus, setFileStatus] = useState<FileStatus>("idle");
  const [ocrEngine, setOcrEngine] = useState<OcrEngine>("vision");
  const [ocrImageMode, setOcrImageMode] = useState<OcrImageMode>("receipt-detect");
  const [cropMargins, setCropMargins] = useState<CropMargins>(emptyCrop);
  const [processedPreviewUrl, setProcessedPreviewUrl] = useState<string | null>(null);
  const [preprocessMessage, setPreprocessMessage] = useState<string | null>(null);
  const [qualityWarning, setQualityWarning] = useState<string | null>(null);
  const [visionUsage, setVisionUsage] = useState<VisionUsage | null>(null);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    setVisionUsage(getVisionUsage());
  }, []);

  async function handleFile(file: File) {
    const heic = isHeicFile(file);
    setError(null);
    setOcrText("");
    setStatus("idle");
    setProgress(0);
    setFileName(file.name);
    setFileStatus(heic ? "converting" : "idle");
    setCropMargins(emptyCrop);
    setProcessedPreviewUrl(null);
    setPreprocessMessage(null);
    setQualityWarning(null);

    try {
      setImageDataUrl(await imageFileToDataUrl(file));
    } catch {
      if (heic) {
        setImageDataUrl(await blobToDataUrl(file));
        setError("แปลง HEIC เป็น JPEG ไม่สำเร็จ แต่จะลองใช้ไฟล์ต้นฉบับต่อ ถ้า preview/OCR ไม่ขึ้น ให้ตั้งค่ากล้อง iPhone เป็น Most Compatible หรือเลือกรูป JPG");
      } else {
        setImageDataUrl(null);
        setError("เปิดรูปไม่สำเร็จ กรุณาลองเลือกรูปใหม่");
      }
    } finally {
      setFileStatus("idle");
    }
  }

  async function runOcr() {
    if (!imageDataUrl) {
      setError("กรุณาเลือกรูปใบเสร็จก่อน");
      return;
    }

    setStatus("reading");
    setError(null);
    setQualityWarning(null);
    setProcessedPreviewUrl(null);
    setPreprocessMessage(null);
    setProgress(0);

    try {
      const croppedImageDataUrl = await cropImageDataUrl(imageDataUrl, cropMargins);
      let nextOcrText = "";

      if (ocrEngine === "vision") {
        const currentUsage = getVisionUsage();
        if (!canCallVision(currentUsage)) {
          setVisionUsage(currentUsage);
          setError("ถึงลิมิต OCR แล้ว กรุณารอหรือปรับ limit ใน Settings");
          setStatus("idle");
          return;
        }

        const imageBlob = await compressImageForVision(croppedImageDataUrl);
        const formData = new FormData();
        formData.append("image", imageBlob, "receipt.jpg");
        const response = await fetch("/api/vision/ocr", {
          method: "POST",
          body: formData
        });
        const responseText = await response.text();
        let result: { success: true; ocrText: string } | { success: false; error?: string };
        try {
          result = JSON.parse(responseText) as
            | { success: true; ocrText: string }
            | { success: false; error?: string };
        } catch {
          result = {
            success: false,
            error: responseText || `Google Vision OCR failed with HTTP ${response.status}`
          };
        }

        const typedResult = result as
          | { success: true; ocrText: string }
          | { success: false; error?: string };

        if (!response.ok || !typedResult.success) {
          throw new Error(typedResult.success ? `Google Vision OCR failed with HTTP ${response.status}` : typedResult.error || `Google Vision OCR failed with HTTP ${response.status}`);
        }

        nextOcrText = typedResult.ocrText.trim();
        setVisionUsage(incrementVisionUsage());
        setProgress(100);
      } else {
        const { recognize } = await import("tesseract.js");
        const effectiveOcrMode =
          hasManualCrop(cropMargins) && ocrImageMode === "center-crop"
            ? "enhanced"
            : ocrImageMode;
        const preprocessed =
          effectiveOcrMode === "receipt-detect"
            ? await preprocessReceiptImage(croppedImageDataUrl)
            : null;
        const ocrImageDataUrl =
          preprocessed?.dataUrl ?? (await prepareImageForOcr(croppedImageDataUrl, effectiveOcrMode));

        if (preprocessed) {
          setProcessedPreviewUrl(preprocessed.dataUrl);
          setPreprocessMessage(preprocessed.message);
        }

        const result = await recognize(ocrImageDataUrl, ocrLanguage, {
          logger: (message) => {
            if (message.status === "recognizing text") {
              setProgress(Math.round((message.progress ?? 0) * 100));
            }
          }
        });
        nextOcrText = result.data.text.trim();
      }

      const quality = checkOcrQuality(nextOcrText);
      if (quality.lowQuality) {
        setQualityWarning("OCRの精度が低い可能性があります。レシート部分だけをクロップするか、撮り直してください。");
      }

      setOcrText(nextOcrText);
      setStatus("done");
      setProgress(100);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown OCR error";
      setStatus("idle");
      setError(`อ่านข้อความไม่สำเร็จ: ${message}`);
    }
  }

  async function rotateImage(degrees: -90 | 90) {
    if (!imageDataUrl) return;
    setImageDataUrl(await rotateImageDataUrl(imageDataUrl, degrees));
    setCropMargins(emptyCrop);
    setProcessedPreviewUrl(null);
    setPreprocessMessage(null);
    setQualityWarning(null);
  }

  function resetPhoto() {
    setImageDataUrl(null);
    setFileName(null);
    setOcrText("");
    setProgress(0);
    setStatus("idle");
    setCropMargins(emptyCrop);
    setProcessedPreviewUrl(null);
    setPreprocessMessage(null);
    setQualityWarning(null);
    setError(null);
    inputRef.current?.click();
  }

  async function parseToItems() {
    if (!imageDataUrl || !ocrText.trim()) {
      setError("กรุณาอ่านข้อความก่อนแปลงเป็นรายการ");
      return;
    }

    const croppedImageDataUrl = await cropImageDataUrl(imageDataUrl, cropMargins);
    const draft = {
      imageDataUrl: croppedImageDataUrl,
      storeName: null,
      purchaseDate: null,
      subtotal: null,
      tax: null,
      total: null,
      aiMemo: "",
      ocrLanguage,
      ocrText,
      items: []
    };

    saveDraftToSession(draft);
    router.push("/receipts/review");
  }

  function updateCrop(side: keyof CropMargins, value: number) {
    setCropMargins((current) => {
      const next = safeCropMargins({
        ...current,
        [side]: value
      });
      const horizontalTotal = next.left + next.right;
      const verticalTotal = next.top + next.bottom;

      if (horizontalTotal > 88 && (side === "left" || side === "right")) {
        next[side] = 88 - next[side === "left" ? "right" : "left"];
      }

      if (verticalTotal > 88 && (side === "top" || side === "bottom")) {
        next[side] = 88 - next[side === "top" ? "bottom" : "top"];
      }

      return next;
    });
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-5 px-4 py-6">
      <header>
        <div className="flex items-center justify-between gap-3">
          <Badge>{ocrEngine === "vision" ? "Google Vision OCR" : "Local OCR"}</Badge>
          <Button variant="ghost" onClick={() => router.push("/receipts/history")}>
            ประวัติ
          </Button>
        </div>
        <h1 className="mt-3 text-2xl font-bold tracking-normal">อ่านใบเสร็จในเครื่อง</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          OCR หลักใช้ Google Vision ผ่าน API route ส่วนข้อมูลใบเสร็จยังบันทึกใน browser นี้
        </p>
      </header>

      <section className="grid gap-4 rounded-lg border bg-card p-4 shadow-sm">
        {imageDataUrl ? (
          <div className="overflow-hidden rounded-md border bg-muted p-2">
            <div className="relative mx-auto w-fit max-w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageDataUrl}
                alt="Receipt preview"
                className="max-h-[48vh] max-w-full object-contain"
              />
              {hasManualCrop(cropMargins) ? (
                <div
                  className="pointer-events-none absolute border-2 border-secondary shadow-[0_0_0_9999px_rgba(0,0,0,0.34)]"
                  style={{
                    top: `${cropMargins.top}%`,
                    right: `${cropMargins.right}%`,
                    bottom: `${cropMargins.bottom}%`,
                    left: `${cropMargins.left}%`
                  }}
                />
              ) : null}
            </div>
          </div>
        ) : (
          <div className="flex min-h-72 items-center justify-center rounded-md border border-dashed bg-muted/60">
            <Camera className="h-16 w-16 text-muted-foreground" aria-hidden="true" />
          </div>
        )}

        {fileName ? (
          <p className="break-all text-center text-sm text-muted-foreground">{fileName}</p>
        ) : null}

        <input
          ref={inputRef}
          className="hidden"
          type="file"
          accept="image/*,.heic,.heif"
          capture="environment"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />

        <Button size="lg" className="w-full" onClick={() => inputRef.current?.click()}>
          <UploadCloud className="h-5 w-5" />
          ถ่าย/อัปโหลดใบเสร็จ
        </Button>

        {imageDataUrl ? (
          <div className="grid gap-3 rounded-md border bg-background p-3">
            <div className="flex items-center justify-between gap-3">
              <Label>ปรับรูปก่อน OCR</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="default"
                  onClick={() => setCropMargins({ top: 3, right: 23, bottom: 3, left: 23 })}
                >
                  <Crop className="h-4 w-4" />
                  ครอปกลาง
                </Button>
                <Button type="button" variant="ghost" size="default" onClick={() => setCropMargins(emptyCrop)}>
                  รีเซ็ต
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button type="button" variant="outline" onClick={() => void rotateImage(-90)}>
                <RotateCcw className="h-4 w-4" />
                หมุนซ้าย
              </Button>
              <Button type="button" variant="outline" onClick={() => void rotateImage(90)}>
                <RotateCw className="h-4 w-4" />
                หมุนขวา
              </Button>
              <Button type="button" variant="outline" onClick={resetPhoto}>
                <RefreshCcw className="h-4 w-4" />
                ถ่ายใหม่
              </Button>
            </div>

            {(["top", "bottom", "left", "right"] as const).map((side) => (
              <div key={side} className="grid grid-cols-[72px_1fr_44px] items-center gap-3">
                <span className="text-sm font-semibold">
                  {side === "top"
                    ? "บน"
                    : side === "bottom"
                      ? "ล่าง"
                      : side === "left"
                        ? "ซ้าย"
                        : "ขวา"}
                </span>
                <Input
                  type="range"
                  min={0}
                  max={60}
                  value={cropMargins[side]}
                  onChange={(event) => updateCrop(side, Number(event.target.value))}
                />
                <span className="text-right text-sm text-muted-foreground">{cropMargins[side]}%</span>
              </div>
            ))}
            <p className="text-xs leading-5 text-muted-foreground">
              ให้กรอบเหลืองครอบเฉพาะใบเสร็จ ตัด laptop/มือ/พื้นหลังออกให้มากที่สุด
            </p>
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 rounded-lg border bg-card p-4 shadow-sm">
        <div className="grid gap-2">
          <Label>OCR mode</Label>
          <Select value={ocrEngine} onValueChange={(value) => setOcrEngine(value as OcrEngine)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OCR_ENGINES.map((engine) => (
                <SelectItem key={engine.value} value={engine.value}>
                  {engine.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {mounted && visionUsage && ocrEngine === "vision" ? (
            <p className="text-xs leading-5 text-muted-foreground">
              Google Vision calls: วันนี้ {visionUsage.callsToday}/{visionUsage.dailyLimit}, เดือนนี้{" "}
              {visionUsage.callsThisMonth}/{visionUsage.monthlyLimit}
            </p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Label>ภาษา OCR</Label>
          <Select value={ocrLanguage} onValueChange={(value) => setOcrLanguage(value as OcrLanguage)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OCR_LANGUAGES.map((language) => (
                <SelectItem key={language} value={language}>
                  {language}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs leading-5 text-muted-foreground">
            การเลือกหลายภาษา เช่น tha+jpn+eng อาจใช้เวลานานกว่า โดยเฉพาะบนมือถือ
          </p>
        </div>

        {ocrEngine === "tesseract" ? (
          <div className="grid gap-2">
          <Label>โหมดภาพ OCR</Label>
          <Select value={ocrImageMode} onValueChange={(value) => setOcrImageMode(value as OcrImageMode)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OCR_IMAGE_MODES.map((mode) => (
                <SelectItem key={mode.value} value={mode.value}>
                  {mode.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs leading-5 text-muted-foreground">
            ถ้าตรวจจับไม่เจอ ให้ใช้ crop manual ให้กรอบเหลืองครอบใบเสร็จก่อน แล้วกดอ่านข้อความอีกครั้ง
          </p>
          </div>
        ) : (
          <p className="rounded-md border bg-muted p-3 text-xs leading-5 text-muted-foreground">
            Google Vision จะใช้ภาพสีที่ครอป/หมุนแล้วและบีบอัดก่อนส่ง ไม่ใช้ threshold หนักแบบ Tesseract
          </p>
        )}

        {processedPreviewUrl ? (
          <div className="grid gap-2 rounded-md border bg-background p-3">
            <Label>ภาพหลัง preprocess</Label>
            <div className="overflow-hidden rounded-sm border bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={processedPreviewUrl}
                alt="Preprocessed receipt"
                className="max-h-80 w-full object-contain"
              />
            </div>
            {preprocessMessage ? (
              <p className="text-xs font-semibold text-muted-foreground">{preprocessMessage}</p>
            ) : null}
          </div>
        ) : null}

        <Button
          size="lg"
          className="w-full"
          disabled={
            !imageDataUrl ||
            status === "reading" ||
            (ocrEngine === "vision" && visionUsage !== null && !canCallVision(visionUsage))
          }
          onClick={runOcr}
        >
          {status === "reading" ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <FileText className="h-5 w-5" />
          )}
          {ocrEngine === "vision" ? "อ่านข้อความด้วย Google Vision" : "อ่านข้อความด้วย Tesseract"}
        </Button>

        {ocrEngine === "vision" && visionUsage !== null && !canCallVision(visionUsage) ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm font-medium text-destructive">
            ถึงลิมิต OCR แล้ว กรุณารอหรือปรับ limit ใน Settings
          </div>
        ) : null}

        {status === "reading" ? (
          <div className="grid gap-2">
            <div className="h-3 overflow-hidden rounded-sm bg-muted">
              <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-center text-sm font-semibold">{progress}%</p>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm font-medium text-destructive">
            {error}
          </div>
        ) : null}

        {qualityWarning ? (
          <div className="rounded-md border border-secondary/50 bg-secondary/15 p-3 text-sm font-semibold">
            {qualityWarning}
          </div>
        ) : null}

        {fileStatus === "converting" ? (
          <div className="flex items-center justify-center gap-2 rounded-md border bg-muted p-3 text-sm font-semibold">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            กำลังแปลง HEIC เป็น JPEG...
          </div>
        ) : null}
      </section>

      <section className="grid gap-3 rounded-lg border bg-card p-4 shadow-sm">
        <Label htmlFor="ocrText">ข้อความ OCR</Label>
        <Textarea
          id="ocrText"
          value={ocrText}
          onChange={(event) => setOcrText(event.target.value)}
          placeholder="ข้อความจากใบเสร็จจะแสดงที่นี่ และแก้ก่อนแปลงได้"
          className="min-h-56"
        />
        <Button size="lg" variant="secondary" disabled={!ocrText.trim()} onClick={parseToItems}>
          แปลงเป็นรายการ
        </Button>
      </section>
    </main>
  );
}
