// Venture Detail Page — /ventures/:slug — LIVE DB DATA
// Sections: Key Details, Team, Files (with folders), Activity Log

import DashboardLayout from "@/components/DashboardLayout";
import StatusBadge from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import { getThemeColor } from "@/lib/data";
import { trpc } from "@/lib/trpc";
import { useRoute, useLocation, Link } from "wouter";
import { usePreviewMode } from "@/contexts/PreviewMode";
import { useAuth } from "@/_core/hooks/useAuth";
import { isVentexTeam } from "@/lib/ventex";
import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Edit3, Save, Plus, Trash2, FileText, Upload, MessageSquare,
  File, Image, FileSpreadsheet, Download, Eye, FileDown,
  X, AlertTriangle, ZoomIn, ZoomOut, FolderPlus, Folder, FolderOpen,
  ChevronRight, MoveRight, MoreHorizontal, Loader2,
  Brain, Shield, Lightbulb, TrendingUp, Sparkles, RefreshCw,
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
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import BlueprintJourneyTracker from "@/components/BlueprintJourneyTracker";
import VentureOverrides from "@/components/VentureOverrides";

const STAGES = ["In Validation", "Active ventures", "In Fundraising", "On Hold"];
const STATUSES = ["In progress", "On-Hold", "Completed", "Closed"];
const SECTORS = ["Real Estate", "F&B", "Yacht", "Entertainment", "Oil & Gas", "Others"];
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB enterprise limit
const FOLDER_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316",
];

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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getInitials(name: string): string {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

export default function VentureDetail() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/ventures/:slug");
  const slug = params?.slug || "";
  const utils = trpc.useUtils();
  const { user } = useAuth();
  const { isPreviewMode } = usePreviewMode();
  const isVentex = isVentexTeam(user) && !isPreviewMode;

  const ventureQ = trpc.ventures.getBySlug.useQuery({ slug }, { enabled: !!slug });
  const venture = ventureQ.data;
  const ventureId = venture?.id;

  const teamQ = trpc.ventures.getTeam.useQuery({ ventureId: ventureId! }, { enabled: !!ventureId });
  const filesQ = trpc.ventures.getFiles.useQuery({ ventureId: ventureId! }, { enabled: !!ventureId });
  const foldersQ = trpc.ventures.getFolders.useQuery({ ventureId: ventureId! }, { enabled: !!ventureId });
  const tasksQ = trpc.ventures.getTasks.useQuery({ ventureId: ventureId! }, { enabled: !!ventureId });
  const allTeamQ = trpc.team.list.useQuery();
  const activityQ = trpc.activity.recent.useQuery({ limit: 20 });

  const healthQ = trpc.intelligence.getVentureHealth.useQuery({ ventureId: ventureId! }, { enabled: !!ventureId });
  const risksQ = trpc.docIntel.getVentureRisks.useQuery({ ventureId: ventureId! }, { enabled: !!ventureId });
  const observationsQ = trpc.intelligence.getObservations.useQuery({ ventureId: ventureId!, limit: 5 }, { enabled: !!ventureId });
  const docsIntelQ = trpc.docIntel.getByVenture.useQuery({ ventureId: ventureId! }, { enabled: !!ventureId });

  const processDocument = trpc.docIntel.processFile.useMutation({
    onSuccess: () => {
      utils.docIntel.getByVenture.invalidate({ ventureId: ventureId! });
      utils.docIntel.getVentureRisks.invalidate({ ventureId: ventureId! });
      utils.intelligence.getVentureHealth.invalidate({ ventureId: ventureId! });
      toast.success("Document processed by AI");
    },
    onError: (e: any) => toast.error(`Processing failed: ${e.message}`),
  });
  const acceptObs = trpc.intelligence.acceptObservation.useMutation({
    onSuccess: () => {
      utils.intelligence.getObservations.invalidate();
      utils.tasks.list.invalidate();
      toast.success("Task created from recommendation");
    },
  });
  const dismissObs = trpc.intelligence.dismissObservation.useMutation({
    onSuccess: () => utils.intelligence.getObservations.invalidate(),
  });

  const healthScore = healthQ.data?.score ?? 0;
  const risks = risksQ.data || [];
  const observations = observationsQ.data || [];
  const processedDocs = docsIntelQ.data || [];

  const assignedTeam = teamQ.data || [];
  const allFiles = filesQ.data || [];
  const allFolders = foldersQ.data || [];
  const ventureTasks = tasksQ.data || [];
  const allTeamMembers = allTeamQ.data || [];
  const activityLogs = (activityQ.data || []).filter(a => a.entityType === "venture" && a.entityId === ventureId);

  const updateVenture = trpc.ventures.update.useMutation({
    onSuccess: () => { utils.ventures.getBySlug.invalidate({ slug }); utils.ventures.list.invalidate(); utils.activity.recent.invalidate(); },
  });
  const assignTeam = trpc.ventures.assignTeam.useMutation({
    onSuccess: () => { utils.ventures.getTeam.invalidate({ ventureId: ventureId! }); utils.activity.recent.invalidate(); },
  });
  const removeTeam = trpc.ventures.removeTeam.useMutation({
    onSuccess: () => { utils.ventures.getTeam.invalidate({ ventureId: ventureId! }); },
  });
  // Audit trail export
  const exportAuditMut = trpc.audit.exportEntityCsv.useMutation({
    onSuccess: (result) => {
      const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.filename;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${result.rowCount} audit entries`);
    },
    onError: (err) => { toast.error(err.message || "Failed to export audit trail"); },
  });

  const uploadFile = trpc.ventures.uploadFile.useMutation({
    onSuccess: () => {
      utils.ventures.getFiles.invalidate({ ventureId: ventureId! });
      utils.activity.recent.invalidate();
      toast.success("File uploaded successfully");
    },
    onError: (err) => {
      toast.error(`Upload failed: ${err.message}`);
    },
  });
  const deleteFile = trpc.ventures.deleteFile.useMutation({
    onSuccess: () => { utils.ventures.getFiles.invalidate({ ventureId: ventureId! }); },
  });
  const moveFile = trpc.ventures.moveFile.useMutation({
    onSuccess: () => { utils.ventures.getFiles.invalidate({ ventureId: ventureId! }); },
  });
  const createFolder = trpc.ventures.createFolder.useMutation({
    onSuccess: () => { utils.ventures.getFolders.invalidate({ ventureId: ventureId! }); },
  });
  const deleteFolderMut = trpc.ventures.deleteFolder.useMutation({
    onSuccess: () => { utils.ventures.getFolders.invalidate({ ventureId: ventureId! }); utils.ventures.getFiles.invalidate({ ventureId: ventureId! }); },
  });
  const renameFolderMut = trpc.ventures.renameFolder.useMutation({
    onSuccess: () => { utils.ventures.getFolders.invalidate({ ventureId: ventureId! }); },
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "", sector: "", location: "", stage: "", status: "", notes: "",
  });

  // Team
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignMemberId, setAssignMemberId] = useState("");
  const [assignResponsibility, setAssignResponsibility] = useState("");

  // Files & Folders
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState(FOLDER_COLORS[0]);
  const [renameFolderIdState, setRenameFolderIdState] = useState<number | null>(null);
  const [renameFolderName, setRenameFolderName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lightbox
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxName, setLightboxName] = useState("");
  const [lightboxZoom, setLightboxZoom] = useState(1);

  const startEditing = useCallback(() => {
    if (!venture) return;
    setEditForm({
      name: venture.name,
      sector: venture.sector,
      location: venture.location,
      stage: venture.stage,
      status: venture.status,
      notes: venture.currentStatus || "",
    });
    setIsEditing(true);
  }, [venture]);

  const handleSaveDetails = useCallback(() => {
    if (!venture) return;
    updateVenture.mutate({
      id: venture.id,
      name: editForm.name,
      sector: editForm.sector,
      location: editForm.location,
      stage: editForm.stage,
      status: editForm.status,
      currentStatus: editForm.notes,
    });
    setIsEditing(false);
    toast.success("Venture details saved");
  }, [venture, editForm, updateVenture]);

  const handleAssignMember = useCallback(() => {
    if (!assignMemberId || !ventureId) { toast.error("Select a team member"); return; }
    const memberId = parseInt(assignMemberId);
    if (assignedTeam.find(m => m.memberId === memberId)) {
      toast.error("Already assigned");
      return;
    }
    assignTeam.mutate({ ventureId, memberId, responsibility: assignResponsibility || "General support" });
    setAssignModalOpen(false);
    setAssignMemberId("");
    setAssignResponsibility("");
    toast.success("Team member assigned");
  }, [assignMemberId, assignResponsibility, ventureId, assignedTeam, assignTeam]);

  const handleRemoveMember = useCallback((memberId: number) => {
    if (!ventureId) return;
    removeTeam.mutate({ ventureId, memberId });
    toast.info("Team member removed");
  }, [ventureId, removeTeam]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || !ventureId) return;

    Array.from(fileList).forEach(f => {
      if (f.size > MAX_FILE_SIZE) {
        toast.error(`${f.name} exceeds 5MB limit`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(",")[1];
        uploadFile.mutate({
          ventureId,
          filename: f.name,
          fileType: f.type || "application/octet-stream",
          fileSize: f.size,
          fileData: base64,
          folderId: currentFolderId || undefined,
        });
      };
      reader.readAsDataURL(f);
    });

    toast.success(`Processing ${fileList.length} file(s)...`);
    e.target.value = "";
  }, [ventureId, currentFolderId, uploadFile]);

  const handleDeleteFile = useCallback((fileId: number, fileName: string) => {
    deleteFile.mutate({ fileId });
    toast.info(`${fileName} removed`);
  }, [deleteFile]);

  const handleMoveFile = useCallback((fileId: number, targetFolderId: number | null) => {
    moveFile.mutate({ fileId, folderId: targetFolderId });
    toast.success("File moved");
  }, [moveFile]);

  const handleOpenFile = useCallback((fileUrl: string, fileName: string) => {
    if (isImageFile(fileName)) {
      setLightboxUrl(fileUrl);
      setLightboxName(fileName);
      setLightboxZoom(1);
    } else {
      window.open(fileUrl, "_blank");
    }
  }, []);

  const handleDownloadFile = useCallback((fileUrl: string, fileName: string) => {
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = fileName;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const handleCreateFolder = useCallback(() => {
    const trimmed = newFolderName.trim();
    if (!trimmed || !ventureId) { toast.error("Enter a folder name"); return; }
    createFolder.mutate({ ventureId, name: trimmed, color: newFolderColor });
    setCreateFolderOpen(false);
    setNewFolderName("");
    setNewFolderColor(FOLDER_COLORS[0]);
    toast.success(`Folder "${trimmed}" created`);
  }, [newFolderName, newFolderColor, ventureId, createFolder]);

  const handleDeleteFolder = useCallback((folderId: number) => {
    deleteFolderMut.mutate({ folderId });
    if (currentFolderId === folderId) setCurrentFolderId(null);
    toast.info("Folder deleted — files moved to root");
  }, [currentFolderId, deleteFolderMut]);

  const handleRenameFolder = useCallback(() => {
    if (!renameFolderIdState || !renameFolderName.trim()) return;
    renameFolderMut.mutate({ folderId: renameFolderIdState, name: renameFolderName.trim() });
    toast.success("Folder renamed");
    setRenameFolderIdState(null);
    setRenameFolderName("");
  }, [renameFolderIdState, renameFolderName, renameFolderMut]);

  const currentFiles = allFiles.filter(f => currentFolderId ? f.folderId === currentFolderId : !f.folderId);
  const currentFolder = allFolders.find(f => f.id === currentFolderId);

  if (ventureQ.isLoading) {
    return (
      <DashboardLayout title="Loading..." subtitle="">
        <div className="p-6 space-y-4">
          <Skeleton className="h-12 w-1/3" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!venture) {
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

  const tc = getThemeColor(venture.sector);

  return (
    <DashboardLayout title={venture.name} subtitle={venture.sector.toUpperCase()}>
      <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 pb-24 md:pb-6">
        {/* ── Header Bar ─────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/ventures">
              <button className="size-8 rounded-md border border-border flex items-center justify-center hover:bg-accent transition-colors">
                <ArrowLeft className="size-4 text-muted-foreground" />
              </button>
            </Link>
            <div>
              <h1 className="text-lg font-semibold text-foreground">{venture.name}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-[10px] font-medium px-2 py-0.5 rounded" style={{ backgroundColor: `${tc.color}15`, color: tc.color }}>
                  {venture.sector}
                </span>
                {venture.location && venture.location !== "TBD" && (
                  <span className="text-[10px] font-mono text-muted-foreground">{venture.location}</span>
                )}
                <span className="text-[10px] text-muted-foreground">·</span>
                <span className="text-[10px] text-muted-foreground">{venture.stage}</span>
                <StatusBadge
                  label={venture.status}
                  bg={venture.status === "In progress" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : venture.status === "On-Hold" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-secondary text-muted-foreground border-border"}
                  dot={venture.status === "In progress" ? "bg-emerald-400" : venture.status === "On-Hold" ? "bg-amber-400" : "bg-muted-foreground"}
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {isVentex && (
              <Button variant="outline" size="sm" className="text-xs h-9 min-h-[36px] touch-manipulation" onClick={() => isEditing ? handleSaveDetails() : startEditing()}>
                {isEditing ? <><Save className="size-3.5 mr-1" /> Save</> : <><Edit3 className="size-3.5 mr-1" /> Edit</>}
              </Button>
            )}
            {isVentex && (
              <Button variant="outline" size="sm" className="text-xs h-9 min-h-[36px] touch-manipulation" onClick={() => fileInputRef.current?.click()}>
                <Upload className="size-3.5 mr-1" /> <span className="hidden sm:inline">Add </span>File
              </Button>
            )}
            {isVentex && (
            <Button size="sm" className="text-xs h-9 min-h-[36px] touch-manipulation" onClick={() => navigate("/agent")}>
              <MessageSquare className="size-3.5 mr-1" /> <span className="hidden sm:inline">Chat with </span>AI →
            </Button>
            )}
            {isVentex && (
              <Button variant="outline" size="sm" className="text-xs h-9 min-h-[36px] touch-manipulation" onClick={() => {
                exportAuditMut.mutate({ entityType: "venture", entityId: String(ventureId), entityName: venture?.name });
              }}>
                <FileDown className="size-3.5 mr-1" /> <span className="hidden sm:inline">Audit </span>Trail
              </Button>
            )}
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
                    <p className="text-xs text-foreground mt-1">{venture.name}</p>
                  )}
                </div>
                <div>
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Sector</Label>
                  {isEditing ? (
                    <Select value={editForm.sector} onValueChange={v => setEditForm(p => ({ ...p, sector: v }))}>
                      <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{SECTORS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  ) : (
                    <p className="text-xs mt-1" style={{ color: tc.color }}>{venture.sector}</p>
                  )}
                </div>
                <div>
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Location</Label>
                  {isEditing ? (
                    <Input value={editForm.location} onChange={e => setEditForm(p => ({ ...p, location: e.target.value }))} className="mt-1 h-8 text-xs" />
                  ) : (
                    <p className="text-xs text-foreground mt-1">{venture.location}</p>
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
                    <p className="text-xs text-foreground mt-1">{venture.stage}</p>
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
                    <p className="text-xs text-foreground mt-1">{venture.status}</p>
                  )}
                </div>
                <div>
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Priority</Label>
                  <p className="text-xs text-foreground mt-1">{venture.priority || "Medium"}</p>
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Description / Notes</Label>
                  {isEditing ? (
                    <Textarea value={editForm.notes} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} className="mt-1 text-xs min-h-[80px]" />
                  ) : (
                    <p className="text-xs text-muted-foreground mt-1 italic">{venture.currentStatus || "No notes yet."}</p>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Section A.5 — Blueprint Journey Tracker */}
            {ventureId && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <div className="bg-card border border-border rounded-lg p-4">
                  <BlueprintJourneyTracker ventureId={ventureId} />
                  {isVentex && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <VentureOverrides ventureId={ventureId} />
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Section B — Files with Folders */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card border border-border rounded-lg">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-foreground">Documents & Files</h2>
                  <span className="text-[10px] font-mono text-muted-foreground">{allFiles.length} file{allFiles.length !== 1 ? "s" : ""} · {allFolders.length} folder{allFolders.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">Max 5MB</span>
                  {isVentex && (
                    <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setCreateFolderOpen(true)}>
                      <FolderPlus className="size-3 mr-1" /> New Folder
                    </Button>
                  )}
                  {isVentex && (
                    <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => fileInputRef.current?.click()}>
                      <Plus className="size-3 mr-1" /> Attach File
                    </Button>
                  )}
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

              {/* Breadcrumb */}
              <div className="px-4 py-2 border-b border-border/50 flex items-center gap-1">
                <button
                  onClick={() => setCurrentFolderId(null)}
                  className={cn(
                    "text-[11px] font-medium px-1.5 py-0.5 rounded hover:bg-accent/50 transition-colors",
                    !currentFolderId ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  All Files
                </button>
                {currentFolder && (
                  <>
                    <ChevronRight className="size-3 text-muted-foreground" />
                    <span className="text-[11px] font-medium text-primary flex items-center gap-1">
                      <Folder className="size-3" style={{ color: currentFolder.color || "#3b82f6" }} />
                      {currentFolder.name}
                    </span>
                  </>
                )}
              </div>

              {/* Folders (only show in root view) */}
              {!currentFolderId && allFolders.length > 0 && (
                <div className="px-4 py-3 border-b border-border/50">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {allFolders.map(folder => {
                      const folderFileCount = allFiles.filter(f => f.folderId === folder.id).length;
                      return (
                        <div
                          key={folder.id}
                          className="group relative rounded-lg border border-border p-3 cursor-pointer hover:border-primary/30 hover:bg-accent/20 transition-all"
                          onClick={() => setCurrentFolderId(folder.id)}
                        >
                          <div className="flex items-start justify-between">
                            <FolderOpen className="size-5" style={{ color: folder.color || "#3b82f6" }} />
                            {isVentex && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                                  <button className="size-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-accent transition-all">
                                    <MoreHorizontal className="size-3.5 text-muted-foreground" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-36">
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setRenameFolderIdState(folder.id); setRenameFolderName(folder.name); }}>
                                    <Edit3 className="size-3.5 mr-2" /> Rename
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }} className="text-red-400 focus:text-red-400">
                                    <Trash2 className="size-3.5 mr-2" /> Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                          <p className="text-xs font-medium text-foreground mt-2 truncate">{folder.name}</p>
                          <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{folderFileCount} file{folderFileCount !== 1 ? "s" : ""}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Files in current view */}
              {currentFiles.length === 0 ? (
                <div className="p-10 text-center">
                  <Upload className="size-8 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-xs text-muted-foreground mb-1">
                    {currentFolderId ? "This folder is empty." : "No files attached yet."}
                  </p>
                  <p className="text-[10px] text-muted-foreground/60">{isVentex ? 'Click "Attach File" to upload documents, images, and spreadsheets.' : 'Documents will appear here once uploaded by the team.'}</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {currentFiles.map(file => (
                    <div key={file.id} className="px-4 py-3 flex items-center justify-between group hover:bg-accent/20 transition-colors">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={cn("size-9 rounded-md border flex items-center justify-center flex-shrink-0", getFileColor(file.filename))}>
                          {isImageFile(file.filename) && file.fileUrl ? (
                            <img src={file.fileUrl} alt={file.filename} className="size-9 rounded-md object-cover" />
                          ) : (
                            getFileIcon(file.filename)
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-medium text-foreground truncate block">{file.filename}</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-mono text-muted-foreground">{file.fileSize ? formatFileSize(file.fileSize) : "—"}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        {/* Move to folder */}
                        {allFolders.length > 0 && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="size-8 sm:size-7 rounded-md flex items-center justify-center hover:bg-accent text-muted-foreground hover:text-foreground transition-colors touch-manipulation" title="Move to folder">
                                <MoveRight className="size-3.5" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              {file.folderId && (
                                <DropdownMenuItem onClick={() => handleMoveFile(file.id, null)}>
                                  <Folder className="size-3.5 mr-2 text-muted-foreground" /> Move to Root
                                </DropdownMenuItem>
                              )}
                              {allFolders.filter(f => f.id !== file.folderId).map(folder => (
                                <DropdownMenuItem key={folder.id} onClick={() => handleMoveFile(file.id, folder.id)}>
                                  <Folder className="size-3.5 mr-2" style={{ color: folder.color || "#3b82f6" }} /> {folder.name}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                        <button
                          onClick={() => processDocument.mutate({ fileId: file.id, ventureId: ventureId!, fileUrl: file.fileUrl, filename: file.filename, fileType: file.fileType || "application/octet-stream", fileSize: file.fileSize || 0 })}
                          className="size-8 sm:size-7 rounded-md flex items-center justify-center hover:bg-purple-500/10 text-muted-foreground hover:text-purple-400 transition-colors touch-manipulation"
                          title="Process with AI"
                          disabled={processDocument.isPending}
                        >
                          <Brain className="size-3.5" />
                        </button>
                        <button onClick={() => handleOpenFile(file.fileUrl, file.filename)} className="size-8 sm:size-7 rounded-md flex items-center justify-center hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors touch-manipulation" title="Preview">
                          <Eye className="size-3.5" />
                        </button>
                        <button onClick={() => handleDownloadFile(file.fileUrl, file.filename)} className="size-8 sm:size-7 rounded-md flex items-center justify-center hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-400 transition-colors touch-manipulation" title="Download">
                          <Download className="size-3.5" />
                        </button>
                        {isVentex && (
                          <button onClick={() => handleDeleteFile(file.id, file.filename)} className="size-8 sm:size-7 rounded-md flex items-center justify-center hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors touch-manipulation" title="Remove">
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Section C — Linked Tasks */}
            {ventureTasks.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="bg-card border border-border rounded-lg">
                <div className="px-4 py-3 border-b border-border">
                  <h2 className="text-sm font-semibold text-foreground">Linked Tasks</h2>
                </div>
                <div className="divide-y divide-border">
                  {ventureTasks.map(task => (
                    <div key={task.id} className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <span className={cn("text-xs font-medium", task.status === "complete" ? "line-through text-muted-foreground" : "text-foreground")}>{task.title}</span>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{task.dueDate ? `Due ${task.dueDate}` : "No due date"}</p>
                      </div>
                      <StatusBadge
                        label={task.status === "complete" ? "Complete" : task.dueDate && new Date(task.dueDate) < new Date() ? "Overdue" : "Open"}
                        bg={task.status === "complete" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : task.dueDate && new Date(task.dueDate) < new Date() ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"}
                        dot={task.status === "complete" ? "bg-emerald-400" : task.dueDate && new Date(task.dueDate) < new Date() ? "bg-red-400" : "bg-amber-400"}
                      />
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Section D — Activity Log */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-card border border-border rounded-lg">
              <div className="px-4 py-3 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground">Activity Log</h2>
              </div>
              <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
                {activityLogs.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground">No activity recorded yet.</div>
                ) : (
                  activityLogs.map(entry => (
                    <div key={entry.id} className="px-4 py-3 flex items-start gap-3">
                      <div className="size-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs text-foreground">{entry.action}</p>
                        {entry.detail && <p className="text-[10px] text-muted-foreground mt-0.5">{entry.detail}</p>}
                        <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                          {new Date(entry.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Health Score */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card border border-border rounded-lg">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <TrendingUp className="size-4 text-primary" /> Health Score
                </h2>
                <span className="text-[10px] font-mono text-muted-foreground">AI-calculated</span>
              </div>
              <div className="p-4 flex items-center gap-4">
                <div className={cn(
                  "size-16 rounded-full border-4 flex items-center justify-center font-mono text-lg font-bold",
                  healthScore >= 80 ? "border-emerald-500 text-emerald-400" :
                  healthScore >= 60 ? "border-amber-500 text-amber-400" :
                  "border-red-500 text-red-400"
                )}>
                  {healthScore}
                </div>
                <div>
                  <p className={cn("text-sm font-medium",
                    healthScore >= 80 ? "text-emerald-400" :
                    healthScore >= 60 ? "text-amber-400" :
                    "text-red-400"
                  )}>
                    {healthScore >= 80 ? "Healthy" : healthScore >= 60 ? "Needs Attention" : "At Risk"}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Based on task completion, risks, and activity
                  </p>
                </div>
              </div>
            </motion.div>

            {/* AI Risks */}
            {risks.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="bg-card border border-border rounded-lg">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Shield className="size-4 text-red-400" /> Identified Risks
                  </h2>
                  <span className="text-[10px] font-mono text-muted-foreground">{risks.length} risk{risks.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="divide-y divide-border max-h-[300px] overflow-y-auto">
                  {risks.map((risk: any) => (
                    <div key={risk.id} className="px-4 py-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className={cn("size-3.5 mt-0.5 flex-shrink-0",
                          risk.severity === "Critical" ? "text-red-400" :
                          risk.severity === "High" ? "text-orange-400" :
                          risk.severity === "Medium" ? "text-amber-400" : "text-muted-foreground"
                        )} />
                        <div>
                          <p className="text-xs text-foreground">{risk.riskDescription}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded",
                              risk.severity === "Critical" ? "bg-red-500/10 text-red-400" :
                              risk.severity === "High" ? "bg-orange-500/10 text-orange-400" :
                              risk.severity === "Medium" ? "bg-amber-500/10 text-amber-400" : "bg-secondary text-muted-foreground"
                            )}>{risk.severity}</span>
                            <span className="text-[10px] text-muted-foreground">{risk.status}</span>
                          </div>
                          {risk.mitigationAction && (
                            <p className="text-[10px] text-muted-foreground mt-1 italic">Mitigation: {risk.mitigationAction}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* AI Recommendations */}
            {observations.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }} className="bg-card border border-border rounded-lg">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Lightbulb className="size-4 text-amber-400" /> AI Recommendations
                  </h2>
                  <span className="text-[10px] font-mono text-muted-foreground">{observations.length}</span>
                </div>
                <div className="divide-y divide-border max-h-[350px] overflow-y-auto">
                  {observations.map((obs: any) => (
                    <div key={obs.id} className="px-4 py-3">
                      <div className="flex items-start gap-2">
                        <Sparkles className={cn("size-3.5 mt-0.5 flex-shrink-0",
                          obs.observationType === "risk" ? "text-red-400" :
                          obs.observationType === "opportunity" ? "text-emerald-400" :
                          "text-amber-400"
                        )} />
                        <div className="flex-1">
                          <p className="text-xs text-foreground">{obs.observation}</p>
                          {obs.recommendedAction && (
                            <p className="text-[10px] text-muted-foreground mt-1">Action: {obs.recommendedAction}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            {obs.suggestedTaskTitle && (
                              <Button size="sm" variant="outline" className="text-[10px] h-6 px-2" onClick={() => acceptObs.mutate({ observationId: obs.id })} disabled={acceptObs.isPending}>
                                <Plus className="size-3 mr-1" /> Create Task
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" className="text-[10px] h-6 px-2 text-muted-foreground" onClick={() => dismissObs.mutate({ observationId: obs.id })}>
                              Dismiss
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Document Intelligence */}
            {processedDocs.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="bg-card border border-border rounded-lg">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Brain className="size-4 text-purple-400" /> Document Intelligence
                  </h2>
                  <span className="text-[10px] font-mono text-muted-foreground">{processedDocs.length} analyzed</span>
                </div>
                <div className="divide-y divide-border max-h-[300px] overflow-y-auto">
                  {processedDocs.map((doc: any) => (
                    <div key={doc.id} className="px-4 py-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400">
                          {doc.documentType || "Unknown"}
                        </span>
                        <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded",
                          doc.processingStatus === "completed" ? "bg-emerald-500/10 text-emerald-400" :
                          doc.processingStatus === "processing" ? "bg-amber-500/10 text-amber-400" :
                          "bg-red-500/10 text-red-400"
                        )}>{doc.processingStatus}</span>
                      </div>
                      {doc.summary && <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{doc.summary}</p>}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Team & Responsibilities */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-card border border-border rounded-lg">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">Assigned Team</h2>
                {isVentex && (
                  <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setAssignModalOpen(true)}>
                    <Plus className="size-3 mr-1" /> Assign Member
                  </Button>
                )}
              </div>
              {assignedTeam.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-xs text-muted-foreground">No team members assigned yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {assignedTeam.map(member => (
                    <div key={member.id} className="px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] font-semibold text-primary">{getInitials(member.memberName)}</span>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-foreground">{member.memberName}</span>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[10px] text-muted-foreground">{member.memberRole}</span>
                            <span className="text-[10px] text-muted-foreground">·</span>
                            <span className="text-[10px] text-primary/70 italic">{member.responsibility || "General support"}</span>
                          </div>
                        </div>
                      </div>
                      {isVentex && (
                        <button onClick={() => handleRemoveMember(member.memberId)} className="size-7 rounded-md flex items-center justify-center hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors">
                          <X className="size-3.5" />
                        </button>
                      )}
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
                  {allTeamMembers.map(m => (
                    <SelectItem key={m.id} value={String(m.id)}>{m.name} — {m.role}</SelectItem>
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
            <Button size="sm" className="text-xs" onClick={handleAssignMember} disabled={assignTeam.isPending}>
              <Plus className="size-3.5 mr-1" /> Assign
            </Button>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setAssignModalOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Create Folder Modal ────────────────────────────────────────────── */}
      <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Create Folder</DialogTitle>
            <DialogDescription className="text-[10px] font-mono">Organize documents into folders</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Folder Name</Label>
              <Input
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                placeholder="e.g. Legal Documents, Financial Reports"
                className="mt-1 h-8 text-xs"
                onKeyDown={e => e.key === "Enter" && handleCreateFolder()}
              />
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 block">Folder Color</Label>
              <div className="flex items-center gap-2">
                {FOLDER_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setNewFolderColor(color)}
                    className={cn(
                      "size-6 rounded-full border-2 transition-all",
                      newFolderColor === color ? "border-white scale-110" : "border-transparent hover:scale-105"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button size="sm" className="text-xs" onClick={handleCreateFolder} disabled={createFolder.isPending}>
              <FolderPlus className="size-3.5 mr-1" /> Create
            </Button>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setCreateFolderOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Rename Folder Modal ────────────────────────────────────────────── */}
      <Dialog open={!!renameFolderIdState} onOpenChange={open => !open && setRenameFolderIdState(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Rename Folder</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">New Name</Label>
            <Input
              value={renameFolderName}
              onChange={e => setRenameFolderName(e.target.value)}
              className="mt-1 h-8 text-xs"
              onKeyDown={e => e.key === "Enter" && handleRenameFolder()}
            />
          </div>
          <DialogFooter>
            <Button size="sm" className="text-xs" onClick={handleRenameFolder}>
              <Save className="size-3.5 mr-1" /> Save
            </Button>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setRenameFolderIdState(null)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Image Lightbox ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {lightboxUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setLightboxUrl(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-4xl max-h-[85vh] flex flex-col items-center"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs text-white/70 font-mono">{lightboxName}</span>
                <button onClick={() => setLightboxZoom(z => Math.max(0.5, z - 0.25))} className="size-8 rounded-md bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
                  <ZoomOut className="size-4" />
                </button>
                <span className="text-[10px] text-white/50 font-mono w-12 text-center">{Math.round(lightboxZoom * 100)}%</span>
                <button onClick={() => setLightboxZoom(z => Math.min(3, z + 0.25))} className="size-8 rounded-md bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
                  <ZoomIn className="size-4" />
                </button>
                <button onClick={() => handleDownloadFile(lightboxUrl, lightboxName)} className="size-8 rounded-md bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
                  <Download className="size-4" />
                </button>
                <button onClick={() => setLightboxUrl(null)} className="size-8 rounded-md bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
                  <X className="size-4" />
                </button>
              </div>
              <div className="overflow-auto max-h-[75vh] rounded-lg">
                <img
                  src={lightboxUrl}
                  alt={lightboxName}
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
