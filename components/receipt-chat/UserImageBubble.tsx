"use client";

import { useState } from "react";
import { X, ReceiptText } from "lucide-react";

export function UserImageBubble({ imageUrl }: { imageUrl?: string | null }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="ml-auto w-fit max-w-[55%] overflow-hidden rounded-xl rounded-br-sm bg-teal-50 p-1.5 shadow-sm ring-1 ring-teal-100">
        {imageUrl ? (
          <button
            type="button"
            className="block cursor-zoom-in"
            onClick={() => setOpen(true)}
            aria-label="ขยายรูปใบเสร็จ"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="Uploaded receipt" className="block max-h-36 w-full rounded-lg object-cover object-top" />
          </button>
        ) : (
          <div className="flex aspect-[3/4] w-24 flex-col items-center justify-center rounded-lg bg-white p-3 text-center text-xs font-semibold text-slate-500 shadow-inner">
            <ReceiptText className="mb-2 h-5 w-5 text-teal-400" />
            Receipt image
          </div>
        )}
      </div>

      {open && imageUrl ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setOpen(false)}
          aria-label="ปิดรูป"
        >
          <div className="relative max-h-[92vh] max-w-[92vw] rounded-2xl bg-white p-2 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="absolute right-3 top-3 rounded-full bg-slate-900/80 p-2 text-white shadow-lg"
              onClick={() => setOpen(false)}
              aria-label="ปิดรูป"
            >
              <X className="h-4 w-4" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="Uploaded receipt preview" className="max-h-[88vh] max-w-[88vw] rounded-xl object-contain" />
          </div>
        </div>
      ) : null}
    </>
  );
}
