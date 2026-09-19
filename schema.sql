-- ============================================================
-- BASE DE DATOS OFFICIAL ACADEMIAS PÉNDULO (HOSTINGER MYSQL)
-- Base de datos: u141101294_guillermina
-- ============================================================

CREATE DATABASE IF NOT EXISTS `u141101294_guillermina` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `u141101294_guillermina`;

-- 1. TABLA DE USUARIOS (ALUMNOS, PROFESORES Y ADMINISTRADORES)
CREATE TABLE IF NOT EXISTS `usuarios` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `nombre` VARCHAR(100) NOT NULL,
  `apellidos` VARCHAR(150) NOT NULL,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `telefono` VARCHAR(30) DEFAULT NULL,
  `role` ENUM('ALUMNO', 'PROFESOR', 'ADMINISTRACION') NOT NULL DEFAULT 'ALUMNO',
  `activo` TINYINT(1) NOT NULL DEFAULT 1,
  `fecha_alta` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. TABLA DE CURSOS Y ESPECIALIDADES OFICIALES
CREATE TABLE IF NOT EXISTS `cursos` (
  `id` VARCHAR(32) NOT NULL PRIMARY KEY,
  `codigo` VARCHAR(32) NOT NULL UNIQUE,
  `nombre` VARCHAR(255) NOT NULL,
  `descripcion` TEXT DEFAULT NULL,
  `imagen` VARCHAR(500) DEFAULT NULL,
  `profesor_nombre` VARCHAR(150) DEFAULT NULL,
  `profesor_id` VARCHAR(64) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. TABLA DE MATRÍCULAS
CREATE TABLE IF NOT EXISTS `matriculas` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `estudiante_id` VARCHAR(64) NOT NULL,
  `curso_id` VARCHAR(32) NOT NULL,
  `fecha_matricula` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `estado` ENUM('active', 'completed', 'cancelled', 'suspended') NOT NULL DEFAULT 'active',
  `progreso` INT NOT NULL DEFAULT 0,
  `ultima_leccion_id` VARCHAR(64) DEFAULT NULL,
  CONSTRAINT `fk_mat_estudiante` FOREIGN KEY (`estudiante_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_mat_curso` FOREIGN KEY (`curso_id`) REFERENCES `cursos`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. TABLA DE MATERIALES Y RECURSOS PDF
CREATE TABLE IF NOT EXISTS `recursos_pdf` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `curso_id` VARCHAR(32) NOT NULL,
  `modulo_id` VARCHAR(64) NOT NULL,
  `titulo` VARCHAR(255) NOT NULL,
  `descripcion` TEXT DEFAULT NULL,
  `tipo` ENUM('PDF', 'VIDEO', 'DOCUMENTO', 'ENLACE') NOT NULL DEFAULT 'PDF',
  `url_privada` LONGTEXT NOT NULL,
  `tamano` VARCHAR(30) DEFAULT NULL,
  `permitir_descarga` TINYINT(1) NOT NULL DEFAULT 1,
  `publicado` TINYINT(1) NOT NULL DEFAULT 1,
  `creado_por` VARCHAR(150) NOT NULL,
  `fecha_creacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_rec_curso` FOREIGN KEY (`curso_id`) REFERENCES `cursos`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. TABLA DE DUDAS Y CONSULTAS ACADÉMICAS
CREATE TABLE IF NOT EXISTS `dudas` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `estudiante_id` VARCHAR(64) NOT NULL,
  `estudiante_nombre` VARCHAR(200) NOT NULL,
  `profesor_id` VARCHAR(64) NOT NULL,
  `curso_id` VARCHAR(32) NOT NULL,
  `curso_nombre` VARCHAR(255) NOT NULL,
  `modulo_unidad` VARCHAR(150) DEFAULT NULL,
  `asunto` VARCHAR(255) NOT NULL,
  `estado` ENUM('PENDIENTE', 'RESPONDIDA', 'CERRADA') NOT NULL DEFAULT 'PENDIENTE',
  `adjunto_url` LONGTEXT DEFAULT NULL,
  `fecha_creacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `dudas_mensajes` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `thread_id` VARCHAR(64) NOT NULL,
  `autor_id` VARCHAR(64) NOT NULL,
  `autor_nombre` VARCHAR(200) NOT NULL,
  `autor_rol` ENUM('ALUMNO', 'PROFESOR', 'ADMINISTRACION') NOT NULL,
  `texto` TEXT NOT NULL,
  `fecha_hora` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `adjunto_url` LONGTEXT DEFAULT NULL,
  CONSTRAINT `fk_msg_duda` FOREIGN KEY (`thread_id`) REFERENCES `dudas`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. TABLA DE TRÁMITES DE SECRETARÍA ONLINE
CREATE TABLE IF NOT EXISTS `solicitudes_secretaria` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `referencia` VARCHAR(32) NOT NULL UNIQUE,
  `estudiante_id` VARCHAR(64) NOT NULL,
  `estudiante_nombre` VARCHAR(200) NOT NULL,
  `tipo` VARCHAR(100) NOT NULL,
  `asunto` VARCHAR(255) NOT NULL,
  `descripcion` TEXT NOT NULL,
  `adjunto_url` LONGTEXT DEFAULT NULL,
  `estado` ENUM('PENDIENTE', 'EN_TRAMITE', 'RESUELTA', 'RECHAZADA') NOT NULL DEFAULT 'PENDIENTE',
  `fecha_creacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `secretaria_mensajes` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `request_id` VARCHAR(64) NOT NULL,
  `autor_id` VARCHAR(64) NOT NULL,
  `autor_nombre` VARCHAR(200) NOT NULL,
  `autor_rol` ENUM('ALUMNO', 'PROFESOR', 'ADMINISTRACION') NOT NULL,
  `texto` TEXT NOT NULL,
  `fecha_hora` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `adjunto_url` LONGTEXT DEFAULT NULL,
  CONSTRAINT `fk_msg_sec` FOREIGN KEY (`request_id`) REFERENCES `solicitudes_secretaria`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. TABLA DE AVISOS Y TABLÓN ACADÉMICO
CREATE TABLE IF NOT EXISTS `avisos` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `titulo` VARCHAR(255) NOT NULL,
  `contenido` TEXT NOT NULL,
  `autor_nombre` VARCHAR(150) NOT NULL,
  `autor_id` VARCHAR(64) NOT NULL,
  `curso_id` VARCHAR(32) DEFAULT NULL,
  `destinatarios` ENUM('TODOS', 'ALUMNOS', 'PROFESOR') NOT NULL DEFAULT 'TODOS',
  `fecha` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. TABLA DE SOLICITUDES DE INFORMACIÓN Y LEADS
CREATE TABLE IF NOT EXISTS `contact_requests` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `first_name` VARCHAR(100) NOT NULL,
  `last_name` VARCHAR(150) NOT NULL,
  `email` VARCHAR(150) NOT NULL,
  `phone` VARCHAR(30) NOT NULL,
  `course_id` VARCHAR(32) NOT NULL,
  `course_code` VARCHAR(32) NOT NULL,
  `course_name` VARCHAR(255) NOT NULL,
  `preferred_schedule` VARCHAR(100) DEFAULT NULL,
  `employment_status` VARCHAR(100) DEFAULT NULL,
  `comments` TEXT DEFAULT NULL,
  `message` TEXT DEFAULT NULL,
  `status` ENUM('new', 'contacted', 'documentation_pending', 'enrolled', 'rejected', 'archived') NOT NULL DEFAULT 'new',
  `assigned_admin_name` VARCHAR(150) DEFAULT NULL,
  `internal_notes` TEXT DEFAULT NULL,
  `source` VARCHAR(100) NOT NULL DEFAULT 'Web Principal',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- INSERT USUARIOS DEMO Y INICIALES
INSERT INTO `usuarios` (`id`, `nombre`, `apellidos`, `email`, `telefono`, `role`, `activo`) VALUES
('usr-student-1', 'Alejandro', 'García Pérez', 'alumno@pendulo.es', '612 345 678', 'ALUMNO', 1),
('usr-teacher-1', 'Carlos', 'Martínez López', 'profesor@pendulo.es', '633 987 654', 'PROFESOR', 1),
('usr-teacher-2', 'Manuel', 'Ramos Gil', 'mramos@academiaspendulo.com', '655 11 22 33', 'PROFESOR', 1),
('usr-admin-1', 'Elena', 'Sánchez Ruiz', 'admin@pendulo.es', '950 25 25 25', 'ADMINISTRACION', 1)
ON DUPLICATE KEY UPDATE `nombre`=`nombre`;

-- INSERT AVISOS INICIALES
INSERT INTO `avisos` (`id`, `titulo`, `contenido`, `autor_nombre`, `autor_id`, `destinatarios`) VALUES
('ann-1', 'Oferta Formativa Oficial: 33 Especialidades Autorizadas por la Junta de Andalucía', 'ACADEMIAS PÉNDULO (Centro Autorizado 0400030892) cuenta con 33 especialidades en su oferta formativa en la familia de Transporte y Mantenimiento de Vehículos y Formación Complementaria en sus instalaciones de Carrera Doctoral 26 (Almería).', 'Secretaría Académica Péndulo', 'usr-admin-1', 'TODOS'),
('ann-2', 'Prácticas en Taller Homologado y Equipamiento de Diagnosis Avanzada', 'Las sesiones prácticas se realizan con equipamiento real: osciloscopios PicoScope, equipos de diagnosis Bosch KTS, sistemas de calibración ADAS multimarca y maquetas de alta tensión.', 'Dirección Técnica', 'usr-admin-1', 'ALUMNOS'),
('ann-3', 'Horario de Atención de Secretaría Online y Telefónica', 'Secretaría presta atención ininterrumpida de Lunes a Viernes de 08:30 a 20:30 h en Carrera Doctoral 26, Almería. Teléfono: +34 950 25 25 25 | WhatsApp: +34 950 04 04 04.', 'Secretaría Académica Péndulo', 'usr-admin-1', 'TODOS')
ON DUPLICATE KEY UPDATE `titulo`=`titulo`;
