-- Migration: 008_drop_legacy_matriculas_constraints.sql
-- Description: Drop legacy NOT NULL constraints and foreign keys on matriculas table.

ALTER TABLE `matriculas`
  DROP FOREIGN KEY `fk_mat_estudiante`,
  DROP FOREIGN KEY `fk_mat_curso`;

ALTER TABLE `matriculas`
  MODIFY COLUMN `estudiante_id` VARCHAR(64) DEFAULT NULL,
  MODIFY COLUMN `curso_id` VARCHAR(32) DEFAULT NULL;
