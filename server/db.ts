import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2";
import { InsertUser, users, activityLog } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: mysql.Pool | null = null;

/**
 * Create a mysql2 connection pool with resilient settings.
 * Uses the callback-based (non-promise) pool so drizzle gets the correct $client type.
 */
function createPool(): mysql.Pool {
  const pool = mysql.createPool({
    uri: process.env.DATABASE_URL,
    waitForConnections: true,
    connectionLimit: 10,
    maxIdle: 5,
    idleTimeout: 60_000,        // Close idle connections after 60s
    enableKeepAlive: true,
    keepAliveInitialDelay: 10_000, // Send keep-alive every 10s to prevent stale connections
    connectTimeout: 10_000,     // 10s connect timeout
  });
  return pool;
}

/**
 * Lazily create the drizzle instance backed by a connection pool.
 * If the pool becomes unhealthy, it is destroyed and recreated.
 */
export async function getDb() {
  // Fast path: pool and drizzle instance exist, verify pool health
  if (_pool && _db) {
    try {
      // Quick health check — execute a lightweight query via promise wrapper
      await _pool.promise().query("SELECT 1");
      return _db;
    } catch {
      // Pool is stale/broken — destroy and recreate
      console.warn("[Database] Pool health check failed, recreating connection pool...");
      try { _pool.end(() => {}); } catch { /* ignore */ }
      _pool = null;
      _db = null;
    }
  }

  // Create new pool and drizzle instance
  if (!process.env.DATABASE_URL) return null;

  const MAX_RETRIES = 3;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      _pool = createPool();
      _db = drizzle({ client: _pool });

      // Verify the connection works
      await _pool.promise().query("SELECT 1");

      if (attempt > 1) {
        console.log(`[Database] Reconnected successfully on attempt ${attempt}`);
      }
      return _db;
    } catch (error: any) {
      console.error(`[Database] Connection attempt ${attempt}/${MAX_RETRIES} failed:`, error.message);
      try { if (_pool) _pool.end(() => {}); } catch { /* ignore */ }
      _pool = null;
      _db = null;

      if (attempt < MAX_RETRIES) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  console.error("[Database] All connection attempts failed. Database unavailable.");
  return null;
}

/**
 * Force-reset the connection pool. Call this if the scheduler detects persistent failures.
 */
export async function resetDbPool(): Promise<void> {
  try { if (_pool) _pool.end(() => {}); } catch { /* ignore */ }
  _pool = null;
  _db = null;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const insertOnlyFields = ["name"] as const;
    const updateableFields = ["email", "loginMethod"] as const;
    type AnyTextField = "name" | "email" | "loginMethod";

    const assignInsertOnly = (field: AnyTextField) => {
      const value = user[field];
      if (value === undefined) return;
      values[field] = value ?? null;
    };
    const assignNullable = (field: AnyTextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    insertOnlyFields.forEach(assignInsertOnly);
    updateableFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    // Handle status field — don't overwrite on update unless explicitly set
    if (user.status !== undefined) {
      values.status = user.status;
      updateSet.status = user.status;
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function writeAuditLog(entry: {
  entityType: string;
  entityId?: number | null;
  entityName?: string | null;
  action: string;
  detail?: string | null;
  userName?: string | null;
  sector?: string | null;
  activitySource?: "atlas_ops" | "client_business" | "system";
  organizationId?: number | null;
}) {
  const db = await getDb();
  if (!db) {
    return;
  }
  try {
    await db.insert(activityLog).values({
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      entityName: entry.entityName ?? null,
      action: entry.action,
      detail: entry.detail ?? null,
      userName: entry.userName ?? "System",
      sector: entry.sector ?? null,
      activitySource: entry.activitySource ?? "atlas_ops",
      organizationId: entry.organizationId ?? null,
    });
  } catch (error) {
    console.error("[AuditLog] Failed to write:", error);
    // Non-blocking — don't throw, just log
  }
}

// TODO: add feature queries here as your schema grows.
