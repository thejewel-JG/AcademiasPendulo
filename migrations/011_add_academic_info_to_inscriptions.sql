-- ================================================================
-- Migration: 011_add_academic_info_to_inscriptions.sql
-- Descripción: Añade campos de nivel de estudios finalizados, titulación
--              y formación complementaria a la tabla inscription_requests.
--              Campos con DEFAULT NULL para garantizar total compatibilidad
--              y validez con todas las solicitudes históricas existentes.
-- ================================================================

ALTER TABLE `inscription_requests`
  ADD COLUMN `academic_level` VARCHAR(50) DEFAULT NULL COMMENT 'Nivel de estudios finalizados (código interno estable)',
  ADD COLUMN `academic_degree` VARCHAR(255) DEFAULT NULL COMMENT 'Estudios realizados o titulación obtenida',
  ADD COLUMN `additional_training` TEXT DEFAULT NULL COMMENT 'Otros cursos o formación complementaria (opcional)';
