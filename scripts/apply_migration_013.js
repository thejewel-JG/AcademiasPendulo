import { query } from '../db.js';

async function applyMigration013() {
  console.log('🚀 Running migration 013: Restructure admissions and enrollments...');

  // 1. Check existing columns in inscription_requests
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

  await addColumnIfNotExists('modalidad_inscripcion', "`modalidad_inscripcion` ENUM('COMPRA_DIRECTA', 'SOLICITUD_APROBACION') NOT NULL DEFAULT 'SOLICITUD_APROBACION'");
  await addColumnIfNotExists('precio_base_snapshot', "`precio_base_snapshot` DECIMAL(10, 2) DEFAULT NULL");
  await addColumnIfNotExists('moneda_snapshot', "`moneda_snapshot` VARCHAR(3) NOT NULL DEFAULT 'EUR'");
  await addColumnIfNotExists('tipo_iva_snapshot', "`tipo_iva_snapshot` VARCHAR(30) NOT NULL DEFAULT 'EXENTO'");
  await addColumnIfNotExists('porcentaje_iva_snapshot', "`porcentaje_iva_snapshot` DECIMAL(5, 2) NOT NULL DEFAULT 0.00");
  await addColumnIfNotExists('importe_iva_snapshot', "`importe_iva_snapshot` DECIMAL(10, 2) DEFAULT NULL");
  await addColumnIfNotExists('precio_final_snapshot', "`precio_final_snapshot` DECIMAL(10, 2) DEFAULT NULL");

  await addColumnIfNotExists('estado_solicitud', "`estado_solicitud` ENUM('NUEVA', 'EN_REVISION', 'PENDIENTE_DOCUMENTACION', 'PREAPROBADA', 'RECHAZADA', 'CANCELADA') NOT NULL DEFAULT 'NUEVA'");
  await addColumnIfNotExists('estado_pago', "`estado_pago` ENUM('NO_INICIADO', 'PENDIENTE', 'EN_PROCESO', 'CONFIRMADO_PROVEEDOR', 'PENDIENTE_VERIFICACION_ADMINISTRATIVA', 'VERIFICADO_ADMINISTRACION', 'FALLIDO', 'CANCELADO', 'REEMBOLSADO') NOT NULL DEFAULT 'NO_INICIADO'");
  await addColumnIfNotExists('estado_matricula', "`estado_matricula` ENUM('PENDIENTE', 'PENDIENTE_APROBACION_FINAL', 'ACTIVA', 'RECHAZADA', 'CANCELADA', 'FINALIZADA') NOT NULL DEFAULT 'PENDIENTE'");

  await addColumnIfNotExists('documentos_requeridos', "`documentos_requeridos` TEXT DEFAULT NULL");
  await addColumnIfNotExists('documentos_aportados', "`documentos_aportados` TEXT DEFAULT NULL");
  await addColumnIfNotExists('motivo_rechazo', "`motivo_rechazo` TEXT DEFAULT NULL");

  await addColumnIfNotExists('preaprobado_por', "`preaprobado_por` VARCHAR(100) DEFAULT NULL");
  await addColumnIfNotExists('preaprobado_en', "`preaprobado_en` DATETIME DEFAULT NULL");
  await addColumnIfNotExists('verificado_pago_por', "`verificado_pago_por` VARCHAR(100) DEFAULT NULL");
  await addColumnIfNotExists('verificado_pago_en', "`verificado_pago_en` DATETIME DEFAULT NULL");
  await addColumnIfNotExists('aprobado_final_por', "`aprobado_final_por` VARCHAR(100) DEFAULT NULL");
  await addColumnIfNotExists('aprobado_final_en', "`aprobado_final_en` DATETIME DEFAULT NULL");

  // 2. Synchronize existing historical records
  console.log('🔄 Mapping historical status to new separated fields...');
  await query(`
    UPDATE inscription_requests
    SET estado_solicitud = CASE
      WHEN status = 'Nueva' THEN 'NUEVA'
      WHEN status = 'En revisión' THEN 'EN_REVISION'
      WHEN status = 'Pendiente de documentación' THEN 'PENDIENTE_DOCUMENTACION'
      WHEN status = 'Aceptada' THEN 'PREAPROBADA'
      WHEN status = 'Rechazada' THEN 'RECHAZADA'
      WHEN status = 'Cerrada' THEN 'CANCELADA'
      WHEN status = 'Matriculado' THEN 'PREAPROBADA'
      ELSE 'NUEVA'
    END,
    estado_pago = 'NO_INICIADO',
    estado_matricula = CASE
      WHEN converted_to_student = 1 THEN 'ACTIVA'
      ELSE 'PENDIENTE'
    END
  `);

  // Backfill price snapshots from especialidades for existing requests where missing
  console.log('🔄 Populating commercial snapshots for historical requests where available...');
  const existingReqs = await query(`SELECT id, course_id, course_code, course_name FROM inscription_requests WHERE precio_final_snapshot IS NULL`);
  for (const req of existingReqs) {
    const courseMatch = await query(`
      SELECT tipo_inscripcion, precio_base, tipo_iva, porcentaje_iva, importe_iva, precio_final, moneda
      FROM especialidades
      WHERE id = ? OR codigo = ? OR nombre LIKE ?
      LIMIT 1
    `, [req.course_id || '', req.course_code || '', `%${req.course_name}%`]);

    if (courseMatch && courseMatch.length > 0) {
      const c = courseMatch[0];
      await query(`
        UPDATE inscription_requests
        SET modalidad_inscripcion = ?,
            precio_base_snapshot = ?,
            moneda_snapshot = ?,
            tipo_iva_snapshot = ?,
            porcentaje_iva_snapshot = ?,
            importe_iva_snapshot = ?,
            precio_final_snapshot = ?
        WHERE id = ?
      `, [
        c.tipo_inscripcion || 'SOLICITUD_APROBACION',
        c.precio_base || 0.00,
        c.moneda || 'EUR',
        c.tipo_iva || 'EXENTO',
        c.porcentaje_iva || 0.00,
        c.importe_iva || 0.00,
        c.precio_final || 0.00,
        req.id
      ]);
    }
  }

  console.log('✅ Migration 013 executed successfully!');
}

applyMigration013().then(() => process.exit(0)).catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
