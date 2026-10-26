import mysql from 'mysql2/promise';

async function syncInboxTablesToDB2() {
  console.log('--- Sincronizando tablas de correo y bandeja de entrada hacia DB2 (Hostinger) ---');

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

  const tablesToSync = ['cuentas_correo', 'sincronizacion_correo', 'hilos_correo', 'correos', 'adjuntos_correo'];

  await db2.query('SET FOREIGN_KEY_CHECKS = 0');

  for (const table of tablesToSync) {
    try {
      const [rows] = await db1.query(`SELECT * FROM ${table}`);
      console.log(`Copiando ${rows.length} registros de la tabla ${table}...`);
      await db2.query(`TRUNCATE TABLE ${table}`);
      if (rows.length > 0) {
        for (const row of rows) {
          const keys = Object.keys(row);
          const values = Object.values(row);
          const placeholders = keys.map(() => '?').join(', ');
          await db2.query(
            `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`,
            values
          );
        }
      }
      console.log(`  ✅ Tabla ${table} sincronizada en DB2.`);
    } catch (err) {
      console.error(`  ❌ Error en tabla ${table}:`, err.message);
    }
  }

  await db2.query('SET FOREIGN_KEY_CHECKS = 1');

  await db1.end();
  await db2.end();
  console.log('🎉 ¡Sincronización de bandeja de entrada completada con éxito en ambas bases de datos!');
}

syncInboxTablesToDB2();
