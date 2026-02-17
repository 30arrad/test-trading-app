import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    NotebookPen,
    Plus,
    Search,
    Loader2,
    Trash2,
    Edit2,
    Calendar,
    Pin
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Note {
    id: string;
    title: string;
    content: string;
    is_pinned: boolean | null;
    created_at: string;
    updated_at: string;
}

export default function Notes() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingNote, setEditingNote] = useState<Note | null>(null);

    const [form, setForm] = useState<{
        title: string;
        content: string;
        is_pinned: boolean | null;
    }>({
        title: "",
        content: "",
        is_pinned: false
    });

    useEffect(() => {
        if (user) fetchNotes();
    }, [user]);

    const fetchNotes = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("notes")
            .select("*")
            .order("is_pinned", { ascending: false })
            .order("updated_at", { ascending: false });

        if (error) {
            toast({ title: "Error loading notes", description: error.message, variant: "destructive" });
        } else {
            setNotes(data || []);
        }
        setLoading(false);
    };

    const handleSave = async () => {
        if (!user) return;
        if (!form.title.trim() || !form.content.trim()) {
            toast({ title: "Validation Error", description: "Title and content are required", variant: "destructive" });
            return;
        }
        setSaving(true);

        const payload = {
            user_id: user.id,
            title: form.title,
            content: form.content,
            is_pinned: form.is_pinned
        };

        if (editingNote) {
            const { error } = await supabase.from("notes").update(payload).eq("id", editingNote.id);
            if (error) {
                toast({ title: "Error updating note", description: error.message, variant: "destructive" });
            } else {
                toast({ title: "Note updated" });
                setIsDialogOpen(false);
                fetchNotes();
            }
        } else {
            const { error } = await supabase.from("notes").insert(payload);
            if (error) {
                toast({ title: "Error creating note", description: error.message, variant: "destructive" });
            } else {
                toast({ title: "Note created" });
                setIsDialogOpen(false);
                fetchNotes();
            }
        }
        setSaving(false);
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const { error } = await supabase.from("notes").delete().eq("id", id);
        if (error) {
            toast({ title: "Error deleting note", description: error.message, variant: "destructive" });
        } else {
            toast({ title: "Note deleted" });
            fetchNotes();
        }
    };

    const openEdit = (note: Note, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingNote(note);
        setForm({
            title: note.title,
            content: note.content,
            is_pinned: note.is_pinned
        });
        setIsDialogOpen(true);
    };

    const resetForm = () => {
        setEditingNote(null);
        setForm({ title: "", content: "", is_pinned: false });
    };

    const filteredNotes = notes.filter(note =>
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.content.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <NotebookPen className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Notes</h1>
                        <p className="text-muted-foreground">Capture your trading ideas and observations</p>
                    </div>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Plus className="w-4 h-4" />
                            New Note
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px] bg-card border-border">
                        <DialogHeader>
                            <DialogTitle>{editingNote ? "Edit Note" : "Create New Note"}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Title</label>
                                <Input
                                    placeholder="e.g. Weekly Market Outlook"
                                    value={form.title}
                                    onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Content</label>
                                <Textarea
                                    placeholder="Write your thoughts here..."
                                    className="min-h-[200px] resize-y"
                                    value={form.content}
                                    onChange={(e) => setForm(f => ({ ...f, content: e.target.value }))}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="pin-note"
                                    className="rounded border-gray-300 text-primary focus:ring-primary"
                                    checked={form.is_pinned || false}
                                    onChange={(e) => setForm(f => ({ ...f, is_pinned: e.target.checked }))}
                                />
                                <label htmlFor="pin-note" className="text-sm font-medium cursor-pointer flex items-center gap-1">
                                    <Pin className="w-3 h-3" /> Pin this note
                                </label>
                            </div>
                            <Button className="w-full" onClick={handleSave} disabled={saving}>
                                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                {editingNote ? "Update Note" : "Save Note"}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                    placeholder="Search notes..."
                    className="pl-10 bg-muted border-border"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Notes Grid */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : filteredNotes.length === 0 ? (
                <div className="text-center py-12 glass-card">
                    <div className="inline-flex p-4 rounded-full bg-muted mb-4">
                        <NotebookPen className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium mb-2">No notes yet</h3>
                    <p className="text-muted-foreground max-w-sm mx-auto mb-6">
                        Create your first note to start tracking your trading journey and ideas.
                    </p>
                    <Button onClick={() => setIsDialogOpen(true)}>Create Note</Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredNotes.map(note => (
                        <Card
                            key={note.id}
                            className={cn(
                                "glass-card border-none hover:bg-card/80 transition-all cursor-pointer group flex flex-col h-[280px]",
                                note.is_pinned && "border-l-4 border-l-primary"
                            )}
                            onClick={() => openEdit(note, { stopPropagation: () => { } } as any)}
                        >
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start gap-2">
                                    <CardTitle className="leading-tight line-clamp-2 text-lg">
                                        {note.title}
                                    </CardTitle>
                                    {note.is_pinned && <Pin className="w-4 h-4 text-primary shrink-0 rotate-45" />}
                                </div>
                                <CardDescription className="flex items-center gap-1 text-xs mt-1">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(note.updated_at).toLocaleDateString()}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col">
                                <p className="text-sm text-muted-foreground line-clamp-6 whitespace-pre-line flex-1">
                                    {note.content}
                                </p>
                                <div className="flex justify-end gap-2 mt-4 pt-2 border-t border-border/50 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button size="sm" variant="ghost" onClick={(e) => openEdit(note, e)}>
                                        <Edit2 className="w-4 h-4" />
                                    </Button>
                                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={(e) => handleDelete(note.id, e)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
