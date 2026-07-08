"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { GeminiUsage } from "@/lib/local/gemini-usage";
import type { VisionUsage } from "@/lib/local/vision-usage";

export function ChatHeader({
  visionUsage,
  geminiUsage,
  onSettingsClick
}: {
  visionUsage: VisionUsage;
  geminiUsage: GeminiUsage;
  onSettingsClick: () => void;
}) {
  const router = useRouter();

  return (
    <header className="shrink-0 border-b border-slate-200 bg-white/98 px-4 py-3 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
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
            <ArrowLeft className="h-4.5 w-4.5" />
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-[15px] font-bold tracking-tight text-slate-950">ต้นทุนผู้ช่วย</h1>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <Badge className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                OCR {visionUsage.callsToday}/{visionUsage.dailyLimit}
              </Badge>
              <Badge className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                Gemini {geminiUsage.callsToday}/{geminiUsage.dailyLimit}
              </Badge>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          title="Settings"
          aria-label="Settings"
          onClick={onSettingsClick}
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
