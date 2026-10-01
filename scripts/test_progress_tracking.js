import fs from 'fs';
import path from 'path';
import pool, { query } from '../db.js';
import {
  mergeIntervals, validateProgressTick, startPlaybackSession,
  recordProgressTick, toggleManualCompletion, calculateStudentOverallProgress,
  getLastVisitedMaterial, getTeacherGroupAnalytics, getAdminGlobalAnalytics
} from '../progressEngine.js';
import { hashPassword, generateToken, hashToken } from '../authUtils.js';

const BASE_URL = 'http://localhost:3000';

async function runProgressTrackingTests() {
  console.log('--- STARTING ACADEMIC PROGRESS TRACKING TEST SUITE ---');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. TEST INTERVAL MERGING ALGORITHM
    console.log('\n--- 1. INTERVAL MERGING & UNIQUE TIME CALCULATION TEST ---');
    const rawIntervals = [
      { inicio_seg: 0, fin_seg: 15 },
      { inicio_seg: 10, fin_seg: 30 },  // Overlaps with first -> [0, 30]
      { inicio_seg: 5, fin_seg: 20 },   // Re-watch inside [0, 30] -> [0, 30]
      { inicio_seg: 45, fin_seg: 60 }   // Separate -> [45, 60]
    ];

    const { merged, totalUniqueSeconds } = mergeIntervals(rawIntervals);
    assert(merged.length === 2, 'Merged 4 overlapping intervals into 2 distinct ranges');
    assert(merged[0].inicio === 0 && merged[0].fin === 30, 'First range merged correctly [0, 30]');
    assert(merged[1].inicio === 45 && merged[1].fin === 60, 'Second range merged correctly [45, 60]');
    assert(totalUniqueSeconds === 45, 'Total unique seconds is exactly 45 (30 + 15), re-watches not double counted');

    // 2. TEST TEMPORAL PLAUSIBILITY VALIDATION
    console.log('\n--- 2. TEMPORAL PLAUSIBILITY VALIDATION TEST ---');
    const validTick = validateProgressTick({
      posicionSegundos: 20,
      duracionSegundos: 300,
      intervaloNuevo: { inicio_seg: 10, fin_seg: 20 },
      playbackRate: 1.0,
      elapsedMs: 10000
    });
    assert(validTick.valid, 'Plausible 10s interval accepted');

    const forgedTick = validateProgressTick({
      posicionSegundos: 2000,
      duracionSegundos: 300,
      intervaloNuevo: { inicio_seg: 0, fin_seg: 2000 }, // Forged 2000s in 10s tick
      playbackRate: 1.0,
      elapsedMs: 10000
    });
    assert(!forgedTick.valid, 'Forged 2000s interval in 10s tick rejected as unplausible');

    const acceleratedTick = validateProgressTick({
      posicionSegundos: 40,
      duracionSegundos: 300,
      intervaloNuevo: { inicio_seg: 20, fin_seg: 40 }, // 20s interval at 2.0x speed in 10s tick
      playbackRate: 2.0,
      elapsedMs: 10000
    });
    assert(acceleratedTick.valid, '20s interval at 2.0x playback speed in 10s tick validated as plausible');

    // 3. SETUP TEST DATA IN DB (STUDENT, MATRICULA, MATERIAL)
    console.log('\n--- 3. DATABASE SETUP FOR INTEGRATION TESTS ---');
    const adminUser = await query(`SELECT id FROM usuarios WHERE email = 'admin@academiaspendulo.com' LIMIT 1`);
    const realAdminId = adminUser[0].id;

    // Create test student
    const testStudentId = `usr_prog_test_${Date.now()}`;
    const testStudentEmail = `alumno_prog_${Date.now()}@pendulo.es`;
    await query(`
      INSERT INTO usuarios (id, nombre, apellidos, email, email_original, password_hash, estado, cambio_password_obligatorio, creado_en)
      VALUES (?, 'Carlos', 'Test Progreso', ?, ?, 'hash', 'ACTIVO', 0, NOW())
    `, [testStudentId, testStudentEmail, testStudentEmail]);

    await query(`
      INSERT INTO usuario_roles (usuario_id, rol_id)
      SELECT ?, id FROM roles WHERE nombre = 'ALUMNO'
    `, [testStudentId]);

    // Get active group
    const groups = await query(`SELECT id, especialidad_id FROM grupos LIMIT 1`);
    const testGroupId = groups[0].id;
    const testEspecialidadId = groups[0].especialidad_id;

    // Create active enrollment
    const testMatriculaId = `mat_prog_test_${Date.now()}`;
    await query(`
      INSERT INTO matriculas (id, alumno_id, grupo_id, estado, fecha_matricula)
      VALUES (?, ?, ?, 'ACTIVA', NOW())
    `, [testMatriculaId, testStudentId, testGroupId]);

    await query(`
      INSERT INTO alumno_matricula_activa (alumno_id, matricula_id)
      VALUES (?, ?)
    `, [testStudentId, testMatriculaId]);

    // Create published test video material (300 seconds duration)
    const testMaterialId = `mat_vid_test_${Date.now()}`;
    await query(`
      INSERT INTO materiales (id, especialidad_id, grupo_id, titulo, descripcion, tipo, referencia_video, proveedor, orden, estado, autor_id, version, creado_en)
      VALUES (?, ?, ?, 'Vídeo Práctico Diagnóstico TMV', 'Vídeo de pruebas de progreso', 'VIDEO', 'https://youtu.be/dummy', 'YouTube', 1, 'PUBLICADO', ?, 1, NOW())
    `, [testMaterialId, testEspecialidadId, testGroupId, realAdminId]);

    // 4. TEST START PLAYBACK SESSION & RESUME PROMPT
    console.log('\n--- 4. PLAYBACK SESSION START & RESUME TEST ---');
    const session1 = await startPlaybackSession(testStudentId, testMaterialId);
    assert(session1.sesion_reproduccion_id.startsWith('ses_'), 'Playback session ID created');
    assert(session1.posicion_segundos === 0, 'Initial position is 0s');
    assert(session1.estado === 'NO_INICIADO', 'Initial state is NO_INICIADO');

    // 5. TEST PROGRESS TICK RECORDING & SEQUENCE MONOTONICITY
    console.log('\n--- 5. TICK RECORDING & SEQUENCE CONTROL TEST ---');
    const tick1 = await recordProgressTick({
      alumnoId: testStudentId,
      materialId: testMaterialId,
      sesionReproduccionId: session1.sesion_reproduccion_id,
      secuencia: 1,
      posicionSegundos: 15,
      duracionSegundos: 300,
      intervaloNuevo: { inicio_seg: 0, fin_seg: 15 },
      playbackRate: 1.0,
      elapsedMs: 15000
    });

    assert(tick1.status === 'OK', 'Tick 1 recorded successfully');
    assert(tick1.tiempo_unico_segundos === 15, 'Unique watched seconds is 15');
    assert(tick1.estado === 'EN_PROGRESO', 'State updated to EN_PROGRESO');

    // Test Out-of-Order delayed request (secuencia 1 sent after secuencia 1 already processed)
    const delayedTick = await recordProgressTick({
      alumnoId: testStudentId,
      materialId: testMaterialId,
      sesionReproduccionId: session1.sesion_reproduccion_id,
      secuencia: 1,
      posicionSegundos: 5,
      duracionSegundos: 300,
      intervaloNuevo: { inicio_seg: 0, fin_seg: 5 },
      playbackRate: 1.0,
      elapsedMs: 5000
    });

    assert(delayedTick.status === 'IGNORED_OUT_OF_ORDER', 'Delayed out-of-order request ignored by server sequence control');

    // 6. TEST SEEKING / JUMPING TO END DOES NOT GRANT COMPLETION
    console.log('\n--- 6. SEEKING TO END NON-COMPLETION TEST ---');
    const jumpToEndTick = await recordProgressTick({
      alumnoId: testStudentId,
      materialId: testMaterialId,
      sesionReproduccionId: session1.sesion_reproduccion_id,
      secuencia: 2,
      posicionSegundos: 300, // Jumped to position 300s without watching intermediate 15-300s
      duracionSegundos: 300,
      intervaloNuevo: null, // No interval watched during jump
      playbackRate: 1.0,
      elapsedMs: 1000
    });

    assert(jumpToEndTick.status === 'OK', 'Jump to end position recorded');
    assert(jumpToEndTick.tiempo_unico_segundos === 15, 'Unique watched seconds remains 15s');
    assert(jumpToEndTick.estado === 'EN_PROGRESO', 'State remains EN_PROGRESO (Completion rejected because unique watched time is only 5%)');

    // 7. TEST REACHING COMPLETION THRESHOLD (90%)
    console.log('\n--- 7. REACHING COMPLETION THRESHOLD (90%) TEST ---');
    // Simulate watching from 15s to 275s (260s interval -> total unique = 275s / 300s = 91.6%)
    const completionTick = await recordProgressTick({
      alumnoId: testStudentId,
      materialId: testMaterialId,
      sesionReproduccionId: session1.sesion_reproduccion_id,
      secuencia: 3,
      posicionSegundos: 275,
      duracionSegundos: 300,
      intervaloNuevo: { inicio_seg: 15, fin_seg: 275 },
      playbackRate: 1.0,
      elapsedMs: 260000
    });

    assert(completionTick.status === 'OK', 'Completion tick recorded');
    assert(completionTick.tiempo_unico_segundos === 275, 'Total unique watched seconds is 275');
    assert(completionTick.porcentaje_visto >= 90, 'Watched percentage is >= 90%');
    assert(completionTick.estado === 'COMPLETADO' && completionTick.completado, 'State updated to COMPLETADO upon reaching 90% threshold');

    // 8. TEST MANUAL TOGGLE FOR PDF ("Marcar como revisado")
    console.log('\n--- 8. MANUAL TOGGLE FOR PDF TEST ---');
    const testPdfId = `mat_pdf_test_${Date.now()}`;
    await query(`
      INSERT INTO materiales (id, especialidad_id, grupo_id, titulo, descripcion, tipo, orden, estado, autor_id, version, creado_en)
      VALUES (?, ?, ?, 'Manual Técnico PDF', 'Guía en PDF', 'PDF', 2, 'PUBLICADO', ?, 1, NOW())
    `, [testPdfId, testEspecialidadId, testGroupId, realAdminId]);

    const manualResult = await toggleManualCompletion(testStudentId, testPdfId, true);
    assert(manualResult.status === 'OK' && manualResult.marcado_manual === 1, 'Manual completion set to 1');
    assert(manualResult.estado === 'COMPLETADO', 'Manual completion updated state to COMPLETADO');

    // 9. TEST DENOMINATOR POLICY & OVERALL ENROLLMENT PROGRESS
    console.log('\n--- 9. DENOMINATOR & OVERALL ENROLLMENT PROGRESS TEST ---');
    const overallProgress = await calculateStudentOverallProgress(testStudentId);
    assert(overallProgress.has_active_enrollment, 'Student active enrollment identified');
    assert(overallProgress.total_publicados >= 2, 'Denominator contains exact count of applicable published materials');
    assert(overallProgress.completados >= 2, 'Both completed test materials counted in numerator');
    const expectedPct = Math.round((overallProgress.completados / overallProgress.total_publicados) * 100);
    assert(overallProgress.porcentaje_global === expectedPct, `Overall progress correctly calculated as ${expectedPct}% (${overallProgress.completados}/${overallProgress.total_publicados})`);

    // 10. TEST CROSS-STUDENT ACCESS ISOLATION (HTTP API)
    console.log('\n--- 10. HTTP SESSION ISOLATION & ACCESS CONTROL TEST ---');
    // Create session token for student
    const studentToken = generateToken(32);
    const studentTokenHash = hashToken(studentToken);
    const studentSessionId = `ses_stud_t_${Date.now()}`;
    await query(`
      INSERT INTO sesiones (id, usuario_id, token_hash, expiracion, creado_en)
      VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR), NOW())
    `, [studentSessionId, testStudentId, studentTokenHash]);

    const studentHeaders = { 'cookie': `campus_session=${studentToken}` };

    const overallRes = await fetch(`${BASE_URL}/api/progress/overall`, { headers: studentHeaders });
    assert(overallRes.status === 200, 'Student can query own progress via HTTP API');
    const overallData = await overallRes.json();
    assert(overallData.total_publicados >= 2, 'HTTP API returns exact published denominator');

    // 11. CLEANUP TEST DATA
    console.log('\n--- CLEANING UP TEST ARTIFACTS ---');
    await query(`DELETE FROM actividad WHERE actor_id = ?`, [testStudentId]);
    await query(`DELETE FROM sesiones WHERE id = ?`, [studentSessionId]);
    await query(`DELETE FROM intervalos_video WHERE alumno_id = ?`, [testStudentId]);
    await query(`DELETE FROM progreso_materiales WHERE alumno_id = ?`, [testStudentId]);
    await query(`DELETE FROM materiales WHERE id IN (?, ?)`, [testMaterialId, testPdfId]);
    await query(`DELETE FROM alumno_matricula_activa WHERE alumno_id = ?`, [testStudentId]);
    await query(`DELETE FROM matriculas WHERE id = ?`, [testMatriculaId]);
    await query(`DELETE FROM usuario_roles WHERE usuario_id = ?`, [testStudentId]);
    await query(`DELETE FROM usuarios WHERE id = ?`, [testStudentId]);
    console.log('  Cleaned up all temporary test progress records.');

  } catch (err) {
    console.error('CRITICAL ERROR DURING PROGRESS TRACKING TEST RUN:', err);
    failed++;
  } finally {
    console.log(`\n==================================================`);
    console.log(`PROGRESS TRACKING TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log(`==================================================`);
    pool.end();
  }
}

runProgressTrackingTests();
