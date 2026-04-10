// Schema — ATLAS System
import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, bigint, json, boolean } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["viewer", "client", "user", "partner", "manager", "admin", "owner"]).default("user").notNull(),
  organizationId: int("organizationId"),
  status: mysqlEnum("userStatus", ["active", "pending", "suspended", "blocked"]).default("active").notNull(),
  invitationId: int("invitationId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  // MFA / TOTP
  mfaSecret: varchar("mfaSecret", { length: 512 }),  // encrypted TOTP secret
  mfaEnabled: boolean("mfaEnabled").default(false).notNull(),
  mfaVerifiedAt: timestamp("mfaVerifiedAt"),
  mfaBackupCodes: json("mfaBackupCodes").$type<string[]>(),  // hashed backup codes
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const organizations = mysqlTable("organizations", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  slug: varchar("slug", { length: 128 }).notNull().unique(),
  type: mysqlEnum("type", ["core", "partner", "client"]).default("partner").notNull(),
  status: mysqlEnum("orgStatus", ["active", "suspended", "archived"]).default("active").notNull(),
  description: text("description"),
  // Onboarding fields
  primaryContactName: varchar("primaryContactName", { length: 255 }),
  primaryContactEmail: varchar("primaryContactEmail", { length: 320 }),
  aumRange: varchar("aumRange", { length: 32 }),  // '<$100M' | '$100M-$500M' | '$500M+' | '$1B+'
  sectors: json("sectors").$type<string[]>(),
  subscriptionTier: varchar("subscriptionTier", { length: 32 }).default("poc"),  // 'poc' | 'growth' | 'enterprise'
  renewalDate: varchar("renewalDate", { length: 32 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = typeof organizations.$inferInsert;

export const invitations = mysqlTable("invitations", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  organizationId: int("organizationId").notNull(),
  role: mysqlEnum("inviteRole", ["viewer", "client", "user", "partner", "manager", "admin"]).default("user").notNull(),
  token: varchar("token", { length: 128 }).notNull().unique(),
  status: mysqlEnum("inviteStatus", ["pending", "accepted", "expired", "revoked"]).default("pending").notNull(),
  ventureIds: json("ventureIds").$type<number[]>(),
  teamMemberId: int("teamMemberId"),  // link back to team_members record
  invitedBy: int("invitedBy").notNull(),
  invitedByName: varchar("invitedByName", { length: 255 }),
  acceptedAt: timestamp("acceptedAt"),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Invitation = typeof invitations.$inferSelect;
export type InsertInvitation = typeof invitations.$inferInsert;

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

export const orgVentureAccess = mysqlTable("org_venture_access", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  ventureId: int("ventureId").notNull(),
  permission: mysqlEnum("orgPermission", ["view", "edit", "manage", "full"]).default("view").notNull(),
  grantedBy: int("grantedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OrgVentureAccess = typeof orgVentureAccess.$inferSelect;

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
  nextMilestone: text("nextMilestone"),
  priority: varchar("priority", { length: 32 }).default("Medium"),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  healthScore: int("healthScore").default(50),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Venture = typeof ventures.$inferSelect;
export type InsertVenture = typeof ventures.$inferInsert;

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
  avatarUrl: text("avatarUrl"),  // S3 URL for profile photo
  sortOrder: int("sortOrder").default(100),  // custom sort order (lower = higher in list)
  invitationStatus: varchar("invitationStatus", { length: 32 }),  // pending, accepted, expired, none
  invitationId: int("invitationId"),  // link to invitations table
  systemRole: varchar("systemRole", { length: 32 }),  // intended user role: admin, partner, user, etc.
  userId: int("userId"),  // link to users table for login-based status tracking
  lastSeenAt: timestamp("lastSeenAt"),  // updated by heartbeat or manual activity
  adminStatus: varchar("adminStatus", { length: 32 }).default("active"),  // admin-set: active, on_leave, deactivated
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = typeof teamMembers.$inferInsert;

export const ventureTeam = mysqlTable("venture_team", {
  id: int("id").autoincrement().primaryKey(),
  ventureId: int("ventureId").notNull(),
  memberId: int("memberId").notNull(),
  responsibility: varchar("responsibility", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VentureTeamRow = typeof ventureTeam.$inferSelect;
export type InsertVentureTeam = typeof ventureTeam.$inferInsert;

export const tasks = mysqlTable("tasks", {
  id: int("id").autoincrement().primaryKey(),
  legacyId: varchar("legacyId", { length: 64 }),
  organizationId: int("organizationId"),
  title: varchar("title", { length: 500 }).notNull(),
  ventureId: int("ventureId"),
  ventureLink: varchar("ventureLink", { length: 255 }),
  assigneeIds: json("assigneeIds").$type<number[]>(),
  assigneeNames: json("assigneeNames").$type<string[]>(),
  dueDate: varchar("dueDate", { length: 32 }),
  priority: varchar("priority", { length: 32 }).default("Medium"),
  status: varchar("status", { length: 32 }).default("open").notNull(),
   description: text("description"),
  // Email tracking for auto-trigger emails
  lastEmailSentAt: timestamp("lastEmailSentAt"),
  emailSentCount: int("emailSentCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

export const spvs = mysqlTable("spvs", {
  id: int("id").autoincrement().primaryKey(),
  legacyId: varchar("legacyId", { length: 64 }),
  organizationId: int("organizationId"),
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

export const spvVentures = mysqlTable("spv_ventures", {
  id: int("id").autoincrement().primaryKey(),
  spvId: int("spvId").notNull(),
  ventureId: int("ventureId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const spvTeam = mysqlTable("spv_team", {
  id: int("id").autoincrement().primaryKey(),
  spvId: int("spvId").notNull(),
  memberId: int("memberId").notNull(),
  responsibility: varchar("responsibility", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

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

export const activityLog = mysqlTable("activity_log", {
  id: int("id").autoincrement().primaryKey(),
  entityType: varchar("entityType", { length: 64 }).notNull(),
  entityId: int("entityId"),
  entityName: varchar("entityName", { length: 255 }),
  action: varchar("action", { length: 255 }).notNull(),
  detail: text("detail"),
  userName: varchar("userName", { length: 255 }),
  sector: varchar("sector", { length: 64 }),
  activitySource: mysqlEnum("activitySource", ["atlas_ops", "client_business", "system"]).default("atlas_ops").notNull(),
  organizationId: int("activityOrgId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ActivityLogEntry = typeof activityLog.$inferSelect;
export type InsertActivityLog = typeof activityLog.$inferInsert;

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

export const ventureFolders = mysqlTable("venture_folders", {
  id: int("id").autoincrement().primaryKey(),
  ventureId: int("ventureId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  color: varchar("color", { length: 32 }).default("blue"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});// ── Notifications ───────────────────────────────────────────────────────────
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  organizationId: int("notifOrgId"),
  type: varchar("type", { length: 64 }).notNull(),
  category: varchar("notifCategory", { length: 32 }).default("info").notNull(), // info, warning, critical, success
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message"),
  entityType: varchar("entityType", { length: 64 }),
  entityId: int("entityId"),
  entityName: varchar("notifEntityName", { length: 255 }),
  link: varchar("notifLink", { length: 500 }),
  actorName: varchar("actorName", { length: 255 }),
  read: int("isRead").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

export const contacts = mysqlTable("contacts", {
  id: int("id").autoincrement().primaryKey(),
  legacyId: varchar("legacyId", { length: 64 }),
  organizationId: int("organizationId"),
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

export const spvFolders = mysqlTable("spv_folders", {
  id: int("id").autoincrement().primaryKey(),
  spvId: int("spvId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  color: varchar("color", { length: 32 }).default("blue"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

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

export const aiObservations = mysqlTable("ai_observations", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId"),
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

export const dailyBriefs = mysqlTable("daily_briefs", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId"),
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

export const smartAlerts = mysqlTable("smart_alerts", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId"),
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

// SOC 2 compliant audit trail of all access and mutations
export const auditLog = mysqlTable("audit_log", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId"),
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

export const agentEvents = mysqlTable("agent_events", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId"),
  agentName: varchar("agentName", { length: 64 }).notNull(),
  eventType: varchar("eventType", { length: 32 }).notNull(),
  message: text("message").notNull(),
  severity: varchar("severity", { length: 16 }).notNull(),
  // Action system — every event can carry an executable action
  actionType: varchar("actionType", { length: 32 }),       // 'notify' | 'advance' | 'draft' | 'escalate'
  actionLabel: varchar("actionLabel", { length: 128 }),     // human-readable: "Send Reminder"
  actionPayload: json("actionPayload").$type<Record<string, unknown>>(), // data needed to execute
  // Entity linking
  entityType: varchar("entityType", { length: 32 }),
  agentEntityId: varchar("agentEntityId", { length: 64 }),
  agentEntityName: varchar("agentEntityName", { length: 255 }),
  oldStatus: varchar("oldStatus", { length: 64 }),
  newStatus: varchar("newStatus", { length: 64 }),
  // Audience routing — who sees this event
  audience: varchar("audience", { length: 16 }).default("operator").notNull(), // 'client' | 'operator' | 'both'
  requiresClientAction: boolean("requiresClientAction").default(false).notNull(),
  // Status tracking
  isRead: boolean("isRead").default(false).notNull(),
  actionTaken: boolean("actionTaken").default(false).notNull(),
  actionTakenAt: timestamp("actionTakenAt"),
  actionTakenBy: varchar("actionTakenBy", { length: 255 }),
  clientDismissed: boolean("clientDismissed").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AgentEvent = typeof agentEvents.$inferSelect;
export type InsertAgentEvent = typeof agentEvents.$inferInsert;

export const ventureVelocity = mysqlTable("venture_velocity", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId"),
  ventureId: int("ventureId").notNull(),
  ventureName: varchar("ventureName", { length: 255 }).notNull(),
  sector: varchar("sector", { length: 64 }),
  fromStage: varchar("fromStage", { length: 64 }).notNull(),
  toStage: varchar("toStage", { length: 64 }).notNull(),
  daysInStage: int("daysInStage").notNull(),
  hoursInStage: int("hoursInStage"),  // exact to the hour for precision
  advancedBy: varchar("advancedBy", { length: 128 }),  // 'ATLAS Agent' | 'manual' | user name
  blockingStepsTotal: int("blockingStepsTotal").default(0).notNull(),
  blockingStepsCompleted: int("blockingStepsCompleted").default(0).notNull(),
  tasksCompletedInStage: int("tasksCompletedInStage").default(0).notNull(),
  advancedAt: timestamp("advancedAt").defaultNow().notNull(),
});

export type VentureVelocity = typeof ventureVelocity.$inferSelect;
export type InsertVentureVelocity = typeof ventureVelocity.$inferInsert;

export const agentDrafts = mysqlTable("agent_drafts", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId"),
  ventureId: int("ventureId"),
  ventureName: varchar("ventureName", { length: 255 }),
  draftType: varchar("draftType", { length: 32 }).notNull(),  // 'follow_up' | 'reminder' | 'escalation' | 'update' | 'lp_notice'
  subject: varchar("subject", { length: 500 }),
  body: text("body").notNull(),
  recipientName: varchar("recipientName", { length: 255 }),
  recipientRole: varchar("recipientRole", { length: 128 }),
  status: varchar("draftStatus", { length: 16 }).default("pending").notNull(),  // 'pending' | 'sent' | 'dismissed'
  sentAt: timestamp("sentAt"),
  sentBy: varchar("sentBy", { length: 255 }),
  createdByAgent: varchar("createdByAgent", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AgentDraft = typeof agentDrafts.$inferSelect;
export type InsertAgentDraft = typeof agentDrafts.$inferInsert;

export const clientAgentConfig = mysqlTable("client_agent_config", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  // Agent toggles
  velocityAgentEnabled: boolean("velocityAgentEnabled").default(true).notNull(),
  complianceAgentEnabled: boolean("complianceAgentEnabled").default(true).notNull(),
  dealFlowAgentEnabled: boolean("dealFlowAgentEnabled").default(true).notNull(),
  orchestratorEnabled: boolean("orchestratorEnabled").default(true).notNull(),
  // Thresholds
  overdueDaysThreshold: int("overdueDaysThreshold").default(7).notNull(),
  distributionWarningDays: int("distributionWarningDays").default(14).notNull(),
  healthScoreAlertThreshold: int("healthScoreAlertThreshold").default(30).notNull(),
  // Auto-advance settings
  autoAdvanceEnabled: boolean("autoAdvanceEnabled").default(false).notNull(),
  autoAdvanceSectors: json("autoAdvanceSectors").$type<string[]>(),  // sectors pre-authorized for auto-advance
  // Polling
  pollingIntervalMinutes: int("pollingIntervalMinutes").default(30).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ClientAgentConfig = typeof clientAgentConfig.$inferSelect;
export type InsertClientAgentConfig = typeof clientAgentConfig.$inferInsert;

// Three-layer architecture:
//   Layer 1: source='system', status='confirmed', confidence='0.5' — sector defaults
//   Layer 2: source='document'|'conversation'|'manual', status='draft'|'confirmed' — client-specific
//   Layer 3: venture_process_overrides — per-venture overrides on top of Layer 2
export const processTemplates = mysqlTable("process_templates", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  sector: varchar("sector", { length: 128 }).notNull(),
  blueprintName: varchar("blueprintName", { length: 255 }).notNull(),
  source: varchar("source", { length: 64 }).default("document"), // system | document | conversation | ai_generated | manual
  extractionSource: varchar("extractionSource", { length: 32 }).default("manual").notNull(), // legacy compat
  confidence: varchar("confidence", { length: 32 }).default("Medium"), // 'High' | 'Medium' | 'Low' or numeric '0.5'
  status: varchar("blueprintStatus", { length: 32 }).default("draft").notNull(), // draft | confirmed | archived
  sourceDocumentUrl: text("sourceDocumentUrl"),
  sourceDocumentName: varchar("sourceDocumentName", { length: 255 }),
  extractionNotes: text("extractionNotes"),
  sourceDocumentIds: json("sourceDocumentIds").$type<number[]>(),
  keyPeopleRoles: json("keyPeopleRoles").$type<string[]>(),
  commonBlockers: json("commonBlockers").$type<string[]>(),
  successSignals: json("successSignals").$type<string[]>(),
  venturesApplied: int("venturesApplied").default(0).notNull(),
  refinementCount: int("refinementCount").default(0).notNull(),
  lastRefinedAt: timestamp("lastRefinedAt"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ProcessTemplate = typeof processTemplates.$inferSelect;
export type InsertProcessTemplate = typeof processTemplates.$inferInsert;

export const processSteps = mysqlTable("process_steps", {
  id: int("id").autoincrement().primaryKey(),
  templateId: int("templateId").notNull(),
  stageName: varchar("stageName", { length: 128 }).notNull(),
  stageOrder: int("stageOrder").default(0).notNull(),
  stageDescription: text("stageDescription"),
  stageTypicalDurationDays: int("stageTypicalDurationDays"),
  decisionMaker: varchar("decisionMaker", { length: 255 }),
  approvalThreshold: text("approvalThreshold"),
  stepOrder: int("stepOrder").default(0).notNull(),
  stepName: varchar("stepName", { length: 255 }).notNull(),
  stepDescription: text("stepDescription"),
  whoOwns: varchar("whoOwns", { length: 255 }),
  isBlocking: boolean("isBlocking").default(false).notNull(),
  typicalDays: int("typicalDays"),  // estimated days for this step
  documentOrOutput: varchar("documentOrOutput", { length: 500 }),
  actualAvgDays: int("actualAvgDays"),
  sampleCount: int("sampleCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ProcessStep = typeof processSteps.$inferSelect;
export type InsertProcessStep = typeof processSteps.$inferInsert;

export const ventureProcessTracking = mysqlTable("venture_process_tracking", {
  id: int("id").autoincrement().primaryKey(),
  ventureId: int("ventureId").notNull(),
  templateId: int("templateId").notNull(),
  stepId: int("stepId").notNull(),
  stageName: varchar("stageName", { length: 128 }).notNull(),
  stepName: varchar("stepName", { length: 255 }).notNull(),
  stepOrder: int("stepOrder").default(0).notNull(),
  isBlocking: boolean("isBlocking").default(false).notNull(),
  whoOwns: varchar("whoOwns", { length: 128 }),
  status: varchar("status", { length: 32 }).default("pending").notNull(), // pending | in_progress | complete | skipped
  evidence: text("evidence"),
  confidence: varchar("confidence", { length: 32 }).default("Medium"),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  completedBy: varchar("completedBy", { length: 128 }),
  actualDays: int("actualDays"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type VentureProcessTracking = typeof ventureProcessTracking.$inferSelect;
export type InsertVentureProcessTracking = typeof ventureProcessTracking.$inferInsert;

export const clientVelocityBenchmarks = mysqlTable("client_velocity_benchmarks", {
  id: int("id").primaryKey().autoincrement(),
  organizationId: int("organizationId").notNull(),
  sector: varchar("sector", { length: 128 }).notNull(),
  stage: varchar("stage", { length: 128 }).notNull(),
  avgDaysToAdvance: int("avgDaysToAdvance"),
  fastestDays: int("fastestDays"),
  slowestDays: int("slowestDays"),
  sampleCount: int("sampleCount").default(0).notNull(),
  lastCalculated: timestamp("lastCalculated").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ClientVelocityBenchmark = typeof clientVelocityBenchmarks.$inferSelect;
export type InsertClientVelocityBenchmark = typeof clientVelocityBenchmarks.$inferInsert;

export const ventureProcessOverrides = mysqlTable("venture_process_overrides", {
  id: int("id").autoincrement().primaryKey(),
  ventureId: int("ventureId").notNull(),
  processTemplateId: int("processTemplateId").notNull(),
  stepId: int("stepId"),  // null = template-level override
  overrideType: varchar("overrideType", { length: 32 }).notNull(), // cadence | contact | escalation | skip | custom
  overrideField: varchar("overrideField", { length: 128 }),  // which field is overridden (e.g., 'estimatedDays', 'whoOwns')
  overrideValue: text("overrideValue").notNull(),  // the new value
  reason: text("reason"),  // why this override exists
  createdBy: varchar("createdBy", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type VentureProcessOverride = typeof ventureProcessOverrides.$inferSelect;
export type InsertVentureProcessOverride = typeof ventureProcessOverrides.$inferInsert;


// ATLAS INTELLIGENCE PLATFORM — 4 Gaps

export const ventureForecast = mysqlTable("venture_forecast", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  ventureId: int("ventureId").notNull(),
  ventureName: varchar("ventureName", { length: 255 }).notNull(),
  sector: varchar("sector", { length: 64 }),
  currentStage: varchar("currentStage", { length: 64 }).notNull(),
  // Predictions
  projectedAdvanceDate: timestamp("projectedAdvanceDate"),      // when we predict this stage completes
  projectedDaysRemaining: int("projectedDaysRemaining"),        // days until stage advance
  benchmarkDays: int("benchmarkDays"),                          // sector avg for this stage
  deviationPercent: int("deviationPercent"),                     // % over/under benchmark (negative = faster)
  riskScore: int("riskScore").default(50).notNull(),            // 0-100, higher = more risk of delay
  riskFactors: json("riskFactors").$type<string[]>(),           // ["overdue tasks", "resource contention", "slow step"]
  // Bottleneck detection
  bottleneckStepName: varchar("bottleneckStepName", { length: 255 }),
  bottleneckOwner: varchar("bottleneckOwner", { length: 255 }),
  bottleneckDaysStuck: int("bottleneckDaysStuck"),
  // Confidence
  confidence: varchar("forecastConfidence", { length: 16 }).default("medium").notNull(), // low | medium | high
  sampleSize: int("sampleSize").default(0).notNull(),           // how many historical records this is based on
  // Deal outcome (for SPV-linked ventures)
  dealCloseProbability: int("dealCloseProbability"),             // 0-100%
  dealRiskFactors: json("dealRiskFactors").$type<string[]>(),
  // LLM narrative
  narrative: text("narrative"),                                  // human-readable forecast summary
  recommendedActions: json("recommendedActions").$type<string[]>(),
  // Meta
  calculatedAt: timestamp("calculatedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type VentureForecast = typeof ventureForecast.$inferSelect;
export type InsertVentureForecast = typeof ventureForecast.$inferInsert;

export const portfolioHealthTrajectory = mysqlTable("portfolio_health_trajectory", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  // Current snapshot
  currentHealthScore: int("currentHealthScore").notNull(),      // 0-100
  projectedHealthScore30d: int("projectedHealthScore30d"),      // projected 30 days out
  healthTrend: varchar("healthTrend", { length: 16 }).notNull(), // improving | stable | declining | critical
  // Breakdown
  venturesOnTrack: int("venturesOnTrack").default(0).notNull(),
  venturesAtRisk: int("venturesAtRisk").default(0).notNull(),
  venturesDelayed: int("venturesDelayed").default(0).notNull(),
  // Resource contention
  overloadedMembers: json("overloadedMembers").$type<{ name: string; blockingTasks: number; ventures: string[] }[]>(),
  // LLM narrative
  executiveSummary: text("executiveSummary"),
  topRisks: json("topRisks").$type<string[]>(),
  topOpportunities: json("topOpportunities").$type<string[]>(),
  // Meta
  calculatedAt: timestamp("calculatedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PortfolioHealthTrajectory = typeof portfolioHealthTrajectory.$inferSelect;
export type InsertPortfolioHealthTrajectory = typeof portfolioHealthTrajectory.$inferInsert;

export const resourceContentionAlert = mysqlTable("resource_contention_alert", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  memberId: int("memberId").notNull(),
  memberName: varchar("memberName", { length: 255 }).notNull(),
  blockingTaskCount: int("blockingTaskCount").notNull(),
  ventureNames: json("ventureNames").$type<string[]>(),
  riskLevel: varchar("riskLevel", { length: 16 }).notNull(),    // low | medium | high | critical
  recommendation: text("recommendation"),                        // LLM-generated rebalance suggestion
  resolved: boolean("resolved").default(false).notNull(),
  resolvedAt: timestamp("resolvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ResourceContentionAlert = typeof resourceContentionAlert.$inferSelect;

export const marketSignal = mysqlTable("market_signal", {
  id: int("id").autoincrement().primaryKey(),
  sector: varchar("sector", { length: 64 }).notNull(),
  region: varchar("region", { length: 128 }),
  signalType: varchar("signalType", { length: 32 }).notNull(),  // regulatory | market_trend | competitor | opportunity | risk
  headline: varchar("headline", { length: 500 }).notNull(),
  summary: text("summary").notNull(),
  impact: varchar("impact", { length: 16 }).notNull(),          // positive | negative | neutral
  impactScore: int("impactScore").default(50).notNull(),        // 0-100, how significant
  source: varchar("source", { length: 255 }),                   // where this signal came from
  sourceUrl: text("sourceUrl"),
  // Venture linking — which ventures are affected
  affectedVentureIds: json("affectedVentureIds").$type<number[]>(),
  affectedOrganizationIds: json("affectedOrganizationIds").$type<number[]>(),
  // LLM analysis
  actionRecommendation: text("actionRecommendation"),
  relevanceScore: int("relevanceScore").default(50).notNull(),  // 0-100
  // Status
  isActive: boolean("isActive").default(true).notNull(),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type MarketSignal = typeof marketSignal.$inferSelect;
export type InsertMarketSignal = typeof marketSignal.$inferInsert;

export const recommendationOutcome = mysqlTable("recommendation_outcome", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId"),
  // What was recommended
  agentEventId: int("agentEventId").notNull(),                  // link to the agent_events record
  agentName: varchar("agentName", { length: 64 }).notNull(),
  recommendationType: varchar("recommendationType", { length: 64 }).notNull(), // advance_stage | follow_up | distribution | escalation
  recommendationSummary: text("recommendationSummary"),
  // What the client did
  clientAction: varchar("clientAction", { length: 32 }).notNull(), // accepted | rejected | modified | ignored | deferred
  clientFeedback: text("clientFeedback"),                        // optional text from client
  actionTakenAt: timestamp("actionTakenAt"),
  // What actually happened (measured outcome)
  outcomeType: varchar("outcomeType", { length: 32 }),           // positive | negative | neutral | pending
  outcomeDescription: text("outcomeDescription"),
  outcomeMetric: int("outcomeMetric"),                           // e.g., days saved, $ impact
  outcomeMeasuredAt: timestamp("outcomeMeasuredAt"),
  // Scoring
  wasHelpful: boolean("wasHelpful"),                             // client explicit feedback
  accuracyScore: int("accuracyScore"),                           // 0-100, how accurate was the prediction
  // Meta
  ventureId: int("ventureId"),
  sector: varchar("sector", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type RecommendationOutcome = typeof recommendationOutcome.$inferSelect;
export type InsertRecommendationOutcome = typeof recommendationOutcome.$inferInsert;

export const agentPerformance = mysqlTable("agent_performance", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId"),
  agentName: varchar("agentName", { length: 64 }).notNull(),
  sector: varchar("sector", { length: 64 }),
  // Metrics (rolling 30-day window)
  totalRecommendations: int("totalRecommendations").default(0).notNull(),
  acceptedCount: int("acceptedCount").default(0).notNull(),
  rejectedCount: int("rejectedCount").default(0).notNull(),
  ignoredCount: int("ignoredCount").default(0).notNull(),
  positiveOutcomes: int("positiveOutcomes").default(0).notNull(),
  negativeOutcomes: int("negativeOutcomes").default(0).notNull(),
  // Derived scores
  acceptanceRate: int("acceptanceRate"),                         // 0-100%
  accuracyRate: int("accuracyRate"),                             // 0-100%
  clientTrustScore: int("clientTrustScore"),                     // composite 0-100
  // Calibration adjustments
  severityBias: varchar("severityBias", { length: 16 }),         // over_alerts | under_alerts | calibrated
  recommendedCalibration: text("recommendedCalibration"),
  // Meta
  periodStart: timestamp("periodStart").notNull(),
  periodEnd: timestamp("periodEnd").notNull(),
  calculatedAt: timestamp("calculatedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type AgentPerformance = typeof agentPerformance.$inferSelect;
export type InsertAgentPerformance = typeof agentPerformance.$inferInsert;

export const eventTriggerLog = mysqlTable("event_trigger_log", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId"),
  triggerType: varchar("triggerType", { length: 32 }).notNull(), // task_overdue | stage_ready | distribution_due | health_drop | contention
  triggerSource: varchar("triggerSource", { length: 64 }).notNull(), // mutation | scheduler | manual
  entityType: varchar("entityType", { length: 32 }),             // task | venture | distribution | team_member
  entityId: int("entityId"),
  entityName: varchar("entityName", { length: 255 }),
  // What happened
  description: text("description"),
  agentsTriggered: json("agentsTriggered").$type<string[]>(),    // which agents were fired
  signalsGenerated: int("signalsGenerated").default(0).notNull(),
  // Timing
  latencyMs: int("latencyMs"),                                   // how fast the trigger fired
  processedAt: timestamp("processedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type EventTriggerLog = typeof eventTriggerLog.$inferSelect;
export type InsertEventTriggerLog = typeof eventTriggerLog.$inferInsert;
