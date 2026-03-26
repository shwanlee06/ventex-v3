/**
 * Script to create an invitation for Najib (team member ID 12)
 * and output the invite link.
 */
import crypto from "crypto";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

async function main() {
  const connection = await mysql.createConnection(DATABASE_URL);

  try {
    // Verify Najib's record
    const [members] = await connection.execute(
      "SELECT id, name, email, organizationId, systemRole FROM team_members WHERE id = 12"
    );
    const member = members[0];
    if (!member) {
      console.error("Najib not found (team member ID 12)");
      process.exit(1);
    }
    console.log("Found member:", member);

    // Generate token
    const token = crypto.randomBytes(48).toString("base64url");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Get the admin user ID (invitedBy) — Shwan Lee is the primary admin
    const [admins] = await connection.execute(
      "SELECT id, name FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1"
    );
    const owner = admins[0];
    if (!owner) {
      console.error("No admin user found");
      process.exit(1);
    }

    // Create invitation
    await connection.execute(
      `INSERT INTO invitations (email, organizationId, inviteRole, token, teamMemberId, invitedBy, invitedByName, expiresAt, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        member.email.toLowerCase(),
        member.organizationId,
        member.systemRole || "client",
        token,
        member.id,
        owner.id,
        owner.name || "Admin",
        expiresAt,
      ]
    );

    // Get the invitation ID
    const [invRows] = await connection.execute(
      "SELECT id FROM invitations WHERE token = ? LIMIT 1",
      [token]
    );
    const invId = invRows[0]?.id;

    // Link invitation to team member
    if (invId) {
      await connection.execute(
        "UPDATE team_members SET invitationId = ?, invitationStatus = 'pending' WHERE id = ?",
        [invId, member.id]
      );
    }

    // Build the invite link
    const origin = "https://royaltonai-tykqbqav.manus.space";
    const inviteLink = `${origin}/accept-invite?token=${encodeURIComponent(token)}`;

    console.log("\n=== INVITATION CREATED ===");
    console.log(`Name: ${member.name}`);
    console.log(`Email: ${member.email}`);
    console.log(`Role: ${member.systemRole || "client"}`);
    console.log(`Organization: Royalton Venture Holding`);
    console.log(`Token: ${token}`);
    console.log(`Expires: ${expiresAt.toISOString()}`);
    console.log(`\nInvite Link:\n${inviteLink}`);
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
