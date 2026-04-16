// Security Page — Security & Compliance Dashboard
// Tabs: Overview · Users & Roles · Audit Log · Access Control

import DashboardLayout from "@/components/DashboardLayout";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import {
  Shield,
  Lock,
  Users,
  FileText,
  Key,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Eye,
  Pencil,
  Trash2,
  ChevronDown,
  Search,
  Download,
  RefreshCw,
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { motion } from "framer-motion";

type Tab = "overview" | "users" | "audit" | "access" | "tenant";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "Overview", icon: <Shield className="size-4" /> },
  { id: "users", label: "Users & Roles", icon: <Users className="size-4" /> },
  { id: "audit", label: "Audit Log", icon: <FileText className="size-4" /> },
  { id: "access", label: "Access Control", icon: <Key className="size-4" /> },
  { id: "tenant", label: "Tenant Settings", icon: <Lock className="size-4" /> },
];

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  admin: "bg-red-500/10 text-red-400 border-red-500/20",
  manager: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  user: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  client: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  viewer: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  owner: "Full system access — manages all settings, users, and data",
  admin: "Manages ventures, SPVs, tasks, team, audit logs — no system settings",
  manager: "Can view/edit assigned ventures and tasks, manage team",
  user: "Standard access — can create and edit assigned items",
  client: "External client portal — read-only access to assigned ventures",
  viewer: "Read-only access to assigned ventures and SPVs",
};

export default function SecurityPage() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  return (
    <DashboardLayout title="Security" subtitle="COMPLIANCE & CONTROLS">
      <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 pb-24 md:pb-6">
        {/* Tab Bar — horizontal scroll on mobile */}
        <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1 overflow-x-auto -mx-3 sm:mx-0 scrollbar-hide">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 touch-manipulation",
                activeTab === tab.id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && <OverviewTab />}
        {activeTab === "users" && <UsersTab />}
        {activeTab === "audit" && <AuditLogTab />}
        {activeTab === "access" && <AccessControlTab />}
        {activeTab === "tenant" && <TenantSecurityTab />}
      </div>
    </DashboardLayout>
  );
}


function OverviewTab() {
  const { data: status } = trpc.security.getSecurityStatus.useQuery();
  const { data: auditStats } = trpc.security.getAuditStats.useQuery();

  const complianceItems = [
    {
      label: "AES-256 Encryption",
      description: "Application-level encryption for sensitive data fields and file storage",
      active: status?.encryption.aes256 ?? false,
      detail: status?.encryption.algorithm ?? "Not configured",
    },
    {
      label: "Role-Based Access Control",
      description: "6-tier role system with row-level security for ventures and SPVs",
      active: status?.rbac.enabled ?? false,
      detail: `${status?.rbac.totalUsers ?? 0} users, ${status?.rbac.roles?.length ?? 0} roles`,
    },
    {
      label: "Zero-Trust Architecture",
      description: "Every request re-validates session, IP logging, device fingerprinting",
      active: status?.zeroTrust.sessionValidation ?? false,
      detail: "Session validation on every request",
    },
    {
      label: "Audit Trail",
      description: "Comprehensive logging of all access attempts and data mutations",
      active: status?.zeroTrust.auditLogging ?? false,
      detail: `${auditStats?.total ?? 0} events logged`,
    },
    {
      label: "Data Encryption at Rest",
      description: "Sensitive fields encrypted before database storage with envelope encryption",
      active: status?.compliance.dataEncryption ?? false,
      detail: "HMAC-SHA256 key derivation",
    },
    {
      label: "SOC 2 Readiness",
      description: "All compliance controls active and verified",
      active: status?.compliance.soc2Ready ?? false,
      detail: status?.compliance.soc2Ready ? "All controls active" : "Pending encryption setup",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      <div className={cn(
        "rounded-lg border p-4 sm:p-6",
        status?.compliance.soc2Ready
          ? "bg-emerald-500/5 border-emerald-500/20"
          : "bg-amber-500/5 border-amber-500/20"
      )}>
        <div className="flex items-center gap-3 mb-2">
          {status?.compliance.soc2Ready ? (
            <CheckCircle2 className="size-6 text-emerald-400" />
          ) : (
            <AlertTriangle className="size-6 text-amber-400" />
          )}
          <h2 className="text-sm sm:text-lg font-semibold text-foreground">
            {status?.compliance.soc2Ready ? "Security Controls Active" : "SOC 2 Type II Readiness — In Progress"}
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {status?.compliance.soc2Ready
            ? "All technical security controls are active. AES-256 encryption, RBAC, zero-trust validation, and audit logging are fully operational. SOC 2 Type II audit window targeted."
            : "Some security controls need configuration. Complete the setup below to advance SOC 2 Type II readiness."
          }
        </p>
      </div>

      {/* Compliance Checklist */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {complianceItems.map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-card border border-border rounded-lg p-4"
          >
            <div className="flex items-start gap-3">
              <div className={cn(
                "size-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                item.active ? "bg-emerald-500/10" : "bg-zinc-500/10"
              )}>
                {item.active ? (
                  <CheckCircle2 className="size-4 text-emerald-400" />
                ) : (
                  <XCircle className="size-4 text-zinc-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-foreground">{item.label}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                <span className="text-[10px] font-mono text-muted-foreground mt-1 block">{item.detail}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
        <div className="bg-card border border-border rounded-lg p-3 sm:p-4">
          <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground">Total Events</span>
          <p className="text-base sm:text-2xl font-mono font-semibold text-foreground mt-1">{auditStats?.total ?? 0}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3 sm:p-4">
          <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground">Today</span>
          <p className="text-base sm:text-2xl font-mono font-semibold text-foreground mt-1">{auditStats?.today ?? 0}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3 sm:p-4">
          <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground">Access Denied</span>
          <p className="text-base sm:text-2xl font-mono font-semibold text-red-400 mt-1">{auditStats?.denied ?? 0}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3 sm:p-4">
          <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-muted-foreground">Errors</span>
          <p className="text-base sm:text-2xl font-mono font-semibold text-amber-400 mt-1">{auditStats?.errors ?? 0}</p>
        </div>
      </div>

      {/* Encryption Details */}
      <div className="bg-card border border-border rounded-lg p-3 sm:p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Lock className="size-4 text-primary" />
          Encryption Configuration
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-muted-foreground">Algorithm</span>
            <p className="font-mono text-foreground mt-0.5">{status?.encryption.algorithm ?? "—"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Key Derivation</span>
            <p className="font-mono text-foreground mt-0.5">{status?.encryption.keyDerivation ?? "—"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Status</span>
            <p className={cn("font-mono mt-0.5", status?.encryption.aes256 ? "text-emerald-400" : "text-amber-400")}>
              {status?.encryption.aes256 ? "Active" : "Not Configured"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


function UsersTab() {
  const { data: users, refetch } = trpc.security.listUsers.useQuery();
  const updateRole = trpc.security.updateUserRole.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("User role updated");
    },
    onError: (err) => toast.error(err.message),
  });
  const deleteUser = trpc.security.deleteUser.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("User removed successfully");
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const [editingUser, setEditingUser] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string; email: string } | null>(null);

  return (
    <div className="space-y-6">
      {/* Role Legend */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Role Hierarchy</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(ROLE_DESCRIPTIONS).map(([role, desc]) => (
            <div key={role} className="flex items-start gap-2">
              <span className={cn("text-[10px] font-mono font-medium px-2 py-0.5 rounded border uppercase", ROLE_COLORS[role])}>
                {role}
              </span>
              <span className="text-xs text-muted-foreground">{desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Registered Users</h3>
          <span className="text-[10px] font-mono text-muted-foreground">{users?.length ?? 0} users</span>
        </div>
        <div className="divide-y divide-border">
          {users?.map((user) => (
            <div key={user.id} className="px-3 sm:px-4 py-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                  {(user.name ?? "?")[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{user.name ?? "Unknown"}</p>
                  <p className="text-xs text-muted-foreground">{user.email ?? "No email"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {editingUser === user.id ? (
                  <Select
                    value={user.role}
                    onValueChange={(val) => {
                      updateRole.mutate({ userId: user.id, role: val as any });
                      setEditingUser(null);
                    }}
                  >
                    <SelectTrigger className="w-32 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["viewer", "client", "user", "manager", "admin", "owner"].map((r) => (
                        <SelectItem key={r} value={r}>
                          <span className="uppercase text-xs font-mono">{r}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <>
                    <span className={cn("text-[10px] font-mono font-medium px-2 py-0.5 rounded border uppercase", ROLE_COLORS[user.role])}>
                      {user.role}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setEditingUser(user.id)}
                    >
                      <Pencil className="size-3" />
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  onClick={() => setDeleteTarget({ id: user.id, name: user.name ?? "Unknown", email: user.email ?? "" })}
                  title="Remove user"
                >
                  <Trash2 className="size-3" />
                </Button>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {user.lastSignedIn ? new Date(user.lastSignedIn).toLocaleDateString() : "Never"}
                </span>
              </div>
            </div>
          ))}
          {(!users || users.length === 0) && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No users registered yet
            </div>
          )}
        </div>
      </div>
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently remove <strong>{deleteTarget?.name}</strong> ({deleteTarget?.email})?
              This will delete their account, sessions, API keys, and all access grants. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => deleteTarget && deleteUser.mutate({ userId: deleteTarget.id })}
            >
              {deleteUser.isPending ? "Removing..." : "Remove User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


function AuditLogTab() {
  const [filter, setFilter] = useState<{ action?: string; result?: string; entityType?: string }>({});
  const [offset, setOffset] = useState(0);
  const limit = 25;

  const { data, refetch, isLoading } = trpc.security.getAuditLog.useQuery({
    limit,
    offset,
    action: filter.action || undefined,
    result: filter.result as any || undefined,
    entityType: filter.entityType || undefined,
  });

  const entries = data?.entries ?? [];
  const total = data?.total ?? 0;

  const exportMutation = trpc.security.exportAuditLogCsv.useMutation({
    onSuccess: (result) => {
      // Trigger CSV download
      const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${result.rowCount} audit log entries`);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to export audit log");
    },
  });

  const handleExport = () => {
    exportMutation.mutate({
      action: filter.action || undefined,
      result: filter.result as any || undefined,
      entityType: filter.entityType || undefined,
    });
  };

  const resultIcon = (result: string) => {
    switch (result) {
      case "success": return <CheckCircle2 className="size-3 text-emerald-400" />;
      case "denied": return <XCircle className="size-3 text-red-400" />;
      case "error": return <AlertTriangle className="size-3 text-amber-400" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters — horizontal scroll on mobile */}
      <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0 scrollbar-hide">
        <Select value={filter.result ?? "all"} onValueChange={(v) => { setFilter(f => ({ ...f, result: v === "all" ? undefined : v })); setOffset(0); }}>
          <SelectTrigger className="w-28 sm:w-36 h-9 min-h-[36px] text-xs flex-shrink-0">
            <SelectValue placeholder="All Results" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Results</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="denied">Denied</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filter.entityType ?? "all"} onValueChange={(v) => { setFilter(f => ({ ...f, entityType: v === "all" ? undefined : v })); setOffset(0); }}>
          <SelectTrigger className="w-28 sm:w-36 h-9 min-h-[36px] text-xs flex-shrink-0">
            <SelectValue placeholder="All Entities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entities</SelectItem>
            <SelectItem value="venture">Ventures</SelectItem>
            <SelectItem value="spv">SPVs</SelectItem>
            <SelectItem value="task">Tasks</SelectItem>
            <SelectItem value="user">Users</SelectItem>
            <SelectItem value="security">Security</SelectItem>
            <SelectItem value="auth">Auth</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" className="h-9 min-h-[36px] text-xs flex-shrink-0 touch-manipulation" onClick={() => refetch()}>
          <RefreshCw className="size-3 mr-1" />
          Refresh
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="h-9 min-h-[36px] text-xs flex-shrink-0 touch-manipulation"
          onClick={handleExport}
          disabled={exportMutation.isPending}
        >
          <Download className="size-3 mr-1" />
          {exportMutation.isPending ? "Exporting..." : "Export CSV"}
        </Button>

        <span className="text-[10px] font-mono text-muted-foreground ml-auto flex-shrink-0">
          {total}
        </span>
      </div>

      {/* Log Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left px-4 py-2 font-medium">Time</th>
                <th className="text-left px-4 py-2 font-medium">User</th>
                <th className="text-left px-4 py-2 font-medium">Action</th>
                <th className="text-left px-4 py-2 font-medium">Entity</th>
                <th className="text-left px-4 py-2 font-medium">Result</th>
                <th className="text-left px-4 py-2 font-medium">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-accent/30 transition-colors">
                  <td className="px-4 py-2 font-mono text-muted-foreground whitespace-nowrap">
                    {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-2 text-foreground">
                    {entry.userName ?? "System"}
                  </td>
                  <td className="px-4 py-2">
                    <span className="font-mono text-foreground">{entry.action}</span>
                  </td>
                  <td className="px-4 py-2">
                    {entry.entityType && (
                      <span className="text-muted-foreground">
                        {entry.entityType}
                        {entry.entityName && <span className="text-foreground ml-1">· {entry.entityName}</span>}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1">
                      {resultIcon(entry.result)}
                      <span className={cn(
                        "font-mono",
                        entry.result === "success" ? "text-emerald-400" :
                        entry.result === "denied" ? "text-red-400" : "text-amber-400"
                      )}>
                        {entry.result}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2 font-mono text-muted-foreground">
                    {entry.ipAddress ?? "—"}
                  </td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    {isLoading ? "Loading audit log..." : "No audit events found"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > limit && (
            <div className="px-3 sm:px-4 py-3 border-t border-border flex items-center justify-between gap-2">
            <span className="text-[10px] font-mono text-muted-foreground">
              {offset + 1}–{Math.min(offset + limit, total)} of {total}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 min-h-[36px] text-xs touch-manipulation"
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - limit))}
              >
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 min-h-[36px] text-xs touch-manipulation"
                disabled={offset + limit >= total}
                onClick={() => setOffset(offset + limit)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


function AccessControlTab() {
  const { data: permissions } = trpc.security.getMyPermissions.useQuery();

  const allActions = [
    { key: "read", label: "Read Data", description: "View ventures, SPVs, tasks, and other data" },
    { key: "create", label: "Create Records", description: "Create new ventures, tasks, SPVs" },
    { key: "update", label: "Update Records", description: "Edit existing ventures, tasks, SPVs" },
    { key: "delete", label: "Delete Records", description: "Remove ventures, tasks, SPVs" },
    { key: "manage_team", label: "Manage Team", description: "Add/remove team members, assign to ventures" },
    { key: "manage_roles", label: "Manage Roles", description: "Change user roles and permissions" },
    { key: "manage_settings", label: "System Settings", description: "Modify system configuration" },
    { key: "manage_access", label: "Access Control", description: "Grant/revoke venture access" },
    { key: "export_data", label: "Export Data", description: "Download data exports and reports" },
    { key: "view_audit_log", label: "View Audit Log", description: "Access security audit trail" },
    { key: "process_documents", label: "Process Documents", description: "Run AI document analysis" },
    { key: "manage_spvs", label: "Manage SPVs", description: "Create and manage SPV entities" },
    { key: "manage_distributions", label: "Manage Distributions", description: "Create and manage distributions" },
  ];

  return (
    <div className="space-y-6">
      {/* Current User Permissions */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">Your Permissions</h3>
          {permissions && (
            <span className={cn("text-[10px] font-mono font-medium px-2 py-0.5 rounded border uppercase", ROLE_COLORS[permissions.role])}>
              {permissions.role}
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {allActions.map((action) => {
            const granted = permissions?.permissions[action.key] ?? false;
            return (
              <div
                key={action.key}
                className={cn(
                  "flex items-start gap-2 p-3 rounded-md border",
                  granted ? "border-emerald-500/20 bg-emerald-500/5" : "border-border bg-card"
                )}
              >
                {granted ? (
                  <CheckCircle2 className="size-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="size-4 text-zinc-500 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <p className={cn("text-xs font-medium", granted ? "text-foreground" : "text-muted-foreground")}>
                    {action.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{action.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Permission Matrix */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Permission Matrix</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Role-to-permission mapping across the system</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Permission</th>
                {["viewer", "client", "user", "manager", "admin", "owner"].map((role) => (
                  <th key={role} className="text-center px-3 py-2">
                    <span className={cn("text-[10px] font-mono font-medium px-1.5 py-0.5 rounded border uppercase", ROLE_COLORS[role])}>
                      {role}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {allActions.map((action) => (
                <tr key={action.key} className="hover:bg-accent/20">
                  <td className="px-4 py-2 text-foreground font-medium">{action.label}</td>
                  {["viewer", "client", "user", "manager", "admin", "owner"].map((role) => {
                    const matrix: Record<string, string[]> = {
                      viewer: ["read"],
                      client: ["read"],
                      user: ["read", "create", "update", "process_documents"],
                      manager: ["read", "create", "update", "delete", "manage_team", "process_documents", "manage_spvs"],
                      admin: ["read", "create", "update", "delete", "manage_team", "manage_roles", "export_data", "view_audit_log", "process_documents", "manage_spvs", "manage_distributions"],
                      owner: allActions.map(a => a.key),
                    };
                    const has = matrix[role]?.includes(action.key) ?? false;
                    return (
                      <td key={role} className="text-center px-3 py-2">
                        {has ? (
                          <CheckCircle2 className="size-3.5 text-emerald-400 mx-auto" />
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


// ─── WS2: Tenant Security Settings Tab ──────────────────────────────────

function TenantSecurityTab() {
  const { data: settings, isLoading } = trpc.security.getOrgSecuritySettings.useQuery({});
  const utils = trpc.useUtils();
  const updateSettings = trpc.security.updateOrgSecuritySettings.useMutation({
    onSuccess: () => {
      utils.security.getOrgSecuritySettings.invalidate();
      toast.success("Security settings updated");
    },
    onError: (err) => toast.error(err.message),
  });

  const [idleTimeout, setIdleTimeout] = useState(30);
  const [absoluteTimeout, setAbsoluteTimeout] = useState(8);
  const [mfaEnforced, setMfaEnforced] = useState(false);
  const [ipAllowlist, setIpAllowlist] = useState("");
  const [dirty, setDirty] = useState(false);

  // Sync form state when data loads
  useEffect(() => {
    if (settings) {
      setIdleTimeout(settings.sessionIdleTimeoutMinutes);
      setAbsoluteTimeout(settings.sessionAbsoluteTimeoutHours);
      setMfaEnforced(settings.mfaEnforced);
      setIpAllowlist(settings.ipAllowlist?.join("\n") || "");
      setDirty(false);
    }
  }, [settings]);

  const handleSave = () => {
    const parsed = ipAllowlist.trim()
      ? ipAllowlist.split("\n").map(s => s.trim()).filter(Boolean)
      : null;
    updateSettings.mutate({
      sessionIdleTimeoutMinutes: idleTimeout,
      sessionAbsoluteTimeoutHours: absoluteTimeout,
      mfaEnforced,
      ipAllowlist: parsed,
    });
    setDirty(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 bg-card border border-border rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-card p-4 sm:p-6">
        <h3 className="text-sm font-semibold text-foreground mb-1">Organization Security Settings</h3>
        <p className="text-xs text-muted-foreground mb-6">
          Configure session timeouts, MFA enforcement, and IP restrictions for <span className="font-medium text-foreground">{settings?.name || "this organization"}</span>.
        </p>

        <div className="space-y-6">
          {/* Session Idle Timeout */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <label className="text-xs font-medium text-foreground">Idle Session Timeout</label>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Users are logged out after this many minutes of inactivity. Maximum 30 minutes.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={5}
                max={30}
                value={idleTimeout}
                onChange={(e) => { setIdleTimeout(Number(e.target.value)); setDirty(true); }}
                className="w-20 h-8 rounded-md border border-border bg-background px-2 text-sm text-foreground font-mono"
              />
              <span className="text-xs text-muted-foreground">min</span>
            </div>
          </div>

          {/* Absolute Session Timeout */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <label className="text-xs font-medium text-foreground">Absolute Session Timeout</label>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Users must re-authenticate after this many hours regardless of activity. Maximum 8 hours.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={8}
                value={absoluteTimeout}
                onChange={(e) => { setAbsoluteTimeout(Number(e.target.value)); setDirty(true); }}
                className="w-20 h-8 rounded-md border border-border bg-background px-2 text-sm text-foreground font-mono"
              />
              <span className="text-xs text-muted-foreground">hr</span>
            </div>
          </div>

          {/* MFA Enforcement */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <label className="text-xs font-medium text-foreground">Enforce MFA for Privileged Roles</label>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Require TOTP multi-factor authentication for all admin, owner, and manager roles.
              </p>
            </div>
            <button
              onClick={() => { setMfaEnforced(!mfaEnforced); setDirty(true); }}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0",
                mfaEnforced ? "bg-primary" : "bg-zinc-700"
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                  mfaEnforced ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
          </div>

          {/* IP Allowlist */}
          <div>
            <label className="text-xs font-medium text-foreground">IP Allowlist (CIDR)</label>
            <p className="text-[10px] text-muted-foreground mt-0.5 mb-2">
              Restrict access to specific IP ranges. One CIDR range per line. Leave empty to allow all IPs.
            </p>
            <textarea
              value={ipAllowlist}
              onChange={(e) => { setIpAllowlist(e.target.value); setDirty(true); }}
              placeholder={"10.0.0.0/8\n192.168.1.0/24\n203.0.113.42/32"}
              rows={4}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground/40 resize-none"
            />
          </div>

          {/* SSO Status (read-only for now) */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 opacity-60">
            <div>
              <label className="text-xs font-medium text-foreground">Enterprise SSO (SAML 2.0)</label>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {settings?.ssoEnabled
                  ? `Active via ${settings.ssoProvider || "SAML"}`
                  : "Not configured — requires legal review and WorkOS integration"}
              </p>
            </div>
            <span className={cn(
              "text-[10px] font-medium px-2 py-1 rounded",
              settings?.ssoEnabled
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-zinc-500/10 text-zinc-400"
            )}>
              {settings?.ssoEnabled ? "Active" : "Pending"}
            </span>
          </div>

          {/* Save Button */}
          {dirty && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-end pt-2"
            >
              <Button
                onClick={handleSave}
                disabled={updateSettings.isPending}
                className="text-xs"
              >
                {updateSettings.isPending ? "Saving..." : "Save Security Settings"}
              </Button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Compliance Notes */}
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="size-4 text-amber-400 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-xs font-medium text-foreground mb-1">Enterprise SSO & SCIM</h4>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              SAML 2.0 SSO and SCIM 2.0 provisioning are planned for enterprise tenants. These features require
              WorkOS integration and legal review before activation. Contact your account manager to begin the
              enterprise onboarding process. Session deprovisioning SLA: 60 seconds after IdP revocation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
