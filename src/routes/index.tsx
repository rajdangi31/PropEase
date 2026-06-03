import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Building2,
  Users,
  CreditCard,
  Wrench,
  BarChart3,
  Bell,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

export const Route = createFileRoute("/")({
  component: Landing,
});

const features = [
  {
    icon: Building2,
    title: "Multi-property",
    desc: "Switch between buildings in a click. Keep every unit organized.",
  },
  {
    icon: Users,
    title: "Tenant CRM",
    desc: "Profiles, leases, documents and activity in one timeline.",
  },
  {
    icon: CreditCard,
    title: "Online rent",
    desc: "Collect rent, track late fees, send auto-reminders.",
  },
  { icon: Wrench, title: "Maintenance", desc: "Kanban triage, photo uploads, vendor assignment." },
  {
    icon: BarChart3,
    title: "Live analytics",
    desc: "Occupancy, revenue, response times — at a glance.",
  },
  {
    icon: Bell,
    title: "Smart notifications",
    desc: "Announcements, rent reminders, lease alerts.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Logo />
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a href="#features" className="hover:text-foreground">
            Features
          </a>
          <a href="#roles" className="hover:text-foreground">
            For everyone
          </a>
          <a href="#pricing" className="hover:text-foreground">
            Pricing
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" asChild className="hidden sm:inline-flex">
            <Link to="/auth">Sign in</Link>
          </Button>
          <Button asChild>
            <Link to="/auth">Get started</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10 opacity-[0.06]"
          style={{ background: "var(--gradient-hero)" }}
          aria-hidden
        />
        <div className="mx-auto max-w-7xl px-6 pt-12 pb-20 md:pt-20 md:pb-28">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3 w-3 text-accent" /> New · Late-fee automation & SMS reminders
            </span>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-foreground md:text-6xl">
              Property management,{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: "var(--gradient-primary)" }}
              >
                made easy
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
              PropEase brings your buildings, tenants, rent, and maintenance into one calm, powerful
              workspace. Built for landlords. Loved by tenants.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" asChild className="h-12 px-6 text-base">
                <Link to="/admin">
                  Try Landlord Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="h-12 px-6 text-base">
                <Link to="/tenant">Open Tenant Portal</Link>
              </Button>
            </div>
            <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" /> No credit card · Demo with sample data
            </p>
          </div>

          {/* Preview card */}
          <div className="relative mx-auto mt-16 max-w-5xl">
            <div
              className="absolute -inset-8 -z-10 rounded-[2rem] opacity-30 blur-3xl"
              style={{ background: "var(--gradient-primary)" }}
              aria-hidden
            />
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
              <div className="grid gap-px bg-border md:grid-cols-3">
                <div className="bg-card p-6">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Occupancy
                  </p>
                  <p className="mt-2 text-3xl font-bold">94.2%</p>
                  <p className="mt-1 text-xs text-success">▲ 2.1% vs last month</p>
                </div>
                <div className="bg-card p-6">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Rent collected
                  </p>
                  <p className="mt-2 text-3xl font-bold">$132.4k</p>
                  <p className="mt-1 text-xs text-success">96% of monthly target</p>
                </div>
                <div className="bg-card p-6">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Open requests
                  </p>
                  <p className="mt-2 text-3xl font-bold">7</p>
                  <p className="mt-1 text-xs text-warning">2 high priority</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Roles */}
      <section id="roles" className="mx-auto max-w-7xl px-6 py-16 md:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Choose your experience</h2>
          <p className="mt-3 text-muted-foreground">
            PropEase adapts to who you are — landlord, manager, maintenance staff, or tenant.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <Link
            to="/admin"
            className="group relative overflow-hidden rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-soft)] transition hover:shadow-[var(--shadow-card)]"
          >
            <div
              className="absolute inset-0 opacity-0 transition group-hover:opacity-100"
              style={{ background: "var(--gradient-primary)", opacity: 0.04 }}
              aria-hidden
            />
            <div className="relative">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl text-primary-foreground"
                style={{ background: "var(--gradient-primary)" }}
              >
                <BarChart3 className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-xl font-semibold">I'm a Landlord / Manager</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                See the full dashboard: properties, tenants, payments, maintenance, and live
                analytics.
              </p>
              <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-accent">
                Open landlord workspace{" "}
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </span>
            </div>
          </Link>
          <Link
            to="/tenant"
            className="group relative overflow-hidden rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-soft)] transition hover:shadow-[var(--shadow-card)]"
          >
            <div className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <Users className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-xl font-semibold">I'm a Tenant</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Pay rent, submit maintenance requests, view documents and announcements.
              </p>
              <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-accent">
                Open tenant portal{" "}
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </span>
            </div>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-border bg-muted/30 py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Everything you need, nothing you don't
            </h2>
            <p className="mt-3 text-muted-foreground">
              A focused toolkit that handles the day-to-day so you can grow your portfolio.
            </p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer id="pricing" className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-muted-foreground md:flex-row">
          <div className="flex items-center gap-2">
            <Logo />
          </div>
          <p>© {new Date().getFullYear()} PropEase. Crafted with care.</p>
        </div>
      </footer>
    </div>
  );
}
