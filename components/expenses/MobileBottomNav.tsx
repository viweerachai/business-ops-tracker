"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Camera, Home, Package, Plus, Settings } from "lucide-react";

const navItems = [
  { href: "/expenses", label: "หน้าหลัก", icon: Home, active: (p: string) => p === "/expenses" },
  { href: "/expenses/new", label: "เพิ่ม", icon: Plus, active: (p: string) => p === "/expenses/new", isPrimary: true },
  { href: "/receipt-chat?mock=1", label: "สแกน", icon: Camera, active: (p: string) => p.startsWith("/receipt-chat") },
  { href: "/products", label: "สินค้า", icon: Package, active: (p: string) => p.startsWith("/products") },
  { href: "/settings/businesses", label: "ตั้งค่า", icon: Settings, active: (p: string) => p.startsWith("/settings") }
] as const;

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/98 backdrop-blur-sm lg:hidden"
      style={{ paddingBottom: "max(0.625rem, env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto grid max-w-lg grid-cols-5 px-2 pt-2">
        {navItems.map(({ href, label, icon: Icon, active, ...rest }) => {
          const isActive = active(pathname);
          const isPrimary = "isPrimary" in rest && rest.isPrimary;

          if (isPrimary) {
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center gap-1 py-1"
                aria-label={label}
              >
                <div className={[
                  "flex h-11 w-11 items-center justify-center rounded-2xl shadow-md transition-transform active:scale-95",
                  isActive ? "bg-teal-700" : "bg-teal-600"
                ].join(" ")}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <span className={`text-[10px] font-semibold ${isActive ? "text-teal-700" : "text-slate-500"}`}>
                  {label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-1 py-1"
            >
              <div className={[
                "flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
                isActive ? "bg-teal-50" : "hover:bg-slate-100"
              ].join(" ")}>
                <Icon className={["h-5 w-5 transition-colors", isActive ? "text-teal-600" : "text-slate-500"].join(" ")} />
              </div>
              <span className={`text-[10px] font-semibold transition-colors ${isActive ? "text-teal-700" : "text-slate-400"}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
