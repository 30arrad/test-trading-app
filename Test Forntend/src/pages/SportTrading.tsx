import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Filter, ArrowUpRight, ArrowDownRight, Loader2, Trash2, DollarSign, Target, Activity, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { StatCard } from "@/components/dashboard/StatCard";
import { useMemo } from "react";

interface TradeEntry {
  id: string;
  symbol: string;
  type: "long" | "short";
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  entryDate: string;
  exitDate: string;
  notes: string;
  tags: string[];
  pnl: number;
}

export default function SportTrading() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<TradeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTradeId, setEditingTradeId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [form, setForm] = useState({
    symbol: "",
    type: "long" as TradeEntry["type"],
    entryPrice: "",
    exitPrice: "",
    quantity: "",
    entryDate: "",
    exitDate: "",
    notes: "",
    tags: "",
  });

  useEffect(() => {
    if (user) fetchTrades();
  }, [user]);

  const fetchTrades = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("trades")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error loading trades", description: error.message, variant: "destructive" });
    } else {
      setTrades(
        (data || []).map((t) => ({
          id: t.id,
          symbol: t.symbol,
          type: t.type as "long" | "short",
          entryPrice: Number(t.entry_price),
          exitPrice: Number(t.exit_price),
          quantity: Number(t.quantity),
          entryDate: t.entry_date,
          exitDate: t.exit_date,
          notes: t.notes || "",
          tags: t.tags || [],
          pnl: Number(t.pnl),
        }))
      );
    }
    setLoading(false);
  };

  const resetForm = () =>
    setForm({
      symbol: "",
      type: "long",
      entryPrice: "",
      exitPrice: "",
      quantity: "",
      entryDate: "",
      exitDate: "",
      notes: "",
      tags: "",
    });

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const entryPrice = parseFloat(form.entryPrice) || 0;
    const exitPrice = parseFloat(form.exitPrice) || 0;
    const quantity = parseFloat(form.quantity) || 0;

    let pnl = 0;
    if (form.type === "long") {
      pnl = (exitPrice - entryPrice) * quantity;
    } else {
      pnl = (entryPrice - exitPrice) * quantity;
    }

    const dbPayload = {
      user_id: user.id,
      symbol: form.symbol.toUpperCase() || "N/A",
      type: form.type,
      entry_price: entryPrice,
      exit_price: exitPrice,
      quantity,
      entry_date: form.entryDate || new Date().toISOString().slice(0, 10),
      exit_date: form.exitDate || new Date().toISOString().slice(0, 10),
      notes: form.notes,
      tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      pnl: Math.round(pnl * 100) / 100,
    };

    if (editingTradeId) {
      const { error } = await supabase.from("trades").update(dbPayload).eq("id", editingTradeId);
      if (error) {
        toast({ title: "Error updating trade", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Trade updated", description: `${dbPayload.symbol} updated` });
        fetchTrades();
      }
      setEditingTradeId(null);
    } else {
      const { error } = await supabase.from("trades").insert(dbPayload);
      if (error) {
        toast({ title: "Error saving trade", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Trade saved", description: `${dbPayload.symbol} logged` });
        fetchTrades();
      }
    }

    setIsDialogOpen(false);
    resetForm();
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("trades").delete().eq("id", id);
    if (error) {
      toast({ title: "Error deleting trade", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Trade deleted" });
      fetchTrades();
    }
  };

  const filteredTrades = trades.filter(trade =>
    trade.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    trade.notes.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEdit = (trade: TradeEntry) => {
    setForm({
      symbol: trade.symbol,
      type: trade.type,
      entryPrice: trade.entryPrice.toString(),
      exitPrice: trade.exitPrice.toString(),
      quantity: trade.quantity.toString(),
      entryDate: trade.entryDate,
      exitDate: trade.exitDate,
      notes: trade.notes,
      tags: trade.tags.join(", "),
    });
    setEditingTradeId(trade.id);
    setIsDialogOpen(true);
  };

  const stats = useMemo(() => {
    const closedTrades = trades.filter((t) => t.exitPrice > 0);
    const totalPnl = closedTrades.reduce((sum, t) => sum + Number(t.pnl), 0);
    const wins = closedTrades.filter((t) => Number(t.pnl) > 0);
    const winRate = closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0;
    const avgReturn =
      closedTrades.length > 0
        ? closedTrades.reduce((sum, t) => {
          const cost = Number(t.entryPrice) * Number(t.quantity);
          return sum + (cost > 0 ? (Number(t.pnl) / cost) * 100 : 0);
        }, 0) / closedTrades.length
        : 0;

    return { totalPnl, winRate, totalTrades: trades.length, avgReturn };
  }, [trades]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Sport Trading</h1>
          <p className="text-muted-foreground mt-1">Document and analyze your trades</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) { resetForm(); setEditingTradeId(null); } }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Trade
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] bg-card border-border">
            <DialogHeader>
              <DialogTitle>{editingTradeId ? "Edit Trade" : "Log New Trade"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Symbol</label>
                  <Input placeholder="AAPL" className="bg-muted border-border" value={form.symbol} onChange={(e) => setForm((f) => ({ ...f, symbol: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Type</label>
                  <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as TradeEntry["type"] }))}>
                    <SelectTrigger className="bg-muted border-border"><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="long">Long</SelectItem>
                      <SelectItem value="short">Short</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Entry Price</label>
                  <Input type="number" placeholder="0.00" className="bg-muted border-border" value={form.entryPrice} onChange={(e) => setForm((f) => ({ ...f, entryPrice: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Exit Price</label>
                  <Input type="number" placeholder="0.00" className="bg-muted border-border" value={form.exitPrice} onChange={(e) => setForm((f) => ({ ...f, exitPrice: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Entry Date</label>
                  <Input type="date" className="bg-muted border-border" value={form.entryDate} onChange={(e) => setForm((f) => ({ ...f, entryDate: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Exit Date</label>
                  <Input type="date" className="bg-muted border-border" value={form.exitDate} onChange={(e) => setForm((f) => ({ ...f, exitDate: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Quantity</label>
                <Input type="number" placeholder="100" className="bg-muted border-border" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Notes</label>
                <Textarea placeholder="Describe your trade setup, reasoning, and lessons learned..." className="bg-muted border-border min-h-[100px]" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Tags</label>
                <Input placeholder="earnings, breakout, momentum" className="bg-muted border-border" value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} />
              </div>
              <Button className="w-full mt-2" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingTradeId ? "Update Trade" : "Save Trade"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total P&L"
          value={`${stats.totalPnl >= 0 ? "৳" : "-৳"}${Math.abs(stats.totalPnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
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

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search trades..." className="pl-10 bg-muted border-border" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="w-4 h-4" />
          Filters
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredTrades.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-muted-foreground">No trades yet. Add your first trade to get started!</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredTrades.map((trade) => (
            <div key={trade.id} className="glass-card p-5 hover:bg-card/90 transition-colors cursor-pointer animate-fade-in">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center", trade.type === "long" ? "bg-success/10" : "bg-destructive/10")}>
                    {trade.type === "long" ? <ArrowUpRight className="w-6 h-6 text-success" /> : <ArrowDownRight className="w-6 h-6 text-destructive" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-lg">{trade.symbol}</span>
                      <span className={cn("text-xs px-2 py-0.5 rounded font-medium", trade.type === "long" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")}>{trade.type.toUpperCase()}</span>
                      <span className={cn("text-xs px-2 py-0.5 rounded font-medium", trade.exitPrice > 0 ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary")}>
                        {trade.exitPrice > 0 ? "Closed" : "Open"}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{trade.quantity} shares • {trade.entryDate} → {trade.exitDate}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 lg:gap-8">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground uppercase">Entry</p>
                    <p className="font-mono font-medium">৳{trade.entryPrice.toFixed(2)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground uppercase">Exit</p>
                    <p className="font-mono font-medium">৳{trade.exitPrice.toFixed(2)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground uppercase">P&L</p>
                    {trade.exitPrice > 0 ? (
                      <p className={cn("font-mono font-semibold", trade.pnl >= 0 ? "profit-text" : "loss-text")}>
                        {trade.pnl >= 0 ? "+" : ""}{trade.pnl >= 0 ? "৳" : "-৳"}{Math.abs(trade.pnl).toFixed(2)}
                      </p>
                    ) : (
                      <p className="font-mono font-medium text-muted-foreground">---</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleEdit(trade); }}>Edit</Button>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(trade.id); }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-4 line-clamp-2">{trade.notes}</p>
              <div className="flex gap-2 mt-3">
                {trade.tags.map((tag) => (
                  <span key={tag} className="text-xs px-2 py-1 rounded-md bg-primary/10 text-primary font-medium">#{tag}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}