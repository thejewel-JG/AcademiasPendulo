-- Migration: 002_academic_and_enrollment.sql
-- Description: Specialties, groups, enrollments, and atomic single active enrollment constraint table.

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

-- TABLA DE MATRÍCULA VIGENTE (Garantiza a nivel de motor SQL exactamente 1 matrícula activa por alumno)
CREATE TABLE IF NOT EXISTS `alumno_matricula_activa` (
  `alumno_id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `matricula_id` VARCHAR(64) NOT NULL UNIQUE,
  `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_ama_alumno` FOREIGN KEY (`alumno_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ama_matricula` FOREIGN KEY (`matricula_id`) REFERENCES `matriculas`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- INSERT DE LAS 33 ESPECIALIDADES OFICIALES DE ACADEMIAS PÉNDULO
INSERT INTO `especialidades` (`id`, `codigo`, `nombre`, `categoria_id`, `descripcion`, `nivel`, `horas_totales`, `horas_practicas`, `modalidad`, `estado`) VALUES
('fcos02', 'FCOS02', 'BÁSICO DE PREVENCIÓN DE RIESGOS LABORALES', 'fco', 'Curso básico oficial de PRL obligatorio según la Ley de Prevención de Riesgos Laborales para talleres y empresas.', 'Especialidad Autorizada (09/06/2026)', 50, 10, 'Presencial / Teleformación', 'ACTIVO'),
('tmvg0002', 'TMVG0002', 'INTRODUCCIÓN A LA AUTOMOCIÓN', 'tmv', 'Visión general de la tecnología del automóvil, herramientas fundamentales de taller y principios físicos de funcionamiento.', 'Especialidad Autorizada (09/06/2026)', 40, 10, 'Presencial', 'ACTIVO'),
('tmvg0004', 'TMVG0004', 'MANTENIMIENTO DE VEHÍCULOS HÍBRIDOS', 'tmv', 'Mantenimiento de motores térmicos combinados con motores eléctricos, inversores y baterías de alto voltaje.', 'Especialidad Autorizada (09/06/2026)', 60, 20, 'Presencial', 'ACTIVO'),
('tmvg0008', 'TMVG0008', 'DIAGNOSIS DE AVERÍAS MEDIANTE OSCILOSCOPIO Y MÁQUINA DE DIAGNOSIS. NIVEL AVANZADO', 'tmv', 'Captura e interpretación de señales de sensores y actuadores con osciloscopio PicoScope y máquinas de diagnosis profesionales.', 'Especialidad Autorizada (09/06/2026)', 60, 25, 'Presencial', 'ACTIVO'),
('tmvg0021', 'TMVG0021', 'PREPARACIÓN BÁSICA PARA ACTIVIDADES DE MANTENIMIENTO Y ELECTROMECÁNICA DE VEHÍCULOS AUTOMÓVILES', 'tmv', 'Adquisición de destrezas manuales, uso de herramientas dinamométricas, metrología y organización del puesto de trabajo en taller.', 'Especialidad Autorizada (09/06/2026)', 50, 15, 'Presencial', 'ACTIVO'),
('tmvg0022', 'TMVG0022', 'MECÁNICA DE AUTOMOCIÓN', 'tmv', 'Desmontaje, verificación de cotas y reparación de componentes mecánicos del motor y transmisión.', 'Especialidad Autorizada (09/06/2026)', 150, 40, 'Presencial', 'ACTIVO'),
('tmvg004po', 'TMVG004PO', 'DIAGNOSIS DE VEHÍCULOS', 'tmv', 'Interpretación de códigos de avería OBD-II, parámetros en tiempo real y protocolos de comunicación del automóvil.', 'Especialidad Autorizada (09/06/2026)', 80, 25, 'Presencial', 'ACTIVO'),
('tmvg0063', 'TMVG0063', 'MECÁNICA RÁPIDA, MANTENIMIENTO Y REPARACIÓN BÁSICA DE AUTOMÓVILES: TALLER MULTISERVICIO', 'tmv', 'Formación integral para centros del automóvil multimarca: aceites, filtros, pastillas de freno, amortiguadores y tubos de escape.', 'Especialidad Autorizada (09/06/2026)', 120, 40, 'Presencial', 'ACTIVO'),
('tmvg0064', 'TMVG0064', 'MECÁNICA DE MOTOCICLETAS: NIVEL AVANZADO', 'tmv', 'Diagnosis electrónica de inyección en motos de alta cilindrada, embragues antirrebote, suspensiones invertidas y ABS de inclinación.', 'Especialidad Autorizada (09/06/2026)', 100, 30, 'Presencial', 'ACTIVO'),
('tmvg0065', 'TMVG0065', 'MANTENIMIENTO BÁSICO DEL AUTOMÓVIL', 'tmv', 'Revisiones periódicas de niveles, escobillas, batería, alumbrado y comprobaciones de puntos clave pre-viaje.', 'Especialidad Autorizada (09/06/2026)', 40, 15, 'Presencial', 'ACTIVO'),
('tmvg0066', 'TMVG0066', 'ELEMENTOS TÉCNICOS BÁSICOS DEL AUTOMÓVIL', 'tmv', 'Estudio de conjuntos mecánicos: bloque, pistones, bielas, distribución y lubricación.', 'Especialidad Autorizada (09/06/2026)', 45, 15, 'Presencial', 'ACTIVO'),
('tmvg0067', 'TMVG0067', 'MECÁNICA DE MOTOCICLETAS: NIVEL INICIAL', 'tmv', 'Mantenimiento periódico, carburación, kit de arrastre, frenos y neumáticos de ciclomotores y scooters.', 'Especialidad Autorizada (09/06/2026)', 60, 20, 'Presencial', 'ACTIVO'),
('tmvg0068', 'TMVG0068', 'PUESTA A PUNTO DEL VEHÍCULO PARA SUPERAR LA ITV', 'tmv', 'Inspección de gases, frenometría, reglaje de faros, holguras de dirección y elementos de seguridad activa y pasiva.', 'Especialidad Autorizada (09/06/2026)', 50, 20, 'Presencial', 'ACTIVO'),
('tmvg0069', 'TMVG0069', 'MANTENIMIENTO BÁSICO DE NEUMÁTICOS EN TURISMOS Y MOTOCICLETAS', 'tmv', 'Desmontaje, montaje, equilibrado dinámico, reparación de pinchazos con mecha/seta y alineado básico.', 'Especialidad Autorizada (09/06/2026)', 40, 20, 'Presencial', 'ACTIVO'),
('tmvg007po', 'TMVG007PO', 'INYECCIÓN ELECTRÓNICA', 'tmv', 'Sistemas de inyección directa de gasolina (GDI/TSI) y diésel Common Rail, caudalímetros, sondas lambda y electrovalvulas.', 'Especialidad Autorizada (09/06/2026)', 75, 25, 'Presencial', 'ACTIVO'),
('tmvg0070', 'TMVG0070', 'PREPARACIÓN BÁSICA DE MOTORES DE DOS TIEMPOS', 'tmv', 'Mantenimiento, ajuste de lumbreras, mezcla, carburación y encendido de motores de 2T en ciclomotores y maquinaria agrícola/jardinería.', 'Especialidad Autorizada (09/06/2026)', 40, 15, 'Presencial', 'ACTIVO'),
('tmvg0071', 'TMVG0071', 'CORREAS DE DISTRIBUCIÓN', 'tmv', 'Sustitución de kits de distribución con bomba de agua, calado de distribución con útiles específicos de marca y tensores automáticos.', 'Especialidad Autorizada (09/06/2026)', 45, 20, 'Presencial', 'ACTIVO'),
('tmvg0072', 'TMVG0072', 'INTEGRACIÓN Y MANTENIMIENTO DE SISTEMAS AVANZADOS ASISTENCIA A CONDUCCIÓN (ADAS) EN VEHÍCULOS IND.', 'tmv', 'Sistemas ADAS específicos para camiones, autobuses y maquinaria agrícola de la provincia de Almería.', 'Especialidad Autorizada (09/06/2026)', 60, 20, 'Presencial', 'ACTIVO'),
('tmvg0109', 'TMVG0109', 'OPERACIONES AUXILIARES DE MANTENIMIENTO EN ELECTROMECÁNICA DE VEHÍCULOS', 'tmv', 'Puerta de entrada oficial al sector de automoción sin necesidad de titulación previa. Mantenimiento, frenos y neumáticos.', 'Nivel 1 (Certificado Oficial - 01/06/2026)', 310, 40, 'Presencial', 'ACTIVO'),
('tmvg0110', 'TMVG0110', 'PLANIFICACIÓN Y CONTROL DEL ÁREA DE ELECTROMECÁNICA', 'tmv', 'Gestión de taller, recepción de vehículos, valoración de averías, presupuestos y control de tiempos de reparación.', 'Nivel 3 (Certificado Oficial - 01/06/2026)', 420, 80, 'Presencial', 'ACTIVO'),
('tmvg012po', 'TMVG012PO', 'MECÁNICA RÁPIDA Y REPARACIÓN DE AUTOMÓVILES', 'tmv', 'Diagnosis rápida visual y computarizada de los puntos de seguridad del automóvil.', 'Especialidad Autorizada (09/06/2026)', 90, 30, 'Presencial', 'ACTIVO'),
('tmvg0209', 'TMVG0209', 'MANTENIMIENTO DE LOS SISTEMAS ELÉCTRICOS Y ELECTRÓNICOS DE VEHÍCULOS', 'tmv', 'Certificado de profesionalidad oficial regulado en BOE. Diagnosis electrónica multimarca, CAN-Bus, alumbrado y sistemas auxiliares.', 'Nivel 2 (Certificado Oficial - 01/06/2026)', 520, 80, 'Presencial', 'ACTIVO'),
('tmvg03', 'TMVG03', 'MANTENIMIENTO BÁSICO DE VEHÍCULOS HÍBRIDOS Y ELÉCTRICOS', 'tmv', 'Seguridad, consignación y mantenimiento preventivo inicial de flotas electrificadas.', 'Especialidad Autorizada (09/06/2026)', 50, 15, 'Presencial', 'ACTIVO'),
('tmvg0309', 'TMVG0309', 'MANTENIMIENTO DE SISTEMAS DE TRANSMISIÓN DE FUERZA Y TRENES DE RODAJE DE VEHÍCULOS AUTOMÓVILES', 'tmv', 'Cajas de cambio manuales y automáticas, embragues, transmisiones, suspensión, dirección y alineado 3D.', 'Nivel 2 (Certificado Oficial - 01/06/2026)', 480, 80, 'Presencial', 'ACTIVO'),
('tmvg04', 'TMVG04', 'DIAGNOSIS Y COMPROBACIÓN DE SISTEMAS ANTICONTAMINANTES DEL AUTOMÓVIL CON MOTOR DE GASOLINA', 'tmv', 'Catalizadores de 3 vías, sondas lambda de banda ancha/estrecha, canister y lectura de parámetros de mezcla estequiométrica.', 'Especialidad Autorizada (09/06/2026)', 50, 15, 'Presencial', 'ACTIVO'),
('tmvg0409', 'TMVG0409', 'MANTENIMIENTO DEL MOTOR Y SUS SISTEMAS AUXILIARES', 'tmv', 'Mantenimiento, ajuste y reparación completa del bloque motor, sistemas de inyección, turbocompresores y distribución.', 'Nivel 2 (Certificado Oficial - 01/06/2026)', 520, 80, 'Presencial', 'ACTIVO'),
('tmvg05', 'TMVG05', 'COMPROBACIÓN Y DIAGNOSIS DEL VEHÍCULO ELÉCTRICO', 'tmv', 'Comprobación con osciloscopio y escáner de alta tensión en inversores, convertidores DC/DC y BMS.', 'Especialidad Autorizada (09/06/2026)', 70, 25, 'Presencial', 'ACTIVO'),
('tmvg06', 'TMVG06', 'ESTRUCTURA Y FUNCIONAMIENTO DEL VEHÍCULO ELÉCTRICO', 'tmv', 'Arquitectura interna de un BEV: motor síncrono de imanes permanentes, batería de litio, toma de carga Mennekes/CCS Combo.', 'Especialidad Autorizada (09/06/2026)', 40, 10, 'Presencial', 'ACTIVO'),
('tmvg07', 'TMVG07', 'ELECTRIFICACIÓN DE VEHÍCULOS HÍBRIDOS Y ELÉCTRICOS', 'tmv', 'Estudio de retrofit, conversión y adaptación de sistemas eléctricos de potencia.', 'Especialidad Autorizada (09/06/2026)', 80, 30, 'Presencial', 'ACTIVO'),
('tmvg08', 'TMVG08', 'SISTEMAS AVANZADOS DE ASISTENCIA A LA CONDUCCIÓN (ADAS)', 'tmv', 'Calibración estática y dinámica de cámaras de parabrisas, radares de frenada de emergencia, sensor de ángulo muerto y mantenimiento de carril.', 'Especialidad Autorizada (09/06/2026)', 50, 20, 'Presencial', 'ACTIVO'),
('tmvg12', 'TMVG12', 'MANTENIMIENTO DE BICICLETAS Y VEHÍCULOS DE MOVILIDAD URBANA O PERSONAL', 'tmv', 'Reparación de bicicletas eléctricas (e-bikes), patinetes eléctricos VMP, frenos hidráulicos y cambios electrónicos.', 'Especialidad Autorizada (09/06/2026)', 80, 25, 'Presencial', 'ACTIVO'),
('tmvg13', 'TMVG13', 'DIAGNOSIS DE AVERÍAS GRUPO MOTOR', 'tmv', 'Diagnosis avanzada de ruidos internos, falta de compresión, fallos de encendido y presión de aceite en bloque motor.', 'Especialidad Autorizada (09/06/2026)', 65, 20, 'Presencial', 'ACTIVO'),
('tmvg14', 'TMVG14', 'ELECTROMECÁNICA DE VEHÍCULOS', 'tmv', 'Mantenimiento integral de los sistemas eléctricos, electrónicos y mecánicos del automóvil.', 'Especialidad Autorizada (09/06/2026)', 200, 50, 'Presencial', 'ACTIVO')
ON DUPLICATE KEY UPDATE `nombre`=`nombre`;
