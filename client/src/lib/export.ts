// CSV Export Utility — client-side data export for ventures, tasks, distributions

/**
 * Convert an array of objects to CSV string
 */
export function toCSV(
  data: Record<string, unknown>[],
  columns: { key: string; label: string }[]
): string {
  const header = columns.map(c => `"${c.label}"`).join(",");
  const rows = data.map(row =>
    columns
      .map(c => {
        const val = row[c.key];
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      })
      .join(",")
  );
  return [header, ...rows].join("\n");
}

/**
 * Download a string as a file
 */
export function downloadFile(content: string, filename: string, mimeType = "text/csv") {
  const blob = new Blob(["\uFEFF" + content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export data as CSV file
 */
export function exportCSV(
  data: Record<string, unknown>[],
  columns: { key: string; label: string }[],
  filename: string
) {
  const csv = toCSV(data, columns);
  downloadFile(csv, filename.endsWith(".csv") ? filename : `${filename}.csv`);
}


export const VENTURE_COLUMNS = [
  { key: "name", label: "Venture Name" },
  { key: "sector", label: "Sector" },
  { key: "location", label: "Location" },
  { key: "status", label: "Status" },
  { key: "stage", label: "Stage" },
  { key: "priority", label: "Priority" },
  { key: "healthScore", label: "Health Score" },
  { key: "overdueTasks", label: "Overdue Tasks" },
  { key: "totalTasks", label: "Total Tasks" },
  { key: "createdAt", label: "Created" },
];

export const TASK_COLUMNS = [
  { key: "title", label: "Task Title" },
  { key: "ventureName", label: "Venture" },
  { key: "status", label: "Status" },
  { key: "priority", label: "Priority" },
  { key: "assignees", label: "Assignees" },
  { key: "dueDate", label: "Due Date" },
  { key: "category", label: "Category" },
  { key: "createdAt", label: "Created" },
];

export const DISTRIBUTION_COLUMNS = [
  { key: "spvName", label: "SPV Name" },
  { key: "type", label: "Type" },
  { key: "amount", label: "Amount" },
  { key: "status", label: "Status" },
  { key: "scheduledDate", label: "Scheduled Date" },
  { key: "paidDate", label: "Paid Date" },
  { key: "recipientCount", label: "Recipients" },
];

export const AGENT_REPORT_COLUMNS = [
  { key: "agentName", label: "Agent" },
  { key: "action", label: "Action" },
  { key: "severity", label: "Severity" },
  { key: "ventureName", label: "Venture" },
  { key: "detail", label: "Detail" },
  { key: "createdAt", label: "Timestamp" },
];
