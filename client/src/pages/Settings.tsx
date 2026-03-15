// ============================================================================
// Settings / Security Page — Swiss Instrument design
// Security posture, tenant isolation, SOC 2 readiness checklist
// ============================================================================

import DashboardLayout from "@/components/DashboardLayout";
import { cn } from "@/lib/utils";
import { CLIENTS } from "@/lib/data";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";
import {
  Shield,
  Lock,
  KeyRound,
  FileText,
  Server,
  CheckCircle2,
  AlertTriangle,
  Eye,
} from "lucide-react";
import { useState } from "react";

interface SecurityItem {
  label: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
}

const SOC2_CHECKLIST = [
  { id: "s1", label: "Access control policies documented", completed: true },
  { id: "s2", label: "Data encryption at rest (AES-256)", completed: true },
  { id: "s3", label: "Data encryption in transit (TLS 1.3)", completed: true },
  { id: "s4", label: "Multi-factor authentication enforced", completed: true },
  { id: "s5", label: "Audit logging enabled", completed: true },
  { id: "s6", label: "Incident response plan documented", completed: true },
  { id: "s7", label: "Vendor risk assessment completed", completed: false },
  { id: "s8", label: "Penetration testing scheduled", completed: false },
  { id: "s9", label: "Business continuity plan reviewed", completed: false },
  { id: "s10", label: "Employee security training completed", completed: true },
  { id: "s11", label: "Data retention policy defined", completed: true },
  { id: "s12", label: "Change management process documented", completed: false },
];

export default function SettingsPage() {
  const [auditLog, setAuditLog] = useState(true);
  const [mfaEnabled, setMfaEnabled] = useState(true);

  const securityItems: SecurityItem[] = [
    {
      label: "Encryption at Rest",
      description: "AES-256 encryption for all stored data",
      icon: <Lock className="size-4 text-emerald-400" />,
      enabled: true,
    },
    {
      label: "Encryption in Transit",
      description: "TLS 1.3 for all data transmission",
      icon: <KeyRound className="size-4 text-emerald-400" />,
      enabled: true,
    },
    {
      label: "Multi-Factor Authentication",
      description: "TOTP-based MFA for all admin accounts",
      icon: <Shield className="size-4 text-emerald-400" />,
      enabled: mfaEnabled,
    },
  ];

  const completedCount = SOC2_CHECKLIST.filter((item) => item.completed).length;
  const progressPercent = Math.round((completedCount / SOC2_CHECKLIST.length) * 100);

  return (
    <DashboardLayout title="Settings" subtitle="SECURITY & COMPLIANCE">
      <div className="p-4 md:p-6 space-y-6 max-w-4xl">
        {/* Security Posture */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-card border border-border rounded-lg"
        >
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Security Posture</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Platform-wide security configuration</p>
          </div>

          <div className="p-5 space-y-4">
            {securityItems.map((item) => (
              <div key={item.label} className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{item.icon}</div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="size-3" />
                  Active
                </span>
              </div>
            ))}

            <Separator />

            {/* Toggleable settings */}
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <Eye className="size-4 text-blue-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">MFA Enforcement</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Require MFA for all user accounts</p>
                </div>
              </div>
              <Switch checked={mfaEnabled} onCheckedChange={setMfaEnabled} />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <FileText className="size-4 text-blue-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Audit Logging</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Record all system actions for compliance review</p>
                </div>
              </div>
              <Switch checked={auditLog} onCheckedChange={setAuditLog} />
            </div>
          </div>
        </motion.div>

        {/* Tenant Isolation */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="bg-card border border-border rounded-lg"
        >
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Tenant Isolation</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Data isolation status per client</p>
          </div>

          <div className="p-5 space-y-3">
            {CLIENTS.map((client) => (
              <div key={client.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-md">
                <div className="flex items-center gap-3">
                  <img src={client.avatarUrl} alt={client.name} className="size-8 rounded-md object-cover" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{client.name}</p>
                    <p className="text-[10px] font-mono text-muted-foreground">
                      {client.status === "live" ? "Production tenant" : "Staging tenant"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Server className="size-3.5 text-emerald-400" />
                  <span className="text-[10px] font-medium text-emerald-400">Isolated</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* SOC 2 Readiness */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="bg-card border border-border rounded-lg"
        >
          <div className="px-5 py-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground">SOC 2 Readiness</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Type II compliance checklist</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-foreground">{completedCount}/{SOC2_CHECKLIST.length}</span>
                <span className="text-[10px] text-muted-foreground">({progressPercent}%)</span>
              </div>
            </div>
            <div className="mt-3">
              <Progress value={progressPercent} className="h-1.5" />
            </div>
          </div>

          <div className="p-5 space-y-2">
            {SOC2_CHECKLIST.map((item) => (
              <div key={item.id} className="flex items-center gap-3 py-1.5">
                <Checkbox checked={item.completed} disabled className="size-3.5" />
                <span
                  className={cn(
                    "text-sm",
                    item.completed ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {item.label}
                </span>
                {!item.completed && (
                  <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-amber-400">
                    <AlertTriangle className="size-3" />
                    Pending
                  </span>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
