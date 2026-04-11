/**
 * MFA / TOTP Module — SOC 2 Compliant Two-Factor Authentication
 *
 * Uses TOTP (RFC 6238) with:
 * - AES-256-GCM encrypted secrets at rest
 * - 6-digit codes, 30-second window
 * - 10 backup codes (SHA-256 hashed)
 * - QR code generation for authenticator apps
 */

import { TOTP, Secret } from "otpauth";
import * as QRCode from "qrcode";
import crypto from "crypto";
import { encrypt, decrypt, isEncryptionConfigured } from "./encryption";

const TOTP_ISSUER = "VENTEX";
const TOTP_PERIOD = 30; // seconds
const TOTP_DIGITS = 6;
const TOTP_ALGORITHM = "SHA1"; // Most authenticator apps use SHA1
const BACKUP_CODE_COUNT = 10;
const MFA_CONTEXT = "mfa.totp.secret";

/**
 * Generate a new TOTP secret for a user.
 * Returns the raw secret (base32) and encrypted version for DB storage.
 */
export function generateTotpSecret(userEmail: string): {
  secret: string; // base32 raw secret (show to user once)
  encryptedSecret: string; // encrypted for DB storage
  otpauthUri: string; // otpauth:// URI for QR code
} {
  const secret = new Secret({ size: 20 }); // 160-bit secret

  const totp = new TOTP({
    issuer: TOTP_ISSUER,
    label: userEmail,
    algorithm: TOTP_ALGORITHM,
    digits: TOTP_DIGITS,
    period: TOTP_PERIOD,
    secret,
  });

  const otpauthUri = totp.toString();
  const base32Secret = secret.base32;

  // Encrypt the secret before storing
  let encryptedSecret = base32Secret;
  if (isEncryptionConfigured()) {
    encryptedSecret = encrypt(base32Secret, MFA_CONTEXT);
  }

  return {
    secret: base32Secret,
    encryptedSecret,
    otpauthUri,
  };
}

/**
 * Generate a QR code as a data URL for the TOTP URI.
 */
export async function generateQrCode(otpauthUri: string): Promise<string> {
  return QRCode.toDataURL(otpauthUri, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 256,
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
  });
}

/**
 * Verify a TOTP code against a stored (possibly encrypted) secret.
 * Allows a 1-period window in each direction for clock drift.
 */
export function verifyTotpCode(
  code: string,
  storedSecret: string
): boolean {
  if (!code || !storedSecret) return false;

  // Decrypt if encrypted
  let rawSecret = storedSecret;
  if (isEncryptionConfigured() && storedSecret.startsWith("enc:")) {
    rawSecret = decrypt(storedSecret, MFA_CONTEXT);
  }

  const totp = new TOTP({
    algorithm: TOTP_ALGORITHM,
    digits: TOTP_DIGITS,
    period: TOTP_PERIOD,
    secret: Secret.fromBase32(rawSecret),
  });

  const delta = totp.validate({ token: code, window: 1 });
  return delta !== null;
}

/**
 * Generate backup codes — 10 random 8-character alphanumeric codes.
 * Returns both plain codes (show to user once) and hashed versions (store in DB).
 */
export function generateBackupCodes(): {
  plainCodes: string[];
  hashedCodes: string[];
} {
  const plainCodes: string[] = [];
  const hashedCodes: string[] = [];

  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    // Generate 8-char alphanumeric code in groups of 4
    const code = crypto.randomBytes(4).toString("hex").toUpperCase();
    const formatted = `${code.slice(0, 4)}-${code.slice(4, 8)}`;
    plainCodes.push(formatted);
    hashedCodes.push(hashBackupCode(formatted));
  }

  return { plainCodes, hashedCodes };
}

/**
 * Verify a backup code against stored hashed codes.
 * Returns the index of the matched code (for removal) or -1 if not found.
 */
export function verifyBackupCode(
  code: string,
  hashedCodes: string[]
): number {
  if (!code || !hashedCodes) return -1;
  const normalized = code.trim().toUpperCase();
  const hashed = hashBackupCode(normalized);
  return hashedCodes.indexOf(hashed);
}

function hashBackupCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}
