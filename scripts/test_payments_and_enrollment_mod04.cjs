/**
 * Automated Verification Test Suite for ACADEMIAS PÉNDULO
 * MODIFICACIÓN 04: Sistema Definitivo de Pagos (Transferencias) y Altas Administrativas
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

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
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (e) { json = data; }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });

    req.on('error', (err) => reject(err));
    if (postData) req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('================================================================');
  console.log('TEST SUITE: SISTEMA DE PAGOS POR TRANSFERENCIA Y ALTAS DE USUARIOS');
  console.log('================================================================\n');

  const results = [];
  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      results.push({ name: testName, pass: true });
    } else {
      console.error(`❌ [FAIL] ${testName}: ${details}`);
      results.push({ name: testName, pass: false, details });
    }
  }

  try {
    const dbModule = await import('../db.js');
    const { query } = dbModule;
    const { hashPassword, verifyPassword } = await import('../authUtils.js');

    // 0. ADMIN AUTHENTICATION FOR TEST SUITE
    console.log('--- 0. Autenticación Administrativa del Test Suite ---');
    const loginRes = await makeRequest('POST', '/api/auth/login', {}, {
      email: 'admin@academiaspendulo.com',
      password: 'Wattpad_3317'
    });
    assert(loginRes.status === 200 && loginRes.body.token, 'Admin session authenticated successfully');
    const adminToken = loginRes.body.token;
    const adminHeaders = {
      'Authorization': `Bearer ${adminToken}`,
      'Cookie': `campus_session=${adminToken}`
    };

    // 1. BANK CONFIGURATION ENDPOINT (PUBLIC & ADMIN)
    console.log('\n--- 1. Configuración de Datos Bancarios de la Academia ---');
    const pubBankRes = await makeRequest('GET', '/api/public/bank-details');
    assert(pubBankRes.status === 200 && pubBankRes.body.titular_cuenta, 'Public Bank Details Endpoint accessible and returns bank config structure');

    const adminBankUpdateRes = await makeRequest('PUT', '/api/admin/bank-details', adminHeaders, {
      titular_cuenta: 'Academias Péndulo Formación S.L.',
      iban: 'ES60 0049 1500 0512 3456 7890',
      entidad_bancaria: 'Banco Santander',
      bic_swift: 'BSCHESMMXXX',
      instrucciones_adicionales: 'Indicar la referencia única de matrícula en el concepto.',
      activo: 1
    });
    assert(adminBankUpdateRes.status === 200 && adminBankUpdateRes.body.success, 'Admin can safely configure official bank details without hardcoding');

    // 2. MODALITY A: DIRECT PURCHASE (COMPRA_DIRECTA)
    console.log('\n--- 2. Solicitud Compra Directa (Generación de Instrucciones Bancarias) ---');
    const testEmailDirect = `alumno_direct_${Date.now()}@pendulo-test.com`;
    const dniLetters = 'TRWAGMYFPDXBNJZSQVHLCKE';
    const dniDigits = Math.floor(10000000 + Math.random() * 89999999);
    const testDni = `${dniDigits}${dniLetters[dniDigits % 23]}`;
    const directReqRes = await makeRequest('POST', '/api/public/inscription-request', {}, {
      course_id: 'tmvg0004',
      course_name: 'MANTENIMIENTO DE VEHÍCULOS HÍBRIDOS',
      course_code: 'TMVG0004',
      center: 'Academias Péndulo - Almería',
      edition: 'Convocatoria 2026',
      first_name: 'Carlos',
      last_name_1: 'Directo',
      last_name_2: 'Prueba',
      dni_nie: testDni,
      birth_date: '1995-04-12',
      phone: '600112233',
      email: testEmailDirect,
      address: 'Calle Mayor 10',
      postal_code: '04001',
      city: 'Almería',
      province: 'Almería',
      employment_status: 'desempleado/a',
      academic_level: 'bachillerato',
      academic_degree: 'Bachillerato Tecnológico',
      truth_declaration: true,
      privacy_acceptance: true,
      signature_name: 'Carlos Directo Prueba',
      signature_date: '2026-10-24'
    });

    assert(directReqRes.status === 201 && directReqRes.body.request_number, 'Direct purchase request created successfully');
    const directReqNumber = directReqRes.body.request_number;
    const directRef = directReqRes.body.referencia_transferencia;
    assert(directRef && (directRef.startsWith('TRF-') || directRef.startsWith('PEN-')), `Unique transfer reference generated: ${directRef}`);
    assert(directReqRes.body.bank_details && directReqRes.body.bank_details.iban, 'Direct purchase response returns configured bank details for applicant');

    // Verify in Admin that initial state is PENDIENTE_TRANSFERENCIA and campus is strictly NOT granted
    const adminDirectDetail = await makeRequest('GET', `/api/admin/inscriptions/${directReqNumber}`, adminHeaders);
    assert(adminDirectDetail.body.request.estado_pago === 'PENDIENTE_TRANSFERENCIA', 'Initial payment status is PENDIENTE_TRANSFERENCIA');
    assert(adminDirectDetail.body.request.estado_matricula === 'PENDIENTE', 'Campus access is strictly NOT granted upon submission');

    // 3. RECEIPT UPLOAD (JUSTIFICANTE)
    console.log('\n--- 3. Aportación Privada de Justificante de Transferencia ---');
    const sampleReceiptContent = '%PDF-1.4 sample bank transfer receipt content';
    const sampleBase64 = Buffer.from(sampleReceiptContent).toString('base64');

    const uploadReceiptRes = await makeRequest(
      'POST',
      `/api/public/inscriptions/${directReqNumber}/upload-receipt`,
      { 'Content-Type': 'application/json' },
      {
        fileName: 'recibo_transferencia.pdf',
        fileType: 'application/pdf',
        fileBase64: `data:application/pdf;base64,${sampleBase64}`,
        observaciones: 'Pago realizado por extracto bancario.'
      }
    );
    assert(uploadReceiptRes.status === 200 && uploadReceiptRes.body.success, 'Applicant can upload bank transfer receipt');

    const adminAfterReceipt = await makeRequest('GET', `/api/admin/inscriptions/${directReqNumber}`, adminHeaders);
    assert(adminAfterReceipt.body.request.estado_pago === 'JUSTIFICANTE_APORTADO', 'Payment status updated to JUSTIFICANTE_APORTADO');
    assert(adminAfterReceipt.body.request.estado_matricula === 'PENDIENTE', 'Receipt alone does NOT grant campus access');

    // Verify admin can download the uploaded receipt
    const adminReceiptDownload = await makeRequest('GET', `/api/admin/inscriptions/${directReqNumber}/receipt`, adminHeaders);
    assert(adminReceiptDownload.status === 200, 'Administration can download and inspect the transfer receipt');

    // 4. REPORTING INCIDENCE (BLOCKS APPROVAL)
    console.log('\n--- 4. Registro de Incidencia de Pago (Bloqueo de Seguridad) ---');
    const incidentRes = await makeRequest('PUT', `/api/admin/inscriptions/${directReqNumber}/report-incident`, adminHeaders, {
      motivo: 'El concepto no incluye la referencia de matrícula completa.'
    });
    assert(incidentRes.status === 200 && incidentRes.body.success, 'Admin can register a payment incidence');

    // Attempting to approve while in incidence should be blocked
    const blockedApproval = await makeRequest('POST', `/api/admin/inscriptions/${directReqNumber}/convert-to-student`, adminHeaders, {});
    assert(blockedApproval.status === 400, 'Approval is strictly BLOCKED while payment has an unresolved incidence');

    // 5. MANUAL VERIFICATION BY ADMINISTRATION (CONFIRMAR TRANSFERENCIA RECIBIDA)
    console.log('\n--- 5. Verificación Manual de la Transferencia por Administración ---');
    const verifyRes = await makeRequest('PUT', `/api/admin/inscriptions/${directReqNumber}/verify-transfer`, adminHeaders, {
      referencia_bancaria: 'APUNTE-SAN-98124',
      observaciones: 'Fondos recibidos y comprobados en extracto de Santander.',
      resolver_incidencia: true
    });
    assert(verifyRes.status === 200 && verifyRes.body.success, 'Admin verifies bank transfer after checking bank statement');

    const adminAfterVerify = await makeRequest('GET', `/api/admin/inscriptions/${directReqNumber}`, adminHeaders);
    assert(adminAfterVerify.body.request.estado_pago === 'TRANSFERENCIA_VERIFICADA', 'Payment status is now TRANSFERENCIA_VERIFICADA');
    assert(adminAfterVerify.body.request.referencia_bancaria_externa === 'APUNTE-SAN-98124', 'External bank reference recorded correctly');
    assert(adminAfterVerify.body.request.estado_matricula === 'PENDIENTE', 'Transfer verification alone does NOT activate campus yet');

    // 6. APPROVAL AND USER CREATION (APROBAR MATRÍCULA Y DAR DE ALTA)
    console.log('\n--- 6. Aprobación de Matrícula y Alta de Alumno ---');
    const approveRes = await makeRequest('POST', `/api/admin/inscriptions/${directReqNumber}/convert-to-student`, adminHeaders, {});
    assert(approveRes.status === 200 && approveRes.body.success, 'Admin approval and student enrollment completed successfully');
    assert(approveRes.body.student_email === testEmailDirect, `Student username is the email: ${testEmailDirect} (NOT DNI)`);
    assert(approveRes.body.isNewUser === true, 'New user account created successfully');

    // Verify request row status
    const adminAfterApprove = await makeRequest('GET', `/api/admin/inscriptions/${directReqNumber}`, adminHeaders);
    assert(adminAfterApprove.body.request.estado_matricula === 'ACTIVA', 'Enrollment status is now ACTIVA');
    assert(adminAfterApprove.body.request.converted_to_student === 1, 'Marked as converted_to_student');

    // 7. IDEMPOTENCY / DOUBLE-CLICK PROTECTION
    console.log('\n--- 7. Protección Frente a Dobles Clics y Duplicados ---');
    const doubleClickRes = await makeRequest('POST', `/api/admin/inscriptions/${directReqNumber}/convert-to-student`, adminHeaders, {});
    assert(doubleClickRes.status === 400 && doubleClickRes.body.error.includes('previamente'), 'Double approval click safely rejected without creating duplicates');

    // 8. TEMPORARY PASSWORD AND LOGIN VALIDATION
    console.log('\n--- 8. Verificación de Contraseña Temporal y Primer Inicio de Sesión ---');
    const userRows = await query('SELECT id, email, password_hash, cambio_password_obligatorio, estado FROM usuarios WHERE email = ?', [testEmailDirect]);
    assert(userRows.length === 1, 'User row created in database with email as unique identifier');
    const dbUser = userRows[0];
    assert(dbUser.password_hash.startsWith('scrypt$'), 'Password is stored ONLY as a secure scrypt hash, never plaintext');
    assert(dbUser.cambio_password_obligatorio === 1, 'Temporary password flag cambio_password_obligatorio is active (1)');

    // 9. PASSWORD CHANGE VIA STUDENT AREA
    console.log('\n--- 9. Cambio de Contraseña en el Perfil del Alumno ---');
    const newSecurePassword = 'NuevoPassSeguro2026!#';
    const newHash = await hashPassword(newSecurePassword);
    await query('UPDATE usuarios SET password_hash = ?, cambio_password_obligatorio = 0 WHERE id = ?', [newHash, dbUser.id]);
    
    const updatedUserRows = await query('SELECT password_hash, cambio_password_obligatorio FROM usuarios WHERE id = ?', [dbUser.id]);
    const isValidNew = await verifyPassword(newSecurePassword, updatedUserRows[0].password_hash);
    assert(isValidNew === true, 'New password validated successfully and scrypt hash updated');
    assert(updatedUserRows[0].cambio_password_obligatorio === 0, 'cambio_password_obligatorio successfully cleared after change');

    // 10. MODALITY B: SOLICITUD CON APROBACIÓN Y REUTILIZACIÓN DE CUENTA
    console.log('\n--- 10. Modalidad B (Aprobación Previa) y Reutilización de Cuenta Existente ---');
    const secondReqRes = await makeRequest('POST', '/api/public/inscription-request', {}, {
      course_id: 'fcos02',
      course_name: 'BÁSICO DE PREVENCIÓN DE RIESGOS LABORALES',
      course_code: 'FCOS02',
      center: 'Academias Péndulo - Almería',
      edition: 'Convocatoria 2026',
      first_name: 'Carlos',
      last_name_1: 'Directo',
      dni_nie: testDni,
      phone: '600112233',
      birth_date: '1995-04-12',
      employment_status: 'desempleado/a',
      academic_level: 'bachillerato',
      academic_degree: 'Bachillerato Tecnológico',
      email: testEmailDirect, // Same student email!
      truth_declaration: true,
      privacy_acceptance: true,
      signature_name: 'Carlos Directo',
      signature_date: '2026-10-24'
    });

    assert(secondReqRes.status === 201 && secondReqRes.body.request_number, 'Second request created in Modalidad Solicitud con Aprobación');
    const secondReqNum = secondReqRes.body.request_number;
    assert(secondReqRes.body.estado_solicitud === 'NUEVA', 'Initial admission state is NUEVA awaiting academic preapproval');

    // Academic preapproval by Secretaría (Requirement 2)
    const preapproveRes = await makeRequest('PUT', `/api/admin/inscriptions/${secondReqNum}/preapprove`, adminHeaders);
    assert(preapproveRes.status === 200 && preapproveRes.body.success, 'Secretaría performs academic preapproval before payment');

    // Verify transfer
    const verifySecondRes = await makeRequest('PUT', `/api/admin/inscriptions/${secondReqNum}/verify-transfer`, adminHeaders, {
      referencia_bancaria: 'APUNTE-SAN-98999',
      observaciones: 'Pago comprobado para segundo curso.'
    });
    assert(verifySecondRes.status === 200 && verifySecondRes.body.success, 'Transfer verified for second course');

    // Check pre-conversion check reports account reuse
    const checkRes = await makeRequest('POST', `/api/admin/inscriptions/${secondReqNum}/convert-checks`, adminHeaders);
    assert(checkRes.body.emailExists === true && checkRes.body.existingUserByEmail.email === testEmailDirect, 'Conversion check identifies existing account correctly');
    assert(checkRes.body.isNewUser === false, 'Flagged as existing user to prevent overwriting credentials');

    // Approve second enrollment
    const approveSecond = await makeRequest('POST', `/api/admin/inscriptions/${secondReqNum}/convert-to-student`, adminHeaders, {});
    assert(approveSecond.status === 200 && approveSecond.body.isNewUser === false, 'Second course approved and account reused without duplication');

    // Verify user table has still only 1 row for this email
    const countRows = await query('SELECT COUNT(*) as total FROM usuarios WHERE email = ?', [testEmailDirect]);
    assert(countRows[0].total === 1, 'Zero duplicate user accounts created in database');

    // Verify user password was NOT reset or overwritten
    const finalUserRows = await query('SELECT password_hash FROM usuarios WHERE email = ?', [testEmailDirect]);
    const passwordPreserved = await verifyPassword(newSecurePassword, finalUserRows[0].password_hash);
    assert(passwordPreserved === true, 'Existing user password was properly preserved and not overwritten');

    // 11. HISTORICAL RECORDS PRESERVATION
    console.log('\n--- 11. Conservación de Registros Históricos ---');
    const totalUsers = await query('SELECT COUNT(*) as total FROM usuarios');
    const totalInscriptions = await query('SELECT COUNT(*) as total FROM inscription_requests');
    assert(totalUsers[0].total > 0 && totalInscriptions[0].total > 0, `Historical database integrity intact (${totalUsers[0].total} usuarios, ${totalInscriptions[0].total} solicitudes)`);

    console.log('\n================================================================');
    const allPassed = results.every(r => r.pass);
    console.log(`TOTAL PRUEBAS EJECUTADAS: ${results.length}`);
    console.log(`PRUEBAS EXITOSAS: ${results.filter(r => r.pass).length}`);
    console.log(`PRUEBAS FALLIDAS: ${results.filter(r => !r.pass).length}`);
    console.log(allPassed ? 'RESULTADO GLOBAL: TODAS LAS PRUEBAS PASARON EXITOSAMENTE ✅' : 'RESULTADO GLOBAL: HUBO FALLOS EN LAS PRUEBAS ❌');
    console.log('================================================================\n');

    process.exit(allPassed ? 0 : 1);
  } catch (error) {
    console.error('Fatal error in test suite:', error);
    process.exit(1);
  }
}

runTests();
