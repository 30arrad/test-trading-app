import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, FlaskConical, TrendingUp, Target, BarChart3, Loader2, Trash2, DollarSign, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { StatCard } from "@/components/dashboard/StatCard";
import { useMemo } from "react";
import { Search, Filter, ArrowUpDown, Calendar, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface BacktestResult {
  id: string;
  strategyName: string;
  notes: string;
  dateRange: string;
  totalTrades: number;
  winRate: number;
  maxDrawdown: number;
  status: "completed" | "running" | "failed";
  initialCapital: number;
  finalCapital: number | null;
  createdAt: string;
}

interface BacktestingProps {
  sessionType?: "backtest" | "future_trading";
}

export default function Backtesting({ sessionType = "backtest" }: BacktestingProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isFutureTrading = sessionType === "future_trading";
  const basePath = isFutureTrading ? "/future-trading" : "/backtesting";
  const { toast } = useToast();
  const [backtests, setBacktests] = useState<BacktestResult[]>([]);
  const [selectedBacktest, setSelectedBacktest] = useState<BacktestResult | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  const [form, setForm] = useState({
    strategyName: "",
    strategy: "",
    startDate: "",
    endDate: "",
    initialCapital: "10000",
    notes: "",
  });

  const resetForm = () =>
    setForm({
      strategyName: "",
      strategy: "",
      startDate: "",
      endDate: "",
      initialCapital: "10000",
      notes: "",
    });

  useEffect(() => {
    if (user) fetchBacktests();
  }, [user]);

  const fetchBacktests = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("backtests").select("*").eq("type", sessionType).order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error loading backtests", description: error.message, variant: "destructive" });
    } else {
      const mapped = (data || []).map((b) => ({
        id: b.id,
        strategyName: b.name,
        notes: b.notes || "",
        dateRange: `${b.start_date} - ${b.end_date}`,
        totalTrades: b.total_trades || 0,
        winRate: Number(b.win_rate) || 0,
        maxDrawdown: Number(b.max_drawdown) || 0,
        status: "completed" as const,
        initialCapital: Number(b.initial_capital),
        finalCapital: b.final_capital !== null && b.final_capital !== undefined ? Number(b.final_capital) : null,
        createdAt: b.created_at,
      }));
      setBacktests(mapped);
      if (mapped.length > 0 && !selectedBacktest) setSelectedBacktest(mapped[0]);
    }
    setLoading(false);
  };

  const handleRunBacktest = async () => {
    if (!user) return;
    setSaving(true);

    const dbPayload = {
      user_id: user.id,
      name: form.strategyName || "Untitled Strategy",
      strategy: form.strategy || "No strategy defined",
      start_date: form.startDate || new Date().toISOString().slice(0, 10),
      end_date: form.endDate || new Date().toISOString().slice(0, 10),
      initial_capital: parseFloat(form.initialCapital) || 10000,
      notes: form.notes,
      type: sessionType,
    };

    const { data: insertedData, error } = await supabase.from("backtests").insert(dbPayload).select();
    if (error) {
      toast({ title: "Error saving backtest", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Backtest saved", description: `${dbPayload.name} created` });
      if (insertedData && insertedData[0]) {
        navigate(`${basePath}/${insertedData[0].id}`);
      }
      fetchBacktests();
    }
    setIsDialogOpen(false);
    resetForm();
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("backtests").delete().eq("id", id);
    if (error) {
      toast({ title: "Error deleting backtest", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Backtest deleted" });
      if (selectedBacktest?.id === id) setSelectedBacktest(null);
      fetchBacktests();
    }
  };

  const getTotalReturn = (bt: BacktestResult) => {
    if (!bt.finalCapital) return 0;
    return Math.round(((bt.finalCapital - bt.initialCapital) / bt.initialCapital) * 100 * 10) / 10;
  };

  const aggregateStats = useMemo(() => {
    const totalPnl = backtests.reduce((sum, bt) => {
      const final = bt.finalCapital !== null ? bt.finalCapital : bt.initialCapital;
      return sum + (final - bt.initialCapital);
    }, 0);

    const avgWinRate = backtests.length > 0
      ? backtests.reduce((sum, bt) => sum + bt.winRate, 0) / backtests.length
      : 0;

    const totalTrades = backtests.reduce((sum, bt) => sum + bt.totalTrades, 0);

    return { totalPnl, avgWinRate, totalTrades, sessionCount: backtests.length };
  }, [backtests]);

  const filteredAndSortedBacktests = useMemo(() => {
    return backtests
      .filter(bt =>
        bt.strategyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bt.notes.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => {
        if (sortBy === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (sortBy === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        if (sortBy === "winrate") return b.winRate - a.winRate;
        if (sortBy === "pnl") {
          const pnlA = (a.finalCapital !== null ? a.finalCapital : a.initialCapital) - a.initialCapital;
          const pnlB = (b.finalCapital !== null ? b.finalCapital : b.initialCapital) - b.initialCapital;
          return pnlB - pnlA;
        }
        return 0;
      });
  }, [backtests, searchQuery, sortBy]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{isFutureTrading ? "Future Trading" : "Back Testing"}</h1>
          <p className="text-muted-foreground mt-1">{isFutureTrading ? "Manage your future trading sessions" : "Test and analyze your trading strategies"}</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              New Backtest
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] bg-card border-border">
            <DialogHeader>
              <DialogTitle>Create New Backtest</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Strategy Name</label>
                <Input placeholder="My Strategy" className="bg-muted border-border" value={form.strategyName} onChange={(e) => setForm((f) => ({ ...f, strategyName: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Strategy Rules</label>
                <Textarea placeholder="Describe your strategy rules..." className="bg-muted border-border min-h-[100px]" value={form.strategy} onChange={(e) => setForm((f) => ({ ...f, strategy: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Start Date</label>
                  <Input type="date" className="bg-muted border-border" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">End Date</label>
                  <Input type="date" className="bg-muted border-border" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Initial Capital</label>
                <Input type="number" placeholder="10000" className="bg-muted border-border" value={form.initialCapital} onChange={(e) => setForm((f) => ({ ...f, initialCapital: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Notes</label>
                <Textarea placeholder="Additional notes..." className="bg-muted border-border" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
              <Button className="w-full mt-2" onClick={handleRunBacktest} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <FlaskConical className="w-4 h-4 mr-2" />
                Save Backtest
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total P&L"
          value={`${aggregateStats.totalPnl >= 0 ? "$" : "-$"}${Math.abs(aggregateStats.totalPnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          change={`${aggregateStats.totalTrades} total trades`}
          changeType={aggregateStats.totalPnl >= 0 ? "profit" : "loss"}
          icon={DollarSign}
        />
        <StatCard
          label="Avg. Win Rate"
          value={`${aggregateStats.avgWinRate.toFixed(1)}%`}
          change="across sessions"
          changeType={aggregateStats.avgWinRate >= 50 ? "profit" : "loss"}
          icon={Target}
        />
        <StatCard
          label="Total Trades"
          value={aggregateStats.totalTrades.toString()}
          change="all sessions"
          changeType="neutral"
          icon={Activity}
        />
        <StatCard
          label="Sessions"
          value={aggregateStats.sessionCount.toString()}
          change={isFutureTrading ? "future trading" : "backtests"}
          changeType="neutral"
          icon={FlaskConical}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : backtests.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-muted-foreground">No backtests yet. Create your first backtest to get started!</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search strategies or notes..."
                className="pl-10 bg-muted border-border"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px] bg-muted border-border text-sm">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="winrate">Win Rate</SelectItem>
                  <SelectItem value="pnl">Highest PNL</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedBacktests.map((backtest) => {
              const pnl = (backtest.finalCapital !== null ? backtest.finalCapital : backtest.initialCapital) - backtest.initialCapital;
              const returnPercentage = getTotalReturn(backtest);

              return (
                <div
                  key={backtest.id}
                  onClick={() => navigate(`${basePath}/${backtest.id}`)}
                  className="group glass-card p-5 hover:border-primary/50 transition-all cursor-pointer relative flex flex-col h-full"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Activity className="w-4 h-4 text-primary" />
                        <h4 className="font-semibold text-lg line-clamp-1">{backtest.strategyName}</h4>
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {backtest.dateRange}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10 h-8 w-8 -mt-1 -mr-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(backtest.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Win Rate</p>
                      <p className="text-lg font-bold">{backtest.winRate}%</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Trades</p>
                      <p className="text-lg font-bold">{backtest.totalTrades}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Net PNL</p>
                      <p className={cn("text-lg font-bold", pnl >= 0 ? "text-success" : "text-destructive")}>
                        {pnl >= 0 ? "+" : ""}${Math.abs(pnl).toLocaleString()}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Return</p>
                      <p className={cn("text-lg font-bold", returnPercentage >= 0 ? "text-success" : "text-destructive")}>
                        {returnPercentage >= 0 ? "+" : ""}{returnPercentage}%
                      </p>
                    </div>
                  </div>

                  <div className="mt-auto pt-4 border-t border-border/50">
                    <p className="text-sm text-muted-foreground line-clamp-2 italic">
                      {backtest.notes || "No additional notes provided."}
                    </p>
                  </div>

                  <div className="absolute bottom-4 right-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}