"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Package,
  PackagePlus,
  ClipboardList,
  Search,
  BarChart3,
  LogOut,
  Store,
  FileText,
} from "lucide-react";
import { t } from "@/lib/translations";

const menuItems = [
  { href: "/", label: t.nav.dashboard, icon: LayoutDashboard },
  { href: "/products", label: t.nav.products, icon: Package },
  { href: "/stock-in", label: t.nav.stockIn, icon: PackagePlus },
  { href: "/sales", label: t.nav.dailySales, icon: ClipboardList },
  { href: "/stock-check", label: t.nav.stockCheck, icon: Search },
  { href: "/reports", label: t.nav.reports, icon: BarChart3 },
  { href: "/supplier-report", label: t.nav.supplierReport, icon: FileText },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="w-64 bg-white border-r h-screen sticky top-0 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b">
        <div className="flex items-center gap-2">
          <Store className="w-8 h-8 text-primary" />
          <div>
            <h1 className="font-bold text-lg">{t.appName}</h1>
            <p className="text-xs text-muted-foreground">{t.appDescription}</p>
          </div>
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-gray-100 text-gray-700"
                }
              `}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t">
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          {t.nav.logout}
        </Button>
      </div>
    </aside>
  );
}
