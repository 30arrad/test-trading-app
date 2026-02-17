import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { User, Bell, Shield, Database, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Profile {
  id: string;
  display_name: string | null;
  email?: string; // Not in DB profile, but useful for display
  timezone: string | null;
  notifications: {
    daily_pnl: boolean;
    trade_alerts: boolean;
    weekly_reports: boolean;
    backtest_complete: boolean;
  } | null;
}

const defaultNotifications = {
  daily_pnl: true,
  trade_alerts: true,
  weekly_reports: true,
  backtest_complete: true,
};

export default function Settings() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error) throw error;

        // Ensure notifications object has all keys
        const rawNotifications = (data as Record<string, any>).notifications;
        const notifications = rawNotifications
          ? { ...defaultNotifications, ...(rawNotifications as object) }
          : defaultNotifications;

        setProfile({
          id: data.id,
          display_name: data.display_name,
          timezone: (data as Record<string, any>).timezone,
          email: user.email,
          notifications,
        });
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [user]);

  const handleUpdateProfile = async () => {
    if (!user || !profile) return;
    setSaving(true);

    try {
      const updateData: Record<string, string | null> = {
        display_name: profile.display_name,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', user.id);

      if (error) throw error;
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleNotificationChange = (key: keyof typeof defaultNotifications, value: boolean) => {
    if (!profile || !profile.notifications) return;
    setProfile({
      ...profile,
      notifications: {
        ...profile.notifications,
        [key]: value
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl pb-20">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and preferences</p>
      </div>

      {/* Profile Section */}
      <div className="glass-card p-6 animate-fade-in">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-primary/10">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Profile</h3>
            <p className="text-sm text-muted-foreground">Your personal information</p>
          </div>
        </div>

        <div className="grid gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Display Name</label>
            <Input
              value={profile?.display_name || ''}
              onChange={(e) => setProfile(prev => prev ? ({ ...prev, display_name: e.target.value }) : null)}
              className="bg-muted border-border"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Email</label>
            <Input value={profile?.email || ''} disabled className="bg-muted border-border opacity-70" />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Timezone</label>
            <Input
              value={profile?.timezone || ''}
              onChange={(e) => setProfile(prev => prev ? ({ ...prev, timezone: e.target.value }) : null)}
              placeholder="e.g. America/New_York"
              className="bg-muted border-border"
            />
          </div>
          <Button onClick={handleUpdateProfile} disabled={saving} className="w-fit">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Notifications Section */}
      <div className="glass-card p-6 animate-fade-in">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-primary/10">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Notifications</h3>
            <p className="text-sm text-muted-foreground">Manage your notification preferences</p>
          </div>
        </div>

        <div className="space-y-4">
          {[
            { key: 'daily_pnl', label: "Daily P&L Summary", description: "Get a summary of your daily performance" },
            { key: 'trade_alerts', label: "Trade Alerts", description: "Notifications when trades are executed" },
            { key: 'weekly_reports', label: "Weekly Reports", description: "Receive weekly performance reports" },
            { key: 'backtest_complete', label: "Backtest Complete", description: "Notify when backtests finish running" },
          ].map((setting) => (
            <div key={setting.key} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
              <div>
                <p className="font-medium">{setting.label}</p>
                <p className="text-sm text-muted-foreground">{setting.description}</p>
              </div>
              <Switch
                checked={profile?.notifications?.[setting.key as keyof typeof defaultNotifications] ?? false}
                onCheckedChange={(checked) => handleNotificationChange(setting.key as keyof typeof defaultNotifications, checked)}
              />
            </div>
          ))}
          <Button onClick={handleUpdateProfile} disabled={saving} variant="outline" className="w-fit mt-4">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Save Preferences
          </Button>
        </div>
      </div>

      {/* Other Sections (Data, Subscription, Danger Zone) remain mostly static or simplified for now 
          as they likely require backend/stripe integration not yet fully scoped 
      */}
      <div className="glass-card p-6 animate-fade-in">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-primary/10">
            <Database className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Data & Export</h3>
            <p className="text-sm text-muted-foreground">Manage your trading data</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium">Export All Trades</p>
              <p className="text-sm text-muted-foreground">Download your complete trade history</p>
            </div>
            <Button variant="outline" disabled>Export CSV (Coming Soon)</Button>
          </div>
        </div>
      </div>

      <div className="glass-card p-6 animate-fade-in border-destructive/30">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-destructive/10">
            <Shield className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <h3 className="font-semibold">Danger Zone</h3>
            <p className="text-sm text-muted-foreground">Irreversible actions</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Delete Account</p>
            <p className="text-sm text-muted-foreground">Permanently delete your account and all data</p>
          </div>
          <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>Delete Account</Button>
        </div>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete your account and all your data including trades, backtests, and profile information.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" disabled={deleting} onClick={async () => {
              setDeleting(true);
              try {
                const { data: { session } } = await supabase.auth.getSession();
                const res = await supabase.functions.invoke("delete-account", {
                  headers: { Authorization: `Bearer ${session?.access_token}` },
                });
                if (res.error) throw res.error;
                await signOut();
                navigate("/auth");
                toast.success("Account deleted successfully");
              } catch (err: unknown) {
                const message = err instanceof Error ? err.message : "Failed to delete account";
                toast.error(message);
              } finally {
                setDeleting(false);
                setDeleteDialogOpen(false);
              }
            }}>
              {deleting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Yes, delete my account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
