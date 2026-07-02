import { NextResponse } from "next/server";
import { createSign } from "node:crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";

type ServiceAccountCredentials = {
  client_email?: string;
  private_key?: string;
};

type FirebaseServiceAccount = {
  client_email: string;
  private_key: string;
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
      private_key: credentials.private_key.replace(/\\n/g, "\n")
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

function base64UrlEncode(value: Buffer | string) {
  return Buffer.from(value).toString("base64url");
}

function createFirebaseCustomToken(uid: string, serviceAccount: FirebaseServiceAccount) {
  const header = {
    alg: "RS256",
    typ: "JWT"
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit",
    uid,
    iat: now,
    exp: now + 60 * 60
  };

  const unsignedToken = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(payload))}`;
  const signature = createSign("RSA-SHA256").update(unsignedToken).sign(serviceAccount.private_key);
  return `${unsignedToken}.${signature.toString("base64url")}`;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim();

  if (!session?.user || !email) {
    return NextResponse.json(
      {
        success: false,
        error: "Google login is required."
      },
      { status: 401 }
    );
  }

  const credentials = loadCredentials();
  if (!credentials) {
    return NextResponse.json(
      {
        success: false,
        error: "GOOGLE_SERVICE_ACCOUNT_JSON is not configured."
      },
      { status: 500 }
    );
  }

  try {
    const firebaseCustomToken = createFirebaseCustomToken(email, credentials);
    return NextResponse.json({
      success: true,
      firebaseCustomToken,
      firebaseUid: email,
      email
    });
  } catch (error) {
    console.error("[firebase-custom-token] failed", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Could not create Firebase custom token."
      },
      { status: 500 }
    );
  }
}
