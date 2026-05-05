import { Loader2 } from "lucide-react";

export function LoadingBubble({ text }: { text: string }) {
  return (
    <div className="mr-7 grid w-fit max-w-[88%] gap-2 rounded-2xl rounded-bl-md bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200/60">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
        {text}
      </div>
    </div>
  );
}
