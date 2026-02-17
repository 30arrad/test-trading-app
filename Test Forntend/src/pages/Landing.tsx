import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { TrendingUp, BarChart3, FlaskConical, BookOpen, ArrowRight, CheckCircle2, Globe, Shield, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Landing() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 backdrop-blur-md bg-background/60 border-b border-border/40">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <span className="font-bold text-xl tracking-tight">A30 ScalpingPro</span>
                </div>
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => navigate("/auth")} className="text-muted-foreground hover:text-foreground">
                        Sign In
                    </Button>
                    <Button onClick={() => navigate("/auth")} className="shadow-lg shadow-primary/20">
                        Get Started
                    </Button>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 px-6 lg:pt-48 lg:pb-32 overflow-hidden">
                {/* Background Elements */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 opacity-30 pointer-events-none">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px]" />
                    <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-blue-500/10 rounded-full blur-[100px]" />
                </div>

                <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12">
                    <div className="flex-1 text-center lg:text-left animate-slide-up">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-6">
                            <Zap className="w-3 h-3" />
                            <span>Next Generation Trading Journal</span>
                        </div>
                        <h1 className="text-5xl lg:text-7xl font-bold tracking-tight mb-6 leading-[1.1]">
                            Master Your Trading <span className="text-primary italic">Journey</span>
                        </h1>
                        <p className="text-lg lg:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                            Track, analyze, and optimize your trades with our premium journaling suite. Built for professional traders who demand excellence.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                            <Button size="lg" onClick={() => navigate("/auth")} className="h-14 px-8 text-lg gap-2 group shadow-xl shadow-primary/20">
                                Start Journaling Now
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </Button>
                            <Button size="lg" variant="outline" onClick={() => {
                                const features = document.getElementById('features');
                                features?.scrollIntoView({ behavior: 'smooth' });
                            }} className="h-14 px-8 text-lg border-border/60 hover:bg-muted/50">
                                Explore Features
                            </Button>
                        </div>

                        <div className="mt-12 flex items-center justify-center lg:justify-start gap-8 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
                            <div className="flex items-center gap-2">
                                <Shield className="w-5 h-5 text-muted-foreground" />
                                <span className="text-sm font-medium">Bank-Grade Security</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Globe className="w-5 h-5 text-muted-foreground" />
                                <span className="text-sm font-medium">Global Markets</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 w-full max-w-[600px] animate-fade-in delay-200">
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-primary to-blue-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                            <div className="relative glass-card aspect-[4/3] overflow-hidden border-border/40 bg-card/60 backdrop-blur-2xl">
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent"></div>
                                {/* Simulated App UI */}
                                <div className="p-6 h-full flex flex-col gap-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex gap-1.5">
                                            <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
                                            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50"></div>
                                            <div className="w-2.5 h-2.5 rounded-full bg-green-500/50"></div>
                                        </div>
                                        <div className="h-4 w-32 bg-muted/40 rounded-full"></div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="h-24 bg-muted/30 rounded-xl border border-border/40 p-3">
                                            <div className="h-2 w-10 bg-primary/40 rounded mb-2"></div>
                                            <div className="h-4 w-16 bg-foreground/10 rounded"></div>
                                        </div>
                                        <div className="h-24 bg-muted/30 rounded-xl border border-border/40 p-3">
                                            <div className="h-2 w-10 bg-success/40 rounded mb-2"></div>
                                            <div className="h-4 w-16 bg-foreground/10 rounded"></div>
                                        </div>
                                        <div className="h-24 bg-muted/30 rounded-xl border border-border/40 p-3">
                                            <div className="h-2 w-10 bg-destructive/40 rounded mb-2"></div>
                                            <div className="h-4 w-16 bg-foreground/10 rounded"></div>
                                        </div>
                                    </div>
                                    <div className="flex-1 bg-muted/20 rounded-xl border border-border/40 p-4">
                                        <div className="flex flex-col gap-3">
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-muted/40"></div>
                                                        <div className="h-3 w-20 bg-muted/60 rounded"></div>
                                                    </div>
                                                    <div className="h-3 w-12 bg-success/40 rounded"></div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-24 px-6 bg-muted/30 relative overflow-hidden">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-20 animate-slide-up">
                        <h2 className="text-3xl lg:text-5xl font-bold mb-6">Built for Professionals</h2>
                        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                            Everything you need to transform your trading data into actionable insights.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: BookOpen,
                                title: "Precision Journaling",
                                description: "Log every detail of your trades, from entry reasons to emotional states. Support for images and multiple categories."
                            },
                            {
                                icon: FlaskConical,
                                title: "Advanced Backtesting",
                                description: "Test your strategies against historical data. Build confidence with detailed performance simulations."
                            },
                            {
                                icon: BarChart3,
                                title: "Deep Analytics",
                                description: "Visualize your performance with equity curves, drawdown analysis, and strategy comparisons."
                            }
                        ].map((feature, i) => (
                            <div key={i} className="glass-card p-10 hover:border-primary/40 transition-all duration-300 group">
                                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500">
                                    <feature.icon className="w-7 h-7 text-primary" />
                                </div>
                                <h3 className="text-2xl font-semibold mb-4">{feature.title}</h3>
                                <p className="text-muted-foreground leading-relaxed">
                                    {feature.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Trust Section */}
            <section className="py-24 px-6 relative">
                <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-20">
                    <div className="flex-1">
                        <h2 className="text-3xl lg:text-4xl font-bold mb-8 leading-tight">Data Integrity You Can <span className="text-primary italic">Trust</span></h2>
                        <div className="space-y-6">
                            {[
                                "Real-time data synchronization across all devices",
                                "Advanced encryption for protected trade logs",
                                "Seamless export of your data to multiple formats",
                                "Built on modern, scalable platform architecture"
                            ].map((text, i) => (
                                <div key={i} className="flex items-center gap-4">
                                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-success/20 flex items-center justify-center">
                                        <CheckCircle2 className="w-4 h-4 text-success" />
                                    </div>
                                    <span className="text-lg font-medium text-muted-foreground/90">{text}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex-1 w-full">
                        <div className="glass-card p-4 aspect-video flex flex-center justify-center relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent opacity-40"></div>
                            <BarChart3 className="w-32 h-32 text-primary/20 absolute bottom-[-10px] right-[-10px] rotate-[-15deg] group-hover:translate-x-4 transition-transform duration-1000" />
                            <div className="relative z-10 flex flex-col items-center justify-center">
                                <div className="text-6xl font-bold text-primary mb-2">99.9%</div>
                                <div className="text-xl text-muted-foreground font-medium">Uptime Guarantee</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-32 px-6">
                <div className="max-w-4xl mx-auto rounded-3xl p-12 lg:p-20 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-blue-500/10 to-transparent -z-10"></div>
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/20 rounded-full blur-[80px]"></div>

                    <div className="text-center relative z-10">
                        <h2 className="text-4xl lg:text-5xl font-bold mb-8 leading-tight">Ready to elevate your <span className="text-primary italic">Trading</span>?</h2>
                        <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
                            Join professional traders who use A30 ScalpingPro to gain a competitive edge in the markets.
                        </p>
                        <Button size="lg" onClick={() => navigate("/auth")} className="h-16 px-12 text-xl gap-2 font-semibold shadow-2xl shadow-primary/30">
                            Get Started for Free
                            <ArrowRight className="w-6 h-6" />
                        </Button>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 px-6 border-t border-border/40 bg-muted/10">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
                            <TrendingUp className="w-4 h-4 text-primary-foreground" />
                        </div>
                        <span className="font-bold text-lg">A30 ScalpingPro</span>
                    </div>
                    <p className="text-muted-foreground text-sm">
                        © 2026 A30 ScalpingPro. Master your trading.
                    </p>
                    <div className="flex gap-6 text-sm text-muted-foreground">
                        <a href="#" className="hover:text-primary transition-colors">Privacy</a>
                        <a href="#" className="hover:text-primary transition-colors">Terms</a>
                        <a href="#" className="hover:text-primary transition-colors">Support</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
