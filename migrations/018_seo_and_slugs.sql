-- ========================================================================
-- MIGRACIÓN 018: Optimización SEO, Slugs Permanentes y Metadatos Dinámicos
-- Academias Péndulo — Modificación 10
-- ========================================================================

ALTER TABLE `especialidades`
  ADD COLUMN IF NOT EXISTS `slug` VARCHAR(150) DEFAULT NULL COMMENT 'Identificador amigable único para URL pública rastreable',
  ADD COLUMN IF NOT EXISTS `meta_title` VARCHAR(255) DEFAULT NULL COMMENT 'Título SEO optimizado para buscadores',
  ADD COLUMN IF NOT EXISTS `meta_description` TEXT DEFAULT NULL COMMENT 'Meta descripción específica del curso',
  ADD COLUMN IF NOT EXISTS `alt_text` VARCHAR(255) DEFAULT NULL COMMENT 'Texto alternativo para la imagen principal del curso',
  ADD COLUMN IF NOT EXISTS `og_image` VARCHAR(500) DEFAULT NULL COMMENT 'URL de la imagen Open Graph para redes y buscadores',
  ADD COLUMN IF NOT EXISTS `indexable` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Control de indexación: 1=Permitir indexación pública, 0=noindex';

-- Índice único en slug para evitar duplicidades en rutas públicas
CREATE UNIQUE INDEX IF NOT EXISTS `idx_especialidades_slug` ON `especialidades` (`slug`);
