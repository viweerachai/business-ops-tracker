export type OcrQualityResult = {
  lowQuality: boolean;
  issues: string[];
};

const yenPattern = /[¥￥円]|\b\d{2,3}(?:,\d{3})+\b|\b[1-9]\d{2,5}\b/;
const datePattern = /\b20\d{2}[/-]\d{1,2}[/-]\d{1,2}\b|(?:20)?\d{2}年\s*\d{1,2}月\s*\d{1,2}日/;
const totalKeywordPattern = /合計|小計|お支払い|お支払|総計|税込合計/;
const unrelatedLinePattern = /https?:|www\.|@|利用規約|プライバシー|会員|アプリ|キャンペーン|ポイント|登録番号|電話|TEL/i;

export function checkOcrQuality(ocrText: string): OcrQualityResult {
  const normalized = ocrText.trim();
  const lines = normalized.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const issues: string[] = [];

  if (normalized.length < 40 || lines.length < 3) {
    issues.push("OCR text is too short.");
  }

  if (!yenPattern.test(normalized)) {
    issues.push("No yen amount found.");
  }

  if (!datePattern.test(normalized)) {
    issues.push("No date found.");
  }

  if (!totalKeywordPattern.test(normalized)) {
    issues.push("No total/subtotal/payment keyword found.");
  }

  const unrelatedCount = lines.filter((line) => unrelatedLinePattern.test(line)).length;
  if (lines.length >= 8 && unrelatedCount / lines.length > 0.35) {
    issues.push("Too many unrelated lines.");
  }

  return {
    lowQuality: issues.length >= 2,
    issues
  };
}
