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

async function runAcademicAndContentTests() {
  console.log(`\n🧪 INICIANDO PRUEBAS DE GESTIÓN ACADÉMICA, MATERIALES Y COMUNICACIONES...\n`);

  try {
    const dbModule = await import('../db.js');

    // 1. Login as Administrator
    console.log(`1️⃣  Iniciando sesión como ADMINISTRADOR...`);
    const adminLoginRes = await makeRequest('/api/auth/login', 'POST', {
      email: 'admin@academiaspendulo.com',
      password: 'AdminPendulo2026!'
    });
    console.log('Admin login body:', adminLoginRes.body);
    const adminHeaders = { 'Authorization': `Bearer ${adminLoginRes.body.token}` };
    console.log(`  ✅ Login de Admin exitoso.`);

    // 2. Create Teachers and Groups
    console.log(`\n2️⃣  Creando Profesores y Grupos para pruebas...`);
    const teacher1Email = `profesor1.${Date.now()}@pendulo.es`;
    const teacher2Email = `profesor2.${Date.now()}@pendulo.es`;

    const t1Res = await makeRequest('/api/admin/users', 'POST', { nombre: 'Profesor 1', apellidos: 'Pérez', email: teacher1Email, role: 'PROFESOR' }, adminHeaders);
    const t2Res = await makeRequest('/api/admin/users', 'POST', { nombre: 'Profesor 2', apellidos: 'López', email: teacher2Email, role: 'PROFESOR' }, adminHeaders);

    if (t1Res.status !== 201 || !t1Res.body.user) {
      console.error(`❌ Falló creación de Profesor 1 (status ${t1Res.status}):`, t1Res.body);
      process.exit(1);
    }
    if (t2Res.status !== 201 || !t2Res.body.user) {
      console.error(`❌ Falló creación de Profesor 2 (status ${t2Res.status}):`, t2Res.body);
      process.exit(1);
    }

    const t1Id = t1Res.body.user.id;
    const t2Id = t2Res.body.user.id;

    const grp1Id = `grp-a-${Date.now()}`;
    const grp2Id = `grp-b-${Date.now()}`;

    await dbModule.query(`
      INSERT INTO grupos (id, especialidad_id, nombre, profesor_principal_id, estado)
      VALUES (?, 'tmvg0004', 'Grupo A - Híbridos', ?, 'ACTIVO'), (?, 'tmvg0004', 'Grupo B - Híbridos', ?, 'ACTIVO')
    `, [grp1Id, t1Id, grp2Id, t2Id]);

    console.log(`  ✅ Grupo A (Profesor 1: ${t1Id}) y Grupo B (Profesor 2: ${t2Id}) creados.`);

    // 3. Create Student 1 in Group A and test Group Switch Transaction
    console.log(`\n3️⃣  Matriculando Alumno 1 y probando cambio atómico de grupo...`);
    const student1Email = `alumno1.${Date.now()}@pendulo.es`;
    const s1Res = await makeRequest('/api/admin/users', 'POST', {
      nombre: 'Alumno Uno', email: student1Email, role: 'ALUMNO', grupo_id: grp1Id
    }, adminHeaders);

    if (s1Res.status !== 201 || !s1Res.body.user) {
      console.error(`❌ Falló la creación de Alumno 1 (status ${s1Res.status}):`, s1Res.body);
      process.exit(1);
    }
    const s1Id = s1Res.body.user.id;

    // Check active enrollment in Group A
    const active1 = await dbModule.query(`SELECT * FROM alumno_matricula_activa WHERE alumno_id = ?`, [s1Id]);
    if (active1.length !== 1) {
      console.error(`❌ El alumno 1 no posee exactamente 1 matrícula activa.`);
      process.exit(1);
    }
    console.log(`  ✅ Alumno 1 matriculado en Grupo A. Matrícula activa: ${active1[0].matricula_id}`);

    // Switch Alumno 1 to Group B
    const switchRes = await makeRequest('/api/admin/enrollments/switch-group', 'POST', {
      studentId: s1Id,
      newGroupId: grp2Id
    }, adminHeaders);

    if (switchRes.status !== 200 || !switchRes.body.success) {
      console.error(`❌ Falló cambio atómico de grupo:`, switchRes.body);
      process.exit(1);
    }

    const activeAfterSwitch = await dbModule.query(`SELECT * FROM alumno_matricula_activa WHERE alumno_id = ?`, [s1Id]);
    if (activeAfterSwitch.length !== 1 || activeAfterSwitch[0].matricula_id === active1[0].matricula_id) {
      console.error(`❌ Falló la transacción de cambio de grupo.`);
      process.exit(1);
    }
    console.log(`  ✅ Cambio a Grupo B ejecutado en transacción. Nueva matrícula activa: ${activeAfterSwitch[0].matricula_id}`);

    // 4. Test Teacher Scope & Materials Authorization
    console.log(`\n4️⃣  Probando permisos de publicación de materiales por Profesor vs Admin...`);
    
    // Login as Teacher 1
    const t1Outbox = await dbModule.query(`SELECT contenido_ref FROM cola_correos WHERE destinatario = ? LIMIT 1`, [teacher1Email]);
    const t1Pass = decryptPayload(t1Outbox[0].contenido_ref).tempPassword;
    const t1Login = await makeRequest('/api/auth/login', 'POST', { email: teacher1Email, password: t1Pass });
    const t1Headers = { 'Authorization': `Bearer ${t1Login.body.token}` };

    // Set Teacher 1 password so it can access API
    await makeRequest('/api/auth/change-password', 'POST', { oldPassword: t1Pass, newPassword: 'TeacherPass2026!' }, t1Headers);

    // Teacher 1 tries to publish material for Group B (Teacher 2's group) -> Should fail 403
    const forbiddenMatRes = await makeRequest('/api/materials', 'POST', {
      especialidad_id: 'tmvg0004', grupo_id: grp2Id, titulo: 'Material No Autorizado', tipo: 'PDF', estado: 'PUBLICADO'
    }, t1Headers);

    if (forbiddenMatRes.status !== 403) {
      console.error(`❌ Profesor 1 pudo publicar en el grupo del Profesor 2:`, forbiddenMatRes.body);
      process.exit(1);
    }
    console.log(`  ✅ Rechazado 403 Forbidden cuando el Profesor 1 intenta publicar en el grupo del Profesor 2.`);

    // 5. Test PDF Upload and Private Download Authorization
    console.log(`\n5️⃣  Probando subida de PDF y descarga autorizada...`);
    const samplePdfBase64 = Buffer.from('%PDF-1.4 sample content for academias pendulo').toString('base64');
    const uploadRes = await makeRequest('/api/materials/upload-pdf', 'POST', {
      filename: 'Manual_Diagnosis_Bosch.pdf',
      base64Data: samplePdfBase64
    }, adminHeaders);

    if (uploadRes.status !== 201 || !uploadRes.body.archivoId) {
      console.error(`❌ Falló subida de PDF:`, uploadRes.body);
      process.exit(1);
    }
    const archivoId = uploadRes.body.archivoId;
    console.log(`  ✅ PDF subido a almacenamiento privado. Archivo ID: ${archivoId}`);

    // Download PDF as Admin
    const dlAdminRes = await makeRequest(`/api/files/${archivoId}/download`, 'GET', null, adminHeaders);
    if (dlAdminRes.status !== 200 || !dlAdminRes.headers['content-type'].includes('pdf')) {
      console.error(`❌ Descarga de PDF falló para Admin:`, dlAdminRes.status);
      process.exit(1);
    }
    console.log(`  ✅ Descarga de PDF verificada para Admin (Content-Type: ${dlAdminRes.headers['content-type']}).`);

    // 6. Test Internal Communications & Privacy Isolation
    console.log(`\n6️⃣  Probando privacidad de dudas académicas entre alumnos...`);
    
    // Create Student 2
    const student2Email = `alumno2.${Date.now()}@pendulo.es`;
    const s2Res = await makeRequest('/api/admin/users', 'POST', {
      nombre: 'Alumno Dos', email: student2Email, role: 'ALUMNO', grupo_id: grp1Id
    }, adminHeaders);
    const s2Id = s2Res.body.user.id;

    const s1Outbox = await dbModule.query(`SELECT contenido_ref FROM cola_correos WHERE destinatario = ? LIMIT 1`, [student1Email]);
    const s1Pass = decryptPayload(s1Outbox[0].contenido_ref).tempPassword;
    const s1Login = await makeRequest('/api/auth/login', 'POST', { email: student1Email, password: s1Pass });
    const s1Headers = { 'Authorization': `Bearer ${s1Login.body.token}` };
    await makeRequest('/api/auth/change-password', 'POST', { oldPassword: s1Pass, newPassword: 'Student1Pass2026!' }, s1Headers);

    const s2Outbox = await dbModule.query(`SELECT contenido_ref FROM cola_correos WHERE destinatario = ? LIMIT 1`, [student2Email]);
    const s2Pass = decryptPayload(s2Outbox[0].contenido_ref).tempPassword;
    const s2Login = await makeRequest('/api/auth/login', 'POST', { email: student2Email, password: s2Pass });
    const s2Headers = { 'Authorization': `Bearer ${s2Login.body.token}` };
    await makeRequest('/api/auth/change-password', 'POST', { oldPassword: s2Pass, newPassword: 'Student2Pass2026!' }, s2Headers);

    // Student 1 creates academic doubt
    const convRes = await makeRequest('/api/communications/conversations', 'POST', {
      tipo: 'ACADEMICA',
      asunto: 'Duda sobre osciloscopio PicoScope',
      grupo_id: grp2Id,
      cuerpo: '¿Cómo se ajusta la escala de voltaje?'
    }, s1Headers);

    const convId = convRes.body.id;
    console.log(`  ✅ Duda creada por Alumno 1. ID: ${convId}`);

    // Student 2 tries to read Student 1's doubt -> Should fail 403
    const s2ReadRes = await makeRequest(`/api/communications/conversations/${convId}/messages`, 'GET', null, s2Headers);
    if (s2ReadRes.status !== 403) {
      console.error(`❌ Alumno 2 pudo ver la duda privada del Alumno 1:`, s2ReadRes.body);
      process.exit(1);
    }
    console.log(`  ✅ Acceso denegado a Alumno 2 con 403 Forbidden (Aislamiento de dudas verificado).`);

    console.log(`\n🎉 ¡TODAS LAS PRUEBAS DE GESTIÓN ACADÉMICA, MATERIALES Y COMUNICACIONES HAN PASADO CON ÉXITO!\n`);
    process.exit(0);

  } catch (err) {
    console.error(`\n❌ Error no controlado durante pruebas:`, err);
    process.exit(1);
  }
}

runAcademicAndContentTests();
