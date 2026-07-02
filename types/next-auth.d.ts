import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    googleAccessToken?: string;
    googleIdToken?: string;
    googleTokenError?: string;
    user?: DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    idToken?: string;
    accessTokenExpires?: number;
    refreshToken?: string;
    error?: string;
  }
}
