// ============================================================================
// Settings Page — Swiss Instrument design
// 6 fully configured tabs: General, Security, Compliance, Audit Log,
// Operators, Notifications & Data
// ============================================================================

import DashboardLayout from "@/components/DashboardLayout";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { motion } from "framer-motion";
import {
  Shield, Lock, Eye, Server, Database, FileText, AlertTriangle,
  CheckCircle2, Clock, Globe, Zap, Key, Users, Activity,
  Bell, Download, Trash2, UserCheck, Monitor, Wifi, WifiOff,
  Mail, MessageSquare, RefreshCw,
} from "lucide-react";
import { useState, useCallback, useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
  getSessionHistory,
  getUniqueOperators,
  getCurrentSession,
  formatRelativeTime,
  clearAllSessions,
  logAction,
  type SessionEntry,
} from "@/lib/operatorSession";
import { exportAllDistributionsPdf } from "@/lib/exportPdf";
import { DISTRIBUTIONS, SPVS, TASKS, VENTURES, TEAM } from "@/lib/data";

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

export default function SettingsConfigPage() {
  const [darkMode, setDarkMode] = useState(true);
  const [compactView, setCompactView] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [apiKey] = useState("atl_sk_••••••••••••••••••••");
  const [showKey, setShowKey] = useState(false);
  const [soc2Items, setSoc2Items] = useState(SOC2_ITEMS);

  // Notification settings
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);
  const [slackNotifs, setSlackNotifs] = useState(false);
  const [notifTaskComplete, setNotifTaskComplete] = useState(true);
  const [notifDistribution, setNotifDistribution] = useState(true);
  const [notifLogin, setNotifLogin] = useState(true);
  const [notifOverdue, setNotifOverdue] = useState(true);
  const [notifWeekly, setNotifWeekly] = useState(false);

  // Session data
  const [sessions, setSessions] = useState<(SessionEntry & { id: string })[]>([]);
  const [operators, setOperators] = useState<{ name: string; sessions: number; lastSeen: string }[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const currentSession = useMemo(() => getCurrentSession(), [refreshKey]);

  useEffect(() => {
    setSessions(getSessionHistory());
    setOperators(getUniqueOperators());
  }, [refreshKey]);

  const handleToggleSoc2 = useCallback((id: string) => {
    setSoc2Items(prev => prev.map(item =>
      item.id === id ? { ...item, done: !item.done } : item
    ));
    logAction("Compliance updated", `Toggled ${id}`);
    toast.success("Compliance item updated");
  }, []);

  const handleClearSessions = useCallback(() => {
    clearAllSessions();
    setRefreshKey(k => k + 1);
    toast.success("Session history cleared");
  }, []);

  const handleRefreshSessions = useCallback(() => {
    setRefreshKey(k => k + 1);
    toast.info("Session data refreshed");
  }, []);

  const handleExportData = useCallback((type: string) => {
    logAction("Data export", `Exported ${type}`);
    if (type === "distributions") {
      exportAllDistributionsPdf(DISTRIBUTIONS);
      toast.success("Distributions PDF downloaded");
    } else if (type === "ventures") {
      const csv = [
        "Name,Theme,Stage,Status,Location",
        ...VENTURES.map(v => `"${v.name}","${v.theme}","${v.stage}","${v.status}","${v.location}"`)
      ].join("\n");
      downloadCsv(csv, "royalton_ventures.csv");
      toast.success("Ventures CSV downloaded");
    } else if (type === "spvs") {
      const csv = [
        "Name,Stage,Theme,Priority",
        ...SPVS.map(s => `"${s.name}","${s.stage}","${s.theme}","${s.priority}"`)
      ].join("\n");
      downloadCsv(csv, "royalton_spvs.csv");
      toast.success("SPVs CSV downloaded");
    } else if (type === "tasks") {
      const csv = [
        "Title,Status,Due Date,Priority,Assignees",
        ...TASKS.map(t => `"${t.title}","${t.status}","${t.dueDate}","${t.priority}","${t.assignees.join(", ")}"`)
      ].join("\n");
      downloadCsv(csv, "royalton_tasks.csv");
      toast.success("Tasks CSV downloaded");
    } else if (type === "team") {
      const csv = [
        "Name,Role,Function,Status,Type",
        ...TEAM.map((m: { name: string; role: string; function: string; status: string; type: string }) => `"${m.name}","${m.role}","${m.function}","${m.status}","${m.type}"`)
      ].join("\n");
      downloadCsv(csv, "royalton_team.csv");
      toast.success("Team CSV downloaded");
    } else if (type === "sessions") {
      const csv = [
        "Operator,Login Time,Logout Time,IP,Actions Count",
        ...sessions.map(s => `"${s.operator}","${s.loginTime}","${s.logoutTime || "Active"}","${s.ip}","${s.actions.length}"`)
      ].join("\n");
      downloadCsv(csv, "royalton_sessions.csv");
      toast.success("Sessions CSV downloaded");
    }
  }, [sessions]);

  const completedCount = soc2Items.filter(i => i.done).length;

  return (
    <DashboardLayout title="Settings" subtitle="SYSTEM CONFIGURATION">
      <div className="p-6 max-w-5xl mx-auto">
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="bg-secondary/30 border border-border flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="general" className="text-xs gap-1.5">
              <Zap className="size-3" /> General
            </TabsTrigger>
            <TabsTrigger value="security" className="text-xs gap-1.5">
              <Shield className="size-3" /> Security
            </TabsTrigger>
            <TabsTrigger value="compliance" className="text-xs gap-1.5">
              <FileText className="size-3" /> Compliance
            </TabsTrigger>
            <TabsTrigger value="operators" className="text-xs gap-1.5">
              <Users className="size-3" /> Operators
            </TabsTrigger>
            <TabsTrigger value="notifications" className="text-xs gap-1.5">
              <Bell className="size-3" /> Notifications
            </TabsTrigger>
            <TabsTrigger value="audit" className="text-xs gap-1.5">
              <Activity className="size-3" /> Audit Log
            </TabsTrigger>
          </TabsList>

          {/* ═══════════════════ GENERAL TAB ═══════════════════ */}
          <TabsContent value="general">
            <div className="space-y-6">
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="p-6 bg-card border-border">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
                    <Globe className="size-4 text-primary" />
                    Appearance
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-foreground">Dark Mode</p>
                        <p className="text-xs text-muted-foreground">Use dark theme across the dashboard</p>
                      </div>
                      <Switch checked={darkMode} onCheckedChange={(v) => { setDarkMode(v); logAction("Setting changed", `Dark mode: ${v}`); toast.success(`Dark mode ${v ? "enabled" : "disabled"}`); }} />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-foreground">Compact View</p>
                        <p className="text-xs text-muted-foreground">Reduce spacing for denser information display</p>
                      </div>
                      <Switch checked={compactView} onCheckedChange={(v) => { setCompactView(v); logAction("Setting changed", `Compact view: ${v}`); toast.success(`Compact view ${v ? "enabled" : "disabled"}`); }} />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-foreground">Auto-Refresh Data</p>
                        <p className="text-xs text-muted-foreground">Automatically refresh dashboard data every 30s</p>
                      </div>
                      <Switch checked={autoRefresh} onCheckedChange={(v) => { setAutoRefresh(v); logAction("Setting changed", `Auto-refresh: ${v}`); toast.success(`Auto-refresh ${v ? "enabled" : "disabled"}`); }} />
                    </div>
                  </div>
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card className="p-6 bg-card border-border">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
                    <Key className="size-4 text-primary" />
                    API Configuration
                  </h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground font-mono">API KEY</Label>
                      <div className="flex gap-2">
                        <Input
                          value={showKey ? "atl_sk_7f8a9b2c3d4e5f6g7h8i9j0k" : apiKey}
                          readOnly
                          className="bg-secondary/30 border-border text-sm font-mono"
                        />
                        <Button variant="outline" size="sm" onClick={() => setShowKey(!showKey)} className="shrink-0">
                          <Eye className="size-3.5" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText("atl_sk_7f8a9b2c3d4e5f6g7h8i9j0k"); logAction("API key copied"); toast.success("API key copied to clipboard"); }} className="shrink-0 text-xs">
                          Copy
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground font-mono">WEBHOOK URL</Label>
                      <Input defaultValue="https://hooks.atlas.vc/events" className="bg-secondary/30 border-border text-sm font-mono" />
                    </div>
                  </div>
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <Card className="p-6 bg-card border-border">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
                    <Download className="size-4 text-primary" />
                    Data Export
                  </h3>
                  <p className="text-xs text-muted-foreground mb-4">Export system data as CSV or PDF for external reporting and compliance.</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      { label: "Distributions", desc: "PDF report", type: "distributions", icon: <FileText className="size-3.5" /> },
                      { label: "Ventures", desc: "CSV export", type: "ventures", icon: <Download className="size-3.5" /> },
                      { label: "SPVs & Deals", desc: "CSV export", type: "spvs", icon: <Download className="size-3.5" /> },
                      { label: "Tasks", desc: "CSV export", type: "tasks", icon: <Download className="size-3.5" /> },
                      { label: "Team", desc: "CSV export", type: "team", icon: <Download className="size-3.5" /> },
                      { label: "Sessions", desc: "CSV export", type: "sessions", icon: <Download className="size-3.5" /> },
                    ].map((item) => (
                      <Button
                        key={item.type}
                        variant="outline"
                        className="h-auto py-3 flex flex-col items-start gap-1 text-left"
                        onClick={() => handleExportData(item.type)}
                      >
                        <div className="flex items-center gap-2">
                          {item.icon}
                          <span className="text-xs font-medium">{item.label}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">{item.desc}</span>
                      </Button>
                    ))}
                  </div>
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <Card className="p-6 bg-card border-border">
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
                <Card className="p-6 bg-card border-border">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
                    <Lock className="size-4 text-primary" />
                    Security Posture
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="size-4 text-green-400" />
                        <span className="text-xs font-mono text-green-400">ENCRYPTION</span>
                      </div>
                      <p className="text-sm text-foreground">AES-256 at rest</p>
                      <p className="text-xs text-muted-foreground">TLS 1.3 in transit</p>
                    </div>
                    <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="size-4 text-green-400" />
                        <span className="text-xs font-mono text-green-400">AUTHENTICATION</span>
                      </div>
                      <p className="text-sm text-foreground">Access key auth</p>
                      <p className="text-xs text-muted-foreground">Session timeout: 30m</p>
                    </div>
                    <div className="p-4 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="size-4 text-yellow-400" />
                        <span className="text-xs font-mono text-yellow-400">COMPLIANCE</span>
                      </div>
                      <p className="text-sm text-foreground">{completedCount}/{soc2Items.length} items</p>
                      <p className="text-xs text-muted-foreground">SOC 2 in progress</p>
                    </div>
                  </div>
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card className="p-6 bg-card border-border">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
                    <Database className="size-4 text-primary" />
                    Tenant Isolation
                  </h3>
                  <div className="space-y-3">
                    {[
                      { label: "Data Isolation", desc: "Each venture has isolated data partitions", status: "active" },
                      { label: "Network Segmentation", desc: "VPC-level isolation between tenants", status: "active" },
                      { label: "Access Control", desc: "Role-based access with least privilege", status: "active" },
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

              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <Card className="p-6 bg-card border-border">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
                    <Key className="size-4 text-primary" />
                    Access Keys
                  </h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    8 operator access keys are currently provisioned. Each key is tied to a named operator and tracked per session.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      "Jimmy Frangi", "Carl Frangi", "Anton Maghami", "Leonidas Kyrris",
                      "Maher Abou Chakra", "Jon Eichner", "Najib Hanna", "Shwan Lee",
                    ].map((name) => (
                      <div key={name} className="flex items-center justify-between p-3 rounded-lg bg-secondary/10 border border-border">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-[10px] font-mono text-primary font-bold">
                              {name.split(" ").map(w => w[0]).join("")}
                            </span>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-foreground">{name}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">ATLAS-XX-2026-•••••</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px] font-mono text-green-400 border-green-500/30">
                          ACTIVE
                        </Badge>
                      </div>
                    ))}
                  </div>
                </Card>
              </motion.div>
            </div>
          </TabsContent>

          {/* ═══════════════════ COMPLIANCE TAB ═══════════════════ */}
          <TabsContent value="compliance">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="p-6 bg-card border-border">
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

          {/* ═══════════════════ OPERATORS TAB ═══════════════════ */}
          <TabsContent value="operators">
            <div className="space-y-6">
              {/* Current session */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="p-6 bg-card border-border">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Monitor className="size-4 text-primary" />
                      Current Session
                    </h3>
                    <Button variant="ghost" size="sm" className="text-xs h-7" onClick={handleRefreshSessions}>
                      <RefreshCw className="size-3 mr-1" /> Refresh
                    </Button>
                  </div>
                  {currentSession ? (
                    <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="size-10 rounded-full bg-green-500/10 flex items-center justify-center">
                          <UserCheck className="size-5 text-green-400" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{currentSession.operator}</p>
                          <p className="text-[10px] font-mono text-green-400">ACTIVE SESSION</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 mt-3">
                        <div>
                          <p className="text-[10px] text-muted-foreground font-mono uppercase">Login Time</p>
                          <p className="text-xs font-mono text-foreground">{new Date(currentSession.loginTime).toLocaleTimeString()}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground font-mono uppercase">IP Address</p>
                          <p className="text-xs font-mono text-foreground">{currentSession.ip}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground font-mono uppercase">Actions</p>
                          <p className="text-xs font-mono text-foreground">{currentSession.actions.length} logged</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-lg bg-secondary/20 text-center">
                      <p className="text-xs text-muted-foreground">No active session detected</p>
                    </div>
                  )}
                </Card>
              </motion.div>

              {/* Known operators */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card className="p-6 bg-card border-border">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
                    <Users className="size-4 text-primary" />
                    Operator Activity
                  </h3>
                  {operators.length === 0 ? (
                    <div className="p-6 text-center">
                      <Users className="size-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                      <p className="text-xs text-muted-foreground">No operator sessions recorded yet. Sessions are tracked when operators log in via the landing page.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {operators.map((op) => (
                        <div key={op.name} className="flex items-center justify-between p-3 rounded-lg bg-secondary/10 border border-border">
                          <div className="flex items-center gap-3">
                            <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-[10px] font-mono text-primary font-bold">
                                {op.name.split(" ").map(w => w[0]).join("").slice(0, 2)}
                              </span>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-foreground">{op.name}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {op.sessions} session{op.sessions !== 1 ? "s" : ""} — last seen {formatRelativeTime(op.lastSeen)}
                              </p>
                            </div>
                          </div>
                          {currentSession?.operator === op.name ? (
                            <Badge variant="outline" className="text-[10px] font-mono text-green-400 border-green-500/30 flex items-center gap-1">
                              <Wifi className="size-3" /> ONLINE
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground border-border flex items-center gap-1">
                              <WifiOff className="size-3" /> OFFLINE
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </motion.div>

              {/* Session history */}
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <Card className="p-6 bg-card border-border">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Clock className="size-4 text-primary" />
                      Session History
                    </h3>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => handleExportData("sessions")}>
                        <Download className="size-3 mr-1" /> Export
                      </Button>
                      {sessions.length > 0 && (
                        <Button variant="outline" size="sm" className="text-xs h-7 text-red-400 hover:text-red-400" onClick={handleClearSessions}>
                          <Trash2 className="size-3 mr-1" /> Clear
                        </Button>
                      )}
                    </div>
                  </div>
                  {sessions.length === 0 ? (
                    <div className="p-6 text-center">
                      <Clock className="size-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                      <p className="text-xs text-muted-foreground">No session history available.</p>
                    </div>
                  ) : (
                    <div className="space-y-0">
                      {sessions.slice(0, 20).map((session) => (
                        <div key={session.id} className="flex items-center gap-4 py-3 border-b border-border last:border-0">
                          <div className={cn(
                            "size-2 rounded-full shrink-0",
                            session.logoutTime ? "bg-muted-foreground" : "bg-green-400"
                          )} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground">{session.operator}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {session.actions.length} action{session.actions.length !== 1 ? "s" : ""}
                              {session.logoutTime ? ` — session ended` : " — active"}
                            </p>
                          </div>
                          <span className="text-[10px] font-mono text-muted-foreground shrink-0">{session.ip}</span>
                          <span className="text-[10px] font-mono text-muted-foreground shrink-0 flex items-center gap-1">
                            <Clock className="size-3" />
                            {formatRelativeTime(session.loginTime)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </motion.div>
            </div>
          </TabsContent>

          {/* ═══════════════════ NOTIFICATIONS TAB ═══════════════════ */}
          <TabsContent value="notifications">
            <div className="space-y-6">
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="p-6 bg-card border-border">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
                    <Bell className="size-4 text-primary" />
                    Notification Channels
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                          <Mail className="size-4 text-blue-400" />
                        </div>
                        <div>
                          <p className="text-sm text-foreground">Email Notifications</p>
                          <p className="text-xs text-muted-foreground">Receive alerts via ops@atlas.vc</p>
                        </div>
                      </div>
                      <Switch checked={emailNotifs} onCheckedChange={(v) => { setEmailNotifs(v); toast.success(`Email notifications ${v ? "enabled" : "disabled"}`); }} />
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
                      <Switch checked={pushNotifs} onCheckedChange={(v) => { setPushNotifs(v); toast.success(`Push notifications ${v ? "enabled" : "disabled"}`); }} />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                          <MessageSquare className="size-4 text-purple-400" />
                        </div>
                        <div>
                          <p className="text-sm text-foreground">Slack Integration</p>
                          <p className="text-xs text-muted-foreground">Post alerts to #atlas-ops channel</p>
                        </div>
                      </div>
                      <Switch checked={slackNotifs} onCheckedChange={(v) => { setSlackNotifs(v); toast.success(`Slack notifications ${v ? "enabled" : "disabled"}`); }} />
                    </div>
                  </div>
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card className="p-6 bg-card border-border">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
                    <Zap className="size-4 text-primary" />
                    Alert Types
                  </h3>
                  <p className="text-xs text-muted-foreground mb-4">Configure which events trigger notifications.</p>
                  <div className="space-y-4">
                    {[
                      { label: "Task Completed", desc: "When a task is marked as complete", state: notifTaskComplete, setter: setNotifTaskComplete },
                      { label: "Distribution Created", desc: "When a new distribution is recorded", state: notifDistribution, setter: setNotifDistribution },
                      { label: "Operator Login", desc: "When any operator authenticates", state: notifLogin, setter: setNotifLogin },
                      { label: "Overdue Tasks", desc: "Daily digest of overdue items", state: notifOverdue, setter: setNotifOverdue },
                      { label: "Weekly Summary", desc: "Automated weekly ops report", state: notifWeekly, setter: setNotifWeekly },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-foreground">{item.label}</p>
                          <p className="text-xs text-muted-foreground">{item.desc}</p>
                        </div>
                        <Switch checked={item.state} onCheckedChange={(v) => { item.setter(v); toast.success(`${item.label} alerts ${v ? "enabled" : "disabled"}`); }} />
                      </div>
                    ))}
                  </div>
                </Card>
              </motion.div>
            </div>
          </TabsContent>

          {/* ═══════════════════ AUDIT LOG TAB ═══════════════════ */}
          <TabsContent value="audit">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="p-6 bg-card border-border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Activity className="size-4 text-primary" />
                    Activity Log
                  </h3>
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={handleRefreshSessions}>
                    <RefreshCw className="size-3 mr-1" /> Refresh
                  </Button>
                </div>
                {sessions.length === 0 ? (
                  <div className="p-8 text-center">
                    <Activity className="size-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                    <p className="text-xs text-muted-foreground">No activity recorded yet. Actions are logged when operators interact with the system.</p>
                  </div>
                ) : (
                  <div className="space-y-0">
                    {sessions.flatMap(s =>
                      s.actions.map((a, i) => ({
                        ...a,
                        operator: s.operator,
                        ip: s.ip,
                        key: `${s.id}-${i}`,
                      }))
                    )
                      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
                      .slice(0, 50)
                      .map((entry) => (
                        <div key={entry.key} className="flex items-center gap-4 py-3 border-b border-border last:border-0">
                          <div className="size-2 rounded-full bg-primary/50 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground">{entry.action}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {entry.operator}
                              {entry.detail ? ` — ${entry.detail}` : ""}
                            </p>
                          </div>
                          <span className="text-[10px] font-mono text-muted-foreground shrink-0">{entry.ip}</span>
                          <span className="text-[10px] font-mono text-muted-foreground shrink-0 flex items-center gap-1">
                            <Clock className="size-3" />
                            {formatRelativeTime(entry.time)}
                          </span>
                        </div>
                      ))}
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

// Helper to trigger CSV download
function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
