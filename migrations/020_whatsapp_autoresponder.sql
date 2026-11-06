-- ============================================================================
-- MIGRATION 020: RESPUESTA AUTOMÁTICA INTELIGENTE DE WHATSAPP POR CURSO
-- ============================================================================

ALTER TABLE configuracion_bancaria
  ADD COLUMN whatsapp_autorespuesta_activa TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN whatsapp_plantilla_respuesta TEXT DEFAULT NULL;

