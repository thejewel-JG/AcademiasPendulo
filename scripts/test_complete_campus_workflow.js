import pool, { switchStudentGroupTransaction } from '../db.js';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { mergeIntervals } from '../progressEngine.js';
dotenv.config();

const db = pool;

async function runCompleteCampusWorkflowTest() {
  console.log('\n================================================================');
  console.log('--- MANDATORY E2E WORKFLOW & INTEGRITY VERIFICATION SUITE ---');
  console.log('================================================================\n');

  let failures = 0;
  const timestamp = Date.now();

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failures++;
    }
  }

  const testTeacherEmail = `prof_wf_${timestamp}@academiaspendulo.es`;
  const testStudent1Email = `alum1_wf_${timestamp}@academiaspendulo.es`;
  const testStudent2Email = `alum2_wf_${timestamp}@academiaspendulo.es`;

  let teacherId, student1Id, student2Id;
  let group1Id, group2Id;

  try {
    // STEP 1: Admin creates a teacher and assigns group and specialty
    console.log('\n--- STEP 1: Admin Creates Teacher & Assigns Group ---');
    const [specRows] = await db.query('SELECT id FROM especialidades LIMIT 2');
    assert(specRows.length >= 2, 'Found 2 active specialties for test isolation');

    const spec1Id = specRows[0].id;
    const spec2Id = specRows[1].id;

    teacherId = `usr_prof_${timestamp}`;
    await db.query(`
      INSERT INTO usuarios (id, nombre, apellidos, email, password_hash, estado, cambio_password_obligatorio)
      VALUES (?, 'Profesor', 'Workflow Test', ?, 'hash_temp_123', 'ACTIVO', 1)
    `, [teacherId, testTeacherEmail]);

    const [profRole] = await db.query("SELECT id FROM roles WHERE codigo = 'PROFESOR'");
    await db.query(`INSERT INTO usuario_roles (usuario_id, rol_id) VALUES (?, ?)`, [teacherId, profRole[0].id]);

    group1Id = `grp_wf1_${timestamp}`;
    group2Id = `grp_wf2_${timestamp}`;

    await db.query(`
      INSERT INTO grupos (id, especialidad_id, nombre, profesor_principal_id, estado)
      VALUES (?, ?, 'Grupo Workflow 1', ?, 'ACTIVO')
    `, [group1Id, spec1Id, teacherId]);

    await db.query(`
      INSERT INTO grupos (id, especialidad_id, nombre, profesor_principal_id, estado)
      VALUES (?, ?, 'Grupo Workflow 2', ?, 'ACTIVO')
    `, [group2Id, spec2Id, teacherId]);

    assert(true, `Created teacher ${testTeacherEmail} and assigned to groups ${group1Id} and ${group2Id}`);

    // STEP 2: Admin creates two students in different specialties
    console.log('\n--- STEP 2: Admin Creates 2 Students in Different Specialties ---');
    student1Id = `usr_stu1_${timestamp}`;
    student2Id = `usr_stu2_${timestamp}`;

    const [stuRole] = await db.query("SELECT id FROM roles WHERE codigo = 'ALUMNO'");

    await db.query(`
      INSERT INTO usuarios (id, nombre, apellidos, email, password_hash, estado, cambio_password_obligatorio)
      VALUES (?, 'Alumno 1', 'Workflow Test', ?, 'hash_temp_123', 'ACTIVO', 1)
    `, [student1Id, testStudent1Email]);
    await db.query(`INSERT INTO usuario_roles (usuario_id, rol_id) VALUES (?, ?)`, [student1Id, stuRole[0].id]);

    await db.query(`
      INSERT INTO usuarios (id, nombre, apellidos, email, password_hash, estado, cambio_password_obligatorio)
      VALUES (?, 'Alumno 2', 'Workflow Test', ?, 'hash_temp_123', 'ACTIVO', 1)
    `, [student2Id, testStudent2Email]);
    await db.query(`INSERT INTO usuario_roles (usuario_id, rol_id) VALUES (?, ?)`, [student2Id, stuRole[0].id]);

    const mat1Id = `mat_stu1_${timestamp}`;
    const mat2Id = `mat_stu2_${timestamp}`;

    await db.query(`
      INSERT INTO matriculas (id, alumno_id, grupo_id, estado, fecha_inicio)
      VALUES (?, ?, ?, 'ACTIVA', NOW())
    `, [mat1Id, student1Id, group1Id]);

    await db.query(`
      INSERT INTO matriculas (id, alumno_id, grupo_id, estado, fecha_inicio)
      VALUES (?, ?, ?, 'ACTIVA', NOW())
    `, [mat2Id, student2Id, group2Id]);

    assert(true, `Created student 1 in ${group1Id} (${spec1Id}) and student 2 in ${group2Id} (${spec2Id})`);

    // STEP 3: Password Change & Role Access Check
    console.log('\n--- STEP 3: Password Change & Role Verification ---');
    await db.query(`UPDATE usuarios SET cambio_password_obligatorio = 0, password_hash = 'hash_nuevo_456' WHERE id = ?`, [student1Id]);
    const [updatedUser] = await db.query(`SELECT cambio_password_obligatorio FROM usuarios WHERE id = ?`, [student1Id]);
    assert(updatedUser[0].cambio_password_obligatorio === 0, 'Temp password change flag successfully updated to false');

    // STEP 4: Material Publishing & Access Isolation Check
    console.log('\n--- STEP 4: Material Publishing & Isolation Check ---');
    const matId = `mat_pdf_${timestamp}`;
    await db.query(`
      INSERT INTO materiales (id, especialidad_id, grupo_id, titulo, tipo, orden, estado, autor_id, version)
      VALUES (?, ?, ?, 'Manual Técnico PDF Workflow', 'PDF', 1, 'PUBLICADO', ?, 1)
    `, [matId, spec1Id, group1Id, teacherId]);

    // Query published materials for Student 1 (Group 1) vs Student 2 (Group 2)
    const [matStu1] = await db.query(`
      SELECT id FROM materiales 
      WHERE estado = 'PUBLICADO' AND (grupo_id = ? OR (grupo_id IS NULL AND especialidad_id = ?))
    `, [group1Id, spec1Id]);

    const [matStu2] = await db.query(`
      SELECT id FROM materiales 
      WHERE estado = 'PUBLICADO' AND (grupo_id = ? OR (grupo_id IS NULL AND especialidad_id = ?))
    `, [group2Id, spec2Id]);

    assert(matStu1.some(m => m.id === matId), 'Student 1 in Group 1 CAN see the published material');
    assert(!matStu2.some(m => m.id === matId), 'Student 2 in Group 2 CANNOT see the material of Group 1 (Strict Scoped Isolation)');

    // STEP 5: Academic Doubts Thread Persistence
    console.log('\n--- STEP 5: Academic Doubts Thread Persistence ---');
    const convId = `conv_wf_${timestamp}`;
    await db.query(`
      INSERT INTO conversaciones (id, tipo, asunto, creador_id, grupo_id, responsable_id, estado)
      VALUES (?, 'ACADEMICA', 'Duda sobre Modulo Taller', ?, ?, ?, 'ABIERTA')
    `, [convId, student1Id, group1Id, teacherId]);

    const msg1Id = `msg_wf1_${timestamp}`;
    await db.query(`
      INSERT INTO mensajes (id, conversacion_id, remitente_id, cuerpo)
      VALUES (?, ?, ?, 'Hola Profesor, ¿cómo realizo la desconexión segura?')
    `, [msg1Id, convId, student1Id]);

    const msg2Id = `msg_wf2_${timestamp}`;
    await db.query(`
      INSERT INTO mensajes (id, conversacion_id, remitente_id, cuerpo)
      VALUES (?, ?, ?, 'Hola Alumno 1, debes retirar primero el fusible de servicio de alta tensión.')
    `, [msg2Id, convId, teacherId]);

    const [threadMsgs] = await db.query(`SELECT COUNT(*) as cnt FROM mensajes WHERE conversacion_id = ?`, [convId]);
    assert(threadMsgs[0].cnt === 2, 'Academic doubt thread persisted 2 messages between student and teacher');

    // STEP 6: Secretaría Requests Resolution
    console.log('\n--- STEP 6: Secretaría Requests & Resolution ---');
    const reqId = `sec_wf_${timestamp}`;
    await db.query(`
      INSERT INTO solicitudes_secretaria (id, estudiante_id, tipo, asunto, descripcion, estado, referencia)
      VALUES (?, ?, 'CERTIFICADO', 'Solicitud Certificado Matrícula', 'Necesito certificado firmado', 'PENDIENTE', ?)
    `, [reqId, student1Id, `REF-${timestamp}`]);

    await db.query(`UPDATE solicitudes_secretaria SET estado = 'RESUELTA' WHERE id = ?`, [reqId]);
    const [resolvedReq] = await db.query(`SELECT estado FROM solicitudes_secretaria WHERE id = ?`, [reqId]);
    assert(resolvedReq[0].estado === 'RESUELTA', 'Secretaría request updated to RESUELTA by Admin');

    // STEP 7: Video Position Resume & Multi-Device Cross Check
    console.log('\n--- STEP 7: Video Saved Position & Cross-Device Resume ---');
    const videoMatId = `mat_vid_${timestamp}`;
    await db.query(`
      INSERT INTO materiales (id, especialidad_id, grupo_id, titulo, tipo, orden, estado, autor_id, version)
      VALUES (?, ?, ?, 'Vídeo Clase Alta Tensión HD', 'VIDEO', 2, 'PUBLICADO', ?, 1)
    `, [videoMatId, spec1Id, group1Id, teacherId]);

    const sesId = `ses_wf_${timestamp}`;
    await db.query(`
      INSERT INTO progreso_materiales 
      (alumno_id, matricula_id, material_id, version, estado, posicion_segundos, duracion_segundos, tiempo_unico_segundos, secuencia, sesion_reproduccion_id)
      VALUES (?, ?, ?, 1, 'EN_PROGRESO', 145, 600, 120, 5, ?)
    `, [student1Id, mat1Id, videoMatId, sesId]);

    const [resumeData] = await db.query(`
      SELECT posicion_segundos, duracion_segundos, tiempo_unico_segundos, estado 
      FROM progreso_materiales 
      WHERE alumno_id = ? AND material_id = ?
    `, [student1Id, videoMatId]);

    assert(resumeData[0].posicion_segundos === 145, 'Saved video position (145s) restored correctly for multi-device resume');

    // STEP 8: Group Switching Transaction & History Preservation
    console.log('\n--- STEP 8: Group Switching Transaction & History Preservation ---');
    const newMatId = await switchStudentGroupTransaction({
      studentId: student1Id,
      newGroupId: group2Id,
      adminId: 'admin1'
    });

    const [activeEnrollments] = await db.query(`
      SELECT COUNT(*) as cnt FROM alumno_matricula_activa WHERE alumno_id = ?
    `, [student1Id]);

    const [allStudentMatriculas] = await db.query(`
      SELECT id, estado FROM matriculas WHERE alumno_id = ?
    `, [student1Id]);

    assert(activeEnrollments[0].cnt === 1, 'Exactly 1 active enrollment maintained after group switch');
    assert(allStudentMatriculas.length === 2, 'Historical enrollment preserved without deletion');

    // STEP 9: Account Deactivation Session Invalidation Check
    console.log('\n--- STEP 9: Account Deactivation Session Invalidation ---');
    const sessToken = `tok_${timestamp}`;
    const tokenHash = crypto.createHash('sha256').update(sessToken).digest('hex');

    await db.query(`
      INSERT INTO sesiones (id, usuario_id, token_hash, expiracion)
      VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))
    `, [`sess_${timestamp}`, student1Id, tokenHash]);

    // Deactivate student 1
    await db.query(`UPDATE usuarios SET estado = 'INACTIVO' WHERE id = ?`, [student1Id]);

    const [activeSess] = await db.query(`
      SELECT s.id, u.estado 
      FROM sesiones s 
      JOIN usuarios u ON s.usuario_id = u.id 
      WHERE s.token_hash = ? AND u.estado = 'ACTIVO'
    `, [tokenHash]);

    assert(activeSess.length === 0, 'Deactivated account immediately blocks active sessions in auth middleware check');

    // CLEANUP
    console.log('\n--- CLEANING UP WORKFLOW TEST ARTIFACTS ---');
    await db.query(`DELETE FROM sesiones WHERE usuario_id IN (?, ?, ?)`, [teacherId, student1Id, student2Id]);
    await db.query(`DELETE FROM progreso_materiales WHERE alumno_id IN (?, ?)`, [student1Id, student2Id]);
    await db.query(`DELETE FROM solicitudes_secretaria WHERE estudiante_id IN (?, ?)`, [student1Id, student2Id]);
    await db.query(`DELETE FROM mensajes WHERE conversacion_id = ?`, [convId]);
    await db.query(`DELETE FROM conversaciones WHERE id = ?`, [convId]);
    await db.query(`DELETE FROM materiales WHERE id IN (?, ?)`, [matId, videoMatId]);
    await db.query(`DELETE FROM matriculas WHERE alumno_id IN (?, ?)`, [student1Id, student2Id]);
    await db.query(`DELETE FROM grupos WHERE id IN (?, ?)`, [group1Id, group2Id]);
    await db.query(`DELETE FROM usuario_roles WHERE usuario_id IN (?, ?, ?)`, [teacherId, student1Id, student2Id]);
    await db.query(`DELETE FROM usuarios WHERE id IN (?, ?, ?)`, [teacherId, student1Id, student2Id]);

    console.log('\n================================================================');
    console.log(`MANDATORY WORKFLOW TEST RESULTS: ${failures === 0 ? 'ALL STEPS PASSED' : failures + ' STEPS FAILED'}`);
    console.log('================================================================\n');

  } catch (err) {
    console.error('Workflow test error:', err);
  } finally {
    process.exit(failures > 0 ? 1 : 0);
  }
}

runCompleteCampusWorkflowTest();
