import mysql from 'mysql2/promise';

async function syncDatabases() {
  console.log('🚀 Iniciando sincronización completa de u869063079_academias -> u141101294_Academias...');

  const src = await mysql.createConnection({
    host: 'srv1017.hstgr.io',
    user: 'u869063079_guillermina',
    password: 'Wattpad_3317',
    database: 'u869063079_academias',
    multipleStatements: true
  });

  const target = await mysql.createConnection({
    host: 'srv1787.hstgr.io',
    user: 'u141101294_guillermina',
    password: 'Wattpad_3317',
    database: 'u141101294_Academias',
    multipleStatements: true
  });

  console.log('✅ Conexión establecida con origen (u869063079_academias) y destino (u141101294_Academias).');

  await target.query('SET FOREIGN_KEY_CHECKS = 0;');

  const [fullTables] = await src.query('SHOW FULL TABLES');
  const baseTables = [];
  const views = [];

  for (const row of fullTables) {
    const tableName = row[Object.keys(row)[0]];
    const type = row.Table_type;
    if (type === 'VIEW') {
      views.push(tableName);
    } else {
      baseTables.push(tableName);
    }
  }

  console.log(`📋 Encontradas ${baseTables.length} tablas base y ${views.length} vistas.`);

  // 1. Crear tablas base
  for (const tableName of baseTables) {
    process.stdout.write(`➡️ Sincronizando estructura de ${tableName}... `);
    const [createResult] = await src.query(`SHOW CREATE TABLE \`${tableName}\``);
    let createSql = createResult[0]['Create Table'];

    createSql = createSql.replace(/`u869063079_academias`\./g, '');
    createSql = createSql.replace(/`u869063079_guillermina`\./g, '');

    await target.query(`DROP TABLE IF EXISTS \`${tableName}\``);
    await target.query(createSql);
    console.log(`OK`);
  }

  // 2. Copiar datos
  for (const tableName of baseTables) {
    const [rowsCount] = await src.query(`SELECT COUNT(*) as cnt FROM \`${tableName}\``);
    const count = rowsCount[0].cnt;
    if (count === 0) continue;

    process.stdout.write(`📦 Copiando ${count} registros en ${tableName}... `);

    const batchSize = 100;
    let offset = 0;
    while (offset < count) {
      const [rows] = await src.query(`SELECT * FROM \`${tableName}\` LIMIT ${batchSize} OFFSET ${offset}`);
      if (rows.length > 0) {
        const columns = Object.keys(rows[0]).map(col => `\`${col}\``).join(', ');
        const rowPlaceholders = `(${Object.keys(rows[0]).map(() => '?').join(', ')})`;
        const allPlaceholders = rows.map(() => rowPlaceholders).join(', ');
        const insertSql = `INSERT INTO \`${tableName}\` (${columns}) VALUES ${allPlaceholders}`;

        const flatValues = [];
        for (const r of rows) {
          for (const k of Object.keys(r)) {
            let val = r[k];
            if (val !== null && typeof val === 'object' && !(val instanceof Date) && !Buffer.isBuffer(val)) {
              val = JSON.stringify(val);
            }
            flatValues.push(val);
          }
        }
        await target.query(insertSql, flatValues);
      }
      offset += batchSize;
    }
    console.log(`OK`);
  }

  // 3. Crear vistas
  for (const viewName of views) {
    process.stdout.write(`➡️ Creando vista ${viewName}... `);
    const [createResult] = await src.query(`SHOW CREATE VIEW \`${viewName}\``);
    let viewSql = createResult[0]['Create View'];

    viewSql = viewSql.replace(/ALGORITHM=[A-Z]+ DEFINER=`[^`]+`@`[^`]+` SQL SECURITY DEFINER/, '');
    viewSql = viewSql.replace(/`u869063079_academias`\./g, '');
    viewSql = viewSql.replace(/`u869063079_guillermina`\./g, '');

    await target.query(`DROP VIEW IF EXISTS \`${viewName}\``);
    await target.query(viewSql);
    console.log(`OK`);
  }

  await target.query('SET FOREIGN_KEY_CHECKS = 1;');

  await src.end();
  await target.end();

  console.log('\n🎉 ¡SINCRONIZACIÓN EXITOSA! u141101294_Academias ahora tiene todas las tablas, columnas SEO y datos actualizados.\n');
}

syncDatabases().catch(err => {
  console.error('❌ Error en sincronización:', err);
  process.exit(1);
});
