import mysql from 'mysql2/promise';

async function cloneDatabase() {
  console.log('🚀 Iniciando clonación / montaje de base de datos en Hostinger...');
  
  const src = await mysql.createConnection({
    host: 'srv1787.hstgr.io',
    user: 'u141101294_guillermina',
    password: 'Wattpad_3317',
    database: 'u141101294_Academias',
    multipleStatements: true
  });

  const target = await mysql.createConnection({
    host: 'srv1017.hstgr.io',
    user: 'u869063079_guillermina',
    password: 'Wattpad_3317',
    database: 'u869063079_academias',
    multipleStatements: true
  });

  console.log('✅ Conexión establecida con origen (u141101294_Academias) y destino (u869063079_academias).');

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
    process.stdout.write(`➡️ Creando tabla ${tableName}... `);
    const [createResult] = await src.query(`SHOW CREATE TABLE \`${tableName}\``);
    let createSql = createResult[0]['Create Table'];
    
    createSql = createSql.replace(/`u141101294_Academias`\./g, '');
    createSql = createSql.replace(/`u141101294_guillermina`\./g, '');

    await target.query(`DROP TABLE IF EXISTS \`${tableName}\``);
    await target.query(createSql);
    console.log(`OK`);
  }
  console.log('✅ Todas las tablas base creadas.');

  // 2. Copiar datos
  for (const tableName of baseTables) {
    const [rowsCount] = await src.query(`SELECT COUNT(*) as cnt FROM \`${tableName}\``);
    const count = rowsCount[0].cnt;
    if (count === 0) {
      continue;
    }
    process.stdout.write(`📦 Copiando ${count} filas en ${tableName}... `);

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
  console.log('✅ Todos los registros y datos copiados con éxito.');

  // 3. Crear vistas
  for (const viewName of views) {
    process.stdout.write(`➡️ Creando vista ${viewName}... `);
    const [createResult] = await src.query(`SHOW CREATE VIEW \`${viewName}\``);
    let viewSql = createResult[0]['Create View'];
    
    viewSql = viewSql.replace(/ALGORITHM=[A-Z]+ DEFINER=`[^`]+`@`[^`]+` SQL SECURITY DEFINER/, '');
    viewSql = viewSql.replace(/DEFINER=`[^`]+`@`[^`]+`/, '');
    viewSql = viewSql.replace(/`u141101294_Academias`\./g, '');
    viewSql = viewSql.replace(/`u141101294_guillermina`\./g, '');

    await target.query(`DROP VIEW IF EXISTS \`${viewName}\``);
    await target.query(viewSql);
    console.log(`OK`);
  }
  console.log('✅ Todas las vistas creadas.');

  await target.query('SET FOREIGN_KEY_CHECKS = 1;');

  // Verificación final en el destino
  const [destTables] = await target.query('SHOW TABLES');
  console.log(`\n🎉 ¡MONTAJE Y MIGRACIÓN COMPLETADA CON ÉXITO!`);
  console.log(`📊 Total de tablas y vistas en u869063079_academias: ${destTables.length}`);

  await src.end();
  await target.end();
}

cloneDatabase().catch(err => {
  console.error('\n❌ Error durante la clonación:', err);
  process.exit(1);
});
