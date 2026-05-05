import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    googleAccessToken?: string;
    googleTokenError?: string;
    user?: DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    accessTokenExpires?: number;
    refreshToken?: string;
    error?: string;
  }
}
