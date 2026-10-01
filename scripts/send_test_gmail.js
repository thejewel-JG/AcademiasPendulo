import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

async function sendGmailTest() {
  const user = 'guillerminajoya@gmail.com';
  const pass = 'rrinuaklqitwalso';
  const targetEmail = 'guillerminajoya@gmail.com';

  console.log(`\n--- PROBANDO ENVÍO SMTP DE GMAIL ---`);
  console.log(`Usuario: ${user}`);
  console.log(`Destinatario: ${targetEmail}`);

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: user,
      pass: pass
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('Verificando credenciales SMTP con Gmail...');
    await transporter.verify();
    console.log('✅ ¡AUTENTICACIÓN EXITOSA CON GMAIL!');

    const info = await transporter.sendMail({
      from: `"Academias Péndulo" <${user}>`,
      to: targetEmail,
      subject: '🎉 Prueba Exitosa - Sistema de Correos Automáticos Academias Péndulo',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e0e7ff; border-radius: 12px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #4f46e5; margin: 0;">Academias Péndulo</h1>
            <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">Centro de Formación Profesional</p>
          </div>
          <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 20px 0;" />
          <h2 style="color: #1f2937;">¡Conexión de correo activada con éxito!</h2>
          <p>Hola <strong>Guillermina</strong>,</p>
          <p>Este es un correo automático de prueba confirmado desde el servidor de <strong>Academias Péndulo</strong>.</p>
          <p>A partir de ahora, todas las alertas automáticas del sistema, notificaciones de alumnos, restablecimientos de contraseña y mensajes del campus llegarán a tu bandeja de entrada personal.</p>
          <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 12px 16px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #166534; font-weight: 600;">✅ Estado: Sistema de correos en vivo activado</p>
          </div>
          <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 20px 0;" />
          <p style="font-size: 12px; color: #9ca3af; text-align: center;">Enviado el ${new Date().toLocaleString('es-ES')}</p>
        </div>
      `
    });

    console.log('🚀 ¡CORREO ENVIADO CON ÉXITO A TU BANDEJA DE ENTRADA!');
    console.log('ID del mensaje:', info.messageId);
    console.log('Respuesta SMTP:', info.response);

  } catch (err) {
    console.error('❌ Error en el envío de correo:', err.message);
  } finally {
    process.exit(0);
  }
}

sendGmailTest();
