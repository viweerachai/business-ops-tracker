import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOrCreateExpenseSpreadsheet } from "@/lib/google/sheets";
import { getOrCreateExpenseStorageStructure } from "@/lib/google/storageStructure";

export const runtime = "nodejs";

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const accessToken = session?.googleAccessToken;

  if (!accessToken) {
    return NextResponse.json({ success: false, error: "Google login is required." }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { companyName?: string; year?: string | number };
    const companyName = text(body.companyName) || "หมาชัย จำกัด";
    const year = text(body.year) || String(new Date().getFullYear());
    const storage = await getOrCreateExpenseStorageStructure(accessToken, companyName, year);
    const spreadsheet = await getOrCreateExpenseSpreadsheet(accessToken, companyName, year, storage.yearFolder.id);

    return NextResponse.json({
      success: true,
      spreadsheet,
      folders: {
        rootFolder: storage.rootFolder,
        companyFolder: storage.companyFolder,
        yearFolder: storage.yearFolder,
        imagesFolder: storage.imagesFolder
      }
    });
  } catch (error) {
    console.error("Google create storage failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Could not create Google storage."
      },
      { status: 500 }
    );
  }
}
