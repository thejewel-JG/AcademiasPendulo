import pool from '../db.js';
import { encryptAccountSecret } from '../mailEngine.js';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const db = pool;

async function registerGmailAccount() {
  const email = 'academiaspendulo@gmail.com';
  const pass = 'Wattpad_3317';

  console.log(`\n--- CONFIGURING GMAIL ACCOUNT ${email} IN DATABASE ---\n`);

  try {
    const secretoEncrypted = encryptAccountSecret(pass);
    const accountId = 'acc_gmail_academiaspendulo';

    const [existing] = await db.query('SELECT * FROM cuentas_correo WHERE buzon = ?', [email]);

    const configJson = JSON.stringify({
      smtp_host: 'smtp.gmail.com',
      smtp_port: 465,
      imap_host: 'imap.gmail.com',
      imap_port: 993,
      sync_interval_minutes: 5
    });

    if (existing.length > 0) {
      await db.query(`
        UPDATE cuentas_correo 
        SET secreto_ref = ?, proveedor = 'Gmail SMTP/IMAP', estado = 'ACTIVA', configuracion = ?
        WHERE buzon = ?
      `, [secretoEncrypted, configJson, email]);
      console.log(`  ✅ Updated existing mail account entry in MySQL for ${email}`);
    } else {
      await db.query(`
        INSERT INTO cuentas_correo (id, buzon, proveedor, estado, secreto_ref, configuracion)
        VALUES (?, ?, 'Gmail SMTP/IMAP', 'ACTIVA', ?, ?)
      `, [accountId, email, secretoEncrypted, configJson]);
      console.log(`  ✅ Inserted new mail account entry in MySQL for ${email}`);
    }

    // Attempt SMTP test connection using Nodemailer
    console.log('\n--- TESTING SMTP CONNECTION TO GMAIL ---');
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: email,
        pass: pass
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    try {
      await transporter.verify();
      console.log('  🎉 GMAIL SMTP CONNECTION SUCCESSFUL!');
    } catch (smtpErr) {
      console.warn('  ⚠️ GMAIL SMTP VERIFICATION RESPONSE:', smtpErr.message);
      if (smtpErr.message.includes('InvalidSecondFactor') || smtpErr.message.includes('535-5.7.8') || smtpErr.message.includes('Application-specific password')) {
        console.log('  ℹ️ Google requires a 16-character App Password (Contraseña de aplicación) because 2-step verification is enabled on Gmail.');
      }
    }

  } catch (err) {
    console.error('Error configuring Gmail account:', err);
  } finally {
    process.exit(0);
  }
}

registerGmailAccount();
