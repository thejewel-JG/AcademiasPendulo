import nodemailer from 'nodemailer';

async function testGmailAppPassword() {
  const user = 'info.academiaspendulo@gmail.com';
  const pass = 'zdhzjlujcpbhlynb'; // App Password provided by user

  console.log('--- Probando conexión SMTP de Gmail con la Contraseña de Aplicación ---');
  
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass },
    tls: { rejectUnauthorized: false }
  });

  try {
    await transporter.verify();
    console.log('✅ ¡AUTENTICACIÓN EXITOSA CON GMAIL!');
    return true;
  } catch (err) {
    console.error('❌ Error de autenticación:', err.message);
    return false;
  }
}

testGmailAppPassword();
