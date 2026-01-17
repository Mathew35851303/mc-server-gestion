"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Terminal,
  Users,
  Settings,
  Power,
  LogOut,
  Server,
  Package,
  Box,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Console", href: "/dashboard/console", icon: Terminal },
  { name: "Whitelist", href: "/dashboard/whitelist", icon: Users },
  { name: "Resource Packs", href: "/dashboard/resourcepacks", icon: Package },
  { name: "Mods", href: "/dashboard/mods", icon: Box },
  { name: "Paramètres", href: "/dashboard/settings", icon: Settings },
  { name: "Contrôle", href: "/dashboard/control", icon: Power },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card">
      {/* Header */}
      <div className="flex h-16 items-center gap-2 px-6 border-b">
        <Server className="h-6 w-6 text-primary" />
        <span className="font-semibold text-lg">MC Admin</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4">
        <Separator className="mb-4" />
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="h-4 w-4" />
          Déconnexion
        </Button>
      </div>
    </div>
  );
}
