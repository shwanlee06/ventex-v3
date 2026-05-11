/**
 * SCIM 2.0 Provisioning — Fully Wired to team_members & organizations
 *
 * SCIM (System for Cross-domain Identity Management) enables enterprise
 * SSO providers (Okta, Azure AD, OneLogin) to automatically provision
 * and deprovision user accounts in VENTEX.
 *
 * Reference: https://datatracker.ietf.org/doc/html/rfc7644
 */

import { Router, Request, Response } from "express";
import { getDb } from "../db";
import { teamMembers, organizations, ventureTeam } from "../../drizzle/schema";
import { eq, like, or, sql } from "drizzle-orm";

// ─── SCIM 2.0 Schema Definitions ────────────────────────────────

export const SCIM_SCHEMAS = {
  User: "urn:ietf:params:scim:schemas:core:2.0:User",
  Group: "urn:ietf:params:scim:schemas:core:2.0:Group",
  ListResponse: "urn:ietf:params:scim:api:messages:2.0:ListResponse",
  Error: "urn:ietf:params:scim:api:messages:2.0:Error",
  PatchOp: "urn:ietf:params:scim:api:messages:2.0:PatchOp",
  ServiceProviderConfig: "urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig",
} as const;

export interface SCIMUser {
  schemas: string[];
  id: string;
  externalId?: string;
  userName: string;
  name: {
    givenName: string;
    familyName: string;
    formatted?: string;
  };
  emails: Array<{
    value: string;
    type: string;
    primary: boolean;
  }>;
  active: boolean;
  groups?: Array<{
    value: string;
    display: string;
  }>;
  meta: {
    resourceType: "User";
    created: string;
    lastModified: string;
    location: string;
  };
}

export interface SCIMGroup {
  schemas: string[];
  id: string;
  displayName: string;
  members: Array<{
    value: string;
    display: string;
  }>;
  meta: {
    resourceType: "Group";
    created: string;
    lastModified: string;
    location: string;
  };
}

// ─── Helpers ───────────────────────────────────────────────────

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    + "-" + Date.now().toString(36);
}

function getBaseUrl(req: Request): string {
  const proto = req.headers["x-forwarded-proto"] || req.protocol || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
  return `${proto}://${host}`;
}

function teamMemberToSCIMUser(member: any, baseUrl: string): SCIMUser {
  const nameParts = (member.name || "").split(" ");
  const givenName = nameParts[0] || "";
  const familyName = nameParts.slice(1).join(" ") || "";

  return {
    schemas: [SCIM_SCHEMAS.User],
    id: String(member.id),
    externalId: member.legacyId || undefined,
    userName: member.email || member.slug,
    name: {
      givenName,
      familyName,
      formatted: member.name,
    },
    emails: member.email
      ? [{ value: member.email, type: "work", primary: true }]
      : [],
    active: member.status === "Active" && member.adminStatus !== "deactivated",
    groups: member.organizationId
      ? [{ value: String(member.organizationId), display: "" }]
      : [],
    meta: {
      resourceType: "User",
      created: member.createdAt ? new Date(member.createdAt).toISOString() : new Date().toISOString(),
      lastModified: member.updatedAt ? new Date(member.updatedAt).toISOString() : new Date().toISOString(),
      location: `${baseUrl}/scim/v2/Users/${member.id}`,
    },
  };
}

function orgToSCIMGroup(org: any, members: any[], baseUrl: string): SCIMGroup {
  return {
    schemas: [SCIM_SCHEMAS.Group],
    id: String(org.id),
    displayName: org.name,
    members: members.map((m) => ({
      value: String(m.id),
      display: m.name || m.email || "",
    })),
    meta: {
      resourceType: "Group",
      created: org.createdAt ? new Date(org.createdAt).toISOString() : new Date().toISOString(),
      lastModified: org.updatedAt ? new Date(org.updatedAt).toISOString() : new Date().toISOString(),
      location: `${baseUrl}/scim/v2/Groups/${org.id}`,
    },
  };
}

/**
 * Parse a SCIM filter string. Supports basic eq filter:
 * e.g., 'userName eq "john@example.com"'
 */
function parseSCIMFilter(filter: string | undefined): { field: string; value: string } | null {
  if (!filter) return null;
  const match = filter.match(/^(\w+)\s+eq\s+"([^"]+)"$/);
  if (!match) return null;
  return { field: match[1], value: match[2] };
}

// ─── SCIM Bearer Token Authentication ───────────────────────────

function scimAuth(req: Request, res: Response, next: () => void) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      schemas: [SCIM_SCHEMAS.Error],
      detail: "Authentication required. Provide a Bearer token.",
      status: "401",
    });
  }

  const token = authHeader.slice(7);
  const expectedToken = process.env.SCIM_BEARER_TOKEN;

  if (!expectedToken) {
    return res.status(503).json({
      schemas: [SCIM_SCHEMAS.Error],
      detail: "SCIM provisioning is not configured. Set SCIM_BEARER_TOKEN environment variable.",
      status: "503",
    });
  }

  if (token !== expectedToken) {
    return res.status(401).json({
      schemas: [SCIM_SCHEMAS.Error],
      detail: "Invalid bearer token.",
      status: "401",
    });
  }

  next();
}

// ─── SCIM Router ────────────────────────────────────────────────

export function createSCIMRouter(): Router {
  const router = Router();

  // All SCIM endpoints require bearer token auth
  router.use(scimAuth);

  // ── Service Provider Configuration ──
  router.get("/ServiceProviderConfig", (_req, res) => {
    res.json({
      schemas: [SCIM_SCHEMAS.ServiceProviderConfig],
      documentationUri: "https://www.ventex.us.com/docs/scim",
      patch: { supported: true },
      bulk: { supported: false, maxOperations: 0, maxPayloadSize: 0 },
      filter: { supported: true, maxResults: 200 },
      changePassword: { supported: false },
      sort: { supported: false },
      etag: { supported: false },
      authenticationSchemes: [
        {
          type: "oauthbearertoken",
          name: "OAuth Bearer Token",
          description: "Authentication scheme using the OAuth Bearer Token Standard",
          specUri: "https://www.rfc-editor.org/info/rfc6750",
          primary: true,
        },
      ],
    });
  });

  // ── Users ──

  // List users with optional filter and pagination
  router.get("/Users", async (req, res) => {
    try {
      const db = await getDb();
      if (!db) {
        return res.status(503).json({
          schemas: [SCIM_SCHEMAS.Error],
          detail: "Database unavailable",
          status: "503",
        });
      }

      const startIndex = Math.max(1, parseInt(req.query.startIndex as string) || 1);
      const count = Math.min(200, Math.max(1, parseInt(req.query.count as string) || 100));
      const filter = parseSCIMFilter(req.query.filter as string);
      const baseUrl = getBaseUrl(req);

      let query = db.select().from(teamMembers);

      if (filter) {
        if (filter.field === "userName" || filter.field === "emails.value") {
          query = query.where(eq(teamMembers.email, filter.value)) as any;
        } else if (filter.field === "externalId") {
          query = query.where(eq(teamMembers.legacyId, filter.value)) as any;
        } else if (filter.field === "displayName") {
          query = query.where(eq(teamMembers.name, filter.value)) as any;
        }
      }

      const allMembers = await query;
      const totalResults = allMembers.length;
      const paged = allMembers.slice(startIndex - 1, startIndex - 1 + count);

      res.json({
        schemas: [SCIM_SCHEMAS.ListResponse],
        totalResults,
        startIndex,
        itemsPerPage: paged.length,
        Resources: paged.map((m) => teamMemberToSCIMUser(m, baseUrl)),
      });
    } catch (err: any) {
      console.error("[SCIM] List users error:", err);
      res.status(500).json({
        schemas: [SCIM_SCHEMAS.Error],
        detail: err.message || "Internal server error",
        status: "500",
      });
    }
  });

  // Get user by ID
  router.get("/Users/:id", async (req, res) => {
    try {
      const db = await getDb();
      if (!db) {
        return res.status(503).json({
          schemas: [SCIM_SCHEMAS.Error],
          detail: "Database unavailable",
          status: "503",
        });
      }

      const memberId = parseInt(req.params.id);
      if (isNaN(memberId)) {
        return res.status(400).json({
          schemas: [SCIM_SCHEMAS.Error],
          detail: "Invalid user ID format",
          status: "400",
        });
      }

      const [member] = await db
        .select()
        .from(teamMembers)
        .where(eq(teamMembers.id, memberId))
        .limit(1);

      if (!member) {
        return res.status(404).json({
          schemas: [SCIM_SCHEMAS.Error],
          detail: `User ${req.params.id} not found`,
          status: "404",
        });
      }

      res.json(teamMemberToSCIMUser(member, getBaseUrl(req)));
    } catch (err: any) {
      console.error("[SCIM] Get user error:", err);
      res.status(500).json({
        schemas: [SCIM_SCHEMAS.Error],
        detail: err.message || "Internal server error",
        status: "500",
      });
    }
  });

  // Create user
  router.post("/Users", async (req, res) => {
    try {
      const db = await getDb();
      if (!db) {
        return res.status(503).json({
          schemas: [SCIM_SCHEMAS.Error],
          detail: "Database unavailable",
          status: "503",
        });
      }

      const body = req.body as Partial<SCIMUser>;
      console.log("[SCIM] Create user request:", JSON.stringify(body, null, 2));

      // Extract fields from SCIM payload
      const givenName = body.name?.givenName || "";
      const familyName = body.name?.familyName || "";
      const fullName = body.name?.formatted || `${givenName} ${familyName}`.trim();
      const email = body.emails?.find((e) => e.primary)?.value || body.emails?.[0]?.value || body.userName;
      const externalId = body.externalId;

      if (!fullName) {
        return res.status(400).json({
          schemas: [SCIM_SCHEMAS.Error],
          detail: "User name is required (name.givenName or name.formatted)",
          status: "400",
        });
      }

      // Check for duplicate by email
      if (email) {
        const [existing] = await db
          .select()
          .from(teamMembers)
          .where(eq(teamMembers.email, email))
          .limit(1);

        if (existing) {
          return res.status(409).json({
            schemas: [SCIM_SCHEMAS.Error],
            detail: `User with email ${email} already exists (id: ${existing.id})`,
            status: "409",
          });
        }
      }

      const slug = generateSlug(fullName);

      const [result] = await db.insert(teamMembers).values({
        name: fullName,
        email: email || null,
        legacyId: externalId || null,
        slug,
        status: body.active !== false ? "Active" : "Inactive",
        adminStatus: body.active !== false ? "active" : "deactivated",
        type: "External",  // SCIM-provisioned users are external
        systemRole: "user",
        role: body.name?.familyName ? `${givenName} (SCIM)` : "SCIM Provisioned",
      }).$returningId();

      const memberId = (result as any).id;

      // Fetch the created member
      const [created] = await db
        .select()
        .from(teamMembers)
        .where(eq(teamMembers.id, memberId))
        .limit(1);

      res.status(201).json(teamMemberToSCIMUser(created, getBaseUrl(req)));
    } catch (err: any) {
      console.error("[SCIM] Create user error:", err);
      res.status(500).json({
        schemas: [SCIM_SCHEMAS.Error],
        detail: err.message || "Internal server error",
        status: "500",
      });
    }
  });

  // Update user (PUT - full replace)
  router.put("/Users/:id", async (req, res) => {
    try {
      const db = await getDb();
      if (!db) {
        return res.status(503).json({
          schemas: [SCIM_SCHEMAS.Error],
          detail: "Database unavailable",
          status: "503",
        });
      }

      const memberId = parseInt(req.params.id);
      if (isNaN(memberId)) {
        return res.status(400).json({
          schemas: [SCIM_SCHEMAS.Error],
          detail: "Invalid user ID format",
          status: "400",
        });
      }

      const body = req.body as Partial<SCIMUser>;
      console.log("[SCIM] Update user request:", req.params.id, JSON.stringify(body, null, 2));

      // Verify user exists
      const [existing] = await db
        .select()
        .from(teamMembers)
        .where(eq(teamMembers.id, memberId))
        .limit(1);

      if (!existing) {
        return res.status(404).json({
          schemas: [SCIM_SCHEMAS.Error],
          detail: `User ${req.params.id} not found`,
          status: "404",
        });
      }

      // Extract fields
      const givenName = body.name?.givenName || "";
      const familyName = body.name?.familyName || "";
      const fullName = body.name?.formatted || `${givenName} ${familyName}`.trim() || existing.name;
      const email = body.emails?.find((e) => e.primary)?.value || body.emails?.[0]?.value || body.userName;
      const isActive = body.active !== false;

      await db
        .update(teamMembers)
        .set({
          name: fullName,
          email: email || existing.email,
          legacyId: body.externalId || existing.legacyId,
          status: isActive ? "Active" : "Inactive",
          adminStatus: isActive ? "active" : "deactivated",
        })
        .where(eq(teamMembers.id, memberId));

      // Fetch updated member
      const [updated] = await db
        .select()
        .from(teamMembers)
        .where(eq(teamMembers.id, memberId))
        .limit(1);

      res.json(teamMemberToSCIMUser(updated, getBaseUrl(req)));
    } catch (err: any) {
      console.error("[SCIM] Update user error:", err);
      res.status(500).json({
        schemas: [SCIM_SCHEMAS.Error],
        detail: err.message || "Internal server error",
        status: "500",
      });
    }
  });

  // Patch user (partial update — used for deprovisioning: active=false)
  router.patch("/Users/:id", async (req, res) => {
    try {
      const db = await getDb();
      if (!db) {
        return res.status(503).json({
          schemas: [SCIM_SCHEMAS.Error],
          detail: "Database unavailable",
          status: "503",
        });
      }

      const memberId = parseInt(req.params.id);
      if (isNaN(memberId)) {
        return res.status(400).json({
          schemas: [SCIM_SCHEMAS.Error],
          detail: "Invalid user ID format",
          status: "400",
        });
      }

      console.log("[SCIM] Patch user request:", req.params.id, JSON.stringify(req.body, null, 2));

      // Verify user exists
      const [existing] = await db
        .select()
        .from(teamMembers)
        .where(eq(teamMembers.id, memberId))
        .limit(1);

      if (!existing) {
        return res.status(404).json({
          schemas: [SCIM_SCHEMAS.Error],
          detail: `User ${req.params.id} not found`,
          status: "404",
        });
      }

      // Process SCIM PatchOp operations
      const operations = req.body?.Operations || req.body?.operations || [];
      const updateFields: Record<string, any> = {};

      for (const op of operations) {
        const operation = (op.op || "").toLowerCase();
        const path = op.path || "";
        const value = op.value;

        if (operation === "replace") {
          if (path === "active" || (!path && value?.active !== undefined)) {
            const isActive = path === "active" ? value : value.active;
            updateFields.status = isActive ? "Active" : "Inactive";
            updateFields.adminStatus = isActive ? "active" : "deactivated";
          }
          if (path === "name.givenName" || path === "name.familyName") {
            // Rebuild full name
            const currentParts = (existing.name || "").split(" ");
            if (path === "name.givenName") {
              updateFields.name = `${value} ${currentParts.slice(1).join(" ")}`.trim();
            } else {
              updateFields.name = `${currentParts[0] || ""} ${value}`.trim();
            }
          }
          if (path === "emails[type eq \"work\"].value" || path === "userName") {
            updateFields.email = value;
          }
          if (!path && typeof value === "object") {
            // Bulk replace — apply known fields
            if (value.name?.formatted) updateFields.name = value.name.formatted;
            if (value.name?.givenName || value.name?.familyName) {
              updateFields.name = `${value.name?.givenName || ""} ${value.name?.familyName || ""}`.trim();
            }
            if (value.emails?.[0]?.value) updateFields.email = value.emails[0].value;
            if (value.userName) updateFields.email = value.userName;
          }
        }
      }

      if (Object.keys(updateFields).length > 0) {
        await db
          .update(teamMembers)
          .set(updateFields)
          .where(eq(teamMembers.id, memberId));
      }

      // Fetch updated member
      const [updated] = await db
        .select()
        .from(teamMembers)
        .where(eq(teamMembers.id, memberId))
        .limit(1);

      res.json(teamMemberToSCIMUser(updated, getBaseUrl(req)));
    } catch (err: any) {
      console.error("[SCIM] Patch user error:", err);
      res.status(500).json({
        schemas: [SCIM_SCHEMAS.Error],
        detail: err.message || "Internal server error",
        status: "500",
      });
    }
  });

  // Delete user (soft-deactivate)
  router.delete("/Users/:id", async (req, res) => {
    try {
      const db = await getDb();
      if (!db) {
        return res.status(503).json({
          schemas: [SCIM_SCHEMAS.Error],
          detail: "Database unavailable",
          status: "503",
        });
      }

      const memberId = parseInt(req.params.id);
      if (isNaN(memberId)) {
        return res.status(400).json({
          schemas: [SCIM_SCHEMAS.Error],
          detail: "Invalid user ID format",
          status: "400",
        });
      }

      console.log("[SCIM] Delete user request:", req.params.id);

      // Verify user exists
      const [existing] = await db
        .select()
        .from(teamMembers)
        .where(eq(teamMembers.id, memberId))
        .limit(1);

      if (!existing) {
        return res.status(404).json({
          schemas: [SCIM_SCHEMAS.Error],
          detail: `User ${req.params.id} not found`,
          status: "404",
        });
      }

      // Soft-deactivate: set status to Inactive, adminStatus to deactivated
      await db
        .update(teamMembers)
        .set({
          status: "Inactive",
          adminStatus: "deactivated",
        })
        .where(eq(teamMembers.id, memberId));

      // Return 204 No Content per SCIM spec
      res.status(204).send();
    } catch (err: any) {
      console.error("[SCIM] Delete user error:", err);
      res.status(500).json({
        schemas: [SCIM_SCHEMAS.Error],
        detail: err.message || "Internal server error",
        status: "500",
      });
    }
  });

  // ── Groups ──

  // List groups (mapped to organizations)
  router.get("/Groups", async (req, res) => {
    try {
      const db = await getDb();
      if (!db) {
        return res.status(503).json({
          schemas: [SCIM_SCHEMAS.Error],
          detail: "Database unavailable",
          status: "503",
        });
      }

      const startIndex = Math.max(1, parseInt(req.query.startIndex as string) || 1);
      const count = Math.min(200, Math.max(1, parseInt(req.query.count as string) || 100));
      const filter = parseSCIMFilter(req.query.filter as string);
      const baseUrl = getBaseUrl(req);

      let query = db.select().from(organizations);

      if (filter && filter.field === "displayName") {
        query = query.where(eq(organizations.name, filter.value)) as any;
      }

      const allOrgs = await query;
      const totalResults = allOrgs.length;
      const paged = allOrgs.slice(startIndex - 1, startIndex - 1 + count);

      // Fetch members for each org
      const resources: SCIMGroup[] = [];
      for (const org of paged) {
        const members = await db
          .select()
          .from(teamMembers)
          .where(eq(teamMembers.organizationId, org.id));
        resources.push(orgToSCIMGroup(org, members, baseUrl));
      }

      res.json({
        schemas: [SCIM_SCHEMAS.ListResponse],
        totalResults,
        startIndex,
        itemsPerPage: resources.length,
        Resources: resources,
      });
    } catch (err: any) {
      console.error("[SCIM] List groups error:", err);
      res.status(500).json({
        schemas: [SCIM_SCHEMAS.Error],
        detail: err.message || "Internal server error",
        status: "500",
      });
    }
  });

  // Get group by ID
  router.get("/Groups/:id", async (req, res) => {
    try {
      const db = await getDb();
      if (!db) {
        return res.status(503).json({
          schemas: [SCIM_SCHEMAS.Error],
          detail: "Database unavailable",
          status: "503",
        });
      }

      const orgId = parseInt(req.params.id);
      if (isNaN(orgId)) {
        return res.status(400).json({
          schemas: [SCIM_SCHEMAS.Error],
          detail: "Invalid group ID format",
          status: "400",
        });
      }

      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, orgId))
        .limit(1);

      if (!org) {
        return res.status(404).json({
          schemas: [SCIM_SCHEMAS.Error],
          detail: `Group ${req.params.id} not found`,
          status: "404",
        });
      }

      const members = await db
        .select()
        .from(teamMembers)
        .where(eq(teamMembers.organizationId, orgId));

      res.json(orgToSCIMGroup(org, members, getBaseUrl(req)));
    } catch (err: any) {
      console.error("[SCIM] Get group error:", err);
      res.status(500).json({
        schemas: [SCIM_SCHEMAS.Error],
        detail: err.message || "Internal server error",
        status: "500",
      });
    }
  });

  // Create group
  router.post("/Groups", async (req, res) => {
    try {
      const db = await getDb();
      if (!db) {
        return res.status(503).json({
          schemas: [SCIM_SCHEMAS.Error],
          detail: "Database unavailable",
          status: "503",
        });
      }

      const body = req.body as Partial<SCIMGroup>;
      console.log("[SCIM] Create group request:", JSON.stringify(body, null, 2));

      const displayName = body.displayName;
      if (!displayName) {
        return res.status(400).json({
          schemas: [SCIM_SCHEMAS.Error],
          detail: "displayName is required",
          status: "400",
        });
      }

      // Check for duplicate
      const [existing] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.name, displayName))
        .limit(1);

      if (existing) {
        return res.status(409).json({
          schemas: [SCIM_SCHEMAS.Error],
          detail: `Group with name "${displayName}" already exists (id: ${existing.id})`,
          status: "409",
        });
      }

      const slug = generateSlug(displayName);

      const [result] = await db.insert(organizations).values({
        name: displayName,
        slug,
        type: "client",
        status: "active",
        description: `SCIM-provisioned organization: ${displayName}`,
      }).$returningId();

      const orgId = (result as any).id;

      // Assign members if provided
      if (body.members && body.members.length > 0) {
        for (const member of body.members) {
          const memberId = parseInt(member.value);
          if (!isNaN(memberId)) {
            await db
              .update(teamMembers)
              .set({ organizationId: orgId })
              .where(eq(teamMembers.id, memberId));
          }
        }
      }

      // Fetch created org with members
      const [created] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, orgId))
        .limit(1);

      const orgMembers = await db
        .select()
        .from(teamMembers)
        .where(eq(teamMembers.organizationId, orgId));

      res.status(201).json(orgToSCIMGroup(created, orgMembers, getBaseUrl(req)));
    } catch (err: any) {
      console.error("[SCIM] Create group error:", err);
      res.status(500).json({
        schemas: [SCIM_SCHEMAS.Error],
        detail: err.message || "Internal server error",
        status: "500",
      });
    }
  });

  // Patch group (add/remove members)
  router.patch("/Groups/:id", async (req, res) => {
    try {
      const db = await getDb();
      if (!db) {
        return res.status(503).json({
          schemas: [SCIM_SCHEMAS.Error],
          detail: "Database unavailable",
          status: "503",
        });
      }

      const orgId = parseInt(req.params.id);
      if (isNaN(orgId)) {
        return res.status(400).json({
          schemas: [SCIM_SCHEMAS.Error],
          detail: "Invalid group ID format",
          status: "400",
        });
      }

      console.log("[SCIM] Patch group request:", req.params.id, JSON.stringify(req.body, null, 2));

      // Verify group exists
      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, orgId))
        .limit(1);

      if (!org) {
        return res.status(404).json({
          schemas: [SCIM_SCHEMAS.Error],
          detail: `Group ${req.params.id} not found`,
          status: "404",
        });
      }

      // Process SCIM PatchOp operations
      const operations = req.body?.Operations || req.body?.operations || [];

      for (const op of operations) {
        const operation = (op.op || "").toLowerCase();
        const path = op.path || "";
        const value = op.value;

        if (operation === "add" && path === "members") {
          // Add members to organization
          const members = Array.isArray(value) ? value : [value];
          for (const member of members) {
            const memberId = parseInt(member.value);
            if (!isNaN(memberId)) {
              await db
                .update(teamMembers)
                .set({ organizationId: orgId })
                .where(eq(teamMembers.id, memberId));
            }
          }
        } else if (operation === "remove" && path?.startsWith("members")) {
          // Remove member from organization — path format: members[value eq "123"]
          const memberIdMatch = path.match(/members\[value\s+eq\s+"(\d+)"\]/);
          if (memberIdMatch) {
            const memberId = parseInt(memberIdMatch[1]);
            await db
              .update(teamMembers)
              .set({ organizationId: null })
              .where(eq(teamMembers.id, memberId));
          }
        } else if (operation === "replace" && path === "displayName") {
          await db
            .update(organizations)
            .set({ name: value })
            .where(eq(organizations.id, orgId));
        }
      }

      // Fetch updated org with members
      const [updated] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, orgId))
        .limit(1);

      const orgMembers = await db
        .select()
        .from(teamMembers)
        .where(eq(teamMembers.organizationId, orgId));

      res.json(orgToSCIMGroup(updated, orgMembers, getBaseUrl(req)));
    } catch (err: any) {
      console.error("[SCIM] Patch group error:", err);
      res.status(500).json({
        schemas: [SCIM_SCHEMAS.Error],
        detail: err.message || "Internal server error",
        status: "500",
      });
    }
  });

  // Delete group (archive organization)
  router.delete("/Groups/:id", async (req, res) => {
    try {
      const db = await getDb();
      if (!db) {
        return res.status(503).json({
          schemas: [SCIM_SCHEMAS.Error],
          detail: "Database unavailable",
          status: "503",
        });
      }

      const orgId = parseInt(req.params.id);
      if (isNaN(orgId)) {
        return res.status(400).json({
          schemas: [SCIM_SCHEMAS.Error],
          detail: "Invalid group ID format",
          status: "400",
        });
      }

      console.log("[SCIM] Delete group request:", req.params.id);

      const [existing] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, orgId))
        .limit(1);

      if (!existing) {
        return res.status(404).json({
          schemas: [SCIM_SCHEMAS.Error],
          detail: `Group ${req.params.id} not found`,
          status: "404",
        });
      }

      // Soft-archive: set status to archived
      await db
        .update(organizations)
        .set({ status: "archived" })
        .where(eq(organizations.id, orgId));

      // Remove org association from members (don't delete them)
      await db
        .update(teamMembers)
        .set({ organizationId: null })
        .where(eq(teamMembers.organizationId, orgId));

      res.status(204).send();
    } catch (err: any) {
      console.error("[SCIM] Delete group error:", err);
      res.status(500).json({
        schemas: [SCIM_SCHEMAS.Error],
        detail: err.message || "Internal server error",
        status: "500",
      });
    }
  });

  return router;
}

/**
 * Mount the SCIM router on the Express app.
 * Standard SCIM base path is /scim/v2
 *
 * Usage in server/_core/index.ts:
 *   import { createSCIMRouter } from "../enterprise/scimProvisioning";
 *   app.use("/scim/v2", createSCIMRouter());
 */
