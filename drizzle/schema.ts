import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, bigint, json, boolean } from "drizzle-orm/mysql-core";

// ── Users (existing) ────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["viewer", "client", "user", "manager", "admin", "owner"]).default("user").notNull(),
  organizationId: int("organizationId"),
  status: mysqlEnum("userStatus", ["active", "pending", "suspended", "blocked"]).default("active").notNull(),
  invitationId: int("invitationId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ── Organizations (Partner entities: Aurovia, ATLAS, etc.) ─────────────
export const organizations = mysqlTable("organizations", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  slug: varchar("slug", { length: 128 }).notNull().unique(),
  type: mysqlEnum("type", ["core", "partner", "client"]).default("partner").notNull(),
  status: mysqlEnum("orgStatus", ["active", "suspended", "archived"]).default("active").notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = typeof organizations.$inferInsert;

// ── Invitations ────────────────────────────────────────────────────────
export const invitations = mysqlTable("invitations", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  organizationId: int("organizationId").notNull(),
  role: mysqlEnum("inviteRole", ["viewer", "client", "user", "manager", "admin"]).default("user").notNull(),
  token: varchar("token", { length: 128 }).notNull().unique(),
  status: mysqlEnum("inviteStatus", ["pending", "accepted", "expired", "revoked"]).default("pending").notNull(),
  ventureIds: json("ventureIds").$type<number[]>(),
  invitedBy: int("invitedBy").notNull(),
  invitedByName: varchar("invitedByName", { length: 255 }),
  acceptedAt: timestamp("acceptedAt"),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Invitation = typeof invitations.$inferSelect;
export type InsertInvitation = typeof invitations.$inferInsert;

// ── API Keys (48-char, venture-scoped) ─────────────────────────────────
export const apiKeys = mysqlTable("api_keys", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  organizationId: int("organizationId").notNull(),
  keyHash: varchar("keyHash", { length: 128 }).notNull().unique(),
  keyPrefix: varchar("keyPrefix", { length: 12 }).notNull(),
  label: varchar("label", { length: 255 }),
  ventureIds: json("ventureIds").$type<number[]>(),
  status: mysqlEnum("keyStatus", ["active", "revoked"]).default("active").notNull(),
  lastUsedAt: timestamp("lastUsedAt"),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = typeof apiKeys.$inferInsert;

// ── Organization Venture Access (which org can see which ventures) ─────
export const orgVentureAccess = mysqlTable("org_venture_access", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  ventureId: int("ventureId").notNull(),
  permission: mysqlEnum("orgPermission", ["view", "edit", "manage", "full"]).default("view").notNull(),
  grantedBy: int("grantedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OrgVentureAccess = typeof orgVentureAccess.$inferSelect;

// ── Ventures ────────────────────────────────────────────────────────────
export const ventures = mysqlTable("ventures", {
  id: int("id").autoincrement().primaryKey(),
  legacyId: varchar("legacyId", { length: 64 }),
  name: varchar("name", { length: 255 }).notNull(),
  sector: varchar("sector", { length: 64 }).notNull(),
  location: varchar("location", { length: 128 }).notNull().default("TBD"),
  stage: varchar("stage", { length: 64 }).notNull().default("In Validation"),
  status: varchar("status", { length: 64 }).notNull().default("In progress"),
  description: text("description"),
  currentStatus: text("currentStatus"),
  nextStep: text("nextStep"),
  nextMilestone: varchar("nextMilestone", { length: 32 }),
  priority: varchar("priority", { length: 32 }).default("Medium"),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  healthScore: int("healthScore").default(50),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Venture = typeof ventures.$inferSelect;
export type InsertVenture = typeof ventures.$inferInsert;

// ── Team Members ────────────────────────────────────────────────────────
export const teamMembers = mysqlTable("team_members", {
  id: int("id").autoincrement().primaryKey(),
  legacyId: varchar("legacyId", { length: 64 }),
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 128 }),
  memberFunction: varchar("memberFunction", { length: 128 }),
  status: varchar("status", { length: 64 }).default("Active"),
  type: varchar("type", { length: 64 }).default("Internal"),
  organizationId: int("organizationId"), // null = ATLAS/Aurovia internal member
  notes: text("notes"),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 64 }),
  telegram: varchar("telegram", { length: 128 }),
  whatsapp: varchar("whatsapp", { length: 64 }),
  linkedin: varchar("linkedin", { length: 255 }),
  location: varchar("location", { length: 128 }),
  photoUrl: text("photoUrl"),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = typeof teamMembers.$inferInsert;

// ── Venture Team (join table) ───────────────────────────────────────────
export const ventureTeam = mysqlTable("venture_team", {
  id: int("id").autoincrement().primaryKey(),
  ventureId: int("ventureId").notNull(),
  memberId: int("memberId").notNull(),
  responsibility: varchar("responsibility", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VentureTeamRow = typeof ventureTeam.$inferSelect;
export type InsertVentureTeam = typeof ventureTeam.$inferInsert;

// ── Tasks ───────────────────────────────────────────────────────────────
export const tasks = mysqlTable("tasks", {
  id: int("id").autoincrement().primaryKey(),
  legacyId: varchar("legacyId", { length: 64 }),
  title: varchar("title", { length: 500 }).notNull(),
  ventureId: int("ventureId"),
  ventureLink: varchar("ventureLink", { length: 255 }),
  assigneeIds: json("assigneeIds").$type<number[]>(),
  assigneeNames: json("assigneeNames").$type<string[]>(),
  dueDate: varchar("dueDate", { length: 32 }),
  priority: varchar("priority", { length: 32 }).default("Medium"),
  status: varchar("status", { length: 32 }).default("open").notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

// ── SPVs ────────────────────────────────────────────────────────────────
export const spvs = mysqlTable("spvs", {
  id: int("id").autoincrement().primaryKey(),
  legacyId: varchar("legacyId", { length: 64 }),
  name: varchar("name", { length: 255 }).notNull(),
  sector: varchar("sector", { length: 64 }),
  priority: varchar("priority", { length: 32 }).default("Medium"),
  stage: varchar("stage", { length: 64 }).default("Active deal"),
  notes: text("notes"),
  currentStatus: text("currentStatus"),
  nextStep: text("nextStep"),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SPV = typeof spvs.$inferSelect;
export type InsertSPV = typeof spvs.$inferInsert;

// ── SPV Ventures (join table) ───────────────────────────────────────────
export const spvVentures = mysqlTable("spv_ventures", {
  id: int("id").autoincrement().primaryKey(),
  spvId: int("spvId").notNull(),
  ventureId: int("ventureId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ── SPV Team (join table) ───────────────────────────────────────────────
export const spvTeam = mysqlTable("spv_team", {
  id: int("id").autoincrement().primaryKey(),
  spvId: int("spvId").notNull(),
  memberId: int("memberId").notNull(),
  responsibility: varchar("responsibility", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ── Distributions ───────────────────────────────────────────────────────
export const distributions = mysqlTable("distributions", {
  id: int("id").autoincrement().primaryKey(),
  legacyId: varchar("legacyId", { length: 64 }),
  organizationId: int("organizationId"),
  name: varchar("name", { length: 255 }).notNull(),
  fund: varchar("fund", { length: 255 }),
  amount: bigint("amount", { mode: "number" }).notNull().default(0),
  currency: varchar("currency", { length: 8 }).default("USD"),
  type: varchar("type", { length: 64 }),
  status: varchar("status", { length: 32 }).default("Scheduled"),
  method: varchar("method", { length: 64 }),
  notes: text("notes"),
  distributionDate: varchar("distributionDate", { length: 32 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Distribution = typeof distributions.$inferSelect;
export type InsertDistribution = typeof distributions.$inferInsert;

// ── Activity Log ────────────────────────────────────────────────────────
export const activityLog = mysqlTable("activity_log", {
  id: int("id").autoincrement().primaryKey(),
  entityType: varchar("entityType", { length: 64 }).notNull(),
  entityId: int("entityId"),
  entityName: varchar("entityName", { length: 255 }),
  action: varchar("action", { length: 255 }).notNull(),
  detail: text("detail"),
  userName: varchar("userName", { length: 255 }),
  sector: varchar("sector", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ActivityLogEntry = typeof activityLog.$inferSelect;
export type InsertActivityLog = typeof activityLog.$inferInsert;

// ── Venture Files ───────────────────────────────────────────────────────
export const ventureFiles = mysqlTable("venture_files", {
  id: int("id").autoincrement().primaryKey(),
  ventureId: int("ventureId").notNull(),
  folderId: int("folderId"),
  filename: varchar("filename", { length: 500 }).notNull(),
  fileType: varchar("fileType", { length: 128 }),
  fileSize: bigint("fileSize", { mode: "number" }),
  fileUrl: text("fileUrl").notNull(),
  fileKey: varchar("fileKey", { length: 500 }),
  uploadedBy: varchar("uploadedBy", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VentureFile = typeof ventureFiles.$inferSelect;
export type InsertVentureFile = typeof ventureFiles.$inferInsert;

// ── Venture Folders ─────────────────────────────────────────────────────
export const ventureFolders = mysqlTable("venture_folders", {
  id: int("id").autoincrement().primaryKey(),
  ventureId: int("ventureId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  color: varchar("color", { length: 32 }).default("blue"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ── Notifications ───────────────────────────────────────────────────────
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  type: varchar("type", { length: 64 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message"),
  entityType: varchar("entityType", { length: 64 }),
  entityId: int("entityId"),
  read: int("isRead").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// ── Contacts ────────────────────────────────────────────────────────────
export const contacts = mysqlTable("contacts", {
  id: int("id").autoincrement().primaryKey(),
  legacyId: varchar("legacyId", { length: 64 }),
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 255 }),
  status: varchar("status", { length: 64 }).default("Active"),
  industries: json("industries").$type<string[]>(),
  geography: varchar("geography", { length: 128 }),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = typeof contacts.$inferInsert;

// ── SPV Files ──────────────────────────────────────────────────────────
export const spvFiles = mysqlTable("spv_files", {
  id: int("id").autoincrement().primaryKey(),
  spvId: int("spvId").notNull(),
  folderId: int("folderId"),
  filename: varchar("filename", { length: 500 }).notNull(),
  fileType: varchar("fileType", { length: 128 }),
  fileSize: bigint("fileSize", { mode: "number" }),
  fileUrl: text("fileUrl").notNull(),
  fileKey: varchar("fileKey", { length: 500 }),
  uploadedBy: varchar("uploadedBy", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SpvFile = typeof spvFiles.$inferSelect;
export type InsertSpvFile = typeof spvFiles.$inferInsert;

// ── SPV Folders ────────────────────────────────────────────────────────
export const spvFolders = mysqlTable("spv_folders", {
  id: int("id").autoincrement().primaryKey(),
  spvId: int("spvId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  color: varchar("color", { length: 32 }).default("blue"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ── Document Intelligence ──────────────────────────────────────────────
export const documentIntelligence = mysqlTable("document_intelligence", {
  id: int("id").autoincrement().primaryKey(),
  fileId: int("fileId").notNull(),
  ventureId: int("ventureId"),
  spvId: int("spvId"),
  documentType: varchar("documentType", { length: 64 }),
  summary: text("summary"),
  sentiment: varchar("sentiment", { length: 32 }),
  keyEntities: json("keyEntities").$type<string[]>(),
  keyFinancialFigures: json("keyFinancialFigures").$type<{ label: string; value: string; currency: string }[]>(),
  actionItems: json("actionItems").$type<string[]>(),
  deadlines: json("deadlines").$type<{ description: string; date: string }[]>(),
  risksMentioned: json("risksMentioned").$type<string[]>(),
  rawText: text("rawText"),
  processingStatus: varchar("processingStatus", { length: 32 }).default("pending").notNull(),
  processedAt: timestamp("processedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DocumentIntel = typeof documentIntelligence.$inferSelect;
export type InsertDocumentIntel = typeof documentIntelligence.$inferInsert;

// ── Venture Risks ──────────────────────────────────────────────────────
export const ventureRisks = mysqlTable("venture_risks", {
  id: int("id").autoincrement().primaryKey(),
  ventureId: int("ventureId").notNull(),
  riskDescription: text("riskDescription").notNull(),
  sourceFileId: int("sourceFileId"),
  status: varchar("status", { length: 32 }).default("Monitoring").notNull(),
  identifiedAt: timestamp("identifiedAt").defaultNow().notNull(),
});

export type VentureRisk = typeof ventureRisks.$inferSelect;
export type InsertVentureRisk = typeof ventureRisks.$inferInsert;

// ── Meeting Briefs ─────────────────────────────────────────────────────
export const meetingBriefs = mysqlTable("meeting_briefs", {
  id: int("id").autoincrement().primaryKey(),
  fileId: int("fileId").notNull(),
  ventureId: int("ventureId"),
  meetingDate: varchar("meetingDate", { length: 32 }),
  attendees: json("attendees").$type<string[]>(),
  keyDecisions: json("keyDecisions").$type<string[]>(),
  actionItems: json("actionItems").$type<{ item: string; assignee: string }[]>(),
  nextMeetingDate: varchar("nextMeetingDate", { length: 32 }),
  headline: varchar("headline", { length: 500 }),
  summary: text("summary"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MeetingBrief = typeof meetingBriefs.$inferSelect;
export type InsertMeetingBrief = typeof meetingBriefs.$inferInsert;

// ── AI Observations ────────────────────────────────────────────────────
export const aiObservations = mysqlTable("ai_observations", {
  id: int("id").autoincrement().primaryKey(),
  observationType: varchar("observationType", { length: 64 }).notNull(),
  ventureId: int("ventureId"),
  ventureName: varchar("ventureName", { length: 255 }),
  observation: text("observation").notNull(),
  recommendedAction: text("recommendedAction"),
  suggestedTaskTitle: varchar("suggestedTaskTitle", { length: 500 }),
  suggestedAssignee: varchar("suggestedAssignee", { length: 255 }),
  suggestedDueDays: int("suggestedDueDays"),
  dismissed: int("dismissed").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AiObservation = typeof aiObservations.$inferSelect;
export type InsertAiObservation = typeof aiObservations.$inferInsert;

// ── Daily Briefs ───────────────────────────────────────────────────────
export const dailyBriefs = mysqlTable("daily_briefs", {
  id: int("id").autoincrement().primaryKey(),
  briefDate: varchar("briefDate", { length: 16 }).notNull(),
  headline: varchar("headline", { length: 500 }),
  priorityItems: json("priorityItems").$type<{ type: string; description: string; venture?: string; action?: string; daysRemaining?: number }[]>(),
  portfolioHealth: varchar("portfolioHealth", { length: 32 }),
  recommendedActions: json("recommendedActions").$type<string[]>(),
  winsThisWeek: json("winsThisWeek").$type<string[]>(),
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
});

export type DailyBrief = typeof dailyBriefs.$inferSelect;
export type InsertDailyBrief = typeof dailyBriefs.$inferInsert;

// ── Smart Alerts ───────────────────────────────────────────────────────
export const smartAlerts = mysqlTable("smart_alerts", {
  id: int("id").autoincrement().primaryKey(),
  severity: varchar("severity", { length: 16 }).notNull(), // critical, warning, info
  alertType: varchar("alertType", { length: 64 }).notNull(),
  message: text("message").notNull(),
  entityType: varchar("entityType", { length: 64 }),
  entityId: int("entityId"),
  entityName: varchar("entityName", { length: 255 }),
  actionUrl: varchar("actionUrl", { length: 500 }),
  dismissed: int("dismissed").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SmartAlert = typeof smartAlerts.$inferSelect;
export type InsertSmartAlert = typeof smartAlerts.$inferInsert;

// ── RBAC: User-Venture Access ──────────────────────────────────────────
// Row-level security: maps users to ventures/SPVs they can access
export const userVentureAccess = mysqlTable("user_venture_access", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  ventureId: int("ventureId"),
  spvId: int("spvId"),
  permission: mysqlEnum("permission", ["view", "edit", "manage", "full"]).default("view").notNull(),
  grantedBy: int("grantedBy"),
  grantedAt: timestamp("grantedAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt"),
});

export type UserVentureAccess = typeof userVentureAccess.$inferSelect;

// ── Audit Log ──────────────────────────────────────────────────────────
// SOC 2 compliant audit trail of all access and mutations
export const auditLog = mysqlTable("audit_log", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  userName: varchar("userName", { length: 255 }),
  action: varchar("action", { length: 64 }).notNull(), // e.g., "read", "create", "update", "delete", "login", "logout", "access_denied"
  entityType: varchar("entityType", { length: 64 }), // e.g., "venture", "spv", "task", "file"
  entityId: varchar("entityId", { length: 64 }),
  entityName: varchar("entityName", { length: 255 }),
  details: text("details"), // JSON string with before/after or extra context
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  result: mysqlEnum("result", ["success", "denied", "error"]).default("success").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLog.$inferSelect;

// ── Sessions ───────────────────────────────────────────────────────────
// Track active sessions for zero-trust session management
export const sessions = mysqlTable("sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  token: varchar("token", { length: 512 }).notNull(),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  deviceFingerprint: varchar("deviceFingerprint", { length: 128 }),
  lastActivity: timestamp("lastActivity").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Session = typeof sessions.$inferSelect;

// ── User Preferences ──────────────────────────────────────────────────
// Persisted per-user settings for profile, notifications, display, and security
export const userPreferences = mysqlTable("user_preferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  // Display
  displayName: varchar("displayName", { length: 255 }),
  timezone: varchar("timezone", { length: 64 }).default("America/New_York"),
  compactView: boolean("compactView").default(false).notNull(),
  autoRefresh: boolean("autoRefresh").default(true).notNull(),
  // Notification channels
  emailNotifications: boolean("emailNotifications").default(true).notNull(),
  pushNotifications: boolean("pushNotifications").default(true).notNull(),
  slackNotifications: boolean("slackNotifications").default(false).notNull(),
  // Notification alert types
  notifTaskComplete: boolean("notifTaskComplete").default(true).notNull(),
  notifDistribution: boolean("notifDistribution").default(true).notNull(),
  notifLogin: boolean("notifLogin").default(true).notNull(),
  notifOverdue: boolean("notifOverdue").default(true).notNull(),
  notifWeekly: boolean("notifWeekly").default(false).notNull(),
  // Security
  twoFactorEnabled: boolean("twoFactorEnabled").default(false).notNull(),
  sessionTimeoutMinutes: int("sessionTimeoutMinutes").default(30).notNull(),
  // Metadata
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserPreference = typeof userPreferences.$inferSelect;
export type InsertUserPreference = typeof userPreferences.$inferInsert;
