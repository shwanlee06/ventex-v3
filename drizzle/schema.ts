import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, bigint, json } from "drizzle-orm/mysql-core";

// ── Users (existing) ────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

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
