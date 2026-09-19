-- Migration: 007_update_matriculas_schema.sql
-- Description: Adapt pre-existing matriculas table to full academic architecture requirements.

ALTER TABLE `matriculas`
  ADD COLUMN IF NOT EXISTS `alumno_id` VARCHAR(64) DEFAULT NULL AFTER `id`,
  ADD COLUMN IF NOT EXISTS `grupo_id` VARCHAR(64) DEFAULT NULL AFTER `alumno_id`,
  ADD COLUMN IF NOT EXISTS `fecha_inicio` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `grupo_id`,
  ADD COLUMN IF NOT EXISTS `fecha_fin` DATETIME DEFAULT NULL AFTER `fecha_inicio`,
  ADD COLUMN IF NOT EXISTS `autor_id` VARCHAR(64) DEFAULT NULL AFTER `fecha_fin`;

-- Copy existing estudiante_id to alumno_id where NULL
UPDATE `matriculas` SET `alumno_id` = `estudiante_id` WHERE `alumno_id` IS NULL OR `alumno_id` = '';

-- Adapt estado column type if needed
ALTER TABLE `matriculas` MODIFY COLUMN `estado` ENUM('ACTIVA', 'FINALIZADA', 'CANCELADA', 'SUSPENDIDA', 'active', 'completed', 'cancelled', 'suspended') NOT NULL DEFAULT 'ACTIVA';

-- Update old enum values to standard Spanish values
UPDATE `matriculas` SET `estado` = 'ACTIVA' WHERE `estado` = 'active';
UPDATE `matriculas` SET `estado` = 'FINALIZADA' WHERE `estado` = 'completed';
UPDATE `matriculas` SET `estado` = 'CANCELADA' WHERE `estado` = 'cancelled';
UPDATE `matriculas` SET `estado` = 'SUSPENDIDA' WHERE `estado` = 'suspended';
