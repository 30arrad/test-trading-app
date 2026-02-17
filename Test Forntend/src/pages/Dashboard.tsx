import { useState, useEffect, useMemo } from "react";
import { StatCard } from "@/components/dashboard/StatCard";
import { RecentTrades } from "@/components/dashboard/RecentTrades";
import { PerformanceChart } from "@/components/dashboard/PerformanceChart";
import { DollarSign, TrendingUp, Target, Activity, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Trade {
  id: string;
  symbol: string;
  type: string;
  entry_price: number;
  exit_price: number;
  quantity: number;
  entry_date: string;
  exit_date: string;
  pnl: number;
  notes: string;
  tags: string[];
  created_at: string;
  category: 'sport' | 'future';
}

export default function Dashboard() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchTrades();
  }, [user]);

  const fetchTrades = async () => {
    setLoading(true);

    // Fetch Sport Trades
    const { data: sportTradesData } = await supabase
      .from("trades")
      .select("*")
      .order("created_at", { ascending: false });

    // Fetch Future Trading Sessions
    const { data: futureSessions } = await supabase
      .from("backtests")
      .select("id")
      .eq("type", "future_trading");

    let futureTradesData: any[] = [];
    if (futureSessions && futureSessions.length > 0) {
      const sessionIds = futureSessions.map(s => s.id);
      const { data } = await supabase
        .from("backtest_trades")
        .select("*")
        .in("backtest_id", sessionIds)
        .order("created_at", { ascending: false });
      futureTradesData = data || [];
    }

    const unifiedTrades: Trade[] = [
      ...(sportTradesData || []).map(t => ({
        id: t.id,
        symbol: t.symbol,
        type: t.type,
        entry_price: Number(t.entry_price),
        exit_price: Number(t.exit_price),
        quantity: Number(t.quantity),
        entry_date: t.entry_date,
        exit_date: t.exit_date,
        pnl: Number(t.pnl),
        notes: t.notes || "",
        tags: t.tags || [],
        created_at: t.created_at,
        category: 'sport' as const,
      })),
      ...futureTradesData.map(t => ({
        id: t.id,
        symbol: t.pair,
        type: "future", // Explicitly mark as future trading
        entry_price: 0, // Not explicitly in backtest_trades schema for now
        exit_price: 0,
        quantity: Number(t.lot_size),
        entry_date: t.trade_date,
        exit_date: t.trade_date,
        pnl: Number(t.pnl),
        notes: t.note || "",
        tags: [],
        created_at: t.created_at,
        category: 'future' as const,
      }))
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setTrades(unifiedTrades);
    setLoading(false);
  };

  const stats = useMemo(() => {
    if (trades.length === 0) {
      return {
        totalPnl: 0,
        winRate: 0,
        totalTrades: 0,
        avgReturn: 0,
        bestTrade: null as Trade | null,
        worstTrade: null as Trade | null,
        profitFactor: 0,
        maxDrawdown: 0,
      };
    }

    const closedTrades = trades.filter((t) => t.category === "future" || Number(t.exit_price) > 0);
    const totalPnl = closedTrades.reduce((sum, t) => sum + Number(t.pnl), 0);
    const wins = closedTrades.filter((t) => Number(t.pnl) > 0);
    const losses = closedTrades.filter((t) => Number(t.pnl) < 0);
    const winRate = closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0;

    const grossProfit = wins.reduce((sum, t) => sum + Number(t.pnl), 0);
    const grossLoss = Math.abs(losses.reduce((sum, t) => sum + Number(t.pnl), 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

    const avgReturn =
      closedTrades.length > 0
        ? closedTrades.reduce((sum, t) => {
          const cost = Number(t.entry_price) * Number(t.quantity);
          return sum + (cost > 0 ? (Number(t.pnl) / cost) * 100 : 0);
        }, 0) / closedTrades.length
        : 0;

    const sorted = [...closedTrades].sort((a, b) => Number(b.pnl) - Number(a.pnl));
    const bestTrade = sorted[0] || null;
    const worstTrade = sorted[sorted.length - 1] || null;

    let peak = 0;
    let maxDrawdown = 0;
    let cumulative = 0;
    [...closedTrades].reverse().forEach((t) => {
      cumulative += Number(t.pnl);
      if (cumulative > peak) peak = cumulative;
      const dd = peak > 0 ? ((peak - cumulative) / peak) * 100 : 0;
      if (dd > maxDrawdown) maxDrawdown = dd;
    });

    return { totalPnl, winRate, totalTrades: trades.length, avgReturn, bestTrade, worstTrade, profitFactor, maxDrawdown };
  }, [trades]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your trading performance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total P&L"
          value={`${stats.totalPnl >= 0 ? "$" : "-$"}${Math.abs(stats.totalPnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          change={`${stats.totalTrades} trades`}
          changeType={stats.totalPnl >= 0 ? "profit" : "loss"}
          icon={DollarSign}
        />
        <StatCard
          label="Win Rate"
          value={`${stats.winRate.toFixed(1)}%`}
          change={`${trades.filter((t) => Number(t.pnl) > 0).length} wins`}
          changeType={stats.winRate >= 50 ? "profit" : "loss"}
          icon={Target}
        />
        <StatCard
          label="Total Trades"
          value={stats.totalTrades.toString()}
          change="all time"
          changeType="neutral"
          icon={Activity}
        />
        <StatCard
          label="Avg. Return"
          value={`${stats.avgReturn >= 0 ? "+" : ""}${stats.avgReturn.toFixed(1)}%`}
          change="per trade"
          changeType={stats.avgReturn >= 0 ? "profit" : "loss"}
          icon={TrendingUp}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PerformanceChart trades={trades} />
        <div className="glass-card p-5 animate-slide-up">
          <div className="mb-6">
            <h3 className="text-lg font-semibold">Quick Stats</h3>
            <p className="text-sm text-muted-foreground mt-1">Key trading metrics</p>
          </div>

          <div className="space-y-4">
            {(stats.totalTrades === 0
              ? [
                { label: "Best Trade", value: "-", subtext: "", type: "neutral" },
                { label: "Worst Trade", value: "-", subtext: "", type: "neutral" },
                { label: "Profit Factor", value: "-", subtext: "", type: "neutral" },
                { label: "Max Drawdown", value: "-", subtext: "", type: "neutral" },
              ]
              : [
                {
                  label: "Best Trade",
                  value: stats.bestTrade ? `+$${Number(stats.bestTrade.pnl).toFixed(2)}` : "-",
                  subtext: stats.bestTrade ? `${stats.bestTrade.symbol} ${stats.bestTrade.type}` : "",
                  type: "profit",
                },
                {
                  label: "Worst Trade",
                  value: stats.worstTrade ? `-$${Math.abs(Number(stats.worstTrade.pnl)).toFixed(2)}` : "-",
                  subtext: stats.worstTrade ? `${stats.worstTrade.symbol} ${stats.worstTrade.type}` : "",
                  type: "loss",
                },
                {
                  label: "Profit Factor",
                  value: stats.profitFactor === Infinity ? "∞" : stats.profitFactor.toFixed(2),
                  subtext: "",
                  type: stats.profitFactor >= 1 ? "profit" : "loss",
                },
                {
                  label: "Max Drawdown",
                  value: `-${stats.maxDrawdown.toFixed(1)}%`,
                  subtext: "",
                  type: "loss",
                },
              ]
            ).map((stat, index) => (
              <div key={index} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
                <span className="text-muted-foreground">{stat.label}</span>
                <div className="text-right">
                  <span
                    className={`font-mono font-semibold ${stat.type === "profit" ? "profit-text" : stat.type === "loss" ? "loss-text" : ""
                      }`}
                  >
                    {stat.value}
                  </span>
                  {stat.subtext && <span className="text-xs text-muted-foreground ml-2">{stat.subtext}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <RecentTrades trades={trades} />
    </div>
  );
}