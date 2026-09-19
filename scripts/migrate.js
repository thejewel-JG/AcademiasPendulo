import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  const host = process.env.DB_HOST || 'srv1787.hstgr.io';
  const port = parseInt(process.env.DB_PORT || '3306');
  const user = process.env.DB_USER || 'u141101294_guillermina';
  const password = process.env.DB_PASS || 'Wattpad_3317';
  const database = process.env.DB_NAME || 'u141101294_Academias';

  console.log(`\n🚀 INICIANDO MIGRACIONES EN HOSTINGER MYSQL...`);
  console.log(`   Host: ${host}:${port}`);
  console.log(`   User: ${user}`);
  console.log(`   DB:   ${database}\n`);

  let connection;

  try {
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database,
      multipleStatements: true,
      connectTimeout: 10000,
    });

    console.log(`✅ Conexión establecida con Hostinger.`);

    // 1. Asegurar tabla de migraciones
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`migraciones\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`version\` VARCHAR(50) NOT NULL UNIQUE,
        \`nombre\` VARCHAR(255) NOT NULL,
        \`ejecutado_en\` DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. Leer archivos de migración
    const migrationsDir = path.join(__dirname, '..', 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      console.error(`❌ El directorio ${migrationsDir} no existe.`);
      process.exit(1);
    }

    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log(`📂 Se han encontrado ${files.length} archivos de migración.`);

    // 3. Obtener migraciones ya ejecutadas
    const [rows] = await connection.query(`SELECT version FROM migraciones`);
    const executedVersions = new Set(rows.map(r => r.version));

    // 4. Ejecutar pendientes
    for (const file of files) {
      const version = file.replace(/\.sql$/, '');

      if (executedVersions.has(version)) {
        console.log(`  🔹 Migración [${version}] ya fue ejecutada previamente. Omitiendo.`);
        continue;
      }

      console.log(`  ⏳ Ejecutando migración: [${file}] ...`);
      const filePath = path.join(migrationsDir, file);
      const sqlContent = fs.readFileSync(filePath, 'utf-8');

      // Ejecutar DDL
      await connection.query(sqlContent);

      // Registrar en la tabla de migraciones
      await connection.query(
        `INSERT INTO migraciones (version, nombre) VALUES (?, ?)`,
        [version, file]
      );

      console.log(`  ✅ Migración [${version}] completada y registrada con éxito.`);
    }

    console.log(`\n🎉 ¡TODAS LAS MIGRACIONES SE HAN APLICADO CORRECTAMENTE EN HOSTINGER!\n`);
  } catch (error) {
    console.error(`\n❌ ERROR DURANTE LA EJECUCIÓN DE MIGRACIONES: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runMigrations();
