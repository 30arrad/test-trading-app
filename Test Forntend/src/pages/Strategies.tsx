import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Loader2, Trash2, Edit2, ImagePlus, XCircle, BookOpen, LineChart, Target, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Strategy {
    id: string;
    name: string;
    description: string | null;
    rules: string | null;
    image_url: string | null;
    created_at: string;
}

export default function Strategies() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [strategies, setStrategies] = useState<Strategy[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingStrategyId, setEditingStrategyId] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [viewingStrategy, setViewingStrategy] = useState<Strategy | null>(null);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [form, setForm] = useState({
        name: "",
        description: "",
        rules: "",
    });

    useEffect(() => {
        if (user) {
            fetchStrategies();
        }
    }, [user]);

    const fetchStrategies = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("strategies")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            toast({ title: "Error loading strategies", description: error.message, variant: "destructive" });
        } else {
            setStrategies(data || []);
        }
        setLoading(false);
    };

    const resetForm = () => {
        setForm({
            name: "",
            description: "",
            rules: "",
        });
        setEditingStrategyId(null);
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
        const path = `${user.id}/strategies/${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from('trade-images').upload(path, imageFile);
        setUploadingImage(false);
        if (error) {
            toast({ title: "Image upload failed", description: error.message, variant: "destructive" });
            return null;
        }
        const { data: urlData } = supabase.storage.from('trade-images').getPublicUrl(path);
        return urlData.publicUrl;
    };

    const handleEditClick = (strategy: Strategy, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setForm({
            name: strategy.name,
            description: strategy.description || "",
            rules: strategy.rules || "",
        });
        setEditingStrategyId(strategy.id);
        setImageFile(null);
        setImagePreview(strategy.image_url || null);
        setIsDialogOpen(true);
    };

    const handleViewClick = (strategy: Strategy) => {
        setViewingStrategy(strategy);
        setIsViewDialogOpen(true);
    };

    const handleSaveStrategy = async () => {
        if (!user) return;
        if (!form.name) {
            toast({ title: "Name is required", variant: "destructive" });
            return;
        }
        setSaving(true);

        let imageUrl: string | null = imagePreview && !imageFile ? imagePreview : null;
        if (imageFile) {
            imageUrl = await uploadImage();
        }

        const dbPayload = {
            user_id: user.id,
            name: form.name,
            description: form.description,
            rules: form.rules,
            image_url: imageUrl,
        };

        let result;
        if (editingStrategyId) {
            result = await supabase.from("strategies").update(dbPayload).eq("id", editingStrategyId);
        } else {
            result = await supabase.from("strategies").insert(dbPayload);
        }

        const { error } = result;
        if (error) {
            toast({ title: `Error ${editingStrategyId ? 'updating' : 'saving'} strategy`, description: error.message, variant: "destructive" });
        } else {
            toast({ title: `Strategy ${editingStrategyId ? 'updated' : 'saved'}` });
            fetchStrategies();
            setIsDialogOpen(false);
            resetForm();
        }
        setSaving(false);
    };

    const handleDeleteStrategy = async (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        const { error } = await supabase.from("strategies").delete().eq("id", id);
        if (error) {
            toast({ title: "Error deleting strategy", description: error.message, variant: "destructive" });
        } else {
            toast({ title: "Strategy deleted" });
            fetchStrategies();
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">My Strategies</h1>
                    <p className="text-muted-foreground">Document and manage your trading strategies</p>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2" onClick={() => resetForm()}>
                            <Plus className="w-4 h-4" />
                            Add Strategy
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-card border-border">
                        <DialogHeader>
                            <DialogTitle>{editingStrategyId ? 'Edit' : 'Add'} Strategy</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div>
                                <label className="text-sm font-medium mb-1.5 block">Name</label>
                                <Input
                                    placeholder="Strategy Name (e.g., SMC, ICT, Trend Following)"
                                    value={form.name}
                                    onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-1.5 block">Description</label>
                                <Textarea
                                    placeholder="General overview of the strategy..."
                                    value={form.description}
                                    onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-1.5 block">Rules</label>
                                <Textarea
                                    placeholder="Step-by-step rules for entry and exit..."
                                    className="min-h-[150px]"
                                    value={form.rules}
                                    onChange={(e) => setForm(f => ({ ...f, rules: e.target.value }))}
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium mb-1.5 block">Strategy Image</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    ref={fileInputRef}
                                    className="hidden"
                                    onChange={handleImageSelect}
                                />
                                {imagePreview ? (
                                    <div className="relative inline-block w-full">
                                        <img src={imagePreview} alt="Strategy" className="w-full max-h-60 object-cover rounded-md border border-border" />
                                        <button
                                            type="button"
                                            onClick={() => { setImageFile(null); setImagePreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                                            className="absolute -top-2 -right-2 text-destructive bg-card rounded-full p-0.5 shadow-lg"
                                        >
                                            <XCircle className="w-5 h-5" />
                                        </button>
                                    </div>
                                ) : (
                                    <Button type="button" variant="outline" className="w-full h-32 border-dashed gap-2 flex flex-col" onClick={() => fileInputRef.current?.click()}>
                                        <ImagePlus className="w-8 h-8 text-muted-foreground" />
                                        <span className="text-sm text-muted-foreground">Upload strategy visual or chart</span>
                                    </Button>
                                )}
                            </div>

                            <Button className="w-full" onClick={handleSaveStrategy} disabled={saving}>
                                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                {editingStrategyId ? 'Update' : 'Save'} Strategy
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

                <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                    <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-card border-border p-0 gap-0">
                        {viewingStrategy && (
                            <div className="flex flex-col">
                                <div className="relative h-64 sm:h-80 bg-muted">
                                    {viewingStrategy.image_url ? (
                                        <img src={viewingStrategy.image_url} alt={viewingStrategy.name} className="w-full h-full object-contain bg-muted" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-blue-500/10">
                                            <LineChart className="w-16 h-16 text-primary/40" />
                                        </div>
                                    )}
                                    <DialogHeader className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background to-transparent">
                                        <DialogTitle className="text-2xl font-bold">{viewingStrategy.name}</DialogTitle>
                                    </DialogHeader>
                                </div>

                                <div className="p-6 space-y-6">
                                    {viewingStrategy.description && (
                                        <div>
                                            <h4 className="text-sm font-semibold uppercase tracking-wider text-primary mb-2 flex items-center gap-2">
                                                <Info className="w-4 h-4" /> Description
                                            </h4>
                                            <p className="text-muted-foreground whitespace-pre-wrap">{viewingStrategy.description}</p>
                                        </div>
                                    )}

                                    {viewingStrategy.rules && (
                                        <div>
                                            <h4 className="text-sm font-semibold uppercase tracking-wider text-primary mb-2 flex items-center gap-2">
                                                <BookOpen className="w-4 h-4" /> Strategy Rules
                                            </h4>
                                            <div className="bg-muted/30 rounded-lg p-4 border border-border">
                                                <p className="text-foreground whitespace-pre-wrap font-mono text-sm leading-relaxed">
                                                    {viewingStrategy.rules}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between pt-4 border-t border-border mt-4">
                                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                            <div className="flex items-center gap-1">
                                                <Target className="w-3 h-3" />
                                                <span>{viewingStrategy.name}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Info className="w-3 h-3" />
                                                <span>Created {new Date(viewingStrategy.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm" onClick={() => { setIsViewDialogOpen(false); handleEditClick(viewingStrategy); }}>
                                                <Edit2 className="w-4 h-4 mr-2" /> Edit
                                            </Button>
                                            <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => { setIsViewDialogOpen(false); handleDeleteStrategy(viewingStrategy.id); }}>
                                                <Trash2 className="w-4 h-4 mr-2" /> Delete
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                    <p className="mt-4 text-muted-foreground">Loading strategies...</p>
                </div>
            ) : strategies.length === 0 ? (
                <div className="text-center py-20 glass-card">
                    <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h2 className="text-xl font-semibold mb-2">No strategies found</h2>
                    <p className="text-muted-foreground mb-6">Start by documenting your first trading strategy.</p>
                    <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
                        <Plus className="w-4 h-4" />
                        Create Strategy
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {strategies.map((strategy) => (
                        <div
                            key={strategy.id}
                            className="glass-card overflow-hidden flex flex-col group transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 cursor-pointer"
                            onClick={() => handleViewClick(strategy)}
                        >
                            <div className="relative h-48 overflow-hidden bg-muted">
                                {strategy.image_url ? (
                                    <img src={strategy.image_url} alt={strategy.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-blue-500/10">
                                        <LineChart className="w-12 h-12 text-primary/40" />
                                    </div>
                                )}
                                <div className="absolute top-2 right-2 flex gap-1 opacity-100 transition-all duration-300">
                                    <Button
                                        variant="secondary"
                                        size="icon"
                                        className="h-8 w-8 bg-card/80 backdrop-blur-sm hover:bg-primary hover:text-primary-foreground"
                                        onClick={(e) => handleEditClick(strategy, e)}
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="icon"
                                        className="h-8 w-8 bg-destructive/80 backdrop-blur-sm hover:bg-destructive"
                                        onClick={(e) => handleDeleteStrategy(strategy.id, e)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                            <div className="p-5 flex-1 flex flex-col">
                                <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">{strategy.name}</h3>
                                {strategy.description && (
                                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                                        {strategy.description}
                                    </p>
                                )}
                                <div className="mt-auto pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground font-mono">
                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-muted/50 rounded-md">
                                        <Target className="w-3 h-3 text-primary" />
                                        <span className="uppercase tracking-tight">Strategy</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Info className="w-3 h-3" />
                                        <span>{new Date(strategy.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
