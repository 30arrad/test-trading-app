import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  change?: string;
  changeType?: "profit" | "loss" | "neutral";
  icon: LucideIcon;
}

export function StatCard({ label, value, change, changeType = "neutral", icon: Icon }: StatCardProps) {
  return (
    <div className="glass-card p-5 gradient-border animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <p className="stat-label">{label}</p>
          <p className="stat-value mt-2">{value}</p>
          {change && (
            <p className={cn(
              "text-sm mt-2 font-medium",
              changeType === "profit" && "profit-text",
              changeType === "loss" && "loss-text",
              changeType === "neutral" && "text-muted-foreground"
            )}>
              {change}
            </p>
          )}
        </div>
        <div className={cn(
          "p-2.5 rounded-lg",
          changeType === "profit" && "bg-success/10",
          changeType === "loss" && "bg-destructive/10",
          changeType === "neutral" && "bg-primary/10"
        )}>
          <Icon className={cn(
            "w-5 h-5",
            changeType === "profit" && "text-success",
            changeType === "loss" && "text-destructive",
            changeType === "neutral" && "text-primary"
          )} />
        </div>
      </div>
    </div>
  );
}
