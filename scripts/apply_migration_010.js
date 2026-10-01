/**
 * Script: apply_migration_010.js
 * Aplica la migración 010 a la base de datos de Hostinger para Academias Péndulo.
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const DB_CONFIG = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  charset: 'utf8mb4',
};

async function run(conn, sql, label) {
  try {
    await conn.execute(sql);
    console.log(`  ✅ ${label}`);
  } catch (err) {
    if (err.code === 'ER_TABLE_EXISTS_ERROR' || (err.message && err.message.includes('already exists'))) {
      console.log(`  ⚠️  Ya existe (OK): ${label}`);
    } else {
      console.error(`  ❌ ERROR en: ${label}`);
      console.error(`     → ${err.message}`);
    }
  }
}

async function applyMigration() {
  console.log('\n🚀 Aplicando migración 010 a Hostinger MySQL...\n');

  const conn = await mysql.createConnection(DB_CONFIG);
  console.log(`✅ Conectado a: ${process.env.DB_HOST} / ${process.env.DB_NAME}\n`);

  // ─── 1. ASISTENCIA ───────────────────────────────────────────────────────────
  await run(conn, `
    CREATE TABLE IF NOT EXISTS \`asistencia\` (
      \`id\` BIGINT AUTO_INCREMENT PRIMARY KEY,
      \`matricula_id\` VARCHAR(64) NOT NULL,
      \`alumno_id\` VARCHAR(64) NOT NULL,
      \`grupo_id\` VARCHAR(64) NOT NULL,
      \`fecha\` DATE NOT NULL,
      \`hora_inicio\` TIME DEFAULT NULL,
      \`hora_fin\` TIME DEFAULT NULL,
      \`estado\` ENUM('PRESENTE','AUSENTE','JUSTIFICADA','RETRASO') NOT NULL DEFAULT 'PRESENTE',
      \`justificacion\` TEXT DEFAULT NULL,
      \`registrado_por\` VARCHAR(64) DEFAULT NULL,
      \`creado_en\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`actualizado_en\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY \`uq_asistencia_alumno_fecha\` (\`alumno_id\`, \`grupo_id\`, \`fecha\`),
      INDEX \`idx_asist_matricula\` (\`matricula_id\`),
      INDEX \`idx_asist_grupo_fecha\` (\`grupo_id\`, \`fecha\`),
      INDEX \`idx_asist_alumno\` (\`alumno_id\`),
      CONSTRAINT \`fk_asist_matricula\` FOREIGN KEY (\`matricula_id\`) REFERENCES \`matriculas\`(\`id\`) ON DELETE CASCADE,
      CONSTRAINT \`fk_asist_alumno\` FOREIGN KEY (\`alumno_id\`) REFERENCES \`usuarios\`(\`id\`) ON DELETE CASCADE,
      CONSTRAINT \`fk_asist_grupo\` FOREIGN KEY (\`grupo_id\`) REFERENCES \`grupos\`(\`id\`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `, 'Tabla: asistencia');

  // ─── 2. SESIONES_CLASE ────────────────────────────────────────────────────────
  await run(conn, `
    CREATE TABLE IF NOT EXISTS \`sesiones_clase\` (
      \`id\` VARCHAR(64) NOT NULL PRIMARY KEY,
      \`grupo_id\` VARCHAR(64) NOT NULL,
      \`titulo\` VARCHAR(255) DEFAULT NULL,
      \`descripcion\` TEXT DEFAULT NULL,
      \`fecha\` DATE NOT NULL,
      \`hora_inicio\` TIME NOT NULL,
      \`hora_fin\` TIME NOT NULL,
      \`tipo\` ENUM('PRESENCIAL','TELEFORMACION','PRACTICA','EXAMEN') NOT NULL DEFAULT 'PRESENCIAL',
      \`aula\` VARCHAR(100) DEFAULT NULL,
      \`estado\` ENUM('PROGRAMADA','REALIZADA','CANCELADA') NOT NULL DEFAULT 'PROGRAMADA',
      \`creado_por\` VARCHAR(64) DEFAULT NULL,
      \`creado_en\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`actualizado_en\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX \`idx_sc_grupo_fecha\` (\`grupo_id\`, \`fecha\`),
      CONSTRAINT \`fk_sc_grupo\` FOREIGN KEY (\`grupo_id\`) REFERENCES \`grupos\`(\`id\`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `, 'Tabla: sesiones_clase');

  // ─── 3. EXAMENES ─────────────────────────────────────────────────────────────
  await run(conn, `
    CREATE TABLE IF NOT EXISTS \`examenes\` (
      \`id\` VARCHAR(64) NOT NULL PRIMARY KEY,
      \`grupo_id\` VARCHAR(64) NOT NULL,
      \`especialidad_id\` VARCHAR(32) NOT NULL,
      \`titulo\` VARCHAR(255) NOT NULL,
      \`descripcion\` TEXT DEFAULT NULL,
      \`tipo\` ENUM('TEST','TEORICO','PRACTICO','FINAL') NOT NULL DEFAULT 'TEST',
      \`nota_minima_aprobado\` DECIMAL(5,2) NOT NULL DEFAULT 5.00,
      \`puntuacion_maxima\` DECIMAL(8,2) NOT NULL DEFAULT 10.00,
      \`duracion_minutos\` INT DEFAULT NULL,
      \`intentos_permitidos\` INT NOT NULL DEFAULT 1,
      \`mezclar_preguntas\` TINYINT(1) NOT NULL DEFAULT 1,
      \`mostrar_resultado_inmediato\` TINYINT(1) NOT NULL DEFAULT 1,
      \`fecha_apertura\` DATETIME DEFAULT NULL,
      \`fecha_cierre\` DATETIME DEFAULT NULL,
      \`estado\` ENUM('BORRADOR','PUBLICADO','CERRADO','ARCHIVADO') NOT NULL DEFAULT 'BORRADOR',
      \`creado_por\` VARCHAR(64) NOT NULL,
      \`creado_en\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`actualizado_en\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX \`idx_exam_grupo\` (\`grupo_id\`),
      INDEX \`idx_exam_estado\` (\`estado\`),
      CONSTRAINT \`fk_exam_grupo\` FOREIGN KEY (\`grupo_id\`) REFERENCES \`grupos\`(\`id\`) ON DELETE CASCADE,
      CONSTRAINT \`fk_exam_especialidad\` FOREIGN KEY (\`especialidad_id\`) REFERENCES \`especialidades\`(\`id\`),
      CONSTRAINT \`fk_exam_creado_por\` FOREIGN KEY (\`creado_por\`) REFERENCES \`usuarios\`(\`id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `, 'Tabla: examenes');

  // ─── 4. PREGUNTAS_EXAMEN ──────────────────────────────────────────────────────
  await run(conn, `
    CREATE TABLE IF NOT EXISTS \`preguntas_examen\` (
      \`id\` VARCHAR(64) NOT NULL PRIMARY KEY,
      \`examen_id\` VARCHAR(64) NOT NULL,
      \`enunciado\` TEXT NOT NULL,
      \`tipo\` ENUM('OPCION_MULTIPLE','VERDADERO_FALSO','TEXTO_LIBRE') NOT NULL DEFAULT 'OPCION_MULTIPLE',
      \`opciones\` JSON DEFAULT NULL,
      \`respuesta_correcta\` TEXT DEFAULT NULL,
      \`puntuacion\` DECIMAL(5,2) NOT NULL DEFAULT 1.00,
      \`orden\` INT NOT NULL DEFAULT 0,
      \`imagen_url\` VARCHAR(500) DEFAULT NULL,
      \`explicacion\` TEXT DEFAULT NULL,
      \`creado_en\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX \`idx_pq_examen\` (\`examen_id\`),
      CONSTRAINT \`fk_pq_examen\` FOREIGN KEY (\`examen_id\`) REFERENCES \`examenes\`(\`id\`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `, 'Tabla: preguntas_examen');

  // ─── 5. RESULTADOS_EXAMENES ───────────────────────────────────────────────────
  await run(conn, `
    CREATE TABLE IF NOT EXISTS \`resultados_examenes\` (
      \`id\` VARCHAR(64) NOT NULL PRIMARY KEY,
      \`examen_id\` VARCHAR(64) NOT NULL,
      \`alumno_id\` VARCHAR(64) NOT NULL,
      \`matricula_id\` VARCHAR(64) NOT NULL,
      \`intento\` INT NOT NULL DEFAULT 1,
      \`nota\` DECIMAL(5,2) DEFAULT NULL,
      \`puntos_obtenidos\` DECIMAL(8,2) DEFAULT NULL,
      \`puntos_maximos\` DECIMAL(8,2) DEFAULT NULL,
      \`aprobado\` TINYINT(1) NOT NULL DEFAULT 0,
      \`respuestas\` JSON DEFAULT NULL,
      \`tiempo_empleado_segundos\` INT DEFAULT NULL,
      \`iniciado_en\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`finalizado_en\` DATETIME DEFAULT NULL,
      \`estado\` ENUM('EN_PROGRESO','COMPLETADO','ABANDONADO') NOT NULL DEFAULT 'EN_PROGRESO',
      \`revisado_por\` VARCHAR(64) DEFAULT NULL,
      \`comentario_profesor\` TEXT DEFAULT NULL,
      UNIQUE KEY \`uq_resultado_alumno_examen_intento\` (\`alumno_id\`, \`examen_id\`, \`intento\`),
      INDEX \`idx_res_examen\` (\`examen_id\`),
      INDEX \`idx_res_alumno\` (\`alumno_id\`),
      INDEX \`idx_res_matricula\` (\`matricula_id\`),
      CONSTRAINT \`fk_res_examen\` FOREIGN KEY (\`examen_id\`) REFERENCES \`examenes\`(\`id\`) ON DELETE CASCADE,
      CONSTRAINT \`fk_res_alumno\` FOREIGN KEY (\`alumno_id\`) REFERENCES \`usuarios\`(\`id\`) ON DELETE CASCADE,
      CONSTRAINT \`fk_res_matricula\` FOREIGN KEY (\`matricula_id\`) REFERENCES \`matriculas\`(\`id\`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `, 'Tabla: resultados_examenes');

  // ─── 6. CERTIFICADOS_EMITIDOS ─────────────────────────────────────────────────
  await run(conn, `
    CREATE TABLE IF NOT EXISTS \`certificados_emitidos\` (
      \`id\` VARCHAR(64) NOT NULL PRIMARY KEY,
      \`numero_certificado\` VARCHAR(50) NOT NULL UNIQUE,
      \`alumno_id\` VARCHAR(64) NOT NULL,
      \`matricula_id\` VARCHAR(64) NOT NULL,
      \`especialidad_id\` VARCHAR(32) NOT NULL,
      \`grupo_id\` VARCHAR(64) NOT NULL,
      \`tipo\` ENUM('ASISTENCIA','APROVECHAMIENTO','PARTICIPACION','CAPACITACION') NOT NULL DEFAULT 'APROVECHAMIENTO',
      \`nota_final\` DECIMAL(5,2) DEFAULT NULL,
      \`horas_cursadas\` INT DEFAULT NULL,
      \`porcentaje_asistencia\` DECIMAL(5,2) DEFAULT NULL,
      \`fecha_inicio_curso\` DATE DEFAULT NULL,
      \`fecha_fin_curso\` DATE DEFAULT NULL,
      \`fecha_emision\` DATE NOT NULL,
      \`pdf_path\` VARCHAR(500) DEFAULT NULL,
      \`expedido_por\` VARCHAR(64) DEFAULT NULL,
      \`validado_por\` VARCHAR(64) DEFAULT NULL,
      \`estado\` ENUM('EMITIDO','ANULADO','REEMPLAZADO') NOT NULL DEFAULT 'EMITIDO',
      \`creado_en\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`actualizado_en\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX \`idx_cert_alumno\` (\`alumno_id\`),
      INDEX \`idx_cert_matricula\` (\`matricula_id\`),
      INDEX \`idx_cert_estado\` (\`estado\`),
      CONSTRAINT \`fk_cert_alumno\` FOREIGN KEY (\`alumno_id\`) REFERENCES \`usuarios\`(\`id\`),
      CONSTRAINT \`fk_cert_matricula\` FOREIGN KEY (\`matricula_id\`) REFERENCES \`matriculas\`(\`id\`),
      CONSTRAINT \`fk_cert_especialidad\` FOREIGN KEY (\`especialidad_id\`) REFERENCES \`especialidades\`(\`id\`),
      CONSTRAINT \`fk_cert_grupo\` FOREIGN KEY (\`grupo_id\`) REFERENCES \`grupos\`(\`id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `, 'Tabla: certificados_emitidos');

  // ─── 7. EVALUACIONES_FORMADOR ─────────────────────────────────────────────────
  await run(conn, `
    CREATE TABLE IF NOT EXISTS \`evaluaciones_formador\` (
      \`id\` VARCHAR(64) NOT NULL PRIMARY KEY,
      \`grupo_id\` VARCHAR(64) NOT NULL,
      \`alumno_id\` VARCHAR(64) NOT NULL,
      \`matricula_id\` VARCHAR(64) NOT NULL,
      \`puntuacion_metodologia\` INT DEFAULT NULL,
      \`puntuacion_conocimientos\` INT DEFAULT NULL,
      \`puntuacion_materiales\` INT DEFAULT NULL,
      \`puntuacion_organizacion\` INT DEFAULT NULL,
      \`puntuacion_global\` INT DEFAULT NULL,
      \`comentarios_abiertos\` TEXT DEFAULT NULL,
      \`recomendaria\` TINYINT(1) DEFAULT NULL,
      \`completada_en\` DATETIME DEFAULT NULL,
      \`creado_en\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY \`uq_eval_alumno_grupo\` (\`alumno_id\`, \`grupo_id\`),
      INDEX \`idx_ef_grupo\` (\`grupo_id\`),
      CONSTRAINT \`fk_ef_grupo\` FOREIGN KEY (\`grupo_id\`) REFERENCES \`grupos\`(\`id\`) ON DELETE CASCADE,
      CONSTRAINT \`fk_ef_alumno\` FOREIGN KEY (\`alumno_id\`) REFERENCES \`usuarios\`(\`id\`) ON DELETE CASCADE,
      CONSTRAINT \`fk_ef_matricula\` FOREIGN KEY (\`matricula_id\`) REFERENCES \`matriculas\`(\`id\`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `, 'Tabla: evaluaciones_formador');

  // ─── 8. VISTAS ────────────────────────────────────────────────────────────────
  await run(conn, `
    CREATE OR REPLACE VIEW \`v_resumen_asistencia\` AS
    SELECT
      a.matricula_id, a.alumno_id, a.grupo_id,
      COUNT(*) AS total_sesiones,
      SUM(CASE WHEN a.estado IN ('PRESENTE','RETRASO') THEN 1 ELSE 0 END) AS sesiones_asistidas,
      SUM(CASE WHEN a.estado = 'AUSENTE' THEN 1 ELSE 0 END) AS sesiones_ausente,
      SUM(CASE WHEN a.estado = 'JUSTIFICADA' THEN 1 ELSE 0 END) AS sesiones_justificadas,
      ROUND(SUM(CASE WHEN a.estado IN ('PRESENTE','RETRASO') THEN 1 ELSE 0 END) / COUNT(*) * 100, 2) AS porcentaje_asistencia
    FROM asistencia a
    GROUP BY a.matricula_id, a.alumno_id, a.grupo_id
  `, 'Vista: v_resumen_asistencia');

  await run(conn, `
    CREATE OR REPLACE VIEW \`v_mejor_resultado_examen\` AS
    SELECT
      alumno_id, examen_id,
      MAX(nota) AS mejor_nota,
      MAX(aprobado) AS aprobado,
      COUNT(*) AS num_intentos,
      MIN(iniciado_en) AS primer_intento,
      MAX(finalizado_en) AS ultimo_intento
    FROM resultados_examenes
    WHERE estado = 'COMPLETADO'
    GROUP BY alumno_id, examen_id
  `, 'Vista: v_mejor_resultado_examen');

  // ─── VERIFICACIÓN FINAL ───────────────────────────────────────────────────────
  console.log('\n📋 Verificación final de tablas en Hostinger:');
  const tables = ['asistencia', 'sesiones_clase', 'examenes', 'preguntas_examen', 'resultados_examenes', 'certificados_emitidos', 'evaluaciones_formador'];
  for (const table of tables) {
    const [rows] = await conn.query(
      `SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema = ? AND table_name = ?`,
      [process.env.DB_NAME, table]
    );
    const exists = rows[0].cnt > 0;
    console.log(`  ${exists ? '✅' : '❌'} ${table} → ${exists ? 'CREADA' : 'NO ENCONTRADA'}`);
  }

  console.log('\n📊 Verificando vistas:');
  const views = ['v_resumen_asistencia', 'v_mejor_resultado_examen'];
  for (const view of views) {
    const [rows] = await conn.query(
      `SELECT COUNT(*) as cnt FROM information_schema.views WHERE table_schema = ? AND table_name = ?`,
      [process.env.DB_NAME, view]
    );
    const exists = rows[0].cnt > 0;
    console.log(`  ${exists ? '✅' : '❌'} ${view} → ${exists ? 'CREADA' : 'NO ENCONTRADA'}`);
  }

  await conn.end();
  console.log('\n🎉 Migración 010 completada en Hostinger MySQL.\n');
}

applyMigration().catch(err => {
  console.error('Error fatal:', err.message);
  process.exit(1);
});
