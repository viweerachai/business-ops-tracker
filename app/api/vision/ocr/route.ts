import { NextResponse } from "next/server";
import { GoogleAuth } from "google-auth-library";
import { existsSync } from "node:fs";
import path from "node:path";

export const runtime = "nodejs";

function stripDataUrlPrefix(value: string) {
  return value.replace(/^data:[^;]+;base64,/, "");
}

function resolveCredentialsPath() {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) return null;
  return path.isAbsolute(process.env.GOOGLE_APPLICATION_CREDENTIALS)
    ? process.env.GOOGLE_APPLICATION_CREDENTIALS
    : path.resolve(process.cwd(), process.env.GOOGLE_APPLICATION_CREDENTIALS);
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message && error.message !== "undefined undefined: undefined") {
    return error.message;
  }
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const parts = [record.code, record.details, record.message, record.status]
      .map((part) => (part === undefined || part === null ? "" : String(part)))
      .filter((part) => part && part !== "undefined")
      .filter(Boolean);
    if (parts.length > 0) return parts.join(" ");
  }
  return "Google Vision OCR failed. Check that Cloud Vision API is enabled, billing is enabled, and the service account has permission.";
}

function getGoogleApiError(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const error = record.error;
  if (!error || typeof error !== "object") return null;
  const googleError = error as Record<string, unknown>;
  const code = googleError.code ? `HTTP ${googleError.code}` : "";
  const status = googleError.status ? String(googleError.status) : "";
  const message = googleError.message ? String(googleError.message) : "";
  return [code, status, message].filter(Boolean).join(" - ");
}

export async function GET() {
  const credentialsPath = resolveCredentialsPath();

  return NextResponse.json({
    success: true,
    projectId: process.env.GOOGLE_CLOUD_PROJECT || null,
    credentialsConfigured: Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS),
    credentialsPath,
    credentialsFileExists: credentialsPath ? existsSync(credentialsPath) : false
  });
}

async function imageBufferFromRequest(request: Request) {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const image = formData.get("image");
    if (!(image instanceof File)) {
      throw new Error("multipart field image is required.");
    }
    return Buffer.from(await image.arrayBuffer());
  }

  const body = (await request.json()) as {
    imageBase64?: unknown;
  };
  if (typeof body.imageBase64 !== "string" || !body.imageBase64.trim()) {
    throw new Error("imageBase64 is required.");
  }

  return Buffer.from(stripDataUrlPrefix(body.imageBase64), "base64");
}

export async function POST(request: Request) {
  try {
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      return NextResponse.json(
        {
          success: false,
          error: "Google Vision credentials are not configured. Set GOOGLE_APPLICATION_CREDENTIALS."
        },
        { status: 500 }
      );
    }

    const credentialsPath = resolveCredentialsPath();

    if (!credentialsPath || !existsSync(credentialsPath)) {
      return NextResponse.json(
        {
          success: false,
          error: `GOOGLE_APPLICATION_CREDENTIALS file not found: ${credentialsPath}`
        },
        { status: 500 }
      );
    }

    const imageBuffer = await imageBufferFromRequest(request);
    const auth = new GoogleAuth({
      projectId: process.env.GOOGLE_CLOUD_PROJECT,
      keyFilename: credentialsPath,
      scopes: ["https://www.googleapis.com/auth/cloud-platform"]
    });
    const accessToken = await auth.getAccessToken();

    if (!accessToken) {
      throw new Error("Could not create Google access token from service account credentials.");
    }

    const visionResponse = await fetch("https://vision.googleapis.com/v1/images:annotate", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        requests: [
          {
            image: {
              content: imageBuffer.toString("base64")
            },
            features: [
              {
                type: "DOCUMENT_TEXT_DETECTION",
                maxResults: 1
              }
            ]
          }
        ]
      })
    });
    const visionJson = (await visionResponse.json().catch(() => null)) as
      | {
          responses?: Array<{
            fullTextAnnotation?: {
              text?: string;
              pages?: unknown[];
            };
            error?: {
              code?: number;
              message?: string;
              status?: string;
            };
          }>;
          error?: {
            code?: number;
            message?: string;
            status?: string;
          };
        }
      | null;

    const apiError =
      getGoogleApiError(visionJson) ||
      getGoogleApiError(visionJson?.responses?.[0] ?? null);

    if (!visionResponse.ok || apiError) {
      return NextResponse.json(
        {
          success: false,
          error: apiError || `Google Vision API failed with HTTP ${visionResponse.status}`,
          raw: process.env.NODE_ENV === "development" ? visionJson : undefined
        },
        { status: visionResponse.ok ? 502 : visionResponse.status }
      );
    }

    const firstResponse = visionJson?.responses?.[0];
    const ocrText = firstResponse?.fullTextAnnotation?.text?.trim() || "";

    if (!ocrText) {
      return NextResponse.json(
        {
          success: false,
          error: "Google Vision did not find text in this image."
        },
        { status: 422 }
      );
    }

    const debug = new URL(request.url).searchParams.get("debug") === "1";
    return NextResponse.json({
      success: true,
      ocrText,
      pages: firstResponse?.fullTextAnnotation?.pages ?? [],
      raw: process.env.NODE_ENV === "development" && debug ? visionJson : undefined
    });
  } catch (error) {
    const message = getErrorMessage(error);
    console.error("Google Vision OCR failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: message
      },
      { status: 500 }
    );
  }
}
