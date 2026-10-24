import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function applyMigration() {
  console.log('🚀 Running Migration 015: Campus Adaptation & Access Control...');
  const conn = await pool.getConnection();

  try {
    const sqlPath = path.join(__dirname, '..', 'migrations', '015_campus_adaptation_and_access_control.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    const cleanSql = sqlContent
      .replace(/--.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//gm, '');

    const statements = cleanSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const stmt of statements) {
      if (stmt.length > 0) {
        console.log(`Executing:\n${stmt.substring(0, 100)}...`);
        await conn.query(stmt);
      }
    }

    console.log('✅ Migration 015 successfully applied to Hostinger MySQL Database!');
    conn.release();
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration 015 failed:', err);
    conn.release();
    process.exit(1);
  }
}

applyMigration();
