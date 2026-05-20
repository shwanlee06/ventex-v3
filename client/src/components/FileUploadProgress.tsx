/**
 * FileUploadProgress — Shared component for file uploads with progress indicators,
 * size limit enforcement, and visual feedback for enterprise-grade UX.
 */
import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, CheckCircle2, AlertCircle, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Enterprise limits
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB per file
const MAX_BATCH_SIZE = 100 * 1024 * 1024; // 100MB total per batch
const MAX_FILES_PER_BATCH = 20;

const ALLOWED_EXTENSIONS = [
  "pdf", "doc", "docx", "xls", "xlsx", "csv", "ppt", "pptx",
  "jpg", "jpeg", "png", "gif", "webp", "svg",
  "txt", "json", "zip", "mp4", "mov", "mp3", "wav",
];

export interface UploadFileItem {
  id: string;
  file: File;
  progress: number; // 0-100
  status: "pending" | "reading" | "uploading" | "complete" | "error";
  error?: string;
}

interface FileUploadProgressProps {
  onUpload: (file: File, base64: string) => Promise<void> | void;
  maxFileSize?: number;
  maxFiles?: number;
  accept?: string;
  disabled?: boolean;
  className?: string;
}

export default function FileUploadProgress({
  onUpload,
  maxFileSize = MAX_FILE_SIZE,
  maxFiles = MAX_FILES_PER_BATCH,
  accept,
  disabled = false,
  className,
}: FileUploadProgressProps) {
  const [uploads, setUploads] = useState<UploadFileItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const validateFile = (file: File): string | null => {
    if (file.size > maxFileSize) {
      return `File exceeds ${formatSize(maxFileSize)} limit (${formatSize(file.size)})`;
    }
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext && !ALLOWED_EXTENSIONS.includes(ext)) {
      return `File type .${ext} is not permitted`;
    }
    return null;
  };

  const processFile = useCallback(async (file: File) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const error = validateFile(file);

    if (error) {
      setUploads(prev => [...prev, { id, file, progress: 0, status: "error", error }]);
      toast.error(error);
      return;
    }

    // Add to queue
    setUploads(prev => [...prev, { id, file, progress: 0, status: "reading" }]);

    try {
      // Read file as base64 with progress simulation
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 50); // 0-50% is reading
            setUploads(prev => prev.map(u => u.id === id ? { ...u, progress: pct } : u));
          }
        };
        reader.onload = () => {
          const dataUrl = reader.result as string;
          const b64 = dataUrl.split(",")[1];
          resolve(b64);
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });

      // Update to uploading state
      setUploads(prev => prev.map(u => u.id === id ? { ...u, progress: 50, status: "uploading" } : u));

      // Simulate upload progress (actual upload is via tRPC mutation)
      const progressInterval = setInterval(() => {
        setUploads(prev => prev.map(u => {
          if (u.id === id && u.status === "uploading" && u.progress < 90) {
            return { ...u, progress: u.progress + 10 };
          }
          return u;
        }));
      }, 200);

      // Execute upload
      await onUpload(file, base64);

      clearInterval(progressInterval);
      setUploads(prev => prev.map(u => u.id === id ? { ...u, progress: 100, status: "complete" } : u));

      // Remove from list after 3s
      setTimeout(() => {
        setUploads(prev => prev.filter(u => u.id !== id));
      }, 3000);
    } catch (err: any) {
      setUploads(prev => prev.map(u => u.id === id ? { ...u, status: "error", error: err.message || "Upload failed" } : u));
    }
  }, [onUpload, maxFileSize]);

  const handleFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);

    if (fileArray.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files per batch`);
      return;
    }

    const totalSize = fileArray.reduce((sum, f) => sum + f.size, 0);
    if (totalSize > MAX_BATCH_SIZE) {
      toast.error(`Total batch size exceeds ${formatSize(MAX_BATCH_SIZE)}`);
      return;
    }

    fileArray.forEach(f => processFile(f));
  }, [processFile, maxFiles]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles, disabled]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragOver(true);
  }, [disabled]);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const removeUpload = useCallback((id: string) => {
    setUploads(prev => prev.filter(u => u.id !== id));
  }, []);

  const activeUploads = uploads.filter(u => u.status === "reading" || u.status === "uploading");
  const hasActivity = uploads.length > 0;

  return (
    <div className={cn("space-y-2", className)}>
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={cn(
          "border border-dashed rounded-lg p-4 text-center cursor-pointer transition-all",
          isDragOver && "border-primary bg-primary/5 scale-[1.01]",
          disabled && "opacity-50 cursor-not-allowed",
          !isDragOver && !disabled && "border-border hover:border-primary/40 hover:bg-accent/30"
        )}
      >
        <Upload className="size-5 mx-auto text-muted-foreground mb-1.5" />
        <p className="text-xs text-muted-foreground">
          Drop files here or <span className="text-primary font-medium">browse</span>
        </p>
        <p className="text-[10px] text-muted-foreground/60 mt-0.5">
          Max {formatSize(maxFileSize)} per file · {maxFiles} files per batch
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={accept}
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files);
          e.target.value = "";
        }}
        className="hidden"
      />

      {/* Upload progress list */}
      <AnimatePresence>
        {hasActivity && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-1.5"
          >
            {activeUploads.length > 0 && (
              <div className="flex items-center gap-2 px-1">
                <Loader2 className="size-3 animate-spin text-primary" />
                <span className="text-[10px] font-mono text-muted-foreground">
                  Uploading {activeUploads.length} file{activeUploads.length > 1 ? "s" : ""}...
                </span>
              </div>
            )}

            {uploads.map(upload => (
              <motion.div
                key={upload.id}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded-md border text-xs",
                  upload.status === "error" && "border-red-500/30 bg-red-500/5",
                  upload.status === "complete" && "border-emerald-500/30 bg-emerald-500/5",
                  (upload.status === "reading" || upload.status === "uploading") && "border-border bg-card",
                )}
              >
                {upload.status === "error" ? (
                  <AlertCircle className="size-3.5 text-red-400 flex-shrink-0" />
                ) : upload.status === "complete" ? (
                  <CheckCircle2 className="size-3.5 text-emerald-400 flex-shrink-0" />
                ) : (
                  <FileText className="size-3.5 text-muted-foreground flex-shrink-0" />
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="truncate text-foreground font-medium">{upload.file.name}</span>
                    <span className="text-[10px] text-muted-foreground ml-2 flex-shrink-0">
                      {formatSize(upload.file.size)}
                    </span>
                  </div>

                  {(upload.status === "reading" || upload.status === "uploading") && (
                    <div className="mt-1 h-1 bg-secondary rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-primary rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${upload.progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  )}

                  {upload.error && (
                    <p className="text-[10px] text-red-400 mt-0.5">{upload.error}</p>
                  )}
                </div>

                {(upload.status === "error" || upload.status === "complete") && (
                  <button
                    onClick={(e) => { e.stopPropagation(); removeUpload(upload.id); }}
                    className="text-muted-foreground hover:text-foreground flex-shrink-0"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
