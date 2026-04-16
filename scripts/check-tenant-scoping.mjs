#!/usr/bin/env node
/**
 * CI Check: Tenant Scoping Verification
 * 
 * Scans all tRPC router files and DB helpers for database queries
 * that may be missing org/tenant scoping. Flags violations for review.
 * 
 * Usage:
 *   node scripts/check-tenant-scoping.mjs          # Run check
 *   node scripts/check-tenant-scoping.mjs --strict  # Fail on any violation
 * 
 * Exit codes:
 *   0 = No violations found
 *   1 = Violations found (strict mode) or script error
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const STRICT = process.argv.includes("--strict");

// ─── Configuration ────────────────────────────────────────────────

/** Directories to scan */
const SCAN_DIRS = [
  path.join(ROOT, "server/routers"),
  path.join(ROOT, "server/db.ts"),
];

/** File extensions to scan */
const EXTENSIONS = [".ts", ".tsx"];

/** 
 * Patterns that indicate a DB query is being made.
 * Each pattern has a name and regex.
 */
const DB_QUERY_PATTERNS = [
  { name: "db.select", regex: /db\s*\.\s*select\s*\(/g },
  { name: "db.insert", regex: /db\s*\.\s*insert\s*\(/g },
  { name: "db.update", regex: /db\s*\.\s*update\s*\(/g },
  { name: "db.delete", regex: /db\s*\.\s*delete\s*\(/g },
  { name: "db.query", regex: /db\s*\.\s*query\s*\./g },
  { name: "db.execute", regex: /db\s*\.\s*execute\s*\(/g },
];

/**
 * Patterns that indicate org scoping IS present.
 * If any of these appear near a DB query, it's considered scoped.
 */
const SCOPING_PATTERNS = [
  /resolveOrgId/,
  /enforceOrgScope/,
  /organizationId/,
  /orgId/,
  /tenantOrgId/,
  /validateTenantContext/,
  /assertTenantScope/,
  /getOrgVentureIds/,
  /ventureIds/,
  /orgVentureIds/,
  /ctx\.orgId/,
  /ctx\.user\.organizationId/,
  /tenantScopedProcedure/,
];

/**
 * Known exceptions — procedures that legitimately don't need org scoping.
 * Each entry: { file: string, procedure: string, reason: string }
 */
const EXCEPTIONS = [
  { file: "auth.ts", procedure: "me", reason: "Returns current user's own data" },
  { file: "auth.ts", procedure: "logout", reason: "Session management, not data access" },
  { file: "system.ts", procedure: "notifyOwner", reason: "System-level notification" },
  { file: "system.ts", procedure: "health", reason: "Health check, no data access" },
  { file: "access.ts", procedure: "lookupOrgBySlug", reason: "Public org lookup for onboarding" },
  { file: "access.ts", procedure: "acceptInvitation", reason: "Invitation acceptance flow" },
  { file: "users.ts", procedure: "updateProfile", reason: "User updates their own profile" },
];

// ─── Scanner ──────────────────────────────────────────────────────

function getFiles(dirOrFile) {
  const stat = fs.statSync(dirOrFile);
  if (stat.isFile()) {
    return EXTENSIONS.some(ext => dirOrFile.endsWith(ext)) ? [dirOrFile] : [];
  }
  
  const files = [];
  const entries = fs.readdirSync(dirOrFile, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirOrFile, entry.name);
    if (entry.isDirectory()) {
      files.push(...getFiles(fullPath));
    } else if (EXTENSIONS.some(ext => entry.name.endsWith(ext))) {
      // Skip test files
      if (entry.name.includes(".test.")) continue;
      files.push(fullPath);
    }
  }
  return files;
}

function extractProcedureContext(content, queryIndex) {
  // Look backwards from the query to find the procedure name
  const before = content.substring(Math.max(0, queryIndex - 500), queryIndex);
  
  // Match tRPC procedure patterns
  const procMatch = before.match(/(\w+)\s*:\s*(?:publicProcedure|protectedProcedure|tenantScopedProcedure|adminProcedure)/g);
  if (procMatch) {
    const last = procMatch[procMatch.length - 1];
    const nameMatch = last.match(/^(\w+)/);
    return nameMatch ? nameMatch[1] : "unknown";
  }
  
  // Match function/const patterns
  const funcMatch = before.match(/(?:function|const|export\s+(?:async\s+)?function)\s+(\w+)/g);
  if (funcMatch) {
    const last = funcMatch[funcMatch.length - 1];
    const nameMatch = last.match(/(\w+)$/);
    return nameMatch ? nameMatch[1] : "unknown";
  }
  
  return "unknown";
}

function checkScopingNearQuery(content, queryIndex) {
  // Check a window of ~300 chars before and after the query for scoping patterns
  const windowStart = Math.max(0, queryIndex - 300);
  const windowEnd = Math.min(content.length, queryIndex + 500);
  const window = content.substring(windowStart, windowEnd);
  
  for (const pattern of SCOPING_PATTERNS) {
    if (pattern.test(window)) {
      return true;
    }
  }
  return false;
}

function isException(fileName, procedureName) {
  return EXCEPTIONS.some(
    ex => fileName.includes(ex.file) && procedureName === ex.procedure
  );
}

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const fileName = path.basename(filePath);
  const relativePath = path.relative(ROOT, filePath);
  const violations = [];
  
  // Check if the file uses tenantScopedProcedure globally
  const usesTenantScoped = content.includes("tenantScopedProcedure");
  
  for (const pattern of DB_QUERY_PATTERNS) {
    // Reset regex
    pattern.regex.lastIndex = 0;
    let match;
    
    while ((match = pattern.regex.exec(content)) !== null) {
      const lineNum = content.substring(0, match.index).split("\n").length;
      const procedureName = extractProcedureContext(content, match.index);
      
      // Skip known exceptions
      if (isException(fileName, procedureName)) continue;
      
      // Check if scoping is present near this query
      const isScoped = checkScopingNearQuery(content, match.index);
      
      if (!isScoped && !usesTenantScoped) {
        violations.push({
          file: relativePath,
          line: lineNum,
          query: pattern.name,
          procedure: procedureName,
          severity: "CRITICAL",
        });
      }
    }
  }
  
  return violations;
}

// ─── Main ─────────────────────────────────────────────────────────

function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  VENTEX Tenant Scoping CI Check                            ║");
  console.log("║  Scanning for DB queries missing org/tenant scoping...     ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log();
  
  const allFiles = [];
  for (const dir of SCAN_DIRS) {
    if (fs.existsSync(dir)) {
      allFiles.push(...getFiles(dir));
    }
  }
  
  console.log(`Scanning ${allFiles.length} files...\n`);
  
  const allViolations = [];
  for (const file of allFiles) {
    const violations = scanFile(file);
    allViolations.push(...violations);
  }
  
  if (allViolations.length === 0) {
    console.log("✅ No tenant scoping violations found.\n");
    console.log(`Scanned: ${allFiles.length} files`);
    console.log(`Exceptions: ${EXCEPTIONS.length} known safe procedures`);
    process.exit(0);
  }
  
  // Group by file
  const byFile = {};
  for (const v of allViolations) {
    if (!byFile[v.file]) byFile[v.file] = [];
    byFile[v.file].push(v);
  }
  
  console.log(`⚠️  Found ${allViolations.length} potential tenant scoping violations:\n`);
  
  for (const [file, violations] of Object.entries(byFile)) {
    console.log(`  📄 ${file}`);
    for (const v of violations) {
      console.log(`     Line ${v.line}: ${v.query} in procedure "${v.procedure}" — ${v.severity}`);
    }
    console.log();
  }
  
  console.log("─".repeat(64));
  console.log(`Total: ${allViolations.length} violations in ${Object.keys(byFile).length} files`);
  console.log(`Mode: ${STRICT ? "STRICT (failing CI)" : "REPORT ONLY"}`);
  console.log();
  
  if (STRICT) {
    console.log("❌ CI check FAILED — fix all violations before merging.");
    process.exit(1);
  } else {
    console.log("⚠️  Violations found but running in report mode. Use --strict to fail CI.");
    process.exit(0);
  }
}

main();
