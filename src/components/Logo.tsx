import { Link } from "@tanstack/react-router";
import { Building2 } from "lucide-react";

export function Logo({ className = "", to = "/" }: { className?: string, to?: string }) {
  return (
    <Link to={to} className={`flex items-center gap-2 font-semibold tracking-tight ${className}`}>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "var(--gradient-primary)" }}>
        <Building2 className="h-4 w-4 text-primary-foreground" />
      </span>
      <span className="text-lg">PropEase</span>
    </Link>
  );
}
