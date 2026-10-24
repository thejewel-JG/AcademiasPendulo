-- ============================================================================
-- MIGRATION 015: Adaptación Integral del Campus Virtual, Matrículas y Permisos
-- ACADEMIAS PÉNDULO — Formación Profesional en Automoción
-- ============================================================================

-- 1. Ampliar tabla `matriculas` con auditoría completa de acceso y suspensión
ALTER TABLE `matriculas`
  ADD COLUMN IF NOT EXISTS `solicitud_id` INT NULL AFTER `id`,
  ADD COLUMN IF NOT EXISTS `fecha_aprobacion` DATETIME NULL AFTER `fecha_inicio`,
  ADD COLUMN IF NOT EXISTS `operador_aprobacion` VARCHAR(128) NULL AFTER `fecha_aprobacion`,
  ADD COLUMN IF NOT EXISTS `estado_acceso` ENUM('HABILITADO', 'SUSPENDIDO') NOT NULL DEFAULT 'HABILITADO' AFTER `estado`,
  ADD COLUMN IF NOT EXISTS `fecha_activacion` DATETIME NULL AFTER `estado_acceso`,
  ADD COLUMN IF NOT EXISTS `motivo_suspension` TEXT NULL AFTER `fecha_activacion`,
  ADD COLUMN IF NOT EXISTS `suspendido_por` VARCHAR(128) NULL AFTER `motivo_suspension`,
  ADD COLUMN IF NOT EXISTS `suspendido_en` DATETIME NULL AFTER `suspendido_por`;

-- 2. Índices de optimización de consultas de seguridad y permisos
CREATE INDEX IF NOT EXISTS `idx_matr_alumno_acceso` ON `matriculas` (`alumno_id`, `estado`, `estado_acceso`);
CREATE INDEX IF NOT EXISTS `idx_matr_solicitud` ON `matriculas` (`solicitud_id`);

-- 3. Regularización retroactiva no destructiva de registros existentes
UPDATE `matriculas`
SET 
  `fecha_aprobacion` = COALESCE(`fecha_aprobacion`, `fecha_inicio`),
  `fecha_activacion` = COALESCE(`fecha_activacion`, `fecha_inicio`),
  `estado_acceso` = CASE 
    WHEN `estado` IN ('SUSPENDIDA', 'suspended') THEN 'SUSPENDIDO'
    ELSE 'HABILITADO'
  END
WHERE `fecha_aprobacion` IS NULL OR `estado_acceso` IS NULL;

-- 4. Vincular matrículas existentes con su solicitud de origen si coincide el alumno
UPDATE `matriculas` m
JOIN `inscription_requests` ir ON ir.`student_user_id` = m.`alumno_id`
SET m.`solicitud_id` = ir.`id`
WHERE m.`solicitud_id` IS NULL;

-- 5. Registro de la migración
INSERT INTO `migraciones` (`id`, `nombre`, `ejecutado_en`)
VALUES ('015_campus_adaptation_and_access_control', 'Adaptación integral del campus virtual, matrículas y permisos', NOW())
ON DUPLICATE KEY UPDATE `ejecutado_en` = NOW();
