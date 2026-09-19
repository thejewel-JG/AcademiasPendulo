-- Migration: 004_communications_and_requests.sql
-- Description: Conversations, participants, messages, attachments, read status, requests, and notifications.

CREATE TABLE IF NOT EXISTS `conversaciones` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `tipo` ENUM('ADMINISTRATIVA', 'ACADEMICA', 'SOLICITUD') NOT NULL,
  `asunto` VARCHAR(255) NOT NULL,
  `creador_id` VARCHAR(64) NOT NULL,
  `grupo_id` VARCHAR(64) DEFAULT NULL,
  `matricula_id` VARCHAR(64) DEFAULT NULL,
  `responsable_id` VARCHAR(64) DEFAULT NULL,
  `estado` ENUM('ABIERTA', 'EN_TRAMITE', 'RESUELTA', 'CERRADA') NOT NULL DEFAULT 'ABIERTA',
  `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_conv_creador` (`creador_id`),
  INDEX `idx_conv_responsable` (`responsable_id`),
  INDEX `idx_conv_estado` (`estado`),
  CONSTRAINT `fk_conv_creador` FOREIGN KEY (`creador_id`) REFERENCES `usuarios`(`id`),
  CONSTRAINT `fk_conv_responsable` FOREIGN KEY (`responsable_id`) REFERENCES `usuarios`(`id`),
  CONSTRAINT `fk_conv_grupo` FOREIGN KEY (`grupo_id`) REFERENCES `grupos`(`id`),
  CONSTRAINT `fk_conv_matricula` FOREIGN KEY (`matricula_id`) REFERENCES `matriculas`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `participantes_conversacion` (
  `conversacion_id` VARCHAR(64) NOT NULL,
  `usuario_id` VARCHAR(64) NOT NULL,
  `tipo_participacion` ENUM('CREADOR', 'RESPONSABLE', 'MIEMBRO') NOT NULL DEFAULT 'MIEMBRO',
  `agregado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`conversacion_id`, `usuario_id`),
  CONSTRAINT `fk_pc_conv` FOREIGN KEY (`conversacion_id`) REFERENCES `conversaciones`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pc_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `mensajes` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `conversacion_id` VARCHAR(64) NOT NULL,
  `remitente_id` VARCHAR(64) NOT NULL,
  `cuerpo` TEXT NOT NULL,
  `estado` ENUM('ENVIADO', 'EDITADO', 'ELIMINADO') NOT NULL DEFAULT 'ENVIADO',
  `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_msg_conv_fecha` (`conversacion_id`, `creado_en`),
  CONSTRAINT `fk_msg_conv` FOREIGN KEY (`conversacion_id`) REFERENCES `conversaciones`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_msg_remitente` FOREIGN KEY (`remitente_id`) REFERENCES `usuarios`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `mensaje_archivos` (
  `mensaje_id` VARCHAR(64) NOT NULL,
  `archivo_id` VARCHAR(64) NOT NULL,
  PRIMARY KEY (`mensaje_id`, `archivo_id`),
  CONSTRAINT `fk_ma_mensaje` FOREIGN KEY (`mensaje_id`) REFERENCES `mensajes`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ma_archivo` FOREIGN KEY (`archivo_id`) REFERENCES `archivos`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `lecturas_mensajes` (
  `conversacion_id` VARCHAR(64) NOT NULL,
  `usuario_id` VARCHAR(64) NOT NULL,
  `ultimo_mensaje_id` VARCHAR(64) DEFAULT NULL,
  `leido_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`conversacion_id`, `usuario_id`),
  CONSTRAINT `fk_lm_conv` FOREIGN KEY (`conversacion_id`) REFERENCES `conversaciones`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_lm_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_lm_ultimo_msg` FOREIGN KEY (`ultimo_mensaje_id`) REFERENCES `mensajes`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- SOLICITUDES (Fuente única de verdad vinculada a conversación)
CREATE TABLE IF NOT EXISTS `solicitudes` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `conversacion_id` VARCHAR(64) NOT NULL UNIQUE,
  `tipo` ENUM('CAMBIO_GRUPO', 'CERTIFICADO', 'DUDA_ACADEMICA', 'SOPORTE', 'OTRO') NOT NULL,
  `solicitante_id` VARCHAR(64) NOT NULL,
  `destinatario_id` VARCHAR(64) DEFAULT NULL,
  `estado` ENUM('PENDIENTE', 'EN_PROCESO', 'APROBADA', 'RECHAZADA', 'CANCELADA') NOT NULL DEFAULT 'PENDIENTE',
  `decision` TEXT DEFAULT NULL,
  `autor_decision_id` VARCHAR(64) DEFAULT NULL,
  `decidido_en` DATETIME DEFAULT NULL,
  `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_sol_solicitante` (`solicitante_id`),
  INDEX `idx_sol_estado` (`estado`),
  CONSTRAINT `fk_sol_conv` FOREIGN KEY (`conversacion_id`) REFERENCES `conversaciones`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sol_solicitante` FOREIGN KEY (`solicitante_id`) REFERENCES `usuarios`(`id`),
  CONSTRAINT `fk_sol_destinatario` FOREIGN KEY (`destinatario_id`) REFERENCES `usuarios`(`id`),
  CONSTRAINT `fk_sol_autor_dec` FOREIGN KEY (`autor_decision_id`) REFERENCES `usuarios`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `notificaciones` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `destinatario_id` VARCHAR(64) NOT NULL,
  `tipo` VARCHAR(50) NOT NULL,
  `referencia_tipo` VARCHAR(50) DEFAULT NULL,
  `referencia_id` VARCHAR(64) DEFAULT NULL,
  `titulo` VARCHAR(255) NOT NULL,
  `mensaje` TEXT NOT NULL,
  `leido_en` DATETIME DEFAULT NULL,
  `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_notif_dest_leido` (`destinatario_id`, `leido_en`, `creado_en`),
  CONSTRAINT `fk_notif_dest` FOREIGN KEY (`destinatario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
