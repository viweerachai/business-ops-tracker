export const GEMINI_MODEL_AUTO = "auto";

export const GEMINI_MODEL_OPTIONS = [
  {
    value: GEMINI_MODEL_AUTO,
    label: "Auto",
    description: "ใช้ GEMINI_MODEL จาก .env.local"
  },
  {
    value: "gemini-2.5-flash-lite",
    label: "2.5 Flash Lite",
    description: "เร็วและเบา เหมาะกับ OCR text"
  },
  {
    value: "gemini-2.5-flash",
    label: "2.5 Flash",
    description: "สมดุลความเร็วและคุณภาพ"
  },
  {
    value: "gemini-3-flash-preview",
    label: "3 Flash Preview",
    description: "รุ่น preview ตามค่า fallback เดิม"
  }
] as const;

export type GeminiModelPreference = (typeof GEMINI_MODEL_OPTIONS)[number]["value"];
export type GeminiModelId = Exclude<GeminiModelPreference, typeof GEMINI_MODEL_AUTO>;

export function isGeminiModelPreference(value: unknown): value is GeminiModelPreference {
  return GEMINI_MODEL_OPTIONS.some((option) => option.value === value);
}

export function isGeminiModelId(value: unknown): value is GeminiModelId {
  return value !== GEMINI_MODEL_AUTO && isGeminiModelPreference(value);
}
