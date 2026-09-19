-- ============================================================
-- BASE DE DATOS OFICIAL ACADEMIAS PÉNDULO (HOSTINGER MYSQL)
-- Host: srv1787.hstgr.io
-- Base de datos: u141101294_Academias
-- Collation: utf8mb4_unicode_ci | Motor: InnoDB
-- Fechas guardadas en UTC, presentadas en Europe/Madrid en cliente UI
-- ============================================================

CREATE DATABASE IF NOT EXISTS `u141101294_Academias` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `u141101294_Academias`;

-- ------------------------------------------------------------
-- 0. CONTROL DE MIGRACIONES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `migraciones` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `version` VARCHAR(50) NOT NULL UNIQUE,
  `nombre` VARCHAR(255) NOT NULL,
  `ejecutado_en` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 1. MODELO DE ACCESO Y SEGURIDAD
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- 2. MODELO ACADÉMICO
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `especialidades` (
  `id` VARCHAR(32) NOT NULL PRIMARY KEY,
  `codigo` VARCHAR(32) NOT NULL UNIQUE,
  `nombre` VARCHAR(255) NOT NULL,
  `categoria_id` VARCHAR(32) NOT NULL DEFAULT 'tmv',
  `descripcion` TEXT DEFAULT NULL,
  `nivel` VARCHAR(150) DEFAULT NULL,
  `horas_totales` INT NOT NULL DEFAULT 0,
  `horas_practicas` INT NOT NULL DEFAULT 0,
  `modalidad` VARCHAR(100) NOT NULL DEFAULT 'Presencial',
  `estado` ENUM('ACTIVO', 'INACTIVO') NOT NULL DEFAULT 'ACTIVO',
  `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_esp_codigo` (`codigo`),
  INDEX `idx_esp_estado` (`estado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `grupos` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `especialidad_id` VARCHAR(32) NOT NULL,
  `nombre` VARCHAR(150) NOT NULL,
  `profesor_principal_id` VARCHAR(64) NOT NULL,
  `fecha_inicio` DATE DEFAULT NULL,
  `fecha_fin` DATE DEFAULT NULL,
  `estado` ENUM('PLANIFICADO', 'ACTIVO', 'FINALIZADO', 'CANCELADO') NOT NULL DEFAULT 'ACTIVO',
  `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_grp_profesor` (`profesor_principal_id`),
  INDEX `idx_grp_especialidad` (`especialidad_id`),
  CONSTRAINT `fk_grp_especialidad` FOREIGN KEY (`especialidad_id`) REFERENCES `especialidades`(`id`),
  CONSTRAINT `fk_grp_profesor` FOREIGN KEY (`profesor_principal_id`) REFERENCES `usuarios`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `matriculas` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `alumno_id` VARCHAR(64) NOT NULL,
  `grupo_id` VARCHAR(64) NOT NULL,
  `estado` ENUM('ACTIVA', 'FINALIZADA', 'CANCELADA', 'SUSPENDIDA') NOT NULL DEFAULT 'ACTIVA',
  `fecha_inicio` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_fin` DATETIME DEFAULT NULL,
  `autor_id` VARCHAR(64) DEFAULT NULL,
  `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_mat_alumno` (`alumno_id`),
  INDEX `idx_mat_grupo` (`grupo_id`),
  INDEX `idx_mat_estado` (`estado`),
  CONSTRAINT `fk_mat_alumno` FOREIGN KEY (`alumno_id`) REFERENCES `usuarios`(`id`),
  CONSTRAINT `fk_mat_grupo` FOREIGN KEY (`grupo_id`) REFERENCES `grupos`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Garantiza a nivel de motor SQL una sola matrícula activa por alumno
CREATE TABLE IF NOT EXISTS `alumno_matricula_activa` (
  `alumno_id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `matricula_id` VARCHAR(64) NOT NULL UNIQUE,
  `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_ama_alumno` FOREIGN KEY (`alumno_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ama_matricula` FOREIGN KEY (`matricula_id`) REFERENCES `matriculas`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 3. CONTENIDOS Y ACTIVIDAD
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- 4. COMUNICACIONES Y TRAMITES
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- 5. CORREO EXTERNO, COLA E AUDITORÍA
-- ------------------------------------------------------------
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
