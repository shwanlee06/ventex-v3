/**
 * Passkey / WebAuthn Schema Addition
 * 
 * This file contains the schema definition for WebAuthn passkeys.
 * These tables should be added to schema.ts.
 * 
 * WebAuthn enables passwordless, phishing-resistant authentication using
 * platform authenticators (Touch ID, Face ID, Windows Hello) and
 * security keys (YubiKey, etc.)
 */

// Add to drizzle/schema.ts:

// WebAuthn Passkey Credentials
// Each user can register multiple passkeys (e.g., laptop + phone + security key)
export const passkeyCredentials_SCHEMA = `
export const passkeyCredentials = mysqlTable("passkey_credentials", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  // WebAuthn credential fields
  credentialId: varchar("credentialId", { length: 512 }).notNull().unique(), // base64url encoded
  publicKey: text("publicKey").notNull(), // COSE public key, base64url encoded
  counter: bigint("counter", { mode: "number" }).default(0).notNull(), // signature counter for clone detection
  // Credential metadata
  deviceType: varchar("deviceType", { length: 32 }).notNull(), // 'platform' | 'cross-platform'
  backedUp: boolean("backedUp").default(false).notNull(), // whether credential is backed up (e.g., iCloud Keychain)
  transports: json("transports").$type<string[]>(), // ['internal', 'usb', 'ble', 'nfc', 'hybrid']
  // User-facing metadata
  friendlyName: varchar("friendlyName", { length: 255 }), // e.g., "MacBook Pro Touch ID", "YubiKey 5"
  lastUsedAt: timestamp("lastUsedAt"),
  // Lifecycle
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  revokedAt: timestamp("revokedAt"),
});

export type PasskeyCredential = typeof passkeyCredentials.$inferSelect;
export type InsertPasskeyCredential = typeof passkeyCredentials.$inferInsert;
`;

// WebAuthn Challenge Store (short-lived, for registration/authentication ceremonies)
export const passkeyChallenge_SCHEMA = `
export const passkeyChallenges = mysqlTable("passkey_challenges", {
  id: int("id").autoincrement().primaryKey(),
  challenge: varchar("challenge", { length: 128 }).notNull().unique(), // base64url encoded random bytes
  userId: int("userId"), // null for authentication (discoverable credentials)
  type: varchar("challengeType", { length: 16 }).notNull(), // 'registration' | 'authentication'
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PasskeyChallenge = typeof passkeyChallenges.$inferSelect;
`;
