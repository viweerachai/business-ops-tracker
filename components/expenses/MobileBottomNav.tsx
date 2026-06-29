"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Camera, Home, Package, Plus, Settings } from "lucide-react";

const navItems = [
  { href: "/expenses", label: "หน้าหลัก", icon: Home, active: (pathname: string) => pathname === "/expenses" },
  { href: "/expenses/new", label: "เพิ่ม", icon: Plus, active: (pathname: string) => pathname === "/expenses/new" },
  { href: "/receipt-chat", label: "สแกน", icon: Camera, active: (pathname: string) => pathname.startsWith("/receipt-chat") },
  { href: "/products", label: "สินค้า", icon: Package, active: (pathname: string) => pathname.startsWith("/products") },
  { href: "/settings/businesses", label: "ตั้งค่า", icon: Settings, active: (pathname: string) => pathname.startsWith("/settings") }
] as const;

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-3 pb-[max(0.65rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur lg:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {navItems.map(({ href, label, icon: Icon, active }) => {
          const isActive = active(pathname);
          return (
            <Link
              key={href}
              className={[
                "grid h-14 min-w-0 place-items-center rounded-2xl text-xs font-black",
                isActive ? "text-blue-700" : "text-slate-500"
              ].join(" ")}
              href={href}
            >
              <Icon className="h-5 w-5" />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
