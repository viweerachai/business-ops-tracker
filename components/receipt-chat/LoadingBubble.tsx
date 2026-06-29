import { Loader2 } from "lucide-react";

export function LoadingBubble({ text }: { text: string }) {
  return (
    <div className="grid w-fit max-w-[calc(100%-2rem)] gap-2 rounded-2xl rounded-bl-md bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200/60 sm:max-w-[88%]">
      <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-800">
        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
        <span className="min-w-0">{text}</span>
      </div>
    </div>
  );
}
