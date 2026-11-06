-- ============================================================================
-- MIGRATION 019: INTEGRACIÓN DE WHATSAPP BUSINESS EN SOLICITUDES DE INFORMACIÓN
-- ============================================================================
-- Reutiliza la tabla existente de configuración general (configuracion_bancaria)
-- para almacenar el número de WhatsApp de atención al alumno, su estado
-- activo/inactivo, la plantilla de mensaje personalizable y la auditoría.
-- ============================================================================

ALTER TABLE configuracion_bancaria
  ADD COLUMN whatsapp_numero VARCHAR(32) DEFAULT NULL,
  ADD COLUMN whatsapp_activo TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN whatsapp_plantilla TEXT DEFAULT NULL,
  ADD COLUMN whatsapp_actualizado_por VARCHAR(100) DEFAULT NULL,
  ADD COLUMN whatsapp_actualizado_en DATETIME DEFAULT NULL;

UPDATE configuracion_bancaria
SET
  whatsapp_numero = COALESCE(whatsapp_numero, '34620351622'),
  whatsapp_activo = COALESCE(whatsapp_activo, 1),
  whatsapp_plantilla = COALESCE(
    whatsapp_plantilla,
    'Hola, buenas. Estoy interesado/a en el curso de {{nombre_curso}} de Academias Péndulo. Me gustaría recibir información sobre el precio, las próximas fechas y cómo puedo apuntarme. ¡Gracias!'
  ),
  whatsapp_actualizado_por = COALESCE(whatsapp_actualizado_por, 'SYSTEM_MIGRATION_019'),
  whatsapp_actualizado_en = COALESCE(whatsapp_actualizado_en, NOW())
WHERE id = 1;
