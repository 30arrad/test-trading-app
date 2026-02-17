import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Loader2, Trash2, Edit2, TrendingUp, TrendingDown, Target, BarChart3, Check, X, Minus, Database, Wallet, ImagePlus, XCircle, History } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileText } from "lucide-react";

interface BacktestTrade {
    id: string;
    trade_date: string;
    day_of_week: string;
    pair: string;
    strategy: string;
    risk_pips: number;
    reward_pips: number;
    result: "TP Hit" | "SL Hit" | "BE";
    pip_result: number;
    lot_size: number;
    pnl: number;
    balance: number;
    note: string;
    tp_hit: boolean;
    sl_hit: boolean;
    be_hit: boolean;
    target: string;
    image_url: string | null;
}

interface Backtest {
    id: string;
    name: string;
    strategy: string;
    initial_capital: number;
    final_capital: number | null;
    win_rate: number;
    total_trades: number;
    losing_trades: number | null;
    winning_trades: number | null;
    profit_factor: number | null;
    start_date: string;
    end_date: string;
    notes: string;
    created_at?: string;
}

interface WalletHistory {
    id: string;
    type: 'deposit' | 'withdraw';
    amount: number;
    created_at: string;
    note?: string;
}

interface BacktestSessionProps {
    sessionType?: "backtest" | "future_trading";
}

export default function BacktestSession({ sessionType = "backtest" }: BacktestSessionProps) {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { toast } = useToast();

    const [backtest, setBacktest] = useState<Backtest | null>(null);
    const [trades, setTrades] = useState<BacktestTrade[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingTradeId, setEditingTradeId] = useState<string | null>(null);
    const [walletDialogOpen, setWalletDialogOpen] = useState(false);
    const [viewImageUrl, setViewImageUrl] = useState<string | null>(null);
    const [walletAmount, setWalletAmount] = useState("");
    const [walletAction, setWalletAction] = useState<"deposit" | "withdraw">("deposit");
    const [walletHistory, setWalletHistory] = useState<WalletHistory[]>([]);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [pairFilter, setPairFilter] = useState("all");
    const [strategyFilter, setStrategyFilter] = useState("all");
    const [resultFilter, setResultFilter] = useState("all");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");

    const [form, setForm] = useState({
        trade_date: new Date().toISOString().split('T')[0],
        day_of_week: new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date()),
        pair: "GOLD",
        strategy: "",
        risk_pips: "",
        reward_pips: "",
        result: "TP Hit" as "TP Hit" | "SL Hit" | "BE",
        pip_result: "",
        lot_size: "",
        pnl: "",
        balance: "",
        note: "",
        target: "1:1",
        broker_cost: "",
    });

    useEffect(() => {
        if (user && id) {
            fetchBacktest();
            fetchTrades();
            fetchWalletHistory();
        }
    }, [user, id]);

    const fetchBacktest = async () => {
        const { data, error } = await supabase.from("backtests").select("*").eq("id", id).single();
        if (error) {
            toast({ title: "Error loading backtest", description: error.message, variant: "destructive" });
        } else {
            setBacktest(data);
            setForm(f => ({ ...f, strategy: data.strategy || "" }));
        }
    };

    const fetchTrades = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("backtest_trades")
            .select("*")
            .eq("backtest_id", id)
            .order("trade_date", { ascending: true });

        if (error) {
            toast({ title: "Error loading trades", description: error.message, variant: "destructive" });
        } else {
            setTrades((data || []) as BacktestTrade[]);
        }
        setLoading(false);
    };

    const fetchWalletHistory = async () => {
        const { data, error } = await supabase
            .from("wallet_history" as any)
            .select("*")
            .eq("backtest_id", id)
            .order("created_at", { ascending: false });

        if (!error) {
            setWalletHistory(data as any as WalletHistory[]);
        }
    };

    const handleDateChange = (date: string) => {
        const day = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date(date));
        setForm(f => ({ ...f, trade_date: date, day_of_week: day }));
    };

    const resetForm = () => {
        setForm({
            trade_date: new Date().toISOString().split('T')[0],
            day_of_week: new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date()),
            pair: "GOLD",
            strategy: "",
            risk_pips: "",
            reward_pips: "",
            result: "TP Hit",
            pip_result: "",
            lot_size: "",
            pnl: "",
            balance: "",
            note: "",
            target: "1:1",
            broker_cost: "",
        });
        setEditingTradeId(null);
        setImageFile(null);
        setImagePreview(null);
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImageFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setImagePreview(reader.result as string);
        reader.readAsDataURL(file);
    };

    const uploadImage = async (): Promise<string | null> => {
        if (!imageFile || !user) return null;
        setUploadingImage(true);
        const ext = imageFile.name.split('.').pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from('trade-images').upload(path, imageFile);
        setUploadingImage(false);
        if (error) {
            toast({ title: "Image upload failed", description: error.message, variant: "destructive" });
            return null;
        }
        const { data: urlData } = supabase.storage.from('trade-images').getPublicUrl(path);
        return urlData.publicUrl;
    };

    const handleEditClick = (trade: BacktestTrade) => {
        setForm({
            trade_date: trade.trade_date,
            day_of_week: trade.day_of_week,
            pair: trade.pair,
            strategy: trade.strategy,
            risk_pips: trade.risk_pips.toString(),
            reward_pips: trade.reward_pips.toString(),
            result: trade.result,
            pip_result: trade.pip_result.toString(),
            lot_size: trade.lot_size.toString(),
            pnl: trade.pnl.toString(),
            balance: trade.balance.toString(),
            note: trade.note,
            target: trade.target,
            broker_cost: "",
        });
        setEditingTradeId(trade.id);
        setImageFile(null);
        setImagePreview(trade.image_url || null);
        setIsDialogOpen(true);
    };

    const handleSaveTrade = async () => {
        if (!user || !id) return;
        setSaving(true);

        let imageUrl: string | null = imagePreview && !imageFile ? imagePreview : null;
        if (imageFile) {
            imageUrl = await uploadImage();
        }

        const dbPayload = {
            backtest_id: id,
            user_id: user.id,
            trade_date: form.trade_date,
            day_of_week: form.day_of_week,
            pair: form.pair,
            strategy: form.strategy,
            risk_pips: parseFloat(form.risk_pips) || 0,
            reward_pips: parseFloat(form.reward_pips) || 0,
            result: form.result,
            pip_result: parseFloat(form.pip_result) || 0,
            lot_size: parseFloat(form.lot_size) || 0,
            pnl: (parseFloat(form.pnl) || 0) - (parseFloat(form.broker_cost) || 0),
            balance: parseFloat(form.balance) || 0,
            note: form.note,
            tp_hit: form.result === "TP Hit",
            sl_hit: form.result === "SL Hit",
            be_hit: form.result === "BE",
            target: form.target,
            image_url: imageUrl,
        } as any;

        let result;
        if (editingTradeId) {
            result = await supabase.from("backtest_trades").update(dbPayload).eq("id", editingTradeId);
        } else {
            result = await supabase.from("backtest_trades").insert(dbPayload);
        }

        const { error } = result;
        if (error) {
            toast({ title: `Error ${editingTradeId ? 'updating' : 'saving'} trade`, description: error.message, variant: "destructive" });
        } else {
            toast({ title: `Trade ${editingTradeId ? 'updated' : 'saved'}` });
            fetchTrades();
            updateBacktestStats();
            setIsDialogOpen(false);
            resetForm();
        }
        setSaving(false);
    };

    const handleWalletAction = async () => {
        if (!user || !id || !backtest) return;
        const amount = parseFloat(walletAmount);
        if (isNaN(amount) || amount <= 0) {
            toast({ title: "Invalid amount", variant: "destructive" });
            return;
        }

        setSaving(true);
        const newCapital = walletAction === "deposit"
            ? backtest.initial_capital + amount
            : backtest.initial_capital - amount;

        const { error } = await supabase
            .from("backtests")
            .update({ initial_capital: newCapital })
            .eq("id", id);

        if (error) {
            toast({ title: `Error ${walletAction}ing`, description: error.message, variant: "destructive" });
        } else {
            toast({ title: `Successfully ${walletAction}ed $${amount}` });
            setWalletAmount("");
            setWalletDialogOpen(false);

            // Re-fetch everything and wait for it to ensure consistency
            const { data: updatedBacktest } = await supabase.from("backtests").select("*").eq("id", id).single();
            if (updatedBacktest) {
                setBacktest(updatedBacktest);

                // Log to wallet_history
                await supabase.from("wallet_history" as any).insert({
                    backtest_id: id,
                    user_id: user.id,
                    type: walletAction,
                    amount: amount
                });

                // Call update stats with the FRESH capital
                await updateBacktestStats(updatedBacktest.initial_capital);
                fetchWalletHistory();
            }
        }
        setSaving(false);
    };

    const handleDeleteTrade = async (tradeId: string) => {
        const { error } = await supabase.from("backtest_trades").delete().eq("id", tradeId);
        if (error) {
            toast({ title: "Error deleting trade", description: error.message, variant: "destructive" });
        } else {
            toast({ title: "Trade deleted" });
            fetchTrades();
            updateBacktestStats();
        }
    };

    const updateBacktestStats = async (providedInitialCapital?: number) => {
        const { data: allTrades } = await supabase.from("backtest_trades").select("*").eq("backtest_id", id);
        if (!allTrades) return;

        const totalTrades = allTrades.length;
        const winningTrades = allTrades.filter(t => t.result === "TP Hit").length;
        const losingTrades = allTrades.filter(t => t.result === "SL Hit").length;
        const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

        // Simple profit factor calculation
        const totalProfit = allTrades.filter(t => t.pnl > 0).reduce((acc, t) => acc + t.pnl, 0);
        const totalLoss = Math.abs(allTrades.filter(t => t.pnl < 0).reduce((acc, t) => acc + t.pnl, 0));
        const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? 100 : 0;

        const initialCap = providedInitialCapital !== undefined ? providedInitialCapital : (backtest?.initial_capital || 0);
        const finalCapital = initialCap + allTrades.reduce((acc, t) => acc + t.pnl, 0);

        // Calculate max drawdown
        let peak = initialCap;
        let maxDD = 0;
        let running = initialCap;
        const sortedAll = [...allTrades].sort((a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime());
        for (const t of sortedAll) {
            running += t.pnl;
            if (running > peak) peak = running;
            const dd = peak - running;
            if (dd > maxDD) maxDD = dd;
        }
        const maxDrawdownPct = initialCap > 0 ? Math.round((maxDD / initialCap) * 100 * 10) / 10 : 0;

        await supabase.from("backtests").update({
            total_trades: totalTrades,
            winning_trades: winningTrades,
            losing_trades: losingTrades,
            win_rate: Math.round(winRate * 10) / 10,
            profit_factor: Math.round(profitFactor * 100) / 100,
            final_capital: finalCapital,
            max_drawdown: maxDrawdownPct,
        }).eq("id", id);

        fetchBacktest();
    };

    const filteredTrades = trades.filter(trade => {
        const matchPair = pairFilter === "all" || trade.pair === pairFilter;
        const matchStrategy = strategyFilter === "all" || trade.strategy === strategyFilter;
        const matchResult = resultFilter === "all" || trade.result === resultFilter;

        const tradeDate = trade.trade_date;
        const matchFrom = !fromDate || tradeDate >= fromDate;
        const matchTo = !toDate || tradeDate <= toDate;

        return matchPair && matchStrategy && matchResult && matchFrom && matchTo;
    });

    const calculateStats = (tradesToAnalyze: BacktestTrade[]) => {
        const totalTrades = tradesToAnalyze.length;
        const winningTrades = tradesToAnalyze.filter(t => t.result === "TP Hit").length;
        const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

        const totalProfit = tradesToAnalyze.filter(t => t.pnl > 0).reduce((acc, t) => acc + t.pnl, 0);
        const totalLoss = Math.abs(tradesToAnalyze.filter(t => t.pnl < 0).reduce((acc, t) => acc + t.pnl, 0));
        const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? 100 : 0;

        const totalPnl = tradesToAnalyze.reduce((acc, t) => acc + t.pnl, 0);
        const initialCap = backtest?.initial_capital || 0;
        const currentBalance = initialCap + totalPnl;

        // Calculate max drawdown
        let peak = initialCap;
        let maxDrawdown = 0;
        let runningBalance = initialCap;

        const sorted = [...tradesToAnalyze].sort((a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime());
        for (const t of sorted) {
            runningBalance += t.pnl;

            // Drawdown logic
            if (runningBalance > peak) peak = runningBalance;
            const drawdown = peak - runningBalance;
            if (drawdown > maxDrawdown) maxDrawdown = drawdown;
        }

        const profitExclDrawdown = totalPnl - maxDrawdown;
        const totalPips = tradesToAnalyze.reduce((acc, t) => acc + t.pip_result, 0);
        const maxWin = tradesToAnalyze.length > 0 ? Math.max(...tradesToAnalyze.map(t => t.pnl)) : 0;
        const minPnl = tradesToAnalyze.length > 0 ? Math.min(...tradesToAnalyze.map(t => t.pnl)) : 0;

        return {
            winRate: Math.round(winRate * 10) / 10,
            totalTrades,
            profitFactor: Math.round(profitFactor * 100) / 100,
            totalPnl,
            initialCapital: initialCap,
            currentBalance,
            maxDrawdown,
            profitExclDrawdown,
            maxWin,
            minPnl,
            totalPips,
        };
    };

    const overallStats = calculateStats(trades);
    const filteredStats = calculateStats(filteredTrades);

    const exportToPDF = () => {
        const doc = new jsPDF();

        // Add title and info
        doc.setFontSize(20);
        doc.text(backtest?.name || "Backtest Report", 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Strategy: ${backtest?.strategy || "N/A"}`, 14, 30);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 36);

        // Add Stats Summary
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text("Statistics Summary", 14, 48);

        const statsData = [
            ["Win Rate", `${filteredStats.winRate}%`, "Total Trades", filteredStats.totalTrades],
            ["Initial Capital", `$${overallStats.initialCapital.toLocaleString()}`, "Net PNL", `$${filteredStats.totalPnl.toLocaleString()}`],
            ["Current Balance", `$${filteredStats.currentBalance.toLocaleString()}`, "Total Pips", filteredStats.totalPips],
            ["Max Loss", `$${Math.abs(filteredStats.minPnl).toLocaleString()}`, "Max Profit", `$${filteredStats.maxWin.toLocaleString()}`]
        ];

        autoTable(doc, {
            startY: 52,
            head: [],
            body: statsData,
            theme: 'plain',
            styles: { fontSize: 10, cellPadding: 2 },
            columnStyles: {
                0: { fontStyle: 'bold', cellWidth: 40 },
                1: { cellWidth: 50 },
                2: { fontStyle: 'bold', cellWidth: 40 },
                3: { cellWidth: 50 }
            }
        });

        // Add Trades Table
        doc.setFontSize(14);
        doc.text("Trade History", 14, (doc as any).lastAutoTable.finalY + 15);

        const tableColumn = ["Date", "Pair", "Strategy", "Result", "Pips", "PNL", "Balance", "Target"];
        const tableRows = filteredTrades.map((trade, index) => {
            const tradeIndex = trades.findIndex(t => t.id === trade.id);
            const runningPnl = trades.slice(0, tradeIndex + 1).reduce((acc, t) => acc + t.pnl, 0);
            const currentBalance = (backtest?.initial_capital || 0) + runningPnl;

            return [
                trade.trade_date,
                trade.pair,
                trade.strategy,
                trade.result,
                trade.pip_result,
                `$${trade.pnl.toLocaleString()}`,
                `$${currentBalance.toLocaleString()}`,
                trade.target
            ];
        });

        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 20,
            head: [tableColumn],
            body: tableRows,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [41, 128, 185] }
        });

        doc.save(`${backtest?.name || "Backtest"}_Report.pdf`);
    };

    const exportToCSV = () => {
        const headers = ["Date", "Day", "Pair", "Strategy", "Risk Pips", "Reward Pips", "Result", "Pips", "Lot size", "PNL", "Balance", "Target", "Notes"];
        const rows = filteredTrades.map(trade => {
            const tradeIndex = trades.findIndex(t => t.id === trade.id);
            const runningPnl = trades.slice(0, tradeIndex + 1).reduce((acc, t) => acc + t.pnl, 0);
            const currentBalance = (backtest?.initial_capital || 0) + runningPnl;

            return [
                trade.trade_date,
                trade.day_of_week,
                trade.pair,
                trade.strategy,
                trade.risk_pips,
                trade.reward_pips,
                trade.result,
                trade.pip_result,
                trade.lot_size,
                trade.pnl,
                currentBalance,
                trade.target,
                `"${trade.note.replace(/"/g, '""')}"`
            ];
        });

        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${backtest?.name || "Backtest"}_Trades.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    const uniquePairs = Array.from(new Set(trades.map(t => t.pair).filter(Boolean))).sort();
    const uniqueStrategies = Array.from(new Set(trades.map(t => t.strategy).filter(Boolean))).sort();

    const statistics = [
        { label: "Win Rate", value: `${filteredStats.winRate}%`, icon: Target, color: "text-primary" },
        { label: "Total Trades", value: filteredStats.totalTrades, icon: BarChart3, color: "text-blue-500" },
        {
            label: "Initial Capital",
            value: `$${overallStats.initialCapital.toLocaleString()}`,
            icon: Database,
            color: "text-amber-500",
            action: (
                <div className="flex gap-1 ml-auto">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-amber-500/20 hover:text-amber-500">
                                <FileText className="w-3.5 h-3.5" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-0 bg-card border-border shadow-xl z-[100]" align="end">
                            <div className="p-3 border-b border-border bg-muted/30">
                                <h4 className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
                                    <History className="w-3 h-3" />
                                    Funding History
                                </h4>
                            </div>
                            <div className="max-h-60 overflow-y-auto">
                                {walletHistory.length === 0 ? (
                                    <div className="p-4 text-center text-xs text-muted-foreground italic">
                                        No funding history yet.
                                    </div>
                                ) : (
                                    walletHistory.map((h) => (
                                        <div key={h.id} className="p-3 border-b border-border last:border-0 flex items-center justify-between hover:bg-muted/20 transition-colors">
                                            <div className="flex flex-col">
                                                <span className={cn(
                                                    "text-[10px] font-bold uppercase px-1.5 py-0.5 rounded w-fit mb-1",
                                                    h.type === 'deposit' ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                                                )}>
                                                    {h.type}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground italic">
                                                    {new Date(h.created_at).toLocaleDateString()} {new Date(h.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <span className={cn(
                                                "font-mono font-medium",
                                                h.type === 'deposit' ? "text-success" : "text-destructive"
                                            )}>
                                                {h.type === 'deposit' ? "+" : "-"}${h.amount.toLocaleString()}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </PopoverContent>
                    </Popover>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 hover:bg-amber-500/20 hover:text-amber-500"
                        onClick={() => {
                            setWalletAction("deposit");
                            setWalletDialogOpen(true);
                        }}
                    >
                        <Wallet className="w-3.5 h-3.5" />
                    </Button>
                </div>
            )
        },
        { label: "Current Balance", value: `$${filteredStats.currentBalance.toLocaleString()}`, icon: TrendingUp, color: filteredStats.currentBalance >= filteredStats.initialCapital ? "text-success" : "text-destructive" },
        { label: "Net PNL", value: `$${filteredStats.totalPnl.toLocaleString()}`, icon: TrendingUp, color: filteredStats.totalPnl >= 0 ? "text-success" : "text-destructive" },
        { label: "Total Pips", value: `${filteredStats.totalPips}`, icon: Target, color: filteredStats.totalPips >= 0 ? "text-success" : "text-destructive" },
        { label: "Max Loss", value: `$${Math.abs(filteredStats.minPnl).toLocaleString()}`, icon: TrendingDown, color: "text-destructive" },
        { label: "Max Profit", value: `$${filteredStats.maxWin.toLocaleString()}`, icon: TrendingUp, color: filteredStats.maxWin >= 0 ? "text-success" : "text-destructive" },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate(sessionType === "future_trading" ? "/future-trading" : "/backtesting")}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">{backtest?.name || "Loading..."}</h1>
                        <p className="text-muted-foreground">{backtest?.strategy}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="gap-2">
                                <Download className="w-4 h-4" />
                                Export
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-card border-border shadow-xl">
                            <DropdownMenuItem onClick={exportToPDF} className="gap-2 cursor-pointer">
                                <FileText className="w-4 h-4" />
                                Download PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={exportToCSV} className="gap-2 cursor-pointer">
                                <FileText className="w-4 h-4" />
                                Download CSV
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2" onClick={() => resetForm()}>
                                <Plus className="w-4 h-4" />
                                Add Trade
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-card border-border">
                            <DialogHeader>
                                <DialogTitle>{editingTradeId ? 'Edit' : 'Add'} Backtest Trade</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium mb-1.5 block">Date</label>
                                        <Input type="date" value={form.trade_date} onChange={(e) => handleDateChange(e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium mb-1.5 block">Day</label>
                                        <Input value={form.day_of_week} readOnly className="bg-muted" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium mb-1.5 block">Pair</label>
                                        <Input value={form.pair} onChange={(e) => setForm(f => ({ ...f, pair: e.target.value.toUpperCase() }))} />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium mb-1.5 block">Strategy</label>
                                        <Input value={form.strategy} onChange={(e) => setForm(f => ({ ...f, strategy: e.target.value }))} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium mb-1.5 block">Risk (pips)</label>
                                        <Input type="number" value={form.risk_pips} onChange={(e) => setForm(f => ({ ...f, risk_pips: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium mb-1.5 block">Reward (pips)</label>
                                        <Input type="number" value={form.reward_pips} onChange={(e) => setForm(f => ({ ...f, reward_pips: e.target.value }))} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium mb-1.5 block">Result</label>
                                        <Select value={form.result} onValueChange={(v: "TP Hit" | "SL Hit" | "BE") => setForm(f => ({ ...f, result: v }))}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="TP Hit">TP Hit</SelectItem>
                                                <SelectItem value="SL Hit">SL Hit</SelectItem>
                                                <SelectItem value="BE">BE</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium mb-1.5 block">Target</label>
                                        <Input placeholder="1:1, 1:2 etc" value={form.target} onChange={(e) => setForm(f => ({ ...f, target: e.target.value }))} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium mb-1.5 block">Pip Result</label>
                                        <Input type="number" value={form.pip_result} onChange={(e) => setForm(f => ({ ...f, pip_result: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium mb-1.5 block">Lot Size</label>
                                        <Input type="number" value={form.lot_size} onChange={(e) => setForm(f => ({ ...f, lot_size: e.target.value }))} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium mb-1.5 block">PNL ($)</label>
                                        <Input type="number" value={form.pnl} onChange={(e) => setForm(f => ({ ...f, pnl: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium mb-1.5 block">Broker Cost ($)</label>
                                        <Input type="number" value={form.broker_cost} onChange={(e) => setForm(f => ({ ...f, broker_cost: e.target.value }))} />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-medium mb-1.5 block">Image</label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        ref={fileInputRef}
                                        className="hidden"
                                        onChange={handleImageSelect}
                                    />
                                    {imagePreview ? (
                                        <div className="relative inline-block">
                                            <img src={imagePreview} alt="Trade" className="max-h-40 rounded-md border border-border" />
                                            <button
                                                type="button"
                                                onClick={() => { setImageFile(null); setImagePreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                                                className="absolute -top-2 -right-2 text-destructive bg-card rounded-full"
                                            >
                                                <XCircle className="w-5 h-5" />
                                            </button>
                                        </div>
                                    ) : (
                                        <Button type="button" variant="outline" className="gap-2" onClick={() => fileInputRef.current?.click()}>
                                            <ImagePlus className="w-4 h-4" />
                                            Add Image
                                        </Button>
                                    )}
                                </div>

                                <div>
                                    <label className="text-sm font-medium mb-1.5 block">Notes</label>
                                    <Textarea value={form.note} onChange={(e) => setForm(f => ({ ...f, note: e.target.value }))} />
                                </div>

                                <Button className="w-full" onClick={handleSaveTrade} disabled={saving}>
                                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    {editingTradeId ? 'Update' : 'Save'} Trade
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {statistics.map((stat, i) => (
                    <div key={i} className="glass-card p-4">
                        <div className="flex items-center gap-3 mb-2">
                            <div className={cn("p-2 rounded-lg bg-muted/50", stat.color)}>
                                <stat.icon className="w-5 h-5" />
                            </div>
                            <span className="text-sm text-muted-foreground uppercase tracking-wider">{stat.label}</span>
                            {"action" in stat && stat.action}
                        </div>
                        <p className="stat-value">{stat.value}</p>
                    </div>
                ))}
            </div>

            <Dialog open={!!viewImageUrl} onOpenChange={(open) => !open && setViewImageUrl(null)}>
                <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto bg-card border-border p-0">
                    <div className="relative">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-2 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full"
                            onClick={() => setViewImageUrl(null)}
                        >
                            <X className="w-5 h-5" />
                        </Button>
                        {viewImageUrl && (
                            <img
                                src={viewImageUrl}
                                alt="Trade Screenshot"
                                className="w-full h-auto object-contain"
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={walletDialogOpen} onOpenChange={setWalletDialogOpen}>
                <DialogContent className="sm:max-w-[400px] bg-card border-border">
                    <DialogHeader>
                        <DialogTitle>Adjust Initial Capital</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="flex gap-2">
                            <Button
                                variant={walletAction === "deposit" ? "default" : "outline"}
                                className="flex-1"
                                onClick={() => setWalletAction("deposit")}
                            >
                                Deposit
                            </Button>
                            <Button
                                variant={walletAction === "withdraw" ? "default" : "outline"}
                                className="flex-1"
                                onClick={() => setWalletAction("withdraw")}
                            >
                                Withdraw
                            </Button>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1.5 block">Amount ($)</label>
                            <Input
                                type="number"
                                placeholder="0.00"
                                value={walletAmount}
                                onChange={(e) => setWalletAmount(e.target.value)}
                            />
                        </div>
                        <Button className="w-full" onClick={handleWalletAction} disabled={saving}>
                            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Confirm {walletAction.charAt(0).toUpperCase() + walletAction.slice(1)}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <div className="flex flex-wrap gap-4 items-end glass-card p-4">
                <div className="w-full md:w-48">
                    <label className="text-xs font-medium mb-1.5 block uppercase text-muted-foreground">Filter Pair</label>
                    <Select value={pairFilter} onValueChange={setPairFilter}>
                        <SelectTrigger><SelectValue placeholder="All Pairs" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Pairs</SelectItem>
                            {uniquePairs.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="w-full md:w-48">
                    <label className="text-xs font-medium mb-1.5 block uppercase text-muted-foreground">Filter Strategy</label>
                    <Select value={strategyFilter} onValueChange={setStrategyFilter}>
                        <SelectTrigger><SelectValue placeholder="All Strategies" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Strategies</SelectItem>
                            {uniqueStrategies.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="w-full md:w-48">
                    <label className="text-xs font-medium mb-1.5 block uppercase text-muted-foreground">Filter Result</label>
                    <Select value={resultFilter} onValueChange={setResultFilter}>
                        <SelectTrigger><SelectValue placeholder="All Results" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Results</SelectItem>
                            <SelectItem value="TP Hit">TP Hit</SelectItem>
                            <SelectItem value="SL Hit">SL Hit</SelectItem>
                            <SelectItem value="BE">BE</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="w-full md:w-36">
                    <label className="text-xs font-medium mb-1.5 block uppercase text-muted-foreground">From Date</label>
                    <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                </div>
                <div className="w-full md:w-36">
                    <label className="text-xs font-medium mb-1.5 block uppercase text-muted-foreground">To Date</label>
                    <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                </div>
                {(pairFilter !== "all" || strategyFilter !== "all" || resultFilter !== "all" || fromDate || toDate) && (
                    <Button variant="ghost" size="sm" onClick={() => {
                        setPairFilter("all");
                        setStrategyFilter("all");
                        setResultFilter("all");
                        setFromDate("");
                        setToDate("");
                    }} className="mb-1">
                        Clear Filters
                    </Button>
                )}
            </div>

            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 border-b border-border">
                            <tr>
                                <th className="px-4 py-3 font-medium">Date / Day</th>
                                <th className="px-4 py-3 font-medium">Pair</th>
                                <th className="px-4 py-3 font-medium">Strategy</th>
                                <th className="px-4 py-3 font-medium">Risk/Reward</th>
                                <th className="px-4 py-3 font-medium">Result</th>
                                <th className="px-4 py-3 font-medium">Pips</th>
                                <th className="px-4 py-3 font-medium">PNL</th>
                                <th className="px-4 py-3 font-medium">Balance</th>
                                <th className="px-4 py-3 font-medium">Lot</th>
                                <th className="px-4 py-3 font-medium">Target</th>
                                <th className="px-4 py-3 font-medium">Note</th>
                                <th className="px-4 py-3 font-medium text-center">Image</th>
                                <th className="px-4 py-3 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading ? (
                                <tr>
                                    <td colSpan={13} className="px-4 py-8 text-center">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                                    </td>
                                </tr>
                            ) : filteredTrades.length === 0 ? (
                                <tr>
                                    <td colSpan={13} className="px-4 py-8 text-center text-muted-foreground">
                                        No trades found for the selected filters.
                                    </td>
                                </tr>
                            ) : (
                                filteredTrades.map((trade, index) => {
                                    // Calculate running balance for the display relative to all trades
                                    const tradeIndex = trades.findIndex(t => t.id === trade.id);
                                    const runningPnl = trades.slice(0, tradeIndex + 1).reduce((acc, t) => acc + t.pnl, 0);
                                    const currentBalance = (backtest?.initial_capital || 0) + runningPnl;

                                    return (
                                        <tr key={trade.id} className="hover:bg-card/50 transition-colors">
                                            <td className="px-4 py-3">
                                                <div>{trade.trade_date}</div>
                                                <div className="text-xs text-muted-foreground">{trade.day_of_week}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-primary">{trade.pair}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-xs text-muted-foreground">{trade.strategy}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div>R: {trade.risk_pips}</div>
                                                <div>W: {trade.reward_pips}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={cn(
                                                    "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold",
                                                    trade.result === "TP Hit" ? "bg-success/10 text-success" :
                                                        trade.result === "SL Hit" ? "bg-destructive/10 text-destructive" :
                                                            "bg-muted text-muted-foreground"
                                                )}>
                                                    {trade.result === "TP Hit" && <Check className="w-3 h-3" />}
                                                    {trade.result === "SL Hit" && <X className="w-3 h-3" />}
                                                    {trade.result === "BE" && <Minus className="w-3 h-3" />}
                                                    {trade.result}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 font-mono">
                                                {trade.pip_result > 0 ? "+" : ""}{trade.pip_result}
                                            </td>
                                            <td className="px-4 py-3 font-mono text-center">
                                                <span className={trade.pnl >= 0 ? "text-success" : "text-destructive"}>
                                                    {trade.pnl >= 0 ? "+" : ""}${Math.abs(trade.pnl).toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 font-mono">
                                                <div className="font-medium">
                                                    ${currentBalance.toLocaleString()}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 font-mono">{trade.lot_size}</td>
                                            <td className="px-4 py-3">{trade.target}</td>
                                            <td className="px-4 py-3 text-muted-foreground text-xs max-w-[150px] truncate" title={trade.note}>{trade.note || "—"}</td>
                                            <td className="px-4 py-3 text-center">
                                                {trade.image_url ? (
                                                    <Button variant="ghost" size="icon" className="text-blue-400 hover:text-blue-500 hover:bg-blue-500/10" onClick={() => setViewImageUrl(trade.image_url)}>
                                                        <ImagePlus className="w-4 h-4" />
                                                    </Button>
                                                ) : (
                                                    <span className="text-muted-foreground text-xs italic">No Image</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button variant="ghost" size="icon" className="text-primary" onClick={() => handleEditClick(trade)}>
                                                        <Edit2 className="w-4 h-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteTrade(trade.id)}>
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div >
    );
}
