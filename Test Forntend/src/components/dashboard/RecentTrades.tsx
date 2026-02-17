import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Link } from "react-router-dom";

interface Trade {
  id: string;
  symbol: string;
  type: string;
  pnl: number;
  exit_date: string;
  category: 'sport' | 'future';
  exit_price?: number;
}

interface Props {
  trades: Trade[];
}

export function RecentTrades({ trades }: Props) {
  const recent = trades.slice(0, 5);

  return (
    <div className="glass-card p-5 animate-slide-up">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Recent Trades</h3>
        <Link to="/sport-trading" className="text-sm text-primary hover:underline">
          View all
        </Link>
      </div>

      <div className="space-y-3">
        {recent.length === 0 ? (
          <p className="text-muted-foreground text-sm py-4 text-center">No trades yet</p>
        ) : (
          recent.map((trade) => (
            <div
              key={trade.id}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center",
                    trade.type === "long" || (trade.type === "future" && Number(trade.pnl) >= 0) ? "bg-success/10" : "bg-destructive/10"
                  )}
                >
                  {trade.type === "long" || (trade.type === "future" && Number(trade.pnl) >= 0) ? (
                    <ArrowUpRight className="w-4 h-4 text-success" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-destructive" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{trade.symbol}</p>
                    <span className={cn(
                      "text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-sm",
                      trade.category === 'sport'
                        ? "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                        : "bg-purple-500/10 text-purple-500 border border-purple-500/20"
                    )}>
                      {trade.category}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{trade.exit_date}</p>
                </div>
              </div>
              <span
                className={cn(
                  "font-mono font-semibold",
                  (trade.category === 'future' || Number(trade.exit_price) > 0)
                    ? (Number(trade.pnl) >= 0 ? "profit-text" : "loss-text")
                    : "text-muted-foreground"
                )}
              >
                {(trade.category === 'future' || Number(trade.exit_price) > 0) ? (
                  <>
                    {Number(trade.pnl) >= 0 ? "+" : ""}$
                    {Number(trade.pnl).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </>
                ) : (
                  "---"
                )}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
