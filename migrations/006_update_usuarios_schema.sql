-- Migration: 006_update_usuarios_schema.sql
-- Description: Adapt pre-existing usuarios table to full auth architecture requirements.

ALTER TABLE `usuarios`
  ADD COLUMN IF NOT EXISTS `email_original` VARCHAR(150) NOT NULL DEFAULT '' AFTER `email`,
  ADD COLUMN IF NOT EXISTS `password_hash` VARCHAR(255) DEFAULT NULL AFTER `email_original`,
  ADD COLUMN IF NOT EXISTS `estado` ENUM('ACTIVO', 'INACTIVO', 'SUSPENDIDO') NOT NULL DEFAULT 'ACTIVO' AFTER `telefono`,
  ADD COLUMN IF NOT EXISTS `cambio_password_obligatorio` TINYINT(1) NOT NULL DEFAULT 0 AFTER `estado`,
  ADD COLUMN IF NOT EXISTS `caducidad_password_temporal` DATETIME DEFAULT NULL AFTER `cambio_password_obligatorio`,
  ADD COLUMN IF NOT EXISTS `ultimo_acceso` DATETIME DEFAULT NULL AFTER `caducidad_password_temporal`,
  ADD COLUMN IF NOT EXISTS `creado_por` VARCHAR(64) DEFAULT NULL AFTER `ultimo_acceso`,
  ADD COLUMN IF NOT EXISTS `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `creado_por`,
  ADD COLUMN IF NOT EXISTS `actualizado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `creado_en`;

-- Copy existing email to email_original where email_original is empty
UPDATE `usuarios` SET `email_original` = `email` WHERE `email_original` = '' OR `email_original` IS NULL;
