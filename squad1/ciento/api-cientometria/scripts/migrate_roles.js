#!/usr/bin/env node
// Migration script: normalize role names to 'curadoria_bonetti'
const mysql = require('mysql2/promise');
require('dotenv').config();

const config = {
  host: process.env.TIDB_HOST || 'gateway01.us-east-1.prod.aws.tidbcloud.com',
  user: process.env.TIDB_USER || 'bW63nyscFV7wYZr.root',
  password: process.env.TIDB_PASSWORD || 'mDTgW12h01Z15tnA',
  database: process.env.TIDB_DATABASE || 'Curadoria',
  port: process.env.TIDB_PORT ? Number(process.env.TIDB_PORT) : 4000,
  waitForConnections: true,
  connectionLimit: 2,
  queueLimit: 0,
  ssl: { rejectUnauthorized: true },
};

async function migrate() {
  let conn;
  try {
    conn = await mysql.createConnection(config);
    console.log('Connected to DB:', config.host, 'database:', config.database);

    const updateSql = `UPDATE users SET role = 'curadoria_bonetti' WHERE role IN ('curadoria_lucas','curadoria_bonneti')`;
    const [result] = await conn.execute(updateSql);

    console.log('Migration completed. Rows affected:', result.affectedRows);
  } catch (err) {
    console.error('Migration failed:', err.message || err);
    process.exitCode = 1;
  } finally {
    if (conn) await conn.end();
  }
}

migrate();
