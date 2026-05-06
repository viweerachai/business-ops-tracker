import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  {
    params
  }: {
    params: Promise<{
      fileId: string;
    }>;
  }
) {
  const session = await getServerSession(authOptions);
  const accessToken = session?.googleAccessToken;

  if (!accessToken || session.googleTokenError) {
    return NextResponse.json({ success: false, error: "Google login is required." }, { status: 401 });
  }

  const { fileId } = await params;
  if (!fileId) {
    return NextResponse.json({ success: false, error: "fileId is required." }, { status: 400 });
  }

  try {
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      return NextResponse.json(
        { success: false, error: errorText || `Google Drive image failed with HTTP ${response.status}` },
        { status: response.status }
      );
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const url = new URL(request.url);
    const shouldDownload = url.searchParams.get("download") === "1";
    const fileName = url.searchParams.get("name") || "receipt-image.jpg";
    const headers = new Headers({
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=300"
    });
    if (shouldDownload) {
      headers.set("Content-Disposition", `attachment; filename="${fileName.replace(/"/g, "")}"`);
    }

    return new NextResponse(response.body, {
      headers
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Could not load Google Drive image." },
      { status: 500 }
    );
  }
}
