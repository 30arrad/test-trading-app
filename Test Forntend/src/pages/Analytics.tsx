import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { StatCard } from "@/components/dashboard/StatCard";
import { TrendingUp, TrendingDown, BarChart3, Target, Loader2 } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface TradeItem {
  pnl: number;
  symbol: string;
  dayOfWeek: string;
}

function computeStats(items: TradeItem[]) {
  const totalTrades = items.length;
  const wins = items.filter(t => t.pnl > 0).length;
  const losses = items.filter(t => t.pnl < 0).length;
  const breakeven = items.filter(t => t.pnl === 0).length;
  const winRate = totalTrades > 0 ? Math.round((wins / totalTrades) * 100) : 0;
  const totalPnl = items.reduce((s, t) => s + t.pnl, 0);
  const avgWin = wins > 0 ? items.filter(t => t.pnl > 0).reduce((s, t) => s + t.pnl, 0) / wins : 0;
  const avgLoss = losses > 0 ? Math.abs(items.filter(t => t.pnl < 0).reduce((s, t) => s + t.pnl, 0)) / losses : 0;
  const profitFactor = avgLoss > 0 ? Math.round((avgWin * wins) / (avgLoss * losses) * 100) / 100 : wins > 0 ? Infinity : 0;
  return { totalTrades, wins, losses, breakeven, winRate, totalPnl, avgWin, avgLoss, profitFactor };
}

function computeWinLoss(stats: ReturnType<typeof computeStats>) {
  if (stats.totalTrades === 0) return [];
  return [
    { name: "Wins", value: stats.wins, color: "hsl(142, 76%, 45%)" },
    { name: "Losses", value: stats.losses, color: "hsl(0, 84%, 60%)" },
    ...(stats.breakeven > 0 ? [{ name: "Breakeven", value: stats.breakeven, color: "hsl(215, 20%, 55%)" }] : []),
  ];
}

function computeSymbolPerf(items: TradeItem[]) {
  const map: Record<string, { pnl: number; trades: number; wins: number }> = {};
  items.forEach(t => {
    if (!map[t.symbol]) map[t.symbol] = { pnl: 0, trades: 0, wins: 0 };
    map[t.symbol].pnl += t.pnl;
    map[t.symbol].trades += 1;
    if (t.pnl > 0) map[t.symbol].wins += 1;
  });
  return Object.entries(map)
    .map(([symbol, d]) => ({ symbol, pnl: Math.round(d.pnl * 100) / 100, trades: d.trades, winRate: d.trades > 0 ? Math.round((d.wins / d.trades) * 100) : 0 }))
    .sort((a, b) => b.pnl - a.pnl);
}

function computePnlByDay(items: TradeItem[]) {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const map: Record<string, { total: number; count: number }> = {};
  days.forEach(d => (map[d] = { total: 0, count: 0 }));
  items.forEach(t => {
    if (map[t.dayOfWeek]) {
      map[t.dayOfWeek].total += t.pnl;
      map[t.dayOfWeek].count += 1;
    }
  });
  return days.filter(d => map[d].count > 0).map(d => ({
    day: d.slice(0, 3),
    pnl: Math.round(map[d].total * 100) / 100,
    trades: map[d].count,
  }));
}

function AnalyticsPanel({ items }: { items: TradeItem[] }) {
  const stats = useMemo(() => computeStats(items), [items]);
  const winLossData = useMemo(() => computeWinLoss(stats), [stats]);
  const symbolPerformance = useMemo(() => computeSymbolPerf(items), [items]);
  const pnlByDay = useMemo(() => computePnlByDay(items), [items]);

  if (stats.totalTrades === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <p className="text-muted-foreground">No trades yet. Start logging trades to see analytics.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Trades" value={String(stats.totalTrades)} change={`${stats.wins}W / ${stats.losses}L`} changeType="neutral" icon={BarChart3} />
        <StatCard label="Win Rate" value={`${stats.winRate}%`} change={`${stats.wins} winning trades`} changeType={stats.winRate >= 50 ? "profit" : "loss"} icon={Target} />
        <StatCard label="Total P&L" value={`${stats.totalPnl >= 0 ? "+" : ""}$${Math.abs(Math.round(stats.totalPnl)).toLocaleString()}`} changeType={stats.totalPnl >= 0 ? "profit" : "loss"} icon={stats.totalPnl >= 0 ? TrendingUp : TrendingDown} />
        <StatCard label="Profit Factor" value={stats.profitFactor === Infinity ? "∞" : String(stats.profitFactor)} change={`Avg Win: $${Math.round(stats.avgWin)} | Avg Loss: $${Math.round(stats.avgLoss)}`} changeType={stats.profitFactor >= 1 ? "profit" : "loss"} icon={TrendingUp} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass-card p-5 animate-fade-in">
          <h3 className="text-lg font-semibold mb-4">Win / Loss Distribution</h3>
          {winLossData.length > 0 ? (
            <>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={winLossData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
                      {winLossData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "hsl(222, 47%, 10%)", border: "1px solid hsl(222, 30%, 18%)", borderRadius: "8px" }} formatter={(value: number, name: string) => [value, name]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 mt-4">
                {winLossData.map(d => (
                  <div key={d.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-sm">{d.name} ({d.value})</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-muted-foreground text-center py-12">No data</p>
          )}
        </div>

        <div className="glass-card p-5 animate-fade-in">
          <h3 className="text-lg font-semibold mb-4">P&L by Day of Week</h3>
          {pnlByDay.length > 0 ? (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pnlByDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 18%)" />
                  <XAxis dataKey="day" stroke="hsl(215, 20%, 55%)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(215, 20%, 55%)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(222, 47%, 10%)", border: "1px solid hsl(222, 30%, 18%)", borderRadius: "8px" }} formatter={(value: number) => [`$${value}`, "P&L"]} />
                  <Bar dataKey="pnl" radius={[4, 4, 0, 0]} fill="hsl(187, 85%, 53%)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-12">No data</p>
          )}
        </div>
      </div>

      <div className="glass-card p-5 animate-slide-up">
        <h3 className="text-lg font-semibold mb-4">Performance by Symbol</h3>
        {symbolPerformance.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Symbol</th>
                  <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Total P&L</th>
                  <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Trades</th>
                  <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Win Rate</th>
                  <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Performance</th>
                </tr>
              </thead>
              <tbody>
                {symbolPerformance.map((row) => (
                  <tr key={row.symbol} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-4 font-medium">{row.symbol}</td>
                    <td className={`px-4 py-4 text-right font-mono font-medium ${row.pnl >= 0 ? "profit-text" : "loss-text"}`}>
                      {row.pnl >= 0 ? "+" : ""}${Math.abs(row.pnl).toLocaleString()}
                    </td>
                    <td className="px-4 py-4 text-right text-muted-foreground">{row.trades}</td>
                    <td className="px-4 py-4 text-right">{row.winRate}%</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${row.pnl >= 0 ? "bg-success" : "bg-destructive"}`} style={{ width: `${Math.min(row.winRate, 100)}%` }} />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">No data</p>
        )}
      </div>
    </div>
  );
}

export default function Analytics() {
  const { user } = useAuth();
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const { data: trades = [], isLoading: tradesLoading } = useQuery({
    queryKey: ["trades", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("trades").select("*").order("entry_date", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: backtestTrades = [], isLoading: btLoading } = useQuery({
    queryKey: ["backtest_trades_future", user?.id],
    queryFn: async () => {
      const { data: futureSessions } = await supabase
        .from("backtests")
        .select("id")
        .eq("type", "future_trading");
      if (!futureSessions || futureSessions.length === 0) return [];
      const sessionIds = futureSessions.map(s => s.id);
      const { data, error } = await supabase
        .from("backtest_trades")
        .select("*")
        .in("backtest_id", sessionIds)
        .order("trade_date", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: backtestSessionTrades = [], isLoading: bsLoading } = useQuery({
    queryKey: ["backtest_trades_session", user?.id],
    queryFn: async () => {
      const { data: backtestSessions } = await supabase
        .from("backtests")
        .select("id")
        .eq("type", "backtest");
      if (!backtestSessions || backtestSessions.length === 0) return [];
      const sessionIds = backtestSessions.map(s => s.id);
      const { data, error } = await supabase
        .from("backtest_trades")
        .select("*")
        .in("backtest_id", sessionIds)
        .order("trade_date", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const loading = tradesLoading || btLoading || bsLoading;

  const sportItems: TradeItem[] = useMemo(() =>
    trades.map(t => ({ pnl: Number(t.pnl), symbol: t.symbol, dayOfWeek: days[new Date(t.entry_date).getUTCDay()] })),
    [trades]
  );

  const futureItems: TradeItem[] = useMemo(() =>
    backtestTrades.map(t => ({ pnl: Number(t.pnl), symbol: t.pair, dayOfWeek: t.day_of_week || days[new Date(t.trade_date).getUTCDay()] })),
    [backtestTrades]
  );

  const backtestItems: TradeItem[] = useMemo(() =>
    backtestSessionTrades.map(t => ({ pnl: Number(t.pnl), symbol: t.pair, dayOfWeek: t.day_of_week || days[new Date(t.trade_date).getUTCDay()] })),
    [backtestSessionTrades]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground mt-1">Separate insights for Sport Trading, Future Trading, and Back Testing</p>
      </div>

      <Tabs defaultValue="sport" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="sport">Sport Trading</TabsTrigger>
          <TabsTrigger value="future">Future Trading</TabsTrigger>
          <TabsTrigger value="backtest">Back Testing</TabsTrigger>
        </TabsList>
        <TabsContent value="sport">
          <AnalyticsPanel items={sportItems} />
        </TabsContent>
        <TabsContent value="future">
          <AnalyticsPanel items={futureItems} />
        </TabsContent>
        <TabsContent value="backtest">
          <AnalyticsPanel items={backtestItems} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
