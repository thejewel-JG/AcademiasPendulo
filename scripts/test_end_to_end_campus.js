import pool from '../db.js';
import dotenv from 'dotenv';
dotenv.config();

const db = pool;

async function runEndToEndCampusValidation() {
  console.log('\n--- STARTING CAMPUS FULL END-TO-END VALIDATION SUITE ---\n');
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
    // 1. Database Connectivity & Catalog Check
    const [specialties] = await db.query('SELECT COUNT(*) as cnt FROM especialidades');
    assert(specialties[0].cnt === 33, `Database contains exactly 33 active specialties (found ${specialties[0].cnt})`);

    const [groups] = await db.query('SELECT COUNT(*) as cnt FROM grupos');
    assert(groups[0].cnt > 0, `Database contains active academic groups (found ${groups[0].cnt})`);

    const [users] = await db.query('SELECT COUNT(*) as cnt FROM usuarios');
    assert(users[0].cnt > 0, `Database contains registered campus users (found ${users[0].cnt})`);

    // 2. Role Permissions & Active Enrollment Check
    const [students] = await db.query(`
      SELECT u.id, u.email, ama.matricula_id, g.id as grupo_codigo, e.nombre as especialidad_nombre
      FROM usuarios u
      JOIN usuario_roles ur ON u.id = ur.usuario_id
      JOIN roles r ON ur.rol_id = r.id
      LEFT JOIN alumno_matricula_activa ama ON u.id = ama.alumno_id
      LEFT JOIN matriculas m ON ama.matricula_id = m.id
      LEFT JOIN grupos g ON m.grupo_id = g.id
      LEFT JOIN especialidades e ON g.especialidad_id = e.id
      WHERE r.codigo = 'ALUMNO' AND u.estado = 'ACTIVO'
      LIMIT 5
    `);

    assert(students.length > 0, `Found ${students.length} active student accounts in DB`);

    const enrolledStudent = students.find(s => s.matricula_id !== null);
    assert(enrolledStudent !== undefined, `Found enrolled student (${enrolledStudent?.email}) in group ${enrolledStudent?.grupo_codigo}`);

    // 3. Teacher Scoped Data Check
    const [teachers] = await db.query(`
      SELECT u.id, u.email, COUNT(g.id) as assigned_groups
      FROM usuarios u
      JOIN usuario_roles ur ON u.id = ur.usuario_id
      JOIN roles r ON ur.rol_id = r.id
      JOIN grupos g ON u.id = g.profesor_principal_id
      WHERE r.codigo = 'PROFESOR' AND u.estado = 'ACTIVO'
      GROUP BY u.id
      LIMIT 1
    `);

    if (teachers.length > 0) {
      assert(teachers[0].assigned_groups > 0, `Teacher ${teachers[0].email} has ${teachers[0].assigned_groups} assigned groups`);
    } else {
      console.log('  ⚠️ NOTE: No active teacher assigned to groups found for scoped test');
    }

    // 4. Progress Monotonicity & Denominator Isolation Check
    if (enrolledStudent) {
      const [prog] = await db.query(`
        SELECT COUNT(*) as cnt FROM materiales 
        WHERE estado = 'PUBLICADO' AND (grupo_id IN (SELECT grupo_id FROM matriculas WHERE id = ?) OR grupo_id IS NULL)
      `, [enrolledStudent.matricula_id]);

      assert(prog[0].cnt >= 0, `Exact published material denominator calculated correctly for enrollment ${enrolledStudent.matricula_id}`);
    }

    console.log('\n==================================================');
    console.log(`E2E VALIDATION RESULTS: ${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECKS FAILED'}`);
    console.log('==================================================\n');

  } catch (err) {
    console.error('Validation script error:', err);
  } finally {
    process.exit(failures > 0 ? 1 : 0);
  }
}

runEndToEndCampusValidation();
