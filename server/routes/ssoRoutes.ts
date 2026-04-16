/**
 * SSO & SCIM Routes — Express REST endpoints for SAML 2.0 and SCIM 2.0
 * 
 * SAML endpoints:
 *   GET  /api/sso/saml/:orgSlug/metadata  — SP metadata XML
 *   GET  /api/sso/saml/:orgSlug/login     — Initiate SAML login (redirect to IdP)
 *   POST /api/sso/saml/:orgSlug/acs       — Assertion Consumer Service (callback)
 * 
 * SCIM 2.0 endpoints:
 *   GET    /api/scim/v2/:orgId/Users          — List users
 *   GET    /api/scim/v2/:orgId/Users/:userId  — Get user
 *   POST   /api/scim/v2/:orgId/Users          — Create user
 *   PUT    /api/scim/v2/:orgId/Users/:userId  — Replace user
 *   PATCH  /api/scim/v2/:orgId/Users/:userId  — Patch user
 *   DELETE /api/scim/v2/:orgId/Users/:userId  — Delete user
 */

import { Router, type Request, type Response } from "express";
import { getDb } from "../db";
import { organizations } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import {
  generateSPMetadata,
  generateAuthnRequest,
  parseAndValidateSAMLResponse,
  findOrCreateSAMLUser,
  validateSCIMToken,
  scimListUsers,
  scimGetUser,
  scimCreateUser,
  scimUpdateUser,
  scimPatchUser,
  scimDeleteUser,
  type SAMLConfig,
  type SCIMPatchOp,
} from "../security/sso";
import { logAudit } from "../security/rbac";

export const ssoRouter = Router();

// ─── SAML Routes ─────────────────────────────────────────────────────────────

/**
 * SP Metadata — IdP admin downloads this to configure the SAML trust.
 */
ssoRouter.get("/api/sso/saml/:orgSlug/metadata", async (req: Request, res: Response) => {
  const { orgSlug } = req.params;
  const baseUrl = `${req.protocol}://${req.get("host")}`;

  const xml = generateSPMetadata(orgSlug, baseUrl);
  res.setHeader("Content-Type", "application/xml");
  res.send(xml);
});

/**
 * Initiate SAML Login — Redirects to the IdP's SSO URL.
 */
ssoRouter.get("/api/sso/saml/:orgSlug/login", async (req: Request, res: Response) => {
  const { orgSlug } = req.params;
  const db = await getDb();
  if (!db) {
    res.status(503).json({ error: "Service unavailable" });
    return;
  }

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.slug, orgSlug))
    .limit(1);

  if (!org || !org.ssoEnabled) {
    res.status(404).json({ error: "SSO not configured for this organization" });
    return;
  }

  if (!org.ssoMetadataUrl) {
    res.status(400).json({ error: "IdP metadata URL not configured" });
    return;
  }

  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const config: SAMLConfig = {
    organizationId: org.id,
    idpEntityId: org.ssoMetadataUrl,
    idpSsoUrl: org.ssoMetadataUrl, // In production, parse from IdP metadata XML
    idpCertificate: "", // In production, extract from IdP metadata
    spEntityId: `${baseUrl}/api/sso/saml/${orgSlug}/metadata`,
    spAcsUrl: `${baseUrl}/api/sso/saml/${orgSlug}/acs`,
    nameIdFormat: "email",
  };

  const { redirectUrl } = generateAuthnRequest(config);
  res.redirect(302, redirectUrl);
});

/**
 * Assertion Consumer Service — Receives the SAML Response from the IdP.
 */
ssoRouter.post("/api/sso/saml/:orgSlug/acs", async (req: Request, res: Response) => {
  const { orgSlug } = req.params;
  const samlResponse = req.body?.SAMLResponse;
  const relayState = req.body?.RelayState;

  if (!samlResponse) {
    res.status(400).json({ error: "Missing SAMLResponse" });
    return;
  }

  const db = await getDb();
  if (!db) {
    res.status(503).json({ error: "Service unavailable" });
    return;
  }

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.slug, orgSlug))
    .limit(1);

  if (!org || !org.ssoEnabled) {
    res.status(404).json({ error: "SSO not configured for this organization" });
    return;
  }

  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const config: SAMLConfig = {
    organizationId: org.id,
    idpEntityId: org.ssoMetadataUrl || "",
    idpSsoUrl: org.ssoMetadataUrl || "",
    idpCertificate: "",
    spEntityId: `${baseUrl}/api/sso/saml/${orgSlug}/metadata`,
    spAcsUrl: `${baseUrl}/api/sso/saml/${orgSlug}/acs`,
    nameIdFormat: "email",
  };

  const assertion = parseAndValidateSAMLResponse(samlResponse, config);
  if (!assertion) {
    await logAudit({
      userId: 0,
      userName: "SAML",
      action: "saml_login_failed",
      entityType: "auth",
      entityId: orgSlug,
      details: JSON.stringify({ reason: "invalid_assertion", orgSlug }),
      result: "denied",
      organizationId: org.id,
    });
    res.status(401).json({ error: "Invalid SAML assertion" });
    return;
  }

  const userResult = await findOrCreateSAMLUser(assertion, org.id);
  if (!userResult) {
    res.status(500).json({ error: "Failed to provision user" });
    return;
  }

  await logAudit({
    userId: userResult.userId,
    userName: assertion.nameId,
    action: userResult.isNew ? "saml_jit_provision" : "saml_login",
    entityType: "auth",
    entityId: String(userResult.userId),
    details: JSON.stringify({
      email: assertion.nameId,
      isNew: userResult.isNew,
      orgSlug,
      issuer: assertion.issuer,
    }),
    result: "success",
    organizationId: org.id,
    ipAddress: req.ip,
  });

  // Redirect to the portal with a session token
  // In production, this would create a session cookie via the same mechanism as OAuth
  const returnUrl = relayState || `/portal/${orgSlug}`;
  res.redirect(302, `${returnUrl}?sso=success&uid=${userResult.userId}`);
});

// ─── SCIM 2.0 Routes ────────────────────────────────────────────────────────

/**
 * SCIM authentication middleware.
 * Validates the Bearer token against the org's SCIM configuration.
 */
async function scimAuth(req: Request, res: Response): Promise<number | null> {
  const orgId = parseInt(req.params.orgId, 10);
  if (isNaN(orgId)) {
    res.status(400).json({
      schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
      detail: "Invalid organization ID",
      status: "400",
    });
    return null;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({
      schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
      detail: "Missing or invalid authorization header",
      status: "401",
    });
    return null;
  }

  const token = authHeader.slice(7);
  const valid = await validateSCIMToken(token, orgId);
  if (!valid) {
    res.status(403).json({
      schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
      detail: "Invalid SCIM token or SSO not enabled for this organization",
      status: "403",
    });
    return null;
  }

  return orgId;
}

/** SCIM: List Users */
ssoRouter.get("/api/scim/v2/:orgId/Users", async (req: Request, res: Response) => {
  const orgId = await scimAuth(req, res);
  if (orgId === null) return;

  const startIndex = parseInt(req.query.startIndex as string) || 1;
  const count = parseInt(req.query.count as string) || 100;
  const filter = req.query.filter as string | undefined;

  const result = await scimListUsers(orgId, startIndex, count, filter);
  res.json(result);
});

/** SCIM: Get User */
ssoRouter.get("/api/scim/v2/:orgId/Users/:userId", async (req: Request, res: Response) => {
  const orgId = await scimAuth(req, res);
  if (orgId === null) return;

  const userId = parseInt(req.params.userId, 10);
  const user = await scimGetUser(userId, orgId);

  if (!user) {
    res.status(404).json({
      schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
      detail: "User not found",
      status: "404",
    });
    return;
  }

  res.json(user);
});

/** SCIM: Create User */
ssoRouter.post("/api/scim/v2/:orgId/Users", async (req: Request, res: Response) => {
  const orgId = await scimAuth(req, res);
  if (orgId === null) return;

  const user = await scimCreateUser(req.body, orgId);
  if (!user) {
    res.status(500).json({
      schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
      detail: "Failed to create user",
      status: "500",
    });
    return;
  }

  res.status(201).json(user);
});

/** SCIM: Replace User (PUT) */
ssoRouter.put("/api/scim/v2/:orgId/Users/:userId", async (req: Request, res: Response) => {
  const orgId = await scimAuth(req, res);
  if (orgId === null) return;

  const userId = parseInt(req.params.userId, 10);
  const user = await scimUpdateUser(userId, req.body, orgId);

  if (!user) {
    res.status(404).json({
      schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
      detail: "User not found",
      status: "404",
    });
    return;
  }

  res.json(user);
});

/** SCIM: Patch User */
ssoRouter.patch("/api/scim/v2/:orgId/Users/:userId", async (req: Request, res: Response) => {
  const orgId = await scimAuth(req, res);
  if (orgId === null) return;

  const userId = parseInt(req.params.userId, 10);
  const patchOp: SCIMPatchOp = req.body;
  const user = await scimPatchUser(userId, patchOp, orgId);

  if (!user) {
    res.status(404).json({
      schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
      detail: "User not found",
      status: "404",
    });
    return;
  }

  res.json(user);
});

/** SCIM: Delete User */
ssoRouter.delete("/api/scim/v2/:orgId/Users/:userId", async (req: Request, res: Response) => {
  const orgId = await scimAuth(req, res);
  if (orgId === null) return;

  const userId = parseInt(req.params.userId, 10);
  const success = await scimDeleteUser(userId, orgId);

  if (!success) {
    res.status(404).json({
      schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
      detail: "User not found",
      status: "404",
    });
    return;
  }

  res.status(204).send();
});
