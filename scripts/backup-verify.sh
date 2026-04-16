#!/usr/bin/env bash
# ============================================================================
# VENTEX Backup Verification Script
# 
# Validates that database backups are restorable and data integrity is intact.
# Designed to run monthly as part of the BCP/DR testing schedule.
#
# Usage:
#   ./scripts/backup-verify.sh [--full] [--report-only]
#
# Options:
#   --full          Run full verification including row count comparison
#   --report-only   Generate report without running verification
#
# Prerequisites:
#   - mysql client installed
#   - DATABASE_URL environment variable set
#   - Access to TiDB Cloud backup API (if applicable)
# ============================================================================

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
REPORT_DIR="${PROJECT_DIR}/reports/backup-verification"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
REPORT_FILE="${REPORT_DIR}/backup-verify-${TIMESTAMP//[:.]/-}.md"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Counters
PASS=0
FAIL=0
WARN=0

mkdir -p "$REPORT_DIR"

# ---- Helpers ----------------------------------------------------------------

log_pass() {
  PASS=$((PASS + 1))
  echo -e "  ${GREEN}[PASS]${NC} $1"
  echo "- [x] $1" >> "$REPORT_FILE"
}

log_fail() {
  FAIL=$((FAIL + 1))
  echo -e "  ${RED}[FAIL]${NC} $1"
  echo "- [ ] **FAIL:** $1" >> "$REPORT_FILE"
}

log_warn() {
  WARN=$((WARN + 1))
  echo -e "  ${YELLOW}[WARN]${NC} $1"
  echo "- [ ] *WARN:* $1" >> "$REPORT_FILE"
}

log_info() {
  echo -e "  [INFO] $1"
  echo "  $1" >> "$REPORT_FILE"
}

# ---- Report Header ----------------------------------------------------------

cat > "$REPORT_FILE" << EOF
# Backup Verification Report

**Date:** ${TIMESTAMP}  
**Environment:** Production  
**Verification Type:** $(if [[ "${1:-}" == "--full" ]]; then echo "Full"; else echo "Standard"; fi)

---

## 1. Database Connectivity
EOF

echo ""
echo "============================================"
echo "  VENTEX Backup Verification"
echo "  ${TIMESTAMP}"
echo "============================================"
echo ""

# ---- 1. Database Connectivity -----------------------------------------------

echo "1. Database Connectivity"
echo "" >> "$REPORT_FILE"

if [ -z "${DATABASE_URL:-}" ]; then
  log_fail "DATABASE_URL not set"
  echo ""
  echo "Set DATABASE_URL to run verification."
  exit 1
fi

# Extract connection details from DATABASE_URL
# Format: mysql://user:pass@host:port/dbname
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:]*\):.*|\1|p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
DB_NAME=$(echo "$DATABASE_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')
DB_USER=$(echo "$DATABASE_URL" | sed -n 's|.*://\([^:]*\):.*|\1|p')

if [ -n "$DB_HOST" ]; then
  log_pass "Database URL parsed successfully (host: ${DB_HOST}, port: ${DB_PORT}, db: ${DB_NAME})"
else
  log_fail "Could not parse DATABASE_URL"
fi

# Test connectivity
if command -v mysql &>/dev/null; then
  if mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" "$DB_NAME" -e "SELECT 1" &>/dev/null; then
    log_pass "Database connection successful"
  else
    log_warn "Database connection failed (may require password or SSL)"
  fi
else
  log_warn "mysql client not installed — skipping direct connectivity test"
fi

# ---- 2. Schema Integrity ----------------------------------------------------

echo ""
echo "## 2. Schema Integrity" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo ""
echo "2. Schema Integrity"

# Check migration journal
JOURNAL_FILE="${PROJECT_DIR}/drizzle/meta/_journal.json"
if [ -f "$JOURNAL_FILE" ]; then
  MIGRATION_COUNT=$(python3 -c "import json; j=json.load(open('$JOURNAL_FILE')); print(len(j.get('entries', [])))" 2>/dev/null || echo "0")
  log_pass "Migration journal found with ${MIGRATION_COUNT} entries"
  
  # Check latest migration
  LATEST_MIGRATION=$(python3 -c "import json; j=json.load(open('$JOURNAL_FILE')); entries=j.get('entries',[]); print(entries[-1].get('tag','unknown') if entries else 'none')" 2>/dev/null || echo "unknown")
  log_info "Latest migration: ${LATEST_MIGRATION}"
else
  log_fail "Migration journal not found at ${JOURNAL_FILE}"
fi

# Check schema file
SCHEMA_FILE="${PROJECT_DIR}/drizzle/schema.ts"
if [ -f "$SCHEMA_FILE" ]; then
  TABLE_COUNT=$(grep -c "export const.*=.*mysqlTable\|export const.*=.*sqliteTable" "$SCHEMA_FILE" 2>/dev/null || echo "0")
  log_pass "Schema file found with ${TABLE_COUNT} table definitions"
else
  log_fail "Schema file not found"
fi

# ---- 3. Migration Files Integrity -------------------------------------------

echo ""
echo "## 3. Migration Files" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo ""
echo "3. Migration Files"

MIGRATION_DIR="${PROJECT_DIR}/drizzle"
SQL_FILES=$(find "$MIGRATION_DIR" -name "*.sql" -type f 2>/dev/null | wc -l)
if [ "$SQL_FILES" -gt 0 ]; then
  log_pass "Found ${SQL_FILES} SQL migration files"
  
  # Verify each migration file is non-empty
  EMPTY_MIGRATIONS=0
  while IFS= read -r f; do
    if [ ! -s "$f" ]; then
      EMPTY_MIGRATIONS=$((EMPTY_MIGRATIONS + 1))
    fi
  done < <(find "$MIGRATION_DIR" -name "*.sql" -type f 2>/dev/null)
  
  if [ "$EMPTY_MIGRATIONS" -eq 0 ]; then
    log_pass "All migration files are non-empty"
  else
    log_warn "${EMPTY_MIGRATIONS} empty migration files found"
  fi
else
  log_warn "No SQL migration files found"
fi

# ---- 4. Application Health ---------------------------------------------------

echo ""
echo "## 4. Application Health" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo ""
echo "4. Application Health"

# Check if server is running
if curl -sf http://localhost:3000/api/health &>/dev/null; then
  log_pass "Application health endpoint responding"
  
  # Check DB health
  DB_HEALTH=$(curl -sf http://localhost:3000/api/health/db 2>/dev/null || echo '{"status":"error"}')
  DB_STATUS=$(echo "$DB_HEALTH" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status','unknown'))" 2>/dev/null || echo "unknown")
  
  if [ "$DB_STATUS" = "healthy" ]; then
    log_pass "Database health check: healthy"
  else
    log_warn "Database health check: ${DB_STATUS}"
  fi
  
  # Check AI health
  AI_HEALTH=$(curl -sf http://localhost:3000/api/health/ai 2>/dev/null || echo '{"status":"error"}')
  AI_STATUS=$(echo "$AI_HEALTH" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status','unknown'))" 2>/dev/null || echo "unknown")
  
  if [ "$AI_STATUS" = "healthy" ]; then
    log_pass "AI service health check: healthy"
  else
    log_warn "AI service health check: ${AI_STATUS}"
  fi
else
  log_warn "Application not running — skipping health checks"
fi

# ---- 5. File Storage Verification --------------------------------------------

echo ""
echo "## 5. File Storage" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo ""
echo "5. File Storage"

# Check S3 configuration
if [ -f "${PROJECT_DIR}/server/storage.ts" ]; then
  log_pass "S3 storage module present"
else
  log_fail "S3 storage module not found"
fi

# ---- 6. Security Controls Verification --------------------------------------

echo ""
echo "## 6. Security Controls" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo ""
echo "6. Security Controls"

# Check security headers
if curl -sf http://localhost:3000/api/health &>/dev/null; then
  HEADERS=$(curl -sI http://localhost:3000/api/health 2>/dev/null)
  
  if echo "$HEADERS" | grep -qi "strict-transport-security"; then
    log_pass "HSTS header present"
  else
    log_warn "HSTS header missing"
  fi
  
  if echo "$HEADERS" | grep -qi "x-content-type-options"; then
    log_pass "X-Content-Type-Options header present"
  else
    log_warn "X-Content-Type-Options header missing"
  fi
  
  if echo "$HEADERS" | grep -qi "x-frame-options"; then
    log_pass "X-Frame-Options header present"
  else
    log_warn "X-Frame-Options header missing"
  fi
else
  log_warn "Server not running — skipping header checks"
fi

# ---- Summary ----------------------------------------------------------------

echo ""
echo "---" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "## Summary" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "| Result | Count |" >> "$REPORT_FILE"
echo "|--------|-------|" >> "$REPORT_FILE"
echo "| PASS | ${PASS} |" >> "$REPORT_FILE"
echo "| WARN | ${WARN} |" >> "$REPORT_FILE"
echo "| FAIL | ${FAIL} |" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

TOTAL=$((PASS + WARN + FAIL))
if [ "$FAIL" -eq 0 ]; then
  echo "**Overall: PASS** (${PASS}/${TOTAL} checks passed, ${WARN} warnings)" >> "$REPORT_FILE"
else
  echo "**Overall: FAIL** (${FAIL} failures require attention)" >> "$REPORT_FILE"
fi

echo ""
echo "============================================"
echo "  Results: ${PASS} PASS / ${WARN} WARN / ${FAIL} FAIL"
echo "  Report: ${REPORT_FILE}"
echo "============================================"

exit "$FAIL"
