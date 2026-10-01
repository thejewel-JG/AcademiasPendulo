import pool from './db.js';
import crypto from 'crypto';

const db = pool;

/**
 * Merge overlapping and contiguous intervals [inicio_seg, fin_seg]
 * and calculate total unique seconds watched.
 */
export function mergeIntervals(rawIntervals) {
  if (!Array.isArray(rawIntervals) || rawIntervals.length === 0) {
    return { merged: [], totalUniqueSeconds: 0 };
  }

  // 1. Filter out invalid intervals (fin <= inicio or negative)
  const valid = rawIntervals
    .map(i => ({
      inicio: Math.max(0, parseInt(i.inicio_seg ?? i.inicio, 10) || 0),
      fin: Math.max(0, parseInt(i.fin_seg ?? i.fin, 10) || 0)
    }))
    .filter(i => i.fin > i.inicio);

  if (valid.length === 0) {
    return { merged: [], totalUniqueSeconds: 0 };
  }

  // 2. Sort by start time ascending
  valid.sort((a, b) => a.inicio - b.inicio);

  // 3. Merge overlapping or adjacent intervals
  const merged = [valid[0]];

  for (let i = 1; i < valid.length; i++) {
    const prev = merged[merged.length - 1];
    const current = valid[i];

    if (current.inicio <= prev.fin) {
      // Overlap or contiguous -> extend prev.fin if current extends further
      prev.fin = Math.max(prev.fin, current.fin);
    } else {
      merged.push(current);
    }
  }

  // 4. Sum up total unique seconds
  const totalUniqueSeconds = merged.reduce((sum, item) => sum + (item.fin - item.inicio), 0);

  return { merged, totalUniqueSeconds };
}

/**
 * Validate a progress tick for temporal plausibility
 */
export function validateProgressTick({ posicionSegundos, duracionSegundos, intervaloNuevo, playbackRate = 1.0, elapsedMs = 10000 }) {
  const pos = Math.max(0, parseInt(posicionSegundos, 10) || 0);
  const dur = Math.max(0, parseInt(duracionSegundos, 10) || 0);
  const rate = Math.min(3.0, Math.max(0.25, parseFloat(playbackRate) || 1.0));

  if (dur > 0 && pos > dur + 5) {
    return { valid: false, reason: 'Posición excede la duración del material' };
  }

  if (intervaloNuevo) {
    const inicio = Math.max(0, parseInt(intervaloNuevo.inicio_seg ?? intervaloNuevo.inicio, 10) || 0);
    const fin = Math.max(0, parseInt(intervaloNuevo.fin_seg ?? intervaloNuevo.fin, 10) || 0);

    if (fin <= inicio) {
      return { valid: false, reason: 'El intervalo de fin debe ser mayor al inicio' };
    }

    if (dur > 0 && fin > dur + 5) {
      return { valid: false, reason: 'El fin del intervalo excede la duración del material' };
    }

    // Check maximum plausible interval length based on wall-clock elapsed time and playback rate
    // Add 25s buffer for network jitter, seeks, or initial buffering
    const maxPlausibleSeconds = Math.ceil((elapsedMs / 1000) * rate) + 25;
    const intervalLen = fin - inicio;

    if (intervalLen > maxPlausibleSeconds) {
      return { valid: false, reason: `Intervalo de ${intervalLen}s no es plausible para ${elapsedMs}ms a ${rate}x` };
    }
  }

  return { valid: true, sanitizedPos: pos, sanitizedDur: dur, sanitizedRate: rate };
}

/**
 * Start or resume a playback session for a student and material
 */
export async function startPlaybackSession(alumnoId, materialId) {
  const connection = await db.getConnection();

  try {
    // 1. Resolve student's active enrollment
    const [enrollments] = await connection.query(
      `SELECT ama.matricula_id, mat.grupo_id, g.especialidad_id 
       FROM alumno_matricula_activa ama
       JOIN matriculas mat ON ama.matricula_id = mat.id
       JOIN grupos g ON mat.grupo_id = g.id
       WHERE ama.alumno_id = ? LIMIT 1`,
      [alumnoId]
    );

    if (enrollments.length === 0) {
      throw new Error('El alumno no tiene una matrícula activa autorizada.');
    }

    const { matricula_id, grupo_id, especialidad_id } = enrollments[0];

    // 2. Fetch material details & version
    const [materials] = await connection.query(
      `SELECT * FROM materiales WHERE id = ? AND estado = 'PUBLICADO' LIMIT 1`,
      [materialId]
    );

    if (materials.length === 0) {
      throw new Error('Material no encontrado o no publicado.');
    }

    const mat = materials[0];

    // Verify material applies to student's group or specialty
    if (mat.grupo_id && mat.grupo_id !== grupo_id) {
      throw new Error('El material no pertenece al grupo de tu matrícula activa.');
    }
    if (!mat.grupo_id && mat.especialidad_id !== especialidad_id) {
      throw new Error('El material no pertenece a la especialidad de tu matrícula activa.');
    }

    // 3. Fetch stored progress or initialize
    const [progressRows] = await connection.query(
      `SELECT * FROM progreso_materiales 
       WHERE alumno_id = ? AND matricula_id = ? AND material_id = ? AND version = ?`,
      [alumnoId, matricula_id, materialId, mat.version]
    );

    const sessionId = `ses_${crypto.randomUUID()}`;

    if (progressRows.length === 0) {
      await connection.query(
        `INSERT INTO progreso_materiales 
         (alumno_id, matricula_id, material_id, version, estado, posicion_segundos, duracion_segundos, tiempo_unico_segundos, secuencia, sesion_reproduccion_id, marcado_manual, umbral_completado_pct, ultimo_acceso)
         VALUES (?, ?, ?, ?, 'NO_INICIADO', 0, 0, 0, 0, ?, 0, 90, NOW())`,
        [alumnoId, matricula_id, materialId, mat.version, sessionId]
      );
    } else {
      await connection.query(
        `UPDATE progreso_materiales 
         SET sesion_reproduccion_id = ?, secuencia = 0, ultimo_acceso = NOW()
         WHERE alumno_id = ? AND matricula_id = ? AND material_id = ? AND version = ?`,
        [sessionId, alumnoId, matricula_id, materialId, mat.version]
      );
    }

    // 4. Audit activity log
    await connection.query(
      `INSERT INTO actividad (actor_id, accion, tipo_actividad, recurso_tipo, recurso_id, matricula_id, metadatos, creado_en)
       VALUES (?, 'ABRIR_MATERIAL', 'ACADEMICA', 'MATERIAL', ?, ?, ?, NOW())`,
      [alumnoId, materialId, matricula_id, JSON.stringify({ tipo: mat.tipo, version: mat.version, sessionId })]
    );

    const stored = progressRows.length > 0 ? progressRows[0] : null;
    const posSeg = stored ? stored.posicion_segundos : 0;
    const durSeg = stored ? stored.duracion_segundos : 0;
    const uniqueSeg = stored ? stored.tiempo_unico_segundos : 0;
    const estado = stored ? stored.estado : 'NO_INICIADO';
    const marcadoManual = stored ? stored.marcado_manual : 0;
    const umbralPct = stored ? stored.umbral_completado_pct : 90;

    return {
      sesion_reproduccion_id: sessionId,
      posicion_segundos: posSeg,
      duracion_segundos: durSeg,
      tiempo_unico_segundos: uniqueSeg,
      estado,
      marcado_manual: marcadoManual,
      umbral_completado_pct: umbralPct,
      version: mat.version,
      tipo: mat.tipo,
      referencia_video: mat.referencia_video,
      proveedor: mat.proveedor,
      prompt_resume: posSeg > 10 && estado !== 'COMPLETADO'
    };

  } finally {
    connection.release();
  }
}

/**
 * Record progress tick and merge watched video intervals
 */
export async function recordProgressTick({ alumnoId, materialId, sesionReproduccionId, secuencia, posicionSegundos, duracionSegundos, intervaloNuevo, playbackRate = 1.0, elapsedMs = 10000 }) {
  const connection = await db.getConnection();

  try {
    // 1. Resolve student active enrollment
    const [enrollments] = await connection.query(
      `SELECT ama.matricula_id 
       FROM alumno_matricula_activa ama
       WHERE ama.alumno_id = ? LIMIT 1`,
      [alumnoId]
    );

    if (enrollments.length === 0) {
      throw new Error('Sin matrícula activa autorizada.');
    }
    const { matricula_id } = enrollments[0];

    // 2. Fetch material & version
    const [materials] = await connection.query(
      `SELECT version, estado FROM materiales WHERE id = ? LIMIT 1`,
      [materialId]
    );

    if (materials.length === 0) {
      throw new Error('Material no encontrado.');
    }
    const version = materials[0].version;

    // 3. Fetch current stored progress
    const [progressRows] = await connection.query(
      `SELECT * FROM progreso_materiales 
       WHERE alumno_id = ? AND matricula_id = ? AND material_id = ? AND version = ?`,
      [alumnoId, matricula_id, materialId, version]
    );

    if (progressRows.length === 0) {
      throw new Error('Sesión de reproducción no iniciada previamente.');
    }

    const stored = progressRows[0];

    // 4. Sequence & Session Monotonicity Control:
    // Reject out-of-order requests if same session and sequence is less than or equal to stored sequence
    if (stored.sesion_reproduccion_id === sesionReproduccionId && secuencia <= stored.secuencia) {
      return {
        status: 'IGNORED_OUT_OF_ORDER',
        posicion_segundos: stored.posicion_segundos,
        tiempo_unico_segundos: stored.tiempo_unico_segundos,
        estado: stored.estado
      };
    }

    // 5. Plausibility validation
    const validation = validateProgressTick({
      posicionSegundos,
      duracionSegundos,
      intervaloNuevo,
      playbackRate,
      elapsedMs
    });

    if (!validation.valid) {
      console.warn(`[PROGRESS WARN] Plausibility rejection for user ${alumnoId}: ${validation.reason}`);
      return {
        status: 'REJECTED_UNPLAUSIBLE',
        reason: validation.reason,
        posicion_segundos: stored.posicion_segundos,
        tiempo_unico_segundos: stored.tiempo_unico_segundos,
        estado: stored.estado
      };
    }

    const { sanitizedPos, sanitizedDur } = validation;

    // 6. Insert new interval if provided and plausible
    if (intervaloNuevo && (intervaloNuevo.fin_seg ?? intervaloNuevo.fin) > (intervaloNuevo.inicio_seg ?? intervaloNuevo.inicio)) {
      const inicio = Math.max(0, parseInt(intervaloNuevo.inicio_seg ?? intervaloNuevo.inicio, 10) || 0);
      const fin = Math.max(0, parseInt(intervaloNuevo.fin_seg ?? intervaloNuevo.fin, 10) || 0);

      await connection.query(
        `INSERT INTO intervalos_video (alumno_id, matricula_id, material_id, version, inicio_seg, fin_seg, creado_en)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [alumnoId, matricula_id, materialId, version, inicio, fin]
      );
    }

    // 7. Calculate merged unique watched seconds across all intervals for this material version
    const [allIntervals] = await connection.query(
      `SELECT inicio_seg, fin_seg FROM intervalos_video 
       WHERE alumno_id = ? AND matricula_id = ? AND material_id = ? AND version = ?`,
      [alumnoId, matricula_id, materialId, version]
    );

    const { totalUniqueSeconds } = mergeIntervals(allIntervals);

    // 8. Determine completion status
    const effectiveDuration = Math.max(sanitizedDur, stored.duracion_segundos, 1);
    const watchedPct = (totalUniqueSeconds / effectiveDuration) * 100;
    const umbralPct = stored.umbral_completado_pct || 90;

    let nuevoEstado = stored.estado;
    let completadoEn = stored.completado_en;

    if (stored.marcado_manual === 1 || watchedPct >= umbralPct) {
      nuevoEstado = 'COMPLETADO';
      if (!completadoEn) completadoEn = new Date();
    } else if (sanitizedPos > 0 || totalUniqueSeconds > 0) {
      nuevoEstado = 'EN_PROGRESO';
    }

    // 9. Persist updated progress
    await connection.query(
      `UPDATE progreso_materiales 
       SET posicion_segundos = ?, 
           duracion_segundos = ?, 
           tiempo_unico_segundos = ?, 
           secuencia = ?, 
           sesion_reproduccion_id = ?, 
           estado = ?, 
           completado_en = ?, 
           ultimo_acceso = NOW()
       WHERE alumno_id = ? AND matricula_id = ? AND material_id = ? AND version = ?`,
      [
        sanitizedPos,
        effectiveDuration,
        totalUniqueSeconds,
        secuencia,
        sesionReproduccionId,
        nuevoEstado,
        completadoEn,
        alumnoId,
        matricula_id,
        materialId,
        version
      ]
    );

    return {
      status: 'OK',
      posicion_segundos: sanitizedPos,
      duracion_segundos: effectiveDuration,
      tiempo_unico_segundos: totalUniqueSeconds,
      porcentaje_visto: Math.min(100, Math.round(watchedPct)),
      estado: nuevoEstado,
      completado: nuevoEstado === 'COMPLETADO'
    };

  } finally {
    connection.release();
  }
}

/**
 * Toggle manual completion flag ("Marcar como revisado")
 */
export async function toggleManualCompletion(alumnoId, materialId, marcadoManual) {
  const connection = await db.getConnection();

  try {
    const [enrollments] = await connection.query(
      `SELECT matricula_id FROM alumno_matricula_activa WHERE alumno_id = ? LIMIT 1`,
      [alumnoId]
    );

    if (enrollments.length === 0) {
      throw new Error('Sin matrícula activa autorizada.');
    }
    const { matricula_id } = enrollments[0];

    const [materials] = await connection.query(
      `SELECT version FROM materiales WHERE id = ? LIMIT 1`,
      [materialId]
    );

    if (materials.length === 0) {
      throw new Error('Material no encontrado.');
    }
    const version = materials[0].version;

    const isManual = marcadoManual ? 1 : 0;

    const [existing] = await connection.query(
      `SELECT * FROM progreso_materiales 
       WHERE alumno_id = ? AND matricula_id = ? AND material_id = ? AND version = ?`,
      [alumnoId, matricula_id, materialId, version]
    );

    let nuevoEstado = isManual ? 'COMPLETADO' : 'NO_INICIADO';
    if (!isManual && existing.length > 0 && existing[0].tiempo_unico_segundos > 0) {
      nuevoEstado = 'EN_PROGRESO';
    }

    if (existing.length === 0) {
      await connection.query(
        `INSERT INTO progreso_materiales 
         (alumno_id, matricula_id, material_id, version, estado, posicion_segundos, duracion_segundos, tiempo_unico_segundos, secuencia, marcado_manual, completado_en, ultimo_acceso)
         VALUES (?, ?, ?, ?, ?, 0, 0, 0, 0, ?, ?, NOW())`,
        [alumnoId, matricula_id, materialId, version, nuevoEstado, isManual, isManual ? new Date() : null]
      );
    } else {
      await connection.query(
        `UPDATE progreso_materiales 
         SET marcado_manual = ?, 
             estado = ?, 
             completado_en = ?, 
             ultimo_acceso = NOW()
         WHERE alumno_id = ? AND matricula_id = ? AND material_id = ? AND version = ?`,
        [isManual, nuevoEstado, isManual ? (existing[0].completado_en || new Date()) : null, alumnoId, matricula_id, materialId, version]
      );
    }

    // Audit log
    await connection.query(
      `INSERT INTO actividad (actor_id, accion, tipo_actividad, recurso_tipo, recurso_id, matricula_id, metadatos, creado_en)
       VALUES (?, ?, 'ACADEMICA', 'MATERIAL', ?, ?, ?, NOW())`,
      [
        alumnoId,
        isManual ? 'MARCAR_COMPLETADO_MANUAL' : 'DESMARCAR_COMPLETADO_MANUAL',
        materialId,
        matricula_id,
        JSON.stringify({ version, marcadoManual: isManual })
      ]
    );

    return {
      status: 'OK',
      marcado_manual: isManual,
      estado: nuevoEstado
    };

  } finally {
    connection.release();
  }
}

/**
 * Calculate student overall enrollment progress with exact published material denominator
 */
export async function calculateStudentOverallProgress(alumnoId) {
  const connection = await db.getConnection();

  try {
    const [enrollments] = await connection.query(
      `SELECT ama.matricula_id, mat.grupo_id, g.especialidad_id, esp.nombre as especialidad_nombre
       FROM alumno_matricula_activa ama
       JOIN matriculas mat ON ama.matricula_id = mat.id
       JOIN grupos g ON mat.grupo_id = g.id
       JOIN especialidades esp ON g.especialidad_id = esp.id
       WHERE ama.alumno_id = ? LIMIT 1`,
      [alumnoId]
    );

    if (enrollments.length === 0) {
      return {
        has_active_enrollment: false,
        total_publicados: 0,
        completados: 0,
        porcentaje_global: 0,
        detalles: []
      };
    }

    const { matricula_id, grupo_id, especialidad_id, especialidad_nombre } = enrollments[0];

    // Query all published materials applicable to student's active enrollment
    const [publishedMaterials] = await connection.query(
      `SELECT id, titulo, tipo, orden, version, especialidad_id, grupo_id, creado_en 
       FROM materiales 
       WHERE estado = 'PUBLICADO' 
         AND (grupo_id = ? OR (grupo_id IS NULL AND especialidad_id = ?))
       ORDER BY orden ASC, creado_en ASC`,
      [grupo_id, especialidad_id]
    );

    const totalPublicados = publishedMaterials.length;

    if (totalPublicados === 0) {
      return {
        has_active_enrollment: true,
        matricula_id,
        especialidad_nombre,
        total_publicados: 0,
        completados: 0,
        porcentaje_global: 0,
        detalles: []
      };
    }

    const matIds = publishedMaterials.map(m => m.id);

    // Query student's progress records matching these exact materials & versions
    const [progressRecords] = await connection.query(
      `SELECT material_id, version, estado, posicion_segundos, duracion_segundos, tiempo_unico_segundos, marcado_manual, ultimo_acceso, completado_en
       FROM progreso_materiales 
       WHERE alumno_id = ? AND matricula_id = ? AND material_id IN (?)`,
      [alumnoId, matricula_id, matIds]
    );

    const progressMap = new Map();
    progressRecords.forEach(r => {
      progressMap.set(`${r.material_id}_v${r.version}`, r);
    });

    let completadosCount = 0;
    const detalles = publishedMaterials.map(m => {
      const p = progressMap.get(`${m.id}_v${m.version}`);
      const isCompleted = p ? p.estado === 'COMPLETADO' : false;
      if (isCompleted) completadosCount++;

      return {
        material_id: m.id,
        titulo: m.titulo,
        tipo: m.tipo,
        version: m.version,
        estado: p ? p.estado : 'NO_INICIADO',
        posicion_segundos: p ? p.posicion_segundos : 0,
        duracion_segundos: p ? p.duracion_segundos : 0,
        tiempo_unico_segundos: p ? p.tiempo_unico_segundos : 0,
        porcentaje_visto: p && p.duracion_segundos > 0 ? Math.min(100, Math.round((p.tiempo_unico_segundos / p.duracion_segundos) * 100)) : 0,
        marcado_manual: p ? Boolean(p.marcado_manual) : false,
        ultimo_acceso: p ? p.ultimo_acceso : null,
        completado_en: p ? p.completado_en : null
      };
    });

    const porcentajeGlobal = Math.round((completadosCount / totalPublicados) * 100);

    return {
      has_active_enrollment: true,
      matricula_id,
      especialidad_nombre,
      total_publicados: totalPublicados,
      completados: completadosCount,
      porcentaje_global: porcentajeGlobal,
      detalles
    };

  } finally {
    connection.release();
  }
}

/**
 * Get last visited material for "Continuar último material" card
 */
export async function getLastVisitedMaterial(alumnoId) {
  const connection = await db.getConnection();

  try {
    const [enrollments] = await connection.query(
      `SELECT matricula_id FROM alumno_matricula_activa WHERE alumno_id = ? LIMIT 1`,
      [alumnoId]
    );

    if (enrollments.length === 0) return null;
    const { matricula_id } = enrollments[0];

    const [rows] = await connection.query(
      `SELECT pm.material_id, pm.version, pm.posicion_segundos, pm.duracion_segundos, pm.estado, pm.ultimo_acceso,
              m.titulo, m.tipo, m.referencia_video, m.proveedor, m.especialidad_id
       FROM progreso_materiales pm
       JOIN materiales m ON pm.material_id = m.id
       WHERE pm.alumno_id = ? AND pm.matricula_id = ? AND m.estado = 'PUBLICADO'
       ORDER BY pm.ultimo_acceso DESC LIMIT 1`,
      [alumnoId, matricula_id]
    );

    if (rows.length === 0) return null;

    const item = rows[0];
    return {
      material_id: item.material_id,
      titulo: item.titulo,
      tipo: item.tipo,
      version: item.version,
      posicion_segundos: item.posicion_segundos,
      duracion_segundos: item.duracion_segundos,
      estado: item.estado,
      ultimo_acceso: item.ultimo_acceso
    };

  } finally {
    connection.release();
  }
}

/**
 * Teacher Progress Analytics for assigned groups
 */
export async function getTeacherGroupAnalytics(profesorId) {
  const connection = await db.getConnection();

  try {
    // 1. Get groups assigned to this teacher
    const [assignedGroups] = await connection.query(
      `SELECT g.id as grupo_id, g.codigo as grupo_codigo, esp.nombre as especialidad_nombre
       FROM grupos g
       JOIN especialidades esp ON g.especialidad_id = esp.id
       WHERE g.profesor_principal_id = ?`,
      [profesorId]
    );

    if (assignedGroups.length === 0) return [];

    const groupIds = assignedGroups.map(g => g.grupo_id);

    // 2. Fetch students enrolled in these groups
    const [students] = await connection.query(
      `SELECT ama.alumno_id, ama.matricula_id, mat.grupo_id, u.nombre, u.apellidos, u.email
       FROM alumno_matricula_activa ama
       JOIN matriculas mat ON ama.matricula_id = mat.id
       JOIN usuarios u ON ama.alumno_id = u.id
       WHERE mat.grupo_id IN (?)`,
      [groupIds]
    );

    const result = [];

    for (const student of students) {
      const progressInfo = await calculateStudentOverallProgress(student.alumno_id);
      result.push({
        alumno_id: student.alumno_id,
        nombre: `${student.nombre} ${student.apellidos}`,
        email: student.email,
        grupo_id: student.grupo_id,
        total_publicados: progressInfo.total_publicados,
        completados: progressInfo.completados,
        porcentaje_global: progressInfo.porcentaje_global
      });
    }

    return result;

  } finally {
    connection.release();
  }
}

/**
 * Admin Global Analytics with filters
 */
export async function getAdminGlobalAnalytics({ especialidadId, grupoId, alumnoId }) {
  const connection = await db.getConnection();

  try {
    let sql = `
      SELECT ama.alumno_id, ama.matricula_id, mat.grupo_id, g.codigo as grupo_codigo,
             g.especialidad_id, esp.nombre as especialidad_nombre,
             u.nombre, u.apellidos, u.email
      FROM alumno_matricula_activa ama
      JOIN matriculas mat ON ama.matricula_id = mat.id
      JOIN grupos g ON mat.grupo_id = g.id
      JOIN especialidades esp ON g.especialidad_id = esp.id
      JOIN usuarios u ON ama.alumno_id = u.id
    `;
    const params = [];
    const conditions = [];

    if (especialidadId) {
      conditions.push(`g.especialidad_id = ?`);
      params.push(especialidadId);
    }
    if (grupoId) {
      conditions.push(`g.grupo_id = ?`);
      params.push(grupoId);
    }
    if (alumnoId) {
      conditions.push(`ama.alumno_id = ?`);
      params.push(alumnoId);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ` + conditions.join(' AND ');
    }

    const [students] = await connection.query(sql, params);

    const result = [];
    for (const s of students) {
      const prog = await calculateStudentOverallProgress(s.alumno_id);
      result.push({
        alumno_id: s.alumno_id,
        nombre: `${s.nombre} ${s.apellidos}`,
        email: s.email,
        grupo_codigo: s.grupo_codigo,
        especialidad_nombre: s.especialidad_nombre,
        total_publicados: prog.total_publicados,
        completados: prog.completados,
        porcentaje_global: prog.porcentaje_global
      });
    }

    return result;

  } finally {
    connection.release();
  }
}
