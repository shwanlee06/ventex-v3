#!/usr/bin/env python3
"""
Extract all tRPC procedures and classify tenant scoping — v2.
Now also detects resolveOrgId from orgScope.ts.
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
    "resolveOrgId": re.compile(r'resolveOrgId'),
    "enforceOrgScope": re.compile(r'enforceOrgScope'),
    "orgId_filter": re.compile(r'ctx\.user\.organizationId|user\.organizationId|input\.organizationId|input\.orgId'),
    "requirePermission": re.compile(r'requirePermission'),
    "logAudit": re.compile(r'logAudit'),
    "enforceRateLimit": re.compile(r'enforceRateLimit'),
    "ctx_user_id_only": re.compile(r'ctx\.user\.id|ctx\.user\.openId'),
}

def classify_scoping(proc_type, patterns, proc_name):
    mechanisms = []
    if proc_type == "adminProcedure":
        mechanisms.append("ADMIN_GATE")
    elif proc_type == "partnerProcedure":
        mechanisms.append("PARTNER_GATE")
    elif proc_type == "publicProcedure":
        return "PUBLIC", "Public — no auth required"

    if patterns["TENANT_PATCHED"]:
        mechanisms.append("TENANT_PATCHED")
    if patterns["resolveOrgId"]:
        mechanisms.append("resolveOrgId")
    if patterns["enforceOrgScope"]:
        mechanisms.append("enforceOrgScope")
    if patterns["isVentexTeam"]:
        mechanisms.append("isVentexTeam")
    if patterns["resolveVentureScope"]:
        mechanisms.append("resolveScope")
    if patterns["getOrgVentureIds"]:
        mechanisms.append("getOrgIds")
    if patterns["checkVentureAccess"]:
        mechanisms.append("checkAccess")
    if patterns["getAccessibleVentureIds"]:
        mechanisms.append("getAccessibleIds")
    if patterns["orgId_filter"]:
        mechanisms.append("orgId_WHERE")

    has_data_scoping = any(p in mechanisms for p in [
        "TENANT_PATCHED", "resolveOrgId", "enforceOrgScope",
        "isVentexTeam", "resolveScope", "getOrgIds",
        "checkAccess", "getAccessibleIds", "orgId_WHERE"
    ])

    if has_data_scoping:
        return "SCOPED", " + ".join(mechanisms)
    elif "ADMIN_GATE" in mechanisms:
        return "ADMIN_ONLY", "Admin role gate only — no data-level scoping"
    elif "PARTNER_GATE" in mechanisms:
        return "PARTNER_ONLY", "Partner role gate only — no data-level scoping"
    else:
        # Check if it's user-scoped (settings, profile)
        if patterns["ctx_user_id_only"]:
            return "USER_SCOPED", "Scoped to ctx.user.id (personal data)"
        return "UNSCOPED", "AUTH ONLY — no tenant scoping detected"

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
        for pn, pr in SCOPING_PATTERNS.items():
            found_patterns[pn] = bool(pr.search(body))

        category, detail = classify_scoping(proc_type, found_patterns, proc_name)
        results.append({
            "router": router_name,
            "procedure": proc_name,
            "type": proc_type,
            "category": category,
            "detail": detail,
            "patterns": found_patterns,
        })

# Summary
print(f"Total procedures: {len(results)}")
print()
type_counts = {}
for r in results:
    type_counts[r["type"]] = type_counts.get(r["type"], 0) + 1
print("By procedure type:")
for t, c in sorted(type_counts.items()):
    print(f"  {t}: {c}")
print()

cat_counts = {}
for r in results:
    cat_counts[r["category"]] = cat_counts.get(r["category"], 0) + 1
print("By scoping category:")
for c, n in sorted(cat_counts.items()):
    print(f"  {c}: {n}")
print()

# Print flagged items
print("=" * 70)
print("FLAGGED: UNSCOPED procedures (need manual review)")
print("=" * 70)
for r in results:
    if r["category"] == "UNSCOPED":
        print(f"  {r['router']}.{r['procedure']}: {r['type']}")
print()

print("=" * 70)
print("FLAGGED: ADMIN_ONLY procedures (role gate but no data scoping)")
print("=" * 70)
for r in results:
    if r["category"] == "ADMIN_ONLY":
        print(f"  {r['router']}.{r['procedure']}")
print()

print("=" * 70)
print("FULL LIST")
print("=" * 70)
for r in results:
    flag = ""
    if r["category"] == "UNSCOPED":
        flag = " *** UNSCOPED ***"
    elif r["category"] == "ADMIN_ONLY":
        flag = " [ADMIN_ONLY]"
    elif r["category"] == "USER_SCOPED":
        flag = " [USER_SCOPED]"
    print(f"{r['router']}.{r['procedure']}: {r['type']} -> {r['category']}{flag}")
    print(f"  {r['detail']}")

with open(f"{BASE}/qa/procedures-v2.json", "w") as f:
    json.dump(results, f, indent=2)
print(f"\nSaved to qa/procedures-v2.json")
