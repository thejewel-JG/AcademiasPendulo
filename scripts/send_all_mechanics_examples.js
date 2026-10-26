import nodemailer from 'nodemailer';

const user = 'info.academiaspendulo@gmail.com';
const pass = 'zdhzjlujcpbhlynb';

// Send to both user's linked emails
const recipients = ['info.academiaspendulo@gmail.com', 'thejeweljg@gmail.com'];

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: { user, pass },
  tls: { rejectUnauthorized: false }
});

const emailsToSend = [
  {
    id: 1,
    subject: '🔔 [MECÁNICA 1] Nueva Solicitud de Información: Carlos Mendoza - OPERACIONES AUXILIARES DE MANTENIMIENTO EN ELECTROMECÁNICA DE VEHÍCULOS',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 14px; background: #ffffff; color: #1e293b;">
        <div style="display: flex; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 20px;">
          <div>
            <h2 style="color: #dc2626; margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">ACADEMIAS PÉNDULO</h2>
            <p style="color: #64748b; font-size: 13px; margin: 2px 0 0 0; font-weight: 500;">Bandeja de Entrada de Secretaría · Lead Comercial Web</p>
          </div>
        </div>

        <div style="background: #f8fafc; border-left: 4px solid #dc2626; padding: 14px 18px; border-radius: 6px; margin-bottom: 22px;">
          <h3 style="margin: 0; font-size: 15px; color: #0f172a;">Nueva consulta recibida desde el formulario público de cursos</h3>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #475569;">Un usuario interesado ha solicitado información detallada sobre uno de los cursos abiertos.</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 22px;">
          <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 6px; font-weight: 600; width: 160px; color: #475569;">Nombre completo:</td><td style="padding: 10px 6px; font-weight: 700; color: #0f172a;">Carlos Mendoza López</td></tr>
          <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 6px; font-weight: 600; color: #475569;">Teléfono:</td><td style="padding: 10px 6px;"><a href="tel:654987321" style="color: #dc2626; font-weight: 700; text-decoration: none;">654 987 321</a></td></tr>
          <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 6px; font-weight: 600; color: #475569;">Correo electrónico:</td><td style="padding: 10px 6px;"><a href="mailto:carlos.mendoza.alumno@gmail.com" style="color: #2563eb; text-decoration: none;">carlos.mendoza.alumno@gmail.com</a></td></tr>
          <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 6px; font-weight: 600; color: #475569;">Curso de interés:</td><td style="padding: 10px 6px; font-weight: 700; color: #dc2626;">OPERACIONES AUXILIARES DE MANTENIMIENTO EN ELECTROMECÁNICA DE VEHÍCULOS (TMVG0109 - 380h)</td></tr>
          <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 6px; font-weight: 600; color: #475569;">Horario preferido:</td><td style="padding: 10px 6px;">Tardes (16:00 a 21:00)</td></tr>
          <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 10px 6px; font-weight: 600; color: #475569;">Situación laboral:</td><td style="padding: 10px 6px;">Desempleado / Demandante de Empleo</td></tr>
          <tr><td style="padding: 10px 6px; font-weight: 600; color: #475569; vertical-align: top;">Comentarios / Consulta:</td><td style="padding: 10px 6px; color: #1e293b; background: #fff1f2; border-radius: 6px;">"Buenas tardes, me gustaría saber si este curso cuenta con prácticas garantizadas en talleres oficiales de Almería y cuándo empieza el próximo turno."</td></tr>
        </table>

        <div style="border-top: 1px solid #e2e8f0; padding-top: 14px; text-align: center; font-size: 12px; color: #94a3b8;">
          ID de Solicitud: req_demo_01 | Generado automáticamente por penduloformacion.com
        </div>
      </div>
    `
  },
  {
    id: 2,
    subject: '✅ [MECÁNICA 2] Hemos recibido tu consulta — Academias Péndulo (TMVG0109)',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 14px; background: #ffffff; color: #1e293b;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #dc2626; margin: 0; font-size: 24px; font-weight: 900; letter-spacing: -0.5px;">ACADEMIAS PÉNDULO</h1>
          <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">Centro Oficial de Formación Profesional en Automoción · Almería</p>
        </div>

        <div style="border-top: 1px solid #f1f5f9; padding-top: 20px;">
          <h2 style="color: #0f172a; font-size: 18px; margin-top: 0;">¡Hola Carlos! Gracias por tu interés</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #334155;">
            Hemos recibido correctamente tu solicitud de información a través de nuestra web. Un asesor de secretaría académica revisará tu consulta y se pondrá en contacto contigo a la mayor brevedad en tu teléfono <strong>654 987 321</strong>.
          </p>

          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; font-weight: 700;">Especialidad Consultada:</p>
            <p style="margin: 6px 0 0 0; font-size: 15px; font-weight: 800; color: #dc2626;">OPERACIONES AUXILIARES DE MANTENIMIENTO EN ELECTROMECÁNICA DE VEHÍCULOS</p>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #475569;">Código SEPE: TMVG0109 · Duración: 380 horas oficiales presenciales</p>
          </div>

          <p style="font-size: 13px; color: #475569; line-height: 1.6;">
            Si necesitas atención inmediata, puedes visitarnos en nuestro centro en Huércal de Almería o llamarnos al <strong>950 000 000</strong>.
          </p>
        </div>

        <div style="border-top: 1px solid #f1f5f9; margin-top: 24px; padding-top: 16px; text-align: center; font-size: 11px; color: #94a3b8;">
          Academias Péndulo · Centro Homologado de Formación Profesional Oficial
        </div>
      </div>
    `
  },
  {
    id: 3,
    subject: '📋 [MECÁNICA 3] Nueva Solicitud Oficial de Matrícula: Laura Fernández (REQ-2026-0842)',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 14px; background: #ffffff; color: #1e293b;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 20px;">
          <div>
            <h2 style="color: #dc2626; margin: 0; font-size: 20px; font-weight: 900;">ACADEMIAS PÉNDULO</h2>
            <p style="color: #64748b; font-size: 13px; margin: 2px 0 0 0;">Expediente de Admisión Formal Registrado</p>
          </div>
          <div style="text-align: right;">
            <span style="background: #fee2e2; color: #991b1b; padding: 6px 12px; border-radius: 6px; font-weight: 800; font-size: 13px; font-family: monospace;">REQ-2026-0842</span>
          </div>
        </div>

        <div style="background: #f0fdf4; border-left: 4px solid #16a34a; padding: 14px 18px; border-radius: 6px; margin-bottom: 22px;">
          <h3 style="margin: 0; font-size: 15px; color: #14532d;">Solicitud de matrícula formal completada en el portal</h3>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #166534;">El alumno ha completado el formulario oficial de inscripción con firma electrónica.</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 22px;">
          <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 9px 6px; font-weight: 600; width: 170px; color: #475569;">Nº Expediente:</td><td style="padding: 9px 6px; font-family: monospace; font-weight: 800; color: #dc2626;">REQ-2026-0842</td></tr>
          <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 9px 6px; font-weight: 600; color: #475569;">Aspirante:</td><td style="padding: 9px 6px; font-weight: 700; color: #0f172a;">Laura Fernández Gómez</td></tr>
          <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 9px 6px; font-weight: 600; color: #475569;">DNI / NIE:</td><td style="padding: 9px 6px; font-family: monospace; font-weight: 700;">77123456K</td></tr>
          <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 9px 6px; font-weight: 600; color: #475569;">Teléfono:</td><td style="padding: 9px 6px;">678 123 456</td></tr>
          <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 9px 6px; font-weight: 600; color: #475569;">Curso seleccionado:</td><td style="padding: 9px 6px; font-weight: 700; color: #dc2626;">MANTENIMIENTO DE LOS SISTEMAS ELÉCTRICOS Y ELECTRÓNICOS DE VEHÍCULOS (TMVG0209 - 520h)</td></tr>
          <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 9px 6px; font-weight: 600; color: #475569;">Modalidad de Pago:</td><td style="padding: 9px 6px; font-weight: 700; color: #2563eb;">Transferencia Bancaria</td></tr>
          <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 9px 6px; font-weight: 600; color: #475569;">Importe Matrícula:</td><td style="padding: 9px 6px; font-weight: 800; color: #16a34a; font-size: 15px;">1.450,00 €</td></tr>
          <tr><td style="padding: 9px 6px; font-weight: 600; color: #475569;">Firma y Consentimiento:</td><td style="padding: 9px 6px; color: #166534; font-weight: 600;">✅ Firmado digitalmente y RGPD aceptado</td></tr>
        </table>

        <div style="border-top: 1px solid #e2e8f0; padding-top: 14px; text-align: center; font-size: 12px; color: #94a3b8;">
          Secretaría Académica · Academias Péndulo · Acceso al panel administrativo: penduloformacion.com/#campus
        </div>
      </div>
    `
  },
  {
    id: 4,
    subject: '💳 [MECÁNICA 4] Instrucciones de Pago por Transferencia (REQ-2026-0842) — Academias Péndulo',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 14px; background: #ffffff; color: #1e293b;">
        <div style="text-align: center; margin-bottom: 22px;">
          <h1 style="color: #dc2626; margin: 0; font-size: 24px; font-weight: 900;">ACADEMIAS PÉNDULO</h1>
          <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">Secretaría General de Admisión y Pagos</p>
        </div>

        <p style="font-size: 15px; color: #0f172a;">Estimada <strong>Laura Fernández Gómez</strong>,</p>
        <p style="font-size: 14px; line-height: 1.6; color: #334155;">
          Tu solicitud de matrícula en el curso <strong>MANTENIMIENTO DE LOS SISTEMAS ELÉCTRICOS Y ELECTRÓNICOS DE VEHÍCULOS (520h)</strong> ha sido revisada y preaprobada por Secretaría.
        </p>

        <div style="background: #fef2f2; border: 2px dashed #dc2626; border-radius: 10px; padding: 20px; margin: 22px 0; text-align: center;">
          <p style="margin: 0; font-size: 12px; text-transform: uppercase; font-weight: 800; color: #991b1b; letter-spacing: 0.5px;">Tu Referencia Oficial de Pago (Imprescindible indicar en el concepto):</p>
          <p style="margin: 8px 0 0 0; font-size: 26px; font-weight: 900; color: #dc2626; font-family: monospace; letter-spacing: 1px;">REQ-2026-0842</p>
        </div>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px; margin-bottom: 22px;">
          <h3 style="margin: 0 0 12px 0; font-size: 14px; color: #0f172a;">Datos Bancarios Oficiales para la Transferencia:</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 7px 0; color: #64748b; width: 140px;">Entidad Bancaria:</td><td style="padding: 7px 0; font-weight: 700;">Banco Santander</td></tr>
            <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 7px 0; color: #64748b;">Titular de la cuenta:</td><td style="padding: 7px 0; font-weight: 700;">ACADEMIAS PÉNDULO S.L.</td></tr>
            <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 7px 0; color: #64748b;">Código IBAN:</td><td style="padding: 7px 0; font-family: monospace; font-weight: 800; color: #0f172a; font-size: 14px;">ES12 0049 1500 0512 3456 7890</td></tr>
            <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 7px 0; color: #64748b;">Importe a abonar:</td><td style="padding: 7px 0; font-weight: 800; color: #16a34a; font-size: 15px;">1.450,00 €</td></tr>
            <tr><td style="padding: 7px 0; color: #64748b;">Concepto:</td><td style="padding: 7px 0; font-weight: 800; color: #dc2626; font-family: monospace;">REQ-2026-0842 - LAURA FERNANDEZ</td></tr>
          </table>
        </div>

        <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
          Una vez emitida la transferencia, puedes remitir el justificante bancario respondiendo a este correo o a través de tu enlace de seguimiento. Tan pronto como Administración compruebe el ingreso, recibirás automáticamente tus credenciales de acceso al Campus Virtual.
        </p>

        <div style="border-top: 1px solid #f1f5f9; margin-top: 24px; padding-top: 16px; text-align: center; font-size: 11px; color: #94a3b8;">
          Academias Péndulo · Dpto. de Administración y Finanzas
        </div>
      </div>
    `
  },
  {
    id: 5,
    subject: '🎓 [MECÁNICA 5] ¡Bienvenido/a a ACADEMIAS PÉNDULO! Credenciales de Acceso al Campus Virtual',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 14px; background: #ffffff; color: #1e293b;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #dc2626; margin: 0; font-size: 26px; font-weight: 900;">ACADEMIAS PÉNDULO</h1>
          <p style="color: #64748b; font-size: 14px; margin: 4px 0 0 0;">Campus Virtual · Formación Oficial en Automoción</p>
        </div>

        <p style="font-size: 16px; color: #0f172a;">¡Hola <strong>Laura</strong>! Tu plaza ya está confirmada.</p>
        <p style="font-size: 14px; line-height: 1.6; color: #334155;">
          Tu matrícula en el curso <strong>MANTENIMIENTO DE LOS SISTEMAS ELÉCTRICOS Y ELECTRÓNICOS DE VEHÍCULOS</strong> ha sido formalizada correctamente. A continuación tienes tus datos de acceso al Campus Virtual:
        </p>

        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 22px; margin: 24px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 8px 0; color: #64748b; font-weight: 600; width: 150px;">Usuario / Email:</td><td style="padding: 8px 0; font-weight: 700; color: #0f172a;">laura.fernandez@ejemplo.es</td></tr>
            <tr style="border-bottom: 1px solid #e2e8f0;"><td style="padding: 8px 0; color: #64748b; font-weight: 600;">Contraseña temporal:</td><td style="padding: 8px 0;"><span style="font-family: monospace; background: #fee2e2; color: #991b1b; padding: 4px 10px; border-radius: 6px; font-weight: 800; font-size: 15px; letter-spacing: 1px;">Pndl#8492!kZ</span></td></tr>
            <tr><td style="padding: 10px 0 0 0; color: #64748b; font-weight: 600;">Acceso directo:</td><td style="padding: 10px 0 0 0;"><a href="https://penduloformacion.com/#campus" style="display: inline-block; background: #dc2626; color: #ffffff; padding: 8px 18px; border-radius: 6px; font-weight: 700; text-decoration: none; font-size: 13px;">Entrar al Campus Virtual</a></td></tr>
          </table>
        </div>

        <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 6px; margin-bottom: 20px;">
          <p style="margin: 0; font-size: 12px; color: #92400e; line-height: 1.5;">
            <strong>Medida de seguridad:</strong> La primera vez que accedas con esta clave temporal, el sistema te solicitará establecer tu contraseña personal definitiva. Recuerda que puedes verla u ocultarla usando el icono del ojo 👁️.
          </p>
        </div>

        <div style="border-top: 1px solid #f1f5f9; padding-top: 16px; text-align: center; font-size: 11px; color: #94a3b8;">
          Equipo Docente y Pedagógico · Academias Péndulo · Almería
        </div>
      </div>
    `
  },
  {
    id: 6,
    subject: '📑 [MECÁNICA 6] Requerimiento de Documentación para tu Expediente (REQ-2026-0842)',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 14px; background: #ffffff; color: #1e293b;">
        <div style="text-align: center; margin-bottom: 22px;">
          <h1 style="color: #dc2626; margin: 0; font-size: 24px; font-weight: 900;">ACADEMIAS PÉNDULO</h1>
          <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">Secretaría de Gestión Académica</p>
        </div>

        <p style="font-size: 15px; color: #0f172a;">Estimada <strong>Laura Fernández Gómez</strong>,</p>
        <p style="font-size: 14px; line-height: 1.6; color: #334155;">
          Para completar la tramitación oficial de tu certificado de profesionalidad ante la administración pública, requerimos que nos facilites los siguientes documentos pendientes:
        </p>

        <div style="background: #fff7ed; border-left: 4px solid #ea580c; padding: 16px 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0 0 10px 0; font-weight: 700; color: #9a3412; font-size: 14px;">Documentación requerida:</p>
          <ul style="margin: 0; padding-left: 20px; color: #c2410c; font-size: 13px; line-height: 1.7;">
            <li><strong>Fotocopia del DNI / NIE en vigor</strong> (ambas caras legibles).</li>
            <li><strong>Acreditación de Titulación Académica</strong> previa (Graduado ESO o equivalente).</li>
            <li><strong>Tarjeta de Demanda de Empleo (DARDE)</strong> actualizada a fecha actual.</li>
          </ul>
        </div>

        <p style="font-size: 13px; color: #475569; line-height: 1.5;">
          Puedes enviar los documentos respondiendo directamente adjuntándolos a este correo o remitirlos a <a href="mailto:info.academiaspendulo@gmail.com" style="color: #dc2626; font-weight: bold; text-decoration: none;">info.academiaspendulo@gmail.com</a> indicando en el asunto tu referencia <strong>REQ-2026-0842</strong>.
        </p>

        <div style="border-top: 1px solid #f1f5f9; margin-top: 24px; padding-top: 16px; text-align: center; font-size: 11px; color: #94a3b8;">
          Secretaría Académica · Academias Péndulo · Almería
        </div>
      </div>
    `
  }
];

async function sendAllExamples() {
  console.log(`\n======================================================`);
  console.log(`ENVIANDO EJEMPLOS REALES DE MENSAJES AUTOMÁTICOS`);
  console.log(`Remitente: ${user}`);
  console.log(`Destinatarios: ${recipients.join(', ')}`);
  console.log(`Total mecánicas a enviar: ${emailsToSend.length}`);
  console.log(`======================================================\n`);

  for (const item of emailsToSend) {
    try {
      console.log(`Enviando Mecánica ${item.id}: "${item.subject}"...`);
      const info = await transporter.sendMail({
        from: `"Academias Péndulo" <${user}>`,
        to: recipients.join(', '),
        subject: item.subject,
        html: item.html
      });
      console.log(`  ✅ [ENVIADO CON ÉXITO] Message ID: ${info.messageId}`);
    } catch (err) {
      console.error(`  ❌ [ERROR AL ENVIAR] Mecánica ${item.id}:`, err.message);
    }
  }

  console.log(`\n🎉 ¡TODOS LOS EJEMPLOS DE CORREOS HAN SIDO ENVIADOS A TU BANDEJA DE ENTRADA!`);
}

sendAllExamples();
