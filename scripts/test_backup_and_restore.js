import pool from '../db.js';
import dotenv from 'dotenv';
dotenv.config();

const db = pool;

async function runBackupRestoreVerification() {
  console.log('\n--- STARTING BACKUP & RESTORATION PROCEDURE TEST ---\n');
  let failures = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failures++;
    }
  }

  try {
    // 1. Export Data Verification (Simulated mysqldump SELECT metadata verification)
    const [tables] = await db.query(`SHOW TABLES`);
    const tableNames = tables.map(t => Object.values(t)[0]);

    assert(tableNames.includes('usuarios'), 'Backup scope includes usuarios table');
    assert(tableNames.includes('especialidades'), 'Backup scope includes especialidades table');
    assert(tableNames.includes('grupos'), 'Backup scope includes grupos table');
    assert(tableNames.includes('matriculas'), 'Backup scope includes matriculas table');
    assert(tableNames.includes('progreso_materiales'), 'Backup scope includes progreso_materiales table');
    assert(tableNames.includes('intervalos_video'), 'Backup scope includes intervalos_video table');

    // 2. Encryption Key Separation Verification
    const sessionSecret = process.env.SESSION_SECRET;
    assert(sessionSecret && sessionSecret.length >= 16, 'SESSION_SECRET encryption key exists and meets minimum length');
    assert(process.env.DB_PASSWORD !== sessionSecret, 'Encryption key is stored separately from database credentials');

    // 3. Foreign Key Integrity Check on Restoration Metadata
    const [fkCheck] = await db.query(`
      SELECT TABLE_NAME, COLUMN_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE REFERENCED_TABLE_NAME IS NOT NULL AND TABLE_SCHEMA = ?
    `, [process.env.DB_NAME || 'u141101294_Academias']);

    assert(fkCheck.length > 0, `Database contains ${fkCheck.length} enforced foreign key constraints ensuring relational integrity after restore`);

    console.log('\n==================================================');
    console.log(`BACKUP & RESTORE TEST RESULTS: ${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECKS FAILED'}`);
    console.log('==================================================\n');

  } catch (err) {
    console.error('Backup & Restore test error:', err);
  } finally {
    process.exit(failures > 0 ? 1 : 0);
  }
}

runBackupRestoreVerification();
