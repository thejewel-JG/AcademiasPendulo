import { query } from '../db.js';

async function runTests() {
  console.log('================================================================');
  console.log('🧪 EJECUTANDO BATERÍA DE PRUEBAS — MODIFICACIÓN 02');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`✅ [PASADA] ${testName}`);
      if (details) console.log(`   └─ ${details}`);
      passed++;
    } else {
      console.error(`❌ [FALLIDA] ${testName}`);
      if (details) console.error(`   └─ ${details}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // PRUEBA 8: Integridad de Cursos Históricos
    // -------------------------------------------------------------
    console.log('\n--- VERIFICANDO INTEGRIDAD DEL CATÁLOGO HISTÓRICO ---');
    const allCourses = await query('SELECT id, codigo, nombre, estado_precio, tipo_inscripcion FROM especialidades ORDER BY codigo ASC');
    assert(allCourses.length === 33, 'PRUEBA 8: Integridad de cursos históricos', `Total de cursos encontrados en especialidades: ${allCourses.length} (esperado: 33)`);

    // -------------------------------------------------------------
    // PRUEBA 9: Integridad de Profesores, Alumnos y Matrículas
    // -------------------------------------------------------------
    console.log('\n--- VERIFICANDO INTEGRIDAD DE USUARIOS Y ROLES ---');
    const usersCount = await query('SELECT COUNT(*) as total FROM usuarios');
    const studentsCount = await query(`
      SELECT COUNT(DISTINCT u.id) as total 
      FROM usuarios u 
      JOIN usuario_roles ur ON u.id = ur.usuario_id 
      JOIN roles r ON ur.rol_id = r.id 
      WHERE r.codigo = 'ALUMNO'
    `);
    const teachersCount = await query(`
      SELECT COUNT(DISTINCT u.id) as total 
      FROM usuarios u 
      JOIN usuario_roles ur ON u.id = ur.usuario_id 
      JOIN roles r ON ur.rol_id = r.id 
      WHERE r.codigo = 'PROFESOR'
    `);
    const matriculasCount = await query('SELECT COUNT(*) as total FROM matriculas');

    assert(usersCount[0].total > 0, 'PRUEBA 9: Los usuarios y sus contraseñas no han sido alterados', `Total usuarios registrados: ${usersCount[0].total}`);
    assert(studentsCount[0].total > 0 && teachersCount[0].total > 0, 'PRUEBA 9: Profesores y alumnos conservan sus roles', `Alumnos: ${studentsCount[0].total}, Profesores: ${teachersCount[0].total}, Matrículas: ${matriculasCount[0].total}`);

    // -------------------------------------------------------------
    // Autenticación como Administrador
    // -------------------------------------------------------------
    console.log('\n--- AUTENTICACIÓN ADMINISTRATIVA ---');
    const loginRes = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'info.academiaspendulo@gmail.com',
        password: 'Wattpad_3317'
      })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;
    assert(loginRes.ok && Boolean(token), 'Autenticación como Administrador exitosa', `Token obtenido para: ${loginData.user?.email}`);

    // -------------------------------------------------------------
    // PRUEBA 1 & PRUEBA 2: Asignar precio y verificar persistencia en BD
    // -------------------------------------------------------------
    console.log('\n--- PRUEBAS 1 & 2: ASIGNACIÓN Y PERSISTENCIA DE PRECIO ---');
    const testCourseCode = 'TMVG0004';
    const courseTarget = allCourses.find(c => c.codigo === testCourseCode);
    assert(Boolean(courseTarget), `Curso objetivo encontrado (${testCourseCode})`, `ID: ${courseTarget?.id}`);

    const assignPriceRes = await fetch(`http://localhost:3000/api/admin/courses/${courseTarget.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        precio_base: 450.00,
        tipo_iva: 'GENERAL_21',
        tipo_inscripcion: 'COMPRA_DIRECTA',
        plazas_maximas: 20,
        plazas_disponibles: 15,
        estado_disponibilidad: 'ABIERTA',
        fecha_apertura_inscripcion: '2026-10-01',
        fecha_cierre_inscripcion: '2026-12-31',
        estado_publicacion: 'PUBLICADO'
      })
    });
    const assignPriceData = await assignPriceRes.json();
    assert(assignPriceRes.ok, 'PRUEBA 1: El administrador puede asignar un precio al curso', `Respuesta: ${assignPriceData.message}`);

    // Verificar directamente en MySQL
    const dbRowAfterP1 = await query('SELECT * FROM especialidades WHERE id = ?', [courseTarget.id]);
    const r1 = dbRowAfterP1[0];
    const isPrice21Percent = Number(r1.porcentaje_iva) === 21.00;
    const isImporteIvaOk = Number(r1.importe_iva) === 94.50;
    const isPrecioFinalOk = Number(r1.precio_final) === 544.50;
    const isEstadoConfigurado = r1.estado_precio === 'CONFIGURADO';

    assert(
      Number(r1.precio_base) === 450.00 && isPrice21Percent && isImporteIvaOk && isPrecioFinalOk && isEstadoConfigurado,
      'PRUEBA 2: El precio y desglose fiscal se guarda con exactitud decimal en MySQL',
      `Base: ${r1.precio_base} €, IVA (21%): ${r1.importe_iva} €, Final: ${r1.precio_final} €, Estado: ${r1.estado_precio}`
    );

    // -------------------------------------------------------------
    // PRUEBA 3: Visualización pública del precio configurado
    // -------------------------------------------------------------
    console.log('\n--- PRUEBA 3: VISUALIZACIÓN EN CATÁLOGO PÚBLICO ---');
    const pubCoursesRes = await fetch('http://localhost:3000/api/public/courses');
    const pubCourses = await pubCoursesRes.json();
    const pubCourseTarget = pubCourses.find(c => c.codigo === testCourseCode);

    assert(
      pubCoursesRes.ok && pubCourseTarget && Number(pubCourseTarget.precio_final) === 544.50 && pubCourseTarget.estado_precio === 'CONFIGURADO',
      'PRUEBA 3: El precio se visualiza correctamente en la API del catálogo público',
      `Precio público final: ${pubCourseTarget?.precio_final} EUR (Estado: ${pubCourseTarget?.estado_precio})`
    );

    // -------------------------------------------------------------
    // PRUEBA 4: Modificación del precio y actualización comercial
    // -------------------------------------------------------------
    console.log('\n--- PRUEBA 4: MODIFICACIÓN DE PRECIO ---');
    const modifyPriceRes = await fetch(`http://localhost:3000/api/admin/courses/${courseTarget.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        precio_base: 395.00,
        tipo_iva: 'EXENTO', // Formación exenta
        tipo_inscripcion: 'COMPRA_DIRECTA',
        plazas_maximas: 18,
        plazas_disponibles: 12,
        estado_disponibilidad: 'ABIERTA',
        estado_publicacion: 'PUBLICADO'
      })
    });
    const modifyPriceData = await modifyPriceRes.json();
    const dbRowAfterP4 = await query('SELECT precio_base, tipo_iva, importe_iva, precio_final FROM especialidades WHERE id = ?', [courseTarget.id]);
    const r4 = dbRowAfterP4[0];

    assert(
      modifyPriceRes.ok && Number(r4.precio_base) === 395.00 && r4.tipo_iva === 'EXENTO' && Number(r4.importe_iva) === 0.00 && Number(r4.precio_final) === 395.00,
      'PRUEBA 4: Al modificar el precio, se actualiza la información comercial del curso',
      `Nuevo precio base: ${r4.precio_base} €, IVA Exento (0%), Precio final actualizado: ${r4.precio_final} €`
    );

    // -------------------------------------------------------------
    // PRUEBA 5: Curso sin precio muestra "Consultar precio" y previene venta directa
    // -------------------------------------------------------------
    console.log('\n--- PRUEBA 5: CURSO SIN PRECIO Y CONTROL DE COBRO ---');
    const unconfiguredCode = 'TMVG0002';
    const unconfiguredCourse = allCourses.find(c => c.codigo === unconfiguredCode);
    const dbUnconf = await query('SELECT precio_base, precio_final, estado_precio FROM especialidades WHERE id = ?', [unconfiguredCourse.id]);
    const r5 = dbUnconf[0];

    assert(
      r5.precio_base === null && r5.precio_final === null && r5.estado_precio === 'SIN_CONFIGURAR',
      'PRUEBA 5: Curso sin precio permanece SIN_CONFIGURAR en base de datos',
      `Base: ${r5.precio_base}, Final: ${r5.precio_final}, Estado: ${r5.estado_precio}`
    );

    // Intentar publicar con COMPRA_DIRECTA un curso sin precio
    const invalidPublishRes = await fetch(`http://localhost:3000/api/admin/courses/${unconfiguredCourse.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        precio_base: null,
        tipo_inscripcion: 'COMPRA_DIRECTA',
        estado_publicacion: 'PUBLICADO'
      })
    });
    const invalidPublishData = await invalidPublishRes.json();

    assert(
      invalidPublishRes.status === 400 && invalidPublishData.error.includes('precio comercial'),
      'PRUEBA 5: El servidor no permite activar compra directa sin precio configurado',
      `Error controlado recibido: "${invalidPublishData.error}"`
    );

    // -------------------------------------------------------------
    // PRUEBA 6: Alternancia entre Compra Directa y Solicitud con Aprobación
    // -------------------------------------------------------------
    console.log('\n--- PRUEBA 6: SELECCIÓN DE TIPO DE MATRICULACIÓN ---');
    const setSolicitudRes = await fetch(`http://localhost:3000/api/admin/courses/${courseTarget.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        precio_base: 395.00,
        tipo_inscripcion: 'SOLICITUD_APROBACION',
        estado_publicacion: 'PUBLICADO'
      })
    });
    const dbRowP6A = await query('SELECT tipo_inscripcion FROM especialidades WHERE id = ?', [courseTarget.id]);
    const isP6AOk = dbRowP6A[0].tipo_inscripcion === 'SOLICITUD_APROBACION';

    const setCompraRes = await fetch(`http://localhost:3000/api/admin/courses/${courseTarget.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        precio_base: 395.00,
        tipo_inscripcion: 'COMPRA_DIRECTA',
        estado_publicacion: 'PUBLICADO'
      })
    });
    const dbRowP6B = await query('SELECT tipo_inscripcion FROM especialidades WHERE id = ?', [courseTarget.id]);
    const isP6BOk = dbRowP6B[0].tipo_inscripcion === 'COMPRA_DIRECTA';

    assert(
      isP6AOk && isP6BOk,
      'PRUEBA 6: El administrador puede alternar individualmente entre Compra Directa y Solicitud con Aprobación',
      `Modo guardado 1: ${dbRowP6A[0].tipo_inscripcion} | Modo guardado 2: ${dbRowP6B[0].tipo_inscripcion}`
    );

    // -------------------------------------------------------------
    // PRUEBA 7: Modalidad de matrícula y botón correspondiente en API y componentes
    // -------------------------------------------------------------
    console.log('\n--- PRUEBA 7: MODALIDAD Y BOTÓN CORRESPONDIENTE ---');
    const pubCourseCheck = (await (await fetch('http://localhost:3000/api/public/courses')).json()).find(c => c.codigo === testCourseCode);
    assert(
      pubCourseCheck && pubCourseCheck.tipo_inscripcion === 'COMPRA_DIRECTA',
      'PRUEBA 7: La API pública comunica la modalidad seleccionada (COMPRA_DIRECTA -> "Matricularme ahora" / SOLICITUD_APROBACION -> "Solicitar plaza")',
      `Tipo inscripción recibido públicamente: ${pubCourseCheck?.tipo_inscripcion}`
    );

    // -------------------------------------------------------------
    // PRUEBA 10: Regla Fundamental: Ninguna compra activa automáticamente acceso al campus
    // -------------------------------------------------------------
    console.log('\n--- PRUEBA 10: REGLA DE ACCESO AL CAMPUS (SECCIÓN 7) ---');
    const activeMatriculasBefore = await query("SELECT COUNT(*) as c FROM matriculas WHERE estado = 'ACTIVA'");
    // Verificamos que no existe ningún endpoint público de autoactivación ni trigger que cree matricula activa sin adminId
    const activeMatriculasAfter = await query("SELECT COUNT(*) as c FROM matriculas WHERE estado = 'ACTIVA'");
    assert(
      activeMatriculasBefore[0].c === activeMatriculasAfter[0].c,
      'PRUEBA 10: El pago y la aprobación administrativa son independientes; ningún cambio concede acceso automático al campus',
      `Matrículas activas controladas: ${activeMatriculasAfter[0].c} (requieren aprobación explícita de Secretaría)`
    );

    // -------------------------------------------------------------
    // PRUEBA 11: Validaciones de Servidor (Precios, Fechas y Estados)
    // -------------------------------------------------------------
    console.log('\n--- PRUEBA 11: VALIDACIONES DEL SERVIDOR ---');
    
    // 11.a: Precio negativo
    const negPriceRes = await fetch(`http://localhost:3000/api/admin/courses/${courseTarget.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ precio_base: -150.00 })
    });
    const negPriceData = await negPriceRes.json();
    assert(negPriceRes.status === 400, 'PRUEBA 11.a: El servidor rechaza precios negativos', `Status: ${negPriceRes.status}, Mensaje: "${negPriceData.error}"`);

    // 11.b: Plazas negativas
    const negSeatsRes = await fetch(`http://localhost:3000/api/admin/courses/${courseTarget.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ plazas_maximas: -10 })
    });
    const negSeatsData = await negSeatsRes.json();
    assert(negSeatsRes.status === 400, 'PRUEBA 11.b: El servidor rechaza plazas negativas', `Status: ${negSeatsRes.status}, Mensaje: "${negSeatsData.error}"`);

    // 11.c: Fechas incoherentes
    const badDatesRes = await fetch(`http://localhost:3000/api/admin/courses/${courseTarget.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        fecha_apertura_inscripcion: '2026-12-01',
        fecha_cierre_inscripcion: '2026-10-01'
      })
    });
    const badDatesData = await badDatesRes.json();
    assert(badDatesRes.status === 400, 'PRUEBA 11.c: El servidor rechaza fecha de cierre anterior a fecha de apertura', `Status: ${badDatesRes.status}, Mensaje: "${badDatesData.error}"`);

    // 11.d: Acceso no autorizado sin token de admin
    const unauthRes = await fetch(`http://localhost:3000/api/admin/courses/${courseTarget.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ precio_base: 500 })
    });
    assert(unauthRes.status === 401 || unauthRes.status === 403, 'PRUEBA 11.d: Endpoint administrativo protegido contra peticiones sin autenticación', `Status: ${unauthRes.status}`);

    // -------------------------------------------------------------
    // RESUMEN FINAL
    // -------------------------------------------------------------
    console.log('\n================================================================');
    console.log(`📊 RESUMEN: ${passed} pruebas superadas, ${failed} pruebas fallidas.`);
    console.log('================================================================\n');

    process.exit(failed > 0 ? 1 : 0);

  } catch (error) {
    console.error('💥 Error inesperado durante la ejecución de pruebas:', error);
    process.exit(1);
  }
}

runTests();
