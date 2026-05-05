import type { ReceiptDraft } from "@/lib/types/receipt";

const draftKey = "receipt-reader-current-draft";

export function saveDraftToSession(draft: ReceiptDraft) {
  sessionStorage.setItem(draftKey, JSON.stringify(draft));
}

export function loadDraftFromSession(): ReceiptDraft | null {
  const raw = sessionStorage.getItem(draftKey);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as ReceiptDraft;
  } catch {
    return null;
  }
}

export function clearDraftFromSession() {
  sessionStorage.removeItem(draftKey);
}
