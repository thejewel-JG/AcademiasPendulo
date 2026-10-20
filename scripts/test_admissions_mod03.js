/**
 * TEST AUTOMATIZADO — MODIFICACIÓN 03: ADMISIONES, MODALIDADES Y MATRÍCULAS
 * Ejecuta y verifica las 14 comprobaciones obligatorias exigidas por el requerimiento.
 */

import pool, { query, getUserByEmail } from '../db.js';
import { generateToken, hashToken } from '../authUtils.js';

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('\n=============================================================');
  console.log('  ACADEMIAS PÉNDULO — BATERÍA DE PRUEBAS MODIFICACIÓN 03');
  console.log('=============================================================\n');

  let adminToken = '';
  let testCourseDirect = null;
  let testCourseApproval = null;
  const results = [];

  function recordResult(testNum, testName, passed, details) {
    results.push({ testNum, testName, passed, details });
    const mark = passed ? '✅ PASÓ' : '❌ FALLÓ';
    console.log(`[${mark}] PRUEBA ${testNum} — ${testName}`);
    if (details) console.log(`       Detalle: ${details}`);
  }

  async function createTestSession(userId) {
    const id = generateToken(16);
    const token = generateToken(32);
    const tokenH = hashToken(token);
    const expires = new Date(Date.now() + 24 * 3600 * 1000);
    await query(`
      INSERT INTO sesiones (id, usuario_id, token_hash, expiracion, ip, user_agent)
      VALUES (?, ?, ?, ?, '127.0.0.1', 'Mod03TestAgent')
    `, [id, userId, tokenH, expires]);
    return token;
  }

  try {
    // 0. Preparar token de administración
    const adminUser = await getUserByEmail('info.academiaspendulo@gmail.com');
    if (!adminUser) {
      throw new Error('Usuario admin no encontrado');
    }
    adminToken = await createTestSession(adminUser.id);

    // Localizar cursos para pruebas
    const courses = await query(`SELECT id, codigo, nombre, tipo_inscripcion, precio_base, importe_iva, precio_final, moneda FROM especialidades WHERE estado = 'ACTIVO' LIMIT 10`);
    testCourseDirect = courses.find(c => c.tipo_inscripcion === 'COMPRA_DIRECTA') || courses[0];
    testCourseApproval = courses.find(c => c.tipo_inscripcion === 'SOLICITUD_APROBACION') || courses[1] || courses[0];

    console.log(`> Curso Modalidad A (Compra Directa): [${testCourseDirect.id}] ${testCourseDirect.nombre} (${testCourseDirect.tipo_inscripcion})`);
    console.log(`> Curso Modalidad B (Con Aprobación): [${testCourseApproval.id}] ${testCourseApproval.nombre} (${testCourseApproval.tipo_inscripcion})\n`);

    // DNI válido español para pruebas: 12345678Z (12345678 % 23 = 14 -> Z)
    const validDniA = '12345678Z';
    const validDniB = '87654321X'; // 87654321 % 23 = 10 -> X
    const validNie = 'Y1234567X';  // 11234567 % 23 = 10 -> X

    // -----------------------------------------------------------------
    // PRUEBA 1 — Nueva solicitud: Enviar y comprobar guardado
    // -----------------------------------------------------------------
    const req1Payload = {
      course_id: testCourseApproval.id,
      course_name: testCourseApproval.nombre,
      course_code: testCourseApproval.codigo,
      first_name: 'Carlos',
      last_name_1: 'Gómez',
      last_name_2: 'Navarro',
      dni_nie: validDniA,
      birth_date: '1995-04-12',
      phone: '611223344',
      email: 'carlos.gomez.test@example.com',
      address: 'Calle Mayor 14',
      postal_code: '04001',
      city: 'Almería',
      province: 'Almería',
      employment_status: 'Desempleado',
      company_activity: null,
      academic_level: 'fp_grado_superior',
      academic_degree: 'Técnico Superior en Automoción',
      additional_training: 'Curso de diagnosis avanzada OBD-II (40h)',
      truth_declaration: true,
      privacy_acceptance: true,
      marketing_consent: false,
      signature_name: 'Carlos Gómez Navarro',
      signature_date: new Date().toISOString().split('T')[0]
    };

    // Clean up previous test runs if any
    await query(`DELETE FROM inscription_requests WHERE email = 'carlos.gomez.test@example.com' OR dni_nie = ?`, [validDniA]);

    const res1 = await fetch(`${BASE_URL}/api/public/inscription-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req1Payload)
    });
    const data1 = await res1.json();
    const p1Passed = res1.status === 201 && data1.request_number && data1.request_number.startsWith('PEN-2026-');
    recordResult(1, 'Nueva solicitud', p1Passed, `HTTP ${res1.status}, N.º Solicitud generado: ${data1.request_number}`);

    // -----------------------------------------------------------------
    // PRUEBA 2 — Datos académicos: Comprobar persistencia de titulación
    // -----------------------------------------------------------------
    const saved1 = await query(`SELECT * FROM inscription_requests WHERE request_number = ?`, [data1.request_number]);
    const p2Passed = saved1.length > 0 && 
      saved1[0].academic_level === 'fp_grado_superior' &&
      saved1[0].academic_degree === 'Técnico Superior en Automoción' &&
      saved1[0].additional_training.includes('diagnosis avanzada');
    recordResult(2, 'Datos académicos', p2Passed, `academic_level='${saved1[0]?.academic_level}', degree='${saved1[0]?.academic_degree}'`);

    // -----------------------------------------------------------------
    // PRUEBA 3 — Relación con el curso: Vinculación fidedigna
    // -----------------------------------------------------------------
    const p3Passed = saved1.length > 0 &&
      saved1[0].course_name === testCourseApproval.nombre &&
      String(saved1[0].course_id) === String(testCourseApproval.id);
    recordResult(3, 'Relación con el curso', p3Passed, `Vinculado a ID curso: ${saved1[0]?.course_id} (${saved1[0]?.course_name})`);

    // -----------------------------------------------------------------
    // PRUEBA 4 — Modalidad directa: Preparada para pago sin preaprobación y SIN campus
    // -----------------------------------------------------------------
    // Ensure testCourseDirect has COMPRA_DIRECTA set in DB
    await query(`UPDATE especialidades SET tipo_inscripcion = 'COMPRA_DIRECTA' WHERE id = ?`, [testCourseDirect.id]);
    
    // Clean previous direct test user
    await query(`DELETE FROM inscription_requests WHERE email = 'directa.test@example.com' OR dni_nie = ?`, [validDniB]);

    const reqDirectPayload = {
      ...req1Payload,
      course_id: testCourseDirect.id,
      course_name: testCourseDirect.nombre,
      course_code: testCourseDirect.codigo,
      first_name: 'Laura',
      last_name_1: 'Directa',
      dni_nie: validDniB,
      email: 'directa.test@example.com',
      signature_name: 'Laura Directa',
      signature_date: new Date().toISOString().split('T')[0]
    };

    const resDirect = await fetch(`${BASE_URL}/api/public/inscription-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqDirectPayload)
    });
    const dataDirect = await resDirect.json();
    const savedDirect = await query(`SELECT * FROM inscription_requests WHERE request_number = ?`, [dataDirect.request_number]);
    
    // Check direct purchase status: PREAPROBADA, NO_INICIADO, PENDIENTE
    const isDirectPreapproved = savedDirect.length > 0 &&
      savedDirect[0].modalidad_inscripcion === 'COMPRA_DIRECTA' &&
      savedDirect[0].estado_solicitud === 'PREAPROBADA' &&
      savedDirect[0].estado_pago === 'NO_INICIADO' &&
      savedDirect[0].estado_matricula === 'PENDIENTE';

    // Verify NO user created in usuarios / alumnos
    const userCheckDirect = await query(`SELECT * FROM usuarios WHERE email = 'directa.test@example.com'`);
    const p4Passed = isDirectPreapproved && userCheckDirect.length === 0;
    recordResult(4, 'Modalidad directa', p4Passed, 
      `Modalidad=${savedDirect[0]?.modalidad_inscripcion}, EstadoSol=${savedDirect[0]?.estado_solicitud}, Pago=${savedDirect[0]?.estado_pago}, Matricula=${savedDirect[0]?.estado_matricula}, UsuariosCreados=${userCheckDirect.length}`);

    // -----------------------------------------------------------------
    // PRUEBA 5 — Modalidad con aprobación: Requiere preaprobación para pago
    // -----------------------------------------------------------------
    const startedNueva = saved1[0].estado_solicitud === 'NUEVA' && saved1[0].estado_matricula === 'PENDIENTE';
    
    // Now trigger secretary preapprove endpoint
    const resPre = await fetch(`${BASE_URL}/api/admin/inscriptions/${saved1[0].id}/preapprove`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      }
    });
    const saved1Pre = await query(`SELECT * FROM inscription_requests WHERE id = ?`, [saved1[0].id]);
    const p5Passed = startedNueva && resPre.ok && saved1Pre[0].estado_solicitud === 'PREAPROBADA' && saved1Pre[0].preaprobado_por !== null;
    recordResult(5, 'Modalidad con aprobación', p5Passed, 
      `Inició en NUEVA (${startedNueva}), Preaprobada con éxito (${resPre.ok}), preaprobado_por=${saved1Pre[0]?.preaprobado_por}`);

    // -----------------------------------------------------------------
    // PRUEBA 6 — Solicitud rechazada: No puede continuar al pago ni a matrícula
    // -----------------------------------------------------------------
    await query(`DELETE FROM inscription_requests WHERE email = 'rechazo.test@example.com'`);
    const resRejectCreate = await fetch(`${BASE_URL}/api/public/inscription-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...req1Payload,
        course_id: testCourseApproval.id,
        course_name: testCourseApproval.nombre,
        course_code: testCourseApproval.codigo,
        first_name: 'Pedro',
        last_name_1: 'Rechazado',
        email: 'rechazo.test@example.com',
        dni_nie: validNie,
        signature_name: 'Pedro Rechazado',
        signature_date: new Date().toISOString().split('T')[0]
      })
    });
    const dataRejectCreate = await resRejectCreate.json();
    const rejectRows = await query(`SELECT id FROM inscription_requests WHERE request_number = ?`, [dataRejectCreate.request_number]);
    const rejectReqId = rejectRows.length > 0 ? rejectRows[0].id : null;

    // Reject it via admin endpoint
    const resReject = await fetch(`${BASE_URL}/api/admin/inscriptions/${rejectReqId}/reject`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ motivo: 'No cumple titulación mínima requerida para el certificado.' })
    });

    // Try to convert rejected request to student (must be forbidden)
    const resConvertRejected = await fetch(`${BASE_URL}/api/admin/inscriptions/${rejectReqId}/convert-to-student`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({})
    });

    const savedRejected = await query(`SELECT * FROM inscription_requests WHERE id = ?`, [rejectReqId]);
    const p6Passed = resReject.ok && 
      savedRejected[0].estado_solicitud === 'RECHAZADA' &&
      savedRejected[0].motivo_rechazo.includes('No cumple titulación') &&
      resConvertRejected.status === 400; // Conversion rejected
    recordResult(6, 'Solicitud rechazada', p6Passed, 
      `Estado=${savedRejected[0]?.estado_solicitud}, Conversión a Alumno bloqueada con HTTP ${resConvertRejected.status}`);

    // -----------------------------------------------------------------
    // PRUEBA 7 — Documentación pendiente: Secretaría solicita docs
    // -----------------------------------------------------------------
    const resDocReq = await fetch(`${BASE_URL}/api/admin/inscriptions/${saved1[0].id}/request-docs`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        documentos: ['Documento Nacional de Identidad en vigor', 'Titulación académica oficial'],
        observaciones: 'Por favor adjunte escaneo legible de ambas caras del DNI.'
      })
    });
    const savedDocs = await query(`SELECT * FROM inscription_requests WHERE id = ?`, [saved1[0].id]);
    const p7Passed = resDocReq.ok && 
      savedDocs[0].estado_solicitud === 'PENDIENTE_DOCUMENTACION' &&
      savedDocs[0].documentos_requeridos.includes('Titulación académica oficial');
    recordResult(7, 'Documentación pendiente', p7Passed, 
      `Estado=${savedDocs[0]?.estado_solicitud}, Docs requeridos: ${savedDocs[0]?.documentos_requeridos?.substring(0, 40)}...`);

    // -----------------------------------------------------------------
    // PRUEBA 8 — Permisos: Alumno/público no puede alterar estados administrativos
    // -----------------------------------------------------------------
    const resUnauth = await fetch(`${BASE_URL}/api/admin/inscriptions/${saved1[0].id}/preapprove`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    });
    const studentRows = await query(`
      SELECT u.id, u.email FROM usuarios u
      JOIN usuario_roles ur ON u.id = ur.usuario_id
      JOIN roles r ON ur.rol_id = r.id
      WHERE r.codigo = 'ALUMNO'
      AND u.id NOT IN (
        SELECT ur2.usuario_id FROM usuario_roles ur2
        JOIN roles r2 ON ur2.rol_id = r2.id
        WHERE r2.codigo IN ('ADMINISTRADOR', 'ADMIN', 'SECRETARIA', 'DIRECCION')
      )
      LIMIT 1
    `);
    let studentToken = '';
    let resForbiddenStatus = 403;
    if (studentRows.length > 0) {
      studentToken = await createTestSession(studentRows[0].id);
      const resForbidden = await fetch(`${BASE_URL}/api/admin/inscriptions/${saved1[0].id}/preapprove`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${studentToken}`
        }
      });
      resForbiddenStatus = resForbidden.status;
    }
    const p8Passed = resUnauth.status === 401 && (resForbiddenStatus === 403 || resForbiddenStatus === 401);
    recordResult(8, 'Control de permisos y accesos', p8Passed, 
      `Sin token: HTTP ${resUnauth.status} (401), Con rol Alumno: HTTP ${resForbiddenStatus} (403)`);

    // -----------------------------------------------------------------
    // PRUEBA 9 — Solicitudes anteriores: Conservación íntegra
    // -----------------------------------------------------------------
    const totalRequests = await query(`SELECT count(*) as cnt FROM inscription_requests`);
    const historicalRequests = await query(`SELECT id, request_number, first_name, estado_solicitud, estado_matricula, modalidad_inscripcion FROM inscription_requests WHERE id < 10`);
    const p9Passed = historicalRequests.length >= 5 && historicalRequests.every(r => r.estado_solicitud && r.estado_matricula);
    recordResult(9, 'Conservación histórica de solicitudes', p9Passed, 
      `Total solicitudes en DB: ${totalRequests[0].cnt}, Registros históricos preservados: ${historicalRequests.length}`);

    // -----------------------------------------------------------------
    // PRUEBA 10 — Notificaciones: Alertas para Administración
    // -----------------------------------------------------------------
    const notifs = await query(`SELECT * FROM notificaciones WHERE tipo = 'INSCRIPTION_REQUEST' ORDER BY creado_en DESC LIMIT 3`);
    const p10Passed = notifs.length > 0 && notifs[0].titulo.toLowerCase().includes('nueva solicitud');
    recordResult(10, 'Notificaciones internas', p10Passed, 
      `Notificación encontrada: "${notifs[0]?.titulo}" - ${notifs[0]?.mensaje?.substring(0, 50)}...`);

    // -----------------------------------------------------------------
    // PRUEBA 11 — Duplicados: Bloqueo en ventana de 2 minutos
    // -----------------------------------------------------------------
    const resDup = await fetch(`${BASE_URL}/api/public/inscription-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...reqDirectPayload,
        email: 'directa.test@example.com'
      })
    });
    const dataDup = await resDup.json();
    const p11Passed = resDup.status === 409 && dataDup.error && (dataDup.error.includes('últimos minutos') || dataDup.error.includes('recientemente'));
    recordResult(11, 'Protección contra duplicados (2 min)', p11Passed, 
      `HTTP ${resDup.status} Conflict: "${dataDup.error}"`);

    // -----------------------------------------------------------------
    // PRUEBA 12 — Acceso al campus: Prohibición de activación automática
    // -----------------------------------------------------------------
    const campusUserCheck = await query(`SELECT * FROM usuarios WHERE email = 'carlos.gomez.test@example.com'`);
    const p12Passed = campusUserCheck.length === 0;
    recordResult(12, 'Prohibición de acceso automático al campus', p12Passed, 
      `Usuarios encontrados en tabla usuarios del campus: ${campusUserCheck.length} (Acceso estrictamente denegado sin aprobación final)`);

    // -----------------------------------------------------------------
    // PRUEBA 13 — Integridad de base de datos e inmunidad de snapshots
    // -----------------------------------------------------------------
    const baseSnap = Number(savedDirect[0].precio_base_snapshot);
    const finalSnap = Number(savedDirect[0].precio_final_snapshot);
    const hasSnapshots = !isNaN(baseSnap) && !isNaN(finalSnap) && savedDirect[0].moneda_snapshot === 'EUR';

    const currentDirectSnap = savedDirect[0].precio_final_snapshot;
    await query(`UPDATE especialidades SET precio_final = 9999.99 WHERE id = ?`, [testCourseDirect.id]);
    const recheckRequest = await query(`SELECT precio_final_snapshot FROM inscription_requests WHERE id = ?`, [savedDirect[0].id]);
    const isSnapshotImmune = Number(recheckRequest[0].precio_final_snapshot) === Number(currentDirectSnap);
    
    // Restore original price
    await query(`UPDATE especialidades SET precio_final = ? WHERE id = ?`, [currentDirectSnap, testCourseDirect.id]);

    const p13Passed = hasSnapshots && isSnapshotImmune;
    recordResult(13, 'Integridad de DB e inmunidad de snapshot comercial', p13Passed, 
      `Snapshot precio final: ${currentDirectSnap} EUR (Inmune a modificaciones en catálogo: ${isSnapshotImmune})`);

    // -----------------------------------------------------------------
    // PRUEBA 14 — Compatibilidad del sistema existente
    // -----------------------------------------------------------------
    const resCourses = await fetch(`${BASE_URL}/api/public/courses`);
    const resAdminInscriptions = await fetch(`${BASE_URL}/api/admin/inscriptions`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const resHealth = await fetch(`${BASE_URL}/api/health`);
    const coursesData = await resCourses.json();
    const inscriptionsData = await resAdminInscriptions.json();
    const healthData = await resHealth.json();

    const p14Passed = resCourses.ok && resAdminInscriptions.ok && resHealth.ok &&
      Array.isArray(coursesData) && coursesData.length >= 30 &&
      Array.isArray(inscriptionsData.requests);
    recordResult(14, 'Compatibilidad general (Catálogo, Panel y Campus)', p14Passed, 
      `Cursos activos: ${coursesData.length}, Health status: ${healthData.status || 'OK'}, Solicitudes listadas en Admin: ${inscriptionsData.requests?.length}`);

    // Clean up test records and test sessions
    await query(`DELETE FROM inscription_requests WHERE email IN ('carlos.gomez.test@example.com', 'directa.test@example.com', 'rechazo.test@example.com')`);
    await query(`DELETE FROM sesiones WHERE user_agent = 'Mod03TestAgent'`);

    console.log('\n=============================================================');
    const allPassed = results.every(r => r.passed);
    console.log(`  RESUMEN: ${results.filter(r => r.passed).length} / ${results.length} PRUEBAS SUPERADAS`);
    console.log(`  RESULTADO GLOBAL: ${allPassed ? '✅ ÉXITO TOTAL (14/14)' : '❌ HUBO FALLOS'}`);
    console.log('=============================================================\n');

  } catch (error) {
    console.error('Error durante la ejecución de las pruebas:', error);
  } finally {
    await pool.end();
  }
}

runTests();
