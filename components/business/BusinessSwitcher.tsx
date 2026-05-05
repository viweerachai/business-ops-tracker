"use client";

import { useState } from "react";
import { Check, ChevronDown, Plus, Settings } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { CreateBusinessDialog } from "@/components/business/CreateBusinessDialog";
import { Badge } from "@/components/ui/badge";
import { useBusinesses } from "@/hooks/useBusinesses";

function BusinessAvatar({ name, avatarUrl }: { name: string; avatarUrl?: string }) {
  const fallback = name.trim().slice(0, 1) || "B";

  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-sky-200 to-cyan-100 text-lg font-black text-slate-700 shadow-sm">
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
  const { data: session } = useSession();
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
  const ownerEmail = session?.user?.email ?? "local";

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
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-black text-slate-600"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-4 w-4" />
          สร้างธุรกิจ
        </button>
        <CreateBusinessDialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreate={(input) => createBusiness({ ownerEmail, ...input })}
        />
      </>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        className="flex w-full items-center gap-3 rounded-2xl bg-slate-50 p-3 text-left transition hover:bg-slate-100"
        onClick={() => setOpen((value) => !value)}
      >
        <BusinessAvatar name={activeBusiness.name} avatarUrl={activeBusiness.avatarUrl} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-black text-slate-800">{activeBusiness.name}</p>
          <div className="mt-1 flex min-w-0 items-center gap-2 text-[12px] text-slate-500">
            <Badge className="rounded-md bg-indigo-50 px-1.5 py-0.5 text-[11px] font-bold text-indigo-700">
              {activeBusiness.plan === "pro" ? "Pro" : "Free"}
            </Badge>
            {activeBusiness.phone ? <span className="truncate">{activeBusiness.phone}</span> : <span>{businesses.length} ธุรกิจ</span>}
          </div>
        </div>
        <ChevronDown className={["h-4 w-4 shrink-0 text-slate-400 transition", open ? "rotate-180" : ""].join(" ")} />
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-40 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="max-h-72 overflow-y-auto py-2">
            {businesses.map((business) => (
              <button
                key={business.id}
                type="button"
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50"
                onClick={() => {
                  setActiveBusinessId(business.id);
                  setOpen(false);
                }}
              >
                <BusinessAvatar name={business.name} avatarUrl={business.avatarUrl} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-slate-900">{business.name}</p>
                  <p className="truncate text-xs text-slate-400">{business.phone || business.ownerEmail}</p>
                </div>
                {business.id === activeBusiness.id ? <Check className="h-4 w-4 text-blue-600" /> : null}
              </button>
            ))}
          </div>

          <div className="border-t border-slate-100 py-2">
            <button
              type="button"
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-bold text-slate-700 hover:bg-slate-50"
              onClick={() => {
                setOpen(false);
                setCreateOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              สร้างธุรกิจใหม่
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-bold text-slate-700 hover:bg-slate-50"
              onClick={() => router.push("/settings/businesses")}
            >
              <Settings className="h-4 w-4" />
              จัดการธุรกิจ
            </button>
          </div>
        </div>
      ) : null}

      <CreateBusinessDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={(input) => createBusiness({ ownerEmail, ...input })}
      />
    </div>
  );
}
