/**
 * Passkey / WebAuthn Service — Phishing-Resistant Passwordless Authentication
 *
 * Implements FIDO2/WebAuthn using SimpleWebAuthn:
 * - Registration: User registers a passkey (Touch ID, Face ID, YubiKey, Windows Hello)
 * - Authentication: User signs in with their passkey (no password needed)
 * - Discoverable credentials: Users can sign in without typing their email
 *
 * Security features:
 * - Challenge expiry (5 minutes)
 * - Signature counter validation (clone detection)
 * - Origin/RP ID verification
 * - Backed-up credential tracking
 */

import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
} from "@simplewebauthn/server";
import { getDb } from "../db";
import { passkeyCredentials, passkeyChallenges, users } from "../../drizzle/schema";
import { eq, and, isNull, gt } from "drizzle-orm";
import { logAudit } from "./rbac";

// ─── Configuration ──────────────────────────────────────────────────────────

// RP (Relying Party) configuration — must match the domain the user is on
const RP_NAME = "VENTEX";

// Dynamic RP ID based on request origin
function getRpId(origin: string): string {
  try {
    const url = new URL(origin);
    return url.hostname;
  } catch {
    return "ventex.us.com";
  }
}

function getExpectedOrigins(origin: string): string[] {
  // Accept the exact origin that was sent
  return [origin];
}

const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ─── Registration ───────────────────────────────────────────────────────────

/**
 * Generate registration options for a user to create a new passkey.
 * Called when user clicks "Add Passkey" in security settings.
 */
export async function generatePasskeyRegistrationOptions(
  userId: number,
  userName: string,
  userEmail: string,
  origin: string
): Promise<{ options: any; challenge: string } | null> {
  const db = await getDb();
  if (!db) return null;

  // Get existing credentials for this user (to exclude from re-registration)
  const existingCredentials = await db
    .select({
      credentialId: passkeyCredentials.credentialId,
      transports: passkeyCredentials.transports,
    })
    .from(passkeyCredentials)
    .where(and(eq(passkeyCredentials.userId, userId), isNull(passkeyCredentials.revokedAt)));

  const rpId = getRpId(origin);

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: rpId,
    userName: userEmail || userName,
    userDisplayName: userName || userEmail,
    // Don't allow re-registering existing credentials
    excludeCredentials: existingCredentials.map((cred) => ({
      id: cred.credentialId,
      transports: (cred.transports as AuthenticatorTransportFuture[]) || [],
    })),
    // Prefer platform authenticators (Touch ID, Face ID, Windows Hello)
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
      authenticatorAttachment: undefined, // Allow both platform and cross-platform
    },
    attestationType: "none", // We don't need attestation for most use cases
  });

  // Store the challenge
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS);
  await db.insert(passkeyChallenges).values({
    challenge: options.challenge,
    userId,
    type: "registration",
    expiresAt,
  });

  return { options, challenge: options.challenge };
}

/**
 * Verify a registration response and store the new passkey credential.
 */
export async function verifyPasskeyRegistration(
  userId: number,
  response: RegistrationResponseJSON,
  origin: string,
  friendlyName?: string
): Promise<{ success: boolean; credentialId?: string; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database unavailable" };

  const rpId = getRpId(origin);

  // Find the challenge
  const [challengeRecord] = await db
    .select()
    .from(passkeyChallenges)
    .where(
      and(
        eq(passkeyChallenges.userId, userId),
        eq(passkeyChallenges.type, "registration"),
        gt(passkeyChallenges.expiresAt, new Date())
      )
    )
    .orderBy(passkeyChallenges.createdAt)
    .limit(1);

  if (!challengeRecord) {
    return { success: false, error: "Challenge expired or not found" };
  }

  try {
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challengeRecord.challenge,
      expectedOrigin: getExpectedOrigins(origin),
      expectedRPID: rpId,
      requireUserVerification: false,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return { success: false, error: "Verification failed" };
    }

    const { credential, credentialDeviceType, credentialBackedUp } =
      verification.registrationInfo;

    // Store the credential
    await db.insert(passkeyCredentials).values({
      userId,
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString("base64url"),
      counter: Number(credential.counter),
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      transports: response.response.transports || [],
      friendlyName: friendlyName || `Passkey ${new Date().toLocaleDateString()}`,
    });

    // Clean up the challenge
    await db
      .delete(passkeyChallenges)
      .where(eq(passkeyChallenges.id, challengeRecord.id));

    // Audit log
    await logAudit({
      userId,
      action: "passkey_registered",
      entityType: "auth",
      details: JSON.stringify({
        credentialId: credential.id.substring(0, 16) + "...",
        deviceType: credentialDeviceType,
        backedUp: credentialBackedUp,
      }),
    });

    return { success: true, credentialId: credential.id };
  } catch (error: any) {
    return { success: false, error: error.message || "Verification error" };
  }
}

// ─── Authentication ─────────────────────────────────────────────────────────

/**
 * Generate authentication options for passkey sign-in.
 * Can be called with or without a userId:
 * - With userId: Only allows that user's passkeys (conditional UI)
 * - Without userId: Allows any discoverable credential (usernameless login)
 */
export async function generatePasskeyAuthenticationOptions(
  origin: string,
  userId?: number
): Promise<{ options: any; challenge: string } | null> {
  const db = await getDb();
  if (!db) return null;

  const rpId = getRpId(origin);

  let allowCredentials: { id: string; transports?: AuthenticatorTransportFuture[] }[] | undefined;

  if (userId) {
    const credentials = await db
      .select({
        credentialId: passkeyCredentials.credentialId,
        transports: passkeyCredentials.transports,
      })
      .from(passkeyCredentials)
      .where(and(eq(passkeyCredentials.userId, userId), isNull(passkeyCredentials.revokedAt)));

    if (credentials.length === 0) {
      return null; // User has no passkeys
    }

    allowCredentials = credentials.map((cred) => ({
      id: cred.credentialId,
      transports: (cred.transports as AuthenticatorTransportFuture[]) || [],
    }));
  }

  const options = await generateAuthenticationOptions({
    rpID: rpId,
    allowCredentials,
    userVerification: "preferred",
  });

  // Store the challenge
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS);
  await db.insert(passkeyChallenges).values({
    challenge: options.challenge,
    userId: userId || null,
    type: "authentication",
    expiresAt,
  });

  return { options, challenge: options.challenge };
}

/**
 * Verify an authentication response and return the authenticated user.
 */
export async function verifyPasskeyAuthentication(
  response: AuthenticationResponseJSON,
  origin: string
): Promise<{ success: boolean; userId?: number; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database unavailable" };

  const rpId = getRpId(origin);

  // Find the credential
  const [credential] = await db
    .select()
    .from(passkeyCredentials)
    .where(
      and(
        eq(passkeyCredentials.credentialId, response.id),
        isNull(passkeyCredentials.revokedAt)
      )
    )
    .limit(1);

  if (!credential) {
    return { success: false, error: "Credential not found or revoked" };
  }

  // Find a valid challenge
  const [challengeRecord] = await db
    .select()
    .from(passkeyChallenges)
    .where(
      and(
        eq(passkeyChallenges.type, "authentication"),
        gt(passkeyChallenges.expiresAt, new Date())
      )
    )
    .orderBy(passkeyChallenges.createdAt)
    .limit(1);

  if (!challengeRecord) {
    return { success: false, error: "Challenge expired or not found" };
  }

  try {
    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challengeRecord.challenge,
      expectedOrigin: getExpectedOrigins(origin),
      expectedRPID: rpId,
      credential: {
        id: credential.credentialId,
        publicKey: Buffer.from(credential.publicKey, "base64url"),
        counter: Number(credential.counter),
        transports: (credential.transports as AuthenticatorTransportFuture[]) || [],
      },
      requireUserVerification: false,
    });

    if (!verification.verified) {
      return { success: false, error: "Authentication verification failed" };
    }

    // Update counter (clone detection)
    const newCounter = verification.authenticationInfo.newCounter;
    await db
      .update(passkeyCredentials)
      .set({
        counter: BigInt(newCounter) as any,
        lastUsedAt: new Date(),
      })
      .where(eq(passkeyCredentials.id, credential.id));

    // Clean up the challenge
    await db
      .delete(passkeyChallenges)
      .where(eq(passkeyChallenges.id, challengeRecord.id));

    // Audit log
    await logAudit({
      userId: credential.userId,
      action: "passkey_authenticated",
      entityType: "auth",
      details: JSON.stringify({
        credentialId: credential.credentialId.substring(0, 16) + "...",
        deviceType: credential.deviceType,
      }),
    });

    return { success: true, userId: credential.userId };
  } catch (error: any) {
    return { success: false, error: error.message || "Authentication error" };
  }
}

// ─── Management ─────────────────────────────────────────────────────────────

/**
 * List all passkeys for a user.
 */
export async function listUserPasskeys(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      id: passkeyCredentials.id,
      credentialId: passkeyCredentials.credentialId,
      deviceType: passkeyCredentials.deviceType,
      backedUp: passkeyCredentials.backedUp,
      friendlyName: passkeyCredentials.friendlyName,
      lastUsedAt: passkeyCredentials.lastUsedAt,
      createdAt: passkeyCredentials.createdAt,
      revokedAt: passkeyCredentials.revokedAt,
    })
    .from(passkeyCredentials)
    .where(eq(passkeyCredentials.userId, userId));
}

/**
 * Revoke (soft-delete) a passkey.
 */
export async function revokePasskey(
  userId: number,
  credentialId: number
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const [result] = await db
    .update(passkeyCredentials)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(passkeyCredentials.id, credentialId),
        eq(passkeyCredentials.userId, userId)
      )
    );

  if ((result as any)?.affectedRows > 0) {
    await logAudit({
      userId,
      action: "passkey_revoked",
      entityType: "auth",
      entityId: String(credentialId),
    });
    return true;
  }

  return false;
}

/**
 * Clean up expired challenges (run periodically).
 */
export async function cleanupExpiredChallenges(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const [result] = await db
    .delete(passkeyChallenges)
    .where(gt(new Date() as any, passkeyChallenges.expiresAt));

  return (result as any)?.affectedRows ?? 0;
}
