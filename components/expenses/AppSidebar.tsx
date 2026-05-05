"use client";

import { useState } from "react";
import {
  BriefcaseBusiness,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  FolderOpen,
  Package,
  Receipt,
  Settings,
  ShieldCheck,
  UsersRound
} from "lucide-react";
import { BusinessSwitcher } from "@/components/business/BusinessSwitcher";
import { UserAccountMenu } from "@/components/layout/UserAccountMenu";
import { Badge } from "@/components/ui/badge";

const revenueChildren = ["ใบเสนอราคา", "ใบแจ้งหนี้", "ใบเสร็จรับเงิน"];
const manageChildren = [
  { icon: BriefcaseBusiness, label: "ดู/แก้ไขข้อมูลธุรกิจ" },
  { icon: ShieldCheck, label: "ผู้มีอำนาจเบิกจ่าย" },
  { icon: FolderOpen, label: "หมวดหมู่" },
  { icon: UsersRound, label: "ทีมของฉัน" }
];

function MenuButton({
  icon: Icon,
  label,
  active,
  badge,
  open,
  onClick
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  badge?: string;
  open?: boolean;
  onClick?: () => void;
}) {
  const hasDropdown = typeof open === "boolean";

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "group flex h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-[14px] font-semibold transition",
        active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50",
      ].join(" ")}
    >
      <Icon className={["h-4.5 w-4.5 shrink-0", active ? "text-blue-600" : "text-slate-500"].join(" ")} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {badge ? (
        <Badge className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
          {badge}
        </Badge>
      ) : null}
      {hasDropdown ? (
        open ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />
      ) : null}
    </button>
  );
}

function ChildRow({
  icon: Icon,
  label
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      type="button"
      className="flex h-9 w-full items-center gap-2 rounded-lg pl-10 pr-3 text-left text-[13px] font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800"
    >
      {Icon ? <Icon className="h-4 w-4 text-slate-400" /> : <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />}
      <span className="truncate">{label}</span>
    </button>
  );
}

export function AppSidebar() {
  const [revenueOpen, setRevenueOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(true);

  return (
    <aside className="flex w-[280px] shrink-0 flex-col border-r border-slate-200 bg-white 2xl:w-[304px]">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-5">
        <BusinessSwitcher />

        <div className="mt-8">
          <p className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-slate-400">เมนูธุรกิจ</p>
          <div className="grid gap-1">
            <MenuButton icon={CircleDollarSign} label="รายจ่าย" active />
            <MenuButton
              icon={Receipt}
              label="รายรับ"
              badge="ทดลอง"
              open={revenueOpen}
              onClick={() => setRevenueOpen((value) => !value)}
            />
            {revenueOpen ? (
              <div className="grid gap-0.5 pb-1">
                {revenueChildren.map((label) => (
                  <ChildRow key={label} label={label} />
                ))}
              </div>
            ) : null}
            <MenuButton icon={FolderOpen} label="เอกสารรายทั้งหมด" />
            <MenuButton icon={Package} label="สินค้าและบริการของฉัน" />
            <MenuButton icon={UsersRound} label="ลูกค้าของฉัน" />
          </div>
        </div>

        <div className="mt-8">
          <MenuButton
            icon={Settings}
            label="จัดการธุรกิจ"
            open={manageOpen}
            onClick={() => setManageOpen((value) => !value)}
          />
          {manageOpen ? (
            <div className="mt-1 grid gap-0.5">
              {manageChildren.map((item) => (
                <ChildRow key={item.label} {...item} />
              ))}
            </div>
          ) : null}
        </div>

        <div className="mt-auto pt-8">
          <UserAccountMenu />
        </div>
      </div>
    </aside>
  );
}
