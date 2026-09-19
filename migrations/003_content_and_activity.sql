-- Migration: 003_content_and_activity.sql
-- Description: Materials, binary storage registry, video progress, intervals, and audit logging.

CREATE TABLE IF NOT EXISTS `archivos` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `clave_almacenamiento` VARCHAR(255) NOT NULL UNIQUE,
  `nombre_original` VARCHAR(255) NOT NULL,
  `mime_type` VARCHAR(100) NOT NULL,
  `tamano_bytes` BIGINT NOT NULL,
  `checksum` VARCHAR(64) DEFAULT NULL,
  `autor_id` VARCHAR(64) NOT NULL,
  `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_arch_autor` (`autor_id`),
  CONSTRAINT `fk_arch_autor` FOREIGN KEY (`autor_id`) REFERENCES `usuarios`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `materiales` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `especialidad_id` VARCHAR(32) NOT NULL,
  `grupo_id` VARCHAR(64) DEFAULT NULL,
  `titulo` VARCHAR(255) NOT NULL,
  `descripcion` TEXT DEFAULT NULL,
  `tipo` ENUM('PDF', 'VIDEO') NOT NULL DEFAULT 'PDF',
  `archivo_id` VARCHAR(64) DEFAULT NULL,
  `referencia_video` VARCHAR(500) DEFAULT NULL,
  `proveedor` VARCHAR(50) DEFAULT NULL,
  `orden` INT NOT NULL DEFAULT 0,
  `estado` ENUM('BORRADOR', 'PUBLICADO', 'ARCHIVADO') NOT NULL DEFAULT 'BORRADOR',
  `autor_id` VARCHAR(64) NOT NULL,
  `version` INT NOT NULL DEFAULT 1,
  `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_mat_esp_grp` (`especialidad_id`, `grupo_id`),
  INDEX `idx_mat_estado` (`estado`),
  CONSTRAINT `fk_mat_especialidad` FOREIGN KEY (`especialidad_id`) REFERENCES `especialidades`(`id`),
  CONSTRAINT `fk_mat_grupo_ref` FOREIGN KEY (`grupo_id`) REFERENCES `grupos`(`id`),
  CONSTRAINT `fk_mat_archivo` FOREIGN KEY (`archivo_id`) REFERENCES `archivos`(`id`),
  CONSTRAINT `fk_mat_autor` FOREIGN KEY (`autor_id`) REFERENCES `usuarios`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `progreso_materiales` (
  `alumno_id` VARCHAR(64) NOT NULL,
  `matricula_id` VARCHAR(64) NOT NULL,
  `material_id` VARCHAR(64) NOT NULL,
  `version` INT NOT NULL DEFAULT 1,
  `estado` ENUM('NO_INICIADO', 'EN_PROGRESO', 'COMPLETADO') NOT NULL DEFAULT 'NO_INICIADO',
  `posicion_segundos` INT NOT NULL DEFAULT 0,
  `duracion_segundos` INT NOT NULL DEFAULT 0,
  `ultimo_acceso` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `completado_en` DATETIME DEFAULT NULL,
  PRIMARY KEY (`alumno_id`, `matricula_id`, `material_id`, `version`),
  CONSTRAINT `fk_pm_alumno` FOREIGN KEY (`alumno_id`) REFERENCES `usuarios`(`id`),
  CONSTRAINT `fk_pm_matricula` FOREIGN KEY (`matricula_id`) REFERENCES `matriculas`(`id`),
  CONSTRAINT `fk_pm_material` FOREIGN KEY (`material_id`) REFERENCES `materiales`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `intervalos_video` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `alumno_id` VARCHAR(64) NOT NULL,
  `matricula_id` VARCHAR(64) NOT NULL,
  `material_id` VARCHAR(64) NOT NULL,
  `version` INT NOT NULL DEFAULT 1,
  `inicio_seg` INT NOT NULL,
  `fin_seg` INT NOT NULL,
  `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_iv_alumno_mat_material` (`alumno_id`, `matricula_id`, `material_id`, `version`),
  CONSTRAINT `fk_iv_alumno` FOREIGN KEY (`alumno_id`) REFERENCES `usuarios`(`id`),
  CONSTRAINT `fk_iv_matricula` FOREIGN KEY (`matricula_id`) REFERENCES `matriculas`(`id`),
  CONSTRAINT `fk_iv_material` FOREIGN KEY (`material_id`) REFERENCES `materiales`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `actividad` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `actor_id` VARCHAR(64) NOT NULL,
  `accion` VARCHAR(100) NOT NULL,
  `tipo_actividad` ENUM('ACADEMICA', 'AUDITORIA') NOT NULL DEFAULT 'ACADEMICA',
  `recurso_tipo` VARCHAR(50) NOT NULL,
  `recurso_id` VARCHAR(64) NOT NULL,
  `matricula_id` VARCHAR(64) DEFAULT NULL,
  `metadatos` JSON DEFAULT NULL,
  `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_act_actor_fecha` (`actor_id`, `creado_en`),
  INDEX `idx_act_tipo_fecha` (`tipo_actividad`, `creado_en`),
  CONSTRAINT `fk_act_actor` FOREIGN KEY (`actor_id`) REFERENCES `usuarios`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
