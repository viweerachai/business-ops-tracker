"use client";

import { useState } from "react";
import {
  BadgeCheck,
  ChevronUp,
  FileSignature,
  LogOut,
  Settings,
  ShieldCheck,
  UserRound,
  WalletCards
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { Badge } from "@/components/ui/badge";

function AvatarImage({ image, name }: { image?: string | null; name?: string | null }) {
  const fallback = (name || "G").trim().slice(0, 1).toUpperCase();

  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-900 text-sm font-black text-white">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt={name || "Google account"} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        fallback
      )}
    </div>
  );
}

function LargeAvatarImage({ image, name }: { image?: string | null; name?: string | null }) {
  const fallback = (name || "G").trim().slice(0, 1).toUpperCase();

  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-900 text-base font-black text-white">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt={name || "Google account"} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        fallback
      )}
    </div>
  );
}

function MenuRow({
  icon: Icon,
  label,
  muted,
  onClick
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  muted?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-[14px] font-bold text-slate-800 hover:bg-slate-50"
      onClick={onClick}
    >
      <Icon className="h-5 w-5 shrink-0 text-slate-600" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {muted ? <span className="max-w-[82px] truncate text-right text-[11px] font-semibold text-slate-400">{muted}</span> : null}
    </button>
  );
}

export function UserAccountMenu() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const user = session?.user;
  const connected = Boolean(session?.googleAccessToken && !session.googleTokenError);

  if (status === "loading") {
    return (
      <div className="rounded-2xl bg-slate-50 p-3">
        <div className="h-11 animate-pulse rounded-xl bg-slate-200" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
        <p className="mb-3 text-sm font-bold text-slate-700">ยังไม่ได้เชื่อมต่อ Google</p>
        <GoogleSignInButton className="w-full justify-center" />
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        className="flex w-full items-center gap-3 rounded-2xl bg-slate-50 p-3 text-left transition hover:bg-slate-100"
        onClick={() => setOpen((value) => !value)}
      >
        <AvatarImage image={user.image} name={user.name} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-bold text-slate-900">{user.name || "Google User"}</p>
            <Badge className="rounded-md bg-indigo-50 px-1.5 py-0.5 text-[11px] text-indigo-700">Pro</Badge>
          </div>
          <p className="truncate text-xs text-slate-400">{user.email}</p>
        </div>
        <ChevronUp className={["h-4 w-4 text-slate-400 transition", open ? "rotate-180" : ""].join(" ")} />
      </button>

      {open ? (
        <div className="absolute bottom-[calc(100%+10px)] left-0 right-0 z-40 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center gap-3 p-3.5">
            <LargeAvatarImage image={user.image} name={user.name} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-base font-black text-slate-900">{user.name || "Google User"}</p>
                <Badge className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700">Pro</Badge>
              </div>
              <p className="truncate text-xs font-semibold text-slate-400">{user.email}</p>
            </div>
          </div>

          <div className="border-y border-slate-100 px-3.5 py-3 text-sm font-bold text-slate-500">
            <div className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-emerald-800">
              <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm">{connected ? "เชื่อมต่อ Google แล้ว" : "ยังไม่ได้เชื่อมต่อ Google"}</p>
                <p className="mt-1 truncate text-xs font-semibold text-emerald-700">{user.email}</p>
              </div>
            </div>
          </div>

          <div className="py-2">
            <MenuRow icon={UserRound} label="โปรไฟล์" />
            <MenuRow icon={FileSignature} label="ลายเซ็นรับรองใบเสร็จ" />
            <MenuRow icon={ShieldCheck} label="การเข้าถึง Google" muted={connected ? "เชื่อมต่อแล้ว" : "ยังไม่เชื่อมต่อ"} />
            <MenuRow icon={Settings} label="ตั้งค่า Google Sheet / Drive" />
            <MenuRow icon={WalletCards} label="แพ็กเกจสมาชิก" />
          </div>

          <div className="border-t border-slate-100 py-2">
            <MenuRow
              icon={LogOut}
              label="ออกจากระบบ"
              onClick={() => signOut({ callbackUrl: "/expenses" })}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
