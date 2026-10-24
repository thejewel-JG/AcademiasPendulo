import { query } from '../db.js';

async function applyMigration014() {
  console.log('🚀 Running migration 014: Bank transfers, receipts, and user account creation...');

  // 1. Create table `configuracion_bancaria`
  console.log('📦 Ensuring `configuracion_bancaria` table exists...');
  await query(`
    CREATE TABLE IF NOT EXISTS \`configuracion_bancaria\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`titular_cuenta\` VARCHAR(255) NOT NULL DEFAULT 'Academias Péndulo S.L.',
      \`iban\` VARCHAR(64) NOT NULL DEFAULT '',
      \`entidad_bancaria\` VARCHAR(255) NOT NULL DEFAULT '',
      \`bic_swift\` VARCHAR(32) DEFAULT NULL,
      \`instrucciones_adicionales\` TEXT DEFAULT NULL,
      \`actualizado_por\` VARCHAR(100) DEFAULT NULL,
      \`actualizado_en\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // Ensure there is at least one configuration row (not invented, default blank/instructions)
  const existingConfig = await query(`SELECT id, titular_cuenta, iban FROM configuracion_bancaria LIMIT 1`);
  if (!existingConfig || existingConfig.length === 0) {
    console.log('🌱 Inserting default configuration row for configuracion_bancaria...');
    await query(`
      INSERT INTO configuracion_bancaria (
        id, titular_cuenta, iban, entidad_bancaria, bic_swift, instrucciones_adicionales, actualizado_por, actualizado_en
      ) VALUES (
        1,
        'Academias Péndulo S.L.',
        '',
        '',
        '',
        'Indique siempre su Referencia de Matrícula como concepto de la transferencia bancaria.',
        'Sistema Inicial',
        NOW()
      )
    `);
  } else {
    console.log('✓ configuracion_bancaria already has a record.');
  }

  // 2. Modify ENUM for `estado_pago` in `inscription_requests`
  console.log('🔄 Updating `estado_pago` ENUM with bank transfer states...');
  await query(`
    ALTER TABLE \`inscription_requests\`
    MODIFY COLUMN \`estado_pago\` ENUM(
      'NO_INICIADO',
      'PENDIENTE_TRANSFERENCIA',
      'JUSTIFICANTE_APORTADO',
      'PENDIENTE_VERIFICACION',
      'TRANSFERENCIA_VERIFICADA',
      'INCIDENCIA',
      'CANCELADO',
      'REEMBOLSADO',
      'PENDIENTE',
      'EN_PROCESO',
      'CONFIRMADO_PROVEEDOR',
      'PENDIENTE_VERIFICACION_ADMINISTRATIVA',
      'VERIFICADO_ADMINISTRACION',
      'FALLIDO'
    ) NOT NULL DEFAULT 'PENDIENTE_TRANSFERENCIA'
  `);

  // 3. Add columns to `inscription_requests`
  const columns = await query(`DESCRIBE inscription_requests`);
  const existingCols = columns.map(c => c.Field);

  const addColumnIfNotExists = async (colName, colDef) => {
    if (!existingCols.includes(colName)) {
      console.log(`➕ Adding column ${colName}...`);
      await query(`ALTER TABLE inscription_requests ADD COLUMN ${colDef}`);
    } else {
      console.log(`✓ Column ${colName} already exists`);
    }
  };

  await addColumnIfNotExists('referencia_transferencia', "`referencia_transferencia` VARCHAR(64) DEFAULT NULL COMMENT 'Referencia única para transferencia bancaria'");
  await addColumnIfNotExists('justificante_ruta', "`justificante_ruta` VARCHAR(255) DEFAULT NULL COMMENT 'Ruta interna del justificante bancario'");
  await addColumnIfNotExists('justificante_nombre', "`justificante_nombre` VARCHAR(255) DEFAULT NULL COMMENT 'Nombre original del justificante'");
  await addColumnIfNotExists('justificante_subido_en', "`justificante_subido_en` DATETIME DEFAULT NULL COMMENT 'Fecha/hora de subida del justificante'");
  await addColumnIfNotExists('fecha_comunicacion_pago', "`fecha_comunicacion_pago` DATETIME DEFAULT NULL COMMENT 'Fecha en que el alumno comunica pago'");
  await addColumnIfNotExists('fecha_verificacion_bancaria', "`fecha_verificacion_bancaria` DATETIME DEFAULT NULL COMMENT 'Fecha verificación bancaria por admin'");
  await addColumnIfNotExists('verificado_por_usuario_id', "`verificado_por_usuario_id` VARCHAR(64) DEFAULT NULL COMMENT 'Admin que verificó la transferencia'");
  await addColumnIfNotExists('referencia_bancaria_externa', "`referencia_bancaria_externa` VARCHAR(100) DEFAULT NULL COMMENT 'Referencia bancaria comprobada'");
  await addColumnIfNotExists('observaciones_administrativas', "`observaciones_administrativas` TEXT DEFAULT NULL COMMENT 'Observaciones contables o de administración'");
  await addColumnIfNotExists('motivo_incidencia', "`motivo_incidencia` TEXT DEFAULT NULL COMMENT 'Detalle de incidencia'");
  await addColumnIfNotExists('aprobado_alta_por', "`aprobado_alta_por` VARCHAR(100) DEFAULT NULL COMMENT 'Admin que aprobó alta y matrícula'");
  await addColumnIfNotExists('aprobado_alta_en', "`aprobado_alta_en` DATETIME DEFAULT NULL COMMENT 'Fecha del alta administrativa'");
  await addColumnIfNotExists('bienvenida_email_enviado', "`bienvenida_email_enviado` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Estado de envío de bienvenida'");
  await addColumnIfNotExists('bienvenida_email_error', "`bienvenida_email_error` TEXT DEFAULT NULL COMMENT 'Error devuelto si falló el correo'");

  // 4. Update existing records: default referencia_transferencia to request_number
  console.log('🔄 Backfilling referencia_transferencia with request_number for existing records...');
  await query(`
    UPDATE inscription_requests
    SET referencia_transferencia = request_number
    WHERE referencia_transferencia IS NULL OR referencia_transferencia = ''
  `);

  // Map historical 'NO_INICIADO' to 'PENDIENTE_TRANSFERENCIA' if not yet converted
  await query(`
    UPDATE inscription_requests
    SET estado_pago = 'PENDIENTE_TRANSFERENCIA'
    WHERE estado_pago = 'NO_INICIADO' AND converted_to_student = 0
  `);

  console.log('✅ Migration 014 applied successfully!');
}

applyMigration014().then(() => process.exit(0)).catch(err => {
  console.error('❌ Migration 014 failed:', err);
  process.exit(1);
});
