// Profile Page — Swiss Instrument design — FULLY PERSISTENT
// Loads user data from DB, saves changes via tRPC

import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { motion } from "framer-motion";
import {
  User, Mail, Shield, Bell, Globe, Key, Camera, Save, LogOut,
  CheckCircle2, Clock, Loader2, AlertTriangle, Briefcase, ListChecks, DollarSign, Activity,
} from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { trpc as trpcClient } from "@/lib/trpc";

const VENTEX_LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663421947072/TYkqBQavc4Sd5YvF3sSZqT/atlas-logo-G2SBqxAK64sZYAYmAZY9js.webp";

const ROLE_LABELS: Record<string, string> = {
  owner: "System Owner",
  admin: "System Administrator",
  manager: "Manager",
  user: "User",
  client: "Client",
  viewer: "Viewer",
};

export default function ProfilePage() {
  const [, navigate] = useLocation();
  const { user: authUser, logout } = useAuth();
  const utils = trpc.useUtils();

  // Fetch profile data from DB
  const { data: profile, isLoading } = trpc.settings.getProfile.useQuery(undefined, {
    enabled: !!authUser,
  });

  // Local form state — initialized from DB data
  const [displayName, setDisplayName] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form from DB data
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.preferences?.displayName || profile.user.name || "");
      setTimezone(profile.preferences?.timezone || "America/New_York");
      setEmailNotifs(profile.preferences?.emailNotifications ?? true);
      setPushNotifs(profile.preferences?.pushNotifications ?? true);
      setTwoFactor(profile.preferences?.twoFactorEnabled ?? false);
      setHasChanges(false);
    }
  }, [profile]);

  // Track changes
  const markChanged = useCallback(() => setHasChanges(true), []);

  // Mutations
  const updateProfile = trpc.settings.updateProfile.useMutation({
    onSuccess: () => {
      utils.settings.getProfile.invalidate();
      utils.auth.me.invalidate();
    },
  });
  const updateNotifications = trpc.settings.updateNotifications.useMutation({
    onSuccess: () => utils.settings.getProfile.invalidate(),
  });
  const updateSecurity = trpc.settings.updateSecurity.useMutation({
    onSuccess: () => utils.settings.getProfile.invalidate(),
  });

  const saving = updateProfile.isPending || updateNotifications.isPending || updateSecurity.isPending;

  const handleSave = useCallback(async () => {
    try {
      // Save profile info
      await updateProfile.mutateAsync({
        displayName: displayName.trim() || undefined,
        timezone,
      });

      // Save notification preferences
      await updateNotifications.mutateAsync({
        emailNotifications: emailNotifs,
        pushNotifications: pushNotifs,
      });

      // Save security settings
      await updateSecurity.mutateAsync({
        twoFactorEnabled: twoFactor,
      });

      setHasChanges(false);
      toast.success("Profile updated successfully");
    } catch (err) {
      toast.error("Failed to save profile changes");
    }
  }, [displayName, timezone, emailNotifs, pushNotifs, twoFactor, updateProfile, updateNotifications, updateSecurity]);

  const handleLogout = useCallback(async () => {
    toast.info("Signing out...");
    await logout();
    navigate("/");
  }, [logout, navigate]);

  const userEmail = profile?.user.email || authUser?.email || "";
  const userRole = profile?.user.role || authUser?.role || "user";
  const initials = (displayName || profile?.user.name || "U")
    .split(" ")
    .map(w => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (isLoading) {
    return (
      <DashboardLayout title="Profile" subtitle="LOADING...">
        <div className="p-3 sm:p-4 md:p-6 max-w-4xl mx-auto space-y-4 sm:space-y-6 pb-24 md:pb-6">
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Profile" subtitle="YOUR CREDENTIALS">
      <div className="p-3 sm:p-4 md:p-6 max-w-4xl mx-auto space-y-4 sm:space-y-6 pb-24 md:pb-6">
        {/* Profile Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Card className="p-4 sm:p-6 bg-card border-border">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
              <div className="relative group">
                <Avatar className="size-16 sm:size-20 border-2 border-primary/20">
                  <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <label
                  className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  title="Change avatar"
                >
                  <Camera className="size-5 text-white" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 2 * 1024 * 1024) {
                        toast.error("Image must be under 2 MB");
                        return;
                      }
                      toast.info("Avatar upload is available for team members via the VENTEX Team page.");
                    }}
                  />
                </label>
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h2 className="text-xl font-semibold text-foreground">{displayName || profile?.user.name || "User"}</h2>
                <p className="text-sm text-muted-foreground font-mono mt-1">{userEmail}</p>
                <div className="flex items-center gap-2 mt-2 justify-center sm:justify-start flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-primary/10 text-primary border border-primary/20">
                    <Shield className="size-3" />
                    {ROLE_LABELS[userRole] || userRole}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-green-500/10 text-green-400 border border-green-500/20">
                    <CheckCircle2 className="size-3" />
                    {profile?.user.status?.toUpperCase() || "ACTIVE"}
                  </span>
                  {profile?.activeSessionCount !== undefined && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      <Globe className="size-3" />
                      {profile.activeSessionCount} session{profile.activeSessionCount !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                {profile?.user.lastSignedIn && (
                  <p className="text-[10px] text-muted-foreground mt-2 font-mono flex items-center gap-1 justify-center sm:justify-start">
                    <Clock className="size-3" />
                    Last signed in: {new Date(profile.user.lastSignedIn).toLocaleString()}
                  </p>
                )}
              </div>
              <img src={VENTEX_LOGO_URL} alt="VENTEX" className="size-8 sm:size-10 rounded-md opacity-50 hidden sm:block" />
            </div>
          </Card>
        </motion.div>

        {/* Portfolio Summary */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05 }}>
          <Card className="p-4 sm:p-6 bg-card border-border">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
              <Activity className="size-4 text-primary" />
              Portfolio Summary
            </h3>
            {["admin", "owner", "manager"].includes(userRole) ? (
              <div className="p-4 rounded-lg bg-secondary/10 border border-border/50 text-center">
                <Shield className="size-5 text-primary mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">{ROLE_LABELS[userRole] || userRole}</p>
                <p className="text-xs text-muted-foreground mt-1">System-level access — no personal portfolio</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-secondary/20 text-center">
                  <Briefcase className="size-4 text-blue-400 mx-auto mb-1" />
                  <p className="text-lg font-mono font-semibold text-foreground">{(profile as any)?.stats?.ventures ?? "—"}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Ventures</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/20 text-center">
                  <ListChecks className="size-4 text-amber-400 mx-auto mb-1" />
                  <p className="text-lg font-mono font-semibold text-foreground">{(profile as any)?.stats?.tasks ?? "—"}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Tasks</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/20 text-center">
                  <DollarSign className="size-4 text-emerald-400 mx-auto mb-1" />
                  <p className="text-lg font-mono font-semibold text-foreground">{(profile as any)?.stats?.distributions ?? "—"}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Distributions</p>
                </div>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Personal Information */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
          <Card className="p-4 sm:p-6 bg-card border-border">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
              <User className="size-4 text-primary" />
              Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground font-mono">DISPLAY NAME</Label>
                <Input
                  value={displayName}
                  onChange={(e) => { setDisplayName(e.target.value); markChanged(); }}
                  className="bg-secondary/30 border-border text-sm"
                  placeholder="Your display name"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground font-mono">EMAIL ADDRESS</Label>
                <Input
                  value={userEmail}
                  readOnly
                  className="bg-secondary/30 border-border text-sm opacity-60"
                />
                <p className="text-[10px] text-muted-foreground">Email is managed by your OAuth provider</p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground font-mono">ROLE</Label>
                <Input
                  value={ROLE_LABELS[userRole] || userRole}
                  readOnly
                  className="bg-secondary/30 border-border text-sm opacity-60"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground font-mono">TIMEZONE</Label>
                <Select value={timezone} onValueChange={(v) => { setTimezone(v); markChanged(); }}>
                  <SelectTrigger className="bg-secondary/30 border-border text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/New_York">Eastern (EST/EDT)</SelectItem>
                    <SelectItem value="America/Chicago">Central (CST/CDT)</SelectItem>
                    <SelectItem value="America/Denver">Mountain (MST/MDT)</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific (PST/PDT)</SelectItem>
                    <SelectItem value="Europe/London">London (GMT/BST)</SelectItem>
                    <SelectItem value="Europe/Paris">Paris (CET/CEST)</SelectItem>
                    <SelectItem value="Asia/Dubai">Dubai (GST)</SelectItem>
                    <SelectItem value="Asia/Beirut">Beirut (EET/EEST)</SelectItem>
                    <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                    <SelectItem value="Asia/Singapore">Singapore (SGT)</SelectItem>
                    <SelectItem value="Australia/Sydney">Sydney (AEST/AEDT)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Notifications */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }}>
          <Card className="p-4 sm:p-6 bg-card border-border">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
              <Bell className="size-4 text-primary" />
              Notifications
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground">Email Notifications</p>
                  <p className="text-xs text-muted-foreground">Receive task updates and alerts via email</p>
                </div>
                <Switch checked={emailNotifs} onCheckedChange={(v) => { setEmailNotifs(v); markChanged(); }} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground">Push Notifications</p>
                  <p className="text-xs text-muted-foreground">Browser push notifications for urgent items</p>
                </div>
                <Switch checked={pushNotifs} onCheckedChange={(v) => { setPushNotifs(v); markChanged(); }} />
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Security */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.3 }}>
          <Card className="p-4 sm:p-6 bg-card border-border">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
              <Key className="size-4 text-primary" />
              Security
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground">Two-Factor Authentication</p>
                  <p className="text-xs text-muted-foreground">Add an extra layer of security to your account</p>
                </div>
                <Switch checked={twoFactor} onCheckedChange={(v) => { setTwoFactor(v); markChanged(); }} />
              </div>
              <Separator />
              <div>
                <p className="text-sm text-foreground mb-2">API Keys</p>
                {profile?.apiKeys && profile.apiKeys.length > 0 ? (
                  <div className="space-y-2">
                    {profile.apiKeys.map((key) => (
                      <div key={key.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/10 border border-border">
                        <div className="flex items-center gap-3">
                          <Key className="size-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs font-mono text-foreground">{key.keyPrefix}••••••••</p>
                            <p className="text-[10px] text-muted-foreground">
                              {key.label || "API Key"} · Created {new Date(key.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-mono ${
                            key.status === "active"
                              ? "text-green-400 border-green-500/30"
                              : "text-red-400 border-red-500/30"
                          }`}
                        >
                          {key.status?.toUpperCase()}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground p-3 rounded-lg bg-secondary/10">
                    No API keys assigned to your account.
                  </p>
                )}
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground">Active Sessions</p>
                  <p className="text-xs text-muted-foreground">
                    {profile?.activeSessionCount || 0} active session{(profile?.activeSessionCount || 0) !== 1 ? "s" : ""}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/settings")}
                  className="text-xs h-8 min-h-[36px] touch-manipulation"
                >
                  Manage
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="flex items-center justify-between gap-3"
        >
          <Button
            variant="destructive"
            size="sm"
            onClick={handleLogout}
            className="gap-2 h-9 min-h-[36px] touch-manipulation"
          >
            <LogOut className="size-3.5" />
            Sign Out
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="gap-2 h-9 min-h-[36px] touch-manipulation"
          >
            {saving ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Save className="size-3.5" />
            )}
            {saving ? "Saving..." : hasChanges ? "Save Changes" : "Saved"}
          </Button>
        </motion.div>

        {/* Unsaved changes indicator */}
        {hasChanges && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-20 md:bottom-4 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono shadow-lg backdrop-blur-sm">
              <AlertTriangle className="size-3.5" />
              Unsaved changes
            </div>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
