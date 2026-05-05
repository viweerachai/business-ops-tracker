import { NextResponse } from "next/server";
import { extractReceiptWithGemini } from "@/lib/gemini";
import { OCR_LANGUAGES, type OcrLanguage } from "@/lib/types/receipt";

export const runtime = "nodejs";

function isOcrLanguage(value: unknown): value is OcrLanguage {
  return OCR_LANGUAGES.includes(value as OcrLanguage);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      ocrText?: unknown;
      ocrLanguage?: unknown;
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

    const result = await extractReceiptWithGemini({
      ocrText: body.ocrText,
      ocrLanguage: body.ocrLanguage
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          rawOutput: result.rawText
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Gemini extraction failed."
      },
      { status: 500 }
    );
  }
}
