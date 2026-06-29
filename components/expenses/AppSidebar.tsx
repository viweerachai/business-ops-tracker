"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BriefcaseBusiness,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  FolderOpen,
  Package,
  Receipt,
  Settings,
  ShieldCheck,
  UsersRound,
  LayoutDashboard,
  FileText,
  RefreshCw
} from "lucide-react";
import { BusinessSwitcher } from "@/components/business/BusinessSwitcher";
import { UserAccountMenu } from "@/components/layout/UserAccountMenu";
import { Badge } from "@/components/ui/badge";

const revenueChildren = ["ใบเสนอราคา", "ใบแจ้งหนี้", "ใบเสร็จรับเงิน"];
const manageChildren = [
  { icon: BriefcaseBusiness, label: "ข้อมูลธุรกิจ" },
  { icon: ShieldCheck, label: "ผู้มีอำนาจเบิกจ่าย" },
  { icon: FolderOpen, label: "หมวดหมู่" },
  { icon: UsersRound, label: "ทีมของฉัน" }
];

function NavSection({ label }: { label: string }) {
  return (
    <p className="mb-1.5 mt-6 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
      {label}
    </p>
  );
}

function NavItem({
  icon: Icon,
  label,
  active,
  badge,
  open,
  href,
  disabled,
  onClick
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  badge?: string;
  open?: boolean;
  href?: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const hasDropdown = typeof open === "boolean";

  const className = [
    "group flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-left text-[13.5px] font-semibold transition-all duration-150",
    disabled
      ? "cursor-not-allowed text-slate-300"
      : active
        ? "bg-teal-600 text-white shadow-sm"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
  ].join(" ");

  const content = (
    <>
      <Icon
        className={[
          "h-4 w-4 shrink-0 transition-colors",
          disabled ? "text-slate-300" : active ? "text-white" : "text-slate-400 group-hover:text-slate-600"
        ].join(" ")}
      />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {badge ? (
        <Badge className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-bold text-teal-700 group-hover:bg-teal-100">
          {badge}
        </Badge>
      ) : null}
      {hasDropdown ? (
        open
          ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      ) : null}
    </>
  );

  if (href && !disabled) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={className}>
      {content}
    </button>
  );
}

function SubItem({
  icon: Icon,
  label,
  disabled = true
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={[
        "flex h-8 w-full items-center gap-2 rounded-lg pl-9 pr-3 text-left text-[13px] font-medium transition-colors",
        disabled
          ? "cursor-not-allowed text-slate-300"
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
      ].join(" ")}
    >
      {Icon ? (
        <Icon className={["h-3.5 w-3.5", disabled ? "text-slate-300" : "text-slate-400"].join(" ")} />
      ) : (
        <span className={["h-1 w-1 rounded-full", disabled ? "bg-slate-200" : "bg-slate-300"].join(" ")} />
      )}
      <span className="truncate">{label}</span>
    </button>
  );
}

export function AppSidebar({ pendingCount = 0 }: { pendingCount?: number }) {
  const pathname = usePathname();
  const [revenueOpen, setRevenueOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

  return (
    <aside className="hidden w-[260px] shrink-0 flex-col border-r border-slate-200 bg-white lg:flex 2xl:w-[280px]">
      {/* Logo / Brand */}
      <div className="flex h-14 items-center border-b border-slate-100 px-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-600">
            <LayoutDashboard className="h-4 w-4 text-white" />
          </div>
          <span className="text-[15px] font-bold text-slate-900">Business Ops</span>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-4">
        {/* Business switcher */}
        <BusinessSwitcher />

        {/* Main menu */}
        <NavSection label="เมนูหลัก" />
        <div className="space-y-0.5">
          <NavItem
            icon={CircleDollarSign}
            label="รายจ่าย"
            href="/expenses"
            active={pathname.startsWith("/expenses")}
            badge={pendingCount > 0 ? String(pendingCount) : undefined}
          />
          <NavItem
            icon={Receipt}
            label="รายรับ"
            badge="เร็วๆ นี้"
            open={revenueOpen}
            onClick={() => setRevenueOpen((v) => !v)}
          />
          {revenueOpen ? (
            <div className="space-y-0.5 pt-0.5">
              {revenueChildren.map((label) => (
                <SubItem key={label} label={label} />
              ))}
            </div>
          ) : null}
          <NavItem icon={FolderOpen} label="เอกสารทั้งหมด" disabled />
          <NavItem
            icon={Package}
            label="สินค้าและบริการ"
            href="/products"
            active={pathname.startsWith("/products")}
          />
          <NavItem icon={UsersRound} label="ลูกค้า" disabled />
        </div>

        {/* Settings */}
        <NavSection label="จัดการ" />
        <div className="space-y-0.5">
          <NavItem
            icon={Settings}
            label="จัดการธุรกิจ"
            open={manageOpen}
            onClick={() => setManageOpen((v) => !v)}
          />
          {manageOpen ? (
            <div className="space-y-0.5 pt-0.5">
              {manageChildren.map((item) => (
                <SubItem key={item.label} {...item} />
              ))}
            </div>
          ) : null}
          <NavItem icon={FileText} label="รายงาน" disabled />
        </div>

        {/* Sync status + User account at bottom */}
        <div className="mt-auto space-y-3 pt-6">
          {/* Last sync strip */}
          <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
            <RefreshCw className="h-3 w-3 shrink-0 text-teal-500" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">ซิงก์ล่าสุด</p>
              <p className="truncate text-[11px] font-semibold text-slate-600">30 มิ.ย. 2026 · 08:00</p>
            </div>
            <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
          </div>
          <UserAccountMenu />
        </div>
      </div>
    </aside>
  );
}
