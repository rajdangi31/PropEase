import { Link, Outlet, useLocation, useRouter } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  Wrench,
  Bell,
  Settings,
  Search,
  LogOut,
  ChevronDown,
  Menu,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { properties, notifications } from "@/lib/mock-data";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard };

const adminNav: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/properties", label: "Properties", icon: Building2 },
  { to: "/admin/tenants", label: "Tenants", icon: Users },
  { to: "/admin/payments", label: "Payments", icon: CreditCard },
  { to: "/admin/maintenance", label: "Maintenance", icon: Wrench },
  { to: "/admin/notifications", label: "Notifications", icon: Bell },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

function SidebarContent({
  activeProperty,
  onNavigate,
}: {
  activeProperty: string;
  onNavigate?: () => void;
}) {
  const location = useLocation();
  return (
    <div className="flex h-full flex-col text-sidebar-foreground">
      <div className="px-5 py-5">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary">
            <Building2 className="h-4 w-4 text-sidebar-primary-foreground" />
          </span>
          <span className="text-lg tracking-tight">PropEase</span>
        </Link>
      </div>

      <div className="px-3 pb-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center justify-between rounded-lg bg-sidebar-accent px-3 py-2.5 text-left text-sm transition hover:opacity-90">
              <div className="min-w-0">
                <p className="truncate text-xs text-sidebar-foreground/60">Property</p>
                <p className="truncate font-medium">{activeProperty}</p>
              </div>
              <ChevronDown className="h-4 w-4 shrink-0 opacity-70" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Switch property</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {properties.map((p) => (
              <DropdownMenuItem key={p.id}>{p.name}</DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem>+ Add property</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {adminNav.map((item) => {
          const active =
            item.to === "/admin"
              ? location.pathname === "/admin"
              : location.pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
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
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs">
              EH
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">Elena Hayes</p>
            <p className="truncate text-xs text-sidebar-foreground/60">Property Owner</p>
          </div>
          <Link
            to="/"
            aria-label="Sign out"
            className="rounded-md p-1.5 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <LogOut className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export function AppShell({
  children,
  role = "admin",
}: {
  children?: ReactNode;
  role?: "admin" | "tenant";
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const path = router.state.location.pathname;
  const activeProperty = properties[0].name;

  const title = (() => {
    if (role === "tenant") {
      if (path.includes("pay")) return "Pay Rent";
      if (path.includes("maintenance")) return "Maintenance";
      if (path.includes("documents")) return "My Documents";
      if (path.includes("notifications")) return "Notifications";
      return "My Dashboard";
    }
    const seg = path.split("/")[2];
    if (!seg) return "Dashboard";
    return seg.charAt(0).toUpperCase() + seg.slice(1);
  })();

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 bg-sidebar md:block">
        {role === "admin" ? <SidebarContent activeProperty={activeProperty} /> : <TenantSidebar />}
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 bg-sidebar shadow-xl">
            {role === "admin" ? (
              <SidebarContent
                activeProperty={activeProperty}
                onNavigate={() => setMobileOpen(false)}
              />
            ) : (
              <TenantSidebar onNavigate={() => setMobileOpen(false)} />
            )}
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

          <div className="ml-auto hidden items-center gap-2 md:flex">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="h-9 w-72 pl-9" placeholder="Search tenants, units, requests..." />
            </div>
          </div>

          <div className="ml-auto flex items-center gap-1 md:ml-0">
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

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children ?? <Outlet />}</main>
      </div>
    </div>
  );
}

function TenantSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  const items: NavItem[] = [
    { to: "/tenant", label: "My Dashboard", icon: LayoutDashboard },
    { to: "/tenant/pay", label: "Pay Rent", icon: CreditCard },
    { to: "/tenant/maintenance", label: "Maintenance", icon: Wrench },
    { to: "/tenant/documents", label: "My Documents", icon: Building2 },
    { to: "/tenant/notifications", label: "Notifications", icon: Bell },
  ];
  return (
    <div className="flex h-full flex-col text-sidebar-foreground">
      <div className="px-5 py-5">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary">
            <Building2 className="h-4 w-4 text-sidebar-primary-foreground" />
          </span>
          <span className="text-lg tracking-tight">PropEase</span>
        </Link>
      </div>
      <div className="px-5 pb-3">
        <p className="text-xs text-sidebar-foreground/60">Welcome back</p>
        <p className="text-sm font-medium">Sarah Chen</p>
        <p className="text-xs text-sidebar-foreground/60">Maple Heights · 101</p>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {items.map((item) => {
          const active =
            item.to === "/tenant"
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
        <Link
          to="/"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </Link>
      </div>
    </div>
  );
}
