-- Migration: 009_progress_and_tracking_enhancements.sql
-- Description: Enhanced video interval tracking, sequence monotonicity, playback sessions, unique time calculation, and manual completion flags.

ALTER TABLE `progreso_materiales`
  ADD COLUMN `tiempo_unico_segundos` INT NOT NULL DEFAULT 0 AFTER `duracion_segundos`,
  ADD COLUMN `secuencia` INT NOT NULL DEFAULT 0 AFTER `tiempo_unico_segundos`,
  ADD COLUMN `sesion_reproduccion_id` VARCHAR(64) DEFAULT NULL AFTER `secuencia`,
  ADD COLUMN `marcado_manual` TINYINT(1) NOT NULL DEFAULT 0 AFTER `sesion_reproduccion_id`,
  ADD COLUMN `umbral_completado_pct` INT NOT NULL DEFAULT 90 AFTER `marcado_manual`;
