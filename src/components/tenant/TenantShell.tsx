import { Link, Outlet, useLocation, useRouter, useLoaderData } from "@tanstack/react-router";
import {
  LayoutDashboard, Building2, CreditCard, Wrench, Bell,
  LogOut, Menu, X,
} from "lucide-react";
import { useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOutFn } from "@/lib/auth-server";
import type { NotificationRow } from "@/db/queries";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard };

type UserData = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  avatarUrl: string | null;
};

function TenantSidebar({ user, onNavigate }: { user: UserData; onNavigate?: () => void }) {
  const location = useLocation();
  const router = useRouter();
  const items: NavItem[] = [
    { to: "/tenant", label: "My Dashboard", icon: LayoutDashboard },
    { to: "/tenant/pay", label: "Pay Rent", icon: CreditCard },
    { to: "/tenant/maintenance", label: "Maintenance", icon: Wrench },
    { to: "/tenant/documents", label: "My Documents", icon: Building2 },
    { to: "/tenant/notifications", label: "Notifications", icon: Bell },
  ];

  const handleSignOut = async () => {
    await signOutFn();
    router.navigate({ to: "/auth" });
  };

  return (
    <div className="flex h-full flex-col text-sidebar-foreground">
      <div className="px-5 py-5">
        <Link to="/tenant" className="flex items-center gap-2 font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary">
            <Building2 className="h-4 w-4 text-sidebar-primary-foreground" />
          </span>
          <span className="text-lg tracking-tight">PropEase</span>
        </Link>
      </div>
      <div className="px-5 pb-3">
        <p className="text-xs text-sidebar-foreground/60">Welcome back</p>
        <p className="text-sm font-medium">{user.firstName} {user.lastName}</p>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {items.map((item) => {
          const active = item.to === "/tenant"
            ? location.pathname === "/tenant"
            : location.pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border p-3">
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </div>
  );
}

export function TenantShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const path = router.state.location.pathname;
  const { user, notifications } = useLoaderData({ from: "/tenant" }) as { user: UserData; notifications: NotificationRow[] };

  const title = (() => {
    if (path.includes("pay")) return "Pay Rent";
    if (path.includes("maintenance")) return "Maintenance";
    if (path.includes("documents")) return "My Documents";
    if (path.includes("notifications")) return "Notifications";
    return "My Dashboard";
  })();

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 bg-sidebar md:block">
        <TenantSidebar user={user} />
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 bg-sidebar shadow-xl">
            <TenantSidebar user={user} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card/80 px-4 backdrop-blur md:px-8">
          <button
            className="md:hidden rounded-md p-2 text-foreground hover:bg-muted"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <h1 className="text-base font-semibold tracking-tight md:text-lg">{title}</h1>

          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-4 w-4" />
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex items-center justify-between">
                  Notifications <Badge variant="secondary">{notifications.length}</Badge>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.map((n) => (
                  <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-0.5 py-2.5">
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground">{n.body}</p>
                    <p className="text-[10px] text-muted-foreground">{n.time}</p>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
