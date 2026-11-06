import { query } from '../db.js';

const DEFAULT_AUTOREPLY_TEMPLATE = `¡Hola! Gracias por contactar con *Academias Péndulo* (Centro Oficial Homologado Nº 0400030892 en Almería).

Hemos recibido tu solicitud de información sobre el curso:
*{{nombre_curso}}* (Código: {{codigo_curso}})
• *Duración:* {{horas_curso}}
• *Modalidad:* {{modalidad_curso}}
• *Precio:* {{precio_curso}}
• *Estado de matrícula:* {{estado_matricula}}

• *Ficha completa y temario:* {{enlace_curso}}

Un asesor de Secretaría revisará tu consulta y te responderá personalmente en breve para indicarte las próximas fechas e iniciar tu inscripción si lo deseas.
Horario de atención: Lunes a Viernes de 09:00 a 14:00 y de 16:00 a 20:00.`;

async function run() {
  console.log('[MIGRATION 020] Adding WhatsApp auto-responder columns to configuracion_bancaria...');

  const cols = [
    { name: 'whatsapp_autorespuesta_activa', def: 'TINYINT(1) NOT NULL DEFAULT 1' },
    { name: 'whatsapp_plantilla_respuesta', def: 'TEXT DEFAULT NULL' }
  ];

  for (const col of cols) {
    try {
      await query(`ALTER TABLE configuracion_bancaria ADD COLUMN ${col.name} ${col.def}`);
      console.log(`  ✓ Added column ${col.name}`);
    } catch (err) {
      if (err.message && err.message.includes('Duplicate column name')) {
        console.log(`  - Column ${col.name} already exists`);
      } else {
        console.error(`  ✕ Error adding ${col.name}:`, err.message);
      }
    }
  }

  await query(
    `UPDATE configuracion_bancaria
     SET whatsapp_autorespuesta_activa = COALESCE(whatsapp_autorespuesta_activa, 1),
         whatsapp_plantilla_respuesta = COALESCE(whatsapp_plantilla_respuesta, ?)
     WHERE id = 1`,
    [DEFAULT_AUTOREPLY_TEMPLATE]
  );

  try {
    await query(`
      INSERT INTO migraciones (version, nombre, ejecutado_en)
      VALUES ('020', '020_whatsapp_autoresponder.sql', NOW())
      ON DUPLICATE KEY UPDATE ejecutado_en = NOW()
    `);
  } catch (e) {
    console.warn('Migration table note:', e.message);
  }

  console.log('[MIGRATION 020] Completed successfully!');
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
