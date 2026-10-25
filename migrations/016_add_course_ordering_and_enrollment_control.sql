-- ========================================================================
-- MIGRACIÓN 016: Control Dinámico de Matrículas y Orden de Visualización
-- Academias Péndulo — Modificación 09
-- ========================================================================

ALTER TABLE `especialidades` 
  ADD COLUMN IF NOT EXISTS `orden_visualizacion` INT NOT NULL DEFAULT 0 COMMENT 'Orden de visualización manual en catálogo',
  ADD COLUMN IF NOT EXISTS `modificado_por_admin` VARCHAR(100) DEFAULT NULL COMMENT 'Administrador que modificó el estado o disponibilidad';

-- Inicialización secuencial si los valores están en 0
SET @row_number = 0;
UPDATE `especialidades` 
SET `orden_visualizacion` = (@row_number:=@row_number + 1)
ORDER BY FIELD(`categoria_id`, 'tmv', 'fco'), `codigo` ASC;
