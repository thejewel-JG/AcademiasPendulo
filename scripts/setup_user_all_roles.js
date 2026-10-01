import pool, { switchStudentGroupTransaction } from '../db.js';
import { hashPassword, verifyPassword, normalizeEmail } from '../authUtils.js';
import dotenv from 'dotenv';
dotenv.config();

const db = pool;

async function setupUserAllRoles() {
  const rawEmail = 'guillerminajoya@gmail.com';
  const rawPassword = 'Wattpad_3317';
  const normEmail = normalizeEmail(rawEmail);

  console.log(`\n--- SETTING UP MULTI-ROLE ACCESS FOR ${rawEmail} ---\n`);

  try {
    const passHash = await hashPassword(rawPassword);

    // 1. Check if user already exists
    const [existing] = await db.query('SELECT * FROM usuarios WHERE email = ? LIMIT 1', [normEmail]);

    let userId;
    if (existing.length > 0) {
      userId = existing[0].id;
      console.log(`Updating existing user account ID: ${userId}...`);
      await db.query(`
        UPDATE usuarios 
        SET password_hash = ?, estado = 'ACTIVO', cambio_password_obligatorio = 0, actualizado_en = NOW()
        WHERE id = ?
      `, [passHash, userId]);
    } else {
      userId = `usr_guillermina_${Date.now()}`;
      console.log(`Creating new user account ID: ${userId}...`);
      await db.query(`
        INSERT INTO usuarios (id, nombre, apellidos, email, email_original, password_hash, estado, cambio_password_obligatorio)
        VALUES (?, 'Guillermina', 'Joya', ?, ?, ?, 'ACTIVO', 0)
      `, [userId, normEmail, rawEmail, passHash]);
    }

    // 2. Fetch all role IDs (ADMINISTRADOR, PROFESOR, ALUMNO)
    const [roles] = await db.query("SELECT id, codigo FROM roles WHERE codigo IN ('ADMINISTRADOR', 'PROFESOR', 'ALUMNO')");

    for (const r of roles) {
      const [hasRole] = await db.query('SELECT * FROM usuario_roles WHERE usuario_id = ? AND rol_id = ?', [userId, r.id]);
      if (hasRole.length === 0) {
        await db.query('INSERT INTO usuario_roles (usuario_id, rol_id) VALUES (?, ?)', [userId, r.id]);
        console.log(`  ✅ Assigned role ${r.codigo} to user`);
      } else {
        console.log(`  ℹ️ User already has role ${r.codigo}`);
      }
    }

    // 3. Ensure Teacher Assignment (Assign as main teacher for an active group)
    const [groups] = await db.query('SELECT id, especialidad_id FROM grupos WHERE estado = "ACTIVO" LIMIT 2');
    if (groups.length > 0) {
      const targetGroup = groups[0];
      await db.query('UPDATE grupos SET profesor_principal_id = ? WHERE id = ?', [userId, targetGroup.id]);
      console.log(`  ✅ Assigned as main teacher for group ${targetGroup.id}`);

      // 4. Ensure Student Active Enrollment
      const [activeEnr] = await db.query('SELECT * FROM alumno_matricula_activa WHERE alumno_id = ?', [userId]);
      if (activeEnr.length === 0) {
        const matId = `mat_guillermina_${Date.now()}`;
        const studentGroup = groups.length > 1 ? groups[1] : targetGroup;
        await db.query(`
          INSERT INTO matriculas (id, alumno_id, grupo_id, estado, fecha_inicio)
          VALUES (?, ?, ?, 'ACTIVA', NOW())
        `, [matId, userId, studentGroup.id]);

        await db.query(`
          INSERT INTO alumno_matricula_activa (alumno_id, matricula_id)
          VALUES (?, ?)
        `, [userId, matId]);

        console.log(`  ✅ Created active enrollment in group ${studentGroup.id}`);
      } else {
        console.log(`  ℹ️ User already has active enrollment (${activeEnr[0].matricula_id})`);
      }
    }

    // 5. Test Password Verification
    const [userCheck] = await db.query('SELECT * FROM usuarios WHERE id = ?', [userId]);
    const isValid = await verifyPassword(rawPassword, userCheck[0].password_hash);
    console.log(`\n  🔐 Password Verification Test: ${isValid ? 'PASSED ✅' : 'FAILED ❌'}`);

    // 6. Output Summary
    const [userRoles] = await db.query(`
      SELECT r.codigo 
      FROM usuario_roles ur 
      JOIN roles r ON ur.rol_id = r.id 
      WHERE ur.usuario_id = ?
    `, [userId]);

    console.log('\n==================================================');
    console.log('ACCOUNT CONFIGURATION SUMMARY:');
    console.log(`  - User ID: ${userId}`);
    console.log(`  - Email: ${rawEmail}`);
    console.log(`  - Password: ${rawPassword}`);
    console.log(`  - Assigned Roles: ${userRoles.map(r => r.codigo).join(', ')}`);
    console.log(`  - Account Status: ACTIVO`);
    console.log(`  - Must Change Password: NO (0)`);
    console.log('==================================================\n');

  } catch (err) {
    console.error('Error setting up multi-role user:', err);
  } finally {
    process.exit(0);
  }
}

setupUserAllRoles();
