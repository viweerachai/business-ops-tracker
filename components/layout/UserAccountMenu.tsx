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
import { Badge } from "@/components/ui/badge";
import { MOCK_USER } from "@/lib/mockData";

// ---------------------------------------------------------------------------
// Mock version — uses hardcoded demo user, no next-auth dependency
// ---------------------------------------------------------------------------

function AvatarImage({ image, name }: { image?: string | null; name?: string | null }) {
  const fallback = (name || "G").trim().slice(0, 1).toUpperCase();

  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-teal-600 text-[13px] font-bold text-white">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt={name || "user"} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        fallback
      )}
    </div>
  );
}

function LargeAvatarImage({ image, name }: { image?: string | null; name?: string | null }) {
  const fallback = (name || "G").trim().slice(0, 1).toUpperCase();

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-teal-600 text-[15px] font-bold text-white">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt={name || "user"} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
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
      {muted ? (
        <span className="max-w-[82px] truncate text-right text-[11px] font-semibold text-slate-400">
          {muted}
        </span>
      ) : null}
    </button>
  );
}

export function UserAccountMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        className="flex w-full items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-left transition-colors hover:bg-slate-100"
        onClick={() => setOpen((v) => !v)}
      >
        <AvatarImage image={MOCK_USER.image} name={MOCK_USER.name} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-slate-900">{MOCK_USER.name}</p>
          <p className="truncate text-[11px] text-slate-400">{MOCK_USER.email}</p>
        </div>
        <ChevronUp
          className={[
            "h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform",
            open ? "rotate-180" : ""
          ].join(" ")}
        />
      </button>

      {open ? (
        <div className="absolute bottom-[calc(100%+10px)] left-0 right-0 z-40 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center gap-3 p-3.5">
            <LargeAvatarImage image={MOCK_USER.image} name={MOCK_USER.name} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-base font-black text-slate-900">{MOCK_USER.name}</p>
                <Badge className="rounded-md bg-teal-50 px-2 py-0.5 text-xs text-teal-700">Pro</Badge>
              </div>
              <p className="truncate text-xs font-semibold text-slate-400">{MOCK_USER.email}</p>
            </div>
          </div>

          <div className="border-y border-slate-100 px-3.5 py-3 text-sm font-bold text-slate-500">
            <div className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-emerald-800">
              <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm">เข้าสู่ระบบแล้ว (Demo)</p>
                <p className="mt-1 truncate text-xs font-semibold text-emerald-700">
                  {MOCK_USER.email}
                </p>
              </div>
            </div>
          </div>

          <div className="py-2">
            <MenuRow icon={UserRound} label="โปรไฟล์" />
            <MenuRow icon={FileSignature} label="ลายเซ็นรับรองใบเสร็จ" />
            <MenuRow icon={ShieldCheck} label="การเข้าถึง Google" muted="เชื่อมต่อแล้ว" />
            <MenuRow icon={Settings} label="ตั้งค่า Google Sheet / Drive" />
            <MenuRow icon={WalletCards} label="แพ็กเกจสมาชิก" />
          </div>

          <div className="border-t border-slate-100 py-2">
            <MenuRow
              icon={LogOut}
              label="ออกจากระบบ"
              onClick={() => setOpen(false)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
