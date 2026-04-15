// SPV Detail Page — /spvs/:slug — LIVE DB DATA
// Shows SPV info, linked ventures, team, files with folders, notes

import DashboardLayout from "@/components/DashboardLayout";
import StatusBadge from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { isVentexTeam } from "@/lib/ventex";
import { usePreviewMode } from "@/contexts/PreviewMode";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Briefcase, Users, Link2, Building2, Edit2, Save, X,
  Upload, Plus, Trash2, FileText, File, Image, FileSpreadsheet,
  Download, Eye, FolderPlus, Folder, FolderOpen, ChevronRight,
  MoveRight, MoreHorizontal, ZoomIn, ZoomOut, Loader2,
} from "lucide-react";
import { useState, useCallback, useRef } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { toast } from "sonner";
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

const ALL_STAGES = ["Active deal", "In negotiation", "Closed deal", "Dropped deal"];
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const FOLDER_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316",
];

const SPV_STAGE_CONFIG: Record<string, { label: string; bg: string; dot: string }> = {
  "Active deal": { label: "Active", bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", dot: "bg-emerald-400" },
  "In negotiation": { label: "Negotiating", bg: "bg-blue-500/10 text-blue-400 border-blue-500/20", dot: "bg-blue-400" },
  "Closed deal": { label: "Closed", bg: "bg-primary/10 text-primary border-primary/20", dot: "bg-primary" },
  "Dropped deal": { label: "Dropped", bg: "bg-red-500/10 text-red-400 border-red-500/20", dot: "bg-red-400" },
};

const THEME_COLORS: Record<string, string> = {
  "Real Estate": "#3b82f6", "Yacht": "#06b6d4", "F&B": "#f59e0b",
  "Entertainment": "#a855f7", "Oil & Gas": "#ef4444", "Others": "#6b7280", "TBD": "#6b7280",
};

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

export default function SpvDetail() {
  const [, params] = useRoute("/spvs/:slug");
  const [, navigate] = useLocation();
  const slug = params?.slug || "";
  const utils = trpc.useUtils();
  const { user } = useAuth();
  const { isPreviewMode } = usePreviewMode();
  const isSpvAdmin = isVentexTeam(user) && !isPreviewMode;

  const spvQ = trpc.spvs.getBySlug.useQuery({ slug }, { enabled: !!slug });
  const spv = spvQ.data;
  const spvId = spv?.id;

  const linkedVenturesQ = trpc.spvs.getLinkedVentures.useQuery(
    { spvId: spvId || 0 },
    { enabled: !!spvId }
  );
  const spvTeamQ = trpc.spvs.getTeam.useQuery(
    { spvId: spvId || 0 },
    { enabled: !!spvId }
  );
  const filesQ = trpc.spvs.getFiles.useQuery(
    { spvId: spvId || 0 },
    { enabled: !!spvId }
  );
  const foldersQ = trpc.spvs.getFolders.useQuery(
    { spvId: spvId || 0 },
    { enabled: !!spvId }
  );
  const allVenturesQ = trpc.ventures.list.useQuery();
  const allTeamQ = trpc.team.list.useQuery();

  const linkedVentures = linkedVenturesQ.data || [];
  const spvTeam = spvTeamQ.data || [];
  const allVentures = allVenturesQ.data || [];
  const allTeam = allTeamQ.data || [];
  const allFiles = filesQ.data || [];
  const allFolders = foldersQ.data || [];

  const updateSpv = trpc.spvs.update.useMutation({
    onSuccess: () => { utils.spvs.getBySlug.invalidate({ slug }); utils.activity.recent.invalidate(); },
  });
  const linkVenture = trpc.spvs.linkVenture.useMutation({
    onSuccess: () => { utils.spvs.getLinkedVentures.invalidate({ spvId: spvId || 0 }); },
  });
  const unlinkVenture = trpc.spvs.unlinkVenture.useMutation({
    onSuccess: () => { utils.spvs.getLinkedVentures.invalidate({ spvId: spvId || 0 }); },
  });
  const assignTeam = trpc.spvs.assignTeam.useMutation({
    onSuccess: () => { utils.spvs.getTeam.invalidate({ spvId: spvId || 0 }); },
  });
  const removeTeam = trpc.spvs.removeTeam.useMutation({
    onSuccess: () => { utils.spvs.getTeam.invalidate({ spvId: spvId || 0 }); },
  });
  const uploadFile = trpc.spvs.uploadFile.useMutation({
    onSuccess: () => { utils.spvs.getFiles.invalidate({ spvId: spvId || 0 }); utils.activity.recent.invalidate(); },
  });
  const deleteFile = trpc.spvs.deleteFile.useMutation({
    onSuccess: () => { utils.spvs.getFiles.invalidate({ spvId: spvId || 0 }); },
  });
  const moveFile = trpc.spvs.moveFile.useMutation({
    onSuccess: () => { utils.spvs.getFiles.invalidate({ spvId: spvId || 0 }); },
  });
  const createFolder = trpc.spvs.createFolder.useMutation({
    onSuccess: () => { utils.spvs.getFolders.invalidate({ spvId: spvId || 0 }); },
  });
  const deleteFolderMut = trpc.spvs.deleteFolder.useMutation({
    onSuccess: () => { utils.spvs.getFolders.invalidate({ spvId: spvId || 0 }); utils.spvs.getFiles.invalidate({ spvId: spvId || 0 }); },
  });
  const renameFolderMut = trpc.spvs.renameFolder.useMutation({
    onSuccess: () => { utils.spvs.getFolders.invalidate({ spvId: spvId || 0 }); },
  });

  const [editing, setEditing] = useState(false);
  const [editNotes, setEditNotes] = useState("");
  const [editNextStep, setEditNextStep] = useState("");
  const [linkVentureOpen, setLinkVentureOpen] = useState(false);
  const [assignTeamOpen, setAssignTeamOpen] = useState(false);

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

  const startEdit = useCallback(() => {
    if (!spv) return;
    setEditNotes(spv.currentStatus || "");
    setEditNextStep(spv.nextStep || "");
    setEditing(true);
  }, [spv]);

  const saveEdit = useCallback(() => {
    if (!spv) return;
    updateSpv.mutate({
      id: spv.id,
      currentStatus: editNotes || undefined,
      nextStep: editNextStep || undefined,
    });
    setEditing(false);
    toast.success("SPV updated");
  }, [spv, editNotes, editNextStep, updateSpv]);

  const handleStageChange = useCallback((stage: string) => {
    if (!spv) return;
    updateSpv.mutate({ id: spv.id, stage });
    toast.success(`Stage updated to ${stage}`);
  }, [spv, updateSpv]);

  const handlePriorityCycle = useCallback(() => {
    if (!spv) return;
    const cycle: Record<string, string> = { Low: "Medium", Medium: "High", High: "Low" };
    const next = cycle[spv.priority || "Medium"] || "Medium";
    updateSpv.mutate({ id: spv.id, priority: next });
    toast.info(`Priority changed to ${next}`);
  }, [spv, updateSpv]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || !spvId) return;

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
          spvId,
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
  }, [spvId, currentFolderId, uploadFile]);

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
    if (!trimmed || !spvId) { toast.error("Enter a folder name"); return; }
    createFolder.mutate({ spvId, name: trimmed, color: newFolderColor });
    setCreateFolderOpen(false);
    setNewFolderName("");
    setNewFolderColor(FOLDER_COLORS[0]);
    toast.success(`Folder "${trimmed}" created`);
  }, [newFolderName, newFolderColor, spvId, createFolder]);

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

  // Ventures not yet linked
  const linkedVentureIds = new Set(linkedVentures.map(v => v.ventureId));
  const availableVentures = allVentures.filter(v => !linkedVentureIds.has(v.id));

  // Team not yet assigned
  const assignedMemberIds = new Set(spvTeam.map(t => t.memberId));
  const availableTeam = allTeam.filter(m => !assignedMemberIds.has(m.id));

  if (spvQ.isLoading) {
    return (
      <DashboardLayout title="SPV Detail" subtitle="LOADING...">
        <div className="p-6 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!spv) {
    return (
      <DashboardLayout title="SPV Not Found" subtitle="ERROR">
        <div className="p-6 text-center">
          <Briefcase className="size-12 text-muted-foreground mx-auto mb-4 opacity-40" />
          <p className="text-sm text-muted-foreground mb-4">This SPV could not be found.</p>
          <Link href="/spvs">
            <Button variant="outline" size="sm" className="text-xs"><ArrowLeft className="size-3.5 mr-1" /> Back to SPVs</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const sc = SPV_STAGE_CONFIG[spv.stage || "Active deal"];
  const color = THEME_COLORS[spv.sector || "Others"] || "#6b7280";

  return (
    <DashboardLayout title={spv.name} subtitle="SPV DETAIL">
      <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 pb-24 md:pb-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/spvs">
              <button className="size-8 rounded-md border border-border flex items-center justify-center hover:bg-accent transition-colors">
                <ArrowLeft className="size-4 text-muted-foreground" />
              </button>
            </Link>
            <div>
              <h1 className="text-lg font-semibold text-foreground">{spv.name}</h1>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <div className="size-2 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-xs" style={{ color }}>{spv.sector && spv.sector !== "TBD" ? spv.sector : "Unclassified"}</span>
                </div>
                {sc && <StatusBadge label={sc.label} bg={sc.bg} dot={sc.dot} />}
                <button
                  onClick={handlePriorityCycle}
                  className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded cursor-pointer",
                    spv.priority === "High" ? "bg-red-500/10 text-red-400" :
                    spv.priority === "Medium" ? "bg-amber-500/10 text-amber-400" :
                    "bg-secondary text-muted-foreground"
                  )}
                >
                  {spv.priority} priority
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {isSpvAdmin && (
              <Select value={spv.stage || "Active deal"} onValueChange={handleStageChange}>
                <SelectTrigger className="h-9 min-h-[36px] text-xs w-[140px] sm:w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALL_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {isSpvAdmin && (
              <Button variant="outline" size="sm" className="text-xs h-9 min-h-[36px] touch-manipulation" onClick={() => fileInputRef.current?.click()}>
                <Upload className="size-3.5 mr-1" /> <span className="hidden sm:inline">Add </span>File
              </Button>
            )}
            {isSpvAdmin && (
              !editing ? (
                <Button variant="outline" size="sm" className="text-xs h-9 min-h-[36px] touch-manipulation" onClick={startEdit}>
                  <Edit2 className="size-3.5 mr-1" /> Edit
                </Button>
              ) : (
                <div className="flex gap-1">
                  <Button size="sm" className="text-xs h-9 min-h-[36px] touch-manipulation" onClick={saveEdit} disabled={updateSpv.isPending}>
                    <Save className="size-3.5 mr-1" /> Save
                  </Button>
                  <Button variant="ghost" size="sm" className="text-xs h-9 min-h-[36px] touch-manipulation" onClick={() => setEditing(false)}>
                    <X className="size-3.5" />
                  </Button>
                </div>
              )
            )}
          </div>
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">
          {/* Left column */}
          <div className="space-y-6">
            {/* Notes */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-1">Current Status</span>
                  {editing ? (
                    <Textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} className="text-xs min-h-[80px]" />
                  ) : (
                    <p className="text-xs text-foreground bg-secondary/30 rounded-md p-3 min-h-[80px]">
                      {spv.currentStatus || "No status notes yet."}
                    </p>
                  )}
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium block mb-1">Next Step</span>
                  {editing ? (
                    <Textarea value={editNextStep} onChange={e => setEditNextStep(e.target.value)} className="text-xs min-h-[80px]" />
                  ) : (
                    <p className="text-xs text-foreground bg-secondary/30 rounded-md p-3 min-h-[80px]">
                      {spv.nextStep || "No next steps defined."}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Documents & Files */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card border border-border rounded-lg">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-foreground">Documents & Files</h2>
                  <span className="text-[10px] font-mono text-muted-foreground">{allFiles.length} file{allFiles.length !== 1 ? "s" : ""} · {allFolders.length} folder{allFolders.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground hidden sm:inline">Max 5MB</span>
                  {isSpvAdmin && (
                    <Button size="sm" variant="outline" className="text-xs h-8 min-h-[32px] touch-manipulation" onClick={() => setCreateFolderOpen(true)}>
                      <FolderPlus className="size-3 mr-1" /> <span className="hidden sm:inline">New </span>Folder
                    </Button>
                  )}
                  {isSpvAdmin && (
                    <Button size="sm" variant="outline" className="text-xs h-8 min-h-[32px] touch-manipulation" onClick={() => fileInputRef.current?.click()}>
                      <Plus className="size-3 mr-1" /> <span className="hidden sm:inline">Attach </span>File
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
                            {isSpvAdmin && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                                  <button className="size-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-accent transition-all">
                                    <MoreHorizontal className="size-3.5 text-muted-foreground" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-36">
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setRenameFolderIdState(folder.id); setRenameFolderName(folder.name); }}>
                                    <Edit2 className="size-3.5 mr-2" /> Rename
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
                  <p className="text-[10px] text-muted-foreground/60">Click "Attach File" to upload documents, images, and spreadsheets.</p>
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
                              <button className="size-7 rounded-md flex items-center justify-center hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title="Move to folder">
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
                        <button onClick={() => handleOpenFile(file.fileUrl, file.filename)} className="size-8 sm:size-7 rounded-md flex items-center justify-center hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors touch-manipulation" title="Preview">
                          <Eye className="size-3.5" />
                        </button>
                        <button onClick={() => handleDownloadFile(file.fileUrl, file.filename)} className="size-8 sm:size-7 rounded-md flex items-center justify-center hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-400 transition-colors touch-manipulation" title="Download">
                          <Download className="size-3.5" />
                        </button>
                        {isSpvAdmin && (
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

            {/* Linked Ventures */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-card border border-border rounded-lg"
            >
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="size-4 text-blue-400" />
                  <h2 className="text-sm font-semibold text-foreground">Linked Ventures</h2>
                  <span className="text-[10px] font-mono text-muted-foreground">{linkedVentures.length}</span>
                </div>
                <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setLinkVentureOpen(true)}>
                  <Link2 className="size-3 mr-1" /> Link
                </Button>
              </div>
              <div className="divide-y divide-border">
                {linkedVentures.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-xs text-muted-foreground">No ventures linked to this SPV yet.</p>
                  </div>
                ) : (
                  linkedVentures.map(v => (
                    <div key={v.id} className="px-4 py-3 flex items-center justify-between">
                      <Link href={`/ventures/${v.ventureSlug}`}>
                        <span className="text-xs font-medium text-foreground hover:text-primary transition-colors cursor-pointer">
                          {v.ventureName}
                        </span>
                      </Link>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">{v.ventureSector}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-6 px-2 text-red-400 hover:text-red-300"
                          onClick={() => {
                            unlinkVenture.mutate({ spvId: spv.id, ventureId: v.ventureId });
                            toast.info("Venture unlinked");
                          }}
                        >
                          <X className="size-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Team */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-card border border-border rounded-lg"
            >
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="size-4 text-emerald-400" />
                  <h2 className="text-sm font-semibold text-foreground">Team</h2>
                  <span className="text-[10px] font-mono text-muted-foreground">{spvTeam.length}</span>
                </div>
                <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setAssignTeamOpen(true)}>
                  <Users className="size-3 mr-1" /> Assign
                </Button>
              </div>
              <div className="divide-y divide-border">
                {spvTeam.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-xs text-muted-foreground">No team members assigned yet.</p>
                  </div>
                ) : (
                  spvTeam.map(m => (
                    <div key={m.id} className="px-4 py-3 flex items-center justify-between">
                      <Link href={`/team/${m.memberSlug}`}>
                        <div className="cursor-pointer">
                          <span className="text-xs font-medium text-foreground hover:text-primary transition-colors">{m.memberName}</span>
                          <span className="text-[10px] text-muted-foreground ml-2">{m.memberRole}</span>
                        </div>
                      </Link>
                      <div className="flex items-center gap-2">
                        {m.responsibility && (
                          <span className="text-[10px] text-muted-foreground italic">{m.responsibility}</span>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-6 px-2 text-red-400 hover:text-red-300"
                          onClick={() => {
                            removeTeam.mutate({ spvId: spv.id, memberId: m.memberId });
                            toast.info("Team member removed");
                          }}
                        >
                          <X className="size-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Link Venture Dialog */}
      <Dialog open={linkVentureOpen} onOpenChange={setLinkVentureOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">Link Venture</DialogTitle>
            <DialogDescription className="text-[10px] font-mono">Select a venture to link to this SPV</DialogDescription>
          </DialogHeader>
          <div className="max-h-[300px] overflow-y-auto divide-y divide-border">
            {availableVentures.length === 0 ? (
              <p className="p-4 text-xs text-muted-foreground text-center">All ventures are already linked.</p>
            ) : (
              availableVentures.map(v => (
                <button
                  key={v.id}
                  onClick={() => {
                    linkVenture.mutate({ spvId: spv.id, ventureId: v.id });
                    toast.success(`Linked ${v.name}`);
                    setLinkVentureOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-accent/30 transition-colors"
                >
                  <span className="text-xs font-medium text-foreground">{v.name}</span>
                  <span className="text-[10px] text-muted-foreground ml-2">{v.sector}</span>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Team Dialog */}
      <Dialog open={assignTeamOpen} onOpenChange={setAssignTeamOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">Assign Team Member</DialogTitle>
            <DialogDescription className="text-[10px] font-mono">Select a team member to assign to this SPV</DialogDescription>
          </DialogHeader>
          <div className="max-h-[300px] overflow-y-auto divide-y divide-border">
            {availableTeam.length === 0 ? (
              <p className="p-4 text-xs text-muted-foreground text-center">All team members are already assigned.</p>
            ) : (
              availableTeam.map(m => (
                <button
                  key={m.id}
                  onClick={() => {
                    assignTeam.mutate({ spvId: spv.id, memberId: m.id });
                    toast.success(`Assigned ${m.name}`);
                    setAssignTeamOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-accent/30 transition-colors"
                >
                  <span className="text-xs font-medium text-foreground">{m.name}</span>
                  <span className="text-[10px] text-muted-foreground ml-2">{m.role}</span>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Folder Modal */}
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
                {FOLDER_COLORS.map(clr => (
                  <button
                    key={clr}
                    onClick={() => setNewFolderColor(clr)}
                    className={cn(
                      "size-6 rounded-full border-2 transition-all",
                      newFolderColor === clr ? "border-white scale-110" : "border-transparent hover:scale-105"
                    )}
                    style={{ backgroundColor: clr }}
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

      {/* Rename Folder Modal */}
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

      {/* Image Lightbox */}
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
