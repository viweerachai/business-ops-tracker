import { NextResponse } from "next/server";
import { extractReceiptWithGemini } from "@/lib/gemini";
import { GEMINI_MODEL_AUTO, isGeminiModelId, isGeminiModelPreference } from "@/lib/gemini-models";
import { resolvePurchaseDate } from "@/lib/local/parser";
import { OCR_LANGUAGES, type OcrLanguage } from "@/lib/types/receipt";

export const runtime = "nodejs";

function isOcrLanguage(value: unknown): value is OcrLanguage {
  return OCR_LANGUAGES.includes(value as OcrLanguage);
}

export async function POST(request: Request) {
  const startedAt = Date.now();

  try {
    const body = (await request.json()) as {
      ocrText?: unknown;
      ocrLanguage?: unknown;
      geminiModel?: unknown;
    };

    if (typeof body.ocrText !== "string" || !body.ocrText.trim()) {
      return NextResponse.json(
        { success: false, error: "ocrText is required." },
        { status: 400 }
      );
    }

    if (!isOcrLanguage(body.ocrLanguage)) {
      return NextResponse.json(
        { success: false, error: "ocrLanguage is invalid." },
        { status: 400 }
      );
    }

    if (body.geminiModel !== undefined && !isGeminiModelPreference(body.geminiModel)) {
      return NextResponse.json(
        { success: false, error: "geminiModel is invalid." },
        { status: 400 }
      );
    }

    const modelOverride = isGeminiModelId(body.geminiModel) ? body.geminiModel : null;

    console.log("[api/gemini] request", {
      ocrLanguage: body.ocrLanguage,
      geminiModel: body.geminiModel || GEMINI_MODEL_AUTO,
      modelOverride,
      ocrTextLength: body.ocrText.length,
      ocrTextPreview: body.ocrText.slice(0, 300)
    });

    const geminiStartedAt = Date.now();
    const result = await extractReceiptWithGemini({
      ocrText: body.ocrText,
      ocrLanguage: body.ocrLanguage,
      modelOverride
    });
    const geminiDurationMs = Date.now() - geminiStartedAt;

    if (!result.ok) {
      console.log("[api/gemini] failed", {
        durationMs: Date.now() - startedAt,
        geminiDurationMs,
        error: result.error
      });
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          rawOutput: result.rawText
        },
        { status: 502 }
      );
    }

    const resolvedPurchaseDate = resolvePurchaseDate(body.ocrText, result.data.purchaseDate);
    const finalPurchaseDate = resolvedPurchaseDate.value;
    if (resolvedPurchaseDate.source !== "exact") {
      console.log("[api/gemini] overriding purchaseDate from OCR", {
        geminiPurchaseDate: result.data.purchaseDate,
        finalPurchaseDate,
        source: resolvedPurchaseDate.source
      });
    }

    console.log("[api/gemini] success", {
      durationMs: Date.now() - startedAt,
      geminiDurationMs,
      storeName: result.data.storeName,
      purchaseDate: finalPurchaseDate,
      subtotal: result.data.subtotal,
      tax: result.data.tax,
      shipping: result.data.shipping,
      total: result.data.total,
      itemCount: result.data.items.length,
      dateSource: resolvedPurchaseDate.source
    });

    return NextResponse.json({
      success: true,
      data: {
        ...result.data,
        purchaseDate: finalPurchaseDate
      },
      purchaseDateSource: resolvedPurchaseDate.source
    });
  } catch (error) {
    console.error("[api/gemini] error", {
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : "Gemini extraction failed."
    });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Gemini extraction failed."
      },
      { status: 500 }
    );
  }
}
