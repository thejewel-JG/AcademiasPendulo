import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  console.log('SMTP_USER:', process.env.SMTP_USER);
  console.log('SMTP_HOST:', process.env.SMTP_HOST);
  console.log('SMTP_PORT:', process.env.SMTP_PORT);

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 465),
    secure: Number(process.env.SMTP_PORT || 465) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    tls: { rejectUnauthorized: false }
  });

  try {
    const info = await transporter.sendMail({
      from: `"Academias Péndulo" <${process.env.SMTP_USER}>`,
      to: 'guillerminajoya@gmail.com',
      subject: 'Prueba de envío Trabaja con Nosotros',
      text: 'Este es un correo de prueba con archivo adjunto.',
      attachments: [
        {
          filename: 'prueba.txt',
          content: 'Contenido de prueba de CV'
        }
      ]
    });
    console.log('✅ ENVÍO EXITOSO:', info);
  } catch (err) {
    console.error('❌ ERROR AL ENVIAR SMTP:', err);
  }
  process.exit(0);
}

test();
