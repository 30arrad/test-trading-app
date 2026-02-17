import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useMemo } from "react";

interface Trade {
  id: string;
  pnl: number;
  exit_date: string;
  exit_price?: number;
  category?: string;
}

interface Props {
  trades: Trade[];
}

export function PerformanceChart({ trades }: Props) {
  const data = useMemo(() => {
    const closedTrades = trades.filter((t) => t.category === "future" || Number(t.exit_price) > 0);
    if (closedTrades.length === 0) return [];

    const sorted = [...closedTrades].sort((a, b) => new Date(a.exit_date).getTime() - new Date(b.exit_date).getTime());
    let balance = 10000;
    return sorted.map((t) => {
      balance += Number(t.pnl);
      return { date: t.exit_date, balance: Math.round(balance * 100) / 100 };
    });
  }, [trades]);

  return (
    <div className="glass-card p-5 animate-slide-up">
      <div className="mb-6">
        <h3 className="text-lg font-semibold">Account Performance</h3>
        <p className="text-sm text-muted-foreground mt-1">Portfolio balance over time</p>
      </div>

      <div className="h-[300px]">
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No trades yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(187, 85%, 53%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(187, 85%, 53%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 18%)" />
              <XAxis
                dataKey="date"
                stroke="hsl(215, 20%, 55%)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="hsl(215, 20%, 55%)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(222, 47%, 10%)",
                  border: "1px solid hsl(222, 30%, 18%)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, "Balance"]}
              />
              <Area
                type="monotone"
                dataKey="balance"
                stroke="hsl(187, 85%, 53%)"
                strokeWidth={2}
                fill="url(#balanceGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}