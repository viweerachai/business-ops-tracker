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
    <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
      <CardContent className="grid gap-3 p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-slate-950">{item.rawName}</p>
            <p className="mt-0.5 truncate text-xs text-slate-500">{item.displayName}</p>
          </div>
          <Badge className="rounded-full bg-orange-50 px-2.5 py-1 text-[11px] text-orange-700">
            {item.category}
          </Badge>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-semibold leading-5 text-slate-500">
            จำนวน {item.quantity} <span className="px-1.5">ราคา {yen(item.unitPrice)}</span> รวม {yen(item.totalPrice)}
          </p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-sm font-bold text-slate-800">
              {item.isResaleItem ? "สินค้ารีเซล" : "ไม่ใช่สินค้ารีเซล"}
            </span>
            <Switch checked={item.isResaleItem} onCheckedChange={onToggleResale} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
