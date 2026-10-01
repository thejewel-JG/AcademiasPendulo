import pool from '../db.js';
import { encryptAccountSecret } from '../mailEngine.js';

const db = pool;

async function updateAccount() {
  const email = 'guillerminajoya@gmail.com';
  const pass = 'rrinuaklqitwalso';
  const secretoEncrypted = encryptAccountSecret(pass);

  const configJson = JSON.stringify({
    smtp_host: 'smtp.gmail.com',
    smtp_port: 465,
    imap_host: 'imap.gmail.com',
    imap_port: 993,
    sync_interval_minutes: 5
  });

  const [existing] = await db.query('SELECT * FROM cuentas_correo WHERE buzon = ?', [email]);

  if (existing.length > 0) {
    await db.query(`
      UPDATE cuentas_correo 
      SET secreto_ref = ?, proveedor = 'Gmail SMTP', estado = 'ACTIVA', configuracion = ?
      WHERE buzon = ?
    `, [secretoEncrypted, configJson, email]);
    console.log('✅ Cuenta de correo de Guillermina actualizada en MySQL (Hostinger)');
  } else {
    await db.query(`
      INSERT INTO cuentas_correo (id, buzon, proveedor, estado, secreto_ref, configuracion)
      VALUES ('acc_gmail_guillermina', ?, 'Gmail SMTP', 'ACTIVA', ?, ?)
    `, [email, secretoEncrypted, configJson]);
    console.log('✅ Nueva cuenta de correo de Guillermina insertada en MySQL (Hostinger)');
  }

  process.exit(0);
}

updateAccount().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
