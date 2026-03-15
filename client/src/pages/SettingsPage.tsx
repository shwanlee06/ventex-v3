// ============================================================================
// Settings Page — Swiss Instrument design
// System configuration, security, and preferences
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
} from "lucide-react";
import { useState, useCallback } from "react";
import { toast } from "sonner";

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

const AUDIT_LOG = [
  { time: "2 min ago", action: "Login", user: "ATLAS Admin", ip: "192.168.1.1" },
  { time: "15 min ago", action: "Task completed", user: "ATLAS Admin", ip: "192.168.1.1" },
  { time: "1h ago", action: "SPV updated", user: "ATLAS Admin", ip: "192.168.1.1" },
  { time: "3h ago", action: "Distribution created", user: "ATLAS Admin", ip: "192.168.1.1" },
  { time: "6h ago", action: "Venture added", user: "ATLAS Admin", ip: "192.168.1.1" },
  { time: "12h ago", action: "Login", user: "ATLAS Admin", ip: "10.0.0.5" },
];

export default function SettingsConfigPage() {
  const [darkMode, setDarkMode] = useState(true);
  const [compactView, setCompactView] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [apiKey, setApiKey] = useState("atl_sk_••••••••••••••••••••");
  const [showKey, setShowKey] = useState(false);
  const [soc2Items, setSoc2Items] = useState(SOC2_ITEMS);

  const handleToggleSoc2 = useCallback((id: string) => {
    setSoc2Items(prev => prev.map(item =>
      item.id === id ? { ...item, done: !item.done } : item
    ));
    toast.success("Compliance item updated");
  }, []);

  const completedCount = soc2Items.filter(i => i.done).length;

  return (
    <DashboardLayout title="Settings" subtitle="SYSTEM CONFIGURATION">
      <div className="p-6 max-w-5xl mx-auto">
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="bg-secondary/30 border border-border">
            <TabsTrigger value="general" className="text-xs gap-1.5">
              <Zap className="size-3" /> General
            </TabsTrigger>
            <TabsTrigger value="security" className="text-xs gap-1.5">
              <Shield className="size-3" /> Security
            </TabsTrigger>
            <TabsTrigger value="compliance" className="text-xs gap-1.5">
              <FileText className="size-3" /> Compliance
            </TabsTrigger>
            <TabsTrigger value="audit" className="text-xs gap-1.5">
              <Activity className="size-3" /> Audit Log
            </TabsTrigger>
          </TabsList>

          {/* General Tab */}
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
                      <Switch checked={darkMode} onCheckedChange={setDarkMode} />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-foreground">Compact View</p>
                        <p className="text-xs text-muted-foreground">Reduce spacing for denser information display</p>
                      </div>
                      <Switch checked={compactView} onCheckedChange={setCompactView} />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-foreground">Auto-Refresh Data</p>
                        <p className="text-xs text-muted-foreground">Automatically refresh dashboard data every 30s</p>
                      </div>
                      <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} />
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowKey(!showKey)}
                          className="shrink-0"
                        >
                          <Eye className="size-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText("atl_sk_7f8a9b2c3d4e5f6g7h8i9j0k");
                            toast.success("API key copied to clipboard");
                          }}
                          className="shrink-0 text-xs"
                        >
                          Copy
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground font-mono">WEBHOOK URL</Label>
                      <Input
                        defaultValue="https://hooks.atlas.vc/events"
                        className="bg-secondary/30 border-border text-sm font-mono"
                      />
                    </div>
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

          {/* Security Tab */}
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
                      <p className="text-sm text-foreground">MFA enabled</p>
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
            </div>
          </TabsContent>

          {/* Compliance Tab */}
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
                {/* Progress bar */}
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

          {/* Audit Log Tab */}
          <TabsContent value="audit">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="p-6 bg-card border-border">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
                  <Activity className="size-4 text-primary" />
                  Recent Activity
                </h3>
                <div className="space-y-0">
                  {AUDIT_LOG.map((entry, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-4 py-3 border-b border-border last:border-0"
                    >
                      <div className="size-2 rounded-full bg-primary/50 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground">{entry.action}</p>
                        <p className="text-xs text-muted-foreground">{entry.user}</p>
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground shrink-0">{entry.ip}</span>
                      <span className="text-[10px] font-mono text-muted-foreground shrink-0 flex items-center gap-1">
                        <Clock className="size-3" />
                        {entry.time}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
