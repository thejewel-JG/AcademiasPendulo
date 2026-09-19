import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { hashPassword, normalizeEmail, generateTempPassword } from '../authUtils.js';

dotenv.config();

async function createFirstAdmin() {
  const host = process.env.DB_HOST || 'srv1787.hstgr.io';
  const port = parseInt(process.env.DB_PORT || '3306');
  const user = process.env.DB_USER || 'u141101294_guillermina';
  const password = process.env.DB_PASS || 'Wattpad_3317';
  const database = process.env.DB_NAME || 'u141101294_Academias';

  console.log(`\n🔑 COMANDO PRIVADO: INICIALIZACIÓN DE PRIMER ADMINISTRADOR...`);

  // Parse CLI args
  const args = process.argv.slice(2);
  let emailArg = '';
  let nameArg = 'Administrador';
  let lastNameArg = 'Principal';
  let passArg = '';

  for (const arg of args) {
    if (arg.startsWith('--email=')) emailArg = arg.split('=')[1];
    if (arg.startsWith('--nombre=')) nameArg = arg.split('=')[1];
    if (arg.startsWith('--apellidos=')) lastNameArg = arg.split('=')[1];
    if (arg.startsWith('--password=')) passArg = arg.split('=')[1];
  }

  const email = normalizeEmail(emailArg || 'admin@academiaspendulo.com');
  const emailOriginal = emailArg || 'admin@academiaspendulo.com';
  const rawPassword = passArg || 'AdminPendulo2026!';

  let connection;
  try {
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database,
      multipleStatements: true
    });

    // Check if an active admin user already exists
    const [rows] = await connection.query(`
      SELECT u.id, u.email 
      FROM usuarios u
      JOIN usuario_roles ur ON u.id = ur.usuario_id
      JOIN roles r ON ur.rol_id = r.id
      WHERE r.codigo = 'ADMINISTRADOR' AND u.estado = 'ACTIVO'
      LIMIT 1
    `);

    if (rows.length > 0 && !emailArg) {
      console.log(`✅ Ya existe un administrador activo en el sistema: [${rows[0].email}].`);
      console.log(`ℹ️ Si deseas crear otro administrador, especifica los argumentos: --email=... --password=...`);
      await connection.end();
      return;
    }

    const userId = `usr-admin-${Date.now().toString(36)}`;
    const passHash = await hashPassword(rawPassword);

    await connection.beginTransaction();

    // 1. Insert or update user
    await connection.query(`
      INSERT INTO usuarios (
        id, nombre, apellidos, email, email_original, password_hash, estado, cambio_password_obligatorio
      ) VALUES (?, ?, ?, ?, ?, ?, 'ACTIVO', 0)
      ON DUPLICATE KEY UPDATE 
        password_hash = VALUES(password_hash),
        estado = 'ACTIVO',
        cambio_password_obligatorio = 0
    `, [userId, nameArg, lastNameArg, email, emailOriginal, passHash]);

    // Retrieve existing ID if duplicate
    const [[userRecord]] = await connection.query(`SELECT id FROM usuarios WHERE email = ?`, [email]);
    const actualUserId = userRecord ? userRecord.id : userId;

    // 2. Assign ADMINISTRADOR role
    await connection.query(`
      INSERT INTO usuario_roles (usuario_id, rol_id, asignado_por)
      VALUES (?, 'rol-admin', 'SYSTEM_SEED')
      ON DUPLICATE KEY UPDATE asignado_por = VALUES(asignado_por)
    `, [actualUserId]);

    await connection.commit();

    console.log(`\n🎉 ¡ADMINISTRADOR INICIALIZADO CON ÉXITO!`);
    console.log(`   ID:         ${actualUserId}`);
    console.log(`   Email:      ${email}`);
    console.log(`   Password:   ${rawPassword}`);
    console.log(`   Rol:        ADMINISTRADOR`);
    console.log(`   Obligación: Cambio de contraseña desactivado para admin inicial.\n`);

  } catch (err) {
    if (connection) await connection.rollback();
    console.error(`❌ Error al crear administrador: ${err.message}`);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

createFirstAdmin();
