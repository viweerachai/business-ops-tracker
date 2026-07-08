import { NextResponse } from "next/server";
import { getApps, cert, initializeApp, type ServiceAccount } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ServiceAccountCredentials = {
  client_email?: string;
  private_key?: string;
  project_id?: string;
};

type FirebaseServiceAccount = {
  client_email: string;
  private_key: string;
  project_id?: string;
};

let cachedCredentials: FirebaseServiceAccount | null | undefined;

function parseServiceAccountJson(): FirebaseServiceAccount | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return null;

  try {
    const jsonText = raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
    const credentials = JSON.parse(jsonText) as ServiceAccountCredentials;
    if (!credentials.client_email || !credentials.private_key) {
      throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON must include client_email and private_key.");
    }
    return {
      client_email: credentials.client_email,
      private_key: credentials.private_key.replace(/\\n/g, "\n"),
      project_id: credentials.project_id
    };
  } catch (error) {
    throw new Error(
      error instanceof Error ? `Invalid GOOGLE_SERVICE_ACCOUNT_JSON: ${error.message}` : "Invalid GOOGLE_SERVICE_ACCOUNT_JSON."
    );
  }
}

function loadCredentials(): FirebaseServiceAccount | null {
  if (cachedCredentials !== undefined) return cachedCredentials;
  const parsed = parseServiceAccountJson();
  cachedCredentials = parsed;
  return parsed;
}

function getFirebaseAdminAuth() {
  const credentials = loadCredentials();
  if (!credentials) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not configured.");
  }

  if (getApps().length === 0) {
    const serviceAccount: ServiceAccount = {
      projectId: credentials.project_id ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: credentials.client_email,
      privateKey: credentials.private_key
    };
    initializeApp({
      credential: cert(serviceAccount),
      projectId: credentials.project_id ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    });
  }

  return getAuth();
}

function decodeJwtPayload(token: string) {
  const payload = token.split(".")[1];
  if (!payload) return null;

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      aud?: string;
      exp?: number;
      iat?: number;
      iss?: string;
      uid?: string;
    };
  } catch {
    return null;
  }
}

function jsonNoStore(body: Record<string, unknown>, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  headers.set("Pragma", "no-cache");
  headers.set("Expires", "0");
  return NextResponse.json(body, {
    ...init,
    headers
  });
}

async function handleFirebaseCustomToken() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim();

  if (!session?.user || !email) {
    return jsonNoStore(
      {
        success: false,
        error: "Google login is required."
      },
      { status: 401 }
    );
  }

  try {
    const auth = getFirebaseAdminAuth();
    const firebaseCustomToken = await auth.createCustomToken(email, {
      name: session.user.name ?? undefined,
      picture: session.user.image ?? undefined
    });
    const tokenPayload = decodeJwtPayload(firebaseCustomToken);

    return jsonNoStore({
      success: true,
      firebaseCustomToken,
      firebaseUid: email,
      email,
      debug: {
        aud: tokenPayload?.aud ?? null,
        exp: tokenPayload?.exp ?? null,
        iat: tokenPayload?.iat ?? null,
        iss: tokenPayload?.iss ?? null,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? null,
        serverNow: Math.floor(Date.now() / 1000),
        uid: tokenPayload?.uid ?? null
      }
    });
  } catch (error) {
    console.error("[firebase-custom-token] failed", error);
    return jsonNoStore(
      {
        success: false,
        error: error instanceof Error ? error.message : "Could not create Firebase custom token."
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  return handleFirebaseCustomToken();
}

export async function GET() {
  return handleFirebaseCustomToken();
}
