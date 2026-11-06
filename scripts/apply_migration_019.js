import { query } from '../db.js';

const DEFAULT_TEMPLATE = 'Hola, buenas. Estoy interesado/a en el curso de {{nombre_curso}} de Academias Péndulo. Me gustaría recibir información sobre el precio, las próximas fechas y cómo puedo apuntarme. ¡Gracias!';

async function run() {
  console.log('[MIGRATION 019] Starting WhatsApp Business configuration migration...');

  const columnsToAdd = [
    { name: 'whatsapp_numero', def: 'VARCHAR(32) DEFAULT NULL' },
    { name: 'whatsapp_activo', def: 'TINYINT(1) NOT NULL DEFAULT 1' },
    { name: 'whatsapp_plantilla', def: 'TEXT DEFAULT NULL' },
    { name: 'whatsapp_actualizado_por', def: 'VARCHAR(100) DEFAULT NULL' },
    { name: 'whatsapp_actualizado_en', def: 'DATETIME DEFAULT NULL' }
  ];

  for (const col of columnsToAdd) {
    try {
      await query(`ALTER TABLE configuracion_bancaria ADD COLUMN ${col.name} ${col.def}`);
      console.log(`  ✓ Column ${col.name} added to configuracion_bancaria.`);
    } catch (err) {
      if (err.message && err.message.includes('Duplicate column name')) {
        console.log(`  - Column ${col.name} already exists.`);
      } else {
        console.error(`  ✕ Error adding column ${col.name}:`, err.message);
      }
    }
  }

  await query(`
    UPDATE configuracion_bancaria
    SET
      whatsapp_numero = COALESCE(whatsapp_numero, '34620351622'),
      whatsapp_activo = COALESCE(whatsapp_activo, 1),
      whatsapp_plantilla = COALESCE(whatsapp_plantilla, ?),
      whatsapp_actualizado_por = COALESCE(whatsapp_actualizado_por, 'SYSTEM_MIGRATION_019'),
      whatsapp_actualizado_en = COALESCE(whatsapp_actualizado_en, NOW())
    WHERE id = 1
  `, [DEFAULT_TEMPLATE]);

  try {
    await query(`
      INSERT INTO migraciones (version, nombre, ejecutado_en)
      VALUES ('019', '019_whatsapp_configuration.sql', NOW())
      ON DUPLICATE KEY UPDATE ejecutado_en = NOW()
    `);
    console.log('  ✓ Migration 019 recorded in migraciones table.');
  } catch (err) {
    console.warn('  ! Could not record migration 019 in migraciones:', err.message);
  }

  const rows = await query('SELECT * FROM configuracion_bancaria WHERE id = 1');
  console.log('[VERIFICATION] Current row id=1 in configuracion_bancaria:', rows[0]);
  console.log('[MIGRATION 019] Completed successfully!');
  process.exit(0);
}

run().catch(err => {
  console.error('[FATAL] Migration 019 failed:', err);
  process.exit(1);
});
