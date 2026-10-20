import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { hashPassword } from '../authUtils.js';
import { encryptAccountSecret } from '../mailEngine.js';

dotenv.config();

async function configureAdminAndInbox() {
  console.log('--- CONFIGURANDO USUARIO ADMIN Y BANDEJA info.academiaspendulo@gmail.com ---');

  const host = process.env.DB_HOST || 'srv1017.hstgr.io';
  const user = process.env.DB_USER || 'u869063079_guillermina';
  const password = process.env.DB_PASS || 'Wattpad_3317';
  const database = process.env.DB_NAME || 'u869063079_academias';

  const conn = await mysql.createConnection({ host, user, password, database });

  const adminEmail = 'info.academiaspendulo@gmail.com';
  const adminPass = 'Wattpad_3317';
  const passHash = await hashPassword(adminPass);
  const secretEnc = encryptAccountSecret(adminPass);
  const phone = '620351622';

  // 1. Check existing users
  const [users] = await conn.query('SELECT * FROM usuarios WHERE email = ? OR email = ? OR id LIKE ?', 
    [adminEmail, 'guillerminajoya@gmail.com', '%guillermina%']);
  console.log('Usuarios encontrados:', users);

  // 2. Ensure user info.academiaspendulo@gmail.com has clean name, password hash, and no trace of guillermina
  if (users.length > 0) {
    for (const u of users) {
      await conn.query(`
        UPDATE usuarios 
        SET nombre = 'Administración',
            apellidos = 'Academias Péndulo',
            email = ?,
            email_original = ?,
            telefono = ?,
            password_hash = ?,
            cambio_password_obligatorio = 0,
            estado = 'ACTIVO'
        WHERE id = ?
      `, [adminEmail, adminEmail, phone, passHash, u.id]);
      console.log(`✅ Usuario ${u.id} actualizado con email ${adminEmail} y password Wattpad_3317`);
    }
  } else {
    const newId = 'usr_admin_info_pendulo';
    await conn.query(`
      INSERT INTO usuarios (id, nombre, apellidos, email, email_original, telefono, password_hash, estado, cambio_password_obligatorio, creado_en)
      VALUES (?, 'Administración', 'Academias Péndulo', ?, ?, ?, ?, 'ACTIVO', 0, NOW())
    `, [newId, adminEmail, adminEmail, phone, passHash]);
    console.log(`✅ Creado nuevo usuario ${newId} con email ${adminEmail}`);
  }

  // 3. Obtain user id for info.academiaspendulo@gmail.com
  const [adminUserRows] = await conn.query('SELECT id FROM usuarios WHERE email = ?', [adminEmail]);
  if (adminUserRows.length === 0) {
    throw new Error('No se encontró el usuario admin tras actualización');
  }
  const adminUserId = adminUserRows[0].id;

  // 4. Grant ALL ROLES to this user ('rol-admin', 'rol-profesor', 'rol-alumno')
  const roles = ['rol-admin', 'rol-profesor', 'rol-alumno'];
  for (const r of roles) {
    await conn.query(`
      INSERT IGNORE INTO usuario_roles (usuario_id, rol_id, asignado_por, creado_en)
      VALUES (?, ?, 'SISTEMA', NOW())
    `, [adminUserId, r]);
  }
  console.log(`✅ Todos los roles (${roles.join(', ')}) asignados a ${adminUserId} (${adminEmail})`);

  // 5. Delete any remaining users with guillerminajoya@gmail.com if different from adminUserId
  const [deletedUsers] = await conn.query(`
    DELETE FROM usuarios 
    WHERE email = 'guillerminajoya@gmail.com' AND id != ?
  `, [adminUserId]);
  console.log(`✅ Usuarios residuales con guillerminajoya@gmail.com eliminados: ${deletedUsers.affectedRows}`);

  // 6. Configure cuentas_correo for info.academiaspendulo@gmail.com
  // Disable or remove erroneous/old accounts
  await conn.query(`
    UPDATE cuentas_correo 
    SET estado = 'INACTIVA'
    WHERE buzon != ?
  `, [adminEmail]);

  // Insert or update info.academiaspendulo@gmail.com as the primary active inbox
  const gmailConfig = JSON.stringify({
    smtp_host: 'smtp.gmail.com',
    smtp_port: 465,
    smtp_secure: true,
    imap_host: 'imap.gmail.com',
    imap_port: 993,
    imap_tls: true,
    sync_interval_minutes: 5
  });

  const [existingCuentas] = await conn.query('SELECT id FROM cuentas_correo WHERE buzon = ?', [adminEmail]);
  if (existingCuentas.length > 0) {
    await conn.query(`
      UPDATE cuentas_correo
      SET proveedor = 'Gmail SMTP/IMAP',
          estado = 'ACTIVA',
          secreto_ref = ?,
          configuracion = ?
      WHERE buzon = ?
    `, [secretEnc, gmailConfig, adminEmail]);
    console.log(`✅ Cuenta de correo para ${adminEmail} actualizada a ACTIVA con secreto cifrado.`);
  } else {
    await conn.query(`
      INSERT INTO cuentas_correo (id, buzon, proveedor, estado, secreto_ref, configuracion, creado_en)
      VALUES ('acc_gmail_info_academiaspendulo', ?, 'Gmail SMTP/IMAP', 'ACTIVA', ?, ?, NOW())
    `, [adminEmail, secretEnc, gmailConfig]);
    console.log(`✅ Cuenta de correo para ${adminEmail} insertada como ACTIVA.`);
  }

  // 7. Verify result
  const [finalUsers] = await conn.query('SELECT id, nombre, apellidos, email, telefono, estado FROM usuarios WHERE email = ?', [adminEmail]);
  console.log('\n--- VERIFICACIÓN USUARIO FINAL ---');
  console.table(finalUsers);

  const [finalRoles] = await conn.query(`
    SELECT ur.usuario_id, ur.rol_id, r.codigo, r.nombre 
    FROM usuario_roles ur 
    JOIN roles r ON r.id = ur.rol_id 
    WHERE ur.usuario_id = ?
  `, [adminUserId]);
  console.log('\n--- VERIFICACIÓN ROLES ASIGNADOS ---');
  console.table(finalRoles);

  const [finalCuentas] = await conn.query('SELECT id, buzon, proveedor, estado FROM cuentas_correo');
  console.log('\n--- VERIFICACIÓN CUENTAS DE CORREO ---');
  console.table(finalCuentas);

  await conn.end();
  console.log('\n🎉 ¡PROCESO DE ACTUALIZACIÓN FINALIZADO CON ÉXITO!');
}

configureAdminAndInbox().catch(err => {
  console.error('❌ Error configurando admin y buzón:', err);
  process.exit(1);
});
