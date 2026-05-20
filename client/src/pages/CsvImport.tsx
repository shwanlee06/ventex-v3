/**
 * CSV Import Page — Bulk data ingestion for ventures, tasks, team, SPVs, distributions
 * Features: template download, file upload, validation preview, commit with progress
 */
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  ArrowRight,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

type EntityType = "ventures" | "tasks" | "team" | "spvs" | "distributions";

const ENTITY_LABELS: Record<EntityType, string> = {
  ventures: "Ventures",
  tasks: "Tasks",
  team: "Team Members",
  spvs: "SPVs & Deals",
  distributions: "Distributions",
};

const ENTITY_DESCRIPTIONS: Record<EntityType, string> = {
  ventures: "Import portfolio ventures with sector, stage, valuation, and legal details.",
  tasks: "Import tasks with assignments, due dates, priorities, and venture links.",
  team: "Import team members with roles, contact info, and authority levels.",
  spvs: "Import SPVs with capital structure, legal counsel, and linked ventures.",
  distributions: "Import distribution records with amounts, LP recipients, and schedules.",
};

export default function CsvImport() {
  const { user } = useAuth();
  const [entityType, setEntityType] = useState<EntityType>("ventures");
  const [csvContent, setCsvContent] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [step, setStep] = useState<"select" | "preview" | "result">("select");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get user's org
  const orgId = (user as any)?.organizationId || 1;

  // Template query
  const templateQuery = trpc.csvImport.getTemplate.useQuery(
    { entityType },
    { enabled: true }
  );

  // Preview mutation
  const previewMutation = trpc.csvImport.preview.useMutation({
    onSuccess: (data) => {
      if (data.parseErrors && data.parseErrors.length > 0) {
        toast.error(`CSV parse error: ${data.parseErrors[0].message}`);
      } else {
        setStep("preview");
      }
    },
    onError: (err) => toast.error(err.message),
  });

  // Commit mutation
  const commitMutation = trpc.csvImport.commit.useMutation({
    onSuccess: (data) => {
      setStep("result");
      if (data.created > 0) {
        toast.success(`Successfully imported ${data.created} ${ENTITY_LABELS[entityType].toLowerCase()}`);
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const handleDownloadTemplate = useCallback(() => {
    if (!templateQuery.data) return;
    const blob = new Blob([templateQuery.data.csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ventex_${entityType}_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Template downloaded");
  }, [templateQuery.data, entityType]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".csv")) {
      toast.error("Please upload a .csv file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large. Maximum 5MB.");
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      setCsvContent(content);
    };
    reader.readAsText(file);
  }, []);

  const handlePreview = useCallback(() => {
    if (!csvContent) {
      toast.error("Please upload a CSV file first");
      return;
    }
    previewMutation.mutate({
      entityType,
      csvContent,
      organizationId: orgId,
    });
  }, [csvContent, entityType, orgId, previewMutation]);

  const handleCommit = useCallback(() => {
    commitMutation.mutate({
      entityType,
      csvContent,
      organizationId: orgId,
    });
  }, [csvContent, entityType, orgId, commitMutation]);

  const handleReset = useCallback(() => {
    setCsvContent("");
    setFileName("");
    setStep("select");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const previewData = previewMutation.data;
  const commitData = commitMutation.data;

  return (
    <DashboardLayout title="Data Import" subtitle="CSV BULK UPLOAD">
      <div className="p-4 md:p-6 space-y-6 max-w-5xl">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-lg font-semibold text-foreground">Bulk Data Import</h1>
          <p className="text-sm text-muted-foreground">
            Import ventures, tasks, team members, SPVs, and distributions from CSV files.
            Download a template, fill in your data, and upload to import.
          </p>
        </div>

        {/* Step 1: Select entity type and upload */}
        <div className="bg-card border border-border rounded-lg p-5 space-y-5">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center size-6 rounded-full bg-primary/10 text-primary text-xs font-bold">1</div>
            <h2 className="text-sm font-semibold text-foreground">Select Data Type & Upload</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Entity type selector */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Data Type</label>
              <Select value={entityType} onValueChange={(v) => { setEntityType(v as EntityType); handleReset(); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ENTITY_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{ENTITY_DESCRIPTIONS[entityType]}</p>
            </div>

            {/* Template download */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Template</label>
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={handleDownloadTemplate}
                disabled={!templateQuery.data}
              >
                <Download className="size-4" />
                Download {ENTITY_LABELS[entityType]} Template
              </Button>
              <p className="text-xs text-muted-foreground">
                Pre-formatted CSV with headers and example row.
              </p>
            </div>
          </div>

          {/* File upload */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Upload CSV</label>
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                csvContent ? "border-primary/50 bg-primary/5" : "border-border hover:border-primary/30"
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileUpload}
              />
              {csvContent ? (
                <div className="flex items-center justify-center gap-3">
                  <FileSpreadsheet className="size-5 text-primary" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-foreground">{fileName}</p>
                    <p className="text-xs text-muted-foreground">{(csvContent.length / 1024).toFixed(1)} KB</p>
                  </div>
                  <CheckCircle2 className="size-4 text-emerald-500 ml-2" />
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="size-6 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">Click to upload or drag and drop</p>
                  <p className="text-xs text-muted-foreground">CSV files only, max 5MB</p>
                </div>
              )}
            </div>
          </div>

          {/* Validate button */}
          {csvContent && step === "select" && (
            <Button
              onClick={handlePreview}
              disabled={previewMutation.isPending}
              className="gap-2"
            >
              {previewMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ArrowRight className="size-4" />
              )}
              Validate & Preview
            </Button>
          )}
        </div>

        {/* Step 2: Preview */}
        {step === "preview" && previewData && (
          <div className="bg-card border border-border rounded-lg p-5 space-y-5">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center size-6 rounded-full bg-primary/10 text-primary text-xs font-bold">2</div>
              <h2 className="text-sm font-semibold text-foreground">Preview & Confirm</h2>
            </div>

            {/* Summary */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary">
                <FileSpreadsheet className="size-3.5 text-muted-foreground" />
                <span className="text-xs font-mono">{previewData.totalRows} rows</span>
              </div>
              {previewData.success ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-emerald-500/10">
                  <CheckCircle2 className="size-3.5 text-emerald-500" />
                  <span className="text-xs text-emerald-600 font-medium">All rows valid</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-amber-500/10">
                  <AlertTriangle className="size-3.5 text-amber-500" />
                  <span className="text-xs text-amber-600 font-medium">
                    {previewData.validationErrors.length} validation error{previewData.validationErrors.length > 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </div>

            {/* Validation errors */}
            {previewData.validationErrors.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Errors</h3>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {previewData.validationErrors.map((err, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <XCircle className="size-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">
                        Row {err.row}, <span className="font-mono text-foreground">{err.field}</span>: {err.message}
                        {err.value && <span className="text-red-400 ml-1">("{err.value}")</span>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Data preview table */}
            {previewData.rows.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Data Preview (first {Math.min(previewData.rows.length, 10)} rows)
                </h3>
                <div className="overflow-x-auto rounded-md border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {Object.keys(previewData.rows[0]).slice(0, 6).map((key) => (
                          <TableHead key={key} className="text-xs font-mono whitespace-nowrap">
                            {key}
                          </TableHead>
                        ))}
                        {Object.keys(previewData.rows[0]).length > 6 && (
                          <TableHead className="text-xs text-muted-foreground">
                            +{Object.keys(previewData.rows[0]).length - 6} more
                          </TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.rows.slice(0, 10).map((row, i) => (
                        <TableRow key={i}>
                          {Object.values(row).slice(0, 6).map((val, j) => (
                            <TableCell key={j} className="text-xs truncate max-w-[150px]">
                              {String(val || "—")}
                            </TableCell>
                          ))}
                          {Object.keys(row).length > 6 && (
                            <TableCell className="text-xs text-muted-foreground">…</TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-3">
              <Button
                onClick={handleCommit}
                disabled={commitMutation.isPending || !previewData.success}
                className="gap-2"
              >
                {commitMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
                Import {previewData.totalRows} {ENTITY_LABELS[entityType]}
              </Button>
              <Button variant="outline" onClick={handleReset}>
                Cancel
              </Button>
              {!previewData.success && (
                <div className="flex items-center gap-1.5 text-xs text-amber-500">
                  <Info className="size-3.5" />
                  Fix validation errors before importing. Valid rows will be imported, invalid rows skipped.
                </div>
              )}
            </div>

            {/* Allow partial import even with errors */}
            {!previewData.success && (
              <div className="flex items-center gap-3 pt-2 border-t border-border">
                <Button
                  variant="outline"
                  onClick={handleCommit}
                  disabled={commitMutation.isPending}
                  className="gap-2 text-amber-600 border-amber-500/30 hover:bg-amber-500/10"
                >
                  {commitMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <AlertTriangle className="size-4" />
                  )}
                  Import valid rows only (skip errors)
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Result */}
        {step === "result" && commitData && (
          <div className="bg-card border border-border rounded-lg p-5 space-y-5">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center size-6 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-bold">✓</div>
              <h2 className="text-sm font-semibold text-foreground">Import Complete</h2>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-lg bg-emerald-500/10">
                <p className="text-2xl font-bold font-mono text-emerald-500">{commitData.created}</p>
                <p className="text-xs text-muted-foreground mt-1">Created</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-amber-500/10">
                <p className="text-2xl font-bold font-mono text-amber-500">{commitData.skipped}</p>
                <p className="text-xs text-muted-foreground mt-1">Skipped</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-secondary">
                <p className="text-2xl font-bold font-mono text-foreground">{commitData.totalRows}</p>
                <p className="text-xs text-muted-foreground mt-1">Total Rows</p>
              </div>
            </div>

            {commitData.errors.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Errors</h3>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {commitData.errors.map((err, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <XCircle className="size-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{err}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button onClick={handleReset} variant="outline" className="gap-2">
              <Upload className="size-4" />
              Import More Data
            </Button>
          </div>
        )}

        {/* Help section */}
        <div className="bg-card border border-border rounded-lg p-5 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Import Guidelines</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-muted-foreground">
            <div className="space-y-2">
              <p className="font-medium text-foreground">File Requirements</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>CSV format with UTF-8 encoding</li>
                <li>First row must be column headers</li>
                <li>Maximum file size: 5MB</li>
                <li>Use semicolons (;) to separate multiple values in a field</li>
              </ul>
            </div>
            <div className="space-y-2">
              <p className="font-medium text-foreground">Tips</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Download the template first for correct column order</li>
                <li>Venture names in tasks/SPVs must match exactly</li>
                <li>Dates should be in YYYY-MM-DD format</li>
                <li>Currency amounts should be plain numbers (no $ or commas)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
