import pool from '../db.js';
import { verifyPassword } from '../authUtils.js';
import dotenv from 'dotenv';
dotenv.config();

const db = pool;

async function verifyAccount() {
  const email = 'guillerminajoya@gmail.com';
  const pass = 'Wattpad_3317';

  console.log(`\n--- VERIFYING USER ACCOUNT ACCESS FOR ${email} ---\n`);

  try {
    const [rows] = await db.query('SELECT * FROM usuarios WHERE email = ? LIMIT 1', [email]);
    if (rows.length === 0) {
      console.error('❌ FAIL: User not found in database');
      process.exit(1);
    }

    const u = rows[0];
    const isPassValid = await verifyPassword(pass, u.password_hash);

    const [roles] = await db.query(`
      SELECT r.codigo 
      FROM usuario_roles ur 
      JOIN roles r ON ur.rol_id = r.id 
      WHERE ur.usuario_id = ?
    `, [u.id]);

    const roleCodes = roles.map(r => r.codigo);

    console.log(`  ✅ Account ID: ${u.id}`);
    console.log(`  ✅ Email Original: ${u.email_original || u.email}`);
    console.log(`  ✅ Status: ${u.estado}`);
    console.log(`  ✅ Password Hash Verification: ${isPassValid ? 'MATCHED (Wattpad_3317)' : 'FAILED'}`);
    console.log(`  ✅ Assigned Roles (${roleCodes.length}): ${roleCodes.join(', ')}`);

    const hasAdmin = roleCodes.includes('ADMINISTRADOR');
    const hasProf = roleCodes.includes('PROFESOR');
    const hasAlumno = roleCodes.includes('ALUMNO');

    if (isPassValid && hasAdmin && hasProf && hasAlumno && u.estado === 'ACTIVO') {
      console.log('\n🎉 SUCCESS: Full multi-role access configured and verified for guillerminajoya@gmail.com!\n');
    } else {
      console.error('\n❌ FAIL: Account configuration incomplete');
    }

  } catch (err) {
    console.error('Verification error:', err);
  } finally {
    process.exit(0);
  }
}

verifyAccount();
