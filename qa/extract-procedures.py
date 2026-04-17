#!/usr/bin/env python3
"""
Extract all tRPC procedures from the VENTEX codebase and classify their
tenant scoping mechanism for the Phase 2 security audit.
"""
import re, os, glob, json

BASE = "/home/ubuntu/royalton-system"
ROUTER_FILES = sorted(glob.glob(f"{BASE}/server/routers/*.ts"))
ROUTER_FILES += [f"{BASE}/server/routers.ts", f"{BASE}/server/_core/systemRouter.ts"]

PROC_RE = re.compile(r'^\s+(\w+):\s*(\w+Procedure)', re.MULTILINE)

SCOPING_PATTERNS = {
    "isVentexTeam": re.compile(r'isVentexTeam'),
    "resolveVentureScope": re.compile(r'resolveVentureScope|resolveSpvScope'),
    "getOrgVentureIds": re.compile(r'getOrgVentureIds|getOrgSpvIds'),
    "checkVentureAccess": re.compile(r'checkVentureAccess|checkSpvAccess'),
    "getAccessibleVentureIds": re.compile(r'getAccessibleVentureIds|getAccessibleSpvIds'),
    "TENANT_PATCHED": re.compile(r'TENANT_PATCHED'),
    "orgId_filter": re.compile(r'ctx\.user\.organizationId|user\.organizationId|input\.organizationId|input\.orgId'),
    "requirePermission": re.compile(r'requirePermission'),
    "logAudit": re.compile(r'logAudit'),
    "enforceRateLimit": re.compile(r'enforceRateLimit'),
}

def classify_scoping(proc_type, patterns, body, proc_name):
    mechanisms = []
    if proc_type == "adminProcedure":
        mechanisms.append("adminProcedure middleware (role gate: admin/owner only)")
    elif proc_type == "partnerProcedure":
        mechanisms.append("partnerProcedure middleware (role gate: partner/admin/owner)")
    elif proc_type == "publicProcedure":
        return "Public — no auth required (unscoped by design)"
    
    if patterns["TENANT_PATCHED"]:
        mechanisms.append("TENANT_PATCHED marker")
    if patterns["isVentexTeam"]:
        mechanisms.append("isVentexTeam check")
    if patterns["resolveVentureScope"]:
        mechanisms.append("resolveVentureScope/resolveSpvScope")
    if patterns["getOrgVentureIds"]:
        mechanisms.append("getOrgVentureIds/getOrgSpvIds")
    if patterns["checkVentureAccess"]:
        mechanisms.append("checkVentureAccess/checkSpvAccess")
    if patterns["getAccessibleVentureIds"]:
        mechanisms.append("getAccessibleVentureIds/getAccessibleSpvIds")
    if patterns["orgId_filter"]:
        mechanisms.append("explicit organizationId WHERE clause")
    if patterns["requirePermission"]:
        mechanisms.append("requirePermission check")
    
    if not mechanisms:
        if proc_type == "protectedProcedure":
            return "protectedProcedure — AUTH ONLY, NO TENANT SCOPING DETECTED"
        return "UNKNOWN — needs manual review"
    
    return " + ".join(mechanisms)

results = []
for filepath in ROUTER_FILES:
    if not os.path.exists(filepath):
        continue
    content = open(filepath).read()
    router_name = os.path.basename(filepath).replace('.ts', '')
    proc_matches = list(PROC_RE.finditer(content))
    
    for i, m in enumerate(proc_matches):
        proc_name = m.group(1)
        proc_type = m.group(2)
        start = m.start()
        if i + 1 < len(proc_matches):
            end = proc_matches[i + 1].start()
        else:
            end = min(start + 4000, len(content))
        body = content[start:end]
        
        found_patterns = {}
        for pattern_name, pattern_re in SCOPING_PATTERNS.items():
            found_patterns[pattern_name] = bool(pattern_re.search(body))
        
        scoping = classify_scoping(proc_type, found_patterns, body, proc_name)
        
        results.append({
            "router": router_name,
            "procedure": proc_name,
            "type": proc_type,
            "scoping": scoping,
            "patterns": found_patterns,
        })

print(f"Total procedures: {len(results)}")
print()

type_counts = {}
for r in results:
    type_counts[r["type"]] = type_counts.get(r["type"], 0) + 1
print("By procedure type:")
for t, c in sorted(type_counts.items()):
    print(f"  {t}: {c}")
print()

# Categorize
for r in results:
    s = r["scoping"]
    if "NO TENANT SCOPING DETECTED" in s:
        r["category"] = "UNSCOPED"
    elif "Public" in s:
        r["category"] = "PUBLIC"
    elif "adminProcedure middleware" in s and len(s.split(" + ")) == 1:
        r["category"] = "ADMIN_GATE_ONLY"
    elif "partnerProcedure middleware" in s and len(s.split(" + ")) == 1:
        r["category"] = "PARTNER_GATE_ONLY"
    else:
        r["category"] = "SCOPED"

cat_counts = {}
for r in results:
    cat_counts[r["category"]] = cat_counts.get(r["category"], 0) + 1
print("By scoping category:")
for c, n in sorted(cat_counts.items()):
    print(f"  {c}: {n}")
print()

# Print all
for r in results:
    tp = " [TENANT_PATCHED]" if r["patterns"]["TENANT_PATCHED"] else ""
    cat_flag = f" *** {r['category']} ***" if r["category"] in ("UNSCOPED", "ADMIN_GATE_ONLY", "PARTNER_GATE_ONLY") else ""
    print(f"{r['router']}.{r['procedure']}: {r['type']}{tp}{cat_flag}")
    print(f"  Scoping: {r['scoping']}")

with open(f"{BASE}/qa/procedures.json", "w") as f:
    json.dump(results, f, indent=2)
print(f"\nSaved to qa/procedures.json")
