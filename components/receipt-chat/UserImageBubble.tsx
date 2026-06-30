import { ReceiptText } from "lucide-react";

export function UserImageBubble({ imageUrl }: { imageUrl?: string | null }) {
  return (
    <div className="ml-auto w-fit max-w-[55%] overflow-hidden rounded-xl rounded-br-sm bg-teal-50 p-1.5 shadow-sm ring-1 ring-teal-100">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="Uploaded receipt" className="block max-h-36 w-full rounded-lg object-cover object-top" />
      ) : (
        <div className="flex aspect-[3/4] w-24 flex-col items-center justify-center rounded-lg bg-white p-3 text-center text-xs font-semibold text-slate-500 shadow-inner">
          <ReceiptText className="mb-2 h-5 w-5 text-teal-400" />
          Receipt image
        </div>
      )}
    </div>
  );
}
