import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Send, MoreVertical, Search, Paperclip, Smile, Mic, Phone, Video } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
    id: string;
    content: string;
    created_at: string;
    user_id: string;
    profiles?: {
        display_name: string | null;
        avatar_url: string | null;
    };
}

export default function Community() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (user) {
            fetchMessages();
            const channel = supabase
                .channel('schema-db-changes')
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'messages'
                    },
                    (payload) => {
                        handleNewMessage(payload.new as Message);
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [user]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const fetchMessages = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("messages")
            .select(`
                *,
                profiles:user_id (
                    display_name,
                    avatar_url
                )
            `)
            .order("created_at", { ascending: true });

        if (error) {
            toast({ title: "Error loading messages", description: error.message, variant: "destructive" });
        } else {
            setMessages(data as any as Message[]);
        }
        setLoading(false);
    };

    const handleNewMessage = async (msg: Message) => {
        const { data: profile } = await supabase
            .from("profiles")
            .select("display_name, avatar_url")
            .eq("user_id", msg.user_id)
            .single();

        const messageWithProfile = {
            ...msg,
            profiles: profile || { display_name: "Unknown", avatar_url: null }
        };

        setMessages((prev) => [...prev, messageWithProfile as Message]);
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user) return;

        setSending(true);
        const { error } = await supabase.from("messages").insert({
            content: newMessage,
            user_id: user.id
        });

        if (error) {
            toast({ title: "Error sending message", description: error.message, variant: "destructive" });
        } else {
            setNewMessage("");
        }
        setSending(false);
    };

    return (
        <div className="flex h-[calc(100vh-6rem)] bg-[#0b141a] overflow-hidden rounded-xl shadow-2xl border border-white/5">
            {/* Left Sidebar (Simulated) */}
            <div className="w-[30%] hidden md:flex flex-col border-r border-white/10 bg-[#111b21]">
                <div className="h-16 bg-[#202c33] flex items-center justify-between px-4 border-b border-white/10">
                    <div className="w-10 h-10 rounded-full bg-slate-400/20 flex items-center justify-center overflow-hidden">
                        {user?.email?.[0].toUpperCase()}
                    </div>
                    <div className="flex gap-4 text-[#aebac1]">
                        <button><MoreVertical className="w-5 h-5" /></button>
                    </div>
                </div>
                {/* Search Bar */}
                <div className="p-2 border-b border-white/10">
                    <div className="bg-[#202c33] rounded-lg h-9 flex items-center px-4 gap-4">
                        <Search className="w-4 h-4 text-[#aebac1]" />
                        <Input
                            placeholder="Search or start new chat"
                            className="border-none bg-transparent h-full p-0 text-[#d1d7db] placeholder:text-[#aebac1] focus-visible:ring-0"
                        />
                    </div>
                </div>
                {/* Chat List */}
                <div className="flex-1 overflow-y-auto">
                    <div className="h-16 bg-[#2a3942] flex items-center px-3 hover:bg-[#202c33] cursor-pointer transition-colors border-b border-white/5">
                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mr-3">
                            <span className="font-bold text-primary">A30</span>
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-baseline mb-1">
                                <span className="text-[#e9edef] font-medium">A30 Community</span>
                                <span className="text-xs text-[#8696a0]">12:57</span>
                            </div>
                            <div className="text-sm text-[#8696a0] truncate">
                                {messages.length > 0 ? messages[messages.length - 1].content : "Welcome to the community!"}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col bg-[#0b141a] relative">
                {/* Chat Header */}
                <div className="h-16 bg-[#202c33] flex items-center justify-between px-4 z-10 shadow-sm">
                    <div className="flex items-center gap-4 cursor-pointer">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                            <span className="font-bold text-primary">A30</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[#e9edef] font-medium">A30 Community</span>
                            <span className="text-xs text-[#8696a0]">tap here for group info</span>
                        </div>
                    </div>
                    <div className="flex gap-6 text-[#aebac1]">
                        <button><Video className="w-5 h-5" /></button>
                        <button><Phone className="w-5 h-5" /></button>
                        <div className="border-l border-white/10 h-6"></div>
                        <button><Search className="w-5 h-5" /></button>
                        <button><MoreVertical className="w-5 h-5" /></button>
                    </div>
                </div>

                {/* Messages Area */}
                <div
                    className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-1 relative"
                    style={{
                        backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')",
                        backgroundRepeat: "repeat",
                        backgroundSize: "400px",
                        backgroundBlendMode: "overlay"
                    }}
                >
                    <div className="absolute inset-0 bg-[#0b141a]/95 pointer-events-none"></div>

                    {messages.map((msg, i) => {
                        const isMe = msg.user_id === user?.id;
                        const showAvatar = i === 0 || messages[i - 1].user_id !== msg.user_id;

                        return (
                            <div
                                key={msg.id}
                                className={cn(
                                    "flex gap-1 max-w-[65%] mb-1 relative z-10 group",
                                    isMe ? "ml-auto flex-row-reverse" : ""
                                )}
                            >
                                <div
                                    className={cn(
                                        "p-2 px-3 rounded-lg shadow-sm text-sm break-words relative",
                                        isMe
                                            ? "bg-[#005c4b] text-[#e9edef] rounded-tr-none"
                                            : "bg-[#202c33] text-[#e9edef] rounded-tl-none"
                                    )}
                                >
                                    {!isMe && showAvatar && (
                                        <div className="text-[#53bdeb] text-xs font-bold mb-1 hover:underline cursor-pointer">
                                            {msg.profiles?.display_name || "Unknown"}
                                        </div>
                                    )}
                                    {msg.content}
                                    <div className="flex justify-end items-center gap-1 mt-1 -mb-1">
                                        <span className="text-[10px] text-[#ffffff99] min-w-[35px] text-right">
                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="min-h-[60px] bg-[#202c33] px-4 py-2 flex items-center gap-3 z-10">
                    <div className="flex gap-4 text-[#8696a0]">
                        <button><Smile className="w-6 h-6 hover:text-[#aebac1]" /></button>
                        <button><Paperclip className="w-6 h-6 hover:text-[#aebac1]" /></button>
                    </div>
                    <form onSubmit={handleSend} className="flex-1 flex gap-2">
                        <Input
                            className="bg-[#2a3942] border-none text-[#d1d7db] placeholder:text-[#8696a0] focus-visible:ring-0 h-10 px-4 rounded-lg text-sm"
                            placeholder="Type a message"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                        />
                        {newMessage.trim() ? (
                            <button type="submit" className="p-2 rounded-full bg-[#00a884] hover:bg-[#008f72] text-white transition-all">
                                <Send className="w-5 h-5 pl-0.5" />
                            </button>
                        ) : (
                            <button type="button" className="p-2 text-[#8696a0] hover:text-[#aebac1]">
                                <Mic className="w-6 h-6" />
                            </button>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
}
