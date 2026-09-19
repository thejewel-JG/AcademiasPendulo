import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runDatabaseSetup() {
  const host = process.env.DB_HOST || 'srv1787.hstgr.io';
  const user = process.env.DB_USER || 'u141101294_guillermina';
  const password = process.env.DB_PASS || 'Wattpad_3317';
  const database = process.env.DB_NAME || 'u141101294_guillermina';
  const port = Number(process.env.DB_PORT) || 3306;

  console.log(`📡 Intentando conectar a MySQL en Hostinger...`);
  console.log(`   Host: ${host} (${port})`);
  console.log(`   Base de datos: ${database}`);
  console.log(`   Usuario: ${user}`);

  try {
    const connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database,
      multipleStatements: true,
      ssl: { rejectUnauthorized: false },
    });

    console.log(`✅ Conexión establecida con éxito con el servidor de Hostinger!`);

    const schemaPath = path.join(__dirname, '..', 'schema.sql');
    const sqlContent = fs.readFileSync(schemaPath, 'utf-8');

    console.log(`🔄 Ejecutando archivo schema.sql para crear todas las tablas...`);
    await connection.query(sqlContent);

    console.log(`🎉 ¡ÉXITO! Se han creado todas las tablas y datos oficiales en Hostinger.`);
    await connection.end();
  } catch (error) {
    console.error(`❌ Error al conectar con la base de datos de Hostinger:`, error.message);
    if (error.code === 'ETIMEDOUT' || error.code === 'ER_ACCESS_DENIED_ERROR' || error.message.includes('Access denied')) {
      console.log(`👉 Asegúrate de haber marcado "Cualquier host" y hecho clic en "Crear" en el panel de Hostinger.`);
    }
  }
}

runDatabaseSetup();
