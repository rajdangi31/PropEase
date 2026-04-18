import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Building2, ShieldCheck, Wrench, User } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

const roles = [
  { id: "admin", label: "Property Owner", desc: "Full access to all features", icon: Building2, to: "/admin" },
  { id: "manager", label: "Manager", desc: "All except billing & settings", icon: ShieldCheck, to: "/admin" },
  { id: "staff", label: "Maintenance Staff", desc: "Assigned requests only", icon: Wrench, to: "/admin/maintenance" },
  { id: "tenant", label: "Tenant", desc: "Pay rent, submit requests", icon: User, to: "/tenant" },
] as const;

function AuthPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState<(typeof roles)[number]["id"]>("admin");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const target = roles.find((r) => r.id === role)!;
    navigate({ to: target.to });
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between p-10 text-primary-foreground lg:flex" style={{ background: "var(--gradient-hero)" }}>
        <Logo className="text-primary-foreground" />
        <div>
          <h2 className="text-3xl font-bold leading-tight">Run your portfolio with ease.</h2>
          <p className="mt-3 max-w-md text-sm text-primary-foreground/80">
            PropEase brings tenants, rent, and maintenance into one beautiful, fast workspace —
            built for the way modern landlords actually work.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-3">
            {[
              ["94%", "Occupancy"],
              ["$132k", "Rent / mo"],
              ["4.2h", "Avg response"],
            ].map(([v, l]) => (
              <div key={l} className="rounded-xl bg-white/10 p-3 backdrop-blur">
                <p className="text-xl font-semibold">{v}</p>
                <p className="text-xs text-primary-foreground/70">{l}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-primary-foreground/60">© PropEase</p>
      </div>

      {/* Form panel */}
      <div className="flex flex-col bg-background">
        <header className="flex items-center justify-between p-6">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Back</Link>
          <ThemeToggle />
        </header>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 pb-12">
          <h1 className="text-2xl font-bold tracking-tight">Welcome to PropEase</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Sign in or create an account to continue.</p>

          <Tabs defaultValue="signin" className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="mt-6">
              <form className="space-y-4" onSubmit={submit}>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="you@example.com" defaultValue="elena@propease.app" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" defaultValue="demopassword" />
                </div>
                <RolePicker role={role} setRole={setRole} />
                <Button type="submit" className="h-11 w-full text-base">Sign in</Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-6">
              <form className="space-y-4" onSubmit={submit}>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="fn">First name</Label>
                    <Input id="fn" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ln">Last name</Label>
                    <Input id="ln" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email2">Email</Label>
                  <Input id="email2" type="email" placeholder="you@example.com" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password2">Password</Label>
                  <Input id="password2" type="password" />
                </div>
                <RolePicker role={role} setRole={setRole} />
                <Button type="submit" className="h-11 w-full text-base">Create account</Button>
              </form>
            </TabsContent>
          </Tabs>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            This is a demo — any credentials work.
          </p>
        </div>
      </div>
    </div>
  );
}

function RolePicker({
  role, setRole,
}: { role: string; setRole: (id: any) => void }) {
  return (
    <div className="space-y-2">
      <Label>I am a...</Label>
      <div className="grid grid-cols-2 gap-2">
        {roles.map((r) => {
          const Icon = r.icon;
          const active = role === r.id;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => setRole(r.id)}
              className={`flex items-start gap-2.5 rounded-lg border p-3 text-left transition ${
                active
                  ? "border-accent bg-accent/5 ring-2 ring-accent/30"
                  : "border-border hover:border-accent/50 hover:bg-muted/40"
              }`}
            >
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${active ? "text-accent" : "text-muted-foreground"}`} />
              <div className="min-w-0">
                <p className="text-sm font-medium leading-tight">{r.label}</p>
                <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">{r.desc}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
