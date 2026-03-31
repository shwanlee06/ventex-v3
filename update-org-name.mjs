import 'dotenv/config';
import mysql from 'mysql2/promise';

const url = process.env.DATABASE_URL;
if (!url) { console.error('No DATABASE_URL'); process.exit(1); }

const conn = await mysql.createConnection(url);

// Update org name
const [result] = await conn.execute(
  "UPDATE organizations SET name = 'Royalton Venture Holding' WHERE slug = 'royalton'"
);
console.log('Updated rows:', result.affectedRows);

// Verify
const [rows] = await conn.execute(
  "SELECT id, name, slug FROM organizations WHERE slug = 'royalton'"
);
console.log('Verification:', rows);

await conn.end();
