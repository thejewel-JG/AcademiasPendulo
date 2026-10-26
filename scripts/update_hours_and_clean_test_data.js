import mysql from 'mysql2/promise';

const dbs = [
  {
    name: 'DB1 (srv1017 - u869063079_academias)',
    host: '195.35.53.48',
    user: 'u869063079_guillermina',
    password: 'Wattpad_3317',
    database: 'u869063079_academias'
  },
  {
    name: 'DB2 (srv1787 - u141101294_Academias)',
    host: 'srv1787.hstgr.io',
    user: 'u141101294_guillermina',
    password: 'Wattpad_3317',
    database: 'u141101294_Academias'
  }
];

async function updateHoursAndCleanTestData() {
  for (const dbConfig of dbs) {
    console.log(`\n======================================================`);
    console.log(`PROCESANDO EN: ${dbConfig.name}`);
    console.log(`======================================================`);

    const conn = await mysql.createConnection(dbConfig);

    try {
      // 1. ACTUALIZAR HORAS DE LOS CURSOS
      console.log('1. Actualizando horas de cursos en especialidades...');
      // TMVG0109 -> 380h
      await conn.query(`
        UPDATE especialidades 
        SET horas_totales = 380 
        WHERE codigo = 'TMVG0109'
      `);
      // TMVG0209 -> 520h
      await conn.query(`
        UPDATE especialidades 
        SET horas_totales = 520 
        WHERE codigo = 'TMVG0209'
      `);
      // Todos los demás -> horas_totales = NULL, horas_practicas = NULL
      await conn.query(`
        UPDATE especialidades 
        SET horas_totales = NULL, horas_practicas = NULL 
        WHERE codigo NOT IN ('TMVG0109', 'TMVG0209')
      `);

      const [courses] = await conn.query(`
        SELECT codigo, nombre, horas_totales, estado_disponibilidad 
        FROM especialidades 
        ORDER BY (estado_disponibilidad = 'ABIERTA') DESC, orden_visualizacion ASC 
        LIMIT 5
      `);
      console.log('   Muestra de cursos tras actualización de horas:');
      courses.forEach(c => {
        console.log(`   - [${c.estado_disponibilidad}] ${c.codigo}: ${c.horas_totales ? c.horas_totales + 'h' : '— (Sin horas)'} | ${c.nombre.substring(0, 40)}...`);
      });

      // 2. ELIMINAR CORREOS Y MENSAJES DE PRUEBA
      console.log('\n2. Eliminando correos falsos / de prueba en correos e hilos_correo...');
      // Eliminar rebotes de Mailer-Daemon y correos de prueba de mecánicas
      const [delCorreos] = await conn.query(`
        DELETE FROM correos 
        WHERE asunto LIKE '%[MECÁNICA%' 
           OR asunto LIKE '%Delivery Status Notification%'
           OR asunto LIKE '%MALWARE%'
           OR remitente LIKE '%mailer-daemon%'
           OR remitente LIKE '%example.com%'
           OR destinatarios LIKE '%example.com%'
      `);
      console.log(`   ✅ Eliminados ${delCorreos.affectedRows} correos de prueba en correos.`);

      // Eliminar hilos huérfanos sin mensajes
      const [delHilos] = await conn.query(`
        DELETE FROM hilos_correo 
        WHERE id NOT IN (SELECT DISTINCT hilo_id FROM correos WHERE hilo_id IS NOT NULL)
           OR asunto_hilo LIKE '%[MECÁNICA%'
           OR asunto_hilo LIKE '%Delivery Status Notification%'
      `);
      console.log(`   ✅ Eliminados ${delHilos.affectedRows} hilos huérfanos/de prueba.`);

      // 3. LIMPIAR SOLICITUDES Y MATRÍCULAS DE PRUEBA
      console.log('\n3. Eliminando solicitudes de prueba en contact_requests e inscription_requests...');
      const [delContacts] = await conn.query(`
        DELETE FROM contact_requests 
        WHERE email LIKE '%example.com%' 
           OR email LIKE '%test%' 
           OR first_name LIKE '%<script>%'
           OR first_name = 'Test'
      `);
      console.log(`   ✅ Eliminadas ${delContacts.affectedRows} solicitudes de contacto de prueba.`);

      const [delInscriptions] = await conn.query(`
        DELETE FROM inscription_requests 
        WHERE email LIKE '%example.com%' 
           OR email LIKE '%test%' 
           OR first_name IN ('Operador', 'Sofía', 'Clara', 'Mario', 'Felipe')
      `);
      console.log(`   ✅ Eliminadas ${delInscriptions.affectedRows} preinscripciones de prueba.`);

      // 4. LIMPIAR NOTIFICACIONES DE PRUEBA ASOCIADAS
      await conn.query(`
        DELETE FROM notificaciones 
        WHERE destinatario_id LIKE '%test%' 
           OR mensaje LIKE '%XSS%' 
           OR titulo LIKE '%Prueba%'
      `);
      console.log('   ✅ Notificaciones de prueba limpiadas.');

      console.log(`\n✨ ¡Base de datos ${dbConfig.name} depurada y con datos verídicos!`);
    } catch (err) {
      console.error(`❌ Error en ${dbConfig.name}:`, err.message);
    } finally {
      await conn.end();
    }
  }
}

updateHoursAndCleanTestData();
