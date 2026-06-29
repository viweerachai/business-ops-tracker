import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import type { ChatReceiptItem } from "@/components/receipt-chat/types";

function yen(value: number) {
  return `¥${String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

export function ReceiptItemCard({
  item,
  onToggleResale
}: {
  item: ChatReceiptItem;
  onToggleResale?: (checked: boolean) => void;
}) {
  return (
    <Card className="w-full min-w-0 max-w-full overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm">
      <CardContent className="grid gap-3 p-3.5">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="min-w-0">
            <p className="break-all text-sm font-black leading-6 text-slate-950">{item.rawName}</p>
            <p className="mt-0.5 break-all text-xs leading-5 text-slate-500">{item.displayName}</p>
          </div>
          <Badge className="max-w-[7rem] truncate justify-self-end rounded-full bg-orange-50 px-2.5 py-1 text-[11px] text-orange-700">
            {item.category}
          </Badge>
        </div>
        <div className="min-w-0 rounded-xl bg-slate-50 p-3">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold leading-5 text-slate-500">
            <span>จำนวน {item.quantity}</span>
            <span>ราคา {yen(item.unitPrice)}</span>
            <span>รวม {yen(item.totalPrice)}</span>
          </div>
          <div className="mt-2 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <span className="min-w-0 break-words text-sm font-bold text-slate-800">
              {item.isResaleItem ? "สินค้ารีเซล" : "ไม่ใช่สินค้ารีเซล"}
            </span>
            <Switch checked={item.isResaleItem} onCheckedChange={onToggleResale} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
