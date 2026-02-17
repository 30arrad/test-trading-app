import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Calculator,
    Shield,
    AlertTriangle,
    CheckCircle2,
    Info,
    Save,
    Loader2,
    DollarSign,
    Percent,
    TrendingDown,
    Target
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface RiskSettings {
    id: string;
    account_balance: number;
    risk_per_trade_percent: number;
    max_daily_loss_percent: number;
    max_drawdown_percent: number;
    risk_rules: string;
}

export default function RiskManagement() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState<RiskSettings | null>(null);

    // Calculator State
    const [calcBalance, setCalcBalance] = useState("");
    const [calcRiskPct, setCalcRiskPct] = useState("");
    const [calcStopLoss, setCalcStopLoss] = useState("");
    const [calcLotSize, setCalcLotSize] = useState<number | null>(null);
    const [calcRiskAmount, setCalcRiskAmount] = useState<number | null>(null);

    useEffect(() => {
        if (user) {
            fetchRiskSettings();
        }
    }, [user]);

    const fetchRiskSettings = async () => {
        setLoading(true);
        // Using any to avoid TS errors until types are updated
        const { data, error } = await (supabase.from("risk_settings") as any)
            .select("*")
            .eq("user_id", user?.id)
            .single();

        if (error && error.code !== "PGRST116") { // PGRST116 is "No rows found"
            toast({ title: "Error loading risk settings", description: error.message, variant: "destructive" });
        } else if (data) {
            setSettings(data);
            setCalcBalance(data.account_balance.toString());
            setCalcRiskPct(data.risk_per_trade_percent.toString());
        } else {
            // Initialize defaults if no settings found
            const defaultSettings = {
                account_balance: 1000,
                risk_per_trade_percent: 1,
                max_daily_loss_percent: 3,
                max_drawdown_percent: 10,
                risk_rules: ""
            };
            setCalcBalance("1000");
            setCalcRiskPct("1");
        }
        setLoading(false);
    };

    const handleSaveSettings = async () => {
        if (!user) return;
        setSaving(true);

        const payload = {
            user_id: user.id,
            account_balance: parseFloat(calcBalance) || 0,
            risk_per_trade_percent: parseFloat(calcRiskPct) || 0,
            max_daily_loss_percent: settings?.max_daily_loss_percent || 3,
            max_drawdown_percent: settings?.max_drawdown_percent || 10,
            risk_rules: settings?.risk_rules || "",
        };

        let result;
        if (settings?.id) {
            result = await (supabase.from("risk_settings") as any).update(payload).eq("id", settings.id);
        } else {
            result = await (supabase.from("risk_settings") as any).insert(payload);
        }

        const { error } = result;
        if (error) {
            toast({ title: "Error saving settings", description: error.message, variant: "destructive" });
        } else {
            toast({ title: "Risk settings saved" });
            fetchRiskSettings();
        }
        setSaving(false);
    };

    const calculatePositionSize = () => {
        const balance = parseFloat(calcBalance);
        const riskPct = parseFloat(calcRiskPct);
        const stopLoss = parseFloat(calcStopLoss);

        if (isNaN(balance) || isNaN(riskPct) || isNaN(stopLoss) || stopLoss <= 0) {
            setCalcLotSize(null);
            setCalcRiskAmount(null);
            return;
        }

        const riskAmount = (balance * riskPct) / 100;
        // Basic lot size calculation: Risk Amount / (Stop Loss * 10) for standard lots on many pairs
        // Note: This is a generalization and should be adjusted for specific asset types (Forex, Gold, Crypro)
        const lotSize = riskAmount / (stopLoss * 10);

        setCalcRiskAmount(riskAmount);
        setCalcLotSize(Math.round(lotSize * 100) / 100);
    };

    useEffect(() => {
        calculatePositionSize();
    }, [calcBalance, calcRiskPct, calcStopLoss]);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10 text-primary">
                    <Shield className="w-8 h-8" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold">Risk Management</h1>
                    <p className="text-muted-foreground">Define your risk parameters and calculate position sizes</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Position Size Calculator */}
                <Card className="lg:col-span-2 glass-card border-none overflow-hidden">
                    <CardHeader className="bg-primary/5 border-b border-border/50">
                        <div className="flex items-center gap-2">
                            <Calculator className="w-5 h-5 text-primary" />
                            <CardTitle>Position Size Calculator</CardTitle>
                        </div>
                        <CardDescription>Calculate exactly how much to trade based on your risk tolerance</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium flex items-center gap-2">
                                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                                        Account Balance ($)
                                    </label>
                                    <Input
                                        type="number"
                                        placeholder="1000"
                                        value={calcBalance}
                                        onChange={(e) => setCalcBalance(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium flex items-center gap-2">
                                        <Percent className="w-4 h-4 text-muted-foreground" />
                                        Risk per Trade (%)
                                    </label>
                                    <Input
                                        type="number"
                                        placeholder="1"
                                        value={calcRiskPct}
                                        onChange={(e) => setCalcRiskPct(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium flex items-center gap-2">
                                        <Target className="w-4 h-4 text-muted-foreground" />
                                        Stop Loss (Pips/Points)
                                    </label>
                                    <Input
                                        type="number"
                                        placeholder="20"
                                        value={calcStopLoss}
                                        onChange={(e) => setCalcStopLoss(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col justify-center items-center p-6 rounded-2xl bg-muted/30 border border-border/50">
                                <div className="text-center space-y-6 w-full">
                                    <div>
                                        <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Risk Amount</p>
                                        <p className="text-4xl font-bold text-destructive">
                                            {calcRiskAmount !== null ? `$${calcRiskAmount.toLocaleString()}` : "—"}
                                        </p>
                                    </div>
                                    <div className="h-px bg-border w-1/2 mx-auto" />
                                    <div>
                                        <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Recommended Lot Size</p>
                                        <p className="text-5xl font-bold text-primary">
                                            {calcLotSize !== null ? calcLotSize : "—"}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-2 italic">*Approximate based on 10$/pip/lot*</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Risk Settings Summary */}
                <div className="space-y-6">
                    <Card className="glass-card border-none">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-amber-500" />
                                Risk Limits
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="p-3 rounded-lg bg-muted/50 flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Max Daily Loss</span>
                                <span className="font-bold text-destructive">{settings?.max_daily_loss_percent || 3}%</span>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/50 flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Max Drawdown</span>
                                <span className="font-bold text-destructive">{settings?.max_drawdown_percent || 10}%</span>
                            </div>
                            <Button className="w-full gap-2" variant="outline" onClick={handleSaveSettings} disabled={saving}>
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Sync Balance & Risk
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="glass-card border-none bg-primary/5">
                        <CardContent className="p-6">
                            <div className="flex gap-3">
                                <Info className="w-5 h-5 text-primary shrink-0" />
                                <div className="space-y-2">
                                    <p className="text-sm font-semibold">Risk Tip</p>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        Never risk more than you can afford to lose. Consecutive losses are a part of trading;
                                        proper position sizing ensures you survive them.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Risk Rules */}
            <Card className="glass-card border-none">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-success" />
                            <CardTitle>Trading Commandments</CardTitle>
                        </div>
                    </div>
                    <CardDescription>Document your hard rules to prevent emotional trading</CardDescription>
                </CardHeader>
                <CardContent>
                    <Textarea
                        placeholder="1. No trading after 2 losses in a day.&#10;2. Never move Stop Loss into further loss.&#10;3. Exit 50% at 1:2 RR."
                        className="min-h-[200px] bg-muted/30 border-border/50 text-md leading-relaxed"
                        value={settings?.risk_rules || ""}
                        onChange={(e) => setSettings(s => s ? { ...s, risk_rules: e.target.value } : null)}
                    />
                    <div className="mt-4 flex justify-end">
                        <Button className="gap-2" onClick={handleSaveSettings} disabled={saving}>
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save Risk Rules
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
