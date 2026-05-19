"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, ClipboardCheck, Users, BarChart3, Settings } from "lucide-react";
import { cn } from "@/lib/cn";

type NavItem = {
  href: string;
  label: string;
  icon: typeof Calendar;
  ownerOnly?: boolean;
};

const ITEMS: NavItem[] = [
  { href: "/calendar", label: "カレンダー", icon: Calendar },
  { href: "/today", label: "当日確定", icon: ClipboardCheck },
  { href: "/customers", label: "顧客", icon: Users },
  { href: "/dashboard", label: "売上", icon: BarChart3, ownerOnly: true },
  { href: "/plans", label: "プラン", icon: Settings, ownerOnly: true },
];

export function TopNav({
  email,
  role,
}: {
  email: string;
  role: "owner" | "staff";
}) {
  const pathname = usePathname();
  const items = ITEMS.filter((i) => !i.ownerOnly || role === "owner");

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto max-w-6xl flex items-center justify-between gap-3 px-3 sm:px-6 h-14">
        <Link href="/calendar" className="font-semibold tracking-tight">
          Fire Fit Gym
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          {items.map((item) => {
            const active = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <form action="/auth/signout" method="post" className="flex items-center gap-2">
          <span className="hidden sm:inline text-xs text-muted-foreground">
            {email}
          </span>
          <button
            type="submit"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            ログアウト
          </button>
        </form>
      </div>
      <nav className="md:hidden border-t border-border bg-background overflow-x-auto">
        <div className="flex">
          {items.map((item) => {
            const active = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex-1 min-w-0 flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors",
                  active
                    ? "text-accent"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="size-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
