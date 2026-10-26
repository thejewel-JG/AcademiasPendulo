import mysql from 'mysql2/promise';
import { encryptAccountSecret } from '../mailEngine.js';

const appPassword = 'zdhzjlujcpbhlynb';
const emailUser = 'info.academiaspendulo@gmail.com';
const secretEncrypted = encryptAccountSecret(appPassword);

const configJson = JSON.stringify({
  smtp_host: 'smtp.gmail.com',
  smtp_port: 465,
  smtp_secure: true,
  imap_host: 'imap.gmail.com',
  imap_port: 993,
  imap_tls: true,
  sync_interval_minutes: 5
});

const dbs = [
  {
    name: 'DB1 (Primary srv1017 - u869063079_academias)',
    host: '195.35.53.48',
    user: 'u869063079_guillermina',
    password: 'Wattpad_3317',
    database: 'u869063079_academias'
  },
  {
    name: 'DB2 (Hostinger live srv1787 - u141101294_Academias)',
    host: 'srv1787.hstgr.io',
    user: 'u141101294_guillermina',
    password: 'Wattpad_3317',
    database: 'u141101294_Academias'
  }
];

async function updateAllDbs() {
  for (const dbConfig of dbs) {
    try {
      console.log(`\nActualizando credenciales de correo en: ${dbConfig.name}...`);
      const conn = await mysql.createConnection({
        host: dbConfig.host,
        user: dbConfig.user,
        password: dbConfig.password,
        database: dbConfig.database,
        connectTimeout: 10000
      });

      const [rows] = await conn.query('SELECT id FROM cuentas_correo WHERE buzon = ?', [emailUser]);
      if (rows.length > 0) {
        await conn.query(
          `UPDATE cuentas_correo 
           SET secreto_ref = ?, estado = 'ACTIVA', proveedor = 'Gmail SMTP/IMAP', configuracion = ? 
           WHERE buzon = ?`,
          [secretEncrypted, configJson, emailUser]
        );
        console.log(`  ✅ Cuenta ${emailUser} actualizada con éxito en ${dbConfig.name}`);
      } else {
        await conn.query(
          `INSERT INTO cuentas_correo (id, buzon, proveedor, estado, secreto_ref, configuracion, creado_en)
           VALUES ('acc_gmail_guillermina', ?, 'Gmail SMTP/IMAP', 'ACTIVA', ?, ?, NOW())`,
          [emailUser, secretEncrypted, configJson]
        );
        console.log(`  ✅ Cuenta ${emailUser} insertada con éxito en ${dbConfig.name}`);
      }
      await conn.end();
    } catch (err) {
      console.error(`  ❌ Error en ${dbConfig.name}:`, err.message);
    }
  }
}

updateAllDbs();
