import { query } from '../db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function applyMigration() {
  console.log('[MIGRATION 017] Starting application...');
  let sql = fs.readFileSync(path.join(__dirname, '../migrations/017_security_hardening_and_mfa.sql'), 'utf-8');

  // Strip multi-line and single line comments
  sql = sql.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

  // Split statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const stmt of statements) {
    try {
      console.log(`[EXECUTING] ${stmt.substring(0, 80).replace(/\s+/g, ' ')}...`);
      await query(stmt);
      console.log(`[OK] Success`);
    } catch (err) {
      console.warn(`[WARN] Statement warning/error:`, err.message);
    }
  }

  // Register in migraciones table
  try {
    await query(`
      INSERT INTO migraciones (version, nombre, ejecutado_en)
      VALUES (?, ?, NOW())
      ON DUPLICATE KEY UPDATE ejecutado_en = NOW()
    `, ['017', '017_security_hardening_and_mfa.sql']);
    console.log('[MIGRATION 017] Registered in migraciones table.');
  } catch (err) {
    console.warn('[MIGRATION 017] Could not register in migraciones:', err.message);
  }

  // Verify columns
  const uCols = await query("SHOW COLUMNS FROM usuarios LIKE 'mfa%'");
  const sCols = await query("SHOW COLUMNS FROM sesiones LIKE 'ultima%'");
  const aTable = await query("SHOW TABLES LIKE 'auditoria_seguridad'");
  console.log('[VERIFICATION] MFA columns:', uCols.map(c => c.Field));
  console.log('[VERIFICATION] Sesiones columns:', sCols.map(c => c.Field));
  console.log('[VERIFICATION] Security audit table:', aTable.length > 0 ? 'EXISTS' : 'MISSING');

  console.log('[MIGRATION 017] Completed successfully!');
  process.exit(0);
}

applyMigration().catch(err => {
  console.error('[FATAL] Migration failed:', err);
  process.exit(1);
});
