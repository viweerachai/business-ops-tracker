"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { GeminiUsage } from "@/lib/local/gemini-usage";
import type { VisionUsage } from "@/lib/local/vision-usage";

export function ChatHeader({
  visionUsage,
  geminiUsage
}: {
  visionUsage: VisionUsage;
  geminiUsage: GeminiUsage;
}) {
  const router = useRouter();

  return (
    <header className="shrink-0 border-b border-slate-200/80 bg-white/90 px-4 py-3 shadow-sm backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="mt-0.5 h-10 w-10 shrink-0 rounded-full text-slate-600 hover:bg-slate-100"
            title="Back"
            aria-label="Back"
            onClick={() => {
              if (window.history.length > 1) {
                router.back();
                return;
              }
              router.push("/mobile");
            }}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-[17px] font-black tracking-normal text-slate-950">ต้นทุนผู้ช่วย</h1>
            <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[11px] text-emerald-700">
              OCR วันนี้ {visionUsage.callsToday}/{visionUsage.dailyLimit}
            </Badge>
            <Badge className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] text-blue-700">
              Gemini {geminiUsage.callsToday}/{geminiUsage.dailyLimit}
            </Badge>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full text-slate-600 hover:bg-slate-100"
          title="Settings"
          aria-label="Settings"
        >
          <Settings className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
