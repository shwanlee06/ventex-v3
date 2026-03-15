// ============================================================================
// Venture Detail Page — /ventures/:slug
// Sections: Key Details, Team, Tasks, Files, Activity Log
// ============================================================================

import DashboardLayout from "@/components/DashboardLayout";
import StatusBadge from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import {
  VENTURES, TASKS, TEAM, STATUS_CONFIG, getThemeColor, getTaskStatusFromDate,
  formatDate, type Venture, type Task, type TeamMember,
} from "@/lib/data";
import { findVentureBySlug, slugify } from "@/lib/slugify";
import { useRoute, useLocation, Link } from "wouter";
import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import { logAction } from "@/lib/operatorSession";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Edit3, Save, Plus, Trash2, FileText, Upload, MessageSquare,
  CheckCircle2, User, Clock, ChevronRight, File, Image, FileSpreadsheet,
  X, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";

// ── Types ─────────────────────────────────────────────────────────────────

interface AssignedMember {
  id: string;
  name: string;
  role: string;
  responsibility: string;
}

interface AttachedFile {
  id: string;
  name: string;
  size: string;
  type: string;
  dateAdded: string;
}

interface ActivityEntry {
  id: string;
  action: string;
  timestamp: Date;
}

interface VentureTask extends Task {
  ventureId?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────

const STAGES = ["In Validation", "Active ventures", "In Fundraising", "On Hold"];
const STATUSES = ["In progress", "On-Hold", "Completed", "Closed"];
const SECTORS = ["Real Estate", "F&B", "Yacht", "Entertainment", "Oil & Gas", "Others"];
const PRIORITIES = ["High", "Medium", "Low"];

function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext || "")) return <Image className="size-4 text-blue-400" />;
  if (["xls", "xlsx", "csv"].includes(ext || "")) return <FileSpreadsheet className="size-4 text-emerald-400" />;
  if (["pdf"].includes(ext || "")) return <FileText className="size-4 text-red-400" />;
  return <File className="size-4 text-muted-foreground" />;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getInitials(name: string): string {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

// ── Component ─────────────────────────────────────────────────────────────

export default function VentureDetail() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/ventures/:slug");
  const slug = params?.slug || "";

  // Find venture
  const baseVenture = findVentureBySlug(VENTURES, slug);

  // ── State ───────────────────────────────────────────────────────────────
  const [venture, setVenture] = useState<Venture | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "", theme: "" as string, location: "", stage: "", status: "",
    notes: "", dateAdded: "",
  });

  // Team
  const [assignedMembers, setAssignedMembers] = useState<AssignedMember[]>([]);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignMemberId, setAssignMemberId] = useState("");
  const [assignResponsibility, setAssignResponsibility] = useState("");

  // Tasks
  const [ventureTasks, setVentureTasks] = useState<VentureTask[]>([]);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskDue, setNewTaskDue] = useState("");
  const [newTaskAssignee, setNewTaskAssignee] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("Medium");

  // Files
  const [files, setFiles] = useState<AttachedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Activity
  const [activity, setActivity] = useState<ActivityEntry[]>([]);

  // ── Initialize from data ────────────────────────────────────────────────
  useEffect(() => {
    if (!baseVenture) return;
    setVenture({ ...baseVenture });
    setEditForm({
      name: baseVenture.name,
      theme: baseVenture.theme,
      location: baseVenture.location,
      stage: baseVenture.stage,
      status: baseVenture.status,
      notes: baseVenture.currentStatus || "",
      dateAdded: "2026-01-15",
    });

    // Pre-populate tasks linked to this venture
    const linked = TASKS.filter(t =>
      t.ventureLink && baseVenture.name.toLowerCase().includes(t.ventureLink.split(" - ")[0].toLowerCase())
    );
    setVentureTasks(linked.map(t => ({ ...t })));

    // Pre-populate team (assign first 2 team members based on task assignees)
    const assignees = new Set<string>();
    linked.forEach(t => t.assignees.forEach(a => assignees.add(a)));
    const preAssigned: AssignedMember[] = [];
    assignees.forEach(name => {
      const member = TEAM.find(m => m.name === name);
      if (member) {
        preAssigned.push({
          id: member.id,
          name: member.name,
          role: member.role,
          responsibility: `Working on ${baseVenture.name}`,
        });
      }
    });
    setAssignedMembers(preAssigned);

    // Initial activity
    setActivity([
      { id: "init-1", action: `Venture "${baseVenture.name}" viewed`, timestamp: new Date() },
    ]);
  }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ────────────────────────────────────────────────────────────

  const addActivity = useCallback((action: string) => {
    setActivity(prev => [
      { id: `act-${Date.now()}-${Math.random()}`, action, timestamp: new Date() },
      ...prev,
    ]);
  }, []);

  const handleSaveDetails = useCallback(() => {
    if (!venture) return;
    setVenture(prev => prev ? {
      ...prev,
      name: editForm.name,
      theme: editForm.theme as Venture["theme"],
      location: editForm.location,
      stage: editForm.stage as Venture["stage"],
      status: editForm.status,
      currentStatus: editForm.notes,
    } : null);
    setIsEditing(false);
    addActivity(`Details updated — status: ${editForm.status}, stage: ${editForm.stage}`);
    logAction("Venture edited", editForm.name);
    toast.success("Venture details saved");
  }, [venture, editForm, addActivity]);

  const handleAssignMember = useCallback(() => {
    if (!assignMemberId) { toast.error("Select a team member"); return; }
    const member = TEAM.find(m => m.id === assignMemberId);
    if (!member) return;
    if (assignedMembers.find(m => m.id === member.id)) {
      toast.error(`${member.name} is already assigned`);
      return;
    }
    setAssignedMembers(prev => [...prev, {
      id: member.id, name: member.name, role: member.role,
      responsibility: assignResponsibility || "General support",
    }]);
    setAssignModalOpen(false);
    setAssignMemberId("");
    setAssignResponsibility("");
    addActivity(`${member.name} assigned — ${assignResponsibility || "General support"}`);
    logAction("Team member assigned", member.name);
    toast.success(`${member.name} assigned to venture`);
  }, [assignMemberId, assignResponsibility, assignedMembers, addActivity]);

  const handleRemoveMember = useCallback((memberId: string) => {
    const member = assignedMembers.find(m => m.id === memberId);
    setAssignedMembers(prev => prev.filter(m => m.id !== memberId));
    if (member) {
      addActivity(`${member.name} removed from venture`);
      toast.info(`${member.name} removed`);
    }
  }, [assignedMembers, addActivity]);

  const handleAddTask = useCallback(() => {
    if (!newTaskName.trim()) { toast.error("Task name is required"); return; }
    const newTask: VentureTask = {
      id: `task-${Date.now()}`,
      title: newTaskName.trim(),
      status: "open",
      dueDate: newTaskDue || new Date().toISOString().split("T")[0],
      priority: newTaskPriority,
      assignees: newTaskAssignee ? [newTaskAssignee] : [],
      ventureLink: venture?.name,
    };
    setVentureTasks(prev => [...prev, newTask]);
    setAddTaskOpen(false);
    setNewTaskName(""); setNewTaskDue(""); setNewTaskAssignee(""); setNewTaskPriority("Medium");
    addActivity(`Task added: ${newTask.title}`);
    logAction("Task added", newTask.title);
    toast.success("Task added");
  }, [newTaskName, newTaskDue, newTaskAssignee, newTaskPriority, venture, addActivity]);

  const handleToggleTask = useCallback((taskId: string) => {
    setVentureTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      const newStatus = t.status === "complete" ? "open" : "complete";
      addActivity(`Task "${t.title}" marked ${newStatus}`);
      return { ...t, status: newStatus as Task["status"] };
    }));
    toast.success("Task updated");
  }, [addActivity]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;
    Array.from(fileList).forEach(f => {
      const newFile: AttachedFile = {
        id: `file-${Date.now()}-${Math.random()}`,
        name: f.name,
        size: formatFileSize(f.size),
        type: f.type || "application/octet-stream",
        dateAdded: new Date().toISOString().split("T")[0],
      };
      setFiles(prev => [...prev, newFile]);
      addActivity(`File attached: ${f.name}`);
    });
    logAction("File attached", `${fileList.length} file(s)`);
    toast.success(`${fileList.length} file(s) attached`);
    e.target.value = "";
  }, [addActivity]);

  const handleRemoveFile = useCallback((fileId: string) => {
    const file = files.find(f => f.id === fileId);
    setFiles(prev => prev.filter(f => f.id !== fileId));
    if (file) {
      addActivity(`File removed: ${file.name}`);
      toast.info(`${file.name} removed`);
    }
  }, [files, addActivity]);

  // ── 404 ─────────────────────────────────────────────────────────────────
  if (!baseVenture) {
    return (
      <DashboardLayout title="Venture Not Found" subtitle="">
        <div className="p-6 text-center">
          <AlertTriangle className="size-8 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-sm text-muted-foreground mb-4">This venture does not exist.</p>
          <Link href="/ventures">
            <Button variant="outline" size="sm" className="text-xs gap-2">
              <ArrowLeft className="size-3.5" /> Back to Ventures
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const tc = getThemeColor(venture?.theme || baseVenture.theme);
  const displayVenture = venture || baseVenture;

  return (
    <DashboardLayout title={displayVenture.name} subtitle={displayVenture.theme.toUpperCase()}>
      <div className="p-4 md:p-6 space-y-6">
        {/* ── Header Bar ─────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/ventures">
              <button className="size-8 rounded-md border border-border flex items-center justify-center hover:bg-accent transition-colors">
                <ArrowLeft className="size-4 text-muted-foreground" />
              </button>
            </Link>
            <div>
              <h1 className="text-lg font-semibold text-foreground">{displayVenture.name}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-[10px] font-medium px-2 py-0.5 rounded" style={{ backgroundColor: `${tc.color}15`, color: tc.color }}>
                  {displayVenture.theme}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">{displayVenture.location}</span>
                <span className="text-[10px] text-muted-foreground">·</span>
                <span className="text-[10px] text-muted-foreground">{displayVenture.stage}</span>
                <StatusBadge
                  label={displayVenture.status}
                  bg={displayVenture.status === "In progress" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : displayVenture.status === "On-Hold" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-secondary text-muted-foreground border-border"}
                  dot={displayVenture.status === "In progress" ? "bg-emerald-400" : displayVenture.status === "On-Hold" ? "bg-amber-400" : "bg-muted-foreground"}
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => setIsEditing(!isEditing)}>
              <Edit3 className="size-3.5 mr-1" /> Edit Details
            </Button>
            <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => fileInputRef.current?.click()}>
              <Upload className="size-3.5 mr-1" /> Add File
            </Button>
            <Button size="sm" className="text-xs h-8" onClick={() => navigate(`/agent`)}>
              <MessageSquare className="size-3.5 mr-1" /> Chat with AI →
            </Button>
          </div>
        </div>

        {/* ── Main Content ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Section A — Key Details */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card border border-border rounded-lg">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">Key Details</h2>
                {isEditing && (
                  <Button size="sm" className="text-xs h-7" onClick={handleSaveDetails}>
                    <Save className="size-3 mr-1" /> Save
                  </Button>
                )}
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Venture Name</Label>
                  {isEditing ? (
                    <Input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} className="mt-1 h-8 text-xs" />
                  ) : (
                    <p className="text-xs text-foreground mt-1">{displayVenture.name}</p>
                  )}
                </div>
                <div>
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Sector</Label>
                  {isEditing ? (
                    <Select value={editForm.theme} onValueChange={v => setEditForm(p => ({ ...p, theme: v }))}>
                      <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{SECTORS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  ) : (
                    <p className="text-xs mt-1" style={{ color: tc.color }}>{displayVenture.theme}</p>
                  )}
                </div>
                <div>
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Location</Label>
                  {isEditing ? (
                    <Input value={editForm.location} onChange={e => setEditForm(p => ({ ...p, location: e.target.value }))} className="mt-1 h-8 text-xs" />
                  ) : (
                    <p className="text-xs text-foreground mt-1">{displayVenture.location}</p>
                  )}
                </div>
                <div>
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Stage</Label>
                  {isEditing ? (
                    <Select value={editForm.stage} onValueChange={v => setEditForm(p => ({ ...p, stage: v }))}>
                      <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  ) : (
                    <p className="text-xs text-foreground mt-1">{displayVenture.stage}</p>
                  )}
                </div>
                <div>
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Status</Label>
                  {isEditing ? (
                    <Select value={editForm.status} onValueChange={v => setEditForm(p => ({ ...p, status: v }))}>
                      <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  ) : (
                    <p className="text-xs text-foreground mt-1">{displayVenture.status}</p>
                  )}
                </div>
                <div>
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Date Added</Label>
                  <p className="text-xs font-mono text-muted-foreground mt-1">{editForm.dateAdded}</p>
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Description / Notes</Label>
                  {isEditing ? (
                    <Textarea value={editForm.notes} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} className="mt-1 text-xs min-h-[80px]" />
                  ) : (
                    <p className="text-xs text-muted-foreground mt-1 italic">{displayVenture.currentStatus || "No notes yet."}</p>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Section C — Open Tasks */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-card border border-border rounded-lg">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">Tasks</h2>
                <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setAddTaskOpen(true)}>
                  <Plus className="size-3 mr-1" /> Add Task
                </Button>
              </div>
              {ventureTasks.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-xs text-muted-foreground">No tasks linked to this venture yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {ventureTasks.map(task => {
                    const rs = getTaskStatusFromDate(task);
                    const sc = STATUS_CONFIG[rs];
                    return (
                      <div key={task.id} className="px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={task.status === "complete"}
                            onCheckedChange={() => handleToggleTask(task.id)}
                            className="size-3.5"
                          />
                          <div>
                            <span className={cn("text-xs font-medium text-foreground", task.status === "complete" && "line-through opacity-50")}>
                              {task.title}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] font-mono text-muted-foreground">Due {formatDate(task.dueDate)}</span>
                              {task.assignees.length > 0 && (
                                <span className="text-[10px] text-muted-foreground">· {task.assignees[0]}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded",
                            task.priority === "High" ? "bg-red-500/10 text-red-400" :
                            task.priority === "Medium" ? "bg-amber-500/10 text-amber-400" :
                            "bg-secondary text-muted-foreground"
                          )}>{task.priority}</span>
                          <StatusBadge label={sc.label} bg={sc.bg} dot={sc.dot} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>

            {/* Section D — Attached Files */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-card border border-border rounded-lg">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">Attached Files</h2>
                <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => fileInputRef.current?.click()}>
                  <Plus className="size-3 mr-1" /> Attach File
                </Button>
                <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />
              </div>
              {files.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-xs text-muted-foreground">No files attached yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {files.map(file => (
                    <div key={file.id} className="px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getFileIcon(file.name)}
                        <div>
                          <span className="text-xs font-medium text-foreground">{file.name}</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-mono text-muted-foreground">{file.size}</span>
                            <span className="text-[10px] text-muted-foreground">· {file.dateAdded}</span>
                          </div>
                        </div>
                      </div>
                      <button onClick={() => handleRemoveFile(file.id)} className="size-7 rounded-md flex items-center justify-center hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors">
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Section E — Activity Log */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-card border border-border rounded-lg">
              <div className="px-4 py-3 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground">Activity Log</h2>
              </div>
              <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
                {activity.map(entry => (
                  <div key={entry.id} className="px-4 py-3 flex items-start gap-3">
                    <div className="size-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs text-foreground">{entry.action}</p>
                      <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                        {entry.timestamp.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Section B — Team & Responsibilities */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card border border-border rounded-lg">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">Assigned Team</h2>
                <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setAssignModalOpen(true)}>
                  <Plus className="size-3 mr-1" /> Assign Member
                </Button>
              </div>
              {assignedMembers.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-xs text-muted-foreground">No team members assigned yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {assignedMembers.map(member => (
                    <div key={member.id} className="px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] font-semibold text-primary">{getInitials(member.name)}</span>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-foreground">{member.name}</span>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[10px] text-muted-foreground">{member.role}</span>
                            <span className="text-[10px] text-muted-foreground">·</span>
                            <span className="text-[10px] text-primary/70 italic">{member.responsibility}</span>
                          </div>
                        </div>
                      </div>
                      <button onClick={() => handleRemoveMember(member.id)} className="size-7 rounded-md flex items-center justify-center hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors">
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      {/* ── Assign Member Modal ────────────────────────────────────────────── */}
      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Assign Team Member</DialogTitle>
            <DialogDescription className="text-[10px] font-mono">Add a team member to this venture</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Team Member</Label>
              <Select value={assignMemberId} onValueChange={setAssignMemberId}>
                <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue placeholder="Select member" /></SelectTrigger>
                <SelectContent>
                  {TEAM.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.name} — {m.role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Responsibility on this venture</Label>
              <Input
                value={assignResponsibility}
                onChange={e => setAssignResponsibility(e.target.value)}
                placeholder="e.g. Lead negotiations, Financial oversight"
                className="mt-1 h-8 text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button size="sm" className="text-xs" onClick={handleAssignMember}>
              <Plus className="size-3.5 mr-1" /> Assign
            </Button>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setAssignModalOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Task Modal ─────────────────────────────────────────────────── */}
      <Dialog open={addTaskOpen} onOpenChange={setAddTaskOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Add Task</DialogTitle>
            <DialogDescription className="text-[10px] font-mono">Create a new task for this venture</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Task Name</Label>
              <Input value={newTaskName} onChange={e => setNewTaskName(e.target.value)} placeholder="Task name" className="mt-1 h-8 text-xs" />
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Due Date</Label>
              <Input type="date" value={newTaskDue} onChange={e => setNewTaskDue(e.target.value)} className="mt-1 h-8 text-xs" />
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Assignee</Label>
              <Select value={newTaskAssignee} onValueChange={setNewTaskAssignee}>
                <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue placeholder="Select assignee" /></SelectTrigger>
                <SelectContent>
                  {TEAM.map(m => <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Priority</Label>
              <Select value={newTaskPriority} onValueChange={setNewTaskPriority}>
                <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button size="sm" className="text-xs" onClick={handleAddTask}>
              <Plus className="size-3.5 mr-1" /> Add Task
            </Button>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setAddTaskOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
