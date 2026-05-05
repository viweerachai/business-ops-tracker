import type { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

type GoogleTokenResponse = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  error?: string;
  error_description?: string;
};

async function refreshGoogleAccessToken(token: Record<string, unknown>) {
  try {
    const refreshToken = typeof token.refreshToken === "string" ? token.refreshToken : "";
    if (!refreshToken) {
      return {
        ...token,
        error: "MissingRefreshToken"
      };
    }

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID ?? "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        grant_type: "refresh_token",
        refresh_token: refreshToken
      })
    });
    const refreshed = (await response.json()) as GoogleTokenResponse;

    if (!response.ok || refreshed.error) {
      throw new Error(refreshed.error_description || refreshed.error || "Could not refresh Google token.");
    }

    return {
      ...token,
      accessToken: refreshed.access_token,
      accessTokenExpires: Date.now() + (refreshed.expires_in ?? 3600) * 1000,
      refreshToken: refreshed.refresh_token ?? refreshToken,
      error: undefined
    };
  } catch {
    return {
      ...token,
      error: "RefreshAccessTokenError"
    };
  }
}

export const googleOAuthScope =
  "openid email profile https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file";

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: googleOAuthScope
        }
      }
    })
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt"
  },
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        return {
          ...token,
          accessToken: account.access_token,
          accessTokenExpires: typeof account.expires_at === "number" ? account.expires_at * 1000 : Date.now() + 3600 * 1000,
          refreshToken: account.refresh_token ?? token.refreshToken
        };
      }

      const expiresAt = typeof token.accessTokenExpires === "number" ? token.accessTokenExpires : 0;
      if (Date.now() < expiresAt - 60_000) {
        return token;
      }

      return refreshGoogleAccessToken(token);
    },
    async session({ session, token }) {
      session.googleAccessToken = typeof token.accessToken === "string" ? token.accessToken : undefined;
      session.googleTokenError = typeof token.error === "string" ? token.error : undefined;
      return session;
    }
  }
};
