import mysql from 'mysql2/promise';
import { config } from 'dotenv';
config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const [chris] = await conn.execute("SELECT id, name, email, role, userStatus, organizationId, lastSignedIn FROM users WHERE name LIKE '%chris%' OR name LIKE '%Chris%' OR name LIKE '%Phelps%' OR email LIKE '%chris%' OR email LIKE '%phelps%'");
console.log('Chris records:', JSON.stringify(chris, null, 2));

const [all] = await conn.execute('SELECT id, name, email, role, userStatus, organizationId FROM users ORDER BY id');
console.log('\nAll users:', JSON.stringify(all, null, 2));

const [invites] = await conn.execute('SELECT id, email, role, status, expiresAt FROM invitations ORDER BY id');
console.log('\nAll invitations:', JSON.stringify(invites, null, 2));

await conn.end();
