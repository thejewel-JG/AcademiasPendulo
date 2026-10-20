-- ================================================================
-- Migration: 013_restructure_admissions_and_enrollments.sql
-- Descripción: Reestructuración del sistema de solicitudes de admisión,
--              estados administrativos separados (solicitud, pago, matrícula),
--              instantánea comercial económica (precio, IVA, modalidad),
--              documentación requerida y trazabilidad de auditoría.
--              Garantiza 100% de compatibilidad con datos históricos.
-- ================================================================

ALTER TABLE `inscription_requests`
  -- Instantánea comercial en el momento de la solicitud
  ADD COLUMN IF NOT EXISTS `modalidad_inscripcion` ENUM('COMPRA_DIRECTA', 'SOLICITUD_APROBACION') NOT NULL DEFAULT 'SOLICITUD_APROBACION' COMMENT 'Modalidad fijada en la solicitud',
  ADD COLUMN IF NOT EXISTS `precio_base_snapshot` DECIMAL(10, 2) DEFAULT NULL COMMENT 'Instantánea precio base en EUR',
  ADD COLUMN IF NOT EXISTS `moneda_snapshot` VARCHAR(3) NOT NULL DEFAULT 'EUR' COMMENT 'Moneda de la solicitud',
  ADD COLUMN IF NOT EXISTS `tipo_iva_snapshot` VARCHAR(30) NOT NULL DEFAULT 'EXENTO' COMMENT 'Tratamiento fiscal IVA snapshot',
  ADD COLUMN IF NOT EXISTS `porcentaje_iva_snapshot` DECIMAL(5, 2) NOT NULL DEFAULT 0.00 COMMENT 'Porcentaje IVA snapshot',
  ADD COLUMN IF NOT EXISTS `importe_iva_snapshot` DECIMAL(10, 2) DEFAULT NULL COMMENT 'Importe cuota IVA snapshot',
  ADD COLUMN IF NOT EXISTS `precio_final_snapshot` DECIMAL(10, 2) DEFAULT NULL COMMENT 'Precio final snapshot',
  
  -- Separación de estados administrativos
  ADD COLUMN IF NOT EXISTS `estado_solicitud` ENUM('NUEVA', 'EN_REVISION', 'PENDIENTE_DOCUMENTACION', 'PREAPROBADA', 'RECHAZADA', 'CANCELADA') NOT NULL DEFAULT 'NUEVA' COMMENT 'Estado del trámite académico de la solicitud',
  ADD COLUMN IF NOT EXISTS `estado_pago` ENUM('NO_INICIADO', 'PENDIENTE', 'EN_PROCESO', 'CONFIRMADO_PROVEEDOR', 'PENDIENTE_VERIFICACION_ADMINISTRATIVA', 'VERIFICADO_ADMINISTRACION', 'FALLIDO', 'CANCELADO', 'REEMBOLSADO') NOT NULL DEFAULT 'NO_INICIADO' COMMENT 'Estado del cobro y verificación contable',
  ADD COLUMN IF NOT EXISTS `estado_matricula` ENUM('PENDIENTE', 'PENDIENTE_APROBACION_FINAL', 'ACTIVA', 'RECHAZADA', 'CANCELADA', 'FINALIZADA') NOT NULL DEFAULT 'PENDIENTE' COMMENT 'Estado final de la matrícula en el campus',
  
  -- Documentación requerida y aportada
  ADD COLUMN IF NOT EXISTS `documentos_requeridos` TEXT DEFAULT NULL COMMENT 'Lista JSON de documentos solicitados por secretaría',
  ADD COLUMN IF NOT EXISTS `documentos_aportados` TEXT DEFAULT NULL COMMENT 'Lista JSON de documentos entregados por el aspirante',
  ADD COLUMN IF NOT EXISTS `motivo_rechazo` TEXT DEFAULT NULL COMMENT 'Motivo administrativo de rechazo',
  
  -- Responsables y fechas de transiciones clave
  ADD COLUMN IF NOT EXISTS `preaprobado_por` VARCHAR(100) DEFAULT NULL COMMENT 'Usuario o gestor que concedió la preaprobación',
  ADD COLUMN IF NOT EXISTS `preaprobado_en` DATETIME DEFAULT NULL COMMENT 'Fecha y hora de la preaprobación',
  ADD COLUMN IF NOT EXISTS `verificado_pago_por` VARCHAR(100) DEFAULT NULL COMMENT 'Administrador que verificó manualmente el cobro',
  ADD COLUMN IF NOT EXISTS `verificado_pago_en` DATETIME DEFAULT NULL COMMENT 'Fecha y hora de verificación contable',
  ADD COLUMN IF NOT EXISTS `aprobado_final_por` VARCHAR(100) DEFAULT NULL COMMENT 'Administrador que aprobó definitivamente la matrícula',
  ADD COLUMN IF NOT EXISTS `aprobado_final_en` DATETIME DEFAULT NULL COMMENT 'Fecha y hora de aprobación final de matrícula';

-- Índices para búsquedas optimizadas en el panel
CREATE INDEX IF NOT EXISTS `idx_inscr_estado_solicitud` ON `inscription_requests` (`estado_solicitud`);
CREATE INDEX IF NOT EXISTS `idx_inscr_estado_pago` ON `inscription_requests` (`estado_pago`);
CREATE INDEX IF NOT EXISTS `idx_inscr_estado_matricula` ON `inscription_requests` (`estado_matricula`);
CREATE INDEX IF NOT EXISTS `idx_inscr_modalidad` ON `inscription_requests` (`modalidad_inscripcion`);

-- Sincronizar registros históricos con equivalencia de estados
UPDATE `inscription_requests`
SET `estado_solicitud` = CASE
  WHEN `status` = 'Nueva' THEN 'NUEVA'
  WHEN `status` = 'En revisión' THEN 'EN_REVISION'
  WHEN `status` = 'Pendiente de documentación' THEN 'PENDIENTE_DOCUMENTACION'
  WHEN `status` = 'Aceptada' THEN 'PREAPROBADA'
  WHEN `status` = 'Rechazada' THEN 'RECHAZADA'
  WHEN `status` = 'Cerrada' THEN 'CANCELADA'
  WHEN `status` = 'Matriculado' THEN 'PREAPROBADA'
  ELSE 'NUEVA'
END,
`estado_pago` = 'NO_INICIADO',
`estado_matricula` = CASE
  WHEN `converted_to_student` = 1 THEN 'ACTIVA'
  ELSE 'PENDIENTE'
END
WHERE `estado_solicitud` IS NULL OR `estado_solicitud` = 'NUEVA';
