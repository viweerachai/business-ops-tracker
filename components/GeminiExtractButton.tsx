"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GeminiReceiptExtraction } from "@/lib/receiptSchema";
import type { OcrLanguage } from "@/lib/types/receipt";

type GeminiApiResponse =
  | {
      success: true;
      data: GeminiReceiptExtraction;
    }
  | {
      success: false;
      error: string;
      rawOutput?: string;
    };

export function GeminiExtractButton({
  ocrText,
  ocrLanguage,
  onExtracted,
  onError
}: {
  ocrText: string;
  ocrLanguage: OcrLanguage;
  onExtracted: (data: GeminiReceiptExtraction) => void;
  onError: (message: string, rawOutput?: string) => void;
}) {
  const [loading, setLoading] = useState(false);

  async function extract() {
    setLoading(true);
    onError("");

    try {
      const response = await fetch("/api/gemini/extract-receipt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ocrText,
          ocrLanguage
        })
      });
      const result = (await response.json()) as GeminiApiResponse;

      if (!result.success) {
        onError(result.error || "Gemini แปลงรายการไม่สำเร็จ", result.rawOutput);
        return;
      }

      onExtracted(result.data);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Gemini แปลงรายการไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button type="button" variant="secondary" size="lg" disabled={loading || !ocrText.trim()} onClick={extract}>
      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
      {loading ? "Gemini กำลังแปลงรายการ..." : "ใช้ Gemini แปลงเป็นรายการ"}
    </Button>
  );
}
