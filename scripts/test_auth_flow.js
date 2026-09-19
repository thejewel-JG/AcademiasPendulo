import http from 'http';
import dotenv from 'dotenv';
import { decryptPayload } from '../authUtils.js';

dotenv.config();

const BASE_URL = 'http://localhost:3000';

function makeRequest(path, method = 'GET', body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers
    };

    let reqBody = null;
    if (body) {
      reqBody = JSON.stringify(body);
      reqHeaders['Content-Length'] = Buffer.byteLength(reqBody);
    }

    const req = http.request(url, { method, headers: reqHeaders }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });

    req.on('error', reject);
    if (reqBody) req.write(reqBody);
    req.end();
  });
}

async function runAuthFlowTests() {
  console.log(`\n🧪 INICIANDO PRUEBAS DE AUTENTICACIÓN Y SEGURIDAD...\n`);

  try {
    // 1. Login as Administrator
    console.log(`1️⃣  Probando inicio de sesión como ADMINISTRADOR inicial...`);
    const adminLoginRes = await makeRequest('/api/auth/login', 'POST', {
      email: 'admin@academiaspendulo.com',
      password: 'AdminPendulo2026!'
    });

    if (adminLoginRes.status !== 200 || !adminLoginRes.body.token) {
      console.error(`❌ Falló inicio de sesión de admin:`, adminLoginRes.body);
      process.exit(1);
    }

    const adminToken = adminLoginRes.body.token;
    const adminHeaders = { 'Authorization': `Bearer ${adminToken}` };
    console.log(`  ✅ Login exitoso. Rol activo: ${adminLoginRes.body.activeRole}`);

    // 2. Create Student with Group Assignment
    console.log(`\n2️⃣  Creando alumno y encolando correo cifrado AES-256-GCM...`);
    const studentEmail = `alumno.test.${Date.now()}@pendulo.es`;
    const createStudentRes = await makeRequest('/api/admin/users', 'POST', {
      nombre: 'Mateo',
      apellidos: 'García Ruiz',
      email: studentEmail,
      role: 'ALUMNO',
      grupo_id: null
    }, adminHeaders);

    if (createStudentRes.status !== 201 || !createStudentRes.body.success) {
      console.error(`❌ Falló creación de alumno:`, createStudentRes.body);
      process.exit(1);
    }
    const studentId = createStudentRes.body.user.id;
    console.log(`  ✅ Alumno creado con éxito. ID: ${studentId}`);

    // 3. Test Duplicate Email Prevention
    console.log(`\n3️⃣  Probando intento de duplicación de correo (${studentEmail})...`);
    const dupRes = await makeRequest('/api/admin/users', 'POST', {
      nombre: 'Mateo Duplicado',
      email: studentEmail,
      role: 'ALUMNO'
    }, adminHeaders);

    if (dupRes.status !== 409 || dupRes.body.code !== 'EMAIL_EXISTS') {
      console.error(`❌ Falló detección de correo duplicado:`, dupRes.body);
      process.exit(1);
    }
    console.log(`  ✅ Rechazado correctamente (409 Conflict con sugerencia de actualización).`);

    // 4. Query outbox task and decrypt temp password
    console.log(`\n4️⃣  Verificando la cola de envíos outbox cifrada en DB...`);
    const dbModule = await import('../db.js');
    const outboxRows = await dbModule.query(`
      SELECT contenido_ref FROM cola_correos WHERE destinatario = ? ORDER BY creado_en DESC LIMIT 1
    `, [studentEmail]);

    if (!outboxRows || outboxRows.length === 0) {
      console.error(`❌ No se encontró la tarea en cola_correos.`);
      process.exit(1);
    }

    const encryptedObj = outboxRows[0].contenido_ref;
    const decryptedPayload = decryptPayload(encryptedObj);
    const tempPass = decryptedPayload.tempPassword;

    console.log(`  ✅ Contraseña temporal cifrada descifrada con éxito: [${tempPass}]`);

    // 5. Login as Student with Temp Password & Test Forced Password Reset
    console.log(`\n5️⃣  Iniciando sesión como alumno con contraseña temporal...`);
    const studentLoginRes = await makeRequest('/api/auth/login', 'POST', {
      email: studentEmail,
      password: tempPass
    });

    if (studentLoginRes.status !== 200 || !studentLoginRes.body.mustChangePassword) {
      console.error(`❌ Falló verificación de cambio obligatorio de clave:`, studentLoginRes.body);
      process.exit(1);
    }
    const studentToken = studentLoginRes.body.token;
    const studentHeaders = { 'Authorization': `Bearer ${studentToken}` };
    console.log(`  ✅ Sesión de alumno iniciada. Cambio de clave obligatorio detectado: TRUE`);

    // 6. Test Blocking Academic/Admin Endpoints Before Password Change
    console.log(`\n6️⃣  Verificando bloqueo de acceso a paneles antes del cambio de clave...`);
    const blockedRes = await makeRequest('/api/admin/users', 'GET', null, studentHeaders);
    if (blockedRes.status !== 403 || !blockedRes.body.mustChangePassword) {
      console.error(`❌ El servidor no bloqueó al usuario con contraseña temporal:`, blockedRes.body);
      process.exit(1);
    }
    console.log(`  ✅ Servidor devolvió 403 Forbidden correctamente.`);

    // 7. Change Student Password
    console.log(`\n7️⃣  Cambiando contraseña del alumno por una definitiva...`);
    const newPass = 'NuevaClaveAlumno2026!';
    const changePassRes = await makeRequest('/api/auth/change-password', 'POST', {
      oldPassword: tempPass,
      newPassword: newPass
    }, studentHeaders);

    if (changePassRes.status !== 200 || !changePassRes.body.success) {
      console.error(`❌ Falló cambio de contraseña:`, changePassRes.body);
      process.exit(1);
    }
    console.log(`  ✅ Contraseña cambiada exitosamente.`);

    // 8. Verify Student Access to Admin API is Forbidden even after password change
    console.log(`\n8️⃣  Verificando que rol ALUMNO recibe 403 Forbidden al acceder a /api/admin/users...`);
    const adminCheckRes = await makeRequest('/api/admin/users', 'GET', null, studentHeaders);
    if (adminCheckRes.status !== 403) {
      console.error(`❌ Rol alumno pudo acceder a ruta de admin:`, adminCheckRes.body);
      process.exit(1);
    }
    console.log(`  ✅ Acceso denegado a /api/admin/users con 403 Forbidden (Autorización estricta).`);

    // 9. Test Protection against Deactivating Last Admin
    console.log(`\n9️⃣  Probando protección contra desactivación del único administrador activo...`);
    const adminUserId = adminLoginRes.body.user.id;
    const deactRes = await makeRequest(`/api/admin/users/${adminUserId}/status`, 'PUT', {
      estado: 'INACTIVO'
    }, adminHeaders);

    if (deactRes.status !== 400 || !deactRes.body.error.includes('único administrador')) {
      console.error(`❌ Se permitió desactivar al único admin activo:`, deactRes.body);
      process.exit(1);
    }
    console.log(`  ✅ Desactivación rechazada correctamente (400 Bad Request).`);

    console.log(`\n🎉 ¡TODAS LAS PRUEBAS DE AUTENTICACIÓN Y SEGURIDAD HAN PASADO CON ÉXITO!\n`);
    process.exit(0);

  } catch (err) {
    console.error(`\n❌ Error no controlado durante pruebas:`, err);
    process.exit(1);
  }
}

runAuthFlowTests();
