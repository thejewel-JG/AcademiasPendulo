import mysql from 'mysql2/promise';

async function run() {
  const conn = await mysql.createConnection({
    host: 'srv1787.hstgr.io',
    user: 'u141101294_guillermina',
    password: 'Wattpad_3317',
    database: 'u141101294_Academias'
  });

  console.log('Applying migration 019 & 020 to production DB on srv1787...');
  const colsToAdd = [
    { name: 'whatsapp_numero', def: 'VARCHAR(32) DEFAULT NULL' },
    { name: 'whatsapp_activo', def: 'TINYINT(1) NOT NULL DEFAULT 1' },
    { name: 'whatsapp_plantilla', def: 'TEXT DEFAULT NULL' },
    { name: 'whatsapp_actualizado_por', def: 'VARCHAR(100) DEFAULT NULL' },
    { name: 'whatsapp_actualizado_en', def: 'DATETIME DEFAULT NULL' },
    { name: 'whatsapp_autorespuesta_activa', def: 'TINYINT(1) NOT NULL DEFAULT 1' },
    { name: 'whatsapp_plantilla_respuesta', def: 'TEXT DEFAULT NULL' }
  ];

  for (const c of colsToAdd) {
    try {
      await conn.query(`ALTER TABLE configuracion_bancaria ADD COLUMN ${c.name} ${c.def}`);
      console.log('✓ Added col:', c.name);
    } catch (e) {
      if (e.message.includes('Duplicate column name')) {
        console.log('- Col already exists:', c.name);
      } else {
        console.warn('! Col warning:', c.name, e.message);
      }
    }
  }

  const defaultTemplate = 'Hola, buenas. Estoy interesado/a en el curso de {{nombre_curso}} de Academias Péndulo. Me gustaría recibir información sobre el precio, las próximas fechas y cómo puedo apuntarme. ¡Gracias!';
  const defaultAutoReply = `¡Hola! Gracias por contactar con *Academias Péndulo* (Centro Oficial Homologado Nº 0400030892 en Almería).

Hemos recibido tu solicitud de información sobre el curso:
*{{nombre_curso}}* (Código: {{codigo_curso}})
• *Duración:* {{horas_curso}}
• *Modalidad:* {{modalidad_curso}}
• *Precio:* {{precio_curso}}
• *Estado de matrícula:* {{estado_matricula}}

• *Ficha completa y temario:* {{enlace_curso}}

Un asesor de Secretaría revisará tu consulta y te responderá personalmente en breve para indicarte las próximas fechas e iniciar tu inscripción si lo deseas.
Horario de atención: Lunes a Viernes de 09:00 a 14:00 y de 16:00 a 20:00.`;

  await conn.query(`
    UPDATE configuracion_bancaria
    SET
      whatsapp_numero = '34633977320',
      whatsapp_activo = 1,
      whatsapp_plantilla = ?,
      whatsapp_actualizado_por = 'ADMIN_GUILLERMINA',
      whatsapp_actualizado_en = NOW(),
      whatsapp_autorespuesta_activa = 1,
      whatsapp_plantilla_respuesta = ?
    WHERE id = 1
  `, [defaultTemplate, defaultAutoReply]);

  const [row] = await conn.query('SELECT * FROM configuracion_bancaria WHERE id = 1');
  console.log('SUCCESS! Updated configuracion_bancaria on srv1787:', row[0]);
  await conn.end();
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
