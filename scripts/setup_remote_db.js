import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function tryConnection(host, user, password, database) {
  console.log(`\n📡 Probando conexión:`);
  console.log(`   Host: ${host}`);
  console.log(`   User: ${user}`);
  console.log(`   DB:   ${database}`);

  try {
    const connection = await mysql.createConnection({
      host,
      port: 3306,
      user,
      password,
      database,
      multipleStatements: true,
      connectTimeout: 10000,
    });

    console.log(`✅ ¡CONEXIÓN EXITOSA CON HOSTINGER! (${host} / ${database})`);

    const schemaPath = path.join(__dirname, '..', 'schema.sql');
    let sqlContent = fs.readFileSync(schemaPath, 'utf-8');

    // Replace database name in schema if needed
    sqlContent = sqlContent.replace(/`u141101294_guillermina`/g, `\`${database}\``);

    console.log(`🔄 Ejecutando archivo schema.sql para crear todas las tablas oficiales...`);
    await connection.query(sqlContent);

    console.log(`🎉 ¡ÉXITO TOTAL! Se han creado las 8 tablas y las 33 especialidades en Hostinger (${database}).`);
    await connection.end();
    return true;
  } catch (error) {
    console.log(`❌ Error (${host}): ${error.message}`);
    return false;
  }
}

async function runDatabaseSetup() {
  const password = process.env.DB_PASS || 'Wattpad_3317';

  const hosts = ['srv1787.hstgr.io', '193.203.168.172', 'auth-db1787.hstgr.io'];
  const databases = ['u141101294_Academias', 'u141101294_guillermina'];
  const users = ['u141101294_guillermina', 'u141101294_Academias', 'u141101294'];

  for (const host of hosts) {
    for (const db of databases) {
      for (const u of users) {
        const success = await tryConnection(host, u, password, db);
        if (success) {
          console.log(`\n✨ ¡Base de datos de Hostinger lista e inicializada con éxito!`);
          return;
        }
      }
    }
  }

  console.log(`\n⚠️ Si la conexión falla por "Access Denied", asegúrate de pulsar "Crear" en el panel de MySQL Remoto de Hostinger habiendo marcado "Cualquier host".`);
}

runDatabaseSetup();
