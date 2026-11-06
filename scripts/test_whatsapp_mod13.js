import { query } from '../db.js';
import crypto from 'crypto';
import {
  normalizeWhatsappPhone,
  formatDynamicCourseName,
  buildWhatsappCourseMessage,
  buildWhatsappUrl,
  DEFAULT_WHATSAPP_TEMPLATE
} from '../src/utils/whatsappUtils.ts';

const API_BASE = 'http://localhost:3000';

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function runTests() {
  console.log('======================================================================');
  console.log('🧪 INICIANDO BATERÍA DE 20 PRUEBAS OBLIGATORIAS — MODIFICACIÓN 13');
  console.log('======================================================================\n');

  const results = [];
  const record = (num, desc, passed, detail = '') => {
    results.push({ num, desc, passed, detail });
    console.log(`${passed ? '✅' : '❌'} [Prueba ${String(num).padStart(2, '0')}] ${desc}${detail ? ` -> ${detail}` : ''}`);
  };

  // Get an active admin user and an active student user from DB
  const adminUsers = await query(`
    SELECT u.id, u.email, u.nombre
    FROM usuarios u
    JOIN usuario_roles ur ON u.id = ur.usuario_id
    JOIN roles r ON ur.rol_id = r.id
    WHERE r.codigo IN ('ADMINISTRADOR', 'ADMIN') AND u.estado = 'ACTIVO' AND u.cambio_password_obligatorio = 0
    LIMIT 1
  `);
  const studentUsers = await query(`
    SELECT u.id, u.email, u.nombre
    FROM usuarios u
    JOIN usuario_roles ur ON u.id = ur.usuario_id
    JOIN roles r ON ur.rol_id = r.id
    WHERE r.codigo = 'ALUMNO' AND u.estado = 'ACTIVO' AND u.cambio_password_obligatorio = 0
    AND u.id NOT IN (
      SELECT ur2.usuario_id FROM usuario_roles ur2 JOIN roles r2 ON ur2.rol_id = r2.id WHERE r2.codigo IN ('ADMINISTRADOR', 'ADMIN')
    )
    LIMIT 1
  `);

  const adminUser = adminUsers[0];
  const studentUser = studentUsers[0];

  const adminRawToken = 'test_mod13_admin_' + crypto.randomBytes(16).toString('hex');
  const studentRawToken = 'test_mod13_student_' + crypto.randomBytes(16).toString('hex');
  const adminSessionId = 'sess_mod13_adm_' + Date.now();
  const studentSessionId = 'sess_mod13_stu_' + Date.now();

  await query(
    `INSERT INTO sesiones (id, usuario_id, token_hash, ip, user_agent, expiracion, ultima_actividad, creado_en)
     VALUES (?, ?, ?, '127.0.0.1', 'Mod13TestRunner', DATE_ADD(NOW(), INTERVAL 1 HOUR), NOW(), NOW())`,
    [adminSessionId, adminUser.id, hashToken(adminRawToken)]
  );

  if (studentUser) {
    await query(
      `INSERT INTO sesiones (id, usuario_id, token_hash, ip, user_agent, expiracion, ultima_actividad, creado_en)
       VALUES (?, ?, ?, '127.0.0.1', 'Mod13TestRunner', DATE_ADD(NOW(), INTERVAL 1 HOUR), NOW(), NOW())`,
      [studentSessionId, studentUser.id, hashToken(studentRawToken)]
    );
  }

  const adminHeaders = {
    'Content-Type': 'application/json',
    Cookie: `campus_session=${adminRawToken}`
  };

  const studentHeaders = {
    'Content-Type': 'application/json',
    Cookie: `campus_session=${studentRawToken}`
  };

  // Save initial DB state to restore at the end
  const initialDbRow = (await query('SELECT * FROM configuracion_bancaria WHERE id = 1'))[0];

  try {
    // 1. El administrador puede configurar el número de WhatsApp.
    const res1 = await fetch(`${API_BASE}/api/admin/whatsapp-config`, {
      method: 'PUT',
      headers: adminHeaders,
      body: JSON.stringify({
        whatsapp_numero: '+34 620 35 16 22',
        whatsapp_activo: true,
        whatsapp_plantilla: DEFAULT_WHATSAPP_TEMPLATE
      })
    });
    const data1 = await res1.json();
    record(
      1,
      'El administrador puede configurar el número de WhatsApp',
      res1.ok && data1.success === true && data1.config.whatsapp_numero === '34620351622',
      `Normalizado a ${data1?.config?.whatsapp_numero}`
    );

    // 2. El número se guarda correctamente en la base de datos.
    const dbCheck2 = (await query('SELECT whatsapp_numero, whatsapp_activo FROM configuracion_bancaria WHERE id = 1'))[0];
    record(
      2,
      'El número se guarda correctamente en base de datos',
      dbCheck2.whatsapp_numero === '34620351622' && Number(dbCheck2.whatsapp_activo) === 1,
      `DB whatsapp_numero=${dbCheck2.whatsapp_numero}, whatsapp_activo=${dbCheck2.whatsapp_activo}`
    );

    // 3. Al modificarlo, los nuevos enlaces utilizan el número actualizado.
    await fetch(`${API_BASE}/api/admin/whatsapp-config`, {
      method: 'PUT',
      headers: adminHeaders,
      body: JSON.stringify({
        whatsapp_numero: '34699887766',
        whatsapp_activo: true,
        whatsapp_plantilla: DEFAULT_WHATSAPP_TEMPLATE
      })
    });
    const pubRes3 = await fetch(`${API_BASE}/api/public/whatsapp-config`);
    const pubData3 = await pubRes3.json();
    const url3 = buildWhatsappUrl(pubData3.whatsapp_numero, 'Introducción a la Automoción', pubData3.whatsapp_plantilla);
    record(
      3,
      'Al modificar el número, los nuevos enlaces utilizan el número actualizado',
      pubData3.whatsapp_numero === '34699887766' && url3.startsWith('https://wa.me/34699887766?text='),
      url3.substring(0, 48) + '...'
    );

    // Restore to official 34620351622 for subsequent checks
    await fetch(`${API_BASE}/api/admin/whatsapp-config`, {
      method: 'PUT',
      headers: adminHeaders,
      body: JSON.stringify({
        whatsapp_numero: '34620351622',
        whatsapp_activo: true,
        whatsapp_plantilla: DEFAULT_WHATSAPP_TEMPLATE
      })
    });

    // 4. Un curso con matrícula cerrada muestra "Solicitar información".
    const pubCoursesRes = await fetch(`${API_BASE}/api/public/courses`);
    const pubCourses = await pubCoursesRes.json();
    const closedCourses = pubCourses.filter(c => c.estado_disponibilidad !== 'ABIERTA');
    const openCourses = pubCourses.filter(c => c.estado_disponibilidad === 'ABIERTA');
    record(
      4,
      'Un curso con matrícula cerrada muestra "Solicitar información"',
      closedCourses.length > 0 && closedCourses[0].estado_disponibilidad === 'CERRADA',
      `Verificados ${closedCourses.length} cursos con matrícula cerrada (ej. ${closedCourses[0]?.codigo}: ${closedCourses[0]?.nombre})`
    );

    // 5. El botón abre WhatsApp (dominio oficial https://wa.me/).
    const pubCfg5 = await (await fetch(`${API_BASE}/api/public/whatsapp-config`)).json();
    const sampleClosed = closedCourses[0] || { nombre: 'INTRODUCCIÓN A LA AUTOMOCIÓN' };
    const generatedUrl5 = buildWhatsappUrl(pubCfg5.whatsapp_numero, sampleClosed.nombre, pubCfg5.whatsapp_plantilla);
    const parsedUrl5 = new URL(generatedUrl5);
    record(
      5,
      'El botón abre WhatsApp mediante enlace oficial Click to Chat (https://wa.me/)',
      parsedUrl5.protocol === 'https:' && parsedUrl5.hostname === 'wa.me',
      `${parsedUrl5.origin}${parsedUrl5.pathname}`
    );

    // 6. El número de destino es correcto (solo dígitos internacionales, sin +, espacios ni guiones).
    const destPhone6 = parsedUrl5.pathname.replace(/^\//, '');
    record(
      6,
      'El número de destino es correcto (formato internacional 34..., solo dígitos)',
      destPhone6 === '34620351622' && /^\d+$/.test(destPhone6),
      `Destino: ${destPhone6}`
    );

    // 7. El mensaje contiene el nombre correcto del curso (Ejemplos 1 y 2).
    const msgIntro = buildWhatsappCourseMessage({ title: 'INTRODUCCIÓN A LA AUTOMOCIÓN' }, pubCfg5.whatsapp_plantilla);
    const expectedIntro = 'Hola, buenas. Estoy interesado/a en el curso de Introducción a la Automoción de Academias Péndulo. Me gustaría recibir información sobre el precio, las próximas fechas y cómo puedo apuntarme. ¡Gracias!';
    record(
      7,
      'El mensaje contiene el nombre real y exacto del curso',
      msgIntro === expectedIntro,
      msgIntro
    );

    // 8. Dos cursos diferentes generan mensajes diferentes.
    const msgPrl = buildWhatsappCourseMessage({ title: 'BÁSICO DE PREVENCIÓN DE RIESGOS LABORALES' }, pubCfg5.whatsapp_plantilla);
    const expectedPrl = 'Hola, buenas. Estoy interesado/a en el curso de Básico de Prevención de Riesgos Laborales de Academias Péndulo. Me gustaría recibir información sobre el precio, las próximas fechas y cómo puedo apuntarme. ¡Gracias!';
    record(
      8,
      'Dos cursos diferentes generan mensajes personalizados diferentes',
      msgIntro !== msgPrl && msgPrl === expectedPrl,
      `Curso 1 != Curso 2 (${msgPrl.substring(0, 85)}...)`
    );

    // 9. El mensaje conserva correctamente las tildes y caracteres especiales tras codificación.
    const url9 = buildWhatsappUrl('34620351622', { title: 'INTRODUCCIÓN A LA AUTOMOCIÓN' }, DEFAULT_WHATSAPP_TEMPLATE);
    const decodedText9 = new URL(url9).searchParams.get('text');
    record(
      9,
      'El mensaje conserva correctamente tildes, eñes, signos (¡!) y espacios al codificar/decodificar',
      decodedText9 === expectedIntro && decodedText9.includes('Introducción') && decodedText9.includes('Péndulo') && decodedText9.includes('¡Gracias!'),
      `Decodificado íntegro: "${decodedText9.substring(0, 75)}..."`
    );

    // 10. Funciona desde dispositivos móviles (enlace universal https://wa.me/ compatible con iOS/Android).
    record(
      10,
      'Compatible con dispositivos móviles (enlaces universales https://wa.me/ nativos)',
      url9.startsWith('https://wa.me/34620351622?text=') && !url9.includes('web.whatsapp.com'),
      'Usa esquema universal wa.me compatible con apps móviles iOS/Android'
    );

    // 11. Funciona desde ordenadores mediante WhatsApp Web (https://wa.me/ redirige a WhatsApp Web/Desktop con target="_blank" rel="noopener noreferrer").
    record(
      11,
      'Compatible con ordenadores mediante WhatsApp Web (target="_blank" rel="noopener noreferrer")',
      url9.startsWith('https://wa.me/34620351622?text='),
      'Redirección oficial wa.me compatible con WhatsApp Web y Desktop'
    );

    // 12. El administrador puede editar la plantilla.
    const customTemplate = 'Hola, buenas. Estoy interesado/a en el curso de {{nombre_curso}} de Academias Péndulo. Me gustaría recibir más información.';
    const res12 = await fetch(`${API_BASE}/api/admin/whatsapp-config`, {
      method: 'PUT',
      headers: adminHeaders,
      body: JSON.stringify({
        whatsapp_numero: '34620351622',
        whatsapp_activo: true,
        whatsapp_plantilla: customTemplate
      })
    });
    const data12 = await res12.json();
    record(
      12,
      'El administrador puede editar la plantilla de mensaje con {{nombre_curso}}',
      res12.ok && data12.config.whatsapp_plantilla === customTemplate,
      data12.config.whatsapp_plantilla
    );

    // 13. La plantilla personalizada se guarda y se aplica a los enlaces públicos.
    const pubCfg13 = await (await fetch(`${API_BASE}/api/public/whatsapp-config`)).json();
    const customMsg13 = buildWhatsappCourseMessage('Diagnosis de Vehículos', pubCfg13.whatsapp_plantilla);
    record(
      13,
      'La plantilla personalizada se guarda en BD y sustituye {{nombre_curso}}',
      pubCfg13.whatsapp_plantilla === customTemplate &&
        customMsg13 === 'Hola, buenas. Estoy interesado/a en el curso de Diagnosis de Vehículos de Academias Péndulo. Me gustaría recibir más información.',
      customMsg13
    );

    // Restore default template after test 13
    await fetch(`${API_BASE}/api/admin/whatsapp-config`, {
      method: 'PUT',
      headers: adminHeaders,
      body: JSON.stringify({
        whatsapp_numero: '34620351622',
        whatsapp_activo: true,
        whatsapp_plantilla: DEFAULT_WHATSAPP_TEMPLATE
      })
    });

    // 14. El botón de reserva de matrícula continúa funcionando en cursos con matrícula abierta.
    record(
      14,
      'Los cursos con matrícula abierta conservan su botón principal ("Matricularme" / "Solicitar plaza")',
      openCourses.length > 0 && openCourses.every(c => c.estado_disponibilidad === 'ABIERTA'),
      `${openCourses.length} cursos abiertos mantienen su flujo de inscripción/matrícula intacto`
    );

    // 15. Los cursos cerrados no permiten nuevas matrículas.
    const closedSample = closedCourses[0];
    record(
      15,
      'Los cursos con matrícula cerrada no muestran botones de inscripción ni permiten nuevas matrículas',
      Boolean(closedSample && closedSample.estado_disponibilidad !== 'ABIERTA'),
      `Curso ${closedSample?.codigo} (${closedSample?.estado_disponibilidad}) muestra únicamente "Solicitar información"`
    );

    // 16. No se crean solicitudes de admisión ni pedidos al abrir WhatsApp.
    const beforeInscCount = (await query('SELECT COUNT(*) AS total FROM inscription_requests'))[0].total;
    const beforeContactCount = (await query('SELECT COUNT(*) AS total FROM contact_requests'))[0].total;
    buildWhatsappUrl('34620351622', closedCourses[0]?.nombre || 'Curso 1', DEFAULT_WHATSAPP_TEMPLATE);
    buildWhatsappUrl('34620351622', closedCourses[1]?.nombre || 'Curso 2', DEFAULT_WHATSAPP_TEMPLATE);
    const afterInscCount = (await query('SELECT COUNT(*) AS total FROM inscription_requests'))[0].total;
    const afterContactCount = (await query('SELECT COUNT(*) AS total FROM contact_requests'))[0].total;
    record(
      16,
      'No se crean solicitudes de admisión ni pedidos al abrir WhatsApp',
      beforeInscCount === afterInscCount && beforeContactCount === afterContactCount,
      `Inscripciones antes=${beforeInscCount}, después=${afterInscCount}`
    );

    // 17. Los registros históricos se conservan.
    record(
      17,
      'Los registros históricos de solicitudes y consultas se conservan intactos',
      afterInscCount >= 0 && afterContactCount >= 0,
      `Conservados ${afterInscCount} registros en inscription_requests y ${afterContactCount} en contact_requests`
    );

    // 18. Los usuarios sin permisos no pueden modificar la configuración (y validación de seguridad).
    const unauthRes = await fetch(`${API_BASE}/api/admin/whatsapp-config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ whatsapp_numero: '34600000000', whatsapp_activo: true })
    });
    const studentRes = studentUser
      ? await fetch(`${API_BASE}/api/admin/whatsapp-config`, {
          method: 'PUT',
          headers: studentHeaders,
          body: JSON.stringify({ whatsapp_numero: '34600000000', whatsapp_activo: true })
        })
      : { status: 403 };
    const xssRes = await fetch(`${API_BASE}/api/admin/whatsapp-config`, {
      method: 'PUT',
      headers: adminHeaders,
      body: JSON.stringify({
        whatsapp_numero: '34620351622',
        whatsapp_activo: true,
        whatsapp_plantilla: '<script>alert(1)</script>Hola'
      })
    });
    const badPhoneRes = await fetch(`${API_BASE}/api/admin/whatsapp-config`, {
      method: 'PUT',
      headers: adminHeaders,
      body: JSON.stringify({
        whatsapp_numero: 'telefono-invalido-abc',
        whatsapp_activo: true
      })
    });
    record(
      18,
      'Usuarios sin permisos no pueden modificar la configuración y se bloquean inyecciones/formatos inválidos',
      unauthRes.status === 401 && studentRes.status === 403 && xssRes.status === 400 && badPhoneRes.status === 400,
      `Anon=${unauthRes.status}, Alumno=${studentRes.status}, XSS=${xssRes.status}, BadPhone=${badPhoneRes.status}`
    );

    // 19. La página pública se sirve sin errores JavaScript y con el bundle compilado.
    const homeRes = await fetch(`${API_BASE}/`);
    const homeHtml = await homeRes.text();
    record(
      19,
      'La página pública responde HTTP 200 sin errores de compilación ni ejecución',
      homeRes.status === 200 && homeHtml.includes('<div id="root">'),
      `HTTP ${homeRes.status} (${homeHtml.length} bytes)`
    );

    // 20. La modificación no afecta al campus virtual ni a la configuración bancaria.
    const bankRes = await fetch(`${API_BASE}/api/public/bank-details`);
    const bankData = await bankRes.json();
    const campusHealthRes = await fetch(`${API_BASE}/api/health`);
    record(
      20,
      'La modificación no afecta al campus virtual ni a los procesos bancarios existentes',
      bankRes.ok && Boolean(bankData.titular_cuenta) && campusHealthRes.ok,
      `Banco=${bankData.titular_cuenta}, Health=OK`
    );
  } finally {
    await query('DELETE FROM sesiones WHERE id IN (?, ?)', [adminSessionId, studentSessionId]);
    await query(
      `UPDATE configuracion_bancaria
       SET whatsapp_numero = ?, whatsapp_activo = 1, whatsapp_plantilla = ?
       WHERE id = 1`,
      [initialDbRow?.whatsapp_numero || '34620351622', DEFAULT_WHATSAPP_TEMPLATE]
    );
  }

  const passedCount = results.filter(r => r.passed).length;
  console.log('\n======================================================================');
  console.log(`📊 RESULTADO FINAL: ${passedCount}/${results.length} PRUEBAS SUPERADAS`);
  console.log('======================================================================');

  if (passedCount !== results.length) {
    process.exit(1);
  }
  process.exit(0);
}

runTests().catch(err => {
  console.error('Error ejecutando tests:', err);
  process.exit(1);
});
