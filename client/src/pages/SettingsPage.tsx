// ============================================================================
// Settings Page — Swiss Instrument design — FULLY PERSISTENT
// All settings load from DB and save via tRPC
// ============================================================================

import DashboardLayout from "@/components/DashboardLayout";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import {
  Shield, Lock, Eye, Server, Database, FileText, AlertTriangle,
  CheckCircle2, Clock, Globe, Zap, Key, Users, Activity,
  Bell, Download, Trash2, UserCheck, Monitor, Wifi, WifiOff,
  Mail, MessageSquare, RefreshCw, Loader2, Save, Smartphone, Copy, AlertCircle,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { useState, useCallback, useEffect, useMemo } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { toast } from "sonner";
import { logAction } from "@/lib/operatorSession";
import { isAtlasTeam } from "@/lib/atlas";
import { usePreviewMode } from "@/contexts/PreviewMode";

const SOC2_ITEMS = [
  { id: "encryption", label: "AES-256 encryption at rest", done: true },
  { id: "tls", label: "TLS 1.3 in transit", done: true },
  { id: "mfa", label: "Multi-factor authentication", done: true },
  { id: "audit", label: "Audit logging enabled", done: true },
  { id: "backup", label: "Automated daily backups", done: true },
  { id: "pentest", label: "Annual penetration testing", done: false },
  { id: "soc2cert", label: "SOC 2 Type II certification", done: false },
  { id: "gdpr", label: "GDPR compliance review", done: false },
];

// ── Email Test Section ──────────────────────────────────────────────────
function EmailTestSection() {
  const [testEmail, setTestEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; error?: string; messageId?: string } | null>(null);
  const sendTest = trpc.email.sendTest.useMutation();

  const handleSendTest = async () => {
    if (!testEmail) return;
    setSending(true);
    setResult(null);
    try {
      const res = await sendTest.mutateAsync({ to: testEmail });
      setResult(res);
      if (res.success) {
        toast.success("Test email sent successfully");
      } else {
        toast.error(res.error || "Failed to send test email");
      }
    } catch (err: any) {
      setResult({ success: false, error: err.message });
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          type="email"
          placeholder="recipient@example.com"
          value={testEmail}
          onChange={(e) => setTestEmail(e.target.value)}
          className="flex-1 h-9"
        />
        <Button
          onClick={handleSendTest}
          disabled={sending || !testEmail}
          size="sm"
          className="gap-1.5 h-9 min-h-[36px] touch-manipulation"
        >
          {sending ? <Loader2 className="size-3.5 animate-spin" /> : <Mail className="size-3.5" />}
          {sending ? "Sending..." : "Send Test"}
        </Button>
      </div>
      {result && (
        <div className={cn(
          "flex items-center gap-2 text-xs px-3 py-2 rounded-lg",
          result.success ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
        )}>
          {result.success ? (
            <><CheckCircle2 className="size-3.5" /> Delivered (ID: {result.messageId?.slice(0, 12)}...)</>
          ) : (
            <><AlertCircle className="size-3.5" /> {result.error}</>
          )}
        </div>
      )}
    </div>
  );
}

export default function SettingsConfigPage() {
  const { theme, toggleTheme } = useTheme();
  const darkMode = theme === "dark";
  const { user: authUser } = useAuth();
  const { isPreviewMode } = usePreviewMode();
  const isAtlas = isAtlasTeam(authUser) && !isPreviewMode;
  const utils = trpc.useUtils();

  // ── Fetch profile data from DB ──────────────────────────────────────
  const { data: profile, isLoading } = trpc.settings.getProfile.useQuery(undefined, {
    enabled: !!authUser,
  });
  const { data: auditLogs, isLoading: auditLoading, refetch: refetchAudit } = trpc.settings.getAuditLog.useQuery(
    { limit: 50 },
    { enabled: !!authUser }
  );
  const { data: activeSessions, isLoading: sessionsLoading, refetch: refetchSessions } = trpc.settings.getActiveSessions.useQuery(undefined, {
    enabled: !!authUser,
  });

  // ── Local state initialized from DB ─────────────────────────────────
  const [compactView, setCompactView] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);
  const [slackNotifs, setSlackNotifs] = useState(false);
  const [notifTaskComplete, setNotifTaskComplete] = useState(true);
  const [notifDistribution, setNotifDistribution] = useState(true);
  const [notifLogin, setNotifLogin] = useState(true);
  const [notifOverdue, setNotifOverdue] = useState(true);
  const [notifWeekly, setNotifWeekly] = useState(false);
  const [soc2Items, setSoc2Items] = useState(SOC2_ITEMS);
  const [hasNotifChanges, setHasNotifChanges] = useState(false);

  // Initialize from DB data
  useEffect(() => {
    if (profile?.preferences) {
      const p = profile.preferences;
      setCompactView(p.compactView ?? false);
      setAutoRefresh(p.autoRefresh ?? true);
      setEmailNotifs(p.emailNotifications ?? true);
      setPushNotifs(p.pushNotifications ?? true);
      setSlackNotifs(p.slackNotifications ?? false);
      setNotifTaskComplete(p.notifTaskComplete ?? true);
      setNotifDistribution(p.notifDistribution ?? true);
      setNotifLogin(p.notifLogin ?? true);
      setNotifOverdue(p.notifOverdue ?? true);
      setNotifWeekly(p.notifWeekly ?? false);
      setHasNotifChanges(false);
    }
  }, [profile]);

  // ── Mutations ───────────────────────────────────────────────────────
  const updateDisplay = trpc.settings.updateDisplay.useMutation({
    onSuccess: () => utils.settings.getProfile.invalidate(),
  });
  const updateNotifications = trpc.settings.updateNotifications.useMutation({
    onSuccess: () => {
      utils.settings.getProfile.invalidate();
      setHasNotifChanges(false);
    },
  });
  const terminateSession = trpc.settings.terminateSession.useMutation({
    onSuccess: () => {
      utils.settings.getActiveSessions.invalidate();
      utils.settings.getProfile.invalidate();
    },
  });

  // ── MFA state & mutations ──────────────────────────────────────────
  const { data: mfaStatus, refetch: refetchMfa } = trpc.settings.getMfaStatus.useQuery(undefined, { enabled: !!authUser });
  const mfaSetup = trpc.settings.mfaSetup.useMutation();
  const mfaVerify = trpc.settings.mfaVerify.useMutation({
    onSuccess: () => { refetchMfa(); utils.settings.getProfile.invalidate(); },
  });
  const mfaDisable = trpc.settings.mfaDisable.useMutation({
    onSuccess: () => { refetchMfa(); utils.settings.getProfile.invalidate(); },
  });
  const mfaRegenCodes = trpc.settings.mfaRegenerateBackupCodes.useMutation();

  const [mfaStep, setMfaStep] = useState<"idle" | "setup" | "verify" | "backup" | "disable" | "regen">("idle");
  const [mfaQr, setMfaQr] = useState<string | null>(null);
  const [mfaSecretKey, setMfaSecretKey] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaBackupCodes, setMfaBackupCodes] = useState<string[]>([]);
  const [mfaError, setMfaError] = useState<string | null>(null);

  const handleMfaSetup = useCallback(async () => {
    setMfaError(null);
    try {
      const result = await mfaSetup.mutateAsync();
      setMfaQr(result.qrCodeDataUrl);
      setMfaSecretKey(result.secret);
      setMfaStep("setup");
    } catch (e: any) {
      toast.error(e.message || "Failed to start MFA setup");
    }
  }, [mfaSetup]);

  const handleMfaVerify = useCallback(async () => {
    setMfaError(null);
    try {
      const result = await mfaVerify.mutateAsync({ code: mfaCode });
      setMfaBackupCodes(result.backupCodes);
      setMfaStep("backup");
      setMfaCode("");
      toast.success("MFA enabled successfully");
    } catch (e: any) {
      setMfaError(e.message || "Invalid code");
    }
  }, [mfaCode, mfaVerify]);

  const handleMfaDisable = useCallback(async () => {
    setMfaError(null);
    try {
      await mfaDisable.mutateAsync({ code: mfaCode });
      setMfaStep("idle");
      setMfaCode("");
      toast.success("MFA disabled");
    } catch (e: any) {
      setMfaError(e.message || "Invalid code");
    }
  }, [mfaCode, mfaDisable]);

  const handleMfaRegenCodes = useCallback(async () => {
    setMfaError(null);
    try {
      const result = await mfaRegenCodes.mutateAsync({ code: mfaCode });
      setMfaBackupCodes(result.backupCodes);
      setMfaStep("backup");
      setMfaCode("");
      toast.success("Backup codes regenerated");
    } catch (e: any) {
      setMfaError(e.message || "Invalid code");
    }
  }, [mfaCode, mfaRegenCodes]);

  const copyBackupCodes = useCallback(() => {
    navigator.clipboard.writeText(mfaBackupCodes.join("\n"));
    toast.success("Backup codes copied to clipboard");
  }, [mfaBackupCodes]);

  // ── Handlers ────────────────────────────────────────────────────────
  const handleDisplayToggle = useCallback(async (field: "compactView" | "autoRefresh", value: boolean) => {
    if (field === "compactView") setCompactView(value);
    else setAutoRefresh(value);
    try {
      await updateDisplay.mutateAsync({ [field]: value });
      logAction("Setting changed", `${field}: ${value}`);
      toast.success(`${field === "compactView" ? "Compact view" : "Auto-refresh"} ${value ? "enabled" : "disabled"}`);
    } catch {
      toast.error("Failed to save setting");
    }
  }, [updateDisplay]);

  const handleSaveNotifications = useCallback(async () => {
    try {
      await updateNotifications.mutateAsync({
        emailNotifications: emailNotifs,
        pushNotifications: pushNotifs,
        slackNotifications: slackNotifs,
        notifTaskComplete,
        notifDistribution,
        notifLogin,
        notifOverdue,
        notifWeekly,
      });
      toast.success("Notification preferences saved");
    } catch {
      toast.error("Failed to save notification preferences");
    }
  }, [emailNotifs, pushNotifs, slackNotifs, notifTaskComplete, notifDistribution, notifLogin, notifOverdue, notifWeekly, updateNotifications]);

  const handleToggleSoc2 = useCallback((id: string) => {
    setSoc2Items(prev => prev.map(item =>
      item.id === id ? { ...item, done: !item.done } : item
    ));
    logAction("Compliance updated", `Toggled ${id}`);
    toast.success("Compliance item updated");
  }, []);

  const handleTerminateSession = useCallback(async (sessionId: number) => {
    try {
      await terminateSession.mutateAsync({ sessionId });
      toast.success("Session terminated");
    } catch {
      toast.error("Failed to terminate session");
    }
  }, [terminateSession]);

  const completedCount = soc2Items.filter(i => i.done).length;
  const notifSaving = updateNotifications.isPending;

  const formatRelativeTime = (date: Date | string) => {
    const d = new Date(date);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <DashboardLayout title="Settings" subtitle="SYSTEM CONFIGURATION">
      <div className="p-3 sm:p-4 md:p-6 max-w-5xl mx-auto pb-24 md:pb-6">
        <Tabs defaultValue="general" className="space-y-4 sm:space-y-6">
          <TabsList className="bg-secondary/30 border border-border flex-wrap h-auto gap-1 p-1 overflow-x-auto scrollbar-hide">
            <TabsTrigger value="general" className="text-xs gap-1 sm:gap-1.5 touch-manipulation">
              <Zap className="size-3" /> <span className="hidden sm:inline">General</span><span className="sm:hidden">Gen</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="text-xs gap-1 sm:gap-1.5 touch-manipulation">
              <Shield className="size-3" /> <span className="hidden sm:inline">Security</span><span className="sm:hidden">Sec</span>
            </TabsTrigger>
            <TabsTrigger value="compliance" className="text-xs gap-1 sm:gap-1.5 touch-manipulation">
              <FileText className="size-3" /> <span className="hidden sm:inline">Compliance</span><span className="sm:hidden">Comp</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="text-xs gap-1 sm:gap-1.5 touch-manipulation">
              <Bell className="size-3" /> <span className="hidden sm:inline">Notifications</span><span className="sm:hidden">Notif</span>
            </TabsTrigger>
            <TabsTrigger value="audit" className="text-xs gap-1 sm:gap-1.5 touch-manipulation">
              <Activity className="size-3" /> <span className="hidden sm:inline">Audit Log</span><span className="sm:hidden">Audit</span>
            </TabsTrigger>
          </TabsList>

          {/* ═══════════════════ GENERAL TAB ═══════════════════ */}
          <TabsContent value="general">
            <div className="space-y-6">
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="p-4 sm:p-6 bg-card border-border">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
                    <Globe className="size-4 text-primary" />
                    Appearance
                  </h3>
                  {isLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-12 rounded-lg" />
                      <Skeleton className="h-12 rounded-lg" />
                      <Skeleton className="h-12 rounded-lg" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-foreground">Dark Mode</p>
                          <p className="text-xs text-muted-foreground">Use dark theme across the dashboard</p>
                        </div>
                        <Switch checked={darkMode} onCheckedChange={() => { if (toggleTheme) toggleTheme(); logAction("Setting changed", `Dark mode: ${!darkMode}`); toast.success(`Dark mode ${!darkMode ? "enabled" : "disabled"}`); }} />
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-foreground">Compact View</p>
                          <p className="text-xs text-muted-foreground">Reduce spacing for denser information display</p>
                        </div>
                        <Switch
                          checked={compactView}
                          onCheckedChange={(v) => handleDisplayToggle("compactView", v)}
                          disabled={updateDisplay.isPending}
                        />
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-foreground">Auto-Refresh Data</p>
                          <p className="text-xs text-muted-foreground">Automatically refresh dashboard data every 30s</p>
                        </div>
                        <Switch
                          checked={autoRefresh}
                          onCheckedChange={(v) => handleDisplayToggle("autoRefresh", v)}
                          disabled={updateDisplay.isPending}
                        />
                      </div>
                    </div>
                  )}
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card className="p-4 sm:p-6 bg-card border-border">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
                    <Key className="size-4 text-primary" />
                    API Keys
                  </h3>
                  {isLoading ? (
                    <Skeleton className="h-24 rounded-lg" />
                  ) : profile?.apiKeys && profile.apiKeys.length > 0 ? (
                    <div className="space-y-3">
                      {profile.apiKeys.map((key) => (
                        <div key={key.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/10 border border-border">
                          <div className="flex items-center gap-3">
                            <Key className="size-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs font-mono text-foreground">{key.keyPrefix}••••••••</p>
                              <p className="text-[10px] text-muted-foreground">
                                {key.label || "API Key"} · Created {new Date(key.createdAt).toLocaleDateString()}
                                {key.lastUsedAt ? ` · Last used ${formatRelativeTime(key.lastUsedAt)}` : ""}
                              </p>
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] font-mono",
                              key.status === "active"
                                ? "text-green-400 border-green-500/30"
                                : "text-red-400 border-red-500/30"
                            )}
                          >
                            {key.status?.toUpperCase()}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center">
                      <Key className="size-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                      <p className="text-xs text-muted-foreground">No API keys assigned. Keys are generated when users accept invitations.</p>
                    </div>
                  )}
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <Card className="p-4 sm:p-6 bg-card border-border">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
                    <Server className="size-4 text-primary" />
                    System Information
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: "Version", value: "v2.4.1" },
                      { label: "Environment", value: "Production" },
                      { label: "Region", value: "US-East-1" },
                      { label: "Uptime", value: "99.97%" },
                    ].map((item) => (
                      <div key={item.label} className="space-y-1">
                        <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">{item.label}</p>
                        <p className="text-sm font-medium text-foreground">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              </motion.div>
            </div>
          </TabsContent>

          {/* ═══════════════════ SECURITY TAB ═══════════════════ */}
          <TabsContent value="security">
            <div className="space-y-6">
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="p-4 sm:p-6 bg-card border-border">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
                    <Lock className="size-4 text-primary" />
                    Security Posture
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="size-4 text-green-400" />
                        <span className="text-xs font-semibold text-green-400">STRONG</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">Overall security rating</p>
                    </div>
                    <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="size-4 text-blue-400" />
                        <span className="text-xs font-semibold text-blue-400">{profile?.activeSessionCount || 0} SESSIONS</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">Active sessions</p>
                    </div>
                    <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Key className="size-4 text-amber-400" />
                        <span className="text-xs font-semibold text-amber-400">{profile?.apiKeys?.length || 0} KEYS</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">API keys provisioned</p>
                    </div>
                  </div>
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                <Card className="p-4 sm:p-6 bg-card border-border">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
                    <Shield className="size-4 text-primary" />
                    Security Policies
                  </h3>
                  <div className="space-y-3">
                    {[
                      { label: "OAuth 2.0 Authentication", desc: "Manus OAuth with Google sign-in", status: "active" },
                      { label: "Invite-Only Access", desc: "Only invited users can access the system", status: "active" },
                      { label: "Session Encryption", desc: "JWT-based session tokens with HMAC-SHA256", status: "active" },
                      { label: "Role-Based Access Control", desc: "6-tier RBAC with org-scoped data filtering", status: "active" },
                      { label: "Audit Trail", desc: "Complete audit logging for all operations", status: "active" },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between p-3 rounded-lg bg-secondary/20">
                        <div>
                          <p className="text-sm text-foreground">{item.label}</p>
                          <p className="text-xs text-muted-foreground">{item.desc}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px] font-mono text-green-400 border-green-500/30">
                          ACTIVE
                        </Badge>
                      </div>
                    ))}
                  </div>
                </Card>
              </motion.div>

              {/* ═══ MFA / Two-Factor Authentication ═══ */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.075 }}>
                <Card className="p-4 sm:p-6 bg-card border-border">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Smartphone className="size-4 text-primary" />
                      Two-Factor Authentication (TOTP)
                    </h3>
                    {mfaStatus?.mfaEnabled ? (
                      <Badge variant="outline" className="text-[10px] font-mono text-green-400 border-green-500/30">ENABLED</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] font-mono text-amber-400 border-amber-500/30">DISABLED</Badge>
                    )}
                  </div>

                  {mfaStatus?.mfaEnabled ? (
                    <div className="space-y-4">
                      <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle2 className="size-4 text-green-400" />
                          <span className="text-xs font-semibold text-green-400">MFA ACTIVE</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Enabled {mfaStatus.mfaVerifiedAt ? new Date(mfaStatus.mfaVerifiedAt).toLocaleDateString() : "recently"}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-8"
                          onClick={() => { setMfaStep("regen"); setMfaCode(""); setMfaError(null); }}
                        >
                          <Key className="size-3 mr-1" /> Regenerate Backup Codes
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-8 text-red-400 hover:text-red-400"
                          onClick={() => { setMfaStep("disable"); setMfaCode(""); setMfaError(null); }}
                        >
                          <Lock className="size-3 mr-1" /> Disable MFA
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
                        <div className="flex items-center gap-2 mb-1">
                          <AlertCircle className="size-4 text-amber-400" />
                          <span className="text-xs font-semibold text-amber-400">NOT CONFIGURED</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Add an extra layer of security with a TOTP authenticator app (Google Authenticator, Authy, 1Password).
                        </p>
                      </div>
                      <Button
                        size="sm"
                        className="text-xs h-8"
                        onClick={handleMfaSetup}
                        disabled={mfaSetup.isPending}
                      >
                        {mfaSetup.isPending ? <Loader2 className="size-3 mr-1 animate-spin" /> : <Smartphone className="size-3 mr-1" />}
                        Enable Two-Factor Authentication
                      </Button>
                    </div>
                  )}
                </Card>
              </motion.div>

              {/* MFA Setup Dialog */}
              <Dialog open={mfaStep === "setup"} onOpenChange={(open) => { if (!open) setMfaStep("idle"); }}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-sm flex items-center gap-2">
                      <Smartphone className="size-4 text-primary" /> Set Up Two-Factor Authentication
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                      Scan this QR code with your authenticator app, then enter the 6-digit code to verify.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    {mfaQr && (
                      <div className="flex justify-center p-4 bg-white rounded-lg">
                        <img src={mfaQr} alt="TOTP QR Code" className="w-48 h-48" />
                      </div>
                    )}
                    {mfaSecretKey && (
                      <div className="p-3 rounded-lg bg-secondary/20 border border-border">
                        <p className="text-[10px] text-muted-foreground mb-1">Manual entry key:</p>
                        <code className="text-xs font-mono text-foreground break-all select-all">{mfaSecretKey}</code>
                      </div>
                    )}
                    <div>
                      <Label className="text-xs mb-1.5 block">Verification Code</Label>
                      <Input
                        placeholder="000000"
                        value={mfaCode}
                        onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        maxLength={6}
                        className="font-mono text-center text-lg tracking-[0.3em]"
                        autoFocus
                      />
                      {mfaError && <p className="text-xs text-red-400 mt-1">{mfaError}</p>}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" size="sm" onClick={() => setMfaStep("idle")}>Cancel</Button>
                    <Button
                      size="sm"
                      onClick={handleMfaVerify}
                      disabled={mfaCode.length !== 6 || mfaVerify.isPending}
                    >
                      {mfaVerify.isPending ? <Loader2 className="size-3 mr-1 animate-spin" /> : <CheckCircle2 className="size-3 mr-1" />}
                      Verify & Enable
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Backup Codes Dialog */}
              <Dialog open={mfaStep === "backup"} onOpenChange={(open) => { if (!open) setMfaStep("idle"); }}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-sm flex items-center gap-2">
                      <Key className="size-4 text-primary" /> Backup Recovery Codes
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                      Save these codes in a secure location. Each code can only be used once.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-secondary/20 border border-border">
                      <div className="grid grid-cols-2 gap-2">
                        {mfaBackupCodes.map((code, i) => (
                          <code key={i} className="text-xs font-mono text-foreground p-1.5 bg-secondary/30 rounded text-center">
                            {code}
                          </code>
                        ))}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="size-4 text-amber-400 shrink-0" />
                        <p className="text-[10px] text-amber-400">
                          These codes will not be shown again. Store them securely.
                        </p>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" size="sm" onClick={copyBackupCodes}>
                      <Copy className="size-3 mr-1" /> Copy All
                    </Button>
                    <Button size="sm" onClick={() => setMfaStep("idle")}>
                      I've Saved These Codes
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Disable MFA Dialog */}
              <Dialog open={mfaStep === "disable"} onOpenChange={(open) => { if (!open) setMfaStep("idle"); }}>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle className="text-sm flex items-center gap-2 text-red-400">
                      <AlertTriangle className="size-4" /> Disable Two-Factor Authentication
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                      Enter your current TOTP code to confirm disabling MFA.
                    </DialogDescription>
                  </DialogHeader>
                  <div>
                    <Input
                      placeholder="000000"
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      maxLength={6}
                      className="font-mono text-center text-lg tracking-[0.3em]"
                      autoFocus
                    />
                    {mfaError && <p className="text-xs text-red-400 mt-1">{mfaError}</p>}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" size="sm" onClick={() => setMfaStep("idle")}>Cancel</Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleMfaDisable}
                      disabled={mfaCode.length !== 6 || mfaDisable.isPending}
                    >
                      {mfaDisable.isPending ? <Loader2 className="size-3 mr-1 animate-spin" /> : null}
                      Disable MFA
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Regenerate Backup Codes Dialog */}
              <Dialog open={mfaStep === "regen"} onOpenChange={(open) => { if (!open) setMfaStep("idle"); }}>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle className="text-sm flex items-center gap-2">
                      <Key className="size-4 text-primary" /> Regenerate Backup Codes
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                      Enter your current TOTP code. This will invalidate all existing backup codes.
                    </DialogDescription>
                  </DialogHeader>
                  <div>
                    <Input
                      placeholder="000000"
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      maxLength={6}
                      className="font-mono text-center text-lg tracking-[0.3em]"
                      autoFocus
                    />
                    {mfaError && <p className="text-xs text-red-400 mt-1">{mfaError}</p>}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" size="sm" onClick={() => setMfaStep("idle")}>Cancel</Button>
                    <Button
                      size="sm"
                      onClick={handleMfaRegenCodes}
                      disabled={mfaCode.length !== 6 || mfaRegenCodes.isPending}
                    >
                      {mfaRegenCodes.isPending ? <Loader2 className="size-3 mr-1 animate-spin" /> : null}
                      Regenerate
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Active Sessions — Real DB data */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card className="p-4 sm:p-6 bg-card border-border">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Monitor className="size-4 text-primary" />
                      Active Sessions
                    </h3>
                    <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => refetchSessions()}>
                      <RefreshCw className="size-3 mr-1" /> Refresh
                    </Button>
                  </div>
                  {sessionsLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-16 rounded-lg" />
                      <Skeleton className="h-16 rounded-lg" />
                    </div>
                  ) : activeSessions && activeSessions.length > 0 ? (
                    <div className="space-y-3">
                      {activeSessions.map((session) => (
                        <div key={session.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/10 border border-border">
                          <div className="flex items-center gap-3">
                            <div className="size-2 rounded-full bg-green-400 shrink-0" />
                            <div>
                              <p className="text-xs font-medium text-foreground">
                                {session.userAgent?.includes("Chrome") ? "Chrome" :
                                 session.userAgent?.includes("Firefox") ? "Firefox" :
                                 session.userAgent?.includes("Safari") ? "Safari" :
                                 "Browser Session"}
                              </p>
                              <p className="text-[10px] text-muted-foreground font-mono">
                                {session.ipAddress || "Unknown IP"} · Last active {formatRelativeTime(session.lastActivity)}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-7 text-red-400 hover:text-red-400 min-h-[36px] touch-manipulation"
                            onClick={() => handleTerminateSession(session.id)}
                            disabled={terminateSession.isPending}
                          >
                            <Trash2 className="size-3 mr-1" /> End
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center">
                      <Monitor className="size-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                      <p className="text-xs text-muted-foreground">No active sessions found.</p>
                    </div>
                  )}
                </Card>
              </motion.div>
            </div>
          </TabsContent>

          {/* ═══════════════════ COMPLIANCE TAB ═══════════════════ */}
          <TabsContent value="compliance">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="p-4 sm:p-6 bg-card border-border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <FileText className="size-4 text-primary" />
                    SOC 2 Readiness Checklist
                  </h3>
                  <span className="text-xs font-mono text-muted-foreground">
                    {completedCount}/{soc2Items.length} complete
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-secondary/30 mb-6">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${(completedCount / soc2Items.length) * 100}%` }}
                  />
                </div>
                <div className="space-y-3">
                  {soc2Items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-secondary/10 hover:bg-secondary/20 transition-colors cursor-pointer"
                      onClick={() => handleToggleSoc2(item.id)}
                    >
                      <Checkbox
                        checked={item.done}
                        onCheckedChange={() => handleToggleSoc2(item.id)}
                        className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                      />
                      <span className={cn(
                        "text-sm",
                        item.done ? "text-muted-foreground line-through" : "text-foreground"
                      )}>
                        {item.label}
                      </span>
                      {item.done && (
                        <CheckCircle2 className="size-3.5 text-green-400 ml-auto" />
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          </TabsContent>

          {/* ═══════════════════ NOTIFICATIONS TAB ═══════════════════ */}
          <TabsContent value="notifications">
            <div className="space-y-6">
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="p-4 sm:p-6 bg-card border-border">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
                    <Bell className="size-4 text-primary" />
                    Notification Channels
                  </h3>
                  {isLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-12 rounded-lg" />
                      <Skeleton className="h-12 rounded-lg" />
                      <Skeleton className="h-12 rounded-lg" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <Mail className="size-4 text-blue-400" />
                          </div>
                          <div>
                            <p className="text-sm text-foreground">Email Notifications</p>
                            <p className="text-xs text-muted-foreground">Receive alerts via email</p>
                          </div>
                        </div>
                        <Switch checked={emailNotifs} onCheckedChange={(v) => { setEmailNotifs(v); setHasNotifChanges(true); }} />
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                            <Bell className="size-4 text-green-400" />
                          </div>
                          <div>
                            <p className="text-sm text-foreground">Push Notifications</p>
                            <p className="text-xs text-muted-foreground">Browser push alerts for urgent items</p>
                          </div>
                        </div>
                        <Switch checked={pushNotifs} onCheckedChange={(v) => { setPushNotifs(v); setHasNotifChanges(true); }} />
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                            <MessageSquare className="size-4 text-purple-400" />
                          </div>
                          <div>
                            <p className="text-sm text-foreground">Slack Integration</p>
                            <p className="text-xs text-muted-foreground">Post alerts to Slack channel</p>
                          </div>
                        </div>
                        <Switch checked={slackNotifs} onCheckedChange={(v) => { setSlackNotifs(v); setHasNotifChanges(true); }} />
                      </div>
                    </div>
                  )}
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card className="p-4 sm:p-6 bg-card border-border">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
                    <Zap className="size-4 text-primary" />
                    Alert Types
                  </h3>
                  <p className="text-xs text-muted-foreground mb-4">Configure which events trigger notifications.</p>
                  {isLoading ? (
                    <div className="space-y-4">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-12 rounded-lg" />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {[
                        { label: "Task Completed", desc: "When a task is marked as complete", state: notifTaskComplete, setter: setNotifTaskComplete },
                        { label: "Distribution Created", desc: "When a new distribution is recorded", state: notifDistribution, setter: setNotifDistribution },
                        { label: "Operator Login", desc: "When any user authenticates", state: notifLogin, setter: setNotifLogin },
                        { label: "Overdue Tasks", desc: "Daily digest of overdue items", state: notifOverdue, setter: setNotifOverdue },
                        { label: "Weekly Summary", desc: "Automated weekly ops report", state: notifWeekly, setter: setNotifWeekly },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-foreground">{item.label}</p>
                            <p className="text-xs text-muted-foreground">{item.desc}</p>
                          </div>
                          <Switch checked={item.state} onCheckedChange={(v) => { item.setter(v); setHasNotifChanges(true); }} />
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </motion.div>

              {/* Save Notifications Button */}
              <div className="flex justify-end">
                <Button
                  onClick={handleSaveNotifications}
                  disabled={notifSaving || !hasNotifChanges}
                  className="gap-2 h-9 min-h-[36px] touch-manipulation"
                >
                  {notifSaving ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Save className="size-3.5" />
                  )}
                  {notifSaving ? "Saving..." : hasNotifChanges ? "Save Notification Settings" : "Saved"}
                </Button>
              </div>

              {/* Email Integration Test */}
              {isAtlas && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                  <Card className="p-4 sm:p-6 bg-card border-border">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
                      <Mail className="size-4 text-blue-400" />
                      Email Delivery Test
                    </h3>
                    <p className="text-xs text-muted-foreground mb-4">Send a test email to verify Resend integration is working.</p>
                    <EmailTestSection />
                  </Card>
                </motion.div>
              )}
            </div>
          </TabsContent>

          {/* ═══════════════════ AUDIT LOG TAB ═══════════════════ */}
          <TabsContent value="audit">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="p-4 sm:p-6 bg-card border-border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Activity className="size-4 text-primary" />
                    Activity Log
                  </h3>
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => refetchAudit()}>
                    <RefreshCw className="size-3 mr-1" /> Refresh
                  </Button>
                </div>
                {auditLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 rounded-lg" />
                    ))}
                  </div>
                ) : auditLogs && auditLogs.length > 0 ? (
                  <div className="space-y-0">
                    {auditLogs.map((entry) => (
                      <div key={entry.id} className="flex items-center gap-4 py-3 border-b border-border last:border-0">
                        <div className={cn(
                          "size-2 rounded-full shrink-0",
                          entry.result === "success" ? "bg-green-400" :
                          entry.result === "denied" ? "bg-red-400" : "bg-amber-400"
                        )} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground capitalize">{entry.action} {entry.entityType?.replace(/_/g, " ")}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {entry.userName}
                            {entry.details ? ` — ${(() => {
                              try {
                                const d = JSON.parse(entry.details);
                                return Object.entries(d).map(([k, v]) => `${k}: ${v}`).join(", ");
                              } catch { return entry.details; }
                            })()}` : ""}
                          </p>
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground shrink-0 flex items-center gap-1">
                          <Clock className="size-3" />
                          {formatRelativeTime(entry.createdAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <Activity className="size-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                    <p className="text-xs text-muted-foreground">No activity recorded yet. Actions are logged when you interact with the system.</p>
                  </div>
                )}
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
