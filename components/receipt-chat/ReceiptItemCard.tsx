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
    <Card className="w-full min-w-0 max-w-full overflow-hidden rounded-xl border-slate-200 bg-white shadow-sm">
      <CardContent className="grid gap-2.5 p-3">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
          <div className="min-w-0">
            <p className="break-all text-[13px] font-bold leading-5 text-slate-950">{item.rawName}</p>
            <p className="mt-0.5 break-all text-[12px] leading-5 text-slate-400">{item.displayName}</p>
          </div>
          <Badge className="max-w-[6rem] truncate justify-self-end rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-700">
            {item.category}
          </Badge>
        </div>
        <div className="min-w-0 rounded-lg bg-slate-50 px-3 py-2">
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold text-slate-500">
            <span>จำนวน {item.quantity}</span>
            <span>ราคา {yen(item.unitPrice)}</span>
            <span>รวม {yen(item.totalPrice)}</span>
          </div>
          <div className="mt-2 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
            <span className="min-w-0 break-words text-[12px] font-semibold text-slate-700">
              {item.isResaleItem ? "สินค้ารีเซล" : "ไม่ใช่สินค้ารีเซล"}
            </span>
            <Switch checked={item.isResaleItem} onCheckedChange={onToggleResale} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
