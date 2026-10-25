-- ========================================================================
-- MIGRACIÓN 017: Endurecimiento de Seguridad, Sesiones y MFA
-- Academias Péndulo — Modificación 11
-- ========================================================================

-- 1. Soporte para Autenticación Multifactor (MFA/2FA) en usuarios
ALTER TABLE `usuarios`
  ADD COLUMN IF NOT EXISTS `mfa_enabled` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Indica si el usuario tiene MFA activado',
  ADD COLUMN IF NOT EXISTS `mfa_secret` VARCHAR(128) DEFAULT NULL COMMENT 'Secreto base32/hash para verificación TOTP',
  ADD COLUMN IF NOT EXISTS `mfa_temp_code` VARCHAR(32) DEFAULT NULL COMMENT 'Código de verificación temporal para confirmación',
  ADD COLUMN IF NOT EXISTS `mfa_temp_expires` DATETIME DEFAULT NULL COMMENT 'Expiración del código temporal MFA';

-- 2. Endurecimiento de sesiones para control de inactividad
ALTER TABLE `sesiones`
  ADD COLUMN IF NOT EXISTS `ultima_actividad` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Timestamp de la última interacción para control de inactividad';

-- 3. Tabla de auditoría específica de eventos de seguridad
CREATE TABLE IF NOT EXISTS `auditoria_seguridad` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `evento` VARCHAR(100) NOT NULL COMMENT 'Tipo de evento: LOGIN_SUCCESS, LOGIN_FAILED, IDOR_BLOCKED, PASSWORD_RESET, MFA_CHANGED, etc.',
  `usuario_id` INT DEFAULT NULL COMMENT 'ID de usuario si está autenticado',
  `email` VARCHAR(255) DEFAULT NULL COMMENT 'Email utilizado en la petición',
  `ip` VARCHAR(64) DEFAULT NULL COMMENT 'Dirección IP del cliente',
  `detalles` TEXT DEFAULT NULL COMMENT 'Detalles contextuales del evento en formato JSON o texto',
  `nivel` ENUM('INFO', 'WARN', 'CRITICAL') NOT NULL DEFAULT 'INFO',
  `creado_en` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_auditoria_seg_usuario` (`usuario_id`),
  INDEX `idx_auditoria_seg_evento` (`evento`),
  INDEX `idx_auditoria_seg_creado` (`creado_en`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
