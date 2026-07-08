import { receiptExtractionSchema } from "@/lib/receiptSchema";
import { parseGeminiJson, validateReceiptExtraction } from "@/lib/validateReceipt";
import type { GeminiModelId } from "@/lib/gemini-models";
import type { OcrLanguage } from "@/lib/types/receipt";

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};

type GeminiApiError = Error & {
  status?: string;
  httpStatus?: number;
  model?: string;
};

function sleep(ms: number) {
  return new Promise((resolve) => globalThis.setTimeout(resolve, ms));
}

function buildPrompt(ocrText: string, ocrLanguage: OcrLanguage) {
  return `Convert this Japanese/Thai receipt OCR text into structured receipt JSON.

OCR language: ${ocrLanguage}

Rules:
- Return only valid JSON.
- No markdown.
- No explanation.
- Do not invent items not present in OCR text.
- Do not treat phone numbers as prices.
- Do not treat dates as prices.
- Do not treat times as prices.
- Do not treat point balances as item prices.
- Do not treat tax lines as purchased items.
- Do not treat subtotal/shipping/total/payment lines as purchased items.
- Extract subtotal, tax, shipping, and total separately.
- Treat labels such as Shipping, 送料, 配送, delivery, delivery fee, and shipping fee as shipping.
- Do not include shipping as an item.
- purchaseDate must be a full unambiguous calendar date in YYYY-MM-DD format.
- If the OCR only shows month/day without a year, or shows an ambiguous numeric date like 04/06, set purchaseDate to null unless the nearby text clearly identifies it as a purchase/order/issue date.
- Never use shipping or dispatch dates such as 発送, 出荷, 以降発送, delivery, or shipping labels as purchaseDate.
- Extract only real purchased items.
- If uncertain, set memo = "要確認".
- Currency is JPY unless clearly different.
- Keep Japanese or Thai product text in rawName.
- displayName must be easy readable English.
- Use a natural common English product name when you know it.
- If the exact English name is unclear, use a short romanized name instead of Japanese or Thai script.
- Do not leave displayName in Japanese script or Thai script.
- Keep displayName concise, like a product label someone can scan quickly.
- If category is Food, set isResaleItem = false.
- If category is Trading Card, Figure, Ichiban Kuji, Book, Toy, Game, Monchhichi, set isResaleItem = true.
- If unsure whether resale item or not, set isResaleItem = true and memo = "要確認".

Categories:
- Trading Card
- Figure
- Ichiban Kuji
- Book
- Toy
- Game
- Monchhichi
- Food
- Daily Goods
- Transport
- Other

OCR text:
${ocrText}`;
}

function promptForGemini(ocrText: string, ocrLanguage: OcrLanguage) {
  return buildPrompt(ocrText, ocrLanguage);
}

function getResponseText(response: GeminiResponse) {
  return response.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();
}

function summarizeText(text: string, limit = 400) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit)}…`;
}

function uniqueModels(models: string[]) {
  return Array.from(new Set(models.map((model) => model.trim()).filter(Boolean)));
}

function fallbackModels(primaryModel: string) {
  return uniqueModels([
    primaryModel,
    ...(process.env.GEMINI_FALLBACK_MODELS || "gemini-3-flash-preview,gemini-2.5-flash,gemini-2.5-flash-lite")
      .split(",")
      .map((model) => model.trim())
  ]);
}

function isRetryableGeminiError(error: unknown) {
  const geminiError = error as GeminiApiError;
  return geminiError.status === "UNAVAILABLE" || geminiError.status === "RESOURCE_EXHAUSTED" || geminiError.httpStatus === 503;
}

async function callGemini({
  apiKey,
  model,
  ocrText,
  ocrLanguage
}: {
  apiKey: string;
  model: string;
  ocrText: string;
  ocrLanguage: OcrLanguage;
}) {
  const startedAt = Date.now();
  const prompt = promptForGemini(ocrText, ocrLanguage);
  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: prompt
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
      responseJsonSchema: receiptExtractionSchema
    }
  };

  console.log("[gemini] request start", {
    model,
    ocrLanguage,
    ocrTextLength: ocrText.length,
    promptLength: prompt.length,
    responseMimeType: requestBody.generationConfig.responseMimeType,
    hasResponseJsonSchema: Boolean(requestBody.generationConfig.responseJsonSchema),
    ocrPreview: summarizeText(ocrText, 300)
  });

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify(requestBody)
    }
  );

  const responseBody = (await response.json().catch(() => null)) as GeminiResponse | null;
  console.log("[gemini] response received", {
    model,
    ok: response.ok,
    status: response.status,
    durationMs: Date.now() - startedAt
  });

  if (!response.ok) {
    const geminiMessage = responseBody?.error?.message;
    const geminiStatus = responseBody?.error?.status;
    const error = new Error(
      geminiMessage
        ? `Gemini request failed: ${geminiStatus ? `${geminiStatus}: ` : ""}${geminiMessage}`
        : `Gemini request failed with status ${response.status}.`
    ) as GeminiApiError;
    error.status = geminiStatus;
    error.httpStatus = response.status;
    error.model = model;
    throw error;
  }

  return responseBody;
}

export async function extractReceiptWithGemini({
  ocrText,
  ocrLanguage,
  modelOverride
}: {
  ocrText: string;
  ocrLanguage: OcrLanguage;
  modelOverride?: GeminiModelId | null;
}) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = modelOverride || process.env.GEMINI_MODEL || "gemini-3-flash-preview";

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  let responseBody: GeminiResponse | null = null;
  let lastError: unknown = null;

  for (const candidateModel of fallbackModels(model)) {
    for (const delay of [0, 700]) {
      if (delay) await sleep(delay);
      try {
        responseBody = await callGemini({
          apiKey,
          model: candidateModel,
          ocrText,
          ocrLanguage
        });
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
        if (!isRetryableGeminiError(error)) {
          throw error;
        }
      }
    }
    if (responseBody) break;
  }

  if (!responseBody && lastError) {
    throw lastError;
  }

  const rawText = responseBody ? getResponseText(responseBody) : "";
  if (!rawText) {
    throw new Error("Gemini returned an empty response.");
  }

  console.log("[gemini] raw response", {
    model,
    rawLength: rawText.length,
    rawPreview: summarizeText(rawText)
  });

  const parsed = parseGeminiJson(rawText);
  if (!parsed.ok) {
    console.log("[gemini] parse failed", {
      model,
      error: parsed.error,
      rawPreview: summarizeText(rawText)
    });
    return {
      ok: false as const,
      rawText,
      error: parsed.error
    };
  }

  const validated = validateReceiptExtraction(parsed.value, { ocrLanguage });
  console.log("[gemini] validated extraction", {
    model,
    storeName: validated.storeName,
    purchaseDate: validated.purchaseDate,
    subtotal: validated.subtotal,
    tax: validated.tax,
    shipping: validated.shipping,
    total: validated.total,
    itemCount: validated.items.length,
    items: validated.items.map((item) => ({
      rawName: item.rawName,
      displayName: item.displayName,
      category: item.category,
      quantity: item.quantity,
      totalPrice: item.totalPrice,
      isResaleItem: item.isResaleItem,
      memo: item.memo
    }))
  });

  return {
    ok: true as const,
    rawText,
    data: validated
  };
}
