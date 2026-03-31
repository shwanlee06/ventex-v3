import 'dotenv/config';
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await conn.execute('SELECT id, name, slug FROM organizations LIMIT 10');
console.log(JSON.stringify(rows, null, 2));
await conn.end();
