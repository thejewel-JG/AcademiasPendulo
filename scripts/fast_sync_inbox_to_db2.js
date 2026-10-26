import mysql from 'mysql2/promise';

async function fastSyncInbox() {
  console.log('--- Sincronizando cuentas, sincronizacion e hilos hacia DB2 (Hostinger) ---');

  const db1 = await mysql.createConnection({
    host: '195.35.53.48',
    user: 'u869063079_guillermina',
    password: 'Wattpad_3317',
    database: 'u869063079_academias'
  });

  const db2 = await mysql.createConnection({
    host: 'srv1787.hstgr.io',
    user: 'u141101294_guillermina',
    password: 'Wattpad_3317',
    database: 'u141101294_Academias'
  });

  await db2.query('SET FOREIGN_KEY_CHECKS = 0');

  // 1. Sync cuentas_correo
  const [cuentas] = await db1.query('SELECT * FROM cuentas_correo');
  await db2.query('TRUNCATE TABLE cuentas_correo');
  for (const c of cuentas) {
    const cfgStr = typeof c.configuracion === 'object' && c.configuracion !== null
      ? JSON.stringify(c.configuracion)
      : (c.configuracion || '{}');
    await db2.query(
      `INSERT INTO cuentas_correo (id, buzon, proveedor, estado, secreto_ref, configuracion, creado_en)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [c.id, c.buzon, c.proveedor, c.estado, c.secreto_ref, cfgStr, c.creado_en]
    );
  }
  console.log('✅ cuentas_correo sincronizada en DB2.');

  // 2. Sync sincronizacion_correo
  const [syncs] = await db1.query('SELECT * FROM sincronizacion_correo');
  await db2.query('TRUNCATE TABLE sincronizacion_correo');
  for (const s of syncs) {
    await db2.query(
      `INSERT INTO sincronizacion_correo (cuenta_id, carpeta, uidvalidity, uid_next, last_uid, fecha_sincronizacion, ultimo_error)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [s.cuenta_id, s.carpeta, s.uidvalidity, s.uid_next, s.last_uid, s.fecha_sincronizacion, s.ultimo_error]
    );
  }
  console.log('✅ sincronizacion_correo sincronizada en DB2.');

  // 3. Sync hilos_correo and correos from acc_gmail_guillermina
  const [recentThreads] = await db1.query(
    `SELECT * FROM hilos_correo WHERE cuenta_id = 'acc_gmail_guillermina' ORDER BY actualizado_en DESC LIMIT 100`
  );
  console.log(`Encontrados ${recentThreads.length} hilos de acc_gmail_guillermina en DB1.`);

  if (recentThreads.length > 0) {
    await db2.query(`DELETE FROM hilos_correo WHERE cuenta_id = 'acc_gmail_guillermina'`);
    for (const t of recentThreads) {
      await db2.query(
        `INSERT INTO hilos_correo (id, cuenta_id, asunto_hilo, creado_en, actualizado_en)
         VALUES (?, ?, ?, ?, ?)`,
        [t.id, t.cuenta_id, t.asunto_hilo, t.creado_en, t.actualizado_en]
      );
    }
    console.log(`✅ ${recentThreads.length} hilos insertados en DB2.`);

    const threadIds = recentThreads.map(t => t.id);
    const [recentMsgs] = await db1.query(
      `SELECT * FROM correos WHERE hilo_id IN (?)`,
      [threadIds]
    );
    console.log(`Encontrados ${recentMsgs.length} mensajes asociados en DB1.`);
    for (const m of recentMsgs) {
      await db2.query(
        `INSERT IGNORE INTO correos (id, cuenta_id, hilo_id, provider_id, message_id, in_reply_to, references_header, remitente, destinatarios, asunto, cuerpo_texto, cuerpo_html, fecha_correo, direccion, creado_en)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [m.id, m.cuenta_id, m.hilo_id, m.provider_id, m.message_id, m.in_reply_to, m.references_header, m.remitente, m.destinatarios, m.asunto, m.cuerpo_texto, m.cuerpo_html, m.fecha_correo, m.direccion, m.creado_en]
      );
    }
    console.log(`✅ ${recentMsgs.length} correos insertados en DB2.`);
  }

  await db2.query('SET FOREIGN_KEY_CHECKS = 1');
  await db1.end();
  await db2.end();
  console.log('🎉 ¡Sincronización completa con éxito en DB2!');
}

fastSyncInbox();
