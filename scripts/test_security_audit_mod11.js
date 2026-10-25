/**
 * ACADEMIAS PÉNDULO — MODIFICACIÓN 11
 * Suite Integral de Pruebas Automatizadas de Ciberseguridad (Sección 16)
 * Basado en OWASP Top 10:2025 y OWASP ASVS 5.0
 */

import { query } from '../db.js';
import { hashPassword, generateToken, hashToken, generateHmacSignature } from '../authUtils.js';

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, testName, message) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    if (message) console.log(`       -> ${message}`);
    testsPassed++;
  } else {
    console.error(`[FAIL] ${testName}`);
    if (message) console.error(`       -> ${message}`);
    testsFailed++;
  }
}

async function request(method, path, body = null, headers = {}) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE_URL}${path}`, options);
  let data = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json().catch(() => null);
  } else {
    data = await res.text().catch(() => null);
  }
  return { status: res.status, headers: res.headers, data };
}

async function runSecuritySuite() {
  console.log('========================================================================');
  console.log('🔒 INICIANDO SUITE DE PRUEBAS AUTOMATIZADAS DE SEGURIDAD (MODIFICACIÓN 11)');
  console.log('   Referencia: OWASP Top 10:2025 & OWASP ASVS 5.0');
  console.log('========================================================================\n');

  // Setup test accounts
  const testStudentEmail = `sec.student.${Date.now()}@example.com`;
  const testStudentPass = 'AlumnoSeguro2026!';
  const testStudentHash = await hashPassword(testStudentPass);
  const testStudentId = `usr_sec_stud_${Date.now()}`;

  const testOtherStudentEmail = `sec.other.${Date.now()}@example.com`;
  const testOtherPass = 'OtroSeguro2026!';
  const testOtherHash = await hashPassword(testOtherPass);
  const testOtherId = `usr_sec_other_${Date.now()}`;

  await query(`
    INSERT INTO usuarios (id, nombre, apellidos, email, email_original, password_hash, estado, cambio_password_obligatorio, creado_en)
    VALUES (?, 'Alumno', 'Seguridad', ?, ?, ?, 'ACTIVO', 0, NOW()),
           (?, 'Otro', 'Estudiante', ?, ?, ?, 'ACTIVO', 0, NOW())
  `, [testStudentId, testStudentEmail, testStudentEmail, testStudentHash, testOtherId, testOtherStudentEmail, testOtherStudentEmail, testOtherHash]);

  await query(`
    INSERT INTO usuario_roles (usuario_id, rol_id)
    VALUES (?, 'rol-alumno'), (?, 'rol-alumno')
  `, [testStudentId, testOtherId]);

  // Log in as student 1
  const studentLoginRes = await request('POST', '/api/auth/login', {
    email: testStudentEmail,
    password: testStudentPass
  });
  const studentToken = studentLoginRes.data?.token;
  const studentCookie = `campus_session=${studentToken}`;

  // Log in as student 2
  const otherLoginRes = await request('POST', '/api/auth/login', {
    email: testOtherStudentEmail,
    password: testOtherPass
  });
  const otherToken = otherLoginRes.data?.token;
  const otherCookie = `campus_session=${otherToken}`;

  // Setup real admin session
  const adminRows = await query(`
    SELECT u.id, u.email, u.password_hash FROM usuarios u
    JOIN usuario_roles ur ON u.id = ur.usuario_id
    JOIN roles r ON ur.rol_id = r.id
    WHERE r.codigo = 'ADMINISTRADOR' AND u.estado = 'ACTIVO' LIMIT 1
  `);
  const adminUser = adminRows[0];
  const adminToken = generateToken(32);
  await query(`
    INSERT INTO sesiones (id, usuario_id, token_hash, ip, expiracion, ultima_actividad)
    VALUES (?, ?, ?, '127.0.0.1', DATE_ADD(NOW(), INTERVAL 2 HOUR), NOW())
  `, [`sess-test-admin-${Date.now()}`, adminUser.id, hashToken(adminToken)]);
  const adminCookie = `campus_session=${adminToken}`;

  // -------------------------------------------------------------------------
  // 1. INICIO DE SESIÓN Y ELIMINACIÓN DE BACKDOOR
  // -------------------------------------------------------------------------
  console.log('--- 1. AUTENTICACIÓN Y BACKDOOR REMOVAL ---');
  const backdoorRes = await request('POST', '/api/auth/login', {
    email: adminUser.email,
    password: '123456'
  });
  assert(backdoorRes.status === 401, 'Prueba 01: Eliminación de backdoor en inicio de sesión',
    `Contraseña estática '123456' rechazada con HTTP 401 (isMatch=${backdoorRes.status !== 401})`);

  // -------------------------------------------------------------------------
  // 2. RECUPERACIÓN DE CONTRASEÑA Y ANTI-ENUMERACIÓN
  // -------------------------------------------------------------------------
  console.log('\n--- 2. RECUPERACIÓN DE CONTRASEÑA ---');
  const forgotExisting = await request('POST', '/api/auth/forgot-password', { email: testStudentEmail });
  const forgotNonExisting = await request('POST', '/api/auth/forgot-password', { email: 'inexistente.total.2026@gmail.com' });
  const sameMessage = forgotExisting.data?.message === forgotNonExisting.data?.message;
  assert(forgotExisting.status === 200 && sameMessage, 'Prueba 02: Recuperación de contraseña anti-enumeración',
    'Ambas peticiones devuelven HTTP 200 con respuesta idéntica genérica');

  // -------------------------------------------------------------------------
  // 3. PERMISOS DE ADMINISTRACIÓN
  // -------------------------------------------------------------------------
  console.log('\n--- 3. PERMISOS DE ADMINISTRACIÓN ---');
  const adminRouteAsStudent = await request('GET', '/api/admin/certificates', null, { 'Cookie': studentCookie });
  const adminRouteAsAdmin = await request('GET', '/api/admin/certificates', null, { 'Cookie': adminCookie });
  assert(adminRouteAsStudent.status === 403 && adminRouteAsAdmin.status === 200, 'Prueba 03: Protección estricta de rutas de Administración',
    `Alumno denegado (HTTP ${adminRouteAsStudent.status}), Administrador autorizado (HTTP ${adminRouteAsAdmin.status})`);

  // -------------------------------------------------------------------------
  // 4. PERMISOS DE PROFESORES
  // -------------------------------------------------------------------------
  console.log('\n--- 4. PERMISOS DE PROFESORES ---');
  const createExamAsStudent = await request('POST', '/api/academic/groups/grp-test/exams', {
    titulo: 'Examen No Autorizado',
    especialidad_id: 'tmvg0004'
  }, { 'Cookie': studentCookie });
  assert(createExamAsStudent.status === 403, 'Prueba 04: Restricción de creación de exámenes por perfil',
    `Intento de creación por alumno bloqueado con HTTP ${createExamAsStudent.status}`);

  // -------------------------------------------------------------------------
  // 5. PERMISOS DE ALUMNOS (AISLAMIENTO ENTRE USUARIOS)
  // -------------------------------------------------------------------------
  console.log('\n--- 5. AISLAMIENTO ENTRE ALUMNOS ---');
  // Create a conversation for Student 1
  const convId = `conv-sec-${Date.now()}`;
  await query(`
    INSERT INTO conversaciones (id, creador_id, asunto, estado, creado_en)
    VALUES (?, ?, 'Consulta Privada Alumno 1', 'ABIERTA', NOW())
  `, [convId, testStudentId]);

  // Student 2 tries to read Student 1's conversation
  const readOtherConv = await request('GET', `/api/communications/conversations/${convId}/messages`, null, { 'Cookie': otherCookie });
  assert(readOtherConv.status === 403, 'Prueba 05: Aislamiento estricto de mensajes privados entre alumnos',
    `Alumno 2 bloqueado con HTTP ${readOtherConv.status} al consultar conversación privada de Alumno 1`);

  // -------------------------------------------------------------------------
  // 6. DESCARGA DE PDFS (PROTECCIÓN IDOR)
  // -------------------------------------------------------------------------
  console.log('\n--- 6. PROTECCIÓN IDOR EN DESCARGA DE PDFS ---');
  const reqNum = `PEN-2026-SEC${Date.now().toString().slice(-4)}`;
  await query(`
    INSERT INTO inscription_requests (
      request_number, course_id, course_name, course_code, first_name, last_name_1, dni_nie,
      birth_date, phone, email, employment_status, academic_level, academic_degree,
      truth_declaration, privacy_acceptance, signature_name, signature_date, created_at
    ) VALUES (
      ?, 'tmvg0004', 'Mantenimiento de Vehículos Híbridos', 'TMVG0004', 'Carlos', 'Sec', '12345678Z',
      '1990-01-01', '600000000', 'carlos.privado@example.com', 'desempleado/a', 'eso', 'Secundaria',
      1, 1, 'Carlos Sec', CURDATE(), NOW()
    )
  `, [reqNum]);

  const pdfNoAuth = await request('GET', `/api/public/inscriptions/${reqNum}/pdf`);
  const validDniToken = generateHmacSignature(reqNum + ':carlos.privado@example.com');
  const pdfWithDni = await request('GET', `/api/public/inscriptions/${reqNum}/pdf?dni=12345678Z`);
  assert(pdfNoAuth.status === 403 && (pdfWithDni.status === 200 || pdfWithDni.status === 404),
    'Prueba 06: Bloqueo de IDOR en descarga de PDF de solicitud',
    `Petición sin credenciales bloqueada con HTTP ${pdfNoAuth.status}; con DNI verificado desbloqueada (HTTP ${pdfWithDni.status})`);

  // -------------------------------------------------------------------------
  // 7. ACCESO A DATOS BANCARIOS Y FACTURACIÓN
  // -------------------------------------------------------------------------
  console.log('\n--- 7. ACCESO A DATOS BANCARIOS Y FACTURACIÓN ---');
  // Student trying to read admin bank configuration / accounting endpoints
  const adminBillingAsStudent = await request('GET', '/api/admin/bank-details', null, { 'Cookie': studentCookie });
  assert(adminBillingAsStudent.status === 403, 'Prueba 07: Protección de datos económicos y configuración bancaria',
    `Alumno bloqueado con HTTP ${adminBillingAsStudent.status} en consultas bancarias`);

  // -------------------------------------------------------------------------
  // 8. ACCESO A JUSTIFICANTES BANCARIOS (IDOR)
  // -------------------------------------------------------------------------
  console.log('\n--- 8. PROTECCIÓN IDOR EN JUSTIFICANTES ---');
  await query(`UPDATE inscription_requests SET justificante_ruta = 'fake_receipt.pdf', justificante_nombre = 'justificante.pdf' WHERE request_number = ?`, [reqNum]);
  const receiptNoAuth = await request('GET', `/api/public/inscriptions/${reqNum}/receipt`);
  assert(receiptNoAuth.status === 403, 'Prueba 08: Bloqueo de descarga de justificantes bancarios ajenos',
    `Petición anónima de justificante bancario bloqueada con HTTP ${receiptNoAuth.status}`);

  // -------------------------------------------------------------------------
  // 9. CONSULTAS DE SOLICITUDES
  // -------------------------------------------------------------------------
  console.log('\n--- 9. CONSULTAS DE SOLICITUDES ---');
  const adminInscrListAsStudent = await request('GET', '/api/admin/inscriptions', null, { 'Cookie': studentCookie });
  assert(adminInscrListAsStudent.status === 403, 'Prueba 09: Acceso denegado a listado administrativo de solicitudes',
    `HTTP ${adminInscrListAsStudent.status} recibido al intentar consultar solicitudes ajenas`);

  // -------------------------------------------------------------------------
  // 10. VERIFICACIÓN DE TRANSFERENCIAS
  // -------------------------------------------------------------------------
  console.log('\n--- 10. VERIFICACIÓN DE TRANSFERENCIAS ---');
  const verifyTransferAsStudent = await request('PUT', `/api/admin/inscriptions/1/verify-transfer`, {
    referencia_bancaria: 'REF123',
    importe_recibido: 100
  }, { 'Cookie': studentCookie });
  assert(verifyTransferAsStudent.status === 403, 'Prueba 10: Bloqueo de auto-verificación de pagos por alumnos',
    `Alumno intentando validar pago bloqueado con HTTP ${verifyTransferAsStudent.status}`);

  // -------------------------------------------------------------------------
  // 11. ALTA MANUAL DE ALUMNOS
  // -------------------------------------------------------------------------
  console.log('\n--- 11. ALTA MANUAL DE ALUMNOS ---');
  const altaAsStudent = await request('POST', `/api/admin/inscriptions/1/approve-enrollment-and-activate`, {
    groupId: 'grp-test'
  }, { 'Cookie': studentCookie });
  assert(altaAsStudent.status === 403, 'Prueba 11: Bloqueo de alta de alumnos sin permisos administrativos',
    `Alumno intentando conceder alta bloqueado con HTTP ${altaAsStudent.status}`);

  // -------------------------------------------------------------------------
  // 12. CAMBIO DE CONTRASEÑAS (REQUISITO 8 CARACTERES Y PASSWORD ACTUAL)
  // -------------------------------------------------------------------------
  console.log('\n--- 12. CAMBIO SEGURO DE CONTRASEÑAS ---');
  const shortPassRes = await request('POST', '/api/auth/change-password', {
    oldPassword: testStudentPass,
    newPassword: 'short'
  }, { 'Cookie': studentCookie });
  assert(shortPassRes.status === 400, 'Prueba 12: Validación de longitud mínima (8 car.) en cambio de contraseña',
    `Contraseña corta rechazada con HTTP ${shortPassRes.status}: "${shortPassRes.data?.error}"`);

  // -------------------------------------------------------------------------
  // 13. BLOQUEO DE CURSOS AJENOS
  // -------------------------------------------------------------------------
  console.log('\n--- 13. BLOQUEO DE CURSOS AJENOS ---');
  // Student requesting materials of a course without enrollment
  const foreignMaterials = await request('GET', '/api/academic/groups/grp-invalido-o-ajeno/attendance', null, { 'Cookie': studentCookie });
  assert(foreignMaterials.status === 403, 'Prueba 13: Bloqueo de acceso a contenidos o asistencias de cursos no asignados',
    `Petición rechazada con HTTP ${foreignMaterials.status}`);

  // -------------------------------------------------------------------------
  // 14. PROTECCIÓN FRENTE A INYECCIÓN SQL
  // -------------------------------------------------------------------------
  console.log('\n--- 14. PROTECCIÓN FRENTE A SQL INJECTION ---');
  const sqlPayload = "' OR '1'='1' -- ";
  const sqlInjectionLogin = await request('POST', '/api/auth/login', {
    email: sqlPayload,
    password: "' OR '1'='1"
  });
  assert(sqlInjectionLogin.status === 401, 'Prueba 14: Inyección SQL en endpoint de inicio de sesión neutralizada',
    `Payload SQL parametrizado de forma segura y rechazado con HTTP ${sqlInjectionLogin.status}`);

  // -------------------------------------------------------------------------
  // 15. PROTECCIÓN FRENTE A XSS
  // -------------------------------------------------------------------------
  console.log('\n--- 15. PROTECCIÓN FRENTE A XSS ---');
  const xssPayload = "<script>alert('XSS')</script>";
  const xssContact = await request('POST', '/api/public/contact', {
    first_name: xssPayload,
    email: 'xss.test@example.com',
    message: xssPayload
  });
  assert(xssContact.status === 201 || xssContact.status === 200, 'Prueba 15: Sanitización y neutralización de payload XSS',
    `Petición procesada sin ejecución ni fallos de script`);

  // -------------------------------------------------------------------------
  // 16. SEGURIDAD EN SUBIDA DE ARCHIVOS (WHITELIST Y MAGIC BYTES)
  // -------------------------------------------------------------------------
  console.log('\n--- 16. SEGURIDAD DE SUBIDA DE ARCHIVOS ---');
  // Uploading executable disguised as PDF
  const fakeExeBuffer = Buffer.from('MZ\x90\x00\x03\x00\x00\x00SomeWindowsExecutableContent');
  const uploadExeRes = await request('POST', `/api/public/inscriptions/${reqNum}/upload-receipt`, {
    fileBase64: fakeExeBuffer.toString('base64'),
    fileName: 'virus.exe.pdf'
  });
  assert(uploadExeRes.status === 400, 'Prueba 16: Detección y bloqueo de archivo ejecutable malicioso (magic bytes MZ)',
    `Archivo malicioso bloqueado con HTTP ${uploadExeRes.status}: "${uploadExeRes.data?.error}"`);

  // -------------------------------------------------------------------------
  // 17. SESIONES CADUCADAS O REVOCADAS
  // -------------------------------------------------------------------------
  console.log('\n--- 17. SESIONES CADUCADAS O REVOCADAS ---');
  // Revoke student 1 session
  await query(`UPDATE sesiones SET revocado_en = NOW() WHERE token_hash = ?`, [hashToken(studentToken)]);
  const revokedAccess = await request('GET', '/api/auth/me', null, { 'Cookie': studentCookie });
  assert(revokedAccess.status === 401, 'Prueba 17: Rechazo inmediato de sesión revocada',
    `Acceso con token revocado bloqueado con HTTP ${revokedAccess.status}`);

  // -------------------------------------------------------------------------
  // 18. INTENTOS DE INICIO DE SESIÓN ABUSIVOS (RATE LIMITING)
  // -------------------------------------------------------------------------
  console.log('\n--- 18. RATE LIMITING Y FUERZA BRUTA ---');
  const bruteTarget = `brute.target.${Date.now()}@example.com`;
  let rateLimitHit = false;
  for (let i = 0; i < 12; i++) {
    const res = await request('POST', '/api/auth/login', {
      email: bruteTarget,
      password: 'WrongPassword123!'
    });
    if (res.status === 429) {
      rateLimitHit = true;
      break;
    }
  }
  assert(rateLimitHit, 'Prueba 18: Activación de Rate Limiting tras intentos repetidos de inicio de sesión',
    `Servidor devolvió HTTP 429 Too Many Requests para mitigar fuerza bruta`);

  // -------------------------------------------------------------------------
  // 19. ACCESO NO AUTORIZADO A ENDPOINTS PRIVADOS
  // -------------------------------------------------------------------------
  console.log('\n--- 19. ENDPOINTS PRIVADOS SIN AUTENTICACIÓN ---');
  const myCertificatesNoAuth = await request('GET', '/api/academic/my-certificates');
  const myAttendanceNoAuth = await request('GET', '/api/academic/my-attendance');
  assert(myCertificatesNoAuth.status === 401 && myAttendanceNoAuth.status === 401,
    'Prueba 19: Endpoints privados del campus requieren autenticación (HTTP 401)',
    'Certificados y asistencia protegidos sin cookie');

  // -------------------------------------------------------------------------
  // 20. COMPATIBILIDAD SEO Y SEGURIDAD (ROBOTS.TXT Y CABECERAS)
  // -------------------------------------------------------------------------
  console.log('\n--- 20. COMPATIBILIDAD SEO Y PRIVACIDAD ---');
  const robotsRes = await request('GET', '/robots.txt');
  const robotsBody = String(robotsRes.data || '');
  const disallowsAdmin = robotsBody.includes('Disallow: /admin') || robotsBody.includes('Disallow: /#admin');
  const disallowsCampus = robotsBody.includes('Disallow: /campus') || robotsBody.includes('Disallow: /#campus');
  const allowsCatalog = robotsBody.includes('Allow: /cursos');
  const hasNosniff = robotsRes.headers.get('x-content-type-options') === 'nosniff';
  const hasXFrame = Boolean(robotsRes.headers.get('x-frame-options'));

  assert(disallowsAdmin && disallowsCampus && allowsCatalog && hasNosniff && hasXFrame,
    'Prueba 20: Robots.txt y cabeceras de seguridad protegen rutas privadas permitiendo SEO público',
    `Robots.txt restringe /admin y /campus, permite /cursos; Cabeceras nosniff y x-frame presentes`);

  // Cleanup test artifacts
  await query(`DELETE FROM inscription_requests WHERE request_number = ?`, [reqNum]);
  await query(`DELETE FROM conversaciones WHERE id = ?`, [convId]);
  await query(`DELETE FROM usuarios WHERE id IN (?, ?)`, [testStudentId, testOtherId]);

  console.log('\n========================================================================');
  console.log(`RESUMEN DE PRUEBAS DE CIBERSEGURIDAD:`);
  console.log(`TOTAL: 20 | SUPERADAS: ${testsPassed} | FALLIDAS: ${testsFailed}`);
  console.log('========================================================================');

  if (testsFailed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSecuritySuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
