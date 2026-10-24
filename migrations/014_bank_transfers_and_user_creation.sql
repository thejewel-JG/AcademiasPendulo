-- ================================================================
-- Migration: 014_bank_transfers_and_user_creation.sql
-- Descripción: Sistema de pagos por Transferencia Bancaria,
--              verificación manual contable, alta administrativa de alumnos,
--              generación segura de credenciales temporales (email como usuario),
--              configuración bancaria oficial y trazabilidad de correo.
-- ================================================================

-- 1. Tabla de Configuración Bancaria Oficial
CREATE TABLE IF NOT EXISTS `configuracion_bancaria` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `titular_cuenta` VARCHAR(255) NOT NULL DEFAULT 'Academias Péndulo S.L.',
  `iban` VARCHAR(64) NOT NULL DEFAULT '',
  `entidad_bancaria` VARCHAR(255) NOT NULL DEFAULT '',
  `bic_swift` VARCHAR(32) DEFAULT NULL,
  `instrucciones_adicionales` TEXT DEFAULT NULL,
  `actualizado_por` VARCHAR(100) DEFAULT NULL,
  `actualizado_en` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Adaptar ENUM de estado_pago y columnas de transferencia en inscription_requests
ALTER TABLE `inscription_requests`
  MODIFY COLUMN `estado_pago` ENUM(
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
  ) NOT NULL DEFAULT 'PENDIENTE_TRANSFERENCIA';

ALTER TABLE `inscription_requests`
  ADD COLUMN IF NOT EXISTS `referencia_transferencia` VARCHAR(64) DEFAULT NULL COMMENT 'Referencia única para transferencia bancaria (ej. request_number)',
  ADD COLUMN IF NOT EXISTS `justificante_ruta` VARCHAR(255) DEFAULT NULL COMMENT 'Ruta interna del justificante bancario subido por el alumno',
  ADD COLUMN IF NOT EXISTS `justificante_nombre` VARCHAR(255) DEFAULT NULL COMMENT 'Nombre original del justificante subido',
  ADD COLUMN IF NOT EXISTS `justificante_subido_en` DATETIME DEFAULT NULL COMMENT 'Fecha/hora de subida del justificante',
  ADD COLUMN IF NOT EXISTS `fecha_comunicacion_pago` DATETIME DEFAULT NULL COMMENT 'Fecha en que el alumno comunica o aporta justificante',
  ADD COLUMN IF NOT EXISTS `fecha_verificacion_bancaria` DATETIME DEFAULT NULL COMMENT 'Fecha/hora en que administración confirmó la transferencia',
  ADD COLUMN IF NOT EXISTS `verificado_por_usuario_id` VARCHAR(64) DEFAULT NULL COMMENT 'ID del usuario administrador que verificó',
  ADD COLUMN IF NOT EXISTS `referencia_bancaria_externa` VARCHAR(100) DEFAULT NULL COMMENT 'Referencia bancaria de ingreso comprobado',
  ADD COLUMN IF NOT EXISTS `observaciones_administrativas` TEXT DEFAULT NULL COMMENT 'Observaciones de secretaría o administración sobre el pago',
  ADD COLUMN IF NOT EXISTS `motivo_incidencia` TEXT DEFAULT NULL COMMENT 'Detalle de la incidencia en caso de pago irregular',
  ADD COLUMN IF NOT EXISTS `aprobado_alta_por` VARCHAR(100) DEFAULT NULL COMMENT 'Operador que pulsó Aprobar matrícula y dar de alta',
  ADD COLUMN IF NOT EXISTS `aprobado_alta_en` DATETIME DEFAULT NULL COMMENT 'Fecha y hora del alta administrativa',
  ADD COLUMN IF NOT EXISTS `bienvenida_email_enviado` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 si se envió correctamente el correo de bienvenida',
  ADD COLUMN IF NOT EXISTS `bienvenida_email_error` TEXT DEFAULT NULL COMMENT 'Error devuelto si falló el correo';

-- Índices adicionales
CREATE INDEX IF NOT EXISTS `idx_inscr_ref_transfer` ON `inscription_requests` (`referencia_transferencia`);
CREATE INDEX IF NOT EXISTS `idx_inscr_verif_pago` ON `inscription_requests` (`fecha_verificacion_bancaria`);

-- Actualizar registros existentes para que referencia_transferencia sea igual al request_number
UPDATE `inscription_requests`
SET `referencia_transferencia` = `request_number`
WHERE `referencia_transferencia` IS NULL OR `referencia_transferencia` = '';
