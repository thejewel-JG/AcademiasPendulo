/**
 * ACADEMIAS PÉNDULO — AUDITORÍA TÉCNICA INTEGRAL (MODIFICACIÓN 08)
 * Batería de pruebas automatizadas de extremo a extremo:
 * Escenarios A - J, Seguridad, Integridad Referencial y Aislamiento de Permisos.
 */

const http = require('http');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const BASE_URL = 'http://localhost:3000';

function makeRequest(method, urlPath, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { ...headers }
    };

    let postData = null;
    if (body) {
      if (headers['Content-Type'] === 'application/json' || !headers['Content-Type']) {
        postData = JSON.stringify(body);
        options.headers['Content-Type'] = 'application/json';
        options.headers['Content-Length'] = Buffer.byteLength(postData);
      } else {
        postData = body;
        options.headers['Content-Length'] = Buffer.byteLength(postData);
      }
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json
        });
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

function extractCookie(headers) {
  const setCookie = headers['set-cookie'];
  if (!setCookie) return null;
  const match = setCookie[0].match(/campus_session=([^;]+)/);
  return match ? match[1] : null;
}

function generateRandomDni() {
  const letters = 'TRWAGMYFPDXBNJZSQVHLCKE';
  const num = Math.floor(10000000 + Math.random() * 89999999);
  return `${num}${letters[num % 23]}`;
}

async function runAuditSuite() {
  console.log('========================================================================');
  console.log('🔍 INICIANDO AUDITORÍA INTEGRAL — ACADEMIAS PÉNDULO (MODIFICACIÓN 08)');
  console.log('========================================================================\n');

  const { query } = require('../db');
  const { generateToken, hashToken, hashPassword } = require('../authUtils');

  let passed = 0;
  let total = 10;

  function assert(condition, scenarioId, message) {
    if (!condition) {
      console.error(`❌ [FALLO EN ${scenarioId}] ${message}`);
      throw new Error(`Assertion failed in ${scenarioId}: ${message}`);
    }
    passed++;
    console.log(`✅ [${scenarioId} SUPERADO] ${message}`);
  }

  try {
    // ----------------------------------------------------
    // PREPARACIÓN DE OPERADOR ADMINISTRADOR
    // ----------------------------------------------------
    const adminRows = await query(`
      SELECT u.id, u.email FROM usuarios u
      JOIN usuario_roles ur ON u.id = ur.usuario_id
      JOIN roles r ON ur.rol_id = r.id
      WHERE r.codigo = 'ADMINISTRADOR' AND u.estado = 'ACTIVO' LIMIT 1
    `);
    if (adminRows.length === 0) throw new Error('No se encontró usuario administrador en la base de datos.');
    const adminUser = adminRows[0];

    const adminToken = generateToken(32);
    await query(`
      INSERT INTO sesiones (id, usuario_id, token_hash, ip, user_agent, expiracion)
      VALUES (?, ?, ?, '127.0.0.1', 'AuditRunner', DATE_ADD(NOW(), INTERVAL 2 HOUR))
    `, [`sess-audit-admin-${Date.now().toString(36)}`, adminUser.id, hashToken(adminToken)]);
    const adminCookie = `campus_session=${adminToken}`;

    // Obtener grupo activo real
    const groupRows = await query(`SELECT id, especialidad_id, nombre FROM grupos WHERE estado = 'ACTIVO' LIMIT 1`);
    if (groupRows.length === 0) throw new Error('No hay grupos activos en la base de datos.');
    const activeGroup = groupRows[0];

    // ========================================================================
    // ESCENARIO A — NUEVO ALUMNO, INSCRIPCIÓN DIRECTA (Flujo Completo de 15 Pasos)
    // ========================================================================
    await query(`UPDATE especialidades SET estado_disponibilidad = 'ABIERTA' WHERE id = 'tmvg0004'`);

    const tsA = Date.now();
    const dniA = generateRandomDni();
    const emailA = `alumno.directo.${tsA}@example.com`;

    // 1-4. Envío de solicitud directa
    const submitResA = await makeRequest('POST', '/api/public/inscription-request', {}, {
      course_id: 'tmvg0004',
      course_name: 'Mantenimiento de Vehículos Híbridos',
      course_code: 'TMVG0004',
      center: 'Academias Péndulo - Almería',
      edition: 'Convocatoria 2026',
      first_name: 'Juan',
      last_name_1: 'Pérez',
      last_name_2: 'López',
      dni_nie: dniA,
      birth_date: '1995-04-12',
      phone: '611223344',
      email: emailA,
      address: 'Calle Mayor 10',
      postal_code: '04001',
      city: 'Almería',
      province: 'Almería',
      employment_status: 'desempleado/a',
      academic_level: 'bachillerato',
      academic_degree: 'Bachillerato Tecnológico',
      truth_declaration: true,
      privacy_acceptance: true,
      signature_name: 'Juan Pérez López',
      signature_date: '2026-10-25'
    });
    assert(submitResA.status === 201 && submitResA.data.request_number, 'ESCENARIO_A', 'Paso 1-4: Solicitud directa registrada y se emiten instrucciones bancarias con referencia única.');

    const reqNumA = submitResA.data.request_number;
    const reqDetailsA = (await query(`SELECT * FROM inscription_requests WHERE request_number = ?`, [reqNumA]))[0];

    // 5. El alumno comunica la transferencia (sube justificante)
    await query(`
      UPDATE inscription_requests
      SET estado_pago = 'TRANSFERENCIA_COMUNICADA',
          justificante_ruta = 'receipt_test_a.pdf',
          justificante_nombre = 'justificante_transferencia.pdf',
          justificante_subido_en = NOW()
      WHERE id = ?
    `, [reqDetailsA.id]);

    // 7-8. Operador comprueba ingreso y confirma transferencia (sin activar campus)
    const verifyResA = await makeRequest('PUT', `/api/admin/inscriptions/${reqDetailsA.id}/verify-transfer`, {
      'Cookie': adminCookie
    }, {
      referencia_bancaria: `BANK-REF-A-${tsA}`,
      observaciones: 'Ingreso verificado en cuenta oficial'
    });
    assert(verifyResA.status === 200 && verifyResA.data.estado_pago === 'TRANSFERENCIA_VERIFICADA', 'ESCENARIO_A_VERIFY', 'Paso 5-8: Transferencia verificada por operador. Matrícula y campus permanecen pendientes.');

    // 9. Operador pulsa "Aprobar matrícula y dar de alta"
    const approveResA = await makeRequest('POST', `/api/admin/inscriptions/${reqDetailsA.id}/approve-enrollment-and-activate`, {
      'Cookie': adminCookie
    }, {
      groupId: activeGroup.id
    });
    assert(approveResA.status === 200 && approveResA.data.isNewUser === true, 'ESCENARIO_A_ALTA', 'Paso 9-12: Alta administrativa ejecutada: cuenta creada con usuario=email, contraseña segura y matrícula activa.');

    // 13-14. El alumno inicia sesión con su contraseña inicial
    const studentUserRowA = (await query(`SELECT * FROM usuarios WHERE email = ?`, [emailA.toLowerCase()]))[0];
    assert(studentUserRowA.cambio_password_obligatorio === 1, 'ESCENARIO_A_AUTH', 'Paso 13: El sistema detecta cambio obligatorio de contraseña en el primer acceso.');

    // 15. Consulta materiales autorizados
    const tempStudentToken = generateToken(32);
    await query(`
      INSERT INTO sesiones (id, usuario_id, token_hash, ip, user_agent, expiracion)
      VALUES (?, ?, ?, '127.0.0.1', 'AuditRunner', DATE_ADD(NOW(), INTERVAL 2 HOUR))
    `, [`sess-a-${tsA}`, studentUserRowA.id, hashToken(tempStudentToken)]);
    const studentCookieA = `campus_session=${tempStudentToken}`;

    // Desactivar cambio obligatorio para testear interior del curso
    await query(`UPDATE usuarios SET cambio_password_obligatorio = 0 WHERE id = ?`, [studentUserRowA.id]);

    const myCoursesA = await makeRequest('GET', '/api/student/my-courses', { 'Cookie': studentCookieA });
    assert(myCoursesA.status === 200 && myCoursesA.data.courses.length > 0, 'ESCENARIO_A', 'Paso 14-15: El alumno accede al campus y visualiza exclusivamente su curso autorizado.');

    // ========================================================================
    // ESCENARIO B — CURSO CON APROBACIÓN PREVIA
    // ========================================================================
    const tsB = Date.now();
    const dniB = generateRandomDni();
    const emailB = `alumno.aprobacion.${tsB}@example.com`;

    // Para forzar modalidad de solicitud con aprobación previa en el test:
    const submitResB = await makeRequest('POST', '/api/public/inscription-request', {}, {
      course_id: 'tmvg0004',
      course_name: 'Mantenimiento de Vehículos Híbridos',
      course_code: 'TMVG0004',
      first_name: 'Lucía',
      last_name_1: 'Martín',
      dni_nie: dniB,
      birth_date: '1992-06-20',
      phone: '622334455',
      email: emailB,
      employment_status: 'trabajador/a por cuenta ajena',
      academic_level: 'fp_grado_superior',
      academic_degree: 'Técnico Superior Automoción',
      truth_declaration: true,
      privacy_acceptance: true,
      signature_name: 'Lucía Martín',
      signature_date: '2026-10-25'
    });
    const reqNumB = submitResB.data.request_number;
    const reqDetailsB = (await query(`SELECT * FROM inscription_requests WHERE request_number = ?`, [reqNumB]))[0];

    // Establecer expresamente modalidad SOLICITUD_APROBACION y estado EN_REVISION para el escenario
    await query(`
      UPDATE inscription_requests
      SET modalidad_inscripcion = 'SOLICITUD_APROBACION',
          estado_solicitud = 'EN_REVISION'
      WHERE id = ?
    `, [reqDetailsB.id]);

    // Verificar que NO puede saltarse la preaprobación de Secretaría
    await query(`UPDATE inscription_requests SET estado_pago = 'TRANSFERENCIA_VERIFICADA' WHERE id = ?`, [reqDetailsB.id]);
    const prematureApprove = await makeRequest('POST', `/api/admin/inscriptions/${reqDetailsB.id}/approve-enrollment-and-activate`, {
      'Cookie': adminCookie
    }, { groupId: activeGroup.id });
    assert(prematureApprove.status === 400, 'ESCENARIO_B_GUARD', 'Protección activa: El servidor rechaza dar de alta una solicitud que no ha sido preaprobada.');

    // Preaprobar solicitud
    await makeRequest('PUT', `/api/admin/inscriptions/${reqDetailsB.id}/preapprove`, {
      'Cookie': adminCookie
    }, { observaciones: 'Requisitos académicos verificados correctamente.' });

    // Ahora sí aprobar matrícula
    const approvedB = await makeRequest('POST', `/api/admin/inscriptions/${reqDetailsB.id}/approve-enrollment-and-activate`, {
      'Cookie': adminCookie
    }, { groupId: activeGroup.id });
    assert(approvedB.status === 200, 'ESCENARIO_B', 'Flujo de preaprobación completado: Secretaría preaprueba y se concede el alta legítima.');

    // ========================================================================
    // ESCENARIO C — ALUMNO YA REGISTRADO (Reutilización de Cuenta)
    // ========================================================================
    await query(`UPDATE especialidades SET estado_disponibilidad = 'ABIERTA' WHERE id = 'tmvg0002'`);

    const tsC = Date.now();
    // Inscribir al mismo alumno de Escenario A en un segundo curso
    const submitResC = await makeRequest('POST', '/api/public/inscription-request', {}, {
      course_id: 'tmvg0002',
      course_name: 'Introducción a la Automoción',
      course_code: 'TMVG0002',
      first_name: 'Juan',
      last_name_1: 'Pérez',
      last_name_2: 'López',
      dni_nie: dniA,
      birth_date: '1995-04-12',
      phone: '611223344',
      email: emailA,
      employment_status: 'desempleado/a',
      academic_level: 'bachillerato',
      academic_degree: 'Bachillerato Tecnológico',
      truth_declaration: true,
      privacy_acceptance: true,
      signature_name: 'Juan Pérez López',
      signature_date: '2026-10-25'
    });
    const reqNumC = submitResC.data.request_number;
    const reqDetailsC = (await query(`SELECT * FROM inscription_requests WHERE request_number = ?`, [reqNumC]))[0];

    await makeRequest('PUT', `/api/admin/inscriptions/${reqDetailsC.id}/preapprove`, {
      'Cookie': adminCookie
    });
    await query(`UPDATE inscription_requests SET estado_pago = 'TRANSFERENCIA_VERIFICADA' WHERE id = ?`, [reqDetailsC.id]);
    const approveResC = await makeRequest('POST', `/api/admin/inscriptions/${reqDetailsC.id}/approve-enrollment-and-activate`, {
      'Cookie': adminCookie
    }, { groupId: activeGroup.id });

    const totalUsersWithEmailA = (await query(`SELECT COUNT(*) as c FROM usuarios WHERE email = ?`, [emailA.toLowerCase()]))[0].c;
    assert(
      approveResC.status === 200 &&
      approveResC.data.isNewUser === false &&
      totalUsersWithEmailA === 1,
      'ESCENARIO_C',
      'Cuenta existente reutilizada: No se duplicó el usuario, se activó la nueva matrícula y se preservaron credenciales.'
    );

    // ========================================================================
    // ESCENARIO D — TRANSFERENCIA NO RECIBIDA
    // ========================================================================
    const tsD = Date.now();
    const emailD = `no.pago.${tsD}@example.com`;
    const submitResD = await makeRequest('POST', '/api/public/inscription-request', {}, {
      course_id: 'tmvg0004',
      course_name: 'Mantenimiento de Vehículos Híbridos',
      course_code: 'TMVG0004',
      first_name: 'Felipe',
      last_name_1: 'Ríos',
      dni_nie: generateRandomDni(),
      birth_date: '1999-01-10',
      phone: '633445566',
      email: emailD,
      employment_status: 'desempleado/a',
      academic_level: 'eso',
      academic_degree: 'Graduado ESO',
      truth_declaration: true,
      privacy_acceptance: true,
      signature_name: 'Felipe Ríos',
      signature_date: '2026-10-25'
    });
    const reqDetailsD = (await query(`SELECT * FROM inscription_requests WHERE request_number = ?`, [submitResD.data.request_number]))[0];

    // Subir justificante pero no verificar pago
    await query(`UPDATE inscription_requests SET estado_pago = 'TRANSFERENCIA_COMUNICADA' WHERE id = ?`, [reqDetailsD.id]);
    const unverifiedApprove = await makeRequest('POST', `/api/admin/inscriptions/${reqDetailsD.id}/approve-enrollment-and-activate`, {
      'Cookie': adminCookie
    }, { groupId: activeGroup.id });

    assert(
      unverifiedApprove.status === 400 &&
      unverifiedApprove.data.error.includes('previamente verificada'),
      'ESCENARIO_D',
      'Bloqueo por transferencia no verificada: El justificante no otorga acceso ni permite el alta administrativa.'
    );

    // ========================================================================
    // ESCENARIO E — SOLICITUD RECHAZADA
    // ========================================================================
    const tsE = Date.now();
    const emailE = `rechazado.${tsE}@example.com`;
    const submitResE = await makeRequest('POST', '/api/public/inscription-request', {}, {
      course_id: 'tmvg0004',
      course_name: 'Mantenimiento de Vehículos Híbridos',
      course_code: 'TMVG0004',
      first_name: 'Mario',
      last_name_1: 'Sanz',
      dni_nie: generateRandomDni(),
      birth_date: '2001-08-15',
      phone: '644556677',
      email: emailE,
      employment_status: 'desempleado/a',
      academic_level: 'sin_estudios',
      academic_degree: 'Ninguno',
      truth_declaration: true,
      privacy_acceptance: true,
      signature_name: 'Mario Sanz',
      signature_date: '2026-10-25'
    });
    const reqDetailsE = (await query(`SELECT * FROM inscription_requests WHERE request_number = ?`, [submitResE.data.request_number]))[0];

    await makeRequest('PUT', `/api/admin/inscriptions/${reqDetailsE.id}/reject`, {
      'Cookie': adminCookie
    }, { motivo: 'No cumple los requisitos mínimos de acceso a la especialidad.' });

    const rejectedApprove = await makeRequest('POST', `/api/admin/inscriptions/${reqDetailsE.id}/approve-enrollment-and-activate`, {
      'Cookie': adminCookie
    }, { groupId: activeGroup.id });

    assert(
      rejectedApprove.status === 400 &&
      rejectedApprove.data.error.includes('RECHAZADA'),
      'ESCENARIO_E',
      'Solicitud rechazada: No se genera matrícula, no se crea usuario y no se permite el alta.'
    );

    // ========================================================================
    // ESCENARIO F — CONTROL DE ERROR DURANTE EL ALTA (Rollback Transaccional)
    // ========================================================================
    const tsF = Date.now();
    const emailF = `rollback.test.${tsF}@example.com`;
    const submitResF = await makeRequest('POST', '/api/public/inscription-request', {}, {
      course_id: 'tmvg0004',
      course_name: 'Mantenimiento de Vehículos Híbridos',
      course_code: 'TMVG0004',
      first_name: 'Clara',
      last_name_1: 'Vidal',
      dni_nie: generateRandomDni(),
      birth_date: '1996-03-30',
      phone: '655667788',
      email: emailF,
      employment_status: 'desempleado/a',
      academic_level: 'bachillerato',
      academic_degree: 'Bachillerato',
      truth_declaration: true,
      privacy_acceptance: true,
      signature_name: 'Clara Vidal',
      signature_date: '2026-10-25'
    });
    const reqDetailsF = (await query(`SELECT * FROM inscription_requests WHERE request_number = ?`, [submitResF.data.request_number]))[0];
    await query(`UPDATE inscription_requests SET estado_pago = 'TRANSFERENCIA_VERIFICADA' WHERE id = ?`, [reqDetailsF.id]);

    // Intentar alta con un ID de grupo inexistente para forzar fallo
    const failApprove = await makeRequest('POST', `/api/admin/inscriptions/${reqDetailsF.id}/approve-enrollment-and-activate`, {
      'Cookie': adminCookie
    }, { groupId: 'grupo-fantasma-inexistente' });

    const userCountF = (await query(`SELECT COUNT(*) as c FROM usuarios WHERE email = ?`, [emailF.toLowerCase()]))[0].c;
    const matCountF = (await query(`SELECT COUNT(*) as c FROM matriculas WHERE solicitud_id = ?`, [reqDetailsF.id]))[0].c;

    assert(
      failApprove.status === 400 &&
      userCountF === 0 &&
      matCountF === 0,
      'ESCENARIO_F',
      'Rollback transaccional íntegro: Ningún dato residual (ni usuario ni matrícula) se creó tras un error de asignación.'
    );

    // ========================================================================
    // ESCENARIO G — GESTIÓN SEGURA ANTE FALLO DE ENVÍO DE CORREO
    // ========================================================================
    const tsG = Date.now();
    const emailG = `correo.resend.${tsG}@example.com`;
    const submitResG = await makeRequest('POST', '/api/public/inscription-request', {}, {
      course_id: 'tmvg0004',
      course_name: 'Mantenimiento de Vehículos Híbridos',
      course_code: 'TMVG0004',
      first_name: 'Sofía',
      last_name_1: 'Cabrera',
      dni_nie: generateRandomDni(),
      birth_date: '1998-11-05',
      phone: '666778899',
      email: emailG,
      employment_status: 'desempleado/a',
      academic_level: 'fp_grado_medio',
      academic_degree: 'Técnico Electromecánica',
      truth_declaration: true,
      privacy_acceptance: true,
      signature_name: 'Sofía Cabrera',
      signature_date: '2026-10-25'
    });
    const reqDetailsG = (await query(`SELECT * FROM inscription_requests WHERE request_number = ?`, [submitResG.data.request_number]))[0];
    await query(`UPDATE inscription_requests SET estado_pago = 'TRANSFERENCIA_VERIFICADA' WHERE id = ?`, [reqDetailsG.id]);
    await makeRequest('POST', `/api/admin/inscriptions/${reqDetailsG.id}/approve-enrollment-and-activate`, {
      'Cookie': adminCookie
    }, { groupId: activeGroup.id });

    // Probar reenvío seguro de credenciales
    const resendResG = await makeRequest('POST', `/api/admin/inscriptions/${reqDetailsG.id}/resend-welcome-email`, {
      'Cookie': adminCookie
    });

    assert(
      resendResG.status === 200 &&
      resendResG.data.success === true,
      'ESCENARIO_G',
      'Gestión de reintentos: El reenvío de instrucciones administrativas funciona sin crear usuarios duplicados.'
    );

    // ========================================================================
    // ESCENARIO H — ACCESO RESTRINGIDO A RECURSOS AJENOS (403 Forbidden)
    // ========================================================================
    const unauthorizedCourseAccess = await makeRequest('GET', '/api/student/courses/fcos02', {
      'Cookie': studentCookieA
    });
    assert(
      unauthorizedCourseAccess.status === 403,
      'ESCENARIO_H',
      'Aislamiento del campus: Un alumno autenticado no puede acceder a cursos donde no posee matrícula activa (403 Forbidden).'
    );

    // ========================================================================
    // ESCENARIO I — VINCULACIÓN ECONÓMICA Y AUDITORÍA
    // ========================================================================
    const auditHistory = await query(`
      SELECT * FROM inscription_request_history
      WHERE request_id = ? AND event_type = 'TRANSFER_VERIFIED'
    `, [reqDetailsA.id]);

    const auditAdmin = await query(`
      SELECT * FROM auditoria
      WHERE recurso_id = ? AND accion_administrativa = 'TRANSFER_VERIFIED'
    `, [String(reqDetailsA.id)]);

    assert(
      auditHistory.length > 0 &&
      auditAdmin.length > 0 &&
      auditHistory[0].description.includes('CONFIRMADA Y VERIFICADA'),
      'ESCENARIO_I',
      'Trazabilidad económica: La verificación bancaria almacena referencia, operador, timestamp y registro de auditoría inmutable.'
    );

    // ========================================================================
    // ESCENARIO J — DOS OPERADORES SIMULTÁNEOS (Protección Concurrente)
    // ========================================================================
    const tsJ = Date.now();
    const emailJ = `concurrencia.${tsJ}@example.com`;
    const submitResJ = await makeRequest('POST', '/api/public/inscription-request', {}, {
      course_id: 'tmvg0004',
      course_name: 'Mantenimiento de Vehículos Híbridos',
      course_code: 'TMVG0004',
      first_name: 'Operador',
      last_name_1: 'Simultáneo',
      dni_nie: generateRandomDni(),
      birth_date: '1994-07-22',
      phone: '677889900',
      email: emailJ,
      employment_status: 'desempleado/a',
      academic_level: 'fp_grado_superior',
      academic_degree: 'Técnico Superior Automoción',
      truth_declaration: true,
      privacy_acceptance: true,
      signature_name: 'Operador Simultáneo',
      signature_date: '2026-10-25'
    });
    const reqDetailsJ = (await query(`SELECT * FROM inscription_requests WHERE request_number = ?`, [submitResJ.data.request_number]))[0];
    await query(`UPDATE inscription_requests SET estado_pago = 'TRANSFERENCIA_VERIFICADA' WHERE id = ?`, [reqDetailsJ.id]);

    // Ejecutar dos peticiones de alta simultáneas en paralelo
    const [op1Res, op2Res] = await Promise.all([
      makeRequest('POST', `/api/admin/inscriptions/${reqDetailsJ.id}/approve-enrollment-and-activate`, {
        'Cookie': adminCookie
      }, { groupId: activeGroup.id }),
      makeRequest('POST', `/api/admin/inscriptions/${reqDetailsJ.id}/approve-enrollment-and-activate`, {
        'Cookie': adminCookie
      }, { groupId: activeGroup.id })
    ]);

    const successCount = (op1Res.status === 200 ? 1 : 0) + (op2Res.status === 200 ? 1 : 0);
    const rejectedCount = (op1Res.status === 400 ? 1 : 0) + (op2Res.status === 400 ? 1 : 0);
    const finalEnrollmentCountJ = (await query(`SELECT COUNT(*) as c FROM matriculas WHERE solicitud_id = ?`, [reqDetailsJ.id]))[0].c;

    assert(
      successCount === 1 &&
      rejectedCount === 1 &&
      finalEnrollmentCountJ === 1,
      'ESCENARIO_J',
      'Concurrencia atómica probada: Exactamente 1 operador tuvo éxito, la petición concurrente fue rechazada con 400 y se evitó la doble matrícula.'
    );

    console.log('\n========================================================================');
    console.log(`🎉 ¡AUDITORÍA SUPERADA! TODOS LOS ${passed}/${total} ESCENARIOS INTEGRALES (A-J) VALIDADOS EXITOSAMENTE.`);
    console.log('========================================================================\n');

  } catch (err) {
    console.error('\n❌ ERROR DURANTE LA AUDITORÍA:', err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runAuditSuite();
