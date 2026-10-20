-- ================================================================
-- Migration: 012_add_commercial_model_to_courses.sql
-- Descripción: Amplía el modelo de cursos/especialidades para el modelo
--              privado de pago (precio, tratamiento fiscal IVA,
--              tipo de matrícula, plazas, disponibilidad y publicación).
--              Valores por defecto seguros para preservar sin alteraciones
--              los 33 cursos existentes.
-- ================================================================

ALTER TABLE `especialidades`
  ADD COLUMN `precio_base` DECIMAL(10, 2) DEFAULT NULL COMMENT 'Precio base o neto en EUR',
  ADD COLUMN `moneda` VARCHAR(3) NOT NULL DEFAULT 'EUR' COMMENT 'Moneda de venta (EUR)',
  ADD COLUMN `tipo_iva` VARCHAR(30) NOT NULL DEFAULT 'EXENTO' COMMENT 'Tratamiento fiscal (EXENTO, GENERAL_21, REDUCIDO_10)',
  ADD COLUMN `porcentaje_iva` DECIMAL(5, 2) NOT NULL DEFAULT 0.00 COMMENT 'Porcentaje de IVA aplicable',
  ADD COLUMN `importe_iva` DECIMAL(10, 2) DEFAULT NULL COMMENT 'Cuota de IVA calculada',
  ADD COLUMN `precio_final` DECIMAL(10, 2) DEFAULT NULL COMMENT 'Precio final de venta calculado (base + iva)',
  ADD COLUMN `estado_precio` ENUM('SIN_CONFIGURAR', 'CONFIGURADO') NOT NULL DEFAULT 'SIN_CONFIGURAR' COMMENT 'Estado de configuración del precio',
  ADD COLUMN `tipo_inscripcion` ENUM('COMPRA_DIRECTA', 'SOLICITUD_APROBACION') NOT NULL DEFAULT 'SOLICITUD_APROBACION' COMMENT 'Modalidad de admisión/matrícula',
  ADD COLUMN `plazas_maximas` INT DEFAULT NULL COMMENT 'Límite máximo de plazas',
  ADD COLUMN `plazas_disponibles` INT DEFAULT NULL COMMENT 'Plazas vacantes actualmente',
  ADD COLUMN `estado_disponibilidad` ENUM('ABIERTA', 'CERRADA', 'SUSPENDIDA_TEMPORALMENTE', 'COMPLETA') NOT NULL DEFAULT 'ABIERTA' COMMENT 'Estado del periodo de inscripciones',
  ADD COLUMN `fecha_apertura_inscripcion` DATE DEFAULT NULL COMMENT 'Fecha de apertura de matriculación',
  ADD COLUMN `fecha_cierre_inscripcion` DATE DEFAULT NULL COMMENT 'Fecha de cierre de matriculación',
  ADD COLUMN `estado_publicacion` ENUM('BORRADOR', 'PUBLICADO', 'NO_DISPONIBLE', 'ARCHIVADO') NOT NULL DEFAULT 'PUBLICADO' COMMENT 'Visibilidad en el catálogo';
