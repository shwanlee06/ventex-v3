// PDF Export Utility — ATLAS System
// Generates professional distribution reports using jsPDF

import { jsPDF } from "jspdf";

interface DistributionData {
  name: string;
  fund: string;
  amount: number;
  currency: string;
  date: string;
  type: string;
  method: string;
  status: string;
  ageDays: number;
  notes?: string;
}

function formatCurrencyPdf(amount: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDatePdf(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export function exportDistributionPdf(dist: DistributionData) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 20;

  // Header bar
  doc.setFillColor(15, 15, 15);
  doc.rect(0, 0, pageWidth, 40, "F");

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("ATLAS", margin, 18);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 180, 180);
  doc.text("DISTRIBUTION REPORT", margin, 26);

  // Date generated
  doc.setFontSize(8);
  doc.setTextColor(140, 140, 140);
  doc.text(`Generated: ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`, margin, 34);

  // Reference ID
  doc.setTextColor(140, 140, 140);
  doc.text(`REF: ATL-DIST-${Date.now().toString(36).toUpperCase()}`, pageWidth - margin, 34, { align: "right" });

  y = 55;

  // Distribution name
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(dist.name, margin, y);
  y += 4;

  // Thin separator
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // Detail rows
  const fields: [string, string][] = [
    ["Fund", dist.fund],
    ["Amount", formatCurrencyPdf(dist.amount, dist.currency)],
    ["Date", formatDatePdf(dist.date)],
    ["Type", dist.type],
    ["Method", dist.method],
    ["Status", dist.status],
    ["Age", `${dist.ageDays} days`],
  ];

  for (const [label, value] of fields) {
    // Label
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120, 120, 120);
    doc.text(label.toUpperCase(), margin, y);

    // Value
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text(value, margin + 40, y);

    // Separator line
    y += 3;
    doc.setDrawColor(235, 235, 235);
    doc.setLineWidth(0.15);
    doc.line(margin, y, pageWidth - margin, y);
    y += 9;
  }

  // Notes section
  if (dist.notes) {
    y += 4;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120, 120, 120);
    doc.text("NOTES", margin, y);
    y += 6;

    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    const lines = doc.splitTextToSize(dist.notes, pageWidth - margin * 2);
    doc.text(lines, margin, y);
    y += lines.length * 5 + 4;
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.setFont("helvetica", "normal");
  doc.text("ATLAS Venture Intelligence Operations", margin, footerY);
  doc.text("Confidential", pageWidth - margin, footerY, { align: "right" });

  // Save
  const safeName = dist.name.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
  doc.save(`atlas_distribution_${safeName}.pdf`);
}

// Export all distributions as a summary PDF
export function exportAllDistributionsPdf(distributions: DistributionData[]) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = 15;

  // Header
  doc.setFillColor(15, 15, 15);
  doc.rect(0, 0, pageWidth, 35, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("ATLAS", margin, 16);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 180, 180);
  doc.text("DISTRIBUTIONS SUMMARY REPORT", margin, 24);

  doc.setFontSize(8);
  doc.setTextColor(140, 140, 140);
  doc.text(`Generated: ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`, margin, 30);

  const totalAmount = distributions.reduce((sum, d) => sum + d.amount, 0);
  doc.text(`Total: ${formatCurrencyPdf(totalAmount)} across ${distributions.length} distributions`, pageWidth - margin, 30, { align: "right" });

  y = 45;

  // Table header
  const cols = [margin, margin + 60, margin + 110, margin + 145, margin + 185, margin + 215];
  const headers = ["Distribution", "Fund", "Amount", "Date", "Type", "Status"];

  doc.setFillColor(245, 245, 245);
  doc.rect(margin - 2, y - 5, pageWidth - margin * 2 + 4, 8, "F");

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 100, 100);
  headers.forEach((h, i) => doc.text(h.toUpperCase(), cols[i], y));
  y += 8;

  // Table rows
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  for (const dist of distributions) {
    if (y > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      y = 20;
    }

    doc.setTextColor(30, 30, 30);
    doc.text(dist.name.slice(0, 30), cols[0], y);
    doc.setTextColor(100, 100, 100);
    doc.text(dist.fund.slice(0, 25), cols[1], y);
    doc.setTextColor(30, 30, 30);
    doc.setFont("helvetica", "bold");
    doc.text(formatCurrencyPdf(dist.amount, dist.currency), cols[2], y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(formatDatePdf(dist.date), cols[3], y);
    doc.text(dist.type, cols[4], y);

    // Status with color
    const statusColor = dist.status === "Paid" ? [34, 197, 94] : dist.status === "Scheduled" ? [59, 130, 246] : [239, 68, 68];
    doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.text(dist.status, cols[5], y);

    y += 7;

    // Row separator
    doc.setDrawColor(240, 240, 240);
    doc.setLineWidth(0.1);
    doc.line(margin, y - 3, pageWidth - margin, y - 3);
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 10;
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text("ATLAS Venture Intelligence Operations — Confidential", margin, footerY);

  doc.save(`atlas_distributions_summary_${new Date().toISOString().split("T")[0]}.pdf`);
}
