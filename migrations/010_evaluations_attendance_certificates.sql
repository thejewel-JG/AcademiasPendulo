-- ================================================================
-- Migration: 010_evaluations_attendance_certificates.sql
-- Descripción: Asistencia, exámenes, calificaciones, certificados
--              y calendario de clases para Academias Péndulo.
-- ================================================================

-- ============================================================
-- 1. ASISTENCIA A CLASES
-- Registro oficial de asistencia (obligatorio para subvenciones SEPE/Fundae)
-- ============================================================
CREATE TABLE IF NOT EXISTS `asistencia` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `matricula_id` VARCHAR(64) NOT NULL,
  `alumno_id` VARCHAR(64) NOT NULL,
  `grupo_id` VARCHAR(64) NOT NULL,
  `fecha` DATE NOT NULL,
  `hora_inicio` TIME DEFAULT NULL,
  `hora_fin` TIME DEFAULT NULL,
  `estado` ENUM('PRESENTE', 'AUSENTE', 'JUSTIFICADA', 'RETRASO') NOT NULL DEFAULT 'PRESENTE',
  `justificacion` TEXT DEFAULT NULL,
  `registrado_por` VARCHAR(64) DEFAULT NULL,
  `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_asistencia_alumno_fecha` (`alumno_id`, `grupo_id`, `fecha`),
  INDEX `idx_asist_matricula` (`matricula_id`),
  INDEX `idx_asist_grupo_fecha` (`grupo_id`, `fecha`),
  INDEX `idx_asist_alumno` (`alumno_id`),
  CONSTRAINT `fk_asist_matricula` FOREIGN KEY (`matricula_id`) REFERENCES `matriculas`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_asist_alumno` FOREIGN KEY (`alumno_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_asist_grupo` FOREIGN KEY (`grupo_id`) REFERENCES `grupos`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_asist_registrado_por` FOREIGN KEY (`registrado_por`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 2. SESIONES / CLASES DEL CALENDARIO
-- Fechas y horarios concretos de cada sesión presencial por grupo
-- ============================================================
CREATE TABLE IF NOT EXISTS `sesiones_clase` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `grupo_id` VARCHAR(64) NOT NULL,
  `titulo` VARCHAR(255) DEFAULT NULL,
  `descripcion` TEXT DEFAULT NULL,
  `fecha` DATE NOT NULL,
  `hora_inicio` TIME NOT NULL,
  `hora_fin` TIME NOT NULL,
  `tipo` ENUM('PRESENCIAL', 'TELEFORMACION', 'PRACTICA', 'EXAMEN') NOT NULL DEFAULT 'PRESENCIAL',
  `aula` VARCHAR(100) DEFAULT NULL,
  `estado` ENUM('PROGRAMADA', 'REALIZADA', 'CANCELADA') NOT NULL DEFAULT 'PROGRAMADA',
  `creado_por` VARCHAR(64) DEFAULT NULL,
  `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_sc_grupo_fecha` (`grupo_id`, `fecha`),
  CONSTRAINT `fk_sc_grupo` FOREIGN KEY (`grupo_id`) REFERENCES `grupos`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sc_creado_por` FOREIGN KEY (`creado_por`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 3. EXÁMENES
-- Cabecera de cada evaluación / test online por grupo y especialidad
-- ============================================================
CREATE TABLE IF NOT EXISTS `examenes` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `grupo_id` VARCHAR(64) NOT NULL,
  `especialidad_id` VARCHAR(32) NOT NULL,
  `titulo` VARCHAR(255) NOT NULL,
  `descripcion` TEXT DEFAULT NULL,
  `tipo` ENUM('TEST', 'TEORICO', 'PRACTICO', 'FINAL') NOT NULL DEFAULT 'TEST',
  `nota_minima_aprobado` DECIMAL(5,2) NOT NULL DEFAULT 5.00,
  `puntuacion_maxima` DECIMAL(8,2) NOT NULL DEFAULT 10.00,
  `duracion_minutos` INT DEFAULT NULL,
  `intentos_permitidos` INT NOT NULL DEFAULT 1,
  `mezclar_preguntas` TINYINT(1) NOT NULL DEFAULT 1,
  `mostrar_resultado_inmediato` TINYINT(1) NOT NULL DEFAULT 1,
  `fecha_apertura` DATETIME DEFAULT NULL,
  `fecha_cierre` DATETIME DEFAULT NULL,
  `estado` ENUM('BORRADOR', 'PUBLICADO', 'CERRADO', 'ARCHIVADO') NOT NULL DEFAULT 'BORRADOR',
  `creado_por` VARCHAR(64) NOT NULL,
  `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_exam_grupo` (`grupo_id`),
  INDEX `idx_exam_especialidad` (`especialidad_id`),
  INDEX `idx_exam_estado` (`estado`),
  CONSTRAINT `fk_exam_grupo` FOREIGN KEY (`grupo_id`) REFERENCES `grupos`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_exam_especialidad` FOREIGN KEY (`especialidad_id`) REFERENCES `especialidades`(`id`),
  CONSTRAINT `fk_exam_creado_por` FOREIGN KEY (`creado_por`) REFERENCES `usuarios`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 4. PREGUNTAS DE EXAMEN
-- Banco de preguntas por examen (tipo test o abierta)
-- ============================================================
CREATE TABLE IF NOT EXISTS `preguntas_examen` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `examen_id` VARCHAR(64) NOT NULL,
  `enunciado` TEXT NOT NULL,
  `tipo` ENUM('OPCION_MULTIPLE', 'VERDADERO_FALSO', 'TEXTO_LIBRE') NOT NULL DEFAULT 'OPCION_MULTIPLE',
  `opciones` JSON DEFAULT NULL,
  `respuesta_correcta` TEXT DEFAULT NULL,
  `puntuacion` DECIMAL(5,2) NOT NULL DEFAULT 1.00,
  `orden` INT NOT NULL DEFAULT 0,
  `imagen_url` VARCHAR(500) DEFAULT NULL,
  `explicacion` TEXT DEFAULT NULL,
  `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_pq_examen` (`examen_id`),
  CONSTRAINT `fk_pq_examen` FOREIGN KEY (`examen_id`) REFERENCES `examenes`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 5. RESULTADOS / INTENTOS DE EXAMEN
-- Notas y respuestas del alumno por cada intento
-- ============================================================
CREATE TABLE IF NOT EXISTS `resultados_examenes` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `examen_id` VARCHAR(64) NOT NULL,
  `alumno_id` VARCHAR(64) NOT NULL,
  `matricula_id` VARCHAR(64) NOT NULL,
  `intento` INT NOT NULL DEFAULT 1,
  `nota` DECIMAL(5,2) DEFAULT NULL,
  `puntos_obtenidos` DECIMAL(8,2) DEFAULT NULL,
  `puntos_maximos` DECIMAL(8,2) DEFAULT NULL,
  `aprobado` TINYINT(1) NOT NULL DEFAULT 0,
  `respuestas` JSON DEFAULT NULL,
  `tiempo_empleado_segundos` INT DEFAULT NULL,
  `iniciado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `finalizado_en` DATETIME DEFAULT NULL,
  `estado` ENUM('EN_PROGRESO', 'COMPLETADO', 'ABANDONADO') NOT NULL DEFAULT 'EN_PROGRESO',
  `revisado_por` VARCHAR(64) DEFAULT NULL,
  `comentario_profesor` TEXT DEFAULT NULL,
  UNIQUE KEY `uq_resultado_alumno_examen_intento` (`alumno_id`, `examen_id`, `intento`),
  INDEX `idx_res_examen` (`examen_id`),
  INDEX `idx_res_alumno` (`alumno_id`),
  INDEX `idx_res_matricula` (`matricula_id`),
  CONSTRAINT `fk_res_examen` FOREIGN KEY (`examen_id`) REFERENCES `examenes`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_res_alumno` FOREIGN KEY (`alumno_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_res_matricula` FOREIGN KEY (`matricula_id`) REFERENCES `matriculas`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_res_revisado_por` FOREIGN KEY (`revisado_por`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 6. CERTIFICADOS EMITIDOS
-- Registro oficial de diplomas y certificados expedidos por Secretaría
-- ============================================================
CREATE TABLE IF NOT EXISTS `certificados_emitidos` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `numero_certificado` VARCHAR(50) NOT NULL UNIQUE,
  `alumno_id` VARCHAR(64) NOT NULL,
  `matricula_id` VARCHAR(64) NOT NULL,
  `especialidad_id` VARCHAR(32) NOT NULL,
  `grupo_id` VARCHAR(64) NOT NULL,
  `tipo` ENUM('ASISTENCIA', 'APROVECHAMIENTO', 'PARTICIPACION', 'CAPACITACION') NOT NULL DEFAULT 'APROVECHAMIENTO',
  `nota_final` DECIMAL(5,2) DEFAULT NULL,
  `horas_cursadas` INT DEFAULT NULL,
  `porcentaje_asistencia` DECIMAL(5,2) DEFAULT NULL,
  `fecha_inicio_curso` DATE DEFAULT NULL,
  `fecha_fin_curso` DATE DEFAULT NULL,
  `fecha_emision` DATE NOT NULL,
  `pdf_path` VARCHAR(500) DEFAULT NULL,
  `expedido_por` VARCHAR(64) DEFAULT NULL,
  `validado_por` VARCHAR(64) DEFAULT NULL,
  `estado` ENUM('EMITIDO', 'ANULADO', 'REEMPLAZADO') NOT NULL DEFAULT 'EMITIDO',
  `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_cert_alumno` (`alumno_id`),
  INDEX `idx_cert_matricula` (`matricula_id`),
  INDEX `idx_cert_especialidad` (`especialidad_id`),
  INDEX `idx_cert_estado` (`estado`),
  CONSTRAINT `fk_cert_alumno` FOREIGN KEY (`alumno_id`) REFERENCES `usuarios`(`id`),
  CONSTRAINT `fk_cert_matricula` FOREIGN KEY (`matricula_id`) REFERENCES `matriculas`(`id`),
  CONSTRAINT `fk_cert_especialidad` FOREIGN KEY (`especialidad_id`) REFERENCES `especialidades`(`id`),
  CONSTRAINT `fk_cert_grupo` FOREIGN KEY (`grupo_id`) REFERENCES `grupos`(`id`),
  CONSTRAINT `fk_cert_expedido_por` FOREIGN KEY (`expedido_por`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_cert_validado_por` FOREIGN KEY (`validado_por`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 7. EVALUACIONES DEL FORMADOR
-- Valoración anónima del formador al finalizar el curso (obligatoria en subvenciones)
-- ============================================================
CREATE TABLE IF NOT EXISTS `evaluaciones_formador` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `grupo_id` VARCHAR(64) NOT NULL,
  `alumno_id` VARCHAR(64) NOT NULL,
  `matricula_id` VARCHAR(64) NOT NULL,
  `puntuacion_metodologia` INT CHECK (`puntuacion_metodologia` BETWEEN 1 AND 5),
  `puntuacion_conocimientos` INT CHECK (`puntuacion_conocimientos` BETWEEN 1 AND 5),
  `puntuacion_materiales` INT CHECK (`puntuacion_materiales` BETWEEN 1 AND 5),
  `puntuacion_organizacion` INT CHECK (`puntuacion_organizacion` BETWEEN 1 AND 5),
  `puntuacion_global` INT CHECK (`puntuacion_global` BETWEEN 1 AND 5),
  `comentarios_abiertos` TEXT DEFAULT NULL,
  `recomendaria` TINYINT(1) DEFAULT NULL,
  `completada_en` DATETIME DEFAULT NULL,
  `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_eval_alumno_grupo` (`alumno_id`, `grupo_id`),
  INDEX `idx_ef_grupo` (`grupo_id`),
  CONSTRAINT `fk_ef_grupo` FOREIGN KEY (`grupo_id`) REFERENCES `grupos`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ef_alumno` FOREIGN KEY (`alumno_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ef_matricula` FOREIGN KEY (`matricula_id`) REFERENCES `matriculas`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- VISTAS AUXILIARES (no tablas, pero muy útiles para informes)
-- ============================================================

-- Vista: Resumen de asistencia por matrícula
CREATE OR REPLACE VIEW `v_resumen_asistencia` AS
SELECT
  a.matricula_id,
  a.alumno_id,
  a.grupo_id,
  COUNT(*) AS total_sesiones,
  SUM(CASE WHEN a.estado IN ('PRESENTE', 'RETRASO') THEN 1 ELSE 0 END) AS sesiones_asistidas,
  SUM(CASE WHEN a.estado = 'AUSENTE' THEN 1 ELSE 0 END) AS sesiones_ausente,
  SUM(CASE WHEN a.estado = 'JUSTIFICADA' THEN 1 ELSE 0 END) AS sesiones_justificadas,
  ROUND(
    (SUM(CASE WHEN a.estado IN ('PRESENTE', 'RETRASO') THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2
  ) AS porcentaje_asistencia
FROM asistencia a
GROUP BY a.matricula_id, a.alumno_id, a.grupo_id;

-- Vista: Mejor nota por alumno y examen
CREATE OR REPLACE VIEW `v_mejor_resultado_examen` AS
SELECT
  alumno_id,
  examen_id,
  MAX(nota) AS mejor_nota,
  MAX(aprobado) AS aprobado,
  COUNT(*) AS num_intentos,
  MIN(iniciado_en) AS primer_intento,
  MAX(finalizado_en) AS ultimo_intento
FROM resultados_examenes
WHERE estado = 'COMPLETADO'
GROUP BY alumno_id, examen_id;
