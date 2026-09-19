import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { normalizeEmail } from './authUtils.js';

dotenv.config();

// Create connection pool to Hostinger MySQL
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'srv1787.hstgr.io',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'u141101294_guillermina',
  password: process.env.DB_PASS || 'Wattpad_3317',
  database: process.env.DB_NAME || 'u141101294_Academias',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000,
});

// Helper for executing queries
export async function query(sql, params = []) {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (err) {
    console.error(`[DB ERROR] Query failed: ${sql}`, err.message);
    throw err;
  }
}

/**
 * Get user with assigned roles by normalized email
 */
export async function getUserByEmail(email) {
  const normEmail = normalizeEmail(email);
  const rows = await query(`
    SELECT u.id, u.nombre, u.apellidos, u.email, u.email_original, u.password_hash,
           u.telefono, u.estado, u.cambio_password_obligatorio, u.caducidad_password_temporal,
           u.ultimo_acceso, u.creado_por, u.creado_en
    FROM usuarios u
    WHERE u.email = ?
    LIMIT 1
  `, [normEmail]);

  if (!rows || rows.length === 0) return null;
  const user = rows[0];

  const roles = await getUserRoles(user.id);
  user.roles = roles;
  return user;
}

/**
 * Get user with assigned roles by user ID
 */
export async function getUserById(userId) {
  const rows = await query(`
    SELECT u.id, u.nombre, u.apellidos, u.email, u.email_original, u.password_hash,
           u.telefono, u.estado, u.cambio_password_obligatorio, u.caducidad_password_temporal,
           u.ultimo_acceso, u.creado_por, u.creado_en
    FROM usuarios u
    WHERE u.id = ?
    LIMIT 1
  `, [userId]);

  if (!rows || rows.length === 0) return null;
  const user = rows[0];

  const roles = await getUserRoles(user.id);
  user.roles = roles;
  return user;
}

/**
 * Get roles assigned to a user
 */
export async function getUserRoles(userId) {
  const rows = await query(`
    SELECT r.id, r.codigo, r.nombre, r.descripcion
    FROM usuario_roles ur
    JOIN roles r ON ur.rol_id = r.id
    WHERE ur.usuario_id = ?
  `, [userId]);
  return rows.map(r => r.codigo);
}

/**
 * Count total active administrators in system
 */
export async function countActiveAdmins(excludeUserId = null) {
  let sql = `
    SELECT COUNT(DISTINCT u.id) as count
    FROM usuarios u
    JOIN usuario_roles ur ON u.id = ur.usuario_id
    JOIN roles r ON ur.rol_id = r.id
    WHERE r.codigo = 'ADMINISTRADOR' AND u.estado = 'ACTIVO'
  `;
  const params = [];
  if (excludeUserId) {
    sql += ` AND u.id != ?`;
    params.push(excludeUserId);
  }
  const rows = await query(sql, params);
  return rows[0].count;
}

/**
 * Create a new user with role and optional enrollment inside a single DB transaction
 */
export async function createUserWithTransaction({
  userId,
  nombre,
  apellidos,
  email,
  emailOriginal,
  passHash,
  telefono = null,
  roleCode,
  grupoId = null,
  createdBy = null,
  encryptedOutboxPayload
}) {
  const normEmail = normalizeEmail(email);
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // 1. Insert user
    await conn.execute(`
      INSERT INTO usuarios (
        id, nombre, apellidos, email, email_original, password_hash, telefono,
        estado, cambio_password_obligatorio, caducidad_password_temporal, creado_por
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVO', 1, DATE_ADD(NOW(), INTERVAL 48 HOUR), ?)
    `, [userId, nombre, apellidos, normEmail, emailOriginal || email, passHash, telefono, createdBy]);

    // 2. Get role ID
    const [roleRows] = await conn.execute(`SELECT id FROM roles WHERE codigo = ? LIMIT 1`, [roleCode]);
    if (!roleRows || roleRows.length === 0) {
      throw new Error(`Rol inválido: ${roleCode}`);
    }
    const roleId = roleRows[0].id;

    // 3. Assign role
    await conn.execute(`
      INSERT INTO usuario_roles (usuario_id, rol_id, asignado_por)
      VALUES (?, ?, ?)
    `, [userId, roleId, createdBy]);

    // 4. Handle student enrollment if group provided
    if (roleCode === 'ALUMNO' && grupoId) {
      const matId = `mat-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
      await conn.execute(`
        INSERT INTO matriculas (id, alumno_id, grupo_id, estado, autor_id)
        VALUES (?, ?, ?, 'ACTIVA', ?)
      `, [matId, userId, grupoId, createdBy]);

      // Atomic single active enrollment constraint
      await conn.execute(`
        INSERT INTO alumno_matricula_activa (alumno_id, matricula_id)
        VALUES (?, ?)
      `, [userId, matId]);
    }

    // 5. Queue encrypted email in outbox (clave_idempotencia ensures idempotent retries)
    if (encryptedOutboxPayload) {
      const outboxId = `out-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
      const idempotencyKey = `welcome-${userId}`;

      await conn.execute(`
        INSERT INTO cola_correos (
          id, tipo, destinatario, contenido_ref, clave_idempotencia, estado
        ) VALUES (?, 'BIENVENIDA_TEMP_PASS', ?, ?, ?, 'PENDIENTE')
      `, [outboxId, emailOriginal || normEmail, JSON.stringify(encryptedOutboxPayload), idempotencyKey]);
    }

    await conn.commit();
    return userId;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Switch a student's active enrollment to a new group atomically inside a DB transaction
 * Preserves historical progress without attributing it to the new group/enrollment
 */
export async function switchStudentGroupTransaction({ studentId, newGroupId, adminId }) {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // 1. Verify group exists and is active
    const [grpRows] = await conn.execute(`SELECT id, especialidad_id, estado FROM grupos WHERE id = ? LIMIT 1`, [newGroupId]);
    if (!grpRows || grpRows.length === 0) {
      throw new Error('El grupo de destino no existe.');
    }
    if (grpRows[0].estado !== 'ACTIVO') {
      throw new Error('El grupo de destino no está activo y no admite nuevas matrículas.');
    }

    // 2. Find current active enrollment
    const [amaRows] = await conn.execute(`SELECT matricula_id FROM alumno_matricula_activa WHERE alumno_id = ? LIMIT 1`, [studentId]);

    if (amaRows.length > 0) {
      const oldMatId = amaRows[0].matricula_id;
      // Close old enrollment
      await conn.execute(`
        UPDATE matriculas
        SET estado = 'FINALIZADA', fecha_fin = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [oldMatId]);

      // Remove from active enrollment table
      await conn.execute(`DELETE FROM alumno_matricula_activa WHERE alumno_id = ?`, [studentId]);
    }

    // 3. Create new enrollment
    const newMatId = `mat-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    await conn.execute(`
      INSERT INTO matriculas (id, alumno_id, grupo_id, estado, autor_id)
      VALUES (?, ?, ?, 'ACTIVA', ?)
    `, [newMatId, studentId, newGroupId, adminId]);

    // 4. Update atomic active enrollment table
    await conn.execute(`
      INSERT INTO alumno_matricula_activa (alumno_id, matricula_id)
      VALUES (?, ?)
    `, [studentId, newMatId]);

    await conn.commit();
    return newMatId;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Finalize active enrollment for a student
 */
export async function finalizeEnrollmentTransaction({ studentId, adminId }) {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [amaRows] = await conn.execute(`SELECT matricula_id FROM alumno_matricula_activa WHERE alumno_id = ? LIMIT 1`, [studentId]);

    if (amaRows.length > 0) {
      const matId = amaRows[0].matricula_id;
      await conn.execute(`
        UPDATE matriculas
        SET estado = 'FINALIZADA', fecha_fin = CURRENT_TIMESTAMP, autor_id = ?
        WHERE id = ?
      `, [adminId, matId]);

      await conn.execute(`DELETE FROM alumno_matricula_activa WHERE alumno_id = ?`, [studentId]);
    }

    await conn.commit();
    return true;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Revoke all active sessions for a user
 */
export async function revokeUserSessions(userId) {
  await query(`
    UPDATE sesiones 
    SET revocado_en = CURRENT_TIMESTAMP
    WHERE usuario_id = ? AND revocado_en IS NULL
  `, [userId]);
}

export default pool;
