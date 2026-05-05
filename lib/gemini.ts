import { receiptExtractionSchema } from "@/lib/receiptSchema";
import { parseGeminiJson, validateReceiptExtraction } from "@/lib/validateReceipt";
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
- Do not treat subtotal/total/payment lines as purchased items.
- Extract subtotal, tax, and total separately.
- Extract only real purchased items.
- If uncertain, set memo = "要確認".
- Currency is JPY unless clearly different.
- Keep Japanese or Thai product text in rawName.
- displayName should be simplified and readable.
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

function getResponseText(response: GeminiResponse) {
  return response.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();
}

function uniqueModels(models: string[]) {
  return Array.from(new Set(models.map((model) => model.trim()).filter(Boolean)));
}

function fallbackModels(primaryModel: string) {
  return uniqueModels([
    primaryModel,
    ...(process.env.GEMINI_FALLBACK_MODELS || "gemini-2.5-flash-lite,gemini-2.0-flash")
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
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: buildPrompt(ocrText, ocrLanguage)
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
          responseJsonSchema: receiptExtractionSchema
        }
      })
    }
  );

  const responseBody = (await response.json().catch(() => null)) as GeminiResponse | null;

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
  ocrLanguage
}: {
  ocrText: string;
  ocrLanguage: OcrLanguage;
}) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

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

  const parsed = parseGeminiJson(rawText);
  if (!parsed.ok) {
    return {
      ok: false as const,
      rawText,
      error: parsed.error
    };
  }

  return {
    ok: true as const,
    rawText,
    data: validateReceiptExtraction(parsed.value, { ocrLanguage })
  };
}
