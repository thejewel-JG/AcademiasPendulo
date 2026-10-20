import mysql from 'mysql2/promise';
import { hashPassword } from '../authUtils.js';
import { encryptAccountSecret } from '../mailEngine.js';

async function updateDbContact() {
  const targets = [
    {
      name: 'NUEVA DB (srv1017.hstgr.io - u869063079_academias)',
      host: 'srv1017.hstgr.io',
      user: 'u869063079_guillermina',
      password: 'Wattpad_3317',
      database: 'u869063079_academias'
    },
    {
      name: 'ANTERIOR DB (srv1787.hstgr.io - u141101294_Academias)',
      host: 'srv1787.hstgr.io',
      user: 'u141101294_guillermina',
      password: 'Wattpad_3317',
      database: 'u141101294_Academias'
    }
  ];

  const newEmail = 'info.academiaspendulo@gmail.com';
  const newPhone = '620351622';
  const newPass = 'Wattpad_3317';
  const passwordHash = await hashPassword(newPass);
  const secretEncrypted = encryptAccountSecret(newPass);

  for (const t of targets) {
    try {
      console.log(`\n🔄 Actualizando en: ${t.name}...`);
      const conn = await mysql.createConnection({
        host: t.host,
        user: t.user,
        password: t.password,
        database: t.database
      });

      // 1. Actualizar usuario administrador / guillermina
      const [resUsers] = await conn.query(`
        UPDATE usuarios
        SET email = ?,
            email_original = ?,
            telefono = ?,
            password_hash = ?,
            cambio_password_obligatorio = 0
        WHERE email = 'guillerminajoya@gmail.com' 
           OR id = 'usr_guillermina_1789858078788'
      `, [newEmail, newEmail, newPhone, passwordHash]);
      console.log(`  ✅ Usuarios actualizados: ${resUsers.affectedRows}`);

      // 2. Si no existiera o no afectó a nadie, crear o asegurar el usuario administrador
      if (resUsers.affectedRows === 0) {
        await conn.query(`
          INSERT INTO usuarios (id, nombre, apellidos, email, email_original, password_hash, telefono, estado, cambio_password_obligatorio, creado_en)
          VALUES ('usr_admin_pendulo', 'Administración', 'Academias Péndulo', ?, ?, ?, ?, 'ACTIVO', 0, NOW())
          ON DUPLICATE KEY UPDATE telefono = VALUES(telefono), password_hash = VALUES(password_hash)
        `, [newEmail, newEmail, passwordHash, newPhone]);
        
        await conn.query(`
          INSERT IGNORE INTO usuario_roles (usuario_id, rol_id, asignado_por)
          VALUES ('usr_admin_pendulo', 'rol-admin', 'SISTEMA')
        `);
        console.log(`  ✅ Usuario administrador asegurado: ${newEmail}`);
      }

      // Asegurar que el usuario tenga todos los roles
      const [userRows] = await conn.query('SELECT id FROM usuarios WHERE email = ?', [newEmail]);
      if (userRows.length > 0) {
        const uId = userRows[0].id;
        for (const r of ['rol-admin', 'rol-profesor', 'rol-alumno']) {
          await conn.query(`
            INSERT IGNORE INTO usuario_roles (usuario_id, rol_id, asignado_por)
            VALUES (?, ?, 'SISTEMA')
          `, [uId, r]);
        }
        console.log(`  ✅ Roles (ADMIN, PROFESOR, ALUMNO) vinculados al usuario ${uId}`);
      }

      // 3. Actualizar cuentas de correo (reemplazando buzon guillerminajoya@gmail.com)
      const [resCuentas] = await conn.query(`
        UPDATE cuentas_correo
        SET buzon = ?,
            secreto_ref = ?,
            proveedor = 'Gmail SMTP',
            estado = 'ACTIVA'
        WHERE buzon = 'guillerminajoya@gmail.com' OR id = 'acc_gmail_guillermina'
      `, [newEmail, secretEncrypted]);
      console.log(`  ✅ Cuentas de correo actualizadas: ${resCuentas.affectedRows}`);

      await conn.end();
    } catch (err) {
      console.error(`  ❌ Error actualizando ${t.name}:`, err.message);
    }
  }

  console.log('\n🎉 ¡PROCESO DE ACTUALIZACIÓN DE CONTACTO COMPLETADO!');
}

updateDbContact().catch(err => {
  console.error(err);
  process.exit(1);
});
