import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

async function sendTestEmail() {
  const targetEmail = 'guillerminajoya@gmail.com';
  console.log(`\n--- ENVIANDO CORREO DE PRUEBA A: ${targetEmail} ---\n`);

  // Try Hostinger SMTP first if available, or configurable transport
  const host = process.env.SMTP_HOST || 'smtp.hostinger.com';
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER || 'u141101294_guillermina';
  const pass = process.env.SMTP_PASS || process.env.DB_PASS || 'Wattpad_3317';

  console.log(`Configuración SMTP: Host=${host}, Port=${port}, User=${user}`);

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: { rejectUnauthorized: false }
  });

  try {
    const verified = await transporter.verify();
    console.log('✅ Verificación SMTP exitosa:', verified);

    const info = await transporter.sendMail({
      from: `"Academias Péndulo Test" <${user}>`,
      to: targetEmail,
      subject: '🧪 Correo de prueba automático - Academias Péndulo',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #4f46e5;">Prueba de Mensajes Automáticos - Academias Péndulo</h2>
          <p>Hola <strong>Guillermina</strong>,</p>
          <p>Este es un correo de prueba enviado desde el sistema de <strong>Academias Péndulo</strong> para verificar la entrega automática a tu dirección personal (<code>${targetEmail}</code>).</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #666;">Fecha de envío: ${new Date().toLocaleString('es-ES')}</p>
        </div>
      `
    });

    console.log('🎉 ¡CORREO ENVIADO CON ÉXITO!');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
  } catch (err) {
    console.error('❌ Error al enviar correo SMTP:', err.message);
    console.log('\nDetalles del error:', err);
  } finally {
    process.exit(0);
  }
}

sendTestEmail();
