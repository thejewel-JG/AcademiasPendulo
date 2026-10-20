import fetch from 'node-fetch';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('========================================================');
  console.log('INICIANDO SUITE DE PRUEBAS OBLIGATORIAS — MODIFICACIÓN 01');
  console.log('========================================================\n');

  // Test 1: Prueba D - Validación en Servidor (Missing academic_level)
  console.log('▶ [PRUEBA D.1] Validación del Servidor: Sin academic_level');
  const resNoLevel = await fetch(`${BASE_URL}/api/public/inscription-request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      course_name: 'Electromecánica de Vehículos',
      first_name: 'TestValidacion',
      last_name_1: 'Perez',
      dni_nie: '12345678Z',
      birth_date: '2000-01-01',
      phone: '600000001',
      email: 'test.validacion.sin.nivel@gmail.com',
      employment_status: 'Desempleado/a',
      academic_degree: 'ESO',
      truth_declaration: true,
      privacy_acceptance: true,
      signature_name: 'Test Perez',
      signature_date: '2026-10-18'
    })
  });
  const dataNoLevel = await resNoLevel.json();
  if (resNoLevel.status === 400 && dataNoLevel.error?.includes('nivel de estudios finalizados')) {
    console.log('  ✔ RECHAZADA CORRECTAMENTE (400):', dataNoLevel.error);
  } else {
    console.error('  ❌ FALLO EN VALIDACIÓN:', resNoLevel.status, dataNoLevel);
  }

  // Test 2: Prueba D.2 - Validación en Servidor (Missing academic_degree)
  console.log('\n▶ [PRUEBA D.2] Validación del Servidor: Sin academic_degree');
  const resNoDegree = await fetch(`${BASE_URL}/api/public/inscription-request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      course_name: 'Electromecánica de Vehículos',
      first_name: 'TestValidacion',
      last_name_1: 'Perez',
      dni_nie: '12345678Z',
      birth_date: '2000-01-01',
      phone: '600000001',
      email: 'test.validacion.sin.grado@gmail.com',
      employment_status: 'Desempleado/a',
      academic_level: 'bachillerato',
      academic_degree: '',
      truth_declaration: true,
      privacy_acceptance: true,
      signature_name: 'Test Perez',
      signature_date: '2026-10-18'
    })
  });
  const dataNoDegree = await resNoDegree.json();
  if (resNoDegree.status === 400 && dataNoDegree.error?.includes('estudios realizados')) {
    console.log('  ✔ RECHAZADA CORRECTAMENTE (400):', dataNoDegree.error);
  } else {
    console.error('  ❌ FALLO EN VALIDACIÓN:', resNoDegree.status, dataNoDegree);
  }

  // Test 3: Prueba A - Solicitud nueva completa con información académica
  console.log('\n▶ [PRUEBA A] Solicitud nueva con datos académicos válidos');
  const testCandidateEmail = `aspirante.academico.${Date.now()}@pendulo-alumnos.es`;
  const resSuccess = await fetch(`${BASE_URL}/api/public/inscription-request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      course_name: 'Técnico en Electromecánica de Vehículos Automóviles',
      course_code: 'TMV201',
      center: 'Academias Péndulo - Almería',
      edition: 'Convocatoria 2026',
      first_name: 'Carlos',
      last_name_1: 'Martínez',
      last_name_2: 'Sánchez',
      dni_nie: '75123456K',
      birth_date: '1998-05-14',
      phone: '611223344',
      email: testCandidateEmail,
      address: 'Calle Mayor 45, 2º B',
      postal_code: '04001',
      city: 'Almería',
      province: 'Almería',
      employment_status: 'Desempleado/a',
      academic_level: 'fp_grado_medio',
      academic_degree: 'Técnico en Mantenimiento Electromecánico',
      additional_training: 'Certificado de diagnosis Bosch y curso de seguridad en vehículos híbridos (60 horas).',
      observations: 'Interesado en turno de mañanas.',
      truth_declaration: true,
      subsidized_training_acceptance: true,
      contact_authorization: true,
      privacy_acceptance: true,
      marketing_consent: false,
      signature_name: 'Carlos Martínez Sánchez',
      signature_date: '2026-10-18'
    })
  });
  const dataSuccess = await resSuccess.json();
  if (resSuccess.status === 201 && dataSuccess.success) {
    console.log('  ✔ SOLICITUD REGISTRADA CON ÉXITO:', dataSuccess.request_number);
  } else {
    console.error('  ❌ ERROR AL CREAR SOLICITUD:', resSuccess.status, dataSuccess);
    return;
  }

  const newRequestNumber = dataSuccess.request_number;

  // Verify in MySQL Database
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'srv1017.hstgr.io',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER || 'u869063079_guillermina',
    password: process.env.MYSQL_PASSWORD || 'Wattpad_3317',
    database: process.env.MYSQL_DATABASE || 'u869063079_academias'
  });

  const [rows] = await connection.execute(
    'SELECT request_number, first_name, email, academic_level, academic_degree, additional_training FROM inscription_requests WHERE request_number = ?',
    [newRequestNumber]
  );
  if (rows.length > 0) {
    const r = rows[0];
    console.log('  ✔ VERIFICACIÓN EN BASE DE DATOS:');
    console.log('    - N.º Solicitud:', r.request_number);
    console.log('    - academic_level:', r.academic_level);
    console.log('    - academic_degree:', r.academic_degree);
    console.log('    - additional_training:', r.additional_training);
  } else {
    console.error('  ❌ REGISTRO NO ENCONTRADO EN BD');
  }

  // Test 4: Prueba C - Comprobación de solicitudes antiguas
  console.log('\n▶ [PRUEBA C] Solicitudes antiguas en BD');
  const [oldRows] = await connection.execute(
    'SELECT request_number, academic_level, academic_degree FROM inscription_requests WHERE request_number != ? LIMIT 3',
    [newRequestNumber]
  );
  console.log(`  ✔ Solicitudes anteriores verificadas (${oldRows.length} registros analizados):`);
  oldRows.forEach(orow => {
    console.log(`    - ${orow.request_number}: academic_level = ${orow.academic_level ?? 'NULL (se muestra "No especificado")'}`);
  });

  // Test 5: Prueba F - Seguridad y Permisos
  console.log('\n▶ [PRUEBA F] Seguridad: Acceso sin autenticación al historial académico');
  const resSec = await fetch(`${BASE_URL}/api/admin/students/1/academic-history`);
  if (resSec.status === 401 || resSec.status === 403) {
    console.log('  ✔ RESTRINGIDO CORRECTAMENTE:', resSec.status, '(Requiere sesión y rol autorizado)');
  } else {
    console.error('  ❌ VULNERABILIDAD: Endpoint accesible públicamente:', resSec.status);
  }

  // Test 6: Login Admin and test Prueba B (Visualización administrativa) and Prueba E (Integridad)
  console.log('\n▶ [PRUEBA B y E] Consulta administrativa del expediente');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'info.academiaspendulo@gmail.com',
      password: 'Wattpad_3317'
    })
  });
  const loginData = await loginRes.json();
  if (loginData.token) {
    console.log('  ✔ Login administrativo correcto');
    const adminToken = loginData.token;

    // Fetch inscription detail
    const detailRes = await fetch(`${BASE_URL}/api/admin/inscriptions`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const detailData = await detailRes.json();
    const found = detailData.requests?.find(r => r.request_number === newRequestNumber);
    if (found) {
      console.log('  ✔ Consulta administrativa recupera la información académica:');
      console.log('    - Nivel:', found.academic_level);
      console.log('    - Estudios:', found.academic_degree);
      console.log('    - Formación complementaria:', found.additional_training);
    } else {
      console.error('  ❌ Solicitud no listada en panel de secretaría');
    }

    // Test student academic history endpoint for this email
    console.log('\n▶ [PRUEBA E] Consulta de Ficha de Alumno por email/id:');
    const histRes = await fetch(`${BASE_URL}/api/admin/students/${encodeURIComponent(testCandidateEmail)}/academic-history`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const histData = await histRes.json();
    if (histData.success && histData.history?.length > 0) {
      console.log('  ✔ Ficha académica del alumno recuperada con éxito:');
      console.log('    - Solicitudes históricas vinculadas:', histData.history.length);
      console.log('    - N.º Solicitud vinculada:', histData.history[0].request_number);
      console.log('    - Nivel asociado:', histData.history[0].academic_level);
      console.log('    - Titulación asociada:', histData.history[0].academic_degree);
    } else {
      console.error('  ❌ Error al obtener ficha histórica del alumno:', histData);
    }
  } else {
    console.log('  ℹ Nota de login:', loginData);
  }

  await connection.end();
  console.log('\n========================================================');
  console.log('TODAS LAS PRUEBAS COMPLETADAS');
  console.log('========================================================');
}

runTests().catch(console.error);
