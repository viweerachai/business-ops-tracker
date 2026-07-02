"use client";

import { useState } from "react";
import { Check, ChevronDown, Plus, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { CreateBusinessDialog } from "@/components/business/CreateBusinessDialog";
import { Badge } from "@/components/ui/badge";
import { useBusinesses } from "@/hooks/useBusinesses";

function BusinessAvatar({ name, avatarUrl }: { name: string; avatarUrl?: string }) {
  const fallback = name.trim().slice(0, 1) || "B";

  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-teal-600 text-[14px] font-bold text-white shadow-sm">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
      ) : (
        fallback
      )}
    </div>
  );
}

export function BusinessSwitcher() {
  const router = useRouter();
  const {
    businesses,
    activeBusiness,
    loading,
    isLoggedIn,
    createBusiness,
    setActiveBusinessId
  } = useBusinesses();
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  if (loading) {
    return <div className="h-[72px] animate-pulse rounded-2xl bg-slate-100" />;
  }

  if (!isLoggedIn) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-sm font-black text-slate-700">ยังไม่ได้เข้าสู่ระบบ</p>
        <p className="mt-1 text-xs text-slate-400">เข้าสู่ระบบเพื่อโหลดธุรกิจจาก Firestore</p>
      </div>
    );
  }

  if (!activeBusiness) {
    return (
      <>
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-teal-300 bg-teal-50 p-3 text-[13px] font-semibold text-teal-700 hover:bg-teal-100 transition-colors"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-4 w-4" />
          สร้างธุรกิจ
        </button>
        <CreateBusinessDialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreate={createBusiness}
        />
      </>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        className="flex w-full items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-left transition-colors hover:bg-slate-100"
        onClick={() => setOpen((value) => !value)}
      >
        <BusinessAvatar name={activeBusiness.name} avatarUrl={activeBusiness.avatarUrl} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-slate-900">{activeBusiness.name}</p>
          <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] text-slate-400">
            <Badge className="rounded bg-teal-50 px-1.5 py-0 text-[10px] font-semibold text-teal-700 shadow-none">
              {activeBusiness.plan === "pro" ? "Pro" : "Free"}
            </Badge>
            <span className="truncate">{businesses.length} ธุรกิจ</span>
          </div>
        </div>
        <ChevronDown className={["h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform", open ? "rotate-180" : ""].join(" ")} />
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-40 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="max-h-64 overflow-y-auto py-1">
            {businesses.map((business) => (
              <button
                key={business.id}
                type="button"
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-50 transition-colors"
                onClick={() => { setActiveBusinessId(business.id); setOpen(false); }}
              >
                <BusinessAvatar name={business.name} avatarUrl={business.avatarUrl} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-slate-900">{business.name}</p>
                  <p className="truncate text-[11px] text-slate-400">{business.phone || business.ownerEmail}</p>
                </div>
                {business.id === activeBusiness.id ? <Check className="h-3.5 w-3.5 text-teal-600" /> : null}
              </button>
            ))}
          </div>
          <div className="border-t border-slate-100 py-1">
            <button
              type="button"
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              onClick={() => { setOpen(false); setCreateOpen(true); }}
            >
              <Plus className="h-3.5 w-3.5 text-slate-500" />
              สร้างธุรกิจใหม่
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              onClick={() => router.push("/settings/businesses")}
            >
              <Settings className="h-3.5 w-3.5 text-slate-500" />
              จัดการธุรกิจ
            </button>
          </div>
        </div>
      ) : null}

      <CreateBusinessDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={createBusiness}
      />
    </div>
  );
}
