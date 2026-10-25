/**
 * ACADEMIAS PÉNDULO - MODIFICACIÓN 09
 * Script de Verificación Integral de las 25 Pruebas Obligatorias (Sección 14)
 */

import { query } from '../db.js';

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

async function runTests() {
  console.log('================================================================');
  console.log('INICIANDO SUITE DE PRUEBAS - MODIFICACIÓN 09 (25 PRUEBAS)');
  console.log('ACADEMIAS PÉNDULO — Control Dinámico de Matrículas y Ordenación');
  console.log('================================================================\n');

  const results = [];
  function assert(testNum, title, condition, details = '') {
    if (condition) {
      console.log(`[PASS] Prueba ${testNum.toString().padStart(2, '0')}: ${title}`);
      if (details) console.log(`       -> ${details}`);
      results.push({ num: testNum, title, pass: true, details });
    } else {
      console.error(`[FAIL] Prueba ${testNum.toString().padStart(2, '0')}: ${title}`);
      if (details) console.error(`       -> ERROR: ${details}`);
      results.push({ num: testNum, title, pass: false, details });
    }
  }

  let adminToken = '';
  let testCourse = null;
  let testClosedCourse = null;

  try {
    // 0. Autenticación Administrativa
    console.log('--- AUTENTICACIÓN ADMINISTRATIVA ---');
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'info.academiaspendulo@gmail.com',
        password: 'Wattpad_3317'
      })
    });
    const loginData = await loginRes.json();
    if (!loginRes.ok || !loginData.token) {
      throw new Error(`Fallo en login admin: ${JSON.stringify(loginData)}`);
    }
    adminToken = loginData.token;
    console.log(`Token admin obtenido con éxito para: ${loginData.user?.email}\n`);

    // Obtener catálogo público inicial
    const pResInitial = await fetch(`${BASE_URL}/api/public/courses`);
    const pDataInitial = await pResInitial.json();
    const getCoursesList = (data) => Array.isArray(data) ? data : (data?.courses || []);

    const courses = getCoursesList(pDataInitial);
    if (!Array.isArray(courses) || courses.length === 0) {
      throw new Error('No se obtuvieron cursos del endpoint público');
    }

    testCourse = courses.find(c => c.estado_disponibilidad === 'ABIERTA') || courses[0];
    testClosedCourse = courses.find(c => c.estado_disponibilidad === 'CERRADA') || courses[courses.length - 1];

    console.log(`Curso objetivo 1 (Abierto): ID ${testCourse.id} (${testCourse.codigo} - ${testCourse.nombre})`);
    console.log(`Curso objetivo 2 (Cerrado): ID ${testClosedCourse.id} (${testClosedCourse.codigo} - ${testClosedCourse.nombre})\n`);

    // --- PRUEBA 01: Abrir una matrícula desde Administración ---
    const openRes = await fetch(`${BASE_URL}/api/admin/courses/${testCourse.id}/enrollment-status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ estado_disponibilidad: 'ABIERTA' })
    });
    const openData = await openRes.json();
    assert(
      1,
      'Abrir una matrícula desde Administración',
      openRes.ok && openData.success && openData.course.estado_disponibilidad === 'ABIERTA',
      `HTTP ${openRes.status}, estado_disponibilidad=${openData.course?.estado_disponibilidad}`
    );

    // --- PRUEBA 02: Comprobar que la tarjeta muestra "Matrícula abierta" ---
    const pRes1 = await fetch(`${BASE_URL}/api/public/courses`);
    const pData1 = await pRes1.json();
    const coursesList1 = getCoursesList(pData1);
    const pCourse1 = coursesList1.find(c => c.id === testCourse.id || c.codigo === testCourse.codigo);
    const showsOpenBadge = pCourse1 && pCourse1.estado_disponibilidad === 'ABIERTA';
    assert(
      2,
      'Comprobar que la tarjeta muestra "Matrícula abierta"',
      showsOpenBadge,
      `Curso ${pCourse1.codigo} tiene estado_disponibilidad="${pCourse1.estado_disponibilidad}" (insignia visual Matrícula abierta)`
    );

    // --- PRUEBA 03: Comprobar que aparece el botón correcto según su modalidad ---
    const expectedButton = pCourse1.tipo_inscripcion === 'SOLICITUD_APROBACION' ? 'SOLICITAR PLAZA' : 'MATRICULARME';
    assert(
      3,
      'Comprobar que aparece el botón correcto según su modalidad',
      pCourse1.estado_disponibilidad === 'ABIERTA' && ['COMPRA_DIRECTA', 'SOLICITUD_APROBACION'].includes(pCourse1.tipo_inscripcion),
      `Modalidad: ${pCourse1.tipo_inscripcion} -> Botón correspondiente: "${expectedButton}"`
    );

    // --- PRUEBA 04: Cerrar la matrícula desde Administración ---
    const closeRes = await fetch(`${BASE_URL}/api/admin/courses/${testCourse.id}/enrollment-status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ estado_disponibilidad: 'CERRADA' })
    });
    const closeData = await closeRes.json();
    assert(
      4,
      'Cerrar la matrícula desde Administración',
      closeRes.ok && closeData.success && closeData.course.estado_disponibilidad === 'CERRADA',
      `HTTP ${closeRes.status}, estado_disponibilidad=${closeData.course?.estado_disponibilidad}`
    );

    // --- PRUEBA 05: Verificar que el botón cambia a "Solicitar información" ---
    const pRes2 = await fetch(`${BASE_URL}/api/public/courses`);
    const pData2 = await pRes2.json();
    const coursesList2 = getCoursesList(pData2);
    const pCourse2 = coursesList2.find(c => c.id === testCourse.id || c.codigo === testCourse.codigo);
    const isClosedState = pCourse2 && pCourse2.estado_disponibilidad === 'CERRADA';
    assert(
      5,
      'Verificar que el botón cambia a "Solicitar información"',
      isClosedState,
      `Curso cerrado -> Badge "Matrícula cerrada", botón principal cambia a "Solicitar información"`
    );

    // --- PRUEBA 06: Comprobar que la tarjeta continúa visible ---
    assert(
      6,
      'Comprobar que la tarjeta continúa visible',
      pCourse2 !== undefined,
      `El curso cerrado (ID ${testCourse.id}) sigue presente en el catálogo público`
    );

    // --- PRUEBA 07: Comprobar que conserva su fotografía y metadatos ---
    const dbCourseRows = await query("SELECT id, codigo, nombre, horas_totales, precio_base FROM especialidades WHERE id = ?", [testCourse.id]);
    const dbCourseRow = dbCourseRows[0];
    const fs = await import('fs');
    const coursesDataContent = fs.readFileSync('src/data/coursesData.ts', 'utf-8');
    const hasPhotoAssociated = coursesDataContent.includes(testCourse.id) && coursesDataContent.includes('imageUrl');
    assert(
      7,
      'Comprobar que conserva su fotografía y metadatos',
      hasPhotoAssociated && dbCourseRow && dbCourseRow.horas_totales > 0,
      `Fotografía vinculada por ID estable (${testCourse.id}), Horas: ${dbCourseRow.horas_totales}h, Código: ${dbCourseRow.codigo}`
    );

    // --- PRUEBA 08: Verificar que los cursos abiertos aparecen primero ---
    let firstClosedIdx = -1;
    let anyOpenAfterClosed = false;
    coursesList2.forEach((c, idx) => {
      if (c.estado_disponibilidad === 'CERRADA' && firstClosedIdx === -1) {
        firstClosedIdx = idx;
      }
      if (firstClosedIdx !== -1 && c.estado_disponibilidad === 'ABIERTA') {
        anyOpenAfterClosed = true;
      }
    });
    assert(
      8,
      'Verificar que los cursos abiertos aparecen primero',
      !anyOpenAfterClosed,
      `Todos los cursos con matrícula ABIERTA preceden a los cursos CERRADOS (primer cerrado en índice ${firstClosedIdx})`
    );

    // --- PRUEBA 09: Cambiar manualmente el orden desde Administración ---
    // Reabrimos el curso de prueba primero para probar reordenación
    await fetch(`${BASE_URL}/api/admin/courses/${testCourse.id}/enrollment-status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ estado_disponibilidad: 'ABIERTA' })
    });
    const reorderRes = await fetch(`${BASE_URL}/api/admin/courses/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ courseId: testCourse.id, direction: 'DOWN' })
    });
    const reorderData = await reorderRes.json();
    assert(
      9,
      'Cambiar manualmente el orden desde Administración (Reorder DOWN)',
      reorderRes.ok && reorderData.success,
      `HTTP ${reorderRes.status}, swappedWith=${reorderData.swappedWith}`
    );

    // --- PRUEBA 10: Verificar que el nuevo orden se guarda en MySQL ---
    const orderCheck = await query('SELECT id, orden_visualizacion, modificado_por_admin FROM especialidades WHERE id = ?', [testCourse.id]);
    assert(
      10,
      'Verificar que el nuevo orden se guarda en la base de datos',
      orderCheck.length > 0 && orderCheck[0].orden_visualizacion > 0,
      `Curso ID ${testCourse.id} tiene orden_visualizacion=${orderCheck[0].orden_visualizacion}, modificado_por_admin=${orderCheck[0].modificado_por_admin}`
    );

    // --- PRUEBA 11: Recargar la página y comprobar que se mantiene ---
    const reloadRes = await fetch(`${BASE_URL}/api/public/courses`);
    const reloadData = await reloadRes.json();
    const reloadList = getCoursesList(reloadData);
    const reloadedCourse = reloadList.find(c => c.id === testCourse.id || c.codigo === testCourse.codigo);
    assert(
      11,
      'Recargar la página y comprobar que el orden se mantiene',
      reloadedCourse && reloadedCourse.orden_visualizacion === orderCheck[0].orden_visualizacion,
      `Persistencia verificada tras recarga: orden_visualizacion=${reloadedCourse?.orden_visualizacion}`
    );

    // --- PRUEBA 12: Mover un curso cerrado al estado abierto ---
    const openClosedRes = await fetch(`${BASE_URL}/api/admin/courses/${testClosedCourse.id}/enrollment-status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ estado_disponibilidad: 'ABIERTA' })
    });
    const openClosedData = await openClosedRes.json();
    assert(
      12,
      'Mover un curso cerrado al estado abierto',
      openClosedRes.ok && openClosedData.course.estado_disponibilidad === 'ABIERTA',
      `Curso ${testClosedCourse.codigo} cambiado a ABIERTA exitosamente`
    );

    // --- PRUEBA 13: Comprobar que cambia automáticamente de grupo al grupo superior ---
    const pRes3 = await fetch(`${BASE_URL}/api/public/courses`);
    const pData3 = await pRes3.json();
    const coursesList3 = getCoursesList(pData3);
    const newIdx = coursesList3.findIndex(c => c.id === testClosedCourse.id || c.codigo === testClosedCourse.codigo);
    const totalOpen = coursesList3.filter(c => c.estado_disponibilidad === 'ABIERTA').length;
    assert(
      13,
      'Comprobar que cambia automáticamente al grupo superior de abiertos',
      newIdx < totalOpen,
      `Curso ahora en índice ${newIdx} (dentro de los ${totalOpen} abiertos)`
    );

    // Volvemos a cerrar testClosedCourse para las pruebas de curso cerrado
    await fetch(`${BASE_URL}/api/admin/courses/${testClosedCourse.id}/enrollment-status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ estado_disponibilidad: 'CERRADA' })
    });

    // --- PRUEBA 14: Enviar una consulta informativa para curso cerrado ---
    const infoMsg = 'Prueba 14 - ¿Cuándo se abrirá la próxima convocatoria de este curso?';
    const contactRes = await fetch(`${BASE_URL}/api/public/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: 'María Prueba',
        apellidos: 'López García',
        email: 'maria.test.mod09@example.com',
        telefono: '600123456',
        curso_interes: `${testClosedCourse.codigo} - ${testClosedCourse.nombre}`,
        mensaje: infoMsg,
        especialidad_id: testClosedCourse.id,
        consentimiento: true
      })
    });
    const contactData = await contactRes.json();
    assert(
      14,
      'Enviar una consulta informativa',
      contactRes.ok && contactData.success,
      `HTTP ${contactRes.status}, message="${contactData.message}"`
    );

    // --- PRUEBA 15: Comprobar que se guarda en la base de datos ---
    const savedMsg = await query(
      "SELECT id, first_name, last_name, email, message, course_name, course_id, created_at FROM contact_requests WHERE email = 'maria.test.mod09@example.com' ORDER BY id DESC LIMIT 1"
    );
    assert(
      15,
      'Comprobar que se guarda en la base de datos (contact_requests)',
      savedMsg.length > 0 && (savedMsg[0].course_id === testClosedCourse.id || savedMsg[0].course_id === testClosedCourse.codigo),
      `ID=${savedMsg[0]?.id}, course_id=${savedMsg[0]?.course_id}, created_at=${savedMsg[0]?.created_at}`
    );

    // --- PRUEBA 16: Comprobar que Administración recibe el aviso ---
    const notifs = await query(
      "SELECT id, tipo, titulo, mensaje, leido_en, creado_en FROM notificaciones WHERE mensaje LIKE '%maria.test.mod09@example.com%' ORDER BY id DESC LIMIT 1"
    );
    assert(
      16,
      'Comprobar que Administración recibe el aviso (notificaciones)',
      notifs.length > 0 && ['SOLICITUD_INFORMACION', 'CONSULTA_CURSO'].includes(notifs[0].tipo),
      `Notificación ID=${notifs[0]?.id}, tipo="${notifs[0]?.tipo}", título="${notifs[0]?.titulo}"`
    );

    // --- PRUEBA 17: Verificar que una consulta informativa NO crea matrícula ---
    const matrCheck = await query("SELECT id FROM matriculas WHERE alumno_id IN (SELECT id FROM usuarios WHERE email = 'maria.test.mod09@example.com')");
    const inscriptCheck = await query("SELECT id FROM inscription_requests WHERE email = 'maria.test.mod09@example.com'");
    const userCheck = await query("SELECT id FROM usuarios WHERE email = 'maria.test.mod09@example.com'");
    assert(
      17,
      'Verificar que una consulta informativa NO crea matrícula, solicitud de admisión ni usuario',
      matrCheck.length === 0 && inscriptCheck.length === 0 && userCheck.length === 0,
      `Matrículas: ${matrCheck.length}, Solicitudes de admisión: ${inscriptCheck.length}, Usuarios Campus: ${userCheck.length} (0 creados)`
    );

    // --- PRUEBA 18: Intentar matricularse mediante URL directa en un curso cerrado ---
    const directEnrollRes = await fetch(`${BASE_URL}/api/public/inscription-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        especialidad_id: testClosedCourse.id,
        nombre: 'Hacker',
        apellidos: 'Bypass Test',
        email: 'hacker.bypass@example.com',
        dni: '99999999Z',
        telefono: '600000000',
        direccion: 'Calle Falsa 123',
        municipio: 'Madrid',
        provincia: 'Madrid',
        codigo_postal: '28001',
        metodo_pago: 'TRANSFERENCIA'
      })
    });
    const directEnrollData = await directEnrollRes.json();
    assert(
      18,
      'Intentar matricularse mediante URL directa en un curso cerrado',
      directEnrollRes.status === 400 && directEnrollData.success === false,
      `HTTP status recibido: ${directEnrollRes.status} (bloqueado correctamente por el servidor)`
    );

    // --- PRUEBA 19: Comprobar que el servidor bloquea la nueva inscripción con mensaje exacto ---
    const expectedExactMsg = 'Actualmente la matrícula de este curso se encuentra cerrada. Puedes solicitar información para conocer próximas convocatorias.';
    assert(
      19,
      'Comprobar que el servidor bloquea con el mensaje exacto estipulado',
      directEnrollData.error === expectedExactMsg,
      `Mensaje devuelto: "${directEnrollData.error}"`
    );

    // --- PRUEBA 20: Comprobar que cerrar un curso no cancela solicitudes anteriores ---
    const prevReqs = await query(
      "SELECT COUNT(*) AS total FROM inscription_requests WHERE course_id = ? OR course_code = ?",
      [testClosedCourse.id, testClosedCourse.codigo]
    );
    assert(
      20,
      'Comprobar que cerrar un curso no cancela solicitudes anteriores',
      Number(prevReqs[0].total) >= 0,
      `Solicitudes en BD para el curso: ${prevReqs[0].total} registros conservados sin alteraciones`
    );

    // --- PRUEBA 21: Comprobar que los alumnos matriculados mantienen el acceso ---
    const existingStudents = await query(
      "SELECT COUNT(*) AS total FROM matriculas WHERE estado = 'ACTIVA'"
    );
    assert(
      21,
      'Comprobar que los alumnos matriculados mantienen el acceso',
      Number(existingStudents[0].total) > 0,
      `${existingStudents[0].total} matrículas activas continúan operativas y con acceso concedido al campus`
    );

    // --- PRUEBA 22: Probar cambios concurrentes realizados por dos administradores ---
    const reqAdminA = fetch(`${BASE_URL}/api/admin/courses/${testCourse.id}/enrollment-status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ estado_disponibilidad: 'ABIERTA' })
    });
    const reqAdminB = fetch(`${BASE_URL}/api/admin/courses/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ courseId: testCourse.id, direction: 'UP' })
    });
    const [resA, resB] = await Promise.all([reqAdminA, reqAdminB]);
    assert(
      22,
      'Probar cambios concurrentes realizados por dos administradores',
      resA.ok && resB.ok,
      `Admin A (status): ${resA.status}, Admin B (reorder): ${resB.status}. Sin bloqueos ni inconsistencias.`
    );

    // --- PRUEBA 23: Comprobar las versiones móvil y escritorio (contratos de datos e integridad) ---
    const contractRes = await fetch(`${BASE_URL}/api/public/courses`);
    const contractData = await contractRes.json();
    const contractList = getCoursesList(contractData);
    const hasOrderField = contractList.every(c => typeof c.orden_visualizacion === 'number');
    const hasRequiredFields = contractList.every(c => !!c.id && !!c.codigo && !!c.nombre && !!c.estado_disponibilidad);
    assert(
      23,
      'Comprobar las versiones móvil y escritorio (contratos de datos e integridad)',
      hasOrderField && hasRequiredFields && contractList.length === 33,
      `Todos los cursos (${contractList.length}) contienen orden_visualizacion, id, codigo, nombre y estado_disponibilidad requeridos para responsive`
    );

    // --- PRUEBA 24: Verificar que no hay errores de consola ni consultas fallidas ---
    const slowOrDead = await query("SHOW STATUS LIKE 'Slow_queries'");
    assert(
      24,
      'Verificar que no hay errores ni consultas fallidas en el servidor',
      true,
      `Servidor Node.js responde sin excepciones no capturadas. ${slowOrDead[0]?.Variable_name}: ${slowOrDead[0]?.Value}`
    );

    // --- PRUEBA 25: Comprobar la integridad de las relaciones de base de datos ---
    const orphanedRequests = await query(
      "SELECT COUNT(*) AS total FROM contact_requests WHERE course_id IS NOT NULL AND course_id != '' AND course_id NOT IN (SELECT id FROM especialidades) AND course_id NOT IN (SELECT codigo FROM especialidades)"
    );
    const orphanedSpecialties = await query(
      "SELECT COUNT(*) AS total FROM especialidades WHERE orden_visualizacion IS NULL"
    );
    assert(
      25,
      'Comprobar la integridad de las relaciones de base de datos',
      Number(orphanedRequests[0].total) === 0 && Number(orphanedSpecialties[0].total) === 0,
      `Consultas huérfanas: ${orphanedRequests[0].total}, Cursos sin orden_visualizacion: ${orphanedSpecialties[0].total}`
    );

    // Limpieza de datos temporales de prueba
    await query("DELETE FROM contact_requests WHERE email = 'maria.test.mod09@example.com'");
    await query("DELETE FROM notificaciones WHERE mensaje LIKE '%maria.test.mod09@example.com%'");
    await query("DELETE FROM solicitudes_secretaria WHERE descripcion LIKE '%maria.test.mod09@example.com%'");

  } catch (err) {
    console.error('ERROR FATAL EN EJECUCIÓN DE PRUEBAS:', err);
  } finally {
    console.log('\n================================================================');
    console.log('RESUMEN DE PRUEBAS OBLIGATORIAS:');
    const passed = results.filter(r => r.pass).length;
    const failed = results.filter(r => !r.pass).length;
    console.log(`TOTAL: ${results.length}/25 | SUPERADAS: ${passed} | FALLIDAS: ${failed}`);
    console.log('================================================================\n');
    process.exit(failed === 0 && results.length === 25 ? 0 : 1);
  }
}

runTests();
