import { cn } from "@/lib/utils";

export function BotBubble({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "w-fit max-w-[calc(100%-2rem)] rounded-2xl rounded-bl-md bg-white px-4 py-3 text-sm leading-6 text-slate-800 shadow-sm ring-1 ring-slate-200/60 sm:max-w-[88%]",
        className
      )}
    >
      {children}
    </div>
  );
}
