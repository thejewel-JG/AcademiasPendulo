-- Migration: 001_initial_core_schema.sql
-- Description: Core security, roles, users, sessions, and access tokens for Academias Péndulo campus.

CREATE TABLE IF NOT EXISTS `migraciones` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `version` VARCHAR(50) NOT NULL UNIQUE,
  `nombre` VARCHAR(255) NOT NULL,
  `ejecutado_en` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `roles` (
  `id` VARCHAR(32) NOT NULL PRIMARY KEY,
  `codigo` VARCHAR(32) NOT NULL UNIQUE,
  `nombre` VARCHAR(100) NOT NULL,
  `descripcion` TEXT DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `roles` (`id`, `codigo`, `nombre`, `descripcion`) VALUES
('rol-admin', 'ADMINISTRADOR', 'Administrador del Campus', 'Acceso total a gestión académica, usuarios, roles, catálogo y auditoría'),
('rol-profesor', 'PROFESOR', 'Profesor / Docente', 'Gestión de grupos asignados, publicación de materiales y atención a alumnos'),
('rol-alumno', 'ALUMNO', 'Alumno Matriculado', 'Acceso al campus virtual, materiales, vídeo-clases, trámites y secretaría')
ON DUPLICATE KEY UPDATE `nombre`=`nombre`;

CREATE TABLE IF NOT EXISTS `usuarios` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `nombre` VARCHAR(100) NOT NULL,
  `apellidos` VARCHAR(150) NOT NULL,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `email_original` VARCHAR(150) NOT NULL,
  `password_hash` VARCHAR(255) DEFAULT NULL,
  `telefono` VARCHAR(30) DEFAULT NULL,
  `estado` ENUM('ACTIVO', 'INACTIVO', 'SUSPENDIDO') NOT NULL DEFAULT 'ACTIVO',
  `cambio_password_obligatorio` TINYINT(1) NOT NULL DEFAULT 0,
  `caducidad_password_temporal` DATETIME DEFAULT NULL,
  `ultimo_acceso` DATETIME DEFAULT NULL,
  `creado_por` VARCHAR(64) DEFAULT NULL,
  `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_usuarios_email` (`email`),
  INDEX `idx_usuarios_estado` (`estado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `usuario_roles` (
  `usuario_id` VARCHAR(64) NOT NULL,
  `rol_id` VARCHAR(32) NOT NULL,
  `asignado_por` VARCHAR(64) DEFAULT NULL,
  `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`usuario_id`, `rol_id`),
  CONSTRAINT `fk_ur_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ur_rol` FOREIGN KEY (`rol_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sesiones` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `usuario_id` VARCHAR(64) NOT NULL,
  `token_hash` VARCHAR(255) NOT NULL,
  `ip` VARCHAR(45) DEFAULT NULL,
  `user_agent` TEXT DEFAULT NULL,
  `expiracion` DATETIME NOT NULL,
  `revocado_en` DATETIME DEFAULT NULL,
  `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_ses_usuario` (`usuario_id`),
  INDEX `idx_ses_token` (`token_hash`),
  CONSTRAINT `fk_ses_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tokens_acceso` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `usuario_id` VARCHAR(64) NOT NULL,
  `proposito` VARCHAR(50) NOT NULL,
  `token_hash` VARCHAR(255) NOT NULL,
  `expiracion` DATETIME NOT NULL,
  `consumido_en` DATETIME DEFAULT NULL,
  `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_ta_usuario_prop` (`usuario_id`, `proposito`),
  INDEX `idx_ta_token_hash` (`token_hash`),
  CONSTRAINT `fk_ta_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
