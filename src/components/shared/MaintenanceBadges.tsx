import { Wrench, Zap, Droplets, Wind, Box, LucideIcon } from "lucide-react";

export type Priority = "Emergency" | "High" | "Medium" | "Low";

export const priorityClass: Record<Priority, string> = {
  Emergency: "bg-destructive/15 text-destructive border-destructive/30",
  High: "bg-warning/15 text-warning border-warning/40",
  Medium: "bg-info/15 text-info border-info/30",
  Low: "bg-success/15 text-success border-success/30",
};

export const priorityDot: Record<Priority, string> = {
  Emergency: "🔴",
  High: "🟠",
  Medium: "🟡",
  Low: "🟢",
};

export const getCategoryIcon = (category: string): LucideIcon => {
  if (category === "Plumbing") return Droplets;
  if (category === "Electrical") return Zap;
  if (category === "HVAC") return Wind;
  if (category === "Appliance") return Box;
  return Wrench;
};
