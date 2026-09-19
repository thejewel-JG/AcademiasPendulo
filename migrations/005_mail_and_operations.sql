-- Migration: 005_mail_and_operations.sql
-- Description: External email system, IMAP sync cursors, outbox queue with idempotency, and administrative audit log.

CREATE TABLE IF NOT EXISTS `cuentas_correo` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `buzon` VARCHAR(150) NOT NULL UNIQUE,
  `proveedor` VARCHAR(50) NOT NULL DEFAULT 'Hostinger IMAP/SMTP',
  `estado` ENUM('ACTIVA', 'INACTIVA', 'ERROR') NOT NULL DEFAULT 'ACTIVA',
  `secreto_ref` VARCHAR(255) NOT NULL,
  `configuracion` JSON DEFAULT NULL,
  `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_cc_buzon` (`buzon`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `hilos_correo` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `cuenta_id` VARCHAR(64) NOT NULL,
  `asunto_hilo` VARCHAR(255) DEFAULT NULL,
  `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_hc_cuenta` FOREIGN KEY (`cuenta_id`) REFERENCES `cuentas_correo`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `correos` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `cuenta_id` VARCHAR(64) NOT NULL,
  `hilo_id` VARCHAR(64) DEFAULT NULL,
  `provider_id` VARCHAR(255) DEFAULT NULL,
  `message_id` VARCHAR(255) DEFAULT NULL,
  `in_reply_to` VARCHAR(255) DEFAULT NULL,
  `references_header` TEXT DEFAULT NULL,
  `remitente` VARCHAR(255) NOT NULL,
  `destinatarios` JSON NOT NULL,
  `asunto` VARCHAR(255) DEFAULT NULL,
  `cuerpo_texto` LONGTEXT DEFAULT NULL,
  `cuerpo_html` LONGTEXT DEFAULT NULL,
  `fecha_correo` DATETIME NOT NULL,
  `direccion` ENUM('INBOUND', 'OUTBOUND') NOT NULL,
  `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_mail_cuenta_fecha` (`cuenta_id`, `fecha_correo`),
  INDEX `idx_mail_msg_id` (`message_id`),
  CONSTRAINT `fk_mail_cuenta` FOREIGN KEY (`cuenta_id`) REFERENCES `cuentas_correo`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_mail_hilo` FOREIGN KEY (`hilo_id`) REFERENCES `hilos_correo`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `correo_archivos` (
  `correo_id` VARCHAR(64) NOT NULL,
  `archivo_id` VARCHAR(64) NOT NULL,
  PRIMARY KEY (`correo_id`, `archivo_id`),
  CONSTRAINT `fk_ca_correo` FOREIGN KEY (`correo_id`) REFERENCES `correos`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ca_archivo` FOREIGN KEY (`archivo_id`) REFERENCES `archivos`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sincronizacion_correo` (
  `cuenta_id` VARCHAR(64) NOT NULL,
  `carpeta` VARCHAR(100) NOT NULL DEFAULT 'INBOX',
  `uidvalidity` INT UNSIGNED NOT NULL DEFAULT 0,
  `uid_next` INT UNSIGNED NOT NULL DEFAULT 1,
  `last_uid` INT UNSIGNED NOT NULL DEFAULT 0,
  `fecha_sincronizacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `ultimo_error` TEXT DEFAULT NULL,
  PRIMARY KEY (`cuenta_id`, `carpeta`),
  CONSTRAINT `fk_sc_cuenta` FOREIGN KEY (`cuenta_id`) REFERENCES `cuentas_correo`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `cola_correos` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `tipo` VARCHAR(50) NOT NULL,
  `destinatario` VARCHAR(255) NOT NULL,
  `correo_id` VARCHAR(64) DEFAULT NULL,
  `contenido_ref` JSON DEFAULT NULL,
  `clave_idempotencia` VARCHAR(128) NOT NULL UNIQUE,
  `estado` ENUM('PENDIENTE', 'ENVIANDO', 'ENVIADO', 'ERROR') NOT NULL DEFAULT 'PENDIENTE',
  `intentos` INT NOT NULL DEFAULT 0,
  `proxima_ejecucion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `error_sanitizado` TEXT DEFAULT NULL,
  `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_outbox_estado_proxima` (`estado`, `proxima_ejecucion`),
  CONSTRAINT `fk_cc_correo` FOREIGN KEY (`correo_id`) REFERENCES `correos`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `auditoria` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `actor_id` VARCHAR(64) DEFAULT NULL,
  `accion_administrativa` VARCHAR(100) NOT NULL,
  `recurso` VARCHAR(50) NOT NULL,
  `recurso_id` VARCHAR(64) DEFAULT NULL,
  `diff_cambios` JSON DEFAULT NULL,
  `ip` VARCHAR(45) DEFAULT NULL,
  `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_aud_actor_fecha` (`actor_id`, `creado_en`),
  CONSTRAINT `fk_aud_actor` FOREIGN KEY (`actor_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
