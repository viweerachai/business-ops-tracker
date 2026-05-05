import { ReceiptText } from "lucide-react";

export function UserImageBubble({ imageUrl }: { imageUrl?: string | null }) {
  return (
    <div className="ml-auto max-w-[76%] overflow-hidden rounded-2xl rounded-br-md bg-blue-50 p-1.5 shadow-sm ring-1 ring-blue-100">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="Uploaded receipt" className="max-h-72 w-full rounded-xl object-cover" />
      ) : (
        <div className="flex aspect-[3/4] w-36 flex-col items-center justify-center rounded-xl bg-white p-4 text-center text-xs font-bold text-slate-500 shadow-inner min-[390px]:w-40">
          <ReceiptText className="mb-2 h-8 w-8 text-blue-400" />
          Receipt image
        </div>
      )}
    </div>
  );
}
