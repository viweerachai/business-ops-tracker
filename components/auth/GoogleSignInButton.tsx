"use client";

import { LogIn } from "lucide-react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function GoogleSignInButton({
  callbackUrl = "/expenses",
  className = "",
  onBeforeSignIn
}: {
  callbackUrl?: string;
  className?: string;
  onBeforeSignIn?: () => void;
}) {
  return (
    <Button
      type="button"
      className={["h-11 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white hover:bg-slate-800", className].join(" ")}
      onClick={() => {
        onBeforeSignIn?.();
        signIn("google", { callbackUrl });
      }}
    >
      <LogIn className="h-4 w-4" />
      เข้าสู่ระบบ Google
    </Button>
  );
}
