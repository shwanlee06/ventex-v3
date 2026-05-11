/**
 * Passkey Router — WebAuthn Registration & Authentication Endpoints
 *
 * Provides tRPC procedures for:
 * - Generating registration/authentication options
 * - Verifying registration/authentication responses
 * - Managing passkeys (list, rename, revoke)
 */

import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import {
  generatePasskeyRegistrationOptions,
  verifyPasskeyRegistration,
  generatePasskeyAuthenticationOptions,
  verifyPasskeyAuthentication,
  listUserPasskeys,
  revokePasskey,
} from "../security/passkeys";
import { enforceRateLimit } from "../security/rateLimit";
import { getDb } from "../db";
import { passkeyCredentials } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

export const passkeysRouter = router({
  /**
   * Generate registration options — user must be authenticated
   * Called when user clicks "Add Passkey" in security settings
   */
  generateRegistrationOptions: protectedProcedure
    .input(z.object({ friendlyName: z.string().optional() }))
    .mutation(async ({ ctx }) => {
      const user = ctx.user;
      const origin = ctx.req.headers.origin || ctx.req.headers.referer?.replace(/\/$/, "") || "";

      const result = await generatePasskeyRegistrationOptions(
        user.id,
        user.name || "",
        user.email || "",
        origin
      );

      if (!result) {
        throw new Error("Failed to generate registration options");
      }

      return result.options;
    }),

  /**
   * Verify registration response — completes passkey registration
   */
  verifyRegistration: protectedProcedure
    .input(
      z.object({
        response: z.any(), // RegistrationResponseJSON
        friendlyName: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const origin = ctx.req.headers.origin || ctx.req.headers.referer?.replace(/\/$/, "") || "";

      const result = await verifyPasskeyRegistration(
        ctx.user.id,
        input.response,
        origin,
        input.friendlyName
      );

      if (!result.success) {
        throw new Error(result.error || "Registration verification failed");
      }

      return { success: true, credentialId: result.credentialId };
    }),

  /**
   * Generate authentication options — public (no auth required)
   * Called when user clicks "Sign in with Passkey" on login page
   */
  generateAuthenticationOptions: publicProcedure
    .input(z.object({ origin: z.string() }).optional())
    .mutation(async ({ ctx, input }) => {
      const ip = ctx.req.ip || ctx.req.socket.remoteAddress || "unknown";
      enforceRateLimit("login", ip);

      const origin = input?.origin || ctx.req.headers.origin || ctx.req.headers.referer?.replace(/\/$/, "") || "";

      const result = await generatePasskeyAuthenticationOptions(origin);

      if (!result) {
        throw new Error("Failed to generate authentication options");
      }

      return result.options;
    }),

  /**
   * Verify authentication response — public (this IS the login)
   * Returns session token on success
   */
  verifyAuthentication: publicProcedure
    .input(
      z.object({
        response: z.any(), // AuthenticationResponseJSON
        origin: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const ip = ctx.req.ip || ctx.req.socket.remoteAddress || "unknown";
      enforceRateLimit("login", ip);

      const result = await verifyPasskeyAuthentication(input.response, input.origin);

      if (!result.success || !result.userId) {
        throw new Error(result.error || "Authentication failed");
      }

      // Return the userId so the caller can establish a session
      // The actual session creation is handled by the OAuth callback pattern
      return {
        success: true,
        userId: result.userId,
        message: "Passkey authentication successful",
      };
    }),

  /**
   * List user's passkeys — for security settings page
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    return listUserPasskeys(ctx.user.id);
  }),

  /**
   * Rename a passkey
   */
  rename: protectedProcedure
    .input(
      z.object({
        credentialId: z.number(),
        friendlyName: z.string().min(1).max(255),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      await db
        .update(passkeyCredentials)
        .set({ friendlyName: input.friendlyName })
        .where(
          and(
            eq(passkeyCredentials.id, input.credentialId),
            eq(passkeyCredentials.userId, ctx.user.id)
          )
        );

      return { success: true };
    }),

  /**
   * Revoke a passkey
   */
  revoke: protectedProcedure
    .input(z.object({ credentialId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const success = await revokePasskey(ctx.user.id, input.credentialId);
      if (!success) {
        throw new Error("Failed to revoke passkey");
      }
      return { success: true };
    }),
});
