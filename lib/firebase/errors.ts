export function formatFirestoreError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";

  if (code.includes("permission-denied") || message.includes("Missing or insufficient permissions")) {
    return [
      "Firestore rules ยังไม่อนุญาตให้บัญชีนี้อ่าน/เขียนข้อมูล",
      "ให้ deploy firestore.rules ไปที่ Firebase project ก่อน แล้ว refresh หน้าอีกครั้ง",
      "คำสั่ง: npx firebase-tools login แล้วตามด้วย npx firebase-tools deploy --only firestore:rules --project qualified-world-160916"
    ].join("\n");
  }

  return message;
}
