"use client";

import { signOut as firebaseSignOut } from "firebase/auth";
import { signOut as nextAuthSignOut } from "next-auth/react";
import { getFirebaseAuth, hasFirebaseConfig } from "@/lib/firebase/client";
import { pauseFirebaseAuthSync } from "@/lib/firebase/firestore";

export async function signOutEverywhere(callbackUrl = "/") {
  console.log("[auth-client] signOutEverywhere start", { callbackUrl });
  pauseFirebaseAuthSync("logout-clicked");

  if (hasFirebaseConfig()) {
    try {
      console.log("[auth-client] signing out firebase auth");
      await firebaseSignOut(getFirebaseAuth());
      console.log("[auth-client] firebase auth signed out");
    } catch {
      console.warn("[auth-client] firebase sign-out failed, continuing with next-auth sign-out");
      // Ignore Firebase sign-out errors and continue with NextAuth sign-out.
    }
  }

  console.log("[auth-client] signing out next-auth");
  await nextAuthSignOut({ callbackUrl, redirect: true });
}
