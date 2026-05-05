import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadReceiptImage } from "@/lib/google/drive";
import { getOrCreateExpenseStorageStructure, sanitizeDriveName } from "@/lib/google/storageStructure";

export const runtime = "nodejs";

type UploadBody = {
  expenseId?: string;
  companyName?: string;
  purchaseDate?: string;
  storeName?: string;
  imageDataUrl?: string | null;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function compactDate(date: string) {
  return date.replaceAll("-", "") || new Date().toISOString().slice(0, 10).replaceAll("-", "");
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const accessToken = session?.googleAccessToken;

  if (!accessToken || session.googleTokenError) {
    return NextResponse.json({ success: false, error: "Google login is required." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as UploadBody;
    const expenseId = text(body.expenseId) || crypto.randomUUID();
    const companyName = text(body.companyName) || "ธุรกิจของฉัน";
    const purchaseDate = text(body.purchaseDate) || new Date().toISOString().slice(0, 10);
    const year = purchaseDate.slice(0, 4);
    const storeName = text(body.storeName) || "receipt";
    const imageDataUrl = text(body.imageDataUrl);
    if (!imageDataUrl) {
      return NextResponse.json({ success: true, driveFile: null, folders: null, imageFileName: "" });
    }

    const storage = await getOrCreateExpenseStorageStructure(accessToken, companyName, year);
    const imageFileName = `receipt_${compactDate(purchaseDate)}_${sanitizeDriveName(storeName)}_${expenseId}.jpg`;
    const driveFile = await uploadReceiptImage({
      accessToken,
      imagesFolderId: storage.imagesFolder.id,
      imageDataUrl,
      fileName: imageFileName
    });

    return NextResponse.json({
      success: true,
      driveFile,
      imageFileName,
      folders: {
        rootFolderId: storage.rootFolder.id,
        companyFolderId: storage.companyFolder.id,
        yearFolderId: storage.yearFolder.id,
        imagesFolderId: storage.imagesFolder.id
      }
    });
  } catch (error) {
    console.error("Google receipt image upload failed:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Could not upload receipt image." },
      { status: 500 }
    );
  }
}
