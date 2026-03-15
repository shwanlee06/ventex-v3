// ============================================================================
// Venture Detail Page — /ventures/:slug
// Sections: Key Details, Team, Files (downloadable), Activity Log
// ============================================================================

import DashboardLayout from "@/components/DashboardLayout";
import StatusBadge from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import {
  VENTURES, TEAM, getThemeColor,
  type Venture, type TeamMember,
} from "@/lib/data";
import { findVentureBySlug, slugify } from "@/lib/slugify";
import { useRoute, useLocation, Link } from "wouter";
import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import { logAction } from "@/lib/operatorSession";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Edit3, Save, Plus, Trash2, FileText, Upload, MessageSquare,
  User, Clock, File, Image, FileSpreadsheet, Download, Eye,
  X, AlertTriangle, ZoomIn, ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  sizeBytes: number;
  type: string;
  dateAdded: string;
  dataUrl: string; // base64 data URL for download/preview
}

interface ActivityEntry {
  id: string;
  action: string;
  timestamp: Date;
}

// ── Helpers ───────────────────────────────────────────────────────────────

const STAGES = ["In Validation", "Active ventures", "In Fundraising", "On Hold"];
const STATUSES = ["In progress", "On-Hold", "Completed", "Closed"];
const SECTORS = ["Real Estate", "F&B", "Yacht", "Entertainment", "Oil & Gas", "Others"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext || "")) return <Image className="size-4 text-blue-400" />;
  if (["xls", "xlsx", "csv"].includes(ext || "")) return <FileSpreadsheet className="size-4 text-emerald-400" />;
  if (["pdf"].includes(ext || "")) return <FileText className="size-4 text-red-400" />;
  if (["doc", "docx"].includes(ext || "")) return <FileText className="size-4 text-blue-500" />;
  return <File className="size-4 text-muted-foreground" />;
}

function getFileColor(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase();
  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext || "")) return "bg-blue-500/10 border-blue-500/20";
  if (["xls", "xlsx", "csv"].includes(ext || "")) return "bg-emerald-500/10 border-emerald-500/20";
  if (["pdf"].includes(ext || "")) return "bg-red-500/10 border-red-500/20";
  if (["doc", "docx"].includes(ext || "")) return "bg-blue-500/10 border-blue-500/20";
  return "bg-secondary border-border";
}

function isImageFile(name: string): boolean {
  const ext = name.split(".").pop()?.toLowerCase();
  return ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext || "");
}

function isPdfFile(name: string): boolean {
  return name.split(".").pop()?.toLowerCase() === "pdf";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getInitials(name: string): string {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

// localStorage key per venture
function getStorageKey(slug: string): string {
  return `thalora_venture_files_${slug}`;
}

function loadFilesFromStorage(slug: string): AttachedFile[] {
  try {
    const raw = localStorage.getItem(getStorageKey(slug));
    if (!raw) return [];
    return JSON.parse(raw);
  } catch { return []; }
}

function saveFilesToStorage(slug: string, files: AttachedFile[]) {
  try {
    localStorage.setItem(getStorageKey(slug), JSON.stringify(files));
  } catch (e) {
    console.warn("Failed to save files to localStorage:", e);
  }
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

  // Files — persisted to localStorage
  const [files, setFiles] = useState<AttachedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lightbox
  const [lightboxFile, setLightboxFile] = useState<AttachedFile | null>(null);
  const [lightboxZoom, setLightboxZoom] = useState(1);

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

    // Load persisted files from localStorage
    setFiles(loadFilesFromStorage(slug));

    // Pre-populate team from task assignees
    const assignees = new Set<string>();
    const preAssigned: AssignedMember[] = [];
    assignees.forEach(name => {
      const member = TEAM.find(m => m.name === name);
      if (member) {
        preAssigned.push({
          id: member.id, name: member.name, role: member.role,
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

  // Persist files to localStorage whenever they change
  useEffect(() => {
    if (slug) saveFilesToStorage(slug, files);
  }, [files, slug]);

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

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;

    let addedCount = 0;
    Array.from(fileList).forEach(f => {
      // 5MB size limit
      if (f.size > MAX_FILE_SIZE) {
        toast.error(`${f.name} exceeds 5MB limit (${formatFileSize(f.size)})`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const newFile: AttachedFile = {
          id: `file-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          name: f.name,
          size: formatFileSize(f.size),
          sizeBytes: f.size,
          type: f.type || "application/octet-stream",
          dateAdded: new Date().toISOString().split("T")[0],
          dataUrl,
        };
        setFiles(prev => [...prev, newFile]);
        addActivity(`File attached: ${f.name} (${formatFileSize(f.size)})`);
        addedCount++;
      };
      reader.readAsDataURL(f);
    });

    logAction("File attached", `${fileList.length} file(s)`);
    if (addedCount > 0 || fileList.length > 0) {
      toast.success(`Processing ${fileList.length} file(s)...`);
    }
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

  const handleDownloadFile = useCallback((file: AttachedFile) => {
    const link = document.createElement("a");
    link.href = file.dataUrl;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addActivity(`File downloaded: ${file.name}`);
    logAction("File downloaded", file.name);
  }, [addActivity]);

  const handleOpenFile = useCallback((file: AttachedFile) => {
    if (isImageFile(file.name)) {
      // Open lightbox for images
      setLightboxFile(file);
      setLightboxZoom(1);
    } else if (isPdfFile(file.name)) {
      // Open PDF in new tab
      const win = window.open();
      if (win) {
        win.document.write(`<iframe src="${file.dataUrl}" style="width:100%;height:100%;border:none;" />`);
        win.document.title = file.name;
      }
    } else {
      // Download for other types
      handleDownloadFile(file);
    }
    addActivity(`File opened: ${file.name}`);
  }, [addActivity, handleDownloadFile]);

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

            {/* Section B — Attached Files (downloadable) */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card border border-border rounded-lg">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-foreground">Attached Files</h2>
                  <span className="text-[10px] font-mono text-muted-foreground">{files.length} file{files.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">Max 5MB per file</span>
                  <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => fileInputRef.current?.click()}>
                    <Plus className="size-3 mr-1" /> Attach File
                  </Button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip,.pptx,.ppt"
                />
              </div>
              {files.length === 0 ? (
                <div className="p-10 text-center">
                  <Upload className="size-8 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-xs text-muted-foreground mb-1">No files attached yet.</p>
                  <p className="text-[10px] text-muted-foreground/60">Drag & drop or click "Attach File" to upload documents, images, and spreadsheets.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {files.map(file => (
                    <div key={file.id} className="px-4 py-3 flex items-center justify-between group hover:bg-accent/20 transition-colors">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* File icon with color background */}
                        <div className={cn("size-9 rounded-md border flex items-center justify-center flex-shrink-0", getFileColor(file.name))}>
                          {isImageFile(file.name) && file.dataUrl ? (
                            <img src={file.dataUrl} alt={file.name} className="size-9 rounded-md object-cover" />
                          ) : (
                            getFileIcon(file.name)
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-medium text-foreground truncate block">{file.name}</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-mono text-muted-foreground">{file.size}</span>
                            <span className="text-[10px] text-muted-foreground">· {file.dateAdded}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* Open / Preview */}
                        <button
                          onClick={() => handleOpenFile(file)}
                          className="size-7 rounded-md flex items-center justify-center hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                          title={isImageFile(file.name) ? "Preview" : isPdfFile(file.name) ? "Open PDF" : "Open"}
                        >
                          <Eye className="size-3.5" />
                        </button>
                        {/* Download */}
                        <button
                          onClick={() => handleDownloadFile(file)}
                          className="size-7 rounded-md flex items-center justify-center hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-400 transition-colors"
                          title="Download"
                        >
                          <Download className="size-3.5" />
                        </button>
                        {/* Remove */}
                        <button
                          onClick={() => handleRemoveFile(file.id)}
                          className="size-7 rounded-md flex items-center justify-center hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                          title="Remove"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Section C — Activity Log */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-card border border-border rounded-lg">
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
            {/* Team & Responsibilities */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-card border border-border rounded-lg">
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

      {/* ── Image Lightbox ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {lightboxFile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setLightboxFile(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-4xl max-h-[85vh] flex flex-col items-center"
              onClick={e => e.stopPropagation()}
            >
              {/* Controls */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs text-white/70 font-mono">{lightboxFile.name}</span>
                <button
                  onClick={() => setLightboxZoom(z => Math.max(0.5, z - 0.25))}
                  className="size-8 rounded-md bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                >
                  <ZoomOut className="size-4" />
                </button>
                <span className="text-[10px] text-white/50 font-mono w-12 text-center">{Math.round(lightboxZoom * 100)}%</span>
                <button
                  onClick={() => setLightboxZoom(z => Math.min(3, z + 0.25))}
                  className="size-8 rounded-md bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                >
                  <ZoomIn className="size-4" />
                </button>
                <button
                  onClick={() => handleDownloadFile(lightboxFile)}
                  className="size-8 rounded-md bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                >
                  <Download className="size-4" />
                </button>
                <button
                  onClick={() => setLightboxFile(null)}
                  className="size-8 rounded-md bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                >
                  <X className="size-4" />
                </button>
              </div>
              {/* Image */}
              <div className="overflow-auto max-h-[75vh] rounded-lg">
                <img
                  src={lightboxFile.dataUrl}
                  alt={lightboxFile.name}
                  className="rounded-lg transition-transform duration-200"
                  style={{ transform: `scale(${lightboxZoom})`, transformOrigin: "center center" }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
