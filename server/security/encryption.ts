/**
 * AES-256-GCM Envelope Encryption Module
 * 
 * SOC 2 compliant application-level encryption.
 * Data is encrypted before entering the database or S3.
 * Even with DB/S3 access, data is unreadable without the master key.
 */

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit IV for GCM
const TAG_LENGTH = 16; // 128-bit auth tag
const ENCODING = "base64" as const;

// Separator between IV, auth tag, and ciphertext in stored format
const SEPARATOR = ".";

// Prefix to identify encrypted values
const ENCRYPTED_PREFIX = "enc:";

function getMasterKey(): Buffer {
  const hex = process.env.ENCRYPTION_MASTER_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "ENCRYPTION_MASTER_KEY must be a 64-character hex string (256 bits)"
    );
  }
  return Buffer.from(hex, "hex");
}

/**
 * Derive a data encryption key (DEK) from the master key + a context string.
 * This provides key separation so each data domain uses a different key.
 */
function deriveKey(context: string): Buffer {
  const masterKey = getMasterKey();
  return crypto
    .createHmac("sha256", masterKey)
    .update(context)
    .digest();
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a prefixed string: "enc:<iv>.<tag>.<ciphertext>" (all base64)
 * 
 * @param plaintext - The string to encrypt
 * @param context - Key derivation context (e.g., "venture.financials", "client.pii")
 */
export function encrypt(plaintext: string, context: string = "default"): string {
  if (!plaintext) return plaintext;
  
  // Don't double-encrypt
  if (plaintext.startsWith(ENCRYPTED_PREFIX)) return plaintext;

  const key = deriveKey(context);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: TAG_LENGTH,
  });

  let encrypted = cipher.update(plaintext, "utf8", ENCODING);
  encrypted += cipher.final(ENCODING);

  const tag = cipher.getAuthTag();

  return `${ENCRYPTED_PREFIX}${iv.toString(ENCODING)}${SEPARATOR}${tag.toString(ENCODING)}${SEPARATOR}${encrypted}`;
}

/**
 * Decrypt an AES-256-GCM encrypted string.
 * Accepts the prefixed format: "enc:<iv>.<tag>.<ciphertext>"
 * 
 * @param ciphertext - The encrypted string (with prefix)
 * @param context - Must match the context used during encryption
 */
export function decrypt(ciphertext: string, context: string = "default"): string {
  if (!ciphertext) return ciphertext;
  
  // Not encrypted — return as-is
  if (!ciphertext.startsWith(ENCRYPTED_PREFIX)) return ciphertext;

  const payload = ciphertext.slice(ENCRYPTED_PREFIX.length);
  const parts = payload.split(SEPARATOR);

  if (parts.length !== 3) {
    throw new Error("Invalid encrypted data format");
  }

  const [ivB64, tagB64, encryptedB64] = parts;
  const key = deriveKey(context);
  const iv = Buffer.from(ivB64, ENCODING);
  const tag = Buffer.from(tagB64, ENCODING);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: TAG_LENGTH,
  });
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encryptedB64, ENCODING, "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Encrypt a Buffer (for file encryption).
 * Returns { iv, tag, data } as Buffers.
 */
export function encryptBuffer(
  data: Buffer,
  context: string = "file"
): { iv: Buffer; tag: Buffer; encrypted: Buffer } {
  const key = deriveKey(context);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: TAG_LENGTH,
  });

  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  const tag = cipher.getAuthTag();

  return { iv, tag, encrypted };
}

/**
 * Decrypt a Buffer (for file decryption).
 */
export function decryptBuffer(
  encrypted: Buffer,
  iv: Buffer,
  tag: Buffer,
  context: string = "file"
): Buffer {
  const key = deriveKey(context);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: TAG_LENGTH,
  });
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

/**
 * Encrypt a JSON object's specified fields.
 * Returns a new object with those fields encrypted.
 */
export function encryptFields<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[],
  context: string
): T {
  const result = { ...obj };
  for (const field of fields) {
    const value = result[field];
    if (typeof value === "string" && value) {
      (result as any)[field] = encrypt(value, context);
    } else if (typeof value === "object" && value !== null) {
      (result as any)[field] = encrypt(JSON.stringify(value), context);
    }
  }
  return result;
}

/**
 * Decrypt a JSON object's specified fields.
 * Returns a new object with those fields decrypted.
 */
export function decryptFields<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[],
  context: string
): T {
  const result = { ...obj };
  for (const field of fields) {
    const value = result[field];
    if (typeof value === "string" && value.startsWith(ENCRYPTED_PREFIX)) {
      const decrypted = decrypt(value, context);
      // Try to parse as JSON (for objects/arrays that were stringified)
      try {
        (result as any)[field] = JSON.parse(decrypted);
      } catch {
        (result as any)[field] = decrypted;
      }
    }
  }
  return result;
}

/**
 * Check if the encryption system is properly configured.
 */
export function isEncryptionConfigured(): boolean {
  try {
    getMasterKey();
    return true;
  } catch {
    return false;
  }
}

/**
 * Hash a value for indexing (allows searching encrypted fields).
 * Uses HMAC-SHA256 so the hash is deterministic but not reversible.
 */
export function hashForIndex(value: string, context: string = "index"): string {
  const key = deriveKey(context);
  return crypto.createHmac("sha256", key).update(value).digest("hex");
}
