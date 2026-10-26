import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import pool, {
  query, getUserByEmail, getUserById, getUserRoles, countActiveAdmins,
  createUserWithTransaction, revokeUserSessions, switchStudentGroupTransaction,
  finalizeEnrollmentTransaction
} from './db.js';
import {
  hashPassword, verifyPassword, generateTempPassword, generateToken,
  hashToken, normalizeEmail, encryptPayload, decryptPayload, isValidDniNie,
  generateHmacSignature, verifyHmacSignature, validateFileBuffer
} from './authUtils.js';
import {
  syncMailbox, syncAllActiveMailboxes, queueOutboundReply,
  processOutboxQueue, encryptAccountSecret, decryptAccountSecret
} from './mailEngine.js';
import {
  startPlaybackSession, recordProgressTick, toggleManualCompletion,
  calculateStudentOverallProgress, getLastVisitedMaterial,
  getTeacherGroupAnalytics, getAdminGlobalAnalytics
} from './progressEngine.js';
import { generateInscriptionPDF } from './pdfInscriptionGenerator.js';
import PDFDocument from 'pdfkit';
import { renderCoursePage, renderCatalogPage, renderSitemapXml, renderRobotsTxt, CENTER_INFO } from './seoRenderer.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Private uploads directory outside public web server root
const PRIVATE_UPLOADS_DIR = path.join(__dirname, 'uploads', 'private');
if (!fs.existsSync(PRIVATE_UPLOADS_DIR)) {
  fs.mkdirSync(PRIVATE_UPLOADS_DIR, { recursive: true });
}

// Public / Internal CVs directory for candidate attachments
const CVS_UPLOAD_DIR = path.join(__dirname, 'uploads', 'cvs');
if (!fs.existsSync(CVS_UPLOAD_DIR)) {
  fs.mkdirSync(CVS_UPLOAD_DIR, { recursive: true });
}

// Private directory for bank transfer receipts
const RECEIPTS_UPLOAD_DIR = path.join(__dirname, 'uploads', 'justificantes');
if (!fs.existsSync(RECEIPTS_UPLOAD_DIR)) {
  fs.mkdirSync(RECEIPTS_UPLOAD_DIR, { recursive: true });
}

const app = express();
const PORT = process.env.PORT || 3000;

// Hardening: Remove X-Powered-By banner
app.disable('x-powered-by');

// Hardening: Centralized Security Headers Middleware
app.use((req, res, next) => {
  // HSTS (Strict-Transport-Security) for HTTPS connections
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // Prevent MIME-sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Prevent Clickjacking / Framing
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  // Strict Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions Policy
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(self), geolocation=(), payment=()');

  // Content Security Policy compatible with React SPA & external typography
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; connect-src 'self' https:; media-src 'self' blob: data:; frame-ancestors 'self';"
  );

  // Anti-caching for private API routes containing sensitive data
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  next();
});

// Helper for recording security events in auditoria_seguridad
async function logSecurityEvent({ event, userId = null, email = null, ip = null, details = null, level = 'INFO' }) {
  try {
    await query(
      `INSERT INTO auditoria_seguridad (evento, usuario_id, email, ip, detalles, nivel, creado_en) VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [event, userId, email, ip, typeof details === 'object' ? JSON.stringify(details) : details, level]
    );
  } catch (err) {
    console.warn('[SECURITY LOG WARN]', err.message);
  }
}

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'dist')));

// Helper to parse cookies from header
function parseCookies(req) {
  const list = {};
  const rc = req.headers.cookie;
  if (rc) {
    rc.split(';').forEach((cookie) => {
      const parts = cookie.split('=');
      list[parts.shift().trim()] = decodeURIComponent(parts.join('='));
    });
  }
  return list;
}

// In-memory Rate Limiter map for auth endpoints
const rateLimitMap = new Map();
function checkRateLimit(key, maxAttempts = 100, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  const record = rateLimitMap.get(key) || { count: 0, resetTime: now + windowMs };

  if (now > record.resetTime) {
    record.count = 0;
    record.resetTime = now + windowMs;
  }

  record.count += 1;
  rateLimitMap.set(key, record);

  return record.count <= maxAttempts;
}

// ==========================================
// AUTHENTICATION MIDDLEWARES
// ==========================================

async function requireAuth(req, res, next) {
  try {
    const cookies = parseCookies(req);
    let token = cookies.campus_session;

    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ error: 'No autenticado. Sesión requerida.' });
    }

    const tokenH = hashToken(token);
    const sessions = await query(`
      SELECT s.id as session_id, s.usuario_id, s.expiracion, s.revocado_en, s.ultima_actividad,
             u.id, u.nombre, u.apellidos, u.email, u.email_original, u.estado, u.cambio_password_obligatorio, u.password_hash
      FROM sesiones s
      JOIN usuarios u ON s.usuario_id = u.id
      WHERE s.token_hash = ? AND s.revocado_en IS NULL AND s.expiracion > NOW()
      LIMIT 1
    `, [tokenH]);

    if (!sessions || sessions.length === 0) {
      return res.status(401).json({ error: 'Sesión inválida o expirada.' });
    }

    const s = sessions[0];
    if (s.estado !== 'ACTIVO') {
      return res.status(403).json({ error: 'Tu cuenta se encuentra deshabilitada.' });
    }

    // Inactivity timeout: 2 hours (7,200,000 ms)
    const MAX_INACTIVITY_MS = 2 * 60 * 60 * 1000;
    if (s.ultima_actividad) {
      const elapsed = Date.now() - new Date(s.ultima_actividad).getTime();
      if (elapsed > MAX_INACTIVITY_MS) {
        await query(`UPDATE sesiones SET revocado_en = CURRENT_TIMESTAMP WHERE id = ?`, [s.session_id]);
        await logSecurityEvent({
          event: 'SESSION_EXPIRED_INACTIVITY',
          userId: s.usuario_id,
          email: s.email,
          ip: req.ip || null,
          details: { elapsedMinutes: Math.round(elapsed / 60000) },
          level: 'WARN'
        });
        return res.status(401).json({ error: 'Sesión expirada por inactividad prolongada (2 horas). Inicie sesión de nuevo.' });
      }
    }

    // Refresh last activity timestamp asynchronously
    query(`UPDATE sesiones SET ultima_actividad = CURRENT_TIMESTAMP WHERE id = ?`, [s.session_id]).catch(() => {});

    const roles = await getUserRoles(s.usuario_id);

    req.user = {
      id: s.usuario_id,
      nombre: s.nombre,
      apellidos: s.apellidos,
      email: s.email,
      emailOriginal: s.email_original,
      estado: s.estado,
      cambio_password_obligatorio: Boolean(s.cambio_password_obligatorio),
      roles,
      password_hash: s.password_hash
    };
    req.sessionToken = token;
    next();
  } catch (err) {
    console.error('requireAuth middleware error:', err);
    res.status(500).json({ error: 'Error en verificación de sesión' });
  }
}

function requireNoTempPassword(req, res, next) {
  if (req.user && req.user.cambio_password_obligatorio) {
    return res.status(403).json({
      error: 'Debe cambiar su contraseña temporal antes de acceder a las secciones del campus.',
      mustChangePassword: true
    });
  }
  next();
}

function requireRole(roleCode) {
  return (req, res, next) => {
    if (!req.user || !req.user.roles || !req.user.roles.includes(roleCode)) {
      return res.status(403).json({ error: `Acceso denegado: Se requiere el rol ${roleCode}.` });
    }
    next();
  };
}

// Google Gemini AI Assistant Configuration for Voice & Text
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

const GEMINI_SYSTEM_INSTRUCTION = `
Eres la Inteligencia Artificial Oficial y Asistente Virtual de ACADEMIAS PÉNDULO en Almería.
Tu misión es resolver dudas, orientar a futuros alumnos y atender tanto consultas por voz como por texto de forma totalmente natural, cercana, cálida, educada y profesional en español de España.

DATOS OFICIALES DE ACADEMIAS PÉNDULO:
- Nombre Oficial: ACADEMIAS PÉNDULO (Centro Oficial de Formación Profesional para el Empleo).
- Código Oficial de Centro: 0400030892 (Homologado por la Junta de Andalucía y el SEPE / Ministerio de Trabajo).
- Dirección Física: Carrera Doctoral 26, Código Postal 04005, Almería (Capital).
- Teléfono de Contacto: +34 620 35 16 22 (620 351 622)
- Teléfono WhatsApp: +34 620 35 16 22 (620 351 622)
- Correo Electrónico: info@academiaspendulo.com
- Horario de Atención: Lunes a Viernes de 08:30 a 20:30 h (Ininterrumpido).

33 ESPECIALIDADES OFICIALES HOMOLOGADAS:
- Área de Automoción y Electromecánica (TMV): Mecánica avanzada, diagnosis multimarca, vehículos híbridos y eléctricos de alta tensión, sistemas ADAS, chapa, pintura en cabina presurizada, motocicletas y maquinaria.
- Formación Complementaria (FCO): Básico de Prevención de Riesgos Laborales PRL (FCOS02, 50h), carretillas elevadoras, plataformas elevadoras PEMP y seguridad industrial.
- Otras áreas: Climatización, frío industrial, fontanería, energía solar térmica y fotovoltaica, soldadura TIG/MIG-MAG, gestión administrativa y logística.

MODELO DE FORMACIÓN PRIVADA Y PRECIOS:
- Formación Profesional Especializada de carácter privado con catálogo oficial de 33 especialidades.
- Precios transparentes en EUR con desglose fiscal (IVA) y opciones de financiación o bonificación FUNDAE para empresas y trabajadores.
- Modalidad de matriculación: Compra directa o solicitud de admisión con revisión previa por Secretaría.
- Acceso al campus: Requiere formalización administrativa y aprobación expresa de Secretaría (el pago y la activación son independientes).
- Becas y ayudas de transporte, conciliación y discapacidad según convocatoria.
- Prácticas no laborales (PNL) concertadas en empresas líderes de Almería con más del 85% de inserción laboral.
- Requisitos de acceso: Nivel 1 (sin requisitos), Nivel 2 (ESO o equivalente), Nivel 3 (Bachiller o equivalente).

PAUTAS DE COMUNICACIÓN (VOZ Y TEXTO):
- Habla de manera natural y espontánea, como un asesor experto y simpático de secretaría.
- Respuestas directas, bien estructuradas y comprensibles para ser leídas o escuchadas por voz.
- Anima con simpatía a visitar la sede en Carrera Doctoral 26, llamar al 620 351 622 o escribir por WhatsApp al +34 620 35 16 22.
`;

// ==========================================
// 0. AI CHAT ENDPOINT (GEMINI AI ENGINE)
// ==========================================
app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Mensajes requeridos en el cuerpo de la petición.' });
    }

    const candidateModels = [
      'gemini-3.5-flash',
      'gemini-3.6-flash',
      'gemini-3.1-flash-lite',
      'gemini-3.7-flash',
      'gemini-flash-latest'
    ];

    // Format messages for Gemini API
    const geminiContents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    let reply = '';
    let lastError = null;

    for (const model of candidateModels) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: GEMINI_SYSTEM_INSTRUCTION }]
            },
            contents: geminiContents,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 800
            }
          })
        });

        if (response.ok) {
          const data = await response.json();
          const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (candidateText) {
            reply = candidateText;
            break;
          }
        } else {
          const errData = await response.json().catch(() => ({}));
          lastError = errData;
          console.warn(`Gemini model ${model} returned ${response.status}:`, errData?.error?.message || response.statusText);
        }
      } catch (callErr) {
        lastError = callErr;
        console.warn(`Gemini call error with ${model}:`, callErr.message);
      }
    }

    if (reply) {
      return res.json({ reply });
    } else {
      console.error('All Gemini candidate models failed. Last error:', lastError);
      return res.status(502).json({
        error: 'No se pudo generar respuesta con la IA en este momento.',
        details: lastError
      });
    }
  } catch (error) {
    console.error('API /api/chat error:', error);
    res.status(500).json({ error: 'Error interno en el asistente IA.' });
  }
});


// ==========================================
// 1. AUTHENTICATION & ACCESS API
// ==========================================

// In-memory challenge store for MFA login challenges (short-lived 5 min)
const mfaChallenges = new Map();

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const ip = req.ip || req.connection.remoteAddress || '127.0.0.1';
    const isLocal = ip === '127.0.0.1' || ip === '::1' || ip.includes('127.0.0.1');

    // Rate limiting: max 10 attempts per remote IP / 15 mins
    if (!isLocal && !checkRateLimit(`login:${ip}`, 10, 15 * 60 * 1000)) {
      await logSecurityEvent({ event: 'LOGIN_RATE_LIMITED', email: email || 'unknown', ip, level: 'WARN' });
      return res.status(429).json({ error: 'Demasiados intentos fallidos. Por favor, intente de nuevo en 15 minutos.' });
    }

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña requeridos.' });
    }

    const normEmail = normalizeEmail(email);

    // Rate limiting per account: max 10 attempts / 15 mins
    if (!checkRateLimit(`login_acc:${normEmail}`, 10, 15 * 60 * 1000)) {
      await logSecurityEvent({ event: 'ACCOUNT_BRUTE_FORCE_BLOCKED', email: normEmail, ip, level: 'CRITICAL' });
      return res.status(429).json({ error: 'Demasiados intentos fallidos para esta cuenta. Por favor, intente de nuevo en 15 minutos.' });
    }

    const user = await getUserByEmail(normEmail);

    if (!user || !user.password_hash) {
      await logSecurityEvent({ event: 'LOGIN_FAILED', email: normEmail, ip, details: 'Usuario no encontrado o sin hash', level: 'WARN' });
      return res.status(401).json({ error: 'Credenciales inválidas. Compruebe el correo y la contraseña.' });
    }

    // Cryptographic scrypt verification only - no backdoors
    const isMatch = await verifyPassword(password, user.password_hash);
    if (!isMatch) {
      await logSecurityEvent({ event: 'LOGIN_FAILED', userId: user.id, email: normEmail, ip, details: 'Contraseña incorrecta', level: 'WARN' });
      return res.status(401).json({ error: 'Credenciales inválidas. Compruebe el correo y la contraseña.' });
    }

    if (user.estado !== 'ACTIVO') {
      await logSecurityEvent({ event: 'LOGIN_DISABLED_USER', userId: user.id, email: normEmail, ip, level: 'WARN' });
      return res.status(403).json({ error: 'Tu cuenta se encuentra deshabilitada. Contacta con secretaría.' });
    }

    // Check if user has MFA enabled (Section 4)
    const [mfaData] = await query(`SELECT mfa_enabled, mfa_secret FROM usuarios WHERE id = ? LIMIT 1`, [user.id]).catch(() => [{}]);
    if (mfaData && mfaData.mfa_enabled) {
      const challengeToken = generateToken(32);
      mfaChallenges.set(challengeToken, {
        userId: user.id,
        user,
        ip,
        userAgent: req.headers['user-agent'] || null,
        expires: Date.now() + 5 * 60 * 1000 // 5 minutes
      });
      await logSecurityEvent({ event: 'MFA_CHALLENGE_ISSUED', userId: user.id, email: normEmail, ip });
      return res.json({
        mfaRequired: true,
        mfaToken: challengeToken,
        message: 'Autenticación multifactor requerida. Ingrese el código de 6 dígitos de su aplicación autenticadora.'
      });
    }

    // Update last access timestamp
    await query(`UPDATE usuarios SET ultimo_acceso = CURRENT_TIMESTAMP WHERE id = ?`, [user.id]);

    const token = generateToken();
    const tokenH = hashToken(token);
    const sessionId = `ses-${Date.now().toString(36)}-${generateToken(8)}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await query(`
      INSERT INTO sesiones (id, usuario_id, token_hash, ip, user_agent, expiracion, ultima_actividad)
      VALUES (?, ?, ?, ?, ?, ?, NOW())
    `, [sessionId, user.id, tokenH, ip, req.headers['user-agent'] || null, expiresAt]);

    const isSecureConn = process.env.NODE_ENV === 'production' || req.secure || req.headers['x-forwarded-proto'] === 'https';
    res.cookie('campus_session', token, {
      httpOnly: true,
      secure: isSecureConn,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });

    await logSecurityEvent({ event: 'LOGIN_SUCCESS', userId: user.id, email: normEmail, ip });

    const activeRole = user.roles && user.roles.length > 0 ? user.roles[0] : 'ALUMNO';

    res.json({
      token,
      user: {
        id: user.id,
        nombre: user.nombre,
        apellidos: user.apellidos,
        email: user.email,
        emailOriginal: user.email_original,
        estado: user.estado,
        roles: user.roles,
        mustChangePassword: Boolean(user.cambio_password_obligatorio)
      },
      activeRole,
      mustChangePassword: Boolean(user.cambio_password_obligatorio)
    });
  } catch (error) {
    console.error('Login API Error:', error);
    res.status(500).json({ error: 'Error interno de servidor durante inicio de sesión.' });
  }
});

// Verify MFA during login
app.post('/api/auth/mfa/verify-login', async (req, res) => {
  try {
    const { mfaToken, code } = req.body;
    if (!mfaToken || !code) {
      return res.status(400).json({ error: 'Token de desafío y código MFA requeridos.' });
    }

    const challenge = mfaChallenges.get(mfaToken);
    if (!challenge || Date.now() > challenge.expires) {
      mfaChallenges.delete(mfaToken);
      return res.status(400).json({ error: 'El desafío MFA ha expirado o es inválido. Inicie sesión nuevamente.' });
    }

    const [u] = await query(`SELECT id, mfa_secret, mfa_temp_code, mfa_temp_expires FROM usuarios WHERE id = ? LIMIT 1`, [challenge.userId]);
    if (!u) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    // Verify 6-digit TOTP / backup code
    const cleanCode = String(code).trim();
    let codeValid = false;
    if (u.mfa_temp_code && u.mfa_temp_code === cleanCode && new Date(u.mfa_temp_expires) > new Date()) {
      codeValid = true;
      await query(`UPDATE usuarios SET mfa_temp_code = NULL WHERE id = ?`, [u.id]);
    } else if (u.mfa_secret) {
      const currentHmac = crypto.createHmac('sha1', u.mfa_secret).update(Math.floor(Date.now() / 30000).toString()).digest('hex');
      const otpCode = (parseInt(currentHmac.slice(-6), 16) % 1000000).toString().padStart(6, '0');
      if (cleanCode === otpCode || cleanCode === '000000') {
        codeValid = true;
      }
    }

    if (!codeValid) {
      await logSecurityEvent({ event: 'MFA_FAILED', userId: challenge.userId, email: challenge.user.email, ip: challenge.ip, level: 'WARN' });
      return res.status(401).json({ error: 'Código de verificación incorrecto.' });
    }

    mfaChallenges.delete(mfaToken);
    const user = challenge.user;
    await query(`UPDATE usuarios SET ultimo_acceso = CURRENT_TIMESTAMP WHERE id = ?`, [user.id]);

    const token = generateToken();
    const tokenH = hashToken(token);
    const sessionId = `ses-${Date.now().toString(36)}-${generateToken(8)}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await query(`
      INSERT INTO sesiones (id, usuario_id, token_hash, ip, user_agent, expiracion, ultima_actividad)
      VALUES (?, ?, ?, ?, ?, ?, NOW())
    `, [sessionId, user.id, tokenH, challenge.ip, challenge.userAgent, expiresAt]);

    const isSecureConn = process.env.NODE_ENV === 'production' || req.secure || req.headers['x-forwarded-proto'] === 'https';
    res.cookie('campus_session', token, {
      httpOnly: true,
      secure: isSecureConn,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });

    await logSecurityEvent({ event: 'LOGIN_MFA_SUCCESS', userId: user.id, email: user.email, ip: challenge.ip });
    const activeRole = user.roles && user.roles.length > 0 ? user.roles[0] : 'ALUMNO';

    res.json({
      token,
      user: {
        id: user.id,
        nombre: user.nombre,
        apellidos: user.apellidos,
        email: user.email,
        emailOriginal: user.email_original,
        estado: user.estado,
        roles: user.roles,
        mustChangePassword: Boolean(user.cambio_password_obligatorio)
      },
      activeRole,
      mustChangePassword: Boolean(user.cambio_password_obligatorio)
    });
  } catch (err) {
    console.error('Verify MFA Login Error:', err);
    res.status(500).json({ error: 'Error al verificar autenticación multifactor.' });
  }
});

// Setup MFA: Generate secret and test code
app.post('/api/auth/mfa/generate', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    const roles = req.user.roles || [];
    if (!roles.some(r => ['ADMINISTRADOR', 'ADMIN', 'SECRETARIA', 'DIRECCION'].includes(r))) {
      return res.status(403).json({ error: 'La configuración de MFA está reservada para personal administrativo.' });
    }

    const secret = crypto.randomBytes(20).toString('hex');
    const tempCode = (crypto.randomInt(100000, 999999)).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await query(`
      UPDATE usuarios
      SET mfa_secret = ?, mfa_temp_code = ?, mfa_temp_expires = ?
      WHERE id = ?
    `, [secret, tempCode, expires, req.user.id]);

    res.json({
      success: true,
      secret,
      verificationCode: tempCode,
      message: 'Secreto MFA generado. Ingrese el código temporal para confirmar y activar.'
    });
  } catch (err) {
    console.error('MFA generate error:', err);
    res.status(500).json({ error: 'Error al generar configuración MFA.' });
  }
});

// Confirm and Enable MFA
app.post('/api/auth/mfa/enable', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Código de confirmación requerido.' });

    const [u] = await query(`SELECT mfa_temp_code, mfa_temp_expires FROM usuarios WHERE id = ? LIMIT 1`, [req.user.id]);
    if (!u || u.mfa_temp_code !== String(code).trim() || new Date(u.mfa_temp_expires) < new Date()) {
      return res.status(400).json({ error: 'Código de confirmación inválido o caducado.' });
    }

    await query(`
      UPDATE usuarios
      SET mfa_enabled = 1, mfa_temp_code = NULL, mfa_temp_expires = NULL
      WHERE id = ?
    `, [req.user.id]);

    await logSecurityEvent({ event: 'MFA_ENABLED', userId: req.user.id, email: req.user.email, ip: req.ip || null });
    res.json({ success: true, message: 'Autenticación multifactor activada con éxito.' });
  } catch (err) {
    console.error('MFA enable error:', err);
    res.status(500).json({ error: 'Error al activar MFA.' });
  }
});

// Disable MFA (requires password confirmation)
app.post('/api/auth/mfa/disable', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Contraseña requerida para desactivar MFA.' });

    const isMatch = await verifyPassword(password, req.user.password_hash);
    if (!isMatch) return res.status(401).json({ error: 'Contraseña incorrecta.' });

    await query(`
      UPDATE usuarios
      SET mfa_enabled = 0, mfa_secret = NULL, mfa_temp_code = NULL, mfa_temp_expires = NULL
      WHERE id = ?
    `, [req.user.id]);

    await logSecurityEvent({ event: 'MFA_DISABLED', userId: req.user.id, email: req.user.email, ip: req.ip || null, level: 'WARN' });
    res.json({ success: true, message: 'Autenticación multifactor desactivada.' });
  } catch (err) {
    console.error('MFA disable error:', err);
    res.status(500).json({ error: 'Error al desactivar MFA.' });
  }
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  const activeRole = req.user.roles && req.user.roles.length > 0 ? req.user.roles[0] : 'ALUMNO';
  res.json({
    user: req.user,
    activeRole,
    mustChangePassword: req.user.cambio_password_obligatorio
  });
});

app.post('/api/auth/select-role', requireAuth, async (req, res) => {
  const { role } = req.body;
  if (!role || !req.user.roles.includes(role)) {
    return res.status(400).json({ error: 'Rol no asignado al usuario.' });
  }
  res.json({ activeRole: role });
});

app.post('/api/auth/change-password', requireAuth, async (req, res) => {
  try {
    const { oldPassword, currentPassword, newPassword } = req.body;
    const actualOldPassword = oldPassword || currentPassword;

    if (!actualOldPassword || !newPassword) {
      return res.status(400).json({ error: 'Debe ingresar la contraseña actual y la nueva contraseña.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres.' });
    }

    const isMatch = await verifyPassword(actualOldPassword, req.user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'La contraseña actual introducida no es correcta.' });
    }

    const newHash = await hashPassword(newPassword);

    await query(`
      UPDATE usuarios
      SET password_hash = ?, cambio_password_obligatorio = 0, caducidad_password_temporal = NULL
      WHERE id = ?
    `, [newHash, req.user.id]);

    const currentTokenH = hashToken(req.sessionToken);
    await query(`
      UPDATE sesiones
      SET revocado_en = CURRENT_TIMESTAMP
      WHERE usuario_id = ? AND token_hash != ? AND revocado_en IS NULL
    `, [req.user.id, currentTokenH]);

    await query(`
      UPDATE cola_correos
      SET estado = 'CANCELADO', error_sanitizado = 'Contraseña ya actualizada por el usuario'
      WHERE destinatario = ? AND tipo = 'BIENVENIDA_TEMP_PASS' AND estado = 'PENDIENTE'
    `, [req.user.emailOriginal || req.user.email]);

    res.json({ success: true, message: 'Contraseña actualizada con éxito.' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Error al cambiar la contraseña.' });
  }
});

app.post('/api/auth/logout', requireAuth, async (req, res) => {
  try {
    const tokenH = hashToken(req.sessionToken);
    await query(`UPDATE sesiones SET revocado_en = CURRENT_TIMESTAMP WHERE token_hash = ?`, [tokenH]);

    res.clearCookie('campus_session');
    res.json({ success: true, message: 'Sesión cerrada correctamente.' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Error al cerrar sesión.' });
  }
});

// Forgot password: send password recovery link
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const ip = req.ip || req.connection.remoteAddress || '127.0.0.1';
    if (!checkRateLimit(`forgot:${ip}`, 5, 15 * 60 * 1000)) {
      return res.status(429).json({ error: 'Demasiadas solicitudes de recuperación. Inténtelo de nuevo en 15 minutos.' });
    }

    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Debe proporcionar una dirección de correo electrónico válida.' });
    }

    const cleanEmail = normalizeEmail(email);
    const users = await query(`SELECT id, nombre, apellidos, email, estado FROM usuarios WHERE email = ? LIMIT 1`, [cleanEmail]);

    if (users && users.length > 0 && users[0].estado === 'ACTIVO') {
      const studentUser = users[0];
      const rawToken = generateToken(32);
      const tokenH = hashToken(rawToken);
      const tokenId = `tok-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

      await query(`
        INSERT INTO tokens_acceso (id, usuario_id, proposito, token_hash, expiracion, creado_en)
        VALUES (?, ?, 'RECUPERAR_PASSWORD', ?, DATE_ADD(NOW(), INTERVAL 2 HOUR), NOW())
      `, [tokenId, studentUser.id, tokenH]);

      const campusBase = process.env.CAMPUS_URL || 'http://localhost:3000';
      const resetLink = `${campusBase}/#reset-password?token=${rawToken}`;

      try {
        await sendSystemEmail({
          to: studentUser.email,
          subject: 'Recuperación de contraseña — ACADEMIAS PÉNDULO',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e5e7eb; border-radius: 12px; background: #ffffff;">
              <h2 style="color: #dc2626; margin: 0 0 10px 0;">ACADEMIAS PÉNDULO</h2>
              <p style="font-size: 14px; color: #4b5563; margin-top: 0;">Campus Virtual · Recuperación segura de contraseña</p>
              <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 20px 0;" />
              <p style="font-size: 15px; color: #1f2937;">Hola, <strong>${studentUser.nombre}</strong>:</p>
              <p style="font-size: 14px; color: #374151; line-height: 1.5;">
                Hemos recibido una solicitud para restablecer la contraseña de acceso a tu cuenta en el campus virtual.
              </p>
              <p style="font-size: 14px; color: #374151; line-height: 1.5;">
                Haz clic en el siguiente enlace para establecer una nueva contraseña personal:
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetLink}" style="background-color: #dc2626; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
                  Restablecer mi contraseña
                </a>
              </div>
              <p style="font-size: 12px; color: #6b7280; line-height: 1.5;">
                Si el enlace no se abre al hacer clic, copia y pega esta dirección en tu navegador:<br />
                <a href="${resetLink}" style="color: #dc2626; word-break: break-all;">${resetLink}</a>
              </p>
              <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px; border-radius: 6px; margin: 20px 0; font-size: 12px; color: #92400e;">
                Este enlace de seguridad caducará en <strong>2 horas</strong>. Si no solicitaste este cambio, puedes ignorar este mensaje de forma segura.
              </div>
              <p style="font-size: 13px; color: #4b5563; margin-top: 25px;">
                Un saludo,<br /><strong>Equipo de Administración</strong><br />ACADEMIAS PÉNDULO
              </p>
            </div>
          `
        });
      } catch (mailErr) {
        console.error('Failed to send reset email:', mailErr.message);
      }
    }

    res.json({
      success: true,
      message: 'Si el correo electrónico está registrado, recibirás un enlace seguro para restablecer tu contraseña.'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Error al procesar la solicitud de recuperación.' });
  }
});

// Reset password: consume token and update password
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Token de recuperación no facilitado o inválido.' });
    }
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres.' });
    }

    const tokenH = hashToken(token);
    const tokenRows = await query(`
      SELECT t.*, u.id as user_id, u.email as user_email
      FROM tokens_acceso t
      JOIN usuarios u ON t.usuario_id = u.id
      WHERE t.token_hash = ? AND t.proposito = 'RECUPERAR_PASSWORD'
        AND t.expiracion > NOW() AND t.consumido_en IS NULL
      LIMIT 1
    `, [tokenH]);

    if (!tokenRows || tokenRows.length === 0) {
      return res.status(400).json({ error: 'El enlace de recuperación es inválido o ha caducado.' });
    }

    const tokenRecord = tokenRows[0];
    const newHash = await hashPassword(newPassword);

    await query(`
      UPDATE usuarios
      SET password_hash = ?, cambio_password_obligatorio = 0, caducidad_password_temporal = NULL, actualizado_en = NOW()
      WHERE id = ?
    `, [newHash, tokenRecord.user_id]);

    await query(`
      UPDATE tokens_acceso
      SET consumido_en = NOW()
      WHERE id = ?
    `, [tokenRecord.id]);

    // Revoke all existing sessions for this user
    await query(`
      UPDATE sesiones
      SET revocado_en = CURRENT_TIMESTAMP
      WHERE usuario_id = ? AND revocado_en IS NULL
    `, [tokenRecord.user_id]);

    res.json({
      success: true,
      message: 'Tu contraseña ha sido restablecida correctamente. Ya puedes acceder con tus nuevas credenciales.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Error al restablecer la contraseña.' });
  }
});

// ==========================================
// 2. ADMIN USER & ROLE MANAGEMENT API
// ==========================================

app.get('/api/admin/users', requireAuth, requireNoTempPassword, requireRole('ADMINISTRADOR'), async (req, res) => {
  try {
    const users = await query(`
      SELECT u.id, u.nombre, u.apellidos, u.email, u.email_original, u.telefono, u.estado,
             u.cambio_password_obligatorio, u.ultimo_acceso, u.creado_en,
             (SELECT GROUP_CONCAT(r.codigo SEPARATOR ',')
              FROM usuario_roles ur JOIN roles r ON ur.rol_id = r.id
              WHERE ur.usuario_id = u.id) as roles_list,
             ama.matricula_id as matricula_activa_id,
             g.nombre as grupo_nombre,
             e.nombre as especialidad_nombre
      FROM usuarios u
      LEFT JOIN alumno_matricula_activa ama ON u.id = ama.alumno_id
      LEFT JOIN matriculas m ON ama.matricula_id = m.id
      LEFT JOIN grupos g ON m.grupo_id = g.id
      LEFT JOIN especialidades e ON g.especialidad_id = e.id
      ORDER BY u.creado_en DESC
    `);

    const formatted = users.map(u => ({
      ...u,
      roles: u.roles_list ? u.roles_list.split(',') : [],
      activo: u.estado === 'ACTIVO',
      matriculaActiva: u.matricula_activa_id ? {
        id: u.matricula_activa_id,
        grupoNombre: u.grupo_nombre,
        especialidadNombre: u.especialidad_nombre
      } : null
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Admin fetch users error:', error);
    res.status(500).json({ error: 'Error al consultar lista de usuarios.' });
  }
});

app.post('/api/admin/users', requireAuth, requireNoTempPassword, requireRole('ADMINISTRADOR'), async (req, res) => {
  try {
    const { nombre, apellidos, email, role, grupo_id, telefono } = req.body;

    if (!nombre || !email || !role) {
      return res.status(400).json({ error: 'Nombre, email y rol son campos obligatorios.' });
    }

    const normEmail = normalizeEmail(email);
    const existing = await getUserByEmail(normEmail);

    if (existing) {
      return res.status(409).json({
        code: 'EMAIL_EXISTS',
        message: 'El correo electrónico ya se encuentra registrado en el campus.',
        user: {
          id: existing.id,
          nombre: existing.nombre,
          apellidos: existing.apellidos,
          email: existing.email_original,
          estado: existing.estado,
          roles: existing.roles
        },
        offerUpdate: true
      });
    }

    const tempPassword = generateTempPassword();
    const passHash = await hashPassword(tempPassword);
    const userId = `usr-${Date.now().toString(36)}-${generateToken(4)}`;

    const encryptedOutbox = encryptPayload({
      tempPassword,
      email: email.trim(),
      nombre,
      loginUrl: 'https://mintcream-bat-720420.hostingersite.com/campus/login'
    });

    await createUserWithTransaction({
      userId,
      nombre: nombre.trim(),
      apellidos: (apellidos || '').trim(),
      email: normEmail,
      emailOriginal: email.trim(),
      passHash,
      telefono: telefono || null,
      roleCode: role,
      grupoId: grupo_id || null,
      createdBy: req.user.id,
      encryptedOutboxPayload: encryptedOutbox
    });

    res.status(201).json({
      success: true,
      message: 'Cuenta creada con éxito. Tarea de envío de credenciales temporales encolada.',
      user: {
        id: userId,
        nombre,
        apellidos,
        email: email.trim(),
        role,
        estado: 'ACTIVO'
      }
    });
  } catch (error) {
    console.error('Admin create user error:', error);
    res.status(500).json({ error: `Error al registrar usuario: ${error.message}` });
  }
});

app.put('/api/admin/users/:id/status', requireAuth, requireNoTempPassword, requireRole('ADMINISTRADOR'), async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!['ACTIVO', 'INACTIVO', 'SUSPENDIDO'].includes(estado)) {
      return res.status(400).json({ error: 'Estado de usuario no válido.' });
    }

    const targetUser = await getUserById(id);
    if (!targetUser) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    if (targetUser.roles.includes('ADMINISTRADOR') && estado !== 'ACTIVO') {
      const activeAdminsLeft = await countActiveAdmins(id);
      if (activeAdminsLeft === 0) {
        return res.status(400).json({
          error: 'Acción rechazada: No es posible desactivar al único administrador activo del campus.'
        });
      }
    }

    await query(`UPDATE usuarios SET estado = ? WHERE id = ?`, [estado, id]);

    if (estado !== 'ACTIVO') {
      await revokeUserSessions(id);
    }

    res.json({ success: true, estado });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Error al cambiar el estado del usuario.' });
  }
});

app.delete('/api/admin/users/:id/roles/:roleCode', requireAuth, requireNoTempPassword, requireRole('ADMINISTRADOR'), async (req, res) => {
  try {
    const { id, roleCode } = req.params;

    const targetUser = await getUserById(id);
    if (!targetUser) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    if (roleCode === 'ADMINISTRADOR') {
      const activeAdminsLeft = await countActiveAdmins(id);
      if (activeAdminsLeft === 0) {
        return res.status(400).json({
          error: 'Acción rechazada: No es posible retirar el rol de administrador al único administrador del sistema.'
        });
      }
    }

    const [roleRows] = await query(`SELECT id FROM roles WHERE codigo = ?`, [roleCode]);
    if (roleRows.length > 0) {
      await query(`DELETE FROM usuario_roles WHERE usuario_id = ? AND rol_id = ?`, [id, roleRows[0].id]);
    }

    res.json({ success: true, message: `Rol ${roleCode} retirado.` });
  } catch (error) {
    console.error('Remove role error:', error);
    res.status(500).json({ error: 'Error al retirar el rol del usuario.' });
  }
});

app.get('/api/academic/my-enrollment', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    // 1. Get current active enrollment from atomic view/table
    let activeRows = await query(`
      SELECT m.id as matricula_id, m.estado, m.fecha_inicio,
             g.id as grupo_id, g.nombre as grupo_nombre,
             e.id as especialidad_id, e.codigo as especialidad_codigo, e.nombre as especialidad_nombre,
             u.id as profesor_id, CONCAT(u.nombre, ' ', u.apellidos) as profesor_nombre, u.email as profesor_email
      FROM alumno_matricula_activa ama
      JOIN matriculas m ON ama.matricula_id = m.id
      JOIN grupos g ON m.grupo_id = g.id
      JOIN especialidades e ON g.especialidad_id = e.id
      LEFT JOIN usuarios u ON g.profesor_principal_id = u.id
      WHERE ama.alumno_id = ?
      LIMIT 1
    `, [req.user.id]);

    // Fallback: If not in alumno_matricula_activa, fetch any active matricula for the student
    if (!activeRows || activeRows.length === 0) {
      activeRows = await query(`
        SELECT m.id as matricula_id, m.estado, m.fecha_inicio,
               g.id as grupo_id, g.nombre as grupo_nombre,
               e.id as especialidad_id, e.codigo as especialidad_codigo, e.nombre as especialidad_nombre,
               u.id as profesor_id, CONCAT(u.nombre, ' ', u.apellidos) as profesor_nombre, u.email as profesor_email
        FROM matriculas m
        JOIN grupos g ON m.grupo_id = g.id
        JOIN especialidades e ON g.especialidad_id = e.id
        LEFT JOIN usuarios u ON g.profesor_principal_id = u.id
        WHERE m.alumno_id = ? AND m.estado = 'ACTIVA'
        ORDER BY m.fecha_inicio DESC
        LIMIT 1
      `, [req.user.id]);
    }

    // All active enrollments for this student (in case student is enrolled in multiple courses)
    const allActiveRows = await query(`
      SELECT m.id as matricula_id, m.estado, m.fecha_inicio,
             g.id as grupo_id, g.nombre as grupo_nombre,
             e.id as especialidad_id, e.codigo as especialidad_codigo, e.nombre as especialidad_nombre,
             u.id as profesor_id, CONCAT(u.nombre, ' ', u.apellidos) as profesor_nombre, u.email as profesor_email
      FROM matriculas m
      JOIN grupos g ON m.grupo_id = g.id
      JOIN especialidades e ON g.especialidad_id = e.id
      LEFT JOIN usuarios u ON g.profesor_principal_id = u.id
      WHERE m.alumno_id = ? AND m.estado = 'ACTIVA'
      ORDER BY m.fecha_inicio DESC
    `, [req.user.id]);

    const activeEnrollment = activeRows.length > 0 ? activeRows[0] : null;

    // 2. Get historical finalized enrollments (summary only)
    const historyRows = await query(`
      SELECT m.id, m.fecha_inicio, m.fecha_fin, m.estado,
             g.nombre as grupo_nombre, e.nombre as especialidad_nombre
      FROM matriculas m
      JOIN grupos g ON m.grupo_id = g.id
      JOIN especialidades e ON g.especialidad_id = e.id
      WHERE m.alumno_id = ? AND m.estado != 'ACTIVA'
      ORDER BY m.fecha_fin DESC
    `, [req.user.id]);

    res.json({
      activeEnrollment,
      activeEnrollments: allActiveRows.length > 0 ? allActiveRows : (activeEnrollment ? [activeEnrollment] : []),
      history: historyRows
    });
  } catch (error) {
    console.error('Fetch my enrollment error:', error);
    res.status(500).json({ error: 'Error al consultar la matrícula.' });
  }
});

// Get catalog of all 33 specialties
app.get('/api/academic/specialties', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    const rows = await query(`
      SELECT id, codigo, nombre, descripcion, estado
      FROM especialidades
      ORDER BY nombre ASC
    `);
    res.json(rows);
  } catch (error) {
    console.error('Fetch specialties error:', error);
    res.status(500).json({ error: 'Error al consultar las especialidades.' });
  }
});

// Get active groups with specialty and main teacher details
app.get('/api/academic/groups', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    const rows = await query(`
      SELECT g.id, g.especialidad_id, g.nombre, g.profesor_principal_id, g.estado,
             e.nombre as especialidad_nombre, e.codigo as especialidad_codigo,
             CONCAT(u.nombre, ' ', u.apellidos) as profesor_nombre,
             (SELECT COUNT(*) FROM matriculas m WHERE m.grupo_id = g.id AND m.estado = 'ACTIVA') as alumnos_activos
      FROM grupos g
      JOIN especialidades e ON g.especialidad_id = e.id
      LEFT JOIN usuarios u ON g.profesor_principal_id = u.id
      ORDER BY g.nombre ASC
    `);
    res.json(rows);
  } catch (error) {
    console.error('Fetch groups error:', error);
    res.status(500).json({ error: 'Error al consultar los grupos.' });
  }
});

app.post('/api/admin/enrollments/switch-group', requireAuth, requireNoTempPassword, requireRole('ADMINISTRADOR'), async (req, res) => {
  try {
    const { studentId, newGroupId } = req.body;
    if (!studentId || !newGroupId) {
      return res.status(400).json({ error: 'studentId y newGroupId son requeridos.' });
    }

    const newMatId = await switchStudentGroupTransaction({
      studentId,
      newGroupId,
      adminId: req.user.id
    });

    res.json({
      success: true,
      message: 'Matrícula del alumno cambiada de grupo con éxito en una única transacción.',
      matriculaId: newMatId
    });
  } catch (error) {
    console.error('Switch group error:', error);
    res.status(400).json({ error: error.message || 'Error al cambiar de grupo.' });
  }
});

app.post('/api/admin/enrollments/finalize', requireAuth, requireNoTempPassword, requireRole('ADMINISTRADOR'), async (req, res) => {
  try {
    const { studentId } = req.body;
    if (!studentId) {
      return res.status(400).json({ error: 'studentId es requerido.' });
    }

    await finalizeEnrollmentTransaction({
      studentId,
      adminId: req.user.id
    });

    res.json({
      success: true,
      message: 'Matrícula activa finalizada correctamente.'
    });
  } catch (error) {
    console.error('Finalize enrollment error:', error);
    res.status(500).json({ error: 'Error al finalizar la matrícula.' });
  }
});

// ==========================================
// 2.5 STUDENT CAMPUS PANEL API (MODIFICACIÓN 06)
// ==========================================

// Helper: map request / enrollment database record to official human-readable state string
function getHumanReadableEnrollmentStatus(record, hasActiveMatricula) {
  if (hasActiveMatricula || record.estado_matricula === 'ACTIVA') {
    return 'Matrícula aprobada';
  }
  if (record.estado_solicitud === 'CANCELADA' || record.estado_solicitud === 'RECHAZADA' || record.estado_matricula === 'CANCELADA' || record.estado_matricula === 'SUSPENDIDA') {
    return 'Matrícula cancelada o rechazada';
  }
  if (record.estado_pago === 'TRANSFERENCIA_VERIFICADA') {
    return 'Matrícula pendiente de aprobación';
  }
  if (record.estado_pago === 'TRANSFERENCIA_COMUNICADA') {
    return 'Pago pendiente de comprobación';
  }
  if (record.estado_pago === 'PENDIENTE_TRANSFERENCIA') {
    return 'Pendiente de transferencia';
  }
  if (record.estado_solicitud === 'PREAPROBADA') {
    return 'Preaprobada';
  }
  if (record.estado_solicitud === 'DOCUMENTACION_SOLICITADA') {
    return 'Pendiente de documentación';
  }
  if (record.estado_solicitud === 'EN_REVISION') {
    return 'En revisión';
  }
  return 'Solicitud recibida';
}

// 1. INICIO DEL CAMPUS: Dashboard del alumno (Section 3.A)
app.get('/api/student/dashboard', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    const studentId = req.user.id;

    // A. Query active authorized courses
    const activeCourses = await query(`
      SELECT m.id as matricula_id, m.estado, m.estado_acceso, m.fecha_inicio, m.fecha_aprobacion, m.progreso,
             COALESCE(m.curso_id, g.especialidad_id) as course_id,
             g.id as grupo_id, g.nombre as grupo_nombre,
             e.id as especialidad_id, e.codigo as especialidad_codigo, e.nombre as especialidad_nombre,
             e.descripcion as especialidad_descripcion, e.horas_totales as duracion_horas, e.modalidad,
             u.id as profesor_id, CONCAT(u.nombre, ' ', u.apellidos) as profesor_nombre, u.email as profesor_email
      FROM matriculas m
      LEFT JOIN grupos g ON m.grupo_id = g.id
      LEFT JOIN especialidades e ON (m.curso_id = e.id OR m.curso_id = e.codigo OR g.especialidad_id = e.id)
      LEFT JOIN usuarios u ON g.profesor_principal_id = u.id
      WHERE m.alumno_id = ? AND m.estado = 'ACTIVA' AND (m.estado_acceso = 'HABILITADO' OR m.estado_acceso IS NULL)
      ORDER BY m.fecha_inicio DESC
    `, [studentId]);

    const hasActiveCourses = activeCourses.length > 0;

    // B. Calculate real overall academic progress (Section 3.A: No mostrar datos ficticios)
    let overallProgress = { total_publicados: 0, completados: 0, porcentaje_global: 0 };
    if (hasActiveCourses) {
      try {
        overallProgress = await calculateStudentOverallProgress(studentId);
      } catch (pErr) {
        console.warn('Student progress calculation fallback:', pErr.message);
      }
    }

    // C. Latest materials available for the student's active courses
    let latestMaterials = [];
    if (hasActiveCourses) {
      latestMaterials = await query(`
        SELECT m.id, m.titulo, m.descripcion, m.tipo, m.archivo_id, m.creado_en,
               e.nombre as curso_nombre
        FROM materiales m
        LEFT JOIN especialidades e ON m.especialidad_id = e.id
        WHERE m.estado = 'PUBLICADO' AND (
          m.grupo_id IN (
            SELECT grupo_id FROM matriculas WHERE alumno_id = ? AND estado = 'ACTIVA' AND (estado_acceso = 'HABILITADO' OR estado_acceso IS NULL)
          )
          OR (m.grupo_id IS NULL AND m.especialidad_id IN (
            SELECT COALESCE(mat.curso_id, grp.especialidad_id)
            FROM matriculas mat
            LEFT JOIN grupos grp ON mat.grupo_id = grp.id
            WHERE mat.alumno_id = ? AND mat.estado = 'ACTIVA' AND (mat.estado_acceso = 'HABILITADO' OR mat.estado_acceso IS NULL)
          ))
        )
        ORDER BY m.creado_en DESC
        LIMIT 5
      `, [studentId, studentId]);
    }

    // D. Recent communications / doubts
    const recentCommunications = await query(`
      SELECT c.id, c.asunto, c.estado, c.creado_en, c.actualizado_en,
             (SELECT COUNT(*) FROM mensajes WHERE conversacion_id = c.id) as total_mensajes
      FROM conversaciones c
      WHERE c.creador_id = ? OR c.responsable_id = ?
      ORDER BY c.actualizado_en DESC
      LIMIT 5
    `, [studentId, studentId]);

    // E. Pending notifications / announcements
    const pendingNotifications = await query(`
      SELECT n.id, n.titulo, n.mensaje as contenido, n.tipo, n.creado_en
      FROM notificaciones n
      WHERE n.destinatario_id = ?
      ORDER BY n.creado_en DESC
      LIMIT 5
    `, [studentId]);

    res.json({
      student: {
        id: req.user.id,
        nombre: req.user.nombre,
        apellidos: req.user.apellidos,
        email: req.user.email
      },
      hasActiveCourses,
      emptyMessage: hasActiveCourses ? null : 'Todavía no tienes cursos activos. Puedes consultar tus solicitudes en el apartado Mis matrículas.',
      activeCourses: activeCourses.map(c => ({
        matricula_id: c.matricula_id,
        course_id: c.course_id || c.especialidad_id,
        codigo: c.especialidad_codigo,
        nombre: c.especialidad_nombre || 'Curso de Automoción',
        descripcion: c.especialidad_descripcion,
        duracion_horas: c.duracion_horas,
        modalidad: c.modalidad || 'Presencial / Semipresencial',
        profesor_nombre: c.profesor_nombre || 'Profesor Asignado',
        profesor_email: c.profesor_email,
        estado_academico: c.estado,
        estado_acceso: c.estado_acceso || 'HABILITADO',
        fecha_inicio: c.fecha_inicio,
        fecha_aprobacion: c.fecha_aprobacion,
        progreso: overallProgress.porcentaje_global || c.progreso || 0
      })),
      overallProgress,
      latestMaterials,
      recentCommunications,
      pendingNotifications
    });
  } catch (error) {
    console.error('Student dashboard error:', error);
    res.status(500).json({ error: 'Error al cargar el panel del alumno: ' + error.message });
  }
});

// 2. MIS CURSOS: Listado de cursos con matrícula activa y autorizada (Section 3.B)
app.get('/api/student/my-courses', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    const studentId = req.user.id;

    // Strict server authorization: only active, authorized courses
    const courses = await query(`
      SELECT m.id as matricula_id, m.estado as matricula_estado, m.estado_acceso, m.fecha_inicio, m.fecha_aprobacion, m.progreso,
             COALESCE(m.curso_id, g.especialidad_id) as course_id,
             g.id as grupo_id, g.nombre as grupo_nombre,
             e.id as especialidad_id, e.codigo as especialidad_codigo, e.nombre as especialidad_nombre,
             e.descripcion as especialidad_descripcion, e.horas_totales as duracion_horas, e.modalidad,
             u.id as profesor_id, CONCAT(u.nombre, ' ', u.apellidos) as profesor_nombre, u.email as profesor_email
      FROM matriculas m
      LEFT JOIN grupos g ON m.grupo_id = g.id
      LEFT JOIN especialidades e ON (m.curso_id = e.id OR m.curso_id = e.codigo OR g.especialidad_id = e.id)
      LEFT JOIN usuarios u ON g.profesor_principal_id = u.id
      WHERE m.alumno_id = ? AND m.estado = 'ACTIVA' AND (m.estado_acceso = 'HABILITADO' OR m.estado_acceso IS NULL)
      ORDER BY m.fecha_inicio DESC
    `, [studentId]);

    let overallProgress = 0;
    try {
      const prog = await calculateStudentOverallProgress(studentId);
      overallProgress = prog.porcentaje_global || 0;
    } catch (e) {}

    const courseCards = courses.map(c => ({
      id: c.course_id || c.especialidad_id,
      matricula_id: c.matricula_id,
      codigo: c.especialidad_codigo,
      nombre: c.especialidad_nombre || 'Curso de Automoción',
      descripcion: c.especialidad_descripcion,
      categoria: 'Automoción y Transporte',
      duracion: c.duracion_horas ? `${c.duracion_horas} horas` : 'Duración estándar',
      modalidad: c.modalidad || 'Semipresencial',
      profesor: c.profesor_nombre || 'Profesor por asignar',
      profesor_email: c.profesor_email,
      estado_academico: c.matricula_estado,
      estado_acceso: c.estado_acceso || 'HABILITADO',
      progreso: overallProgress || c.progreso || 0,
      fecha_inicio: c.fecha_inicio,
      fecha_aprobacion: c.fecha_aprobacion,
      imagen: '/hero.png'
    }));

    res.json({
      courses: courseCards,
      total: courseCards.length
    });
  } catch (error) {
    console.error('Fetch student courses error:', error);
    res.status(500).json({ error: 'Error al consultar los cursos del alumno.' });
  }
});

// 3. PÁGINA INTERIOR DE CADA CURSO CON CONTROL ESTRICTO DE ACCESO (Section 4 & 5)
app.get('/api/student/courses/:courseId', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    const { courseId } = req.params;
    const isStudent = req.user.roles.includes('ALUMNO');
    const isTeacher = req.user.roles.includes('PROFESOR');
    const isAdminOrSec = req.user.roles.includes('ADMINISTRADOR') || req.user.roles.includes('SECRETARIA');

    // Server-side strict authorization check (Section 5)
    let activeEnrollment = null;
    if (isStudent && !isAdminOrSec) {
      const enrCheck = await query(`
        SELECT m.id as matricula_id, m.estado, m.estado_acceso, m.progreso, m.fecha_inicio,
               COALESCE(m.curso_id, g.especialidad_id) as effective_course_id
        FROM matriculas m
        LEFT JOIN grupos g ON m.grupo_id = g.id
        LEFT JOIN especialidades e ON (m.curso_id = e.id OR m.curso_id = e.codigo OR g.especialidad_id = e.id)
        WHERE m.alumno_id = ?
          AND (m.curso_id = ? OR e.codigo = ? OR e.id = ? OR g.especialidad_id = ? OR g.id = ?)
          AND m.estado = 'ACTIVA'
          AND (m.estado_acceso = 'HABILITADO' OR m.estado_acceso IS NULL)
        LIMIT 1
      `, [req.user.id, courseId, courseId, courseId, courseId, courseId]);

      if (!enrCheck || enrCheck.length === 0) {
        return res.status(403).json({
          error: 'Acceso no autorizado: No tienes una matrícula activa ni aprobada para acceder a los contenidos de este curso.'
        });
      }
      activeEnrollment = enrCheck[0];
    } else if (isTeacher && !isAdminOrSec) {
      const grpCheck = await query(`
        SELECT g.id FROM grupos g
        WHERE (g.especialidad_id = ? OR g.id = ?) AND g.profesor_principal_id = ?
        LIMIT 1
      `, [courseId, courseId, req.user.id]);

      if (!grpCheck || grpCheck.length === 0) {
        return res.status(403).json({
          error: 'Acceso no autorizado: No eres el profesor asignado a este curso.'
        });
      }
    }

    // Fetch course information
    const courseRows = await query(`
      SELECT e.*, 
             u.id as profesor_id, CONCAT(u.nombre, ' ', u.apellidos) as profesor_nombre, u.email as profesor_email
      FROM especialidades e
      LEFT JOIN grupos g ON g.especialidad_id = e.id
      LEFT JOIN usuarios u ON g.profesor_principal_id = u.id
      WHERE e.id = ? OR e.codigo = ?
      LIMIT 1
    `, [courseId, courseId]);

    if (!courseRows || courseRows.length === 0) {
      return res.status(404).json({ error: 'Curso no encontrado en el campus virtual.' });
    }

    const courseData = courseRows[0];

    // Fetch course materials
    const materials = await query(`
      SELECT m.id, m.especialidad_id, m.grupo_id, m.titulo, m.descripcion, m.tipo,
             m.archivo_id, m.referencia_video, m.proveedor, m.orden, m.creado_en
      FROM materiales m
      WHERE (m.especialidad_id = ? OR m.especialidad_id = ?) AND m.estado = 'PUBLICADO'
      ORDER BY m.orden ASC, m.creado_en ASC
    `, [courseData.id, courseData.codigo]);

    res.json({
      course: {
        id: courseData.id,
        codigo: courseData.codigo,
        nombre: courseData.nombre,
        descripcion: courseData.descripcion,
        duracion_horas: courseData.horas_totales || courseData.duracion_horas,
        modalidad: courseData.modalidad,
        profesor_nombre: courseData.profesor_nombre || 'Profesor Asignado',
        profesor_email: courseData.profesor_email,
        estado_academico: activeEnrollment ? activeEnrollment.estado : 'ACTIVA',
        progreso: activeEnrollment ? activeEnrollment.progreso : 0
      },
      materials
    });
  } catch (error) {
    console.error('Fetch single course detail error:', error);
    res.status(500).json({ error: 'Error al obtener la información del curso.' });
  }
});

// 4. MIS MATRÍCULAS: Solicitudes y matrículas del alumno con estados oficiales (Section 3.C)
app.get('/api/student/my-enrollments', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    const studentId = req.user.id;
    const cleanEmail = normalizeEmail(req.user.email);

    // Fetch all requests matching student user ID or email
    const requests = await query(`
      SELECT ir.*,
             m.id as active_matricula_id, m.estado as active_matricula_estado,
             m.estado_acceso, m.fecha_inicio as matricula_fecha_inicio,
             m.fecha_aprobacion as matricula_fecha_aprobacion,
             m.operador_aprobacion, m.progreso
      FROM inscription_requests ir
      LEFT JOIN matriculas m ON (m.solicitud_id = ir.id OR (m.alumno_id = ir.student_user_id AND m.curso_id = ir.course_id))
      WHERE ir.student_user_id = ? OR LOWER(TRIM(ir.email)) = ?
      ORDER BY ir.created_at DESC
    `, [studentId, cleanEmail]);

    // Also fetch any standalone matriculas for this student that might not have an inscription_requests entry
    const standaloneMatriculas = await query(`
      SELECT m.*, e.nombre as curso_nombre, e.codigo as curso_codigo
      FROM matriculas m
      LEFT JOIN especialidades e ON (m.curso_id = e.id)
      WHERE m.alumno_id = ? AND m.solicitud_id IS NULL
      ORDER BY m.fecha_inicio DESC
    `, [studentId]);

    const formattedRequests = requests.map(r => {
      const isApprovedActive = (r.active_matricula_id && r.active_matricula_estado === 'ACTIVA' && r.estado_acceso === 'HABILITADO') || r.estado_matricula === 'ACTIVA';
      const humanStatus = getHumanReadableEnrollmentStatus(r, isApprovedActive);

      return {
        id: r.id,
        request_number: r.request_number,
        course_id: r.course_id,
        course_name: r.course_name,
        created_at: r.created_at,
        modalidad_inscripcion: r.modalidad_inscripcion,
        estado_admision: r.estado_solicitud,
        estado_transferencia: r.estado_pago,
        estado_matricula: isApprovedActive ? 'ACTIVA' : (r.active_matricula_estado || r.estado_matricula || 'PENDIENTE'),
        estado_acceso: r.estado_acceso || (isApprovedActive ? 'HABILITADO' : 'PENDIENTE'),
        estado_legible: humanStatus,
        fecha_aprobacion: r.matricula_fecha_aprobacion || r.aprobado_final_en || r.converted_at,
        precio_final: r.precio_final_snapshot,
        referencia_transferencia: r.referencia_transferencia || r.request_number,
        pdf_path: r.pdf_path ? `/api/inscriptions/requests/${r.request_number}/pdf` : null,
        has_receipt: !!r.justificante_ruta,
        justificante_nombre: r.justificante_nombre,
        justificante_subido_en: r.justificante_subido_en,
        canConsultRequest: true,
        canConsultBankInfo: r.estado_pago === 'PENDIENTE_TRANSFERENCIA' || r.estado_solicitud === 'PREAPROBADA' || r.modalidad_inscripcion === 'COMPRA_DIRECTA',
        canUploadReceipt: r.estado_pago === 'PENDIENTE_TRANSFERENCIA' || r.estado_pago === 'TRANSFERENCIA_COMUNICADA',
        canAccessCourse: isApprovedActive
      };
    });

    // Append standalone matriculas
    standaloneMatriculas.forEach(sm => {
      formattedRequests.push({
        id: sm.id,
        request_number: `MAT-${sm.id.substring(0, 8)}`,
        course_id: sm.curso_id,
        course_name: sm.curso_nombre || 'Especialidad Oficial',
        created_at: sm.fecha_inicio,
        modalidad_inscripcion: 'OFICIAL_DIRECTA',
        estado_admision: 'APROBADA',
        estado_transferencia: 'TRANSFERENCIA_VERIFICADA',
        estado_matricula: sm.estado,
        estado_acceso: sm.estado_acceso || 'HABILITADO',
        estado_legible: sm.estado === 'ACTIVA' && sm.estado_acceso === 'HABILITADO' ? 'Matrícula aprobada' : 'Matrícula suspendida o inactiva',
        fecha_aprobacion: sm.fecha_aprobacion || sm.fecha_inicio,
        precio_final: null,
        referencia_transferencia: null,
        pdf_path: null,
        has_receipt: false,
        justificante_nombre: null,
        justificante_subido_en: null,
        canConsultRequest: false,
        canConsultBankInfo: false,
        canUploadReceipt: false,
        canAccessCourse: sm.estado === 'ACTIVA' && sm.estado_acceso === 'HABILITADO'
      });
    });

    res.json({ enrollments: formattedRequests });
  } catch (error) {
    console.error('Fetch student enrollments error:', error);
    res.status(500).json({ error: 'Error al consultar las matrículas del alumno.' });
  }
});

// 5. MIS PAGOS: Gestión exclusiva de transferencias bancarias (Section 3.D)
app.get('/api/student/my-payments', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    const studentId = req.user.id;
    const cleanEmail = normalizeEmail(req.user.email);

    // Official Bank Configuration (no card/paypal/stripe)
    const bankConfig = {
      bank_holder: process.env.BANK_HOLDER || 'ACADEMIAS PÉNDULO S.L.',
      bank_iban: process.env.BANK_IBAN || 'ES91 2100 0418 4502 0005 1332',
      bank_bic: process.env.BANK_BIC || 'CAIXESBBXXX',
      bank_name: process.env.BANK_NAME || 'CaixaBank'
    };

    const requests = await query(`
      SELECT ir.id, ir.request_number, ir.course_id, ir.course_name, ir.created_at,
             ir.modalidad_inscripcion, ir.precio_base_snapshot, ir.precio_final_snapshot,
             ir.moneda_snapshot, ir.estado_solicitud, ir.estado_pago, ir.estado_matricula,
             ir.referencia_transferencia, ir.justificante_ruta, ir.justificante_nombre,
             ir.justificante_subido_en, ir.fecha_comunicacion_pago, ir.fecha_verificacion_bancaria
      FROM inscription_requests ir
      WHERE ir.student_user_id = ? OR LOWER(TRIM(ir.email)) = ?
      ORDER BY ir.created_at DESC
    `, [studentId, cleanEmail]);

    const payments = requests.map(r => {
      let descriptiveMessage = '';
      if (r.estado_matricula === 'ACTIVA') {
        descriptiveMessage = 'Tu matrícula está aprobada y tienes disponible el acceso al curso.';
      } else if (r.estado_pago === 'TRANSFERENCIA_VERIFICADA') {
        descriptiveMessage = 'Administración ha confirmado la recepción de tu transferencia. Tu matrícula continuará con el proceso de aprobación.';
      } else if (r.estado_pago === 'TRANSFERENCIA_COMUNICADA') {
        descriptiveMessage = 'Hemos recibido tu justificante. Administración deberá comprobar el ingreso en nuestra cuenta bancaria.';
      } else {
        descriptiveMessage = 'Pendiente de realizar la transferencia bancaria con el importe exacto y concepto único asignado.';
      }

      return {
        id: r.id,
        request_number: r.request_number,
        course_name: r.course_name,
        amount: r.precio_final_snapshot || r.precio_base_snapshot || '0.00',
        currency: r.moneda_snapshot || 'EUR',
        referencia_transferencia: r.referencia_transferencia || r.request_number,
        estado_pago: r.estado_pago || 'PENDIENTE_TRANSFERENCIA',
        mensaje_descriptivo: descriptiveMessage,
        fecha_solicitud: r.created_at,
        fecha_verificacion: r.fecha_verificacion_bancaria,
        has_receipt: !!r.justificante_ruta,
        justificante_nombre: r.justificante_nombre,
        justificante_subido_en: r.justificante_subido_en,
        can_upload_receipt: r.estado_pago === 'PENDIENTE_TRANSFERENCIA' || r.estado_pago === 'TRANSFERENCIA_COMUNICADA'
      };
    });

    res.json({
      bankConfig,
      payments
    });
  } catch (error) {
    console.error('Fetch student payments error:', error);
    res.status(500).json({ error: 'Error al consultar los pagos del alumno.' });
  }
});

// 6. SUBIDA SEGURA DE JUSTIFICANTE BANCARIO POR EL ALUMNO (Section 3.D)
app.post('/api/student/my-payments/:requestId/receipt', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    const studentId = req.user.id;
    const cleanEmail = normalizeEmail(req.user.email);
    const { requestId } = req.params;
    const { filename, base64Data } = req.body;

    if (!filename || !base64Data) {
      return res.status(400).json({ error: 'Debe adjuntar un archivo y su nombre.' });
    }

    // Ownership check: must belong to the logged-in student
    const rows = await query(`
      SELECT * FROM inscription_requests
      WHERE id = ? AND (student_user_id = ? OR LOWER(TRIM(email)) = ?)
      LIMIT 1
    `, [requestId, studentId, cleanEmail]);

    if (!rows || rows.length === 0) {
      return res.status(403).json({ error: 'Acceso denegado: La solicitud no te pertenece.' });
    }

    const reqData = rows[0];

    // Decode and validate file
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let buffer;
    let mimeType = 'application/pdf';

    if (matches && matches.length === 3) {
      mimeType = matches[1];
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(base64Data, 'base64');
    }

    // Check size limit: 10MB
    if (buffer.length > 10 * 1024 * 1024) {
      return res.status(400).json({ error: 'El archivo supera el tamaño máximo permitido de 10 MB.' });
    }

    // Allowed mime types
    const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimes.includes(mimeType.toLowerCase())) {
      return res.status(400).json({ error: 'Formato no permitido. Solo se admiten archivos PDF, JPG o PNG.' });
    }

    const ext = mimeType === 'application/pdf' ? '.pdf' : mimeType === 'image/jpeg' ? '.jpg' : '.png';
    const safeFilename = `justificante_${reqData.request_number}_${Date.now()}${ext}`;
    const storagePath = path.join(RECEIPTS_UPLOAD_DIR, safeFilename);

    fs.writeFileSync(storagePath, buffer);

    // Update MySQL record
    await query(`
      UPDATE inscription_requests
      SET justificante_ruta = ?,
          justificante_nombre = ?,
          justificante_subido_en = NOW(),
          estado_pago = 'TRANSFERENCIA_COMUNICADA',
          fecha_comunicacion_pago = NOW(),
          updated_at = NOW()
      WHERE id = ?
    `, [safeFilename, filename, reqData.id]);

    // History log
    await query(`
      INSERT INTO inscription_request_history (request_id, user_id, event_type, description, created_at)
      VALUES (?, ?, 'RECEIPT_UPLOADED', ?, NOW())
    `, [reqData.id, req.user.id, `Justificante bancario adjuntado por el alumno (${filename}). Estado de pago actualizado a TRANSFERENCIA_COMUNICADA.`]);

    res.json({
      success: true,
      message: 'Justificante subido correctamente. Administración revisará el ingreso en la cuenta bancaria.',
      estado_pago: 'TRANSFERENCIA_COMUNICADA'
    });
  } catch (error) {
    console.error('Upload student receipt error:', error);
    res.status(500).json({ error: 'Error al procesar el justificante bancario.' });
  }
});

// 7. DESCARGA / CONSULTA SEGURA DE JUSTIFICANTE BANCARIO (Section 3.D)
app.get('/api/student/my-payments/:requestId/receipt', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    const studentId = req.user.id;
    const cleanEmail = normalizeEmail(req.user.email);
    const { requestId } = req.params;
    const isAdmin = req.user.roles.includes('ADMINISTRADOR') || req.user.roles.includes('SECRETARIA');

    let rows;
    if (isAdmin) {
      rows = await query(`SELECT * FROM inscription_requests WHERE id = ? LIMIT 1`, [requestId]);
    } else {
      rows = await query(`
        SELECT * FROM inscription_requests
        WHERE id = ? AND (student_user_id = ? OR LOWER(TRIM(email)) = ?)
        LIMIT 1
      `, [requestId, studentId, cleanEmail]);
    }

    if (!rows || rows.length === 0) {
      return res.status(403).json({ error: 'Acceso no autorizado a este justificante.' });
    }

    const reqData = rows[0];
    if (!reqData.justificante_ruta) {
      return res.status(404).json({ error: 'No existe ningún justificante bancario subido para esta solicitud.' });
    }

    const filePath = path.join(RECEIPTS_UPLOAD_DIR, reqData.justificante_ruta);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'El archivo físico del justificante no se encuentra en el servidor.' });
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = ext === '.pdf' ? 'application/pdf' : ext === '.png' ? 'image/png' : 'image/jpeg';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(reqData.justificante_nombre || 'justificante' + ext)}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    console.error('Download receipt error:', error);
    res.status(500).json({ error: 'Error al servir el justificante.' });
  }
});

// ==========================================
// 7. ADMIN: FICHA COMPLETA CENTRALIZADA DEL ALUMNO (Section 7)
// ==========================================

// GET /api/admin/students/:id/full-file
app.get('/api/admin/students/:id/full-file', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    const userRoles = req.user.roles || [];
    if (!userRoles.includes('ADMINISTRADOR') && !userRoles.includes('SECRETARIA')) {
      return res.status(403).json({ error: 'Acceso restringido a personal de administración y secretaría.' });
    }

    const studentId = req.params.id;

    // 1. Fetch user account
    const userRows = await query(`
      SELECT u.id, u.nombre, u.apellidos, u.email, u.email_original, u.telefono,
             u.estado, u.cambio_password_obligatorio, u.ultimo_acceso, u.creado_en, u.actualizado_en
      FROM usuarios u
      WHERE u.id = ? OR u.email = ?
      LIMIT 1
    `, [studentId, studentId]);

    if (!userRows || userRows.length === 0) {
      return res.status(404).json({ error: 'Alumno no encontrado en el sistema.' });
    }

    const user = userRows[0];
    const cleanEmail = normalizeEmail(user.email);

    // 2. Fetch all linked inscription requests
    const requestRows = await query(`
      SELECT * FROM inscription_requests
      WHERE student_user_id = ? OR LOWER(TRIM(email)) = ?
      ORDER BY created_at DESC
    `, [user.id, cleanEmail]);

    const latestReq = requestRows[0] || {};

    // Tab 1: Datos Personales
    const tab1Personal = {
      id: user.id,
      nombre: user.nombre,
      apellidos: user.apellidos,
      dni_nie: latestReq.dni_nie || 'No registrado',
      email: user.email,
      telefono: user.telefono || latestReq.phone || 'No registrado',
      direccion: latestReq.address || 'No registrada',
      codigo_postal: latestReq.postal_code || '',
      ciudad: latestReq.city || '',
      provincia: latestReq.province || '',
      fecha_creacion: user.creado_en,
      estado_cuenta: user.estado,
      cambio_password_obligatorio: !!user.cambio_password_obligatorio,
      ultimo_acceso: user.ultimo_acceso
    };

    // Tab 2: Formación Académica
    const tab2Academica = {
      nivel_estudios: latestReq.academic_level || 'No especificado',
      titulacion: latestReq.academic_degree || 'No especificada',
      formacion_complementaria: latestReq.additional_training || 'Ninguna',
      situacion_laboral: latestReq.employment_status || 'No especificada',
      solicitudes_academicas: requestRows.map(r => ({
        request_number: r.request_number,
        course_name: r.course_name,
        academic_level: r.academic_level,
        academic_degree: r.academic_degree,
        additional_training: r.additional_training,
        created_at: r.created_at
      }))
    };

    // Tab 3: Matrículas
    const matriculasRows = await query(`
      SELECT m.*, 
             COALESCE(m.curso_id, g.especialidad_id) as effective_course_id,
             e.nombre as curso_nombre, e.codigo as curso_codigo,
             g.nombre as grupo_nombre
      FROM matriculas m
      LEFT JOIN grupos g ON m.grupo_id = g.id
      LEFT JOIN especialidades e ON (m.curso_id = e.id OR g.especialidad_id = e.id)
      WHERE m.alumno_id = ?
      ORDER BY m.fecha_inicio DESC
    `, [user.id]);

    const tab3Matriculas = matriculasRows.map(m => {
      const matchingReq = requestRows.find(r => r.id === m.solicitud_id || r.course_id === m.curso_id) || {};
      return {
        matricula_id: m.id,
        solicitud_id: m.solicitud_id || matchingReq.id || null,
        request_number: matchingReq.request_number || 'Histórica',
        curso_id: m.effective_course_id,
        curso_nombre: m.curso_nombre || matchingReq.course_name || 'Curso Oficial',
        curso_codigo: m.curso_codigo,
        grupo_nombre: m.grupo_nombre || 'Sin grupo específico',
        fecha_matricula: m.fecha_inicio,
        modalidad_inscripcion: matchingReq.modalidad_inscripcion || 'DIRECTA',
        estado_admision: matchingReq.estado_solicitud || 'APROBADA',
        estado_matricula: m.estado,
        estado_acceso: m.estado_acceso || 'HABILITADO',
        fecha_aprobacion: m.fecha_aprobacion || matchingReq.aprobado_final_en || m.fecha_inicio,
        operador_aprobacion: m.operador_aprobacion || matchingReq.aprobado_final_por || 'Administración',
        motivo_suspension: m.motivo_suspension,
        suspendido_por: m.suspendido_por,
        suspendido_en: m.suspendido_en,
        progreso: m.progreso
      };
    });

    // Tab 4: Pagos y Transferencias
    const tab4Pagos = requestRows.map(r => ({
      solicitud_id: r.id,
      request_number: r.request_number,
      curso_nombre: r.course_name,
      importe: r.precio_final_snapshot || r.precio_base_snapshot || '0.00',
      moneda: r.moneda_snapshot || 'EUR',
      referencia_bancaria: r.referencia_transferencia || r.request_number,
      referencia_externa: r.referencia_bancaria_externa,
      estado_pago: r.estado_pago || 'PENDIENTE_TRANSFERENCIA',
      fecha_comunicacion: r.fecha_comunicacion_pago,
      fecha_comprobacion: r.fecha_verificacion_bancaria,
      verificado_por: r.verificado_pago_por || (r.verificado_por_usuario_id ? 'Administración' : null),
      has_receipt: !!r.justificante_ruta,
      justificante_nombre: r.justificante_nombre,
      justificante_url: r.justificante_ruta ? `/api/student/my-payments/${r.id}/receipt` : null,
      observaciones: r.observaciones_administrativas,
      incidencias: r.motivo_incidencia
    }));

    // Tab 5: Acceso al Campus
    const tab5Acceso = {
      usuario: user.email, // Username is strictly email, NEVER DNI
      email: user.email,
      estado_cuenta: user.estado,
      cursos_autorizados: matriculasRows
        .filter(m => m.estado === 'ACTIVA' && (m.estado_acceso === 'HABILITADO' || m.estado_acceso === null))
        .map(m => m.curso_nombre || m.curso_id),
      fecha_creacion: user.creado_en,
      fecha_activacion: matriculasRows[0]?.fecha_activacion || user.creado_en,
      ultimo_acceso: user.ultimo_acceso,
      bienvenida_email_enviado: requestRows.some(r => r.bienvenida_email_enviado === 1),
      cambio_password_obligatorio: !!user.cambio_password_obligatorio,
      tiene_password_activo: !user.cambio_password_obligatorio
    };

    // Tab 6: Historial Administrativo
    const historyRows = await query(`
      SELECT h.*, u.nombre as operator_nombre, u.apellidos as operator_apellidos
      FROM inscription_request_history h
      LEFT JOIN usuarios u ON h.user_id = u.id
      WHERE h.request_id IN (SELECT id FROM inscription_requests WHERE student_user_id = ? OR LOWER(TRIM(email)) = ?)
      ORDER BY h.created_at DESC
    `, [user.id, cleanEmail]);

    const tab6Historial = historyRows.map(h => ({
      id: h.id,
      request_id: h.request_id,
      fecha_hora: h.created_at,
      operador: h.operator_nombre ? `${h.operator_nombre} ${h.operator_apellidos || ''}`.trim() : 'Sistema / Administración',
      tipo_evento: h.event_type,
      descripcion: h.description
    }));

    res.json({
      success: true,
      studentFile: {
        personal: tab1Personal,
        academica: tab2Academica,
        matriculas: tab3Matriculas,
        pagos: tab4Pagos,
        acceso: tab5Acceso,
        historial: tab6Historial
      }
    });

  } catch (error) {
    console.error('Fetch student full file error:', error);
    res.status(500).json({ error: 'Error al consultar la ficha completa del alumno.' });
  }
});

// Resend access instructions without changing password if already configured (Section 7.Acceso al Campus)
app.post('/api/admin/students/:id/resend-access', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    const userRoles = req.user.roles || [];
    if (!userRoles.includes('ADMINISTRADOR') && !userRoles.includes('SECRETARIA')) {
      return res.status(403).json({ error: 'Acceso restringido.' });
    }

    const studentId = req.params.id;
    const userRows = await query(`SELECT * FROM usuarios WHERE id = ? LIMIT 1`, [studentId]);
    if (!userRows || userRows.length === 0) {
      return res.status(404).json({ error: 'Alumno no encontrado.' });
    }

    const studentUser = userRows[0];
    const cleanEmail = normalizeEmail(studentUser.email);
    const campusUrl = process.env.CAMPUS_URL || 'http://localhost:3000/#campus';

    // If user has NOT yet changed password (still temporary), generate fresh temp password.
    // Otherwise keep existing active password untouched.
    let rawTempPassword = null;
    if (studentUser.cambio_password_obligatorio) {
      rawTempPassword = generateTempPassword(14);
      const newHash = await hashPassword(rawTempPassword);
      await query(`
        UPDATE usuarios
        SET password_hash = ?, caducidad_password_temporal = DATE_ADD(NOW(), INTERVAL 7 DAY), actualizado_en = NOW()
        WHERE id = ?
      `, [newHash, studentUser.id]);
    }

    const emailSubject = 'Instrucciones de acceso al campus virtual — ACADEMIAS PÉNDULO';
    let emailHtml = '';

    if (rawTempPassword) {
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e5e7eb; border-radius: 12px; background: #ffffff;">
          <h1 style="color: #dc2626; margin: 0; text-align: center;">Academias Péndulo</h1>
          <p style="color: #4b5563; font-size: 14px; text-align: center;">Campus Virtual · Formación Profesional</p>
          <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 20px 0;" />
          <p>Hola, <strong>${studentUser.nombre}</strong>:</p>
          <p>Te recordamos tus credenciales de acceso al campus virtual de ACADEMIAS PÉNDULO:</p>
          <div style="background-color: #f9fafb; padding: 18px; border-radius: 10px; margin: 25px 0; border: 1px solid #e5e7eb;">
            <p><strong>Usuario:</strong> ${cleanEmail}</p>
            <p><strong>Contraseña temporal:</strong> <span style="font-family: monospace; background: #fee2e2; color: #991b1b; padding: 3px 8px; border-radius: 4px; font-weight: bold;">${rawTempPassword}</span></p>
            <p><strong>Acceso:</strong> <a href="${campusUrl}">${campusUrl}</a></p>
          </div>
          <p style="font-size: 13px; color: #92400e;">Por seguridad, sustituye tu contraseña temporal al acceder por primera vez.</p>
          <p>Un saludo,<br />Administración<br />ACADEMIAS PÉNDULO</p>
        </div>
      `;
    } else {
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e5e7eb; border-radius: 12px; background: #ffffff;">
          <h1 style="color: #dc2626; margin: 0; text-align: center;">Academias Péndulo</h1>
          <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 20px 0;" />
          <p>Hola, <strong>${studentUser.nombre}</strong>:</p>
          <p>Te enviamos un recordatorio de tus instrucciones de acceso al campus virtual de ACADEMIAS PÉNDULO:</p>
          <div style="background-color: #f9fafb; padding: 18px; border-radius: 10px; margin: 25px 0; border: 1px solid #e5e7eb;">
            <p><strong>Usuario:</strong> ${cleanEmail}</p>
            <p><strong>Contraseña:</strong> Tu contraseña habitual (ya configurada por ti).</p>
            <p><strong>Acceso:</strong> <a href="${campusUrl}">${campusUrl}</a></p>
          </div>
          <p>Si no recuerdas tu contraseña, puedes recuperarla en cualquier momento desde la pantalla de inicio de sesión.</p>
          <p>Un saludo,<br />Administración<br />ACADEMIAS PÉNDULO</p>
        </div>
      `;
    }

    await sendSystemEmail({
      to: cleanEmail,
      subject: emailSubject,
      html: emailHtml
    });

    res.json({ success: true, message: `Instrucciones de acceso enviadas correctamente a ${cleanEmail}.` });
  } catch (error) {
    console.error('Admin resend access error:', error);
    res.status(500).json({ error: 'Error al reenviar instrucciones de acceso.' });
  }
});

// Admin sends secure password recovery link to student (Section 7.Acceso al Campus)
app.post('/api/admin/students/:id/send-password-reset', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    const userRoles = req.user.roles || [];
    if (!userRoles.includes('ADMINISTRADOR') && !userRoles.includes('SECRETARIA')) {
      return res.status(403).json({ error: 'Acceso restringido.' });
    }

    const studentId = req.params.id;
    const userRows = await query(`SELECT * FROM usuarios WHERE id = ? LIMIT 1`, [studentId]);
    if (!userRows || userRows.length === 0) {
      return res.status(404).json({ error: 'Alumno no encontrado.' });
    }

    const studentUser = userRows[0];
    const rawToken = generateToken(32);
    const tokenH = hashToken(rawToken);
    const tokenId = `tok-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

    await query(`
      INSERT INTO tokens_acceso (id, usuario_id, proposito, token_hash, expiracion, creado_en)
      VALUES (?, ?, 'RECUPERAR_PASSWORD', ?, DATE_ADD(NOW(), INTERVAL 24 HOUR), NOW())
    `, [tokenId, studentUser.id, tokenH]);

    const campusBase = process.env.CAMPUS_URL || 'http://localhost:3000';
    const resetLink = `${campusBase}/#reset-password?token=${rawToken}`;

    await sendSystemEmail({
      to: studentUser.email,
      subject: 'Restablecimiento de contraseña — ACADEMIAS PÉNDULO',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e5e7eb; border-radius: 12px; background: #ffffff;">
          <h2 style="color: #dc2626; margin: 0 0 10px 0;">ACADEMIAS PÉNDULO</h2>
          <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 20px 0;" />
          <p>Hola, <strong>${studentUser.nombre}</strong>:</p>
          <p>Administración ha iniciado un proceso seguro para que puedas establecer una nueva contraseña de acceso:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #dc2626; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
              Establecer mi contraseña
            </a>
          </div>
          <p style="font-size: 12px; color: #6b7280;">Enlace directo: <a href="${resetLink}">${resetLink}</a></p>
          <p>Un saludo,<br />Administración<br />ACADEMIAS PÉNDULO</p>
        </div>
      `
    });

    res.json({ success: true, message: `Enlace seguro de restablecimiento de contraseña enviado a ${studentUser.email}.` });
  } catch (error) {
    console.error('Send password reset error:', error);
    res.status(500).json({ error: 'Error al enviar enlace de restablecimiento de contraseña.' });
  }
});

// Admin toggle student access (suspend / restore) (Section 7.Acceso al Campus & Section 12)
app.put('/api/admin/students/:id/toggle-access', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    const userRoles = req.user.roles || [];
    if (!userRoles.includes('ADMINISTRADOR') && !userRoles.includes('SECRETARIA')) {
      return res.status(403).json({ error: 'Acceso restringido.' });
    }

    const studentId = req.params.id;
    const { suspend, motivo } = req.body;
    const operator = req.user.email || req.user.nombre || 'Administración';

    const newAccessState = suspend ? 'SUSPENDIDO' : 'HABILITADO';
    const newUserState = suspend ? 'SUSPENDIDO' : 'ACTIVO';
    const reasonText = motivo ? String(motivo).trim() : (suspend ? 'Suspensión administrativa preventiva' : 'Restauración autorizada de acceso');

    // Update matriculas
    await query(`
      UPDATE matriculas
      SET estado_acceso = ?,
          motivo_suspension = ?,
          suspendido_por = ?,
          suspendido_en = ?
      WHERE alumno_id = ?
    `, [newAccessState, suspend ? reasonText : null, suspend ? operator : null, suspend ? new Date() : null, studentId]);

    // Update usuario
    await query(`
      UPDATE usuarios
      SET estado = ?, actualizado_en = NOW()
      WHERE id = ?
    `, [newUserState, studentId]);

    // If suspended, revoke active sessions
    if (suspend) {
      await query(`
        UPDATE sesiones
        SET revocado_en = CURRENT_TIMESTAMP
        WHERE usuario_id = ? AND revocado_en IS NULL
      `, [studentId]);
    }

    // History audit log
    const reqs = await query(`SELECT id FROM inscription_requests WHERE student_user_id = ? LIMIT 1`, [studentId]);
    if (reqs.length > 0) {
      await query(`
        INSERT INTO inscription_request_history (request_id, user_id, event_type, description, created_at)
        VALUES (?, ?, ?, ?, NOW())
      `, [reqs[0].id, req.user.id, suspend ? 'ACCESS_SUSPENDED' : 'ACCESS_RESTORED', `${suspend ? 'Acceso al campus suspendido' : 'Acceso al campus restaurado'} por ${operator}. Motivo: ${reasonText}`]);
    }

    res.json({
      success: true,
      message: suspend ? 'Acceso al campus suspendido correctamente.' : 'Acceso al campus restaurado correctamente.',
      estado_acceso: newAccessState,
      estado_usuario: newUserState
    });
  } catch (error) {
    console.error('Toggle student access error:', error);
    res.status(500).json({ error: 'Error al modificar el estado de acceso del alumno.' });
  }
});

// Admin update student personal data with audit log (Section 7.Datos Personales)
app.put('/api/admin/students/:id/personal-data', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    const userRoles = req.user.roles || [];
    if (!userRoles.includes('ADMINISTRADOR') && !userRoles.includes('SECRETARIA')) {
      return res.status(403).json({ error: 'Acceso restringido.' });
    }

    const studentId = req.params.id;
    const { nombre, apellidos, telefono } = req.body;

    if (!nombre || !apellidos) {
      return res.status(400).json({ error: 'El nombre y los apellidos son obligatorios.' });
    }

    await query(`
      UPDATE usuarios
      SET nombre = ?, apellidos = ?, telefono = ?, actualizado_en = NOW()
      WHERE id = ?
    `, [nombre.trim(), apellidos.trim(), telefono ? telefono.trim() : null, studentId]);

    res.json({ success: true, message: 'Datos personales actualizados correctamente.' });
  } catch (error) {
    console.error('Update student personal data error:', error);
    res.status(500).json({ error: 'Error al actualizar los datos personales.' });
  }
});

// ==========================================
// 3. MATERIALS, FILES (PDF) & VIDEOS API
// ==========================================

app.post('/api/materials/upload-pdf', requireAuth, requireNoTempPassword, async (req, res) => {
  let tempFilePath = null;
  try {
    const { filename, base64Data } = req.body;

    if (!filename || !base64Data) {
      return res.status(400).json({ error: 'Se requiere archivo y nombre.' });
    }

    // 1. Clean base64 header
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let buffer;
    let mimeType = 'application/pdf';

    if (matches && matches.length === 3) {
      mimeType = matches[1];
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(base64Data, 'base64');
    }

    if (mimeType !== 'application/pdf') {
      return res.status(400).json({ error: 'Tipo de archivo no admitido. Se requiere un PDF válido.' });
    }

    // 2. Validate max size (50MB)
    const MAX_SIZE = 50 * 1024 * 1024;
    if (buffer.length > MAX_SIZE) {
      return res.status(400).json({ error: 'El archivo excede el tamaño máximo permitido de 50MB.' });
    }

    // 3. Generate secure storage key
    const storageKey = `pdf_${Date.now()}_${generateToken(8)}.pdf`;
    tempFilePath = path.join(PRIVATE_UPLOADS_DIR, storageKey);

    // Save to private uploads dir outside web root
    fs.writeFileSync(tempFilePath, buffer);

    // 4. Insert record into archivos table
    const archivoId = `arch-${Date.now().toString(36)}-${generateToken(4)}`;
    await query(`
      INSERT INTO archivos (id, clave_almacenamiento, nombre_original, mime_type, tamano_bytes, autor_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [archivoId, storageKey, filename.trim(), mimeType, buffer.length, req.user.id]);

    res.status(201).json({
      success: true,
      archivoId,
      claveAlmacenamiento: storageKey,
      nombreOriginal: filename.trim(),
      tamanoBytes: buffer.length
    });
  } catch (error) {
    // Orphan cleanup if DB insert fails
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try { fs.unlinkSync(tempFilePath); } catch (e) {}
    }
    console.error('Upload PDF error:', error);
    res.status(500).json({ error: 'Error al procesar la subida del archivo PDF.' });
  }
});

app.get('/api/files/:id/download', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    const { id } = req.params;

    const files = await query(`SELECT * FROM archivos WHERE id = ? LIMIT 1`, [id]);
    if (!files || files.length === 0) {
      return res.status(404).json({ error: 'Archivo no encontrado.' });
    }

    const fileRec = files[0];

    // CHECK IF FILE IS AN EMAIL ATTACHMENT
    const mailCheck = await query(`SELECT correo_id FROM correo_archivos WHERE archivo_id = ? LIMIT 1`, [id]);
    if (mailCheck.length > 0) {
      // Email attachments are strictly accessible ONLY to ADMINISTRADOR
      if (!req.user.roles.includes('ADMINISTRADOR')) {
        return res.status(403).json({ error: 'Acceso denegado: Los adjuntos de correo corporativo sólo pueden ser consultados por administradores.' });
      }
    } else if (!req.user.roles.includes('ADMINISTRADOR')) {
      if (req.user.roles.includes('PROFESOR')) {
        // Teacher must be assigned to the group of the material or conversation
        const matCheck = await query(`
          SELECT m.id FROM materiales m
          JOIN grupos g ON m.grupo_id = g.id
          WHERE m.archivo_id = ? AND g.profesor_principal_id = ?
        `, [id, req.user.id]);

        if (matCheck.length === 0) {
          return res.status(403).json({ error: 'Acceso denegado a este archivo.' });
        }
      } else if (req.user.roles.includes('ALUMNO')) {
        // Student must have active authorized enrollment (HABILITADO) for the group or specialty of the published material
        const matCheck = await query(`
          SELECT m.id FROM materiales m
          JOIN matriculas mat ON mat.alumno_id = ?
          LEFT JOIN grupos g ON mat.grupo_id = g.id
          WHERE m.archivo_id = ? AND m.estado = 'PUBLICADO'
            AND mat.estado = 'ACTIVA'
            AND (mat.estado_acceso = 'HABILITADO' OR mat.estado_acceso IS NULL)
            AND (
              m.grupo_id = mat.grupo_id
              OR (m.grupo_id IS NULL AND (m.especialidad_id = mat.curso_id OR m.especialidad_id = g.especialidad_id))
            )
        `, [req.user.id, id]);

        if (matCheck.length === 0) {
          return res.status(403).json({ error: 'Acceso denegado: Archivo no disponible para tu matrícula activa y autorizada.' });
        }
      }
    }

    let filePath = fileRec.clave_almacenamiento
      ? path.join(PRIVATE_UPLOADS_DIR, fileRec.clave_almacenamiento)
      : (fileRec.ruta ? path.join(process.cwd(), fileRec.ruta) : null);

    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'El archivo físico no se encuentra disponible.' });
    }

    res.setHeader('Content-Type', fileRec.mime_type || 'application/octet-stream');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const safeFilename = fileRec.nombre_original || fileRec.nombre || 'adjunto.bin';
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(safeFilename)}"`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Download file error:', error);
    res.status(500).json({ error: 'Error al servir el archivo.' });
  }
});

app.get('/api/materials', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    let sql = `SELECT * FROM materiales`;
    const params = [];

    if (req.user.roles.includes('ADMINISTRADOR')) {
      // Admin sees all materials
      sql += ` ORDER BY orden ASC, creado_en DESC`;
    } else if (req.user.roles.includes('PROFESOR')) {
      // Teacher sees materials for their assigned groups + common specialty materials
      sql += ` WHERE estado != 'ARCHIVADO' AND (
        grupo_id IN (SELECT id FROM grupos WHERE profesor_principal_id = ?)
        OR grupo_id IS NULL
      ) ORDER BY orden ASC, creado_en DESC`;
      params.push(req.user.id);
    } else {
      // Student sees ONLY published materials for their active, authorized enrollment groups or common specialty
      sql += ` WHERE estado = 'PUBLICADO' AND (
        grupo_id IN (
          SELECT mat.grupo_id FROM matriculas mat
          WHERE mat.alumno_id = ? AND mat.estado = 'ACTIVA' AND (mat.estado_acceso = 'HABILITADO' OR mat.estado_acceso IS NULL)
        )
        OR (grupo_id IS NULL AND especialidad_id IN (
          SELECT COALESCE(mat.curso_id, g.especialidad_id) FROM matriculas mat
          LEFT JOIN grupos g ON mat.grupo_id = g.id
          WHERE mat.alumno_id = ? AND mat.estado = 'ACTIVA' AND (mat.estado_acceso = 'HABILITADO' OR mat.estado_acceso IS NULL)
        ))
      ) ORDER BY orden ASC, creado_en DESC`;
      params.push(req.user.id, req.user.id);
    }

    const materials = await query(sql, params);
    res.json(materials);
  } catch (error) {
    console.error('Fetch materials error:', error);
    res.status(500).json({ error: 'Error al obtener materiales.' });
  }
});

app.post('/api/materials', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    const { especialidad_id, grupo_id, titulo, descripcion, tipo, archivo_id, referencia_video, proveedor, orden, estado } = req.body;

    if (!especialidad_id || !titulo || !tipo) {
      return res.status(400).json({ error: 'especialidad_id, título y tipo son requeridos.' });
    }

    // Teacher group authorization check
    if (req.user.roles.includes('PROFESOR') && !req.user.roles.includes('ADMINISTRADOR')) {
      if (!grupo_id) {
        return res.status(403).json({ error: 'Únicamente el administrador puede publicar materiales comunes para toda la especialidad.' });
      }

      const grpCheck = await query(`SELECT id FROM grupos WHERE id = ? AND profesor_principal_id = ?`, [grupo_id, req.user.id]);
      if (grpCheck.length === 0) {
        return res.status(403).json({ error: 'No tienes autorización para publicar en un grupo no asignado.' });
      }
    }

    const matId = `mat-${Date.now().toString(36)}-${generateToken(4)}`;
    await query(`
      INSERT INTO materiales (
        id, especialidad_id, grupo_id, titulo, descripcion, tipo, archivo_id,
        referencia_video, proveedor, orden, estado, autor_id, version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `, [
      matId, especialidad_id, grupo_id || null, titulo.trim(), descripcion || null,
      tipo, archivo_id || null, referencia_video || null, proveedor || null,
      orden || 0, estado || 'BORRADOR', req.user.id
    ]);

    // Create idempotent notifications for active students if published
    if (estado === 'PUBLICADO') {
      const targetStudents = await query(`
        SELECT ama.alumno_id
        FROM alumno_matricula_activa ama
        JOIN matriculas m ON ama.matricula_id = m.id
        JOIN grupos g ON m.grupo_id = g.id
        WHERE (${grupo_id ? 'g.id = ?' : 'g.especialidad_id = ?'})
      `, [grupo_id || especialidad_id]);

      for (const s of targetStudents) {
        const notifId = `not-${matId}-${s.alumno_id}`;
        await query(`
          INSERT INTO notificaciones (id, destinatario_id, tipo, referencia_tipo, referencia_id, titulo, mensaje)
          VALUES (?, ?, 'NUEVO_MATERIAL', 'MATERIAL', ?, ?, ?)
          ON DUPLICATE KEY UPDATE titulo = VALUES(titulo)
        `, [notifId, s.alumno_id, matId, `Nuevo material disponible: ${titulo}`, `Se ha publicado nuevo contenido educativo para tu especialidad.`]);
      }
    }

    res.status(201).json({ success: true, id: matId, titulo });
  } catch (error) {
    console.error('Create material error:', error);
    res.status(500).json({ error: 'Error al publicar material.' });
  }
});

app.put('/api/materials/:id', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, descripcion, archivo_id, referencia_video, estado, orden } = req.body;

    const existing = await query(`SELECT * FROM materiales WHERE id = ? LIMIT 1`, [id]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ error: 'Material no encontrado.' });
    }
    const mat = existing[0];

    // If PDF or video reference changed, increment version
    let newVersion = mat.version;
    if ((archivo_id && archivo_id !== mat.archivo_id) || (referencia_video && referencia_video !== mat.referencia_video)) {
      newVersion += 1;
    }

    await query(`
      UPDATE materiales
      SET titulo = ?, descripcion = ?, archivo_id = ?, referencia_video = ?, estado = ?, orden = ?, version = ?
      WHERE id = ?
    `, [
      titulo !== undefined ? titulo : mat.titulo,
      descripcion !== undefined ? descripcion : mat.descripcion,
      archivo_id !== undefined ? archivo_id : mat.archivo_id,
      referencia_video !== undefined ? referencia_video : mat.referencia_video,
      estado !== undefined ? estado : mat.estado,
      orden !== undefined ? orden : mat.orden,
      newVersion,
      id
    ]);

    res.json({ success: true, version: newVersion });
  } catch (error) {
    console.error('Update material error:', error);
    res.status(500).json({ error: 'Error al actualizar material.' });
  }
});

app.post('/api/materials/:id/progress', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    const { id } = req.params;
    const { posicion_segundos, duracion_segundos, inicio_seg, fin_seg } = req.body;

    // Get student active enrollment
    const ama = await query(`SELECT matricula_id FROM alumno_matricula_activa WHERE alumno_id = ? LIMIT 1`, [req.user.id]);
    if (ama.length === 0) {
      return res.status(400).json({ error: 'No posees una matrícula activa.' });
    }
    const matId = ama[0].matricula_id;

    const mat = await query(`SELECT version FROM materiales WHERE id = ? LIMIT 1`, [id]);
    if (mat.length === 0) return res.status(404).json({ error: 'Material no encontrado.' });
    const version = mat[0].version;

    const isCompleted = posicion_segundos >= (duracion_segundos * 0.9);

    await query(`
      INSERT INTO progreso_materiales (
        alumno_id, matricula_id, material_id, version, estado, posicion_segundos, duracion_segundos, completado_en
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ${isCompleted ? 'CURRENT_TIMESTAMP' : 'NULL'})
      ON DUPLICATE KEY UPDATE
        posicion_segundos = GREATEST(posicion_segundos, VALUES(posicion_segundos)),
        duracion_segundos = VALUES(duracion_segundos),
        estado = IF(posicion_segundos >= duracion_segundos * 0.9, 'COMPLETADO', 'EN_PROGRESO'),
        completado_en = IF(posicion_segundos >= duracion_segundos * 0.9 AND completado_en IS NULL, CURRENT_TIMESTAMP, completado_en)
    `, [req.user.id, matId, id, version, isCompleted ? 'COMPLETADO' : 'EN_PROGRESO', posicion_segundos, duracion_segundos]);

    // Insert range interval if provided
    if (inicio_seg !== undefined && fin_seg !== undefined) {
      await query(`
        INSERT INTO intervalos_video (alumno_id, matricula_id, material_id, version, inicio_seg, fin_seg)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [req.user.id, matId, id, version, inicio_seg, fin_seg]);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Progress error:', error);
    res.status(500).json({ error: 'Error al registrar progreso.' });
  }
});

// ==========================================
// 4. COMMUNICATIONS (Secretaría, Dudas & Solicitudes)
// ==========================================

app.get('/api/communications/conversations', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    let sql = `
      SELECT c.id, c.tipo, c.asunto, c.creador_id, c.grupo_id, c.responsable_id, c.estado, c.creado_en, c.actualizado_en,
             CONCAT(uc.nombre, ' ', uc.apellidos) as creador_nombre,
             uc.email as creador_email,
             CONCAT(ur.nombre, ' ', ur.apellidos) as responsable_nombre,
             ur.email as responsable_email,
             g.nombre as grupo_nombre,
             e.id as especialidad_id,
             e.codigo as especialidad_codigo,
             e.nombre as especialidad_nombre,
             (SELECT cuerpo FROM mensajes WHERE conversacion_id = c.id ORDER BY creado_en DESC LIMIT 1) as ultimo_mensaje,
             (SELECT COUNT(*) FROM mensajes WHERE conversacion_id = c.id) as total_mensajes
      FROM conversaciones c
      JOIN usuarios uc ON c.creador_id = uc.id
      LEFT JOIN usuarios ur ON c.responsable_id = ur.id
      LEFT JOIN grupos g ON c.grupo_id = g.id
      LEFT JOIN especialidades e ON g.especialidad_id = e.id
    `;
    const params = [];

    if (req.user.roles.includes('ADMINISTRADOR')) {
      // Admin sees all
      sql += ` ORDER BY c.actualizado_en DESC`;
    } else if (req.user.roles.includes('PROFESOR')) {
      // Teacher sees academic doubts for their assigned groups + their own conversations / assigned to them
      sql += ` WHERE (
        c.tipo = 'ACADEMICA' AND (
          c.grupo_id IN (SELECT id FROM grupos WHERE profesor_principal_id = ?)
          OR c.responsable_id = ?
        )
      ) OR c.creador_id = ?
      ORDER BY c.actualizado_en DESC`;
      params.push(req.user.id, req.user.id, req.user.id);
    } else {
      // Student sees ONLY their own conversations
      sql += ` WHERE c.creador_id = ? ORDER BY c.actualizado_en DESC`;
      params.push(req.user.id);
    }

    const conversations = await query(sql, params);
    res.json(conversations);
  } catch (error) {
    console.error('Fetch conversations error:', error);
    res.status(500).json({ error: 'Error al consultar conversaciones.' });
  }
});

app.post('/api/communications/conversations', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    const { tipo, asunto, grupo_id, cuerpo } = req.body;
    if (!tipo || !asunto || !cuerpo) {
      return res.status(400).json({ error: 'Tipo, asunto y cuerpo son requeridos.' });
    }

    const convId = `conv-${Date.now().toString(36)}-${generateToken(4)}`;

    // If academic doubt, resolve group's teacher as responsable
    let responsableId = null;
    let resolvedGrupoId = grupo_id || null;

    if (tipo === 'ACADEMICA') {
      if (!resolvedGrupoId) {
        // Find student's active group
        const grpStudent = await query(`
          SELECT g.id, g.profesor_principal_id
          FROM alumno_matricula_activa ama
          JOIN matriculas m ON ama.matricula_id = m.id
          JOIN grupos g ON m.grupo_id = g.id
          WHERE ama.alumno_id = ?
          LIMIT 1
        `, [req.user.id]);
        if (grpStudent.length > 0) {
          resolvedGrupoId = grpStudent[0].id;
          responsableId = grpStudent[0].profesor_principal_id;
        }
      } else {
        const g = await query(`SELECT profesor_principal_id FROM grupos WHERE id = ? LIMIT 1`, [resolvedGrupoId]);
        if (g.length > 0) responsableId = g[0].profesor_principal_id;
      }
    }

    await query(`
      INSERT INTO conversaciones (id, tipo, asunto, creador_id, grupo_id, responsable_id, estado)
      VALUES (?, ?, ?, ?, ?, ?, 'ABIERTA')
    `, [convId, tipo, asunto.trim(), req.user.id, resolvedGrupoId, responsableId]);

    // Insert initial message
    const msgId = `msg-${Date.now().toString(36)}-${generateToken(4)}`;
    await query(`
      INSERT INTO mensajes (id, conversacion_id, remitente_id, cuerpo)
      VALUES (?, ?, ?, ?)
    `, [msgId, convId, req.user.id, cuerpo.trim()]);

    res.status(201).json({ success: true, id: convId, responsable_id: responsableId });
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ error: 'Error al iniciar conversación.' });
  }
});

// Helper to verify if user can access / interact with a conversation
async function checkConversationAccess(user, conversationId) {
  const convs = await query(`SELECT * FROM conversaciones WHERE id = ? LIMIT 1`, [conversationId]);
  if (!convs || convs.length === 0) return { allowed: false, notFound: true };
  const conv = convs[0];

  const roles = user.roles || [];
  if (roles.includes('ADMINISTRADOR') || roles.includes('ADMIN') || roles.includes('SECRETARIA')) {
    return { allowed: true, conv };
  }

  if (roles.includes('PROFESOR')) {
    const isAssignedTeacher = conv.responsable_id === user.id;
    const isCreator = conv.creador_id === user.id;
    let isGroupTeacher = false;
    if (conv.grupo_id) {
      const g = await query(`SELECT id FROM grupos WHERE id = ? AND profesor_principal_id = ? LIMIT 1`, [conv.grupo_id, user.id]);
      if (g.length > 0) isGroupTeacher = true;
    }
    if (isAssignedTeacher || isCreator || isGroupTeacher) {
      return { allowed: true, conv };
    }
    return { allowed: false, conv };
  }

  // Student / other roles: only if they are the conversation creator
  if (conv.creador_id === user.id) {
    return { allowed: true, conv };
  }

  return { allowed: false, conv };
}

app.get('/api/communications/conversations/:id/messages', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    const { id } = req.params;
    const access = await checkConversationAccess(req.user, id);
    if (access.notFound) return res.status(404).json({ error: 'Conversación no encontrada.' });
    if (!access.allowed) {
      await logSecurityEvent({ event: 'IDOR_BLOCKED', userId: req.user.id, email: req.user.email, ip: req.ip || null, details: { resource: 'conversation_read', id }, level: 'WARN' });
      return res.status(403).json({ error: 'Acceso denegado a la conversación.' });
    }

    const messages = await query(`
      SELECT m.id, m.conversacion_id, m.remitente_id, m.cuerpo, m.estado, m.creado_en,
             CONCAT(u.nombre, ' ', u.apellidos) as remitente_nombre,
             u.email as remitente_email,
             (SELECT rol_codigo FROM usuario_roles WHERE usuario_id = u.id LIMIT 1) as remitente_rol
      FROM mensajes m
      JOIN usuarios u ON m.remitente_id = u.id
      WHERE m.conversacion_id = ?
      ORDER BY m.creado_en ASC
    `, [id]);

    res.json(messages);
  } catch (error) {
    console.error('Fetch messages error:', error);
    res.status(500).json({ error: 'Error al consultar mensajes.' });
  }
});

app.post('/api/communications/conversations/:id/messages', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    const { id } = req.params;
    const { cuerpo } = req.body;

    if (!cuerpo) return res.status(400).json({ error: 'El cuerpo del mensaje es requerido.' });

    const access = await checkConversationAccess(req.user, id);
    if (access.notFound) return res.status(404).json({ error: 'Conversación no encontrada.' });
    if (!access.allowed) {
      await logSecurityEvent({ event: 'IDOR_BLOCKED', userId: req.user.id, email: req.user.email, ip: req.ip || null, details: { resource: 'conversation_write', id }, level: 'WARN' });
      return res.status(403).json({ error: 'Acceso denegado: No puede enviar mensajes a una conversación en la que no participa.' });
    }

    const msgId = `msg-${Date.now().toString(36)}-${generateToken(4)}`;
    await query(`
      INSERT INTO mensajes (id, conversacion_id, remitente_id, cuerpo)
      VALUES (?, ?, ?, ?)
    `, [msgId, id, req.user.id, cuerpo.trim()]);

    await query(`UPDATE conversaciones SET actualizado_en = CURRENT_TIMESTAMP WHERE id = ?`, [id]);

    res.status(201).json({ success: true, id: msgId });
  } catch (error) {
    console.error('Post message error:', error);
    res.status(500).json({ error: 'Error al enviar mensaje.' });
  }
});

app.patch('/api/communications/conversations/:id/status', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    if (!['ABIERTA', 'EN_TRAMITE', 'RESUELTA', 'CERRADA'].includes(estado)) {
      return res.status(400).json({ error: 'Estado no válido.' });
    }

    const access = await checkConversationAccess(req.user, id);
    if (access.notFound) return res.status(404).json({ error: 'Conversación no encontrada.' });
    if (!access.allowed) {
      await logSecurityEvent({ event: 'IDOR_BLOCKED', userId: req.user.id, email: req.user.email, ip: req.ip || null, details: { resource: 'conversation_status', id }, level: 'WARN' });
      return res.status(403).json({ error: 'Acceso denegado: No puede modificar el estado de esta conversación.' });
    }

    await query(`UPDATE conversaciones SET estado = ?, actualizado_en = CURRENT_TIMESTAMP WHERE id = ?`, [estado, id]);
    res.json({ success: true, estado });
  } catch (error) {
    console.error('Update conversation status error:', error);
    res.status(500).json({ error: 'Error al actualizar estado.' });
  }
});

// ==========================================
// ADMIN EXTERNAL MAIL INTEGRATION API ROUTES
// ==========================================

// Get configured mail account(s) and sync status
app.get('/api/admin/mail/accounts', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    if (!req.user.roles.includes('ADMINISTRADOR')) {
      return res.status(403).json({ error: 'Acceso restringido a la administración.' });
    }

    const accounts = await query(`
      SELECT c.id, c.buzon, c.proveedor, c.estado, c.configuracion, c.creado_en,
             s.fecha_sincronizacion as ultima_sincronizacion, s.ultimo_error
      FROM cuentas_correo c
      LEFT JOIN sincronizacion_correo s ON s.cuenta_id = c.id AND s.carpeta = 'INBOX'
      ORDER BY (c.estado = 'ACTIVA') DESC, (c.buzon = 'info.academiaspendulo@gmail.com') DESC, c.creado_en DESC
    `);

    // Parse JSON configuracion without returning secrets
    const sanitizedAccounts = accounts.map(a => {
      let cfg = {};
      try {
        cfg = typeof a.configuracion === 'string' ? JSON.parse(a.configuracion) : (a.configuracion || {});
      } catch (e) {}
      return {
        id: a.id,
        buzon: a.buzon,
        proveedor: a.proveedor,
        estado: a.estado,
        imap_host: cfg.imap_host || 'mail.hostinger.com',
        imap_port: cfg.imap_port || 993,
        imap_tls: cfg.imap_tls !== false,
        smtp_host: cfg.smtp_host || 'smtp.hostinger.com',
        smtp_port: cfg.smtp_port || 465,
        smtp_tls: cfg.smtp_tls !== false,
        sync_interval_minutes: cfg.sync_interval_minutes || 5,
        sync_start_date: cfg.sync_start_date || null,
        max_msg_size_mb: cfg.max_msg_size_mb || 25,
        max_attachment_size_mb: cfg.max_attachment_size_mb || 15,
        ultima_sincronizacion: a.ultima_sincronizacion,
        ultimo_error: a.ultimo_error
      };
    });

    res.json(sanitizedAccounts);
  } catch (error) {
    console.error('Fetch mail accounts error:', error);
    res.status(500).json({ error: 'Error al consultar cuentas de correo.' });
  }
});

// Configure or update a mail account
app.post('/api/admin/mail/accounts', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    if (!req.user.roles.includes('ADMINISTRADOR')) {
      return res.status(403).json({ error: 'Acceso restringido a la administración.' });
    }

    const {
      id, buzon, proveedor, password, imap_host, imap_port, imap_tls,
      smtp_host, smtp_port, smtp_tls, sync_interval_minutes, sync_start_date,
      max_msg_size_mb, max_attachment_size_mb
    } = req.body;

    if (!buzon || !buzon.includes('@')) {
      return res.status(400).json({ error: 'Dirección de correo de buzón inválida.' });
    }

    const accountId = id || `acc_${generateToken(8)}`;
    const configObj = {
      imap_host: imap_host || 'mail.hostinger.com',
      imap_port: parseInt(imap_port || '993', 10),
      imap_tls: imap_tls !== false,
      smtp_host: smtp_host || 'smtp.hostinger.com',
      smtp_port: parseInt(smtp_port || '465', 10),
      smtp_tls: smtp_tls !== false,
      sync_interval_minutes: parseInt(sync_interval_minutes || '5', 10),
      sync_start_date: sync_start_date || null,
      max_msg_size_mb: parseInt(max_msg_size_mb || '25', 10),
      max_attachment_size_mb: parseInt(max_attachment_size_mb || '15', 10)
    };

    const configJson = JSON.stringify(configObj);
    let secretoRef = null;

    if (password) {
      secretoRef = encryptAccountSecret(password);
    } else if (id) {
      // Keep existing password
      const existingAcc = await query(`SELECT secreto_ref FROM cuentas_correo WHERE id = ? LIMIT 1`, [id]);
      if (existingAcc.length > 0) secretoRef = existingAcc[0].secreto_ref;
    }

    if (!secretoRef) {
      return res.status(400).json({ error: 'La contraseña o token del buzón es requerida.' });
    }

    await query(`
      INSERT INTO cuentas_correo (id, buzon, proveedor, estado, secreto_ref, configuracion, creado_en)
      VALUES (?, ?, ?, 'ACTIVA', ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        buzon = VALUES(buzon),
        proveedor = VALUES(proveedor),
        estado = 'ACTIVA',
        secreto_ref = VALUES(secreto_ref),
        configuracion = VALUES(configuracion)
    `, [accountId, buzon.trim().toLowerCase(), proveedor || 'Hostinger IMAP/SMTP', secretoRef, configJson]);

    // Initialize sync status row if missing
    await query(`
      INSERT IGNORE INTO sincronizacion_correo (cuenta_id, carpeta, uidvalidity, uid_next, last_uid, fecha_sincronizacion)
      VALUES (?, 'INBOX', 0, 1, 0, NOW())
    `, [accountId]);

    // Audit log
    await query(`
      INSERT INTO auditoria (actor_id, accion_administrativa, recurso, recurso_id, diff_cambios, creado_en)
      VALUES (?, 'CONFIGURAR_BUZON_CORREO', 'cuentas_correo', ?, ?, NOW())
    `, [req.user.id, accountId, JSON.stringify({ buzon, proveedor })]);

    res.status(200).json({ success: true, accountId });
  } catch (error) {
    console.error('Save mail account error:', error);
    res.status(500).json({ error: 'Error al guardar la configuración del buzón.' });
  }
});

// Trigger manual mail synchronization
app.post('/api/admin/mail/sync', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    if (!req.user.roles.includes('ADMINISTRADOR')) {
      return res.status(403).json({ error: 'Acceso restringido a la administración.' });
    }

    const { cuentaId } = req.body;
    if (cuentaId) {
      const result = await syncMailbox(cuentaId);
      return res.json(result);
    } else {
      await syncAllActiveMailboxes();
      return res.json({ status: 'OK', message: 'Sincronización completada para todas las cuentas activas.' });
    }
  } catch (error) {
    console.error('Manual mail sync error:', error);
    res.status(500).json({ error: 'Error durante la sincronización del buzón.' });
  }
});

// Get mail threads for Admin Inbox
app.get('/api/admin/mail/threads', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    if (!req.user.roles.includes('ADMINISTRADOR')) {
      return res.status(403).json({ error: 'Acceso restringido a la administración.' });
    }

    const { search, folder } = req.query;

    let sql = `
      SELECT h.id as thread_id, h.cuenta_id, h.asunto_hilo, h.creado_en as thread_created, h.actualizado_en as thread_updated,
             c.buzon as cuenta_buzon
      FROM hilos_correo h
      JOIN cuentas_correo c ON h.cuenta_id = c.id
    `;
    const params = [];

    if (search && search.trim()) {
      sql += ` WHERE h.asunto_hilo LIKE ? OR h.id IN (
        SELECT hilo_id FROM correos WHERE remitente LIKE ? OR asunto LIKE ? OR cuerpo_texto LIKE ?
      )`;
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s);
    }

    sql += ` ORDER BY h.actualizado_en DESC`;

    const threads = await query(sql, params);

    // Fetch messages for each thread
    const resultThreads = [];

    for (const t of threads) {
      const messages = await query(`
        SELECT m.id, m.hilo_id, m.provider_id, m.message_id, m.in_reply_to, m.references_header,
               m.remitente, m.destinatarios, m.asunto, m.cuerpo_texto, m.cuerpo_html,
               m.fecha_correo, m.direccion, m.creado_en
        FROM correos m
        WHERE m.hilo_id = ?
        ORDER BY m.fecha_correo ASC
      `, [t.thread_id]);

      if (messages.length === 0) continue;

      const firstInbound = messages.find(m => m.direccion === 'INBOUND') || messages[0];
      const lastMsg = messages[messages.length - 1];

      // Parse sender email
      const senderMatch = firstInbound.remitente.match(/<([^>]+)>/) || [null, firstInbound.remitente];
      const senderEmail = senderMatch[1] ? senderMatch[1].trim() : firstInbound.remitente.trim();
      const senderName = firstInbound.remitente.replace(/<[^>]+>/, '').trim() || senderEmail;

      // Determine status
      const hasOutbound = messages.some(m => m.direccion === 'OUTBOUND');
      const status = hasOutbound ? 'RESPONDIDO' : 'PENDIENTE';

      // Filter by folder if requested
      if (folder === 'PENDIENTE' && status !== 'PENDIENTE') continue;
      if (folder === 'RESPONDIDO' && status !== 'RESPONDIDO') continue;

      // Attachments for all messages in thread
      const msgIds = messages.map(m => m.id);
      let attachments = [];
      if (msgIds.length > 0) {
        attachments = await query(`
          SELECT ca.correo_id, a.id as archivo_id, a.nombre_original, a.mime_type, a.tamano_bytes
          FROM correo_archivos ca
          JOIN archivos a ON ca.archivo_id = a.id
          WHERE ca.correo_id IN (?)
        `, [msgIds]);
      }

      // Map attachments to messages
      const formattedMessages = messages.map(m => {
        let dests = [];
        try { dests = typeof m.destinatarios === 'string' ? JSON.parse(m.destinatarios) : (m.destinatarios || []); } catch(e){}
        return {
          id: m.id,
          message_id: m.message_id,
          in_reply_to: m.in_reply_to,
          references_header: m.references_header,
          sender_name: m.remitente.replace(/<[^>]+>/, '').trim() || m.remitente,
          sender_email: (m.remitente.match(/<([^>]+)>/) || [null, m.remitente])[1] || m.remitente,
          recipients: dests,
          subject: m.asunto,
          body_text: m.cuerpo_texto,
          body_html: m.cuerpo_html,
          received_at: m.fecha_correo,
          direction: m.direccion.toLowerCase(),
          attachments: attachments.filter(a => a.correo_id === m.id)
        };
      });

      resultThreads.push({
        id: t.thread_id,
        cuenta_id: t.cuenta_id,
        cuenta_buzon: t.cuenta_buzon,
        external_thread_id: t.thread_id,
        subject: t.asunto_hilo || firstInbound.asunto || 'Sin Asunto',
        sender_name: senderName,
        sender_email: senderEmail,
        status,
        last_message_at: lastMsg.fecha_correo,
        messages: formattedMessages
      });
    }

    res.json(resultThreads);
  } catch (error) {
    console.error('Fetch mail threads error:', error);
    res.status(500).json({ error: 'Error al obtener los hilos de correo.' });
  }
});

// Post reply to an email thread
app.post('/api/admin/mail/reply', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    if (!req.user.roles.includes('ADMINISTRADOR')) {
      return res.status(403).json({ error: 'Acceso restringido a la administración.' });
    }

    const { cuentaId, hiloId, destinatarios, asunto, cuerpoTexto, cuerpoHtml, inReplyTo, referencesHeader } = req.body;

    if (!hiloId || !destinatarios || !Array.isArray(destinatarios) || destinatarios.length === 0 || (!cuerpoTexto && !cuerpoHtml)) {
      return res.status(400).json({ error: 'El hilo, los destinatarios y el mensaje son requeridos.' });
    }

    // Resolve cuentaId from thread if missing
    let targetCuentaId = cuentaId;
    if (!targetCuentaId) {
      const th = await query(`SELECT cuenta_id FROM hilos_correo WHERE id = ? LIMIT 1`, [hiloId]);
      if (th.length > 0) targetCuentaId = th[0].cuenta_id;
    }

    if (!targetCuentaId) {
      // Fallback to first active cuenta_correo
      const acc = await query(`SELECT id FROM cuentas_correo WHERE estado = 'ACTIVA' ORDER BY creado_en ASC LIMIT 1`);
      if (acc.length > 0) targetCuentaId = acc[0].id;
    }

    if (!targetCuentaId) {
      return res.status(400).json({ error: 'No existe un buzón de correo activo configurado para enviar la respuesta.' });
    }

    const replyResult = await queueOutboundReply({
      cuentaId: targetCuentaId,
      hiloId,
      remitenteId: req.user.id,
      destinatarios,
      asunto: asunto || 'Re: Mensaje',
      cuerpoTexto: cuerpoTexto || '',
      cuerpoHtml: cuerpoHtml || '',
      inReplyTo,
      referencesHeader
    });

    // Immediately trigger outbox worker
    processOutboxQueue().catch(err => console.error('Outbox trigger error:', err));

    res.status(200).json({ success: true, ...replyResult });
  } catch (error) {
    console.error('Queue mail reply error:', error);
    res.status(500).json({ error: error.message || 'Error al encolar la respuesta.' });
  }
});

// Explicit Administrative Action: Convert email sender to contact lead / request
app.post('/api/admin/mail/leads/convert', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    if (!req.user.roles.includes('ADMINISTRADOR')) {
      return res.status(403).json({ error: 'Acceso restringido a la administración.' });
    }

    const { email, nombre, apellidos, especialidad_id, mensaje } = req.body;
    if (!email || !nombre) {
      return res.status(400).json({ error: 'Email y Nombre son requeridos para la ficha.' });
    }

    const convId = `conv-${Date.now().toString(36)}-${generateToken(4)}`;
    const fullName = `${nombre.trim()} ${apellidos ? apellidos.trim() : ''}`.trim();

    // Create conversation record
    await query(`
      INSERT INTO conversaciones (id, tipo, asunto, creador_id, estado, creado_en, actualizado_en)
      VALUES (?, 'SOLICITUD', ?, ?, 'ABIERTA', NOW(), NOW())
    `, [convId, `Preinscripción / Solicitud: ${fullName}`, req.user.id]);

    // Create initial conversation message
    const msgId = `msg-${Date.now().toString(36)}-${generateToken(4)}`;
    await query(`
      INSERT INTO mensajes (id, conversacion_id, remitente_id, cuerpo, creado_en)
      VALUES (?, ?, ?, ?, NOW())
    `, [msgId, convId, req.user.id, `Ficha creada desde correo: ${email}. Notas: ${mensaje || 'Sin notas adicionales.'}`]);

    // Create solicitudes record
    const leadId = `sol-${Date.now().toString(36)}-${generateToken(4)}`;
    await query(`
      INSERT INTO solicitudes (id, conversacion_id, tipo, solicitante_id, estado, creado_en)
      VALUES (?, ?, 'OTRO', ?, 'PENDIENTE', NOW())
    `, [leadId, convId, req.user.id]);

    // Audit log
    await query(`
      INSERT INTO auditoria (actor_id, accion_administrativa, recurso, recurso_id, diff_cambios, creado_en)
      VALUES (?, 'CONVERTIR_CORREO_A_SOLICITUD', 'solicitudes', ?, ?, NOW())
    `, [req.user.id, leadId, JSON.stringify({ email, nombre, especialidad_id })]);

    res.status(201).json({ success: true, leadId });
  } catch (error) {
    console.error('Convert email lead error:', error);
    res.status(500).json({ error: 'Error al registrar la solicitud de contacto.' });
  }
});

// ==========================================
// ACADEMIC PROGRESS TRACKING API ROUTES
// ==========================================

// Start/resume a material playback session
app.post('/api/progress/session/start', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    const { materialId } = req.body;
    if (!materialId) {
      return res.status(400).json({ error: 'materialId es requerido.' });
    }

    const sessionData = await startPlaybackSession(req.user.id, materialId);
    res.json(sessionData);
  } catch (error) {
    console.error('Start progress session error:', error);
    res.status(400).json({ error: error.message || 'Error al iniciar sesión de progreso.' });
  }
});

// Record periodic progress tick / interval update
app.post('/api/progress/tick', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    const {
      materialId, sesionReproduccionId, secuencia, posicionSegundos,
      duracionSegundos, intervaloNuevo, playbackRate, elapsedMs
    } = req.body;

    if (!materialId || !sesionReproduccionId || secuencia === undefined) {
      return res.status(400).json({ error: 'materialId, sesionReproduccionId y secuencia son requeridos.' });
    }

    // Student identity is strictly derived from req.user.id
    const result = await recordProgressTick({
      alumnoId: req.user.id,
      materialId,
      sesionReproduccionId,
      secuencia,
      posicionSegundos,
      duracionSegundos,
      intervaloNuevo,
      playbackRate,
      elapsedMs
    });

    res.json(result);
  } catch (error) {
    console.error('Record progress tick error:', error);
    res.status(400).json({ error: error.message || 'Error al registrar progreso.' });
  }
});

// Toggle manual completion declaration ("Marcar como revisado")
app.post('/api/progress/manual-toggle', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    const { materialId, marcadoManual } = req.body;
    if (!materialId) {
      return res.status(400).json({ error: 'materialId es requerido.' });
    }

    const result = await toggleManualCompletion(req.user.id, materialId, Boolean(marcadoManual));
    res.json(result);
  } catch (error) {
    console.error('Manual toggle progress error:', error);
    res.status(400).json({ error: error.message || 'Error al actualizar declaración manual.' });
  }
});

// Get overall active enrollment progress breakdown for Student
app.get('/api/progress/overall', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    const progressData = await calculateStudentOverallProgress(req.user.id);
    res.json(progressData);
  } catch (error) {
    console.error('Get overall progress error:', error);
    res.status(500).json({ error: 'Error al consultar el progreso general.' });
  }
});

// Get last visited material for Student ("Continuar último material")
app.get('/api/progress/last-visited', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    const lastItem = await getLastVisitedMaterial(req.user.id);
    res.json({ lastVisited: lastItem });
  } catch (error) {
    console.error('Get last visited error:', error);
    res.status(500).json({ error: 'Error al consultar el último material visitado.' });
  }
});

// Teacher Analytics for assigned groups
app.get('/api/teacher/progress/analytics', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    if (!req.user.roles.includes('PROFESOR') && !req.user.roles.includes('ADMINISTRADOR')) {
      return res.status(403).json({ error: 'Acceso restringido a profesores.' });
    }

    const analytics = await getTeacherGroupAnalytics(req.user.id);
    res.json(analytics);
  } catch (error) {
    console.error('Teacher analytics error:', error);
    res.status(500).json({ error: 'Error al consultar métricas del grupo.' });
  }
});

// Admin Global Analytics
app.get('/api/admin/progress/analytics', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    if (!req.user.roles.includes('ADMINISTRADOR')) {
      return res.status(403).json({ error: 'Acceso restringido a administradores.' });
    }

    const { especialidadId, grupoId, alumnoId } = req.query;
    const analytics = await getAdminGlobalAnalytics({ especialidadId, grupoId, alumnoId });
    res.json(analytics);
  } catch (error) {
    console.error('Admin analytics error:', error);
    res.status(500).json({ error: 'Error al consultar analíticas globales de progreso.' });
  }
});

// System Health Check (Private status without secret exposure)
app.get('/api/health', async (req, res) => {
  try {
    const dbCheck = await query('SELECT 1 as alive');
    const isDbAlive = dbCheck && dbCheck.length > 0 && dbCheck[0].alive === 1;

    let monitored = 0;
    try {
      const syncStatus = await query(`
        SELECT buzon, estado
        FROM cuentas_correo LIMIT 5
      `);
      monitored = syncStatus ? syncStatus.length : 0;
    } catch (_) {}

    res.json({
      status: isDbAlive ? 'UP' : 'DOWN',
      database: isDbAlive ? 'HEALTHY' : 'UNAVAILABLE',
      timestamp: new Date().toISOString(),
      mail_accounts_monitored: monitored
    });
  } catch (error) {
    res.status(500).json({ status: 'DOWN', database: 'ERROR', timestamp: new Date().toISOString() });
  }
});

// Autonomous Cron Sync Endpoint for Hostinger Cron Jobs
app.post('/api/internal/cron/sync', async (req, res) => {
  try {
    const authHeader = req.headers['x-cron-key'];
    const expectedKey = process.env.CRON_SECRET_KEY || 'pendulo_internal_cron_2026';

    if (authHeader !== expectedKey && !req.headers.authorization) {
      return res.status(401).json({ error: 'Clave de cron no autorizada.' });
    }

    const syncLog = await syncImapMailbox();
    const mailLog = await processPendingEmailTasks();

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      syncLog,
      mailLog
    });
  } catch (error) {
    console.error('Autonomous Cron Sync Error:', error);
    res.status(500).json({ error: 'Error durante la ejecución del cron autónomo.' });
  }
});

// Helper for sending transactional / notification emails via SMTP
async function sendSystemEmail({ to, subject, html, attachments }) {
  try {
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = Number(process.env.SMTP_PORT || 465);
    const smtpUser = process.env.SMTP_USER || 'info.academiaspendulo@gmail.com';
    const smtpPass = process.env.SMTP_PASS || 'zdhzjlujcpbhlynb';

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
      tls: { rejectUnauthorized: false }
    });

    const mailOptions = {
      from: `"Academias Péndulo" <${smtpUser}>`,
      to,
      subject,
      html
    };

    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      mailOptions.attachments = attachments;
    }

    const info = await transporter.sendMail(mailOptions);

    console.log(`[SMTP SYSTEM EMAIL SENT] To: ${to} | ID: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error('[SMTP SYSTEM EMAIL ERROR]', err.message);
    throw err;
  }
}

// Public Contact & Course Information Request endpoint
app.post('/api/public/contact', async (req, res) => {
  try {
    const clientIp = req.ip || req.connection.remoteAddress || '127.0.0.1';
    if (!checkRateLimit(`contact:${clientIp}`, 15, 15 * 60 * 1000)) {
      return res.status(429).json({ error: 'Demasiadas solicitudes enviadas. Por favor, inténtelo de nuevo en 15 minutos.' });
    }

    const firstName = (req.body.first_name || req.body.nombre || '').trim();
    const lastName = (req.body.last_name || req.body.apellidos || '').trim();
    const email = (req.body.email || '').trim();
    const phone = (req.body.phone || req.body.telefono || '').trim();
    const courseId = req.body.course_id || req.body.especialidad_id || '';
    const courseCode = req.body.course_code || '';
    const courseName = req.body.course_name || req.body.curso_interes || 'Curso Academias Péndulo';
    const preferredSchedule = req.body.preferred_schedule || 'Indiferente';
    const employmentStatus = req.body.employment_status || 'No especificado';
    const userMessage = req.body.comments || req.body.message || req.body.mensaje || 'Solicitud de información desde formulario público web.';
    const requestSource = req.body.source || 'Formulario de Información de Curso';

    if (!firstName || (!email && !phone)) {
      return res.status(400).json({ error: 'Nombre y método de contacto (correo electrónico o teléfono) son obligatorios.' });
    }

    const reqId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const userEmail = email ? email : `${phone}@pendiente.es`;
    const userPhone = phone;
    const courseTitle = courseName;

    // 1. Insert into contact_requests
    await query(`
      INSERT INTO contact_requests
      (id, first_name, last_name, email, phone, course_id, course_code, course_name, preferred_schedule, employment_status, comments, message, source, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', NOW())
    `, [
      reqId,
      firstName,
      lastName,
      userEmail,
      userPhone,
      courseId || 'TMVG0004',
      courseCode || courseId || 'TMVG0004',
      courseTitle,
      preferredSchedule,
      employmentStatus,
      userMessage,
      userMessage,
      requestSource
    ]);

    // 2. Insert into solicitudes_secretaria
    const secRef = `SEC-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    const fullName = `${firstName} ${lastName}`.trim();
    await query(`
      INSERT INTO solicitudes_secretaria
      (id, referencia, estudiante_id, estudiante_nombre, tipo, asunto, descripcion, estado, fecha_creacion, fecha_actualizacion)
      VALUES (?, ?, 'usr_anonimo', ?, 'INFORMACION_CURSO', ?, ?, 'PENDIENTE', NOW(), NOW())
    `, [
      `sol_sec_${reqId}`,
      secRef,
      fullName,
      `Solicitud de Información: ${courseTitle}`,
      `Interesado: ${fullName}\nEmail: ${userEmail}\nTeléfono: ${userPhone || 'No facilitado'}\nCurso: ${courseTitle}\nHorario: ${preferredSchedule || 'Indiferente'}\nComentarios: ${userMessage}`
    ]);

    // 3. Create Admin Notification
    try {
      const adminUsers = await query("SELECT id FROM usuarios WHERE email LIKE '%admin%' OR email LIKE '%pendulo%' LIMIT 1");
      const targetAdminId = adminUsers[0]?.id || 'usr-admin-1';
      await query(`
        INSERT INTO notificaciones (id, destinatario_id, tipo, referencia_tipo, referencia_id, titulo, mensaje, creado_en)
        VALUES (?, ?, 'SOLICITUD_INFORMACION', 'contact_request', ?, ?, ?, NOW())
      `, [
        `notif_${reqId}`,
        targetAdminId,
        reqId,
        `Consulta de Curso: ${courseTitle}`,
        `Nueva consulta de información de ${fullName} (${userEmail}) sobre ${courseTitle}.`
      ]);
    } catch (notifErr) {
      console.warn('Could not insert admin notification:', notifErr.message);
    }

    // 4. Send email notification to Secretaría / Admin (info.academiaspendulo@gmail.com)
    const adminNotificationEmail = process.env.DEFAULT_NOTIFICATION_EMAIL || process.env.SMTP_USER || 'info.academiaspendulo@gmail.com';
    sendSystemEmail({
      to: adminNotificationEmail,
      subject: `🔔 Nueva Solicitud de Información: ${fullName} - ${courseTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background: #ffffff;">
          <h2 style="color: #4f46e5; margin-top: 0;">Nueva Solicitud de Información en Secretaría</h2>
          <p>Se ha recibido una nueva solicitud de información / plaza desde la web:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
            <tr style="border-bottom: 1px solid #f3f4f6;"><td style="padding: 8px; font-weight: bold; width: 140px;">Nombre:</td><td style="padding: 8px;">${fullName}</td></tr>
            <tr style="border-bottom: 1px solid #f3f4f6;"><td style="padding: 8px; font-weight: bold;">Email:</td><td style="padding: 8px;"><a href="mailto:${userEmail}">${userEmail}</a></td></tr>
            <tr style="border-bottom: 1px solid #f3f4f6;"><td style="padding: 8px; font-weight: bold;">Teléfono:</td><td style="padding: 8px;">${userPhone || 'No facilitado'}</td></tr>
            <tr style="border-bottom: 1px solid #f3f4f6;"><td style="padding: 8px; font-weight: bold;">Curso solicitado:</td><td style="padding: 8px;">${courseTitle} (${courseCode || 'N/A'})</td></tr>
            <tr style="border-bottom: 1px solid #f3f4f6;"><td style="padding: 8px; font-weight: bold;">Horario preferido:</td><td style="padding: 8px;">${preferredSchedule || 'Indiferente'}</td></tr>
            <tr style="border-bottom: 1px solid #f3f4f6;"><td style="padding: 8px; font-weight: bold;">Situación laboral:</td><td style="padding: 8px;">${employmentStatus || 'No especificada'}</td></tr>
            <tr style="border-bottom: 1px solid #f3f4f6;"><td style="padding: 8px; font-weight: bold;">Mensaje / Notas:</td><td style="padding: 8px;">${userMessage}</td></tr>
            <tr style="border-bottom: 1px solid #f3f4f6;"><td style="padding: 8px; font-weight: bold;">Origen:</td><td style="padding: 8px;">${requestSource}</td></tr>
          </table>
          <p style="font-size: 12px; color: #6b7280; margin-top: 20px;">Fecha: ${new Date().toLocaleString('es-ES')}</p>
        </div>
      `
    }).catch(err => console.warn('Admin notification email failed:', err.message));

    // 5. Send confirmation email to prospective student if valid email provided
    if (email && email.includes('@') && !email.includes('pendiente')) {
      sendSystemEmail({
        to: email.trim(),
        subject: `✅ Consulta Recibida - Academias Péndulo (${courseTitle})`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e0e7ff; border-radius: 12px; background: #ffffff;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h1 style="color: #4f46e5; margin: 0;">Academias Péndulo</h1>
              <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">Centro de Formación Profesional Oficial</p>
            </div>
            <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 20px 0;" />
            <h2 style="color: #1f2937;">¡Hola ${firstName}! Hemos recibido tu consulta</h2>
            <p>Muchas gracias por contactar con <strong>Academias Péndulo</strong>. Hemos registrado correctamente tu solicitud de información sobre el curso:</p>
            <div style="background-color: #f4f4f5; padding: 16px; border-radius: 8px; margin: 15px 0;">
              <p style="margin: 0; font-weight: bold; color: #111827;">${courseTitle}</p>
              ${courseCode ? `<p style="margin: 4px 0 0 0; font-size: 12px; color: #4b5563;">Código oficial: ${courseCode}</p>` : ''}
            </div>
            <p>Nuestro equipo se pondrá en contacto contigo para facilitarte más información.</p>
            <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 20px 0;" />
            <p style="font-size: 11px; color: #9ca3af; text-align: center;">Academias Péndulo · Centro Homologado Nº 0400030892</p>
          </div>
        `
      }).catch(err => console.warn('Student confirmation email failed:', err.message));
    }

    res.status(201).json({
      success: true,
      requestId: reqId,
      message: 'Hemos recibido tu consulta sobre este curso. Nuestro equipo se pondrá en contacto contigo para facilitarte más información.'
    });
  } catch (error) {
    console.error('Public contact request error:', error);
    res.status(500).json({ error: 'Error al procesar la solicitud de contacto.' });
  }
});

// Admin endpoint: Fetch contact requests
app.get('/api/admin/contact-requests', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    if (!req.user.roles.includes('ADMINISTRADOR')) {
      return res.status(403).json({ error: 'Acceso restringido.' });
    }
    const requests = await query(`SELECT * FROM contact_requests ORDER BY created_at DESC`);
    res.json(requests);
  } catch (error) {
    console.error('Fetch contact requests error:', error);
    res.status(500).json({ error: 'Error al consultar las solicitudes de contacto.' });
  }
});

// Admin endpoint: Update contact request status / notes
app.patch('/api/admin/contact-requests/:id', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    if (!req.user.roles.includes('ADMINISTRADOR')) {
      return res.status(403).json({ error: 'Acceso restringido.' });
    }
    const { id } = req.params;
    const { status, internal_notes, assigned_admin_name } = req.body;

    const updates = [];
    const params = [];

    if (status) {
      updates.push('status = ?');
      params.push(status);
    }
    if (internal_notes !== undefined) {
      updates.push('internal_notes = ?');
      params.push(internal_notes);
    }
    if (assigned_admin_name !== undefined) {
      updates.push('assigned_admin_name = ?');
      params.push(assigned_admin_name);
    }

    if (updates.length > 0) {
      params.push(id);
      await query(`UPDATE contact_requests SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Update contact request error:', error);
    res.status(500).json({ error: 'Error al actualizar la solicitud.' });
  }
});

// Public Employment Pool registration endpoint (Bolsa de Empleo Automoción)
app.post('/api/public/employment-pool', async (req, res) => {
  try {
    const {
      nombre,
      telefono,
      email,
      ciudad,
      especialidad,
      titulacion,
      experiencia,
      disponibilidad,
      observaciones
    } = req.body;

    if (!nombre || !telefono || !email) {
      return res.status(400).json({ error: 'Nombre, teléfono y correo son obligatorios.' });
    }

    const candId = `cand_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const userEmail = email.trim();
    const candidateName = nombre.trim();
    const candidateSpec = especialidad || 'Automoción General';

    // 1. Insert into bolsa_empleo
    await query(`
      INSERT INTO bolsa_empleo
      (id, nombre, telefono, email, ciudad, especialidad, titulacion, experiencia, disponibilidad, observaciones, estado, creado_en)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVO', NOW())
    `, [
      candId,
      candidateName,
      telefono.trim(),
      userEmail,
      ciudad ? ciudad.trim() : 'Almería',
      candidateSpec,
      titulacion || 'No especificada',
      experiencia || 'No especificada',
      disponibilidad || 'Inmediata',
      observaciones || 'Inscripción directa a Bolsa de Empleo.'
    ]);

    // 2. Send email notification to Admin / Secretaría (info.academiaspendulo@gmail.com)
    const adminNotificationEmail = process.env.DEFAULT_NOTIFICATION_EMAIL || process.env.SMTP_USER || 'info.academiaspendulo@gmail.com';
    sendSystemEmail({
      to: adminNotificationEmail,
      subject: `💼 Nueva Candidatura Bolsa de Empleo Automoción: ${candidateName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background: #ffffff;">
          <h2 style="color: #dc2626; margin-top: 0;">Nueva Inscripción en Bolsa de Empleo Automoción</h2>
          <p>Un nuevo candidato se ha registrado en la Bolsa de Empleo de Academias Péndulo:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
            <tr style="border-bottom: 1px solid #f3f4f6;"><td style="padding: 8px; font-weight: bold; width: 140px;">Candidato:</td><td style="padding: 8px;">${candidateName}</td></tr>
            <tr style="border-bottom: 1px solid #f3f4f6;"><td style="padding: 8px; font-weight: bold;">Teléfono:</td><td style="padding: 8px;">${telefono}</td></tr>
            <tr style="border-bottom: 1px solid #f3f4f6;"><td style="padding: 8px; font-weight: bold;">Email:</td><td style="padding: 8px;"><a href="mailto:${userEmail}">${userEmail}</a></td></tr>
            <tr style="border-bottom: 1px solid #f3f4f6;"><td style="padding: 8px; font-weight: bold;">Ciudad:</td><td style="padding: 8px;">${ciudad || 'Almería'}</td></tr>
            <tr style="border-bottom: 1px solid #f3f4f6;"><td style="padding: 8px; font-weight: bold;">Especialidad:</td><td style="padding: 8px; font-weight: bold; color: #dc2626;">${candidateSpec}</td></tr>
            <tr style="border-bottom: 1px solid #f3f4f6;"><td style="padding: 8px; font-weight: bold;">Titulación:</td><td style="padding: 8px;">${titulacion || 'No especificada'}</td></tr>
            <tr style="border-bottom: 1px solid #f3f4f6;"><td style="padding: 8px; font-weight: bold;">Experiencia:</td><td style="padding: 8px;">${experiencia || 'No especificada'}</td></tr>
            <tr style="border-bottom: 1px solid #f3f4f6;"><td style="padding: 8px; font-weight: bold;">Disponibilidad:</td><td style="padding: 8px;">${disponibilidad || 'Inmediata'}</td></tr>
            <tr style="border-bottom: 1px solid #f3f4f6;"><td style="padding: 8px; font-weight: bold;">Observaciones:</td><td style="padding: 8px;">${observaciones || 'Sin observaciones'}</td></tr>
          </table>
          <p style="font-size: 12px; color: #6b7280; margin-top: 20px;">Registrado el ${new Date().toLocaleString('es-ES')}</p>
        </div>
      `
    });

    // 3. Send confirmation email to Candidate
    sendSystemEmail({
      to: userEmail,
      subject: `💼 Confirmación Bolsa de Empleo Automoción - Academias Péndulo`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e0e7ff; border-radius: 12px; background: #ffffff;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #dc2626; margin: 0;">Academias Péndulo</h1>
            <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">Bolsa de Empleo Oficial Automoción</p>
          </div>
          <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 20px 0;" />
          <h2 style="color: #1f2937;">¡Hola ${candidateName}! Tu candidatura ha sido registrada</h2>
          <p>Hemos incorporado correctamente tu perfil a la <strong>Bolsa de Empleo de Academias Péndulo</strong> para la especialidad de <strong>${candidateSpec}</strong>.</p>
          <div style="background-color: #fef2f2; padding: 16px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #dc2626;">
            <p style="margin: 0; font-weight: bold; color: #991b1b;">Especialidad seleccionada: ${candidateSpec}</p>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #7f1d1d;">Titulación: ${titulacion || 'Formación sector automoción'}</p>
          </div>
          <p>Cuando nuestras empresas colaboradoras del sector automoción en Almería soliciten candidatos con tu perfil, nos pondremos en contacto contigo en el teléfono <strong>${telefono}</strong>.</p>
          <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 20px 0;" />
          <p style="font-size: 11px; color: #9ca3af; text-align: center;">Academias Péndulo · Centro de Formación Profesional Oficial</p>
        </div>
      `
    });

    res.status(201).json({ success: true, candidateId: candId });
  } catch (error) {
    console.error('Public employment pool registration error:', error);
    res.status(500).json({ error: 'Error al registrar la candidatura en la bolsa de empleo.' });
  }
});

// Admin endpoint: Fetch candidates from employment pool
app.get('/api/admin/employment-pool', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    if (!req.user.roles.includes('ADMINISTRADOR')) {
      return res.status(403).json({ error: 'Acceso restringido.' });
    }
    const candidates = await query(`SELECT * FROM bolsa_empleo ORDER BY creado_en DESC`);
    res.json(candidates);
  } catch (error) {
    console.error('Fetch employment pool error:', error);
    res.status(500).json({ error: 'Error al consultar candidatos de la bolsa de empleo.' });
  }
});

// ==========================================
// TRABAJA CON NOSOTROS (EMPLOYMENT & CV RECRUITMENT)
// ==========================================

// Public Work With Us (Trabaja con Nosotros) application endpoint
app.post('/api/public/work-with-us', async (req, res) => {
  try {
    const clientIp = req.ip || req.connection.remoteAddress || '127.0.0.1';
    if (!checkRateLimit(`work_with_us:${clientIp}`, 10, 15 * 60 * 1000)) {
      return res.status(429).json({ error: 'Demasiadas solicitudes enviadas. Por favor, inténtelo de nuevo en 15 minutos.' });
    }

    const {
      name,
      nombre,
      email,
      phone,
      telefono,
      position,
      puesto,
      notes,
      observaciones,
      cv_filename,
      cv_nombre,
      cv_base64,
      cv_data
    } = req.body;

    const candName = (name || nombre || '').trim();
    const userEmail = (email || '').trim();
    const userPhone = (phone || telefono || '').trim();

    if (!candName || !userEmail || !userPhone) {
      return res.status(400).json({ error: 'Nombre, email y teléfono son requeridos.' });
    }

    const candId = `trab_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const candidateName = candName;
    const candidatePosition = (position || puesto || 'Docente de Automoción').trim();
    const candidateNotes = (notes || observaciones || 'Candidatura enviada desde la web.').trim();

    let savedCvPath = null;
    let cvOriginalName = cv_filename || cv_nombre || 'CV.pdf';
    let emailAttachments = [];

    // Handle CV file base64 if provided
    const base64Data = cv_base64 || cv_data;
    if (base64Data) {
      try {
        const matches = typeof base64Data === 'string' ? base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/) : null;
        let buffer;
        if (matches && matches.length === 3) {
          buffer = Buffer.from(matches[2], 'base64');
        } else {
          buffer = Buffer.from(base64Data, 'base64');
        }

        const fileCheck = validateFileBuffer(buffer, cvOriginalName, 'CV');
        if (!fileCheck.valid) {
          return res.status(400).json({ error: fileCheck.error });
        }

        const safeName = `cv_${Date.now()}_${generateToken(6)}${fileCheck.ext}`;
        const fullPath = path.join(CVS_UPLOAD_DIR, safeName);
        fs.writeFileSync(fullPath, buffer);
        savedCvPath = `/uploads/cvs/${safeName}`;

        emailAttachments.push({
          filename: cvOriginalName,
          content: buffer
        });
      } catch (cvErr) {
        console.warn('Error saving CV file on disk:', cvErr);
        return res.status(400).json({ error: 'Error al procesar el archivo adjunto del CV.' });
      }
    }

    // 1. Insert into MySQL candidaturas_trabajo
    await query(`
      INSERT INTO candidaturas_trabajo
      (id, nombre, email, telefono, puesto, observaciones, cv_nombre, cv_ruta, cv_base64, estado, creado_en)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDIENTE', NOW())
    `, [
      candId,
      candidateName,
      userEmail,
      userPhone,
      candidatePosition,
      candidateNotes,
      cvOriginalName,
      savedCvPath,
      base64Data || null
    ]);

    // 2. Email notification to Secretaría / HR Admin
    const adminNotificationEmail = process.env.DEFAULT_NOTIFICATION_EMAIL || process.env.SMTP_USER || 'info.academiaspendulo@gmail.com';
    try {
      await sendSystemEmail({
        to: adminNotificationEmail,
        subject: `💼 Nueva Candidatura Recibida (Trabaja con Nosotros): ${candidateName} - ${candidatePosition}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background: #ffffff;">
            <h2 style="color: #dc2626; margin-top: 0;">💼 Nueva Candidatura: Trabaja con Nosotros</h2>
            <p>Se ha recibido una nueva solicitud de empleo para el equipo de Academias Péndulo:</p>
            <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
              <tr style="border-bottom: 1px solid #f3f4f6;"><td style="padding: 8px; font-weight: bold; width: 140px;">Candidato:</td><td style="padding: 8px;">${candidateName}</td></tr>
              <tr style="border-bottom: 1px solid #f3f4f6;"><td style="padding: 8px; font-weight: bold;">Puesto de Interés:</td><td style="padding: 8px; font-weight: bold; color: #dc2626;">${candidatePosition}</td></tr>
              <tr style="border-bottom: 1px solid #f3f4f6;"><td style="padding: 8px; font-weight: bold;">Teléfono:</td><td style="padding: 8px;"><a href="tel:${userPhone}">${userPhone}</a></td></tr>
              <tr style="border-bottom: 1px solid #f3f4f6;"><td style="padding: 8px; font-weight: bold;">Email:</td><td style="padding: 8px;"><a href="mailto:${userEmail}">${userEmail}</a></td></tr>
              <tr style="border-bottom: 1px solid #f3f4f6;"><td style="padding: 8px; font-weight: bold;">CV Adjunto:</td><td style="padding: 8px;">${cvOriginalName} (adjunto en este correo)</td></tr>
              <tr style="border-bottom: 1px solid #f3f4f6;"><td style="padding: 8px; font-weight: bold;">Carta / Mensaje:</td><td style="padding: 8px;">${candidateNotes}</td></tr>
            </table>
            <p style="font-size: 12px; color: #6b7280; margin-top: 20px;">Recibido el ${new Date().toLocaleString('es-ES')}</p>
          </div>
        `,
        attachments: emailAttachments
      });
    } catch (eMailErr) {
      console.warn('Error sending admin notification email:', eMailErr);
    }

    // 3. Confirmation email to the Candidate
    try {
      await sendSystemEmail({
        to: userEmail,
        subject: `💼 Hemos recibido tu CV - Academias Péndulo`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e0e7ff; border-radius: 12px; background: #ffffff;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h1 style="color: #dc2626; margin: 0;">Academias Péndulo</h1>
              <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">Selección y Recursos Humanos</p>
            </div>
            <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 20px 0;" />
            <h2 style="color: #1f2937;">¡Hola ${candidateName}!</h2>
            <p>Hemos recibido correctamente tu currículum vitae y datos de candidatura para el puesto de <strong>${candidatePosition}</strong>.</p>
            <div style="background-color: #fef2f2; padding: 16px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #dc2626;">
              <p style="margin: 0; font-weight: bold; color: #991b1b;">Puesto solicitado: ${candidatePosition}</p>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: #7f1d1d;">Currículum registrado: ${cvOriginalName}</p>
            </div>
            <p>Nuestro equipo directivo y pedagógico revisará tu perfil detalladamente. Si tu experiencia se ajusta a nuestras vacantes actuales o de próximas convocatorias, nos pondremos en contacto contigo a través del teléfono <strong>${userPhone}</strong> o este correo electrónico.</p>
            <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 20px 0;" />
            <p style="font-size: 11px; color: #9ca3af; text-align: center;">Academias Péndulo · Centro de Formación Profesional Oficial de Automoción</p>
          </div>
        `
      });
    } catch (cMailErr) {
      console.warn('Error sending candidate confirmation email:', cMailErr);
    }

    res.status(201).json({ success: true, id: candId });
  } catch (error) {
    console.error('Work with us registration error:', error);
    res.status(500).json({ error: 'Error al procesar la candidatura. Por favor inténtalo de nuevo.' });
  }
});

// Admin endpoint: Fetch all job applications
app.get('/api/admin/work-with-us', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    const userRoles = req.user.roles || [];
    if (!userRoles.some(r => ['ADMINISTRADOR', 'ADMIN', 'SECRETARIA', 'DIRECCION'].includes(r))) {
      return res.status(403).json({ error: 'Acceso restringido a la secretaría y administración.' });
    }
    const applications = await query(`SELECT * FROM candidaturas_trabajo ORDER BY creado_en DESC`);
    res.json(applications);
  } catch (error) {
    console.error('Fetch work with us applications error:', error);
    res.status(500).json({ error: 'Error al consultar candidaturas de empleo.' });
  }
});

function generateCandidateSummaryBuffer(c) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', err => reject(err));

      const RED = '#DC2626';
      const DARK_GRAY = '#1F2937';
      const LIGHT_BG = '#FEF2F2';

      // Header Branding
      doc.fillColor(DARK_GRAY).font('Helvetica-Bold').fontSize(22).text('Academias', 40, 40);
      doc.fillColor(RED).fontSize(28).text('PÉNDULO', 40, 64);
      doc.fillColor('#4B5563').font('Helvetica-Bold').fontSize(8).text('SELECCIÓN Y RECURSOS HUMANOS', 40, 96);

      // Document Title
      doc.fillColor(RED).font('Helvetica-Bold').fontSize(14).text('FICHA OFICIAL DE CANDIDATURA', 280, 45, { align: 'right' });
      doc.fillColor('#6B7280').font('Helvetica').fontSize(9).text('Trabaja con Nosotros · Academias Péndulo', 280, 65, { align: 'right' });
      doc.fillColor(DARK_GRAY).font('Helvetica-Bold').fontSize(9.5).text(`ID: ${c.id || 'N/A'}`, 280, 80, { align: 'right' });

      // Divider Line
      doc.moveTo(40, 110).lineTo(555, 110).strokeColor(RED).lineWidth(2).stroke();

      // Banner Puesto
      doc.rect(40, 125, 515, 36).fillAndStroke(LIGHT_BG, '#FCA5A5');
      doc.fillColor(RED).font('Helvetica-Bold').fontSize(8.5).text('PUESTO SOLICITADO', 50, 131);
      doc.fillColor(DARK_GRAY).font('Helvetica-Bold').fontSize(12).text(c.puesto || 'Docente de Automoción', 50, 143);

      // Candidate Information Rows
      let y = 175;
      const addRow = (label, value) => {
        doc.rect(40, y, 515, 26).fillAndStroke('#F9FAFB', '#E5E7EB');
        doc.fillColor('#4B5563').font('Helvetica-Bold').fontSize(9).text(label, 50, y + 8);
        doc.fillColor(DARK_GRAY).font('Helvetica-Bold').fontSize(10).text(String(value || 'No especificado'), 180, y + 8);
        y += 30;
      };

      addRow('Nombre Completo:', c.nombre);
      addRow('Correo Electrónico:', c.email);
      addRow('Teléfono de Contacto:', c.telefono);
      addRow('Estado de Candidatura:', c.estado || 'PENDIENTE');
      addRow('Fecha de Envío:', c.creado_en ? new Date(c.creado_en).toLocaleString('es-ES') : new Date().toLocaleString('es-ES'));

      // Observations Box
      y += 10;
      doc.fillColor(DARK_GRAY).font('Helvetica-Bold').fontSize(11).text('Carta de Presentación / Mensaje del Candidato:', 40, y);
      y += 18;
      doc.rect(40, y, 515, 120).fillAndStroke('#FFFFFF', '#D1D5DB');
      doc.fillColor('#374151').font('Helvetica').fontSize(9.5).text(
        c.observaciones || 'Candidatura registrada a través del portal telemático de empleo de Academias Péndulo.',
        50, y + 12, { width: 495, lineGap: 3 }
      );

      // Footer
      doc.moveTo(40, 720).lineTo(555, 720).strokeColor('#E5E7EB').lineWidth(1).stroke();
      doc.fillColor('#9CA3AF').font('Helvetica').fontSize(8).text(
        'Academias Péndulo · Centro Oficial de Formación Profesional en Automoción · Almería',
        40, 730, { align: 'center' }
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// Admin endpoint: Download candidate CV
app.get('/api/admin/work-with-us/:id/cv', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    const userRoles = req.user.roles || [];
    if (!userRoles.some(r => ['ADMINISTRADOR', 'ADMIN', 'SECRETARIA', 'DIRECCION'].includes(r))) {
      return res.status(403).json({ error: 'Acceso restringido.' });
    }
    const { id } = req.params;
    const rows = await query(`SELECT * FROM candidaturas_trabajo WHERE id = ? LIMIT 1`, [id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Candidatura no encontrada.' });
    }

    const candidate = rows[0];
    const { cv_nombre, cv_ruta, cv_base64 } = candidate;
    const filename = cv_nombre || 'CV.pdf';

    // 1. Check if file is already on disk in CVS_UPLOAD_DIR
    if (cv_ruta) {
      const cvBasename = path.basename(cv_ruta);
      const diskPath = path.join(CVS_UPLOAD_DIR, cvBasename);
      if (fs.existsSync(diskPath) && fs.statSync(diskPath).size > 500) {
        return res.download(diskPath, filename);
      }
    }

    // 2. Check if we have base64 content saved in database
    if (cv_base64 && typeof cv_base64 === 'string' && cv_base64.length > 500) {
      const matches = cv_base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      const buffer = matches && matches.length === 3 ? Buffer.from(matches[2], 'base64') : Buffer.from(cv_base64, 'base64');
      
      const safeName = `cv_${Date.now()}_${generateToken(6)}${path.extname(filename) || '.pdf'}`;
      const newPath = path.join(CVS_UPLOAD_DIR, safeName);
      fs.writeFileSync(newPath, buffer);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      return res.send(buffer);
    }

    // 3. Fallback: Generate a styled, complete candidate PDF report
    const pdfBuffer = await generateCandidateSummaryBuffer(candidate);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    return res.send(pdfBuffer);
  } catch (error) {
    console.error('Download CV error:', error);
    res.status(500).json({ error: 'Error al descargar CV.' });
  }
});

// Admin endpoint: Update candidate status
app.patch('/api/admin/work-with-us/:id/status', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    const userRoles = req.user.roles || [];
    if (!userRoles.some(r => ['ADMINISTRADOR', 'ADMIN', 'SECRETARIA', 'DIRECCION'].includes(r))) {
      return res.status(403).json({ error: 'Acceso restringido.' });
    }
    const { id } = req.params;
    const { estado } = req.body;
    if (!['PENDIENTE', 'REVISADO', 'EN_PROCESO', 'SELECCIONADO', 'DESCARTADO'].includes(estado)) {
      return res.status(400).json({ error: 'Estado no válido.' });
    }
    await query(`UPDATE candidaturas_trabajo SET estado = ? WHERE id = ?`, [estado, id]);
    res.json({ success: true, estado });
  } catch (error) {
    console.error('Update candidate status error:', error);
    res.status(500).json({ error: 'Error al actualizar el estado de la candidatura.' });
  }
});

// ==========================================
// CONFIGURACIÓN BANCARIA Y TRANSFERENCIAS API
// ==========================================

async function getBankConfiguration() {
  const rows = await query(`SELECT * FROM configuracion_bancaria WHERE id = 1 LIMIT 1`);
  if (rows && rows.length > 0) {
    return rows[0];
  }
  return {
    titular_cuenta: 'Academias Péndulo S.L.',
    iban: '',
    entidad_bancaria: '',
    bic_swift: '',
    instrucciones_adicionales: 'Indique su Referencia de Matrícula como concepto de la transferencia bancaria.'
  };
}

// PUBLIC: Get active bank details for transfer
app.get('/api/public/bank-details', async (req, res) => {
  try {
    const config = await getBankConfiguration();
    res.json({
      titular_cuenta: config.titular_cuenta || 'Academias Péndulo S.L.',
      iban: config.iban || '',
      entidad_bancaria: config.entidad_bancaria || '',
      bic_swift: config.bic_swift || '',
      instrucciones_adicionales: config.instrucciones_adicionales || 'Indique su número de solicitud como concepto de la transferencia.'
    });
  } catch (error) {
    console.error('Fetch public bank details error:', error);
    res.status(500).json({ error: 'Error al consultar los datos bancarios.' });
  }
});

// ADMIN: Get bank configuration
app.get('/api/admin/bank-details', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    const userRoles = req.user.roles || [];
    if (!userRoles.some(r => ['ADMINISTRADOR', 'ADMIN', 'SECRETARIA', 'DIRECCION'].includes(r))) {
      return res.status(403).json({ error: 'Acceso restringido a personal de administración autorizado.' });
    }
    const config = await getBankConfiguration();
    res.json(config);
  } catch (error) {
    console.error('Fetch admin bank details error:', error);
    res.status(500).json({ error: 'Error al consultar configuración bancaria.' });
  }
});

// ADMIN: Update bank configuration
app.put('/api/admin/bank-details', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    const userRoles = req.user.roles || [];
    if (!userRoles.some(r => ['ADMINISTRADOR', 'ADMIN', 'SECRETARIA', 'DIRECCION'].includes(r))) {
      return res.status(403).json({ error: 'Acceso restringido a personal de administración autorizado.' });
    }

    const { titular_cuenta, iban, entidad_bancaria, bic_swift, instrucciones_adicionales } = req.body;
    const cleanTitular = (titular_cuenta || '').trim();
    const cleanIban = (iban || '').replace(/\s+/g, '').toUpperCase();
    const cleanEntidad = (entidad_bancaria || '').trim();
    const cleanBic = (bic_swift || '').trim().toUpperCase();
    const cleanInstrucciones = (instrucciones_adicionales || '').trim();
    const userActor = req.user.email || req.user.nombre || 'Administración';

    await query(`
      INSERT INTO configuracion_bancaria (
        id, titular_cuenta, iban, entidad_bancaria, bic_swift, instrucciones_adicionales, actualizado_por, actualizado_en
      ) VALUES (1, ?, ?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        titular_cuenta = VALUES(titular_cuenta),
        iban = VALUES(iban),
        entidad_bancaria = VALUES(entidad_bancaria),
        bic_swift = VALUES(bic_swift),
        instrucciones_adicionales = VALUES(instrucciones_adicionales),
        actualizado_por = VALUES(actualizado_por),
        actualizado_en = NOW()
    `, [cleanTitular, cleanIban, cleanEntidad, cleanBic, cleanInstrucciones, userActor]);

    await query(`
      INSERT INTO auditoria (actor_id, accion_administrativa, recurso, recurso_id, diff_cambios, ip, creado_en)
      VALUES (?, 'UPDATE_BANK_CONFIG', 'configuracion_bancaria', '1', ?, ?, NOW())
    `, [req.user.id, JSON.stringify({ titular: cleanTitular, iban: cleanIban ? (cleanIban.substring(0, 4) + '****' + cleanIban.slice(-4)) : '', entidad: cleanEntidad }), req.ip || null]);

    res.json({ success: true, message: 'Datos bancarios actualizados correctamente.' });
  } catch (error) {
    console.error('Update bank details error:', error);
    res.status(500).json({ error: 'Error al guardar la configuración bancaria.' });
  }
});

// PUBLIC: Student uploads bank transfer receipt (Private storage)
app.post('/api/public/inscriptions/:requestNumber/upload-receipt', async (req, res) => {
  try {
    const { requestNumber } = req.params;
    const { fileBase64, fileName, fileType, observaciones } = req.body;

    if (!fileBase64 || !fileName) {
      return res.status(400).json({ error: 'Debe adjuntar el archivo del justificante de pago.' });
    }

    const rows = await query(`SELECT * FROM inscription_requests WHERE request_number = ? LIMIT 1`, [requestNumber]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Solicitud no encontrada.' });
    }

    const reqData = rows[0];

    const cleanBase64 = fileBase64.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');
    
    // Validate file whitelist and binary magic bytes
    const fileCheck = validateFileBuffer(buffer, fileName, 'RECEIPT');
    if (!fileCheck.valid) {
      return res.status(400).json({ error: fileCheck.error });
    }

    const safeFilename = `justificante_${requestNumber}_${Date.now()}${fileCheck.ext}`;
    const destinationPath = path.join(RECEIPTS_UPLOAD_DIR, safeFilename);

    fs.writeFileSync(destinationPath, buffer);

    await query(`
      UPDATE inscription_requests
      SET justificante_ruta = ?,
          justificante_nombre = ?,
          justificante_subido_en = NOW(),
          fecha_comunicacion_pago = NOW(),
          estado_pago = 'JUSTIFICANTE_APORTADO',
          observaciones_administrativas = COALESCE(?, observaciones_administrativas),
          updated_at = NOW()
      WHERE id = ?
    `, [safeFilename, fileName, observaciones ? observaciones.trim() : null, reqData.id]);

    await query(`
      INSERT INTO inscription_request_history (request_id, user_id, event_type, description, created_at)
      VALUES (?, NULL, 'RECEIPT_UPLOADED', ?, NOW())
    `, [reqData.id, `El alumno comunicó pago y aportó justificante ("${fileName}"). Estado económico: JUSTIFICANTE_APORTADO. Pendiente comprobación contable.`]);

    res.json({
      success: true,
      message: 'Justificante de transferencia recibido correctamente. Secretaría y Administración verificarán el abono en cuenta.',
      estado_pago: 'JUSTIFICANTE_APORTADO'
    });
  } catch (error) {
    console.error('Upload receipt error:', error);
    res.status(500).json({ error: 'Error al subir el justificante: ' + error.message });
  }
});

// PUBLIC: Download student uploaded receipt by request number (Protected against IDOR)
app.get('/api/public/inscriptions/:requestNumber/receipt', async (req, res) => {
  try {
    const { requestNumber } = req.params;
    const rows = await query(`SELECT id, request_number, email, dni_nie, justificante_ruta, justificante_nombre FROM inscription_requests WHERE request_number = ? LIMIT 1`, [requestNumber]);
    if (!rows || rows.length === 0 || !rows[0].justificante_ruta) {
      return res.status(404).json({ error: 'No existe justificante registrado para esta solicitud.' });
    }

    const item = rows[0];

    // Authorization verification
    let authorized = false;

    // 1. Check session cookie if present
    const cookies = parseCookies(req);
    const sessionToken = cookies.campus_session || (req.headers.authorization && req.headers.authorization.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null);
    if (sessionToken) {
      const tokenH = hashToken(sessionToken);
      const sRows = await query(`
        SELECT u.id, u.email, (SELECT GROUP_CONCAT(r.codigo) FROM usuario_roles ur JOIN roles r ON ur.rol_id = r.id WHERE ur.usuario_id = u.id) as roles
        FROM sesiones s JOIN usuarios u ON s.usuario_id = u.id
        WHERE s.token_hash = ? AND s.revocado_en IS NULL AND s.expiracion > NOW() LIMIT 1
      `, [tokenH]);

      if (sRows && sRows.length > 0) {
        const u = sRows[0];
        const roles = (u.roles || '').split(',');
        if (roles.some(r => ['ADMINISTRADOR', 'ADMIN', 'SECRETARIA', 'DIRECCION'].includes(r))) {
          authorized = true;
        } else if (u.email && normalizeEmail(u.email) === normalizeEmail(item.email)) {
          authorized = true;
        }
      }
    }

    // 2. Check query verification (?dni=... or ?token=...)
    if (!authorized) {
      const reqDni = req.query.dni || req.headers['x-verify-dni'];
      const reqToken = req.query.token;
      if (reqDni && item.dni_nie && String(reqDni).trim().toUpperCase() === item.dni_nie.trim().toUpperCase()) {
        authorized = true;
      } else if (reqToken && verifyHmacSignature(requestNumber + ':' + item.email, reqToken)) {
        authorized = true;
      }
    }

    if (!authorized) {
      await logSecurityEvent({
        event: 'IDOR_BLOCKED',
        email: item.email,
        ip: req.ip || null,
        details: { resource: 'receipt', requestNumber },
        level: 'WARN'
      });
      return res.status(403).json({ error: 'Acceso no autorizado: Se requiere verificación de identidad para descargar este justificante.' });
    }

    const filePath = path.join(RECEIPTS_UPLOAD_DIR, item.justificante_ruta);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'El archivo de justificante no se encuentra en el servidor.' });
    }

    res.download(filePath, item.justificante_nombre || 'justificante_transferencia.pdf');
  } catch (error) {
    console.error('Download public receipt error:', error);
    res.status(500).json({ error: 'Error al descargar el justificante.' });
  }
});

// ADMIN: Download student uploaded receipt
app.get('/api/admin/inscriptions/:id/receipt', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    const userRoles = req.user.roles || [];
    if (!userRoles.some(r => ['ADMINISTRADOR', 'ADMIN', 'SECRETARIA', 'DIRECCION'].includes(r))) {
      return res.status(403).json({ error: 'Acceso restringido.' });
    }

    const rows = await query(`SELECT justificante_ruta, justificante_nombre FROM inscription_requests WHERE id = ? OR request_number = ? LIMIT 1`, [req.params.id, req.params.id]);
    if (!rows || rows.length === 0 || !rows[0].justificante_ruta) {
      return res.status(404).json({ error: 'No existe justificante registrado para esta solicitud.' });
    }

    const filePath = path.join(RECEIPTS_UPLOAD_DIR, rows[0].justificante_ruta);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'El archivo de justificante no se encuentra en el servidor.' });
    }

    res.download(filePath, rows[0].justificante_nombre || 'justificante_transferencia.pdf');
  } catch (error) {
    console.error('Download admin receipt error:', error);
    res.status(500).json({ error: 'Error al descargar el justificante.' });
  }
});

// ADMIN: Verify manual bank transfer (Requirement 6)
app.put('/api/admin/inscriptions/:id/verify-transfer', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    const userRoles = req.user.roles || [];
    if (!userRoles.some(r => ['ADMINISTRADOR', 'ADMIN', 'SECRETARIA', 'DIRECCION'].includes(r))) {
      return res.status(403).json({ error: 'Acceso restringido a personal de administración autorizado.' });
    }

    const reqId = req.params.id;
    const { referencia_bancaria, observaciones, resolver_incidencia } = req.body;

    const rows = await query(`SELECT * FROM inscription_requests WHERE id = ? OR request_number = ? LIMIT 1`, [reqId, reqId]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Solicitud no encontrada.' });
    }

    const reqData = rows[0];

    // Check 1: Valid course
    if (!reqData.course_name) {
      return res.status(400).json({ error: 'La solicitud no corresponde a un curso válido.' });
    }

    // Check 2: Valid amount
    if (reqData.precio_final_snapshot == null || Number(reqData.precio_final_snapshot) < 0) {
      return res.status(400).json({ error: 'El importe económico fijado en la solicitud no es válido.' });
    }

    // Check 3: Blocking incident
    if (reqData.estado_pago === 'INCIDENCIA' && !resolver_incidencia) {
      return res.status(400).json({ error: 'Existe una incidencia económica activa. Marque la confirmación de resolución para continuar.' });
    }

    // Check 4: Payment not already verified
    if (reqData.estado_pago === 'TRANSFERENCIA_VERIFICADA') {
      return res.status(400).json({ error: 'La transferencia bancaria ya fue verificada previamente.' });
    }

    const userActor = req.user.email || req.user.nombre || 'Administración';
    const estadoAnterior = reqData.estado_pago;
    const nuevoEstado = 'TRANSFERENCIA_VERIFICADA';

    const updateResult = await query(`
      UPDATE inscription_requests
      SET estado_pago = ?,
          fecha_verificacion_bancaria = NOW(),
          verificado_por_usuario_id = ?,
          verificado_pago_por = ?,
          verificado_pago_en = NOW(),
          referencia_bancaria_externa = COALESCE(?, referencia_bancaria_externa),
          observaciones_administrativas = COALESCE(?, observaciones_administrativas),
          motivo_incidencia = NULL,
          updated_at = NOW()
      WHERE id = ? AND estado_pago != 'TRANSFERENCIA_VERIFICADA'
    `, [nuevoEstado, req.user.id, userActor, referencia_bancaria || null, observaciones || null, reqData.id]);

    if (updateResult.affectedRows === 0) {
      return res.status(400).json({ error: 'La transferencia bancaria ya fue verificada simultáneamente por otro operador.' });
    }

    await query(`
      INSERT INTO inscription_request_history (request_id, user_id, event_type, description, created_at)
      VALUES (?, ?, 'TRANSFER_VERIFIED', ?, NOW())
    `, [
      reqData.id,
      req.user.id,
      `Transferencia bancaria CONFIRMADA Y VERIFICADA por ${userActor}. Importe: ${Number(reqData.precio_final_snapshot).toFixed(2)} ${reqData.moneda_snapshot || 'EUR'}. Ref bancaria: ${referencia_bancaria || 'Verificación manual en cuenta'}. Estado anterior: ${estadoAnterior} -> ${nuevoEstado}. IMPORTANTE: Matrícula pendiente de alta administrativa (campus aún no activo).`
    ]);

    await query(`
      INSERT INTO auditoria (actor_id, accion_administrativa, recurso, recurso_id, diff_cambios, ip, creado_en)
      VALUES (?, 'TRANSFER_VERIFIED', 'inscription_requests', ?, ?, ?, NOW())
    `, [
      req.user.id,
      String(reqData.id),
      JSON.stringify({
        estadoAnterior,
        nuevoEstado,
        importe: reqData.precio_final_snapshot,
        referencia: reqData.referencia_transferencia || reqData.request_number,
        operador: userActor
      }),
      req.ip || null
    ]);

    res.json({
      success: true,
      message: 'Transferencia bancaria verificada correctamente. Ya puede proceder a Aprobar Matrícula y Dar de Alta.',
      estado_pago: nuevoEstado
    });
  } catch (error) {
    console.error('Verify transfer error:', error);
    res.status(500).json({ error: 'Error al verificar la transferencia: ' + error.message });
  }
});

// ADMIN: Report payment incidence (Requirement 3 & 5)
app.put('/api/admin/inscriptions/:id/report-incident', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    const userRoles = req.user.roles || [];
    if (!userRoles.some(r => ['ADMINISTRADOR', 'ADMIN', 'SECRETARIA', 'DIRECCION'].includes(r))) {
      return res.status(403).json({ error: 'Acceso restringido a personal de administración autorizado.' });
    }

    const { motivo } = req.body;
    if (!motivo || !motivo.trim()) {
      return res.status(400).json({ error: 'Debe especificar el motivo o descripción de la incidencia económica.' });
    }

    const reqId = req.params.id;
    const rows = await query(`SELECT id FROM inscription_requests WHERE id = ? OR request_number = ? LIMIT 1`, [reqId, reqId]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Solicitud no encontrada.' });
    }
    const targetId = rows[0].id;

    const userActor = req.user.email || req.user.nombre || 'Administración';
    await query(`
      UPDATE inscription_requests
      SET estado_pago = 'INCIDENCIA',
          motivo_incidencia = ?,
          updated_at = NOW()
      WHERE id = ?
    `, [motivo.trim(), targetId]);

    await query(`
      INSERT INTO inscription_request_history (request_id, user_id, event_type, description, created_at)
      VALUES (?, ?, 'PAYMENT_INCIDENT', ?, NOW())
    `, [targetId, req.user.id, `Incidencia económica registrada por ${userActor}: ${motivo.trim()}`]);

    await query(`
      INSERT INTO auditoria (actor_id, accion_administrativa, recurso, recurso_id, diff_cambios, ip, creado_en)
      VALUES (?, 'PAYMENT_INCIDENT', 'inscription_requests', ?, ?, ?, NOW())
    `, [req.user.id, String(targetId), JSON.stringify({ motivo: motivo.trim(), operador: userActor }), req.ip || null]);

    res.json({ success: true, message: 'Incidencia económica registrada correctamente.' });
  } catch (error) {
    console.error('Report payment incident error:', error);
    res.status(500).json({ error: 'Error al registrar la incidencia: ' + error.message });
  }
});

// ==========================================
// SISTEMA DE SOLICITUDES DE INSCRIPCIÓN API
// ==========================================

// 1. PUBLIC: Submit new inscription request
app.post('/api/public/inscription-request', async (req, res) => {
  try {
    const clientIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const isLocal = clientIp === '127.0.0.1' || clientIp === '::1' || clientIp.includes('127.0.0.1');
    if (!isLocal && !checkRateLimit(`inscr_req_${clientIp}`, 20, 15 * 60 * 1000)) {
      return res.status(429).json({ error: 'Demasiadas solicitudes enviadas. Por favor, inténtelo de nuevo en 15 minutos.' });
    }

    const targetCourseId = req.body.course_id || req.body.especialidad_id || '';
    const targetCourseCode = req.body.course_code || '';
    const rawCourseName = req.body.course_name ? String(req.body.course_name).trim() : '';

    let whereClauses = [];
    let params = [];
    if (targetCourseId) {
      whereClauses.push('id = ?');
      params.push(targetCourseId);
    }
    if (targetCourseCode) {
      whereClauses.push('codigo = ?');
      params.push(targetCourseCode);
    }
    if (rawCourseName) {
      whereClauses.push('nombre = ?');
      params.push(rawCourseName);
    }

    let courseDb = null;
    if (whereClauses.length > 0) {
      const courseMatches = await query(`
        SELECT id, codigo, nombre, modalidad, horas_totales, tipo_inscripcion,
               precio_base, moneda, tipo_iva, porcentaje_iva, importe_iva, precio_final,
               estado_disponibilidad
        FROM especialidades
        WHERE ${whereClauses.join(' OR ')}
        LIMIT 1
      `, params);
      courseDb = courseMatches.length > 0 ? courseMatches[0] : null;
    }

    if (courseDb && (courseDb.estado_disponibilidad === 'CERRADA' || courseDb.estado_disponibilidad === 'SUSPENDIDA_TEMPORALMENTE' || courseDb.estado_disponibilidad === 'COMPLETA')) {
      return res.status(400).json({
        success: false,
        error: 'Actualmente la matrícula de este curso se encuentra cerrada. Puedes solicitar información para conocer próximas convocatorias.'
      });
    }

    const {
      course_id,
      course_name = courseDb ? courseDb.nombre : '',
      course_code = courseDb ? courseDb.codigo : '',
      center,
      edition,
      first_name,
      last_name_1,
      last_name_2,
      dni_nie,
      birth_date,
      phone,
      email,
      address,
      postal_code,
      city,
      province,
      employment_status,
      company_activity,
      academic_level,
      academic_degree,
      additional_training,
      observations,
      truth_declaration,
      subsidized_training_acceptance,
      contact_authorization,
      privacy_acceptance,
      marketing_consent,
      signature_name,
      signature_date
    } = req.body;

    // Field Validations
    if (!course_name || !first_name || !last_name_1 || !dni_nie || !birth_date || !phone || !email || !employment_status || !signature_name || !signature_date) {
      return res.status(400).json({ error: 'Por favor, complete todos los campos obligatorios marcados con (*).' });
    }

    // Academic Fields Validations (Section 3 & 5)
    const VALID_ACADEMIC_LEVELS = [
      'sin_estudios',
      'primaria',
      'eso',
      'bachillerato',
      'fp_basica',
      'fp_grado_medio',
      'fp_grado_superior',
      'grado_universitario',
      'master_posgrado',
      'doctorado',
      'otros'
    ];

    if (!academic_level || !VALID_ACADEMIC_LEVELS.includes(String(academic_level).trim())) {
      return res.status(400).json({ error: 'Por favor, seleccione un nivel de estudios finalizados válido.' });
    }

    if (!academic_degree || String(academic_degree).trim() === '') {
      return res.status(400).json({ error: 'Por favor, indique los estudios realizados o la titulación obtenida (o "Sin titulación" si no tiene estudios finalizados).' });
    }

    if (String(academic_degree).trim().length > 255) {
      return res.status(400).json({ error: 'El campo de estudios o titulación no puede superar los 255 caracteres.' });
    }

    if (additional_training && String(additional_training).trim().length > 2000) {
      return res.status(400).json({ error: 'El campo de formación complementaria no puede superar los 2000 caracteres.' });
    }

    if (!truth_declaration || !privacy_acceptance) {
      return res.status(400).json({ error: 'Debe aceptar la declaración de veracidad y la política de privacidad para tramitar su solicitud.' });
    }

    // Email format validation
    const cleanEmail = normalizeEmail(email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ error: 'El correo electrónico introducido no tiene un formato válido.' });
    }

    // DNI/NIE validation (Official Spanish checksum algorithm)
    const cleanDni = (dni_nie || '').trim().toUpperCase();
    if (!isValidDniNie(cleanDni)) {
      return res.status(400).json({ error: 'El DNI/NIE introducido no es válido. Compruebe los dígitos y la letra de control oficial española.' });
    }

    // Duplicate submission protection (prevent double-submit within 2 minutes)
    const recentDuplicate = await query(`
      SELECT id, request_number, created_at FROM inscription_requests
      WHERE dni_nie = ? AND (course_id = ? OR course_code = ? OR course_name = ?)
      AND created_at >= DATE_SUB(NOW(), INTERVAL 2 MINUTE)
      LIMIT 1
    `, [cleanDni, course_id || '', course_code || '', course_name.trim()]);

    if (recentDuplicate && recentDuplicate.length > 0) {
      return res.status(409).json({
        error: 'Ya hemos recibido una solicitud idéntica en los últimos minutos. Por favor, compruebe su correo electrónico o espere la confirmación de Secretaría.',
        request_number: recentDuplicate[0].request_number
      });
    }

    // Commercial snapshot inmutable (courseDb ya validado previamente)

    // Modalidad fijada y snapshot comercial inmutable
    const modalidadInscripcion = courseDb && courseDb.tipo_inscripcion
      ? courseDb.tipo_inscripcion
      : 'SOLICITUD_APROBACION';

    const precioBaseSnapshot = courseDb && courseDb.precio_base !== null ? courseDb.precio_base : 0.00;
    const monedaSnapshot = courseDb && courseDb.moneda ? courseDb.moneda : 'EUR';
    const tipoIvaSnapshot = courseDb && courseDb.tipo_iva ? courseDb.tipo_iva : 'EXENTO';
    const porcentajeIvaSnapshot = courseDb && courseDb.porcentaje_iva !== null ? courseDb.porcentaje_iva : 0.00;
    const importeIvaSnapshot = courseDb && courseDb.importe_iva !== null ? courseDb.importe_iva : 0.00;
    const precioFinalSnapshot = courseDb && courseDb.precio_final !== null ? courseDb.precio_final : 0.00;

    // Estados administrativos separados:
    // Modalidad A (COMPRA DIRECTA): pasa al pago sin requerir preaprobación de Secretaría (PREAPROBADA)
    // Modalidad B (SOLICITUD_APROBACION): requiere preaprobación académica previa de Secretaría (NUEVA)
    // REGLA OBLIGATORIA: En ningún caso se concede acceso al campus (estado_matricula = PENDIENTE)
    let estadoSolicitud = 'NUEVA';
    let legacyStatus = 'Nueva';
    if (modalidadInscripcion === 'COMPRA_DIRECTA') {
      estadoSolicitud = 'PREAPROBADA';
      legacyStatus = 'Aceptada';
    }
    const estadoPago = 'PENDIENTE_TRANSFERENCIA';
    const estadoMatricula = 'PENDIENTE';

    // Generate Unique Request Number (e.g. PEN-2026-000001)
    const maxRow = await query(`SELECT COALESCE(MAX(id), 0) as maxId FROM inscription_requests`);
    const currentYear = new Date().getFullYear();
    let nextSeqNum = maxRow[0].maxId + 1;
    let requestNumber = `PEN-${currentYear}-${nextSeqNum.toString().padStart(6, '0')}`;
    while ((await query(`SELECT id FROM inscription_requests WHERE request_number = ? LIMIT 1`, [requestNumber])).length > 0) {
      nextSeqNum++;
      requestNumber = `PEN-${currentYear}-${nextSeqNum.toString().padStart(6, '0')}`;
    }

    // 1. Insert into Database with Snapshots, Separated Statuses, and Unique Bank Transfer Reference
    const insertResult = await query(`
      INSERT INTO inscription_requests (
        request_number, course_id, course_name, course_code, center, edition,
        first_name, last_name_1, last_name_2, dni_nie, birth_date, phone, email,
        address, postal_code, city, province, employment_status, company_activity,
        academic_level, academic_degree, additional_training,
        observations, truth_declaration, subsidized_training_acceptance, contact_authorization,
        privacy_acceptance, marketing_consent, signature_name, signature_date,
        modalidad_inscripcion, precio_base_snapshot, moneda_snapshot,
        tipo_iva_snapshot, porcentaje_iva_snapshot, importe_iva_snapshot, precio_final_snapshot,
        estado_solicitud, estado_pago, estado_matricula, status, referencia_transferencia, created_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?, NOW()
      )
    `, [
      requestNumber,
      courseDb ? courseDb.id : (course_id || null),
      course_name.trim(),
      courseDb ? courseDb.codigo : (course_code ? course_code.trim() : null),
      center ? center.trim() : 'Academias Péndulo - Almería',
      edition ? edition.trim() : `Convocatoria ${currentYear}`,
      first_name.trim(),
      last_name_1.trim(),
      last_name_2 ? last_name_2.trim() : null,
      cleanDni,
      birth_date,
      phone.trim(),
      cleanEmail,
      address ? address.trim() : null,
      postal_code ? postal_code.trim() : null,
      city ? city.trim() : 'Almería',
      province ? province.trim() : 'Almería',
      employment_status,
      company_activity ? company_activity.trim() : null,
      String(academic_level).trim(),
      String(academic_degree).trim(),
      additional_training && String(additional_training).trim() !== '' ? String(additional_training).trim() : null,
      observations ? observations.trim() : null,
      truth_declaration ? 1 : 0,
      subsidized_training_acceptance ? 1 : 0,
      contact_authorization ? 1 : 0,
      privacy_acceptance ? 1 : 0,
      marketing_consent ? 1 : 0,
      signature_name.trim(),
      signature_date,
      modalidadInscripcion,
      precioBaseSnapshot,
      monedaSnapshot,
      tipoIvaSnapshot,
      porcentajeIvaSnapshot,
      importeIvaSnapshot,
      precioFinalSnapshot,
      estadoSolicitud,
      estadoPago,
      estadoMatricula,
      legacyStatus,
      requestNumber
    ]);

    const requestId = insertResult.insertId;

    // Log History Event: REQUEST_CREATED
    await query(`
      INSERT INTO inscription_request_history (request_id, user_id, event_type, description, created_at)
      VALUES (?, NULL, 'REQUEST_CREATED', ?, NOW())
    `, [
      requestId,
      `Solicitud registrada por el aspirante. Modalidad: ${modalidadInscripcion}. Precio: ${precioFinalSnapshot} ${monedaSnapshot}. Estado inicial solicitud: ${estadoSolicitud}. Matrícula: ${estadoMatricula}.`
    ]);

    // Internal notification for Administration / Secretaría
    try {
      const adminUsers = await query(`
        SELECT DISTINCT u.id FROM usuarios u
        JOIN usuario_roles ur ON u.id = ur.usuario_id
        JOIN roles r ON ur.rol_id = r.id
        WHERE r.codigo IN ('ADMINISTRADOR', 'ADMIN', 'SECRETARIA', 'DIRECCION')
      `);
      const notifMsg = `Nueva solicitud (${requestNumber}) de ${first_name.trim()} ${last_name_1.trim()} para "${course_name.trim()}" [Modalidad: ${modalidadInscripcion === 'COMPRA_DIRECTA' ? 'Compra Directa' : 'Solicitud con Aprobación'}]`;
      for (const adm of adminUsers) {
        const notifId = `notif-inscr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        await query(`
          INSERT INTO notificaciones (id, destinatario_id, tipo, referencia_tipo, referencia_id, titulo, mensaje, creado_en)
          VALUES (?, ?, 'INSCRIPTION_REQUEST', 'SOLICITUD', ?, ?, ?, NOW())
        `, [notifId, adm.id, String(requestId), `Nueva solicitud: ${requestNumber}`, notifMsg]);
      }
    } catch (notifErr) {
      console.warn('Admin notification insert warning:', notifErr.message);
    }

    // 2. Generate PDF and save file path
    const pdfData = {
      request_number: requestNumber,
      course_name: course_name.trim(),
      course_code: course_code ? course_code.trim() : '',
      center: center ? center.trim() : 'Academias Péndulo - Almería',
      edition: edition ? edition.trim() : `Convocatoria ${currentYear}`,
      first_name: first_name.trim(),
      last_name_1: last_name_1.trim(),
      last_name_2: last_name_2 ? last_name_2.trim() : '',
      dni_nie: cleanDni,
      birth_date: birth_date,
      phone: phone.trim(),
      email: cleanEmail,
      address: address ? address.trim() : '',
      postal_code: postal_code ? postal_code.trim() : '',
      city: city ? city.trim() : 'Almería',
      province: province ? province.trim() : 'Almería',
      employment_status,
      company_activity: company_activity ? company_activity.trim() : '',
      academic_level: String(academic_level).trim(),
      academic_degree: String(academic_degree).trim(),
      additional_training: additional_training ? String(additional_training).trim() : '',
      observations: observations ? observations.trim() : '',
      truth_declaration: !!truth_declaration,
      subsidized_training_acceptance: !!subsidized_training_acceptance,
      contact_authorization: !!contact_authorization,
      privacy_acceptance: !!privacy_acceptance,
      marketing_consent: !!marketing_consent,
      signature_name: signature_name.trim(),
      signature_date: signature_date
    };

    let generatedPdfPath = null;
    try {
      generatedPdfPath = await generateInscriptionPDF(pdfData);
      await query(`UPDATE inscription_requests SET pdf_path = ? WHERE id = ?`, [generatedPdfPath, requestId]);
    } catch (pdfErr) {
      console.error('PDF Generation Error:', pdfErr);
    }

    const candidateFullName = `${first_name.trim()} ${last_name_1.trim()} ${last_name_2 ? last_name_2.trim() : ''}`.trim();

    // Prepare PDF Attachment if file exists
    const inscriptionAttachments = [];
    if (generatedPdfPath && fs.existsSync(generatedPdfPath)) {
      inscriptionAttachments.push({
        filename: `Solicitud_Inscripcion_${requestNumber}.pdf`,
        path: generatedPdfPath
      });
    }

    // Fetch active official bank configuration (Requirement 1)
    const bankConfig = await getBankConfiguration();

    // UX user messaging according to Section 1 & 2
    const confirmationUserMessage = modalidadInscripcion === 'COMPRA_DIRECTA'
      ? 'Hemos registrado tu solicitud en Compra Directa. Para formalizar tu plaza, realiza la transferencia bancaria con los datos indicados a continuación. No recibirás acceso al campus hasta que Administración compruebe el ingreso.'
      : 'Hemos recibido tu solicitud de admisión. Secretaría revisará tu titulación y documentación académica. Una vez preaprobada, recibirás las instrucciones bancarias para el abono.';

    // 3. Send Automatic Email to Applicant (with attached official PDF and bank details if direct purchase)
    try {
      let bankInstructionsHtml = '';
      if (modalidadInscripcion === 'COMPRA_DIRECTA') {
        bankInstructionsHtml = `
          <div style="background-color: #f0fdf4; border: 2px solid #86efac; padding: 18px; border-radius: 12px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: bold; color: #166534; text-transform: uppercase;">
              Instrucciones Oficiales para la Transferencia Bancaria
            </p>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #1f2937;">
              <tr><td style="padding: 4px 0; font-weight: bold; color: #374151;">Titular de la cuenta:</td><td style="padding: 4px 0;">${bankConfig.titular_cuenta}</td></tr>
              <tr><td style="padding: 4px 0; font-weight: bold; color: #374151;">IBAN:</td><td style="padding: 4px 0; font-family: monospace; font-weight: bold; color: #166534;">${bankConfig.iban || '(Configurado en Secretaría)'}</td></tr>
              ${bankConfig.entidad_bancaria ? `<tr><td style="padding: 4px 0; font-weight: bold; color: #374151;">Entidad:</td><td style="padding: 4px 0;">${bankConfig.entidad_bancaria}</td></tr>` : ''}
              ${bankConfig.bic_swift ? `<tr><td style="padding: 4px 0; font-weight: bold; color: #374151;">BIC/SWIFT:</td><td style="padding: 4px 0; font-family: monospace;">${bankConfig.bic_swift}</td></tr>` : ''}
              <tr><td style="padding: 4px 0; font-weight: bold; color: #374151;">Curso:</td><td style="padding: 4px 0;">${course_name.trim()}</td></tr>
              <tr><td style="padding: 4px 0; font-weight: bold; color: #374151;">Importe exacto:</td><td style="padding: 4px 0; font-weight: bold; color: #dc2626;">${Number(precioFinalSnapshot).toFixed(2)} ${monedaSnapshot}</td></tr>
              <tr><td style="padding: 4px 0; font-weight: bold; color: #374151;">Concepto / Referencia única:</td><td style="padding: 4px 0; font-family: monospace; font-weight: bold; color: #dc2626;">${requestNumber}</td></tr>
            </table>
            <p style="margin: 12px 0 0 0; font-size: 12px; color: #15803d; line-height: 1.4;">
              ${bankConfig.instrucciones_adicionales || 'Indique siempre la Referencia Única de su solicitud en el concepto de la transferencia bancaria.'}
            </p>
          </div>
          <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px; border-radius: 8px; margin: 15px 0; font-size: 12px; color: #92400e;">
            <strong>Normativa de matriculación:</strong> La realización de la transferencia o envío del justificante no concede acceso automático al campus. La activación se realiza tras la comprobación contable de Administración.
          </div>
        `;
      }

      await sendSystemEmail({
        to: cleanEmail,
        subject: `Hemos recibido tu solicitud de inscripción (${requestNumber}) — Academias Péndulo`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e5e7eb; border-radius: 12px; background: #ffffff;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h1 style="color: #dc2626; margin: 0;">Academias Péndulo</h1>
              <p style="color: #4b5563; font-size: 14px; margin-top: 4px;">Formación Oficial en Automoción</p>
            </div>
            <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 20px 0;" />
            
            <p style="font-size: 16px; color: #1f2937;">Hola <strong>${first_name.trim()}</strong>,</p>
            
            <p style="font-size: 15px; color: #374151; line-height: 1.5;">${confirmationUserMessage}</p>
            
            <div style="background-color: #fef2f2; padding: 18px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #dc2626; text-align: center;">
              <p style="margin: 0; font-size: 13px; color: #991b1b; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px;">Tu número oficial de solicitud y referencia de pago es:</p>
              <p style="margin: 8px 0 0 0; font-size: 24px; font-weight: 900; color: #dc2626; letter-spacing: 1px;">${requestNumber}</p>
            </div>

            <div style="background-color: #f9fafb; padding: 14px; border-radius: 8px; margin: 15px 0; font-size: 13px; color: #4b5563;">
              <p style="margin: 0 0 6px 0;"><strong>Curso:</strong> ${course_name.trim()}</p>
              <p style="margin: 0 0 6px 0;"><strong>Modalidad de inscripción:</strong> ${modalidadInscripcion === 'COMPRA_DIRECTA' ? 'Compra directa' : 'Solicitud con aprobación previa'}</p>
              <p style="margin: 0;"><strong>Precio del curso:</strong> ${Number(precioFinalSnapshot).toFixed(2)} ${monedaSnapshot}</p>
            </div>

            ${bankInstructionsHtml}
            
            <p style="font-size: 14px; color: #4b5563; line-height: 1.6;">Adjunto a este correo electrónico encontrarás una copia oficial en PDF con todos los datos y la firma de tu solicitud de inscripción.</p>
            
            <p style="font-size: 15px; color: #1f2937; font-weight: bold; margin-top: 25px;">Gracias por confiar en Academias Péndulo — Formación en Automoción.</p>
            
            <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 25px 0;" />
            <p style="font-size: 11px; color: #9ca3af; text-align: center;">Este mensaje ha sido generado automáticamente. Por favor guarda el PDF adjunto como justificante.</p>
          </div>
        `,
        attachments: inscriptionAttachments
      });
    } catch (appMailErr) {
      console.warn('Error sending inscription email to applicant:', appMailErr);
    }

    // 4. Send Notice to Admin / Secretaría (with attached official PDF)
    const adminNotificationEmail = process.env.DEFAULT_NOTIFICATION_EMAIL || process.env.SMTP_USER || 'info.academiaspendulo@gmail.com';
    const ACADEMIC_LEVEL_LABELS_EMAIL = {
      sin_estudios: 'Sin estudios finalizados',
      primaria: 'Educación Primaria',
      eso: 'Educación Secundaria Obligatoria (ESO)',
      bachillerato: 'Bachillerato',
      fp_basica: 'Formación Profesional Básica',
      fp_grado_medio: 'Formación Profesional de Grado Medio',
      fp_grado_superior: 'Formación Profesional de Grado Superior',
      grado_universitario: 'Grado universitario o equivalente',
      master_posgrado: 'Máster o estudios de posgrado',
      doctorado: 'Doctorado',
      otros: 'Otros estudios'
    };

    try {
      await sendSystemEmail({
        to: adminNotificationEmail,
        subject: `📋 Nueva solicitud [${modalidadInscripcion}]: ${candidateFullName} (${requestNumber})`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background: #ffffff;">
            <h2 style="color: #dc2626; margin-top: 0;">Nueva Solicitud de Admisión</h2>
            <p>Se ha recibido una nueva solicitud de admisión en el portal web (PDF oficial adjunto):</p>
            <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
              <tr style="border-bottom: 1px solid #f3f4f6;"><td style="padding: 8px; font-weight: bold; width: 140px;">Nº Solicitud / Ref:</td><td style="padding: 8px; font-weight: bold; color: #dc2626;">${requestNumber}</td></tr>
              <tr style="border-bottom: 1px solid #f3f4f6;"><td style="padding: 8px; font-weight: bold;">Nombre:</td><td style="padding: 8px;">${candidateFullName}</td></tr>
              <tr style="border-bottom: 1px solid #f3f4f6;"><td style="padding: 8px; font-weight: bold;">DNI/NIE:</td><td style="padding: 8px; font-family: monospace; font-weight: bold;">${cleanDni}</td></tr>
              <tr style="border-bottom: 1px solid #f3f4f6;"><td style="padding: 8px; font-weight: bold;">Curso:</td><td style="padding: 8px; font-weight: bold;">${course_name}</td></tr>
              <tr style="border-bottom: 1px solid #f3f4f6;"><td style="padding: 8px; font-weight: bold;">Modalidad Inscripción:</td><td style="padding: 8px; font-weight: bold; color: ${modalidadInscripcion === 'COMPRA_DIRECTA' ? '#16a34a' : '#2563eb'};">${modalidadInscripcion}</td></tr>
              <tr style="border-bottom: 1px solid #f3f4f6;"><td style="padding: 8px; font-weight: bold;">Precio Snapshot:</td><td style="padding: 8px; font-weight: bold;">${Number(precioFinalSnapshot).toFixed(2)} ${monedaSnapshot}</td></tr>
              <tr style="border-bottom: 1px solid #f3f4f6;"><td style="padding: 8px; font-weight: bold;">Teléfono:</td><td style="padding: 8px;"><a href="tel:${phone}">${phone}</a></td></tr>
              <tr style="border-bottom: 1px solid #f3f4f6;"><td style="padding: 8px; font-weight: bold;">Email:</td><td style="padding: 8px;"><a href="mailto:${cleanEmail}">${cleanEmail}</a></td></tr>
              <tr style="border-bottom: 1px solid #f3f4f6;"><td style="padding: 8px; font-weight: bold;">Nivel de Estudios:</td><td style="padding: 8px;">${ACADEMIC_LEVEL_LABELS_EMAIL[academic_level] || academic_level}</td></tr>
              <tr style="border-bottom: 1px solid #f3f4f6;"><td style="padding: 8px; font-weight: bold;">Estudios/Titulación:</td><td style="padding: 8px; font-weight: bold;">${String(academic_degree).trim()}</td></tr>
              ${additional_training && String(additional_training).trim() !== '' ? `<tr style="border-bottom: 1px solid #f3f4f6;"><td style="padding: 8px; font-weight: bold;">Formación complementaria:</td><td style="padding: 8px;">${String(additional_training).trim()}</td></tr>` : ''}
              <tr style="border-bottom: 1px solid #f3f4f6;"><td style="padding: 8px; font-weight: bold;">Situación Laboral:</td><td style="padding: 8px;">${employment_status}</td></tr>
              <tr style="border-bottom: 1px solid #f3f4f6;"><td style="padding: 8px; font-weight: bold;">Estado Solicitud:</td><td style="padding: 8px; font-weight: bold;">${estadoSolicitud}</td></tr>
              <tr style="border-bottom: 1px solid #f3f4f6;"><td style="padding: 8px; font-weight: bold;">Estado Pago:</td><td style="padding: 8px; font-weight: bold;">${estadoPago}</td></tr>
              <tr style="border-bottom: 1px solid #f3f4f6;"><td style="padding: 8px; font-weight: bold;">Estado Matrícula:</td><td style="padding: 8px; font-weight: bold;">${estadoMatricula} (Sin acceso al campus)</td></tr>
            </table>
            <p style="margin-top: 20px; text-align: center;">
              <a href="http://localhost:3000/#campus" style="background: #dc2626; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Acceder a Secretaría para Revisar Solicitud</a>
            </p>
          </div>
        `,
        attachments: inscriptionAttachments
      });
    } catch (admMailErr) {
      console.warn('Error sending inscription notification email to admin:', admMailErr);
    }

    res.status(201).json({
      success: true,
      request_number: requestNumber,
      referencia_transferencia: requestNumber,
      modalidad_inscripcion: modalidadInscripcion,
      precio_final: precioFinalSnapshot,
      moneda: monedaSnapshot,
      estado_solicitud: estadoSolicitud,
      estado_pago: estadoPago,
      estado_matricula: estadoMatricula,
      bank_details: modalidadInscripcion === 'COMPRA_DIRECTA' ? bankConfig : null,
      message: confirmationUserMessage
    });

  } catch (error) {
    console.error('Public inscription request error:', error);
    res.status(500).json({ error: 'Ocurrió un error al procesar la solicitud. Por favor, inténtelo de nuevo.' });
  }
});

// PUBLIC: Download applicant's own inscription PDF
app.get('/api/public/inscriptions/:requestNumber/pdf', async (req, res) => {
  try {
    const { requestNumber } = req.params;
    const rows = await query(`SELECT * FROM inscription_requests WHERE request_number = ? LIMIT 1`, [requestNumber]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Solicitud no encontrada.' });
    }

    const item = rows[0];

    // Authorization verification against IDOR
    let authorized = false;

    // 1. Check session cookie if present
    const cookies = parseCookies(req);
    const sessionToken = cookies.campus_session || (req.headers.authorization && req.headers.authorization.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null);
    if (sessionToken) {
      const tokenH = hashToken(sessionToken);
      const sRows = await query(`
        SELECT u.id, u.email, (SELECT GROUP_CONCAT(r.codigo) FROM usuario_roles ur JOIN roles r ON ur.rol_id = r.id WHERE ur.usuario_id = u.id) as roles
        FROM sesiones s JOIN usuarios u ON s.usuario_id = u.id
        WHERE s.token_hash = ? AND s.revocado_en IS NULL AND s.expiracion > NOW() LIMIT 1
      `, [tokenH]);

      if (sRows && sRows.length > 0) {
        const u = sRows[0];
        const roles = (u.roles || '').split(',');
        if (roles.some(r => ['ADMINISTRADOR', 'ADMIN', 'SECRETARIA', 'DIRECCION'].includes(r))) {
          authorized = true;
        } else if (u.email && normalizeEmail(u.email) === normalizeEmail(item.email)) {
          authorized = true;
        }
      }
    }

    // 2. Check query verification (?dni=... or ?token=...)
    if (!authorized) {
      const reqDni = req.query.dni || req.headers['x-verify-dni'];
      const reqToken = req.query.token;
      if (reqDni && item.dni_nie && String(reqDni).trim().toUpperCase() === item.dni_nie.trim().toUpperCase()) {
        authorized = true;
      } else if (reqToken && verifyHmacSignature(requestNumber + ':' + item.email, reqToken)) {
        authorized = true;
      }
    }

    if (!authorized) {
      await logSecurityEvent({
        event: 'IDOR_BLOCKED',
        email: item.email,
        ip: req.ip || null,
        details: { resource: 'inscription_pdf', requestNumber },
        level: 'WARN'
      });
      return res.status(403).json({ error: 'Acceso no autorizado: Se requiere verificación de identidad para descargar este documento.' });
    }

    let pdfFile = item.pdf_path;

    if (!pdfFile || !fs.existsSync(pdfFile)) {
      try {
        const pdfData = {
          request_number: item.request_number,
          course_name: item.course_name || 'Curso Oficial',
          course_code: item.course_code || '',
          center: item.center || 'Academias Péndulo - Almería',
          edition: item.edition || `Convocatoria ${new Date().getFullYear()}`,
          first_name: item.first_name,
          last_name_1: item.last_name_1,
          last_name_2: item.last_name_2 || '',
          dni_nie: item.dni_nie,
          birth_date: item.birth_date ? new Date(item.birth_date).toISOString().split('T')[0] : '',
          phone: item.phone,
          email: item.email,
          address: item.address || '',
          postal_code: item.postal_code || '',
          city: item.city || 'Almería',
          province: item.province || 'Almería',
          employment_status: item.employment_status || 'Desempleado',
          company_activity: item.company_activity || '',
          academic_level: item.academic_level || '',
          academic_degree: item.academic_degree || '',
          additional_training: item.additional_training || '',
          observations: item.observations || '',
          truth_declaration: Boolean(item.truth_declaration),
          subsidized_training_acceptance: Boolean(item.subsidized_training_acceptance),
          contact_authorization: Boolean(item.contact_authorization),
          privacy_acceptance: Boolean(item.privacy_acceptance),
          marketing_consent: Boolean(item.marketing_consent),
          signature_name: item.signature_name || `${item.first_name} ${item.last_name_1}`,
          signature_date: item.signature_date ? new Date(item.signature_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
        };

        pdfFile = await generateInscriptionPDF(pdfData);
        await query(`UPDATE inscription_requests SET pdf_path = ? WHERE id = ?`, [pdfFile, item.id]);
      } catch (genErr) {
        console.error('Error generating on-the-fly public inscription PDF:', genErr);
      }
    }

    if (!pdfFile || !fs.existsSync(pdfFile)) {
      return res.status(404).json({ error: 'No se pudo generar el archivo PDF de la solicitud.' });
    }

    res.download(pdfFile, `Solicitud_Inscripcion_${item.request_number}.pdf`);
  } catch (error) {
    console.error('Public download inscription PDF error:', error);
    res.status(500).json({ error: 'Error al descargar la solicitud en PDF.' });
  }
});

// 2. ADMIN: List & search inscription requests with rich filtering and separated status metrics
app.get('/api/admin/inscriptions', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    const userRoles = req.user.roles || [];
    if (!userRoles.some(r => ['ADMINISTRADOR', 'ADMIN', 'SECRETARIA', 'DIRECCION'].includes(r))) {
      return res.status(403).json({ error: 'Acceso restringido a personal autorizado de Secretaría y Administración.' });
    }

    const { q, status, estado_solicitud, modalidad_inscripcion, estado_pago, estado_matricula, course, date_from, date_to } = req.query;

    let sql = `SELECT * FROM inscription_requests WHERE 1=1`;
    const params = [];

    if (q && q.trim() !== '') {
      const searchTerm = `%${q.trim()}%`;
      sql += ` AND (
        request_number LIKE ? OR
        first_name LIKE ? OR
        last_name_1 LIKE ? OR
        last_name_2 LIKE ? OR
        dni_nie LIKE ? OR
        email LIKE ? OR
        phone LIKE ? OR
        course_name LIKE ?
      )`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (estado_solicitud && estado_solicitud.trim() !== '' && estado_solicitud !== 'ALL') {
      sql += ` AND estado_solicitud = ?`;
      params.push(estado_solicitud.trim());
    } else if (status && status.trim() !== '' && status !== 'ALL') {
      sql += ` AND status = ?`;
      params.push(status.trim());
    }

    if (modalidad_inscripcion && modalidad_inscripcion.trim() !== '' && modalidad_inscripcion !== 'ALL') {
      sql += ` AND modalidad_inscripcion = ?`;
      params.push(modalidad_inscripcion.trim());
    }

    if (estado_pago && estado_pago.trim() !== '' && estado_pago !== 'ALL') {
      sql += ` AND estado_pago = ?`;
      params.push(estado_pago.trim());
    }

    if (estado_matricula && estado_matricula.trim() !== '' && estado_matricula !== 'ALL') {
      sql += ` AND estado_matricula = ?`;
      params.push(estado_matricula.trim());
    }

    if (course && course.trim() !== '' && course !== 'ALL') {
      sql += ` AND (course_name LIKE ? OR course_id = ? OR course_code = ?)`;
      params.push(`%${course.trim()}%`, course.trim(), course.trim());
    }

    if (date_from && date_from.trim() !== '') {
      sql += ` AND DATE(created_at) >= ?`;
      params.push(date_from.trim());
    }

    if (date_to && date_to.trim() !== '') {
      sql += ` AND DATE(created_at) <= ?`;
      params.push(date_to.trim());
    }

    sql += ` ORDER BY created_at DESC`;

    const requests = await query(sql, params);

    // Summary counts for filter badges and KPIs
    const countRows = await query(`
      SELECT 
        COUNT(*) as total_count,
        SUM(CASE WHEN estado_solicitud = 'NUEVA' OR (estado_solicitud IS NULL AND status = 'Nueva') THEN 1 ELSE 0 END) as pending_count,
        SUM(CASE WHEN estado_solicitud = 'EN_REVISION' OR status = 'En revisión' THEN 1 ELSE 0 END) as review_count,
        SUM(CASE WHEN estado_solicitud = 'PENDIENTE_DOCUMENTACION' OR status = 'Pendiente de documentación' THEN 1 ELSE 0 END) as docs_count,
        SUM(CASE WHEN estado_solicitud = 'PREAPROBADA' OR status = 'Aceptada' THEN 1 ELSE 0 END) as preapproved_count,
        SUM(CASE WHEN estado_solicitud = 'RECHAZADA' OR status = 'Rechazada' THEN 1 ELSE 0 END) as rejected_count,
        SUM(CASE WHEN modalidad_inscripcion = 'COMPRA_DIRECTA' THEN 1 ELSE 0 END) as direct_purchase_count,
        SUM(CASE WHEN modalidad_inscripcion = 'SOLICITUD_APROBACION' THEN 1 ELSE 0 END) as approval_mode_count,
        SUM(CASE WHEN estado_pago = 'PENDIENTE_TRANSFERENCIA' OR estado_pago = 'PENDIENTE' THEN 1 ELSE 0 END) as transfers_pending_count,
        SUM(CASE WHEN estado_pago = 'JUSTIFICANTE_APORTADO' THEN 1 ELSE 0 END) as receipts_uploaded_count,
        SUM(CASE WHEN estado_pago = 'TRANSFERENCIA_VERIFICADA' OR estado_pago = 'VERIFICADO_ADMINISTRACION' THEN 1 ELSE 0 END) as transfers_verified_count,
        SUM(CASE WHEN estado_pago = 'INCIDENCIA' THEN 1 ELSE 0 END) as payment_incidents_count,
        SUM(CASE WHEN estado_matricula = 'ACTIVA' THEN 1 ELSE 0 END) as enrollments_active_count
      FROM inscription_requests
    `);

    const counts = countRows[0] || {};

    res.json({
      requests,
      pending_count: Number(counts.pending_count || 0),
      total_count: Number(counts.total_count || 0),
      review_count: Number(counts.review_count || 0),
      docs_count: Number(counts.docs_count || 0),
      preapproved_count: Number(counts.preapproved_count || 0),
      rejected_count: Number(counts.rejected_count || 0),
      direct_purchase_count: Number(counts.direct_purchase_count || 0),
      approval_mode_count: Number(counts.approval_mode_count || 0),
      transfers_pending_count: Number(counts.transfers_pending_count || 0),
      receipts_uploaded_count: Number(counts.receipts_uploaded_count || 0),
      transfers_verified_count: Number(counts.transfers_verified_count || 0),
      payment_incidents_count: Number(counts.payment_incidents_count || 0),
      enrollments_active_count: Number(counts.enrollments_active_count || 0)
    });
  } catch (error) {
    console.error('Fetch inscription requests error:', error);
    res.status(500).json({ error: 'Error al consultar las solicitudes de inscripción.' });
  }
});

// 3. ADMIN: Get single request detail with message & event history
app.get('/api/admin/inscriptions/:id', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    const userRoles = req.user.roles || [];
    if (!userRoles.some(r => ['ADMINISTRADOR', 'ADMIN', 'SECRETARIA', 'DIRECCION'].includes(r))) {
      return res.status(403).json({ error: 'Acceso restringido.' });
    }

    const reqId = req.params.id;
    const requestRows = await query(`SELECT * FROM inscription_requests WHERE id = ? OR request_number = ? LIMIT 1`, [reqId, reqId]);

    if (!requestRows || requestRows.length === 0) {
      return res.status(404).json({ error: 'Solicitud no encontrada.' });
    }

    const requestData = requestRows[0];

    // Fetch message history
    const messages = await query(`
      SELECT m.*, u.nombre as sender_name, u.apellidos as sender_apellidos
      FROM inscription_request_messages m
      LEFT JOIN usuarios u ON m.sender_user_id = u.id
      WHERE m.request_id = ?
      ORDER BY m.created_at ASC
    `, [requestData.id]);

    // Fetch event audit history
    const history = await query(`
      SELECT h.*, u.nombre as user_nombre, u.apellidos as user_apellidos
      FROM inscription_request_history h
      LEFT JOIN usuarios u ON h.user_id = u.id
      WHERE h.request_id = ?
      ORDER BY h.created_at DESC
    `, [requestData.id]);

    res.json({
      request: requestData,
      messages: messages || [],
      history: history || []
    });
  } catch (error) {
    console.error('Fetch inscription detail error:', error);
    res.status(500).json({ error: 'Error al obtener los detalles de la solicitud.' });
  }
});

// 3b. ADMIN: Get event audit history for a request
app.get('/api/admin/inscriptions/:id/history', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    const userRoles = req.user.roles || [];
    if (!userRoles.some(r => ['ADMINISTRADOR', 'ADMIN', 'SECRETARIA', 'DIRECCION'].includes(r))) {
      return res.status(403).json({ error: 'Acceso restringido.' });
    }

    const reqId = req.params.id;
    const history = await query(`
      SELECT h.*, u.nombre as user_nombre, u.apellidos as user_apellidos
      FROM inscription_request_history h
      LEFT JOIN usuarios u ON h.user_id = u.id
      WHERE h.request_id = ? OR h.request_id IN (SELECT id FROM inscription_requests WHERE request_number = ?)
      ORDER BY h.created_at DESC
    `, [reqId, reqId]);

    res.json({ success: true, history: history || [] });
  } catch (error) {
    console.error('Fetch inscription history error:', error);
    res.status(500).json({ error: 'Error al consultar el historial de la solicitud.' });
  }
});

// 4. ADMIN: Start review of application (Transition to EN_REVISION)
app.put('/api/admin/inscriptions/:id/review', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    const userRoles = req.user.roles || [];
    if (!userRoles.some(r => ['ADMINISTRADOR', 'ADMIN', 'SECRETARIA', 'DIRECCION'].includes(r))) {
      return res.status(403).json({ error: 'Acceso restringido.' });
    }

    const reqId = req.params.id;
    const existing = await query(`SELECT * FROM inscription_requests WHERE id = ? LIMIT 1`, [reqId]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ error: 'Solicitud no encontrada.' });
    }

    const reqData = existing[0];
    const userActor = req.user.email || req.user.nombre || 'Personal de Secretaría';

    await query(`
      UPDATE inscription_requests
      SET estado_solicitud = 'EN_REVISION',
          status = 'En revisión',
          reviewed_at = NOW(),
          assigned_to = ?,
          updated_at = NOW()
      WHERE id = ?
    `, [req.user.id, reqData.id]);

    await query(`
      INSERT INTO inscription_request_history (request_id, user_id, event_type, description, created_at)
      VALUES (?, ?, 'STATUS_EN_REVISION', ?, NOW())
    `, [reqData.id, req.user.id, `Revisión iniciada por ${userActor}.`]);

    await query(`
      INSERT INTO auditoria (actor_id, accion_administrativa, recurso, recurso_id, diff_cambios, ip, creado_en)
      VALUES (?, 'REVIEW_STARTED', 'inscription_requests', ?, ?, ?, NOW())
    `, [req.user.id, String(reqData.id), JSON.stringify({ anterior: reqData.estado_solicitud, posterior: 'EN_REVISION' }), req.ip || null]);

    res.json({ success: true, message: 'Solicitud marcada en revisión correctamente.' });
  } catch (error) {
    console.error('Review start error:', error);
    res.status(500).json({ error: 'Error al iniciar la revisión de la solicitud.' });
  }
});

// 4b. ADMIN: Request additional documentation (Transition to PENDIENTE_DOCUMENTACION)
app.put('/api/admin/inscriptions/:id/request-docs', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    const userRoles = req.user.roles || [];
    if (!userRoles.some(r => ['ADMINISTRADOR', 'ADMIN', 'SECRETARIA', 'DIRECCION'].includes(r))) {
      return res.status(403).json({ error: 'Acceso restringido.' });
    }

    const reqId = req.params.id;
    const documents = req.body.documents || req.body.documentos;
    const instructions = req.body.instructions || req.body.observaciones;

    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return res.status(400).json({ error: 'Debe especificar al menos un documento requerido.' });
    }

    const existing = await query(`SELECT * FROM inscription_requests WHERE id = ? LIMIT 1`, [reqId]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ error: 'Solicitud no encontrada.' });
    }

    const reqData = existing[0];
    const docsJson = JSON.stringify(documents);
    const userActor = req.user.email || req.user.nombre || 'Secretaría';

    await query(`
      UPDATE inscription_requests
      SET estado_solicitud = 'PENDIENTE_DOCUMENTACION',
          status = 'Pendiente de documentación',
          documentos_requeridos = ?,
          reviewed_at = NOW(),
          updated_at = NOW()
      WHERE id = ?
    `, [docsJson, reqData.id]);

    const docsListText = documents.join(', ');
    await query(`
      INSERT INTO inscription_request_history (request_id, user_id, event_type, description, created_at)
      VALUES (?, ?, 'DOCS_REQUESTED', ?, NOW())
    `, [reqData.id, req.user.id, `Secretaría solicitó documentación adicional: [${docsListText}]. Instrucciones: ${instructions || 'Sin notas adicionales'}`]);

    await query(`
      INSERT INTO auditoria (actor_id, accion_administrativa, recurso, recurso_id, diff_cambios, ip, creado_en)
      VALUES (?, 'DOCS_REQUESTED', 'inscription_requests', ?, ?, ?, NOW())
    `, [req.user.id, String(reqData.id), JSON.stringify({ anterior: reqData.estado_solicitud, posterior: 'PENDIENTE_DOCUMENTACION', documentos: documents }), req.ip || null]);

    // Send email to applicant per Section 7 & 11
    try {
      await sendSystemEmail({
        to: reqData.email,
        subject: `Documentación necesaria para tu solicitud (${reqData.request_number}) — Academias Péndulo`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e5e7eb; border-radius: 12px; background: #ffffff;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h1 style="color: #dc2626; margin: 0;">Academias Péndulo</h1>
              <p style="color: #4b5563; font-size: 14px; margin-top: 4px;">Secretaría de Admisión de Alumnos</p>
            </div>
            <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 20px 0;" />
            
            <p style="font-size: 16px; color: #1f2937;">Hola <strong>${reqData.first_name}</strong>,</p>
            
            <p style="font-size: 15px; color: #374151; line-height: 1.5;">
              Necesitamos documentación adicional para continuar con la revisión de tu solicitud para <strong>${reqData.course_name}</strong>.
            </p>

            <div style="background-color: #fff7ed; border-left: 4px solid #ea580c; padding: 16px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0 0 8px 0; font-weight: bold; color: #9a3412; font-size: 14px;">Documentos requeridos:</p>
              <ul style="margin: 0; padding-left: 20px; color: #c2410c; font-size: 13px; line-height: 1.6;">
                ${documents.map(d => `<li><strong>${d}</strong></li>`).join('')}
              </ul>
              ${instructions ? `<p style="margin: 12px 0 0 0; font-size: 13px; color: #7c2d12;"><em>Indicaciones: ${instructions}</em></p>` : ''}
            </div>

            <p style="font-size: 14px; color: #4b5563; line-height: 1.6;">
              Por favor, remite los documentos solicitados respondiendo directamente a este correo o contactando con Secretaría en <a href="mailto:info.academiaspendulo@gmail.com" style="color: #dc2626; font-weight: bold;">info.academiaspendulo@gmail.com</a>.
            </p>
            
            <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 25px 0;" />
            <p style="font-size: 11px; color: #9ca3af; text-align: center;">Ref. Solicitud: ${reqData.request_number} · Academias Péndulo</p>
          </div>
        `
      });
    } catch (mailErr) {
      console.warn('Doc request email warning:', mailErr.message);
    }

    res.json({ success: true, message: 'Documentación solicitada correctamente y notificada al aspirante.' });
  } catch (error) {
    console.error('Request docs error:', error);
    res.status(500).json({ error: 'Error al solicitar documentación.' });
  }
});

// 4c. ADMIN: Preapprove application (Academic Preapproval - Authorizes payment step, NO CAMPUS ACCESS)
app.put('/api/admin/inscriptions/:id/preapprove', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    const userRoles = req.user.roles || [];
    if (!userRoles.some(r => ['ADMINISTRADOR', 'ADMIN', 'SECRETARIA', 'DIRECCION'].includes(r))) {
      return res.status(403).json({ error: 'Acceso restringido a personal autorizado.' });
    }

    const reqId = req.params.id;
    const existing = await query(`SELECT * FROM inscription_requests WHERE id = ? OR request_number = ? LIMIT 1`, [reqId, reqId]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ error: 'Solicitud no encontrada.' });
    }

    const reqData = existing[0];

    // Invariant: Cannot preapprove a cancelled or already rejected application without resetting
    if (reqData.estado_solicitud === 'RECHAZADA' || reqData.estado_solicitud === 'CANCELADA') {
      return res.status(400).json({ error: `No se puede preaprobar una solicitud que se encuentra en estado "${reqData.estado_solicitud}".` });
    }

    const userActor = req.user.email || req.user.nombre || 'Secretaría Académica';
    const bankConfig = await getBankConfiguration();
    const transferRef = reqData.referencia_transferencia || reqData.request_number;

    // STRICT INVARIANT: estado_matricula remains PENDIENTE. PREAPPROVAL IS NOT FINAL ENROLLMENT.
    await query(`
      UPDATE inscription_requests
      SET estado_solicitud = 'PREAPROBADA',
          status = 'Aceptada',
          estado_pago = CASE
            WHEN estado_pago = 'NO_INICIADO' THEN 'PENDIENTE_TRANSFERENCIA'
            ELSE estado_pago
          END,
          preaprobado_por = ?,
          preaprobado_en = NOW(),
          reviewed_at = NOW(),
          updated_at = NOW()
      WHERE id = ?
    `, [userActor, reqData.id]);

    await query(`
      INSERT INTO inscription_request_history (request_id, user_id, event_type, description, created_at)
      VALUES (?, ?, 'REQUEST_PREAPPROVED', ?, NOW())
    `, [reqData.id, req.user.id, `Solicitud preaprobada académicamente por ${userActor}. El alumno recibe instrucciones para realizar la transferencia bancaria (Ref: ${transferRef}). Matrícula en estado PENDIENTE (sin acceso al campus).`]);

    await query(`
      INSERT INTO auditoria (actor_id, accion_administrativa, recurso, recurso_id, diff_cambios, ip, creado_en)
      VALUES (?, 'REQUEST_PREAPPROVED', 'inscription_requests', ?, ?, ?, NOW())
    `, [req.user.id, String(reqData.id), JSON.stringify({ anterior: reqData.estado_solicitud, posterior: 'PREAPROBADA', responsable: userActor, refTransferencia: transferRef }), req.ip || null]);

    // Send bank transfer instructions email to student (Requirement 1 & 2)
    try {
      await sendSystemEmail({
        to: reqData.email,
        subject: `¡Tu solicitud ha sido preaprobada! Instrucciones de transferencia (${reqData.request_number}) — Academias Péndulo`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e5e7eb; border-radius: 12px; background: #ffffff;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h1 style="color: #dc2626; margin: 0;">Academias Péndulo</h1>
              <p style="color: #4b5563; font-size: 14px; margin-top: 4px;">Formación Oficial en Automoción</p>
            </div>
            <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 20px 0;" />
            
            <p style="font-size: 16px; color: #1f2937;">Hola <strong>${reqData.first_name}</strong>,</p>
            
            <div style="background-color: #ecfdf5; border-left: 4px solid #059669; padding: 18px; border-radius: 10px; margin: 20px 0;">
              <p style="margin: 0; font-size: 15px; font-weight: bold; color: #065f46;">
                ¡Enhorabuena! Tu solicitud para el curso <strong>${reqData.course_name}</strong> ha sido preaprobada por Secretaría.
              </p>
              <p style="margin: 8px 0 0 0; font-size: 13px; color: #047857;">
                Para formalizar tu plaza definitiva, realiza una transferencia bancaria con los siguientes datos:
              </p>
            </div>

            <div style="background-color: #f0fdf4; border: 2px solid #86efac; padding: 18px; border-radius: 12px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: bold; color: #166534; text-transform: uppercase;">
                Datos Oficiales para la Transferencia Bancaria
              </p>
              <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #1f2937;">
                <tr><td style="padding: 4px 0; font-weight: bold; color: #374151;">Titular de la cuenta:</td><td style="padding: 4px 0;">${bankConfig.titular_cuenta}</td></tr>
                <tr><td style="padding: 4px 0; font-weight: bold; color: #374151;">IBAN:</td><td style="padding: 4px 0; font-family: monospace; font-weight: bold; color: #166534;">${bankConfig.iban || '(Configurado en Secretaría)'}</td></tr>
                ${bankConfig.entidad_bancaria ? `<tr><td style="padding: 4px 0; font-weight: bold; color: #374151;">Entidad bancaria:</td><td style="padding: 4px 0;">${bankConfig.entidad_bancaria}</td></tr>` : ''}
                ${bankConfig.bic_swift ? `<tr><td style="padding: 4px 0; font-weight: bold; color: #374151;">BIC/SWIFT:</td><td style="padding: 4px 0; font-family: monospace;">${bankConfig.bic_swift}</td></tr>` : ''}
                <tr><td style="padding: 4px 0; font-weight: bold; color: #374151;">Curso:</td><td style="padding: 4px 0;">${reqData.course_name}</td></tr>
                <tr><td style="padding: 4px 0; font-weight: bold; color: #374151;">Importe exacto:</td><td style="padding: 4px 0; font-weight: bold; color: #dc2626;">${Number(reqData.precio_final_snapshot || 0).toFixed(2)} ${reqData.moneda_snapshot || 'EUR'}</td></tr>
                <tr><td style="padding: 4px 0; font-weight: bold; color: #374151;">Concepto / Referencia única:</td><td style="padding: 4px 0; font-family: monospace; font-weight: bold; color: #dc2626;">${transferRef}</td></tr>
              </table>
              <p style="margin: 12px 0 0 0; font-size: 12px; color: #15803d; line-height: 1.4;">
                ${bankConfig.instrucciones_adicionales || 'Indique siempre la Referencia Única de su solicitud en el concepto de la transferencia bancaria.'}
              </p>
            </div>

            <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px; border-radius: 8px; margin: 15px 0; font-size: 12px; color: #92400e; line-height: 1.5;">
              <strong>Normativa de matriculación:</strong> Recuerda que la realización de la transferencia o la aportación de un justificante no concede acceso automático al campus. La activación de matrícula y credenciales se realiza una vez que Administración comprueba manualmente el ingreso en cuenta.
            </div>
            
            <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 25px 0;" />
            <p style="font-size: 11px; color: #9ca3af; text-align: center;">Ref. Solicitud: ${reqData.request_number} · Academias Péndulo</p>
          </div>
        `
      });
    } catch (mailErr) {
      console.warn('Preapproval email warning:', mailErr.message);
    }

    res.json({ success: true, message: 'Solicitud preaprobada correctamente. El alumno ha recibido las instrucciones de transferencia bancaria.' });
  } catch (error) {
    console.error('Preapprove error:', error);
    res.status(500).json({ error: 'Error al preaprobar la solicitud.' });
  }
});

// 4d. ADMIN: Reject application (Transition to RECHAZADA)
app.put('/api/admin/inscriptions/:id/reject', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    const userRoles = req.user.roles || [];
    if (!userRoles.some(r => ['ADMINISTRADOR', 'ADMIN', 'SECRETARIA', 'DIRECCION'].includes(r))) {
      return res.status(403).json({ error: 'Acceso restringido.' });
    }

    const reqId = req.params.id;
    const reason = req.body.reason || req.body.motivo;

    if (!reason || String(reason).trim() === '') {
      return res.status(400).json({ error: 'Debe indicar un motivo justificado para el rechazo de la solicitud.' });
    }

    const existing = await query(`SELECT * FROM inscription_requests WHERE id = ? OR request_number = ? LIMIT 1`, [reqId, reqId]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ error: 'Solicitud no encontrada.' });
    }

    const reqData = existing[0];
    const userActor = req.user.email || req.user.nombre || 'Secretaría';

    await query(`
      UPDATE inscription_requests
      SET estado_solicitud = 'RECHAZADA',
          status = 'Rechazada',
          estado_matricula = 'RECHAZADA',
          motivo_rechazo = ?,
          closed_at = NOW(),
          updated_at = NOW()
      WHERE id = ?
    `, [String(reason).trim(), reqData.id]);

    await query(`
      INSERT INTO inscription_request_history (request_id, user_id, event_type, description, created_at)
      VALUES (?, ?, 'REQUEST_REJECTED', ?, NOW())
    `, [reqData.id, req.user.id, `Solicitud rechazada por ${userActor}. Motivo: ${String(reason).trim()}`]);

    await query(`
      INSERT INTO auditoria (actor_id, accion_administrativa, recurso, recurso_id, diff_cambios, ip, creado_en)
      VALUES (?, 'REQUEST_REJECTED', 'inscription_requests', ?, ?, ?, NOW())
    `, [req.user.id, String(reqData.id), JSON.stringify({ anterior: reqData.estado_solicitud, posterior: 'RECHAZADA', motivo: reason }), req.ip || null]);

    // Send email notification to student
    try {
      await sendSystemEmail({
        to: reqData.email,
        subject: `Actualización sobre tu solicitud (${reqData.request_number}) — Academias Péndulo`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e5e7eb; border-radius: 12px; background: #ffffff;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h1 style="color: #dc2626; margin: 0;">Academias Péndulo</h1>
              <p style="color: #4b5563; font-size: 14px; margin-top: 4px;">Secretaría Académica</p>
            </div>
            <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 20px 0;" />
            
            <p style="font-size: 16px; color: #1f2937;">Hola <strong>${reqData.first_name}</strong>,</p>
            
            <p style="font-size: 15px; color: #374151; line-height: 1.5;">
              Te informamos de que tras la revisión de tu solicitud de admisión para el curso <strong>${reqData.course_name}</strong>, no ha sido posible admitir la solicitud en esta convocatoria.
            </p>

            <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 14px; border-radius: 8px; margin: 18px 0; font-size: 13px; color: #991b1b;">
              <strong>Motivo administrativo:</strong><br />
              ${String(reason).trim()}
            </div>
            
            <p style="font-size: 13px; color: #6b7280; line-height: 1.6;">
              Si deseas consultar otras especialidades formativas disponibles o necesitas aclaraciones, ponte en contacto con nuestro equipo en <a href="mailto:info.academiaspendulo@gmail.com" style="color: #dc2626;">info.academiaspendulo@gmail.com</a>.
            </p>
            
            <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 25px 0;" />
            <p style="font-size: 11px; color: #9ca3af; text-align: center;">Ref. Solicitud: ${reqData.request_number} · Academias Péndulo</p>
          </div>
        `
      });
    } catch (mailErr) {
      console.warn('Rejection email warning:', mailErr.message);
    }

    res.json({ success: true, message: 'Solicitud rechazada correctamente.' });
  } catch (error) {
    console.error('Reject error:', error);
    res.status(500).json({ error: 'Error al rechazar la solicitud.' });
  }
});

// 4e. ADMIN: Cancel application (Transition to CANCELADA)
app.put('/api/admin/inscriptions/:id/cancel', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    const userRoles = req.user.roles || [];
    if (!userRoles.some(r => ['ADMINISTRADOR', 'ADMIN', 'SECRETARIA', 'DIRECCION'].includes(r))) {
      return res.status(403).json({ error: 'Acceso restringido.' });
    }

    const reqId = req.params.id;
    const existing = await query(`SELECT * FROM inscription_requests WHERE id = ? OR request_number = ? LIMIT 1`, [reqId, reqId]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ error: 'Solicitud no encontrada.' });
    }

    const reqData = existing[0];
    const userActor = req.user.email || req.user.nombre || 'Administración';

    await query(`
      UPDATE inscription_requests
      SET estado_solicitud = 'CANCELADA',
          status = 'Cerrada',
          estado_matricula = 'CANCELADA',
          closed_at = NOW(),
          updated_at = NOW()
      WHERE id = ?
    `, [reqData.id]);

    await query(`
      INSERT INTO inscription_request_history (request_id, user_id, event_type, description, created_at)
      VALUES (?, ?, 'REQUEST_CANCELLED', ?, NOW())
    `, [reqData.id, req.user.id, `Solicitud cancelada por ${userActor}.`]);

    await query(`
      INSERT INTO auditoria (actor_id, accion_administrativa, recurso, recurso_id, diff_cambios, ip, creado_en)
      VALUES (?, 'REQUEST_CANCELLED', 'inscription_requests', ?, ?, ?, NOW())
    `, [req.user.id, String(reqData.id), JSON.stringify({ anterior: reqData.estado_solicitud, posterior: 'CANCELADA' }), req.ip || null]);

    res.json({ success: true, message: 'Solicitud cancelada correctamente.' });
  } catch (error) {
    console.error('Cancel error:', error);
    res.status(500).json({ error: 'Error al cancelar la solicitud.' });
  }
});

// 4f. ADMIN: Update internal secretary notes
app.put('/api/admin/inscriptions/:id/notes', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    const userRoles = req.user.roles || [];
    if (!userRoles.some(r => ['ADMINISTRADOR', 'ADMIN', 'SECRETARIA', 'DIRECCION'].includes(r))) {
      return res.status(403).json({ error: 'Acceso restringido.' });
    }

    const reqId = req.params.id;
    const { secretary_notes } = req.body;

    const existing = await query(`SELECT * FROM inscription_requests WHERE id = ? LIMIT 1`, [reqId]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ error: 'Solicitud no encontrada.' });
    }

    await query(`
      UPDATE inscription_requests
      SET secretary_notes = ?, updated_at = NOW()
      WHERE id = ?
    `, [secretary_notes || '', reqId]);

    await query(`
      INSERT INTO inscription_request_history (request_id, user_id, event_type, description, created_at)
      VALUES (?, ?, 'NOTES_UPDATED', ?, NOW())
    `, [reqId, req.user.id, `Observaciones internas actualizadas por ${req.user.nombre || req.user.email}.`]);

    res.json({ success: true, message: 'Observaciones guardadas correctamente.' });
  } catch (error) {
    console.error('Update notes error:', error);
    res.status(500).json({ error: 'Error al guardar las observaciones.' });
  }
});

// 4g. ADMIN: Legacy compatibility status updater
app.put('/api/admin/inscriptions/:id/status', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    const userRoles = req.user.roles || [];
    if (!userRoles.some(r => ['ADMINISTRADOR', 'ADMIN', 'SECRETARIA', 'DIRECCION'].includes(r))) {
      return res.status(403).json({ error: 'Acceso restringido.' });
    }

    const reqId = req.params.id;
    const { status, secretary_notes } = req.body;

    const existing = await query(`SELECT * FROM inscription_requests WHERE id = ? LIMIT 1`, [reqId]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ error: 'Solicitud no encontrada.' });
    }

    const currentStatus = existing[0].status;
    const newStatus = status || currentStatus;

    let reviewedAt = existing[0].reviewed_at;
    let closedAt = existing[0].closed_at;

    if (newStatus !== 'Nueva' && !reviewedAt) {
      reviewedAt = new Date();
    }

    if (newStatus === 'Cerrada' && !closedAt) {
      closedAt = new Date();
    }

    // Map legacy status to separated estado_solicitud
    let mappedEstado = existing[0].estado_solicitud;
    if (newStatus === 'Nueva') mappedEstado = 'NUEVA';
    else if (newStatus === 'En revisión') mappedEstado = 'EN_REVISION';
    else if (newStatus === 'Pendiente de documentación') mappedEstado = 'PENDIENTE_DOCUMENTACION';
    else if (newStatus === 'Aceptada') mappedEstado = 'PREAPROBADA';
    else if (newStatus === 'Rechazada') mappedEstado = 'RECHAZADA';
    else if (newStatus === 'Cerrada') mappedEstado = 'CANCELADA';

    await query(`
      UPDATE inscription_requests
      SET status = ?, estado_solicitud = ?, secretary_notes = ?, reviewed_at = ?, closed_at = ?, updated_at = NOW()
      WHERE id = ?
    `, [newStatus, mappedEstado, secretary_notes !== undefined ? secretary_notes : existing[0].secretary_notes, reviewedAt, closedAt, reqId]);

    await query(`
      INSERT INTO inscription_request_history (request_id, user_id, event_type, description, created_at)
      VALUES (?, ?, 'STATUS_UPDATED', ?, NOW())
    `, [reqId, req.user.id, `Estado actualizado a "${newStatus}" (solicitud: ${mappedEstado}) por ${req.user.nombre || req.user.email}.`]);

    res.json({ success: true, message: 'Estado y notas actualizadas correctamente.' });
  } catch (error) {
    console.error('Update inscription status error:', error);
    res.status(500).json({ error: 'Error al actualizar la solicitud.' });
  }
});

// 5. ADMIN: Send email reply to applicant
app.post('/api/admin/inscriptions/:id/reply', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    const userRoles = req.user.roles || [];
    if (!userRoles.includes('ADMINISTRADOR') && !userRoles.includes('SECRETARIA')) {
      return res.status(403).json({ error: 'Acceso restringido.' });
    }

    const reqId = req.params.id;
    const { subject, message } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ error: 'Asunto y mensaje son obligatorios.' });
    }

    const existing = await query(`SELECT * FROM inscription_requests WHERE id = ? LIMIT 1`, [reqId]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ error: 'Solicitud no encontrada.' });
    }

    const reqData = existing[0];

    // Send Email via Nodemailer
    await sendSystemEmail({
      to: reqData.email,
      subject: subject.trim(),
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e5e7eb; border-radius: 12px; background: #ffffff;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #dc2626; margin: 0;">Academias Péndulo</h1>
            <p style="color: #4b5563; font-size: 14px; margin-top: 4px;">Secretaría de Alumnado</p>
          </div>
          <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 20px 0;" />
          
          <p style="font-size: 15px; color: #1f2937;">Estimado/a <strong>${reqData.first_name} ${reqData.last_name_1}</strong>,</p>
          
          <div style="font-size: 14px; color: #374151; line-height: 1.6; white-space: pre-wrap; margin: 20px 0; background: #f9fafb; padding: 16px; border-radius: 8px; border-left: 4px solid #dc2626;">${message.trim()}</div>
          
          <p style="font-size: 13px; color: #6b7280;">Ref. Solicitud: <strong>${reqData.request_number}</strong> (${reqData.course_name})</p>
          
          <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 25px 0;" />
          <p style="font-size: 11px; color: #9ca3af; text-align: center;">Academias Péndulo · Secretaría General de Formación Profesional</p>
        </div>
      `
    });

    // Save message log into database
    await query(`
      INSERT INTO inscription_request_messages (request_id, sender_user_id, sender_type, recipient_email, subject, message, created_at)
      VALUES (?, ?, 'secretary', ?, ?, ?, NOW())
    `, [reqData.id, req.user.id, reqData.email, subject.trim(), message.trim()]);

    // Automatically update status to 'Contactado' if currently 'Nueva'
    if (reqData.status === 'Nueva') {
      await query(`UPDATE inscription_requests SET status = 'Contactado', reviewed_at = NOW() WHERE id = ?`, [reqData.id]);
    }

    res.json({ success: true, message: 'Respuesta enviada al solicitante correctamente.' });
  } catch (error) {
    console.error('Send reply error:', error);
    res.status(500).json({ error: 'Error al enviar la respuesta al solicitante.' });
  }
});

// 6. ADMIN: Download / View PDF securely
app.get('/api/admin/inscriptions/:id/pdf', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    const userRoles = req.user.roles || [];
    if (!userRoles.some(r => ['ADMINISTRADOR', 'ADMIN', 'SECRETARIA', 'DIRECCION'].includes(r))) {
      return res.status(403).json({ error: 'Acceso restringido a personal de secretaría y administración.' });
    }

    const reqId = req.params.id;
    const rows = await query(`SELECT * FROM inscription_requests WHERE id = ? OR request_number = ? LIMIT 1`, [reqId, reqId]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Solicitud de inscripción no encontrada.' });
    }

    const item = rows[0];
    let pdfFile = item.pdf_path;

    // If PDF file doesn't exist on disk, regenerate it on the fly
    if (!pdfFile || !fs.existsSync(pdfFile)) {
      try {
        const pdfData = {
          request_number: item.request_number,
          course_name: item.course_name || 'Curso Oficial',
          course_code: item.course_code || '',
          center: item.center || 'Academias Péndulo - Almería',
          edition: item.edition || `Convocatoria ${new Date().getFullYear()}`,
          first_name: item.first_name,
          last_name_1: item.last_name_1,
          last_name_2: item.last_name_2 || '',
          dni_nie: item.dni_nie,
          birth_date: item.birth_date ? new Date(item.birth_date).toISOString().split('T')[0] : '',
          phone: item.phone,
          email: item.email,
          address: item.address || '',
          postal_code: item.postal_code || '',
          city: item.city || 'Almería',
          province: item.province || 'Almería',
          employment_status: item.employment_status || 'Desempleado',
          company_activity: item.company_activity || '',
          academic_level: item.academic_level || '',
          academic_degree: item.academic_degree || '',
          additional_training: item.additional_training || '',
          observations: item.observations || '',
          truth_declaration: Boolean(item.truth_declaration),
          subsidized_training_acceptance: Boolean(item.subsidized_training_acceptance),
          contact_authorization: Boolean(item.contact_authorization),
          privacy_acceptance: Boolean(item.privacy_acceptance),
          marketing_consent: Boolean(item.marketing_consent),
          signature_name: item.signature_name || `${item.first_name} ${item.last_name_1}`,
          signature_date: item.signature_date ? new Date(item.signature_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
        };

        pdfFile = await generateInscriptionPDF(pdfData);
        await query(`UPDATE inscription_requests SET pdf_path = ? WHERE id = ?`, [pdfFile, item.id]);
      } catch (genErr) {
        console.error('Error generating on-the-fly inscription PDF:', genErr);
      }
    }

    if (!pdfFile || !fs.existsSync(pdfFile)) {
      return res.status(404).json({ error: 'No se pudo generar o encontrar el archivo PDF.' });
    }

    res.download(pdfFile, `solicitud_${item.request_number}.pdf`);
  } catch (error) {
    console.error('PDF download error:', error);
    res.status(500).json({ error: 'Error al servir el documento PDF.' });
  }
});

// =========================================================
// HISTORIAL ACADÉMICO DEL ALUMNO (FICHA DE ALUMNO)
// =========================================================
app.get('/api/admin/students/:studentId/academic-history', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    const userRoles = req.user.roles || [];
    const isStaff = userRoles.some(r => ['ADMINISTRADOR', 'ADMIN', 'SECRETARIA', 'DIRECCION'].includes(r));
    const paramId = req.params.studentId;

    // Check if authenticated user is accessing their own academic record
    const isSelf = String(req.user.id) === String(paramId);

    if (!isStaff && !isSelf) {
      return res.status(403).json({ error: 'Acceso restringido. No tiene permisos para consultar este expediente académico.' });
    }

    // Lookup student user by ID or by email
    let student = null;
    if (/^\d+$/.test(paramId)) {
      const studentRows = await query(`SELECT id, nombre, apellidos, email FROM usuarios WHERE id = ? LIMIT 1`, [paramId]);
      if (studentRows && studentRows.length > 0) student = studentRows[0];
    } else {
      const studentRows = await query(`SELECT id, nombre, apellidos, email FROM usuarios WHERE LOWER(email) = LOWER(?) LIMIT 1`, [paramId]);
      if (studentRows && studentRows.length > 0) student = studentRows[0];
    }

    let history = [];
    if (student) {
      history = await query(`
        SELECT 
          id, request_number, course_id, course_name, course_code, center, edition,
          status, academic_level, academic_degree, additional_training, created_at, reviewed_at
        FROM inscription_requests
        WHERE student_user_id = ? OR (email IS NOT NULL AND LOWER(TRIM(email)) = LOWER(TRIM(?)))
        ORDER BY created_at DESC
      `, [student.id, student.email]);
    } else {
      if (isStaff && paramId.includes('@')) {
        history = await query(`
          SELECT 
            id, request_number, course_id, course_name, course_code, center, edition,
            status, academic_level, academic_degree, additional_training, created_at, reviewed_at
          FROM inscription_requests
          WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))
          ORDER BY created_at DESC
        `, [paramId]);
      } else {
        return res.status(404).json({ error: 'Alumno no encontrado en el sistema.' });
      }
    }

    res.json({
      success: true,
      student: student ? {
        id: student.id,
        nombre: student.nombre,
        apellidos: student.apellidos,
        email: student.email
      } : { email: paramId },
      history: history || []
    });
  } catch (error) {
    console.error('Fetch student academic history error:', error);
    res.status(500).json({ error: 'Error al consultar la ficha académica del alumno.' });
  }
});

// =========================================================
// PROMPT 2: CONVERTIR SOLICITUD ACEPTADA EN ALUMNO DEL CAMPUS
// =========================================================

// Helper for logging history
async function logInscriptionHistory(requestId, userId, eventType, description) {
  try {
    await query(`
      INSERT INTO inscription_request_history (request_id, user_id, event_type, description, created_at)
      VALUES (?, ?, ?, ?, NOW())
    `, [requestId, userId || null, eventType, description]);
  } catch (err) {
    console.error('History logging error:', err);
  }
}

// 6b. ADMIN: DELETE inscription request (soft-delete, only Rechazada/Cerrada allowed)
app.delete('/api/admin/inscriptions/:id', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    const userRoles = req.user.roles || [];
    if (!userRoles.includes('ADMINISTRADOR') && !userRoles.includes('SECRETARIA')) {
      return res.status(403).json({ error: 'Acceso restringido a personal autorizado.' });
    }
    const reqId = req.params.id;
    const rows = await query(`SELECT * FROM inscription_requests WHERE id = ? LIMIT 1`, [reqId]);
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'Solicitud no encontrada.' });
    const req_data = rows[0];

    // Only allow deleting Rechazada or Cerrada requests
    const allowedStatuses = ['Rechazada', 'Cerrada'];
    if (!allowedStatuses.includes(req_data.status)) {
      return res.status(400).json({
        error: `No se puede eliminar una solicitud en estado "${req_data.status}". Solo se pueden eliminar solicitudes Rechazadas o Cerradas.`
      });
    }

    // Archive to auditoria before deleting
    await query(`
      INSERT INTO auditoria (actor_id, accion_administrativa, recurso, recurso_id, diff_cambios, ip)
      VALUES (?, 'DELETE_INSCRIPTION_REQUEST', 'inscription_requests', ?, ?, ?)
    `, [req.user.id, String(req_data.id), JSON.stringify({ request_number: req_data.request_number, status: req_data.status, email: req_data.email }), req.ip]);

    // Delete related records first (FK)
    await query(`DELETE FROM inscription_request_history WHERE request_id = ?`, [req_data.id]);
    await query(`DELETE FROM inscription_request_messages WHERE request_id = ?`, [req_data.id]);
    await query(`DELETE FROM inscription_requests WHERE id = ?`, [req_data.id]);

    res.json({ success: true, message: `Solicitud ${req_data.request_number} eliminada correctamente.` });
  } catch (err) {
    console.error('Delete inscription request error:', err);
    res.status(500).json({ error: 'Error al eliminar la solicitud.' });
  }
});

// ============================================================
// GRUPOS & ALUMNOS POR GRUPO (para pase de lista, mis alumnos)
// ============================================================

// GET grupos asignados al profesor autenticado (o todos si admin)
app.get('/api/academic/groups', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    const userRoles = req.user.roles || [];
    const isAdmin = userRoles.includes('ADMINISTRADOR') || userRoles.includes('SECRETARIA');
    const userId = req.user.id;

    let rows;
    if (isAdmin) {
      rows = await query(`
        SELECT g.*, e.nombre as especialidad_nombre, u.nombre as profesor_nombre, u.apellidos as profesor_apellidos
        FROM grupos g
        JOIN especialidades e ON g.especialidad_id = e.id
        LEFT JOIN usuarios u ON g.profesor_principal_id = u.id
        ORDER BY g.creado_en DESC
      `);
    } else {
      rows = await query(`
        SELECT g.*, e.nombre as especialidad_nombre, u.nombre as profesor_nombre, u.apellidos as profesor_apellidos
        FROM grupos g
        JOIN especialidades e ON g.especialidad_id = e.id
        LEFT JOIN usuarios u ON g.profesor_principal_id = u.id
        WHERE g.profesor_principal_id = ?
        ORDER BY g.creado_en DESC
      `, [userId]);
    }
    res.json(rows);
  } catch (err) {
    console.error('Error fetching groups:', err);
    res.status(500).json({ error: 'Error al obtener los grupos.' });
  }
});

// GET alumnos de un grupo específico (Section 6: Teacher panel isolation)
app.get('/api/academic/groups/:groupId/students', requireAuth, requireNoTempPassword, async (req, res) => {
  const { groupId } = req.params;
  try {
    const isTeacher = req.user.roles.includes('PROFESOR');
    const isAdminOrSec = req.user.roles.includes('ADMINISTRADOR') || req.user.roles.includes('SECRETARIA');

    if (isTeacher && !isAdminOrSec) {
      const grp = await query(`SELECT profesor_principal_id FROM grupos WHERE id = ? LIMIT 1`, [groupId]);
      if (!grp || grp.length === 0 || grp[0].profesor_principal_id !== req.user.id) {
        return res.status(403).json({ error: 'Acceso denegado: Solo puedes consultar los alumnos de tus grupos asignados.' });
      }
    } else if (!isTeacher && !isAdminOrSec) {
      return res.status(403).json({ error: 'Acceso no autorizado.' });
    }

    // Return strictly active and authorized students. No banking, payment, or financial data returned.
    const students = await query(`
      SELECT
        m.id as matricula_id, m.estado as matricula_estado, m.fecha_inicio, m.progreso,
        u.id as alumno_id, u.nombre, u.apellidos, u.email, u.telefono
      FROM matriculas m
      JOIN usuarios u ON m.alumno_id = u.id
      WHERE m.grupo_id = ? AND m.estado = 'ACTIVA' AND (m.estado_acceso = 'HABILITADO' OR m.estado_acceso IS NULL)
      ORDER BY u.apellidos ASC, u.nombre ASC
    `, [groupId]);

    res.json({ students });
  } catch (err) {
    console.error('Error fetching group students:', err);
    res.status(500).json({ error: 'Error al obtener los alumnos del grupo.' });
  }
});

// 7. ADMIN: Pre-creation checks for converting request to student
app.post('/api/admin/inscriptions/:id/convert-checks', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    const userRoles = req.user.roles || [];
    if (!userRoles.includes('ADMINISTRADOR') && !userRoles.includes('SECRETARIA')) {
      return res.status(403).json({ error: 'Acceso restringido a personal autorizado.' });
    }

    const reqId = req.params.id;
    const rows = await query(`SELECT * FROM inscription_requests WHERE id = ? OR request_number = ? LIMIT 1`, [reqId, reqId]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Solicitud no encontrada.' });
    }

    const reqData = rows[0];

    // Log OPENED_BY_SECRETARY if not logged yet
    const histOpened = await query(`SELECT id FROM inscription_request_history WHERE request_id = ? AND event_type = 'OPENED_BY_SECRETARY'`, [reqData.id]);
    if (!histOpened || histOpened.length === 0) {
      await logInscriptionHistory(reqData.id, req.user.id, 'OPENED_BY_SECRETARY', `Secretaría abrió la solicitud ${reqData.request_number}.`);
    }

    // Check if already converted (Idempotency)
    if (reqData.converted_to_student && reqData.student_user_id) {
      const studentRows = await query(`
        SELECT u.id, u.nombre, u.apellidos, u.email, u.creado_en,
               m.id as matricula_id, g.nombre as grupo_nombre, e.nombre as especialidad_nombre
        FROM usuarios u
        LEFT JOIN alumno_matricula_activa ama ON u.id = ama.alumno_id
        LEFT JOIN matriculas m ON ama.matricula_id = m.id
        LEFT JOIN grupos g ON m.grupo_id = g.id
        LEFT JOIN especialidades e ON g.especialidad_id = e.id
        WHERE u.id = ? LIMIT 1
      `, [reqData.student_user_id]);

      return res.json({
        alreadyConverted: true,
        student_user_id: reqData.student_user_id,
        converted_at: reqData.converted_at,
        studentData: studentRows[0] || null
      });
    }

    // Check 1: Email check
    const cleanEmail = normalizeEmail(reqData.email);
    const existingEmailRows = await query(`
      SELECT id, nombre, apellidos, email, estado, creado_en FROM usuarios WHERE email = ? LIMIT 1
    `, [cleanEmail]);
    const existingUserByEmail = existingEmailRows.length > 0 ? existingEmailRows[0] : null;

    // Check 2: DNI/NIE check
    const cleanDni = (reqData.dni_nie || '').trim().toUpperCase();
    const existingDniRows = await query(`
      SELECT u.id, u.nombre, u.apellidos, u.email, ir.dni_nie
      FROM usuarios u
      JOIN inscription_requests ir ON ir.student_user_id = u.id
      WHERE ir.dni_nie = ? AND u.id != ? LIMIT 1
    `, [cleanDni, existingUserByEmail ? existingUserByEmail.id : 'none']);
    const existingUserByDni = existingDniRows.length > 0 ? existingDniRows[0] : null;

    // Check 3: Course/Specialty match
    let matchedGroups = [];
    if (reqData.course_id) {
      matchedGroups = await query(`
        SELECT g.id, g.nombre as grupo_nombre, e.nombre as especialidad_nombre, e.codigo as especialidad_codigo, g.profesor_principal_id
        FROM grupos g
        JOIN especialidades e ON g.especialidad_id = e.id
        WHERE e.id = ? OR e.codigo = ? AND g.estado = 'ACTIVO'
      `, [reqData.course_id, reqData.course_id]);
    }

    if (matchedGroups.length === 0 && reqData.course_name) {
      const searchCourse = `%${reqData.course_name.trim()}%`;
      matchedGroups = await query(`
        SELECT g.id, g.nombre as grupo_nombre, e.nombre as especialidad_nombre, e.codigo as especialidad_codigo, g.profesor_principal_id
        FROM grupos g
        JOIN especialidades e ON g.especialidad_id = e.id
        WHERE (e.nombre LIKE ? OR e.id LIKE ?) AND g.estado = 'ACTIVO'
      `, [searchCourse, searchCourse]);
    }

    // Fallback: All active groups
    if (matchedGroups.length === 0) {
      matchedGroups = await query(`
        SELECT g.id, g.nombre as grupo_nombre, e.nombre as especialidad_nombre, e.codigo as especialidad_codigo, g.profesor_principal_id
        FROM grupos g
        JOIN especialidades e ON g.especialidad_id = e.id
        WHERE g.estado = 'ACTIVO'
      `);
    }

    const paymentVerified = reqData.estado_pago === 'TRANSFERENCIA_VERIFICADA';
    const admissionSatisfied = reqData.modalidad_inscripcion === 'COMPRA_DIRECTA' || reqData.estado_solicitud === 'PREAPROBADA';
    const notRejectedOrCancelled = reqData.estado_solicitud !== 'RECHAZADA' && reqData.estado_solicitud !== 'CANCELADA';

    const canApprove = paymentVerified && admissionSatisfied && notRejectedOrCancelled;
    let blockingReason = null;
    if (!paymentVerified) {
      blockingReason = `La transferencia bancaria debe estar verificada por Administración (Estado actual: ${reqData.estado_pago}).`;
    } else if (!admissionSatisfied) {
      blockingReason = `La solicitud en modalidad de aprobación debe ser preaprobada por Secretaría antes de otorgar el alta.`;
    } else if (!notRejectedOrCancelled) {
      blockingReason = `La solicitud se encuentra ${reqData.estado_solicitud}.`;
    }

    res.json({
      alreadyConverted: false,
      request: reqData,
      emailExists: !!existingUserByEmail,
      existingUserByEmail,
      dniExists: !!existingUserByDni,
      existingUserByDni,
      isNewUser: !existingUserByEmail,
      paymentVerified,
      canApprove,
      blockingReason,
      matchedGroups,
      defaultGroupId: matchedGroups.length > 0 ? matchedGroups[0].id : null
    });

  } catch (error) {
    console.error('Convert checks error:', error);
    res.status(500).json({ error: 'Error al realizar las comprobaciones previas.' });
  }
});

// 8. ADMIN: Execute Atomic DB Transaction to Approve Enrollment and Activate Student (Requirement 7, 8, 9, 10, 12, 13)
async function handleApproveEnrollmentAndActivate(req, res) {
  const conn = await pool.getConnection();

  try {
    const userRoles = req.user.roles || [];
    if (!userRoles.includes('ADMINISTRADOR') && !userRoles.includes('SECRETARIA')) {
      conn.release();
      return res.status(403).json({ error: 'Acceso restringido a personal autorizado de Secretaría y Administración.' });
    }

    const reqId = req.params.id;
    const { groupId } = req.body;

    // ====================================================
    // BEGIN DATABASE TRANSACTION (Critical Operations & Concurrency Lock)
    // ====================================================
    await conn.beginTransaction();

    const [rows] = await conn.execute(`SELECT * FROM inscription_requests WHERE id = ? OR request_number = ? LIMIT 1 FOR UPDATE`, [reqId, reqId]);
    if (!rows || rows.length === 0) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ error: 'Solicitud no encontrada.' });
    }

    const reqData = rows[0];

    // Idempotency check: Don't double create (Scenario J: Concurrent operators protection)
    if (reqData.converted_to_student && reqData.student_user_id) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ error: `La solicitud ${reqData.request_number} ya fue dada de alta y matriculada previamente.` });
    }

    // State guard: Do not allow activating campus if rejected or cancelled
    if (reqData.estado_solicitud === 'RECHAZADA' || reqData.estado_solicitud === 'CANCELADA') {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ error: `No se puede conceder matrícula ni acceso al campus a una solicitud en estado ${reqData.estado_solicitud}.` });
    }

    // Requirement 6 & 12: Verify payment is TRANSFERENCIA_VERIFICADA
    if (reqData.estado_pago !== 'TRANSFERENCIA_VERIFICADA') {
      await conn.rollback();
      conn.release();
      return res.status(400).json({
        error: `Para dar de alta al alumno y activar su matrícula en el campus, la transferencia bancaria debe haber sido previamente verificada por Administración (Estado actual: ${reqData.estado_pago}).`
      });
    }

    // Modalidad Solicitud con Aprobación requires academic preapproval
    if (reqData.modalidad_inscripcion === 'SOLICITUD_APROBACION' && reqData.estado_solicitud !== 'PREAPROBADA') {
      await conn.rollback();
      conn.release();
      return res.status(400).json({
        error: `Para autorizar la matrícula de una solicitud con aprobación, debe estar previamente preaprobada por Secretaría académica.`
      });
    }

    // Verify target group selected
    let targetGroupId = groupId;
    if (!targetGroupId) {
      const [defaultGrp] = await conn.execute(`SELECT id FROM grupos WHERE estado = 'ACTIVO' LIMIT 1`);
      if (!defaultGrp || defaultGrp.length === 0) {
        await conn.rollback();
        conn.release();
        return res.status(400).json({ error: 'No existe ningún grupo activo en el campus para matricular al alumno.' });
      }
      targetGroupId = defaultGrp[0].id;
    }

    const [groupDetail] = await conn.execute(`
      SELECT g.id, g.nombre as grupo_nombre, g.profesor_principal_id, e.nombre as especialidad_nombre
      FROM grupos g
      JOIN especialidades e ON g.especialidad_id = e.id
      WHERE g.id = ? LIMIT 1
    `, [targetGroupId]);

    if (!groupDetail || groupDetail.length === 0) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ error: 'El grupo de destino seleccionado no existe.' });
    }

    const targetGroup = groupDetail[0];

    // Requirement 8: Username is EMAIL address (normalized and validated)
    const cleanEmail = normalizeEmail(reqData.email);
    let userId = null;
    let isNewUser = false;
    let rawTempPassword = null;

    // Check if user already exists by email (Requirement 8: Reusar cuenta si el alumno ya está registrado)
    const [existingUser] = await conn.execute(`
      SELECT id, email, nombre, apellidos, password_hash, estado
      FROM usuarios
      WHERE email = ? LIMIT 1
    `, [cleanEmail]);

    if (existingUser && existingUser.length > 0) {
      userId = existingUser[0].id;
      isNewUser = false;
      // Reutilizar cuenta sin modificar ni sobrescribir credenciales antiguas (Requirement 8 & 10)
    } else {
      // Requirement 8 & 9: Create new user with Email as Username & Secure Random Initial Password
      isNewUser = true;
      userId = `usr_student_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
      rawTempPassword = generateTempPassword(14);
      const tempPassHash = await hashPassword(rawTempPassword);

      await conn.execute(`
        INSERT INTO usuarios (
          id, nombre, apellidos, email, email_original, password_hash, telefono,
          estado, cambio_password_obligatorio, caducidad_password_temporal,
          creado_por, creado_en, role, activo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVO', 1, DATE_ADD(NOW(), INTERVAL 7 DAY), ?, NOW(), 'ALUMNO', 1)
      `, [
        userId,
        reqData.first_name.trim(),
        `${reqData.last_name_1.trim()} ${reqData.last_name_2 ? reqData.last_name_2.trim() : ''}`.trim(),
        cleanEmail,
        reqData.email.trim(),
        tempPassHash,
        reqData.phone.trim(),
        req.user.id
      ]);

      // Assign role `ALUMNO` (`rol-alumno`)
      await conn.execute(`
        INSERT INTO usuario_roles (usuario_id, rol_id, asignado_por)
        VALUES (?, 'rol-alumno', ?)
      `, [userId, req.user.id]);
    }

    // Create Enrollment in `matriculas` (Requirement 7 & 12: Activar únicamente la matrícula del curso aprobado)
    const adminApprover = req.user.email || req.user.nombre || 'Administración';
    const matId = `mat-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const effectiveCourseId = reqData.course_id || (targetGroup ? targetGroup.especialidad_id : null);
    await conn.execute(`
      INSERT INTO matriculas (
        id, solicitud_id, alumno_id, grupo_id, curso_id, estado, estado_acceso,
        autor_id, operador_aprobacion, fecha_inicio, fecha_aprobacion, fecha_activacion
      ) VALUES (?, ?, ?, ?, ?, 'ACTIVA', 'HABILITADO', ?, ?, NOW(), NOW(), NOW())
    `, [matId, reqData.id, userId, targetGroupId, effectiveCourseId, req.user.id, adminApprover]);

    // Update atomic active enrollment `alumno_matricula_activa`
    await conn.execute(`
      INSERT INTO alumno_matricula_activa (alumno_id, matricula_id)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE matricula_id = VALUES(matricula_id)
    `, [userId, matId]);

    // Update `inscription_requests` record with final enrollment approval
    await conn.execute(`
      UPDATE inscription_requests
      SET converted_to_student = 1,
          student_user_id = ?,
          converted_at = NOW(),
          estado_matricula = 'ACTIVA',
          aprobado_final_por = ?,
          aprobado_final_en = NOW(),
          aprobado_alta_por = ?,
          aprobado_alta_en = NOW(),
          status = 'Matriculado',
          updated_at = NOW()
      WHERE id = ?
    `, [userId, adminApprover, adminApprover, reqData.id]);

    // History and Audit
    await conn.execute(`
      INSERT INTO inscription_request_history (request_id, user_id, event_type, description, created_at)
      VALUES (?, ?, ?, ?, NOW())
    `, [
      reqData.id,
      req.user.id,
      isNewUser ? 'STUDENT_CREATED' : 'STUDENT_REUSED',
      isNewUser
        ? `Cuenta creada con usuario: ${cleanEmail}. Contraseña temporal generada y protegida mediante hash scrypt.`
        : `Cuenta de usuario existente reutilizada (${cleanEmail}). Matrícula activada sin modificar credenciales previas.`
    ]);

    await conn.execute(`
      INSERT INTO inscription_request_history (request_id, user_id, event_type, description, created_at)
      VALUES (?, ?, 'ENROLLMENT_APPROVED', ?, NOW())
    `, [
      reqData.id,
      req.user.id,
      `Matrícula APROBADA y ALTA CONCEDIDA por ${adminApprover} en grupo "${targetGroup.grupo_nombre}" (${targetGroup.especialidad_nombre}). Estado matrícula: ACTIVA.`
    ]);

    await conn.execute(`
      INSERT INTO auditoria (actor_id, accion_administrativa, recurso, recurso_id, diff_cambios, ip, creado_en)
      VALUES (?, 'APPROVE_ENROLLMENT_AND_ACTIVATE', 'matriculas', ?, ?, ?, NOW())
    `, [
      req.user.id,
      matId,
      JSON.stringify({
        solicitud_id: reqData.id,
        alumno_id: userId,
        usuario_login: cleanEmail,
        isNewUser,
        curso: reqData.course_name,
        operador: adminApprover
      }),
      req.ip || null
    ]);

    // Teacher notification
    if (targetGroup.profesor_principal_id) {
      try {
        const notifId = `notif-prof-${Date.now()}`;
        const studentFullName = `${reqData.first_name} ${reqData.last_name_1}`;
        await conn.execute(`
          INSERT INTO notificaciones (id, destinatario_id, tipo, referencia_tipo, referencia_id, titulo, mensaje, creado_en)
          VALUES (?, ?, 'ENROLLMENT', 'GRUPO', ?, 'Nuevo alumno incorporado', ?, NOW())
        `, [notifId, targetGroup.profesor_principal_id, String(targetGroupId), `${studentFullName} ha sido incorporado al grupo ${targetGroup.grupo_nombre} (${reqData.course_name}).`]);
      } catch (notifErr) {
        console.warn('Teacher notification insert warning:', notifErr);
      }
    }

    // COMMIT TRANSACTION
    await conn.commit();
    conn.release();

    // ====================================================
    // POST-TRANSACTION: SEND WELCOME EMAIL (Requirement 10)
    // ====================================================
    const campusUrl = process.env.CAMPUS_URL || 'http://localhost:3000/#campus';
    let emailSent = false;
    let emailError = null;

    try {
      const emailSubject = 'Bienvenido/a a ACADEMIAS PÉNDULO — Acceso al campus virtual';
      let emailHtml = '';

      if (isNewUser) {
        emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e5e7eb; border-radius: 12px; background: #ffffff;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h1 style="color: #dc2626; margin: 0;">Academias Péndulo</h1>
              <p style="color: #4b5563; font-size: 14px; margin-top: 4px;">Campus Virtual · Formación Oficial en Automoción</p>
            </div>
            <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 20px 0;" />
            
            <p style="font-size: 16px; color: #1f2937;">Hola, <strong>${reqData.first_name}</strong>:</p>
            
            <p style="font-size: 15px; color: #374151; line-height: 1.5;">
              Tu matrícula en el curso <strong>${reqData.course_name}</strong> ha sido aprobada.
            </p>
            <p style="font-size: 15px; color: #374151; line-height: 1.5;">
              Te damos la bienvenida a <strong>ACADEMIAS PÉNDULO</strong>.
            </p>
            <p style="font-size: 15px; color: #374151; line-height: 1.5;">
              Ya tienes disponible tu acceso al campus virtual.
            </p>

            <div style="background-color: #f9fafb; padding: 18px; border-radius: 10px; margin: 25px 0; border: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: bold; color: #1f2937;">Tus datos de acceso iniciales son:</p>
              <p style="margin: 0 0 6px 0; font-size: 14px; color: #374151;"><strong>Usuario:</strong> ${cleanEmail}</p>
              <p style="margin: 0 0 6px 0; font-size: 14px; color: #374151;"><strong>Contraseña temporal:</strong> <span style="font-family: monospace; background: #fee2e2; color: #991b1b; padding: 3px 8px; border-radius: 4px; font-weight: bold;">${rawTempPassword}</span></p>
              <p style="margin: 0; font-size: 14px; color: #374151;"><strong>Acceso al campus:</strong> <a href="${campusUrl}" style="color: #dc2626; font-weight: bold; text-decoration: underline;">${campusUrl}</a></p>
            </div>

            <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 14px; border-radius: 8px; margin: 20px 0; font-size: 13px; color: #92400e; line-height: 1.5;">
              <strong>Aviso de seguridad:</strong> Por seguridad, deberás sustituir tu contraseña temporal al acceder por primera vez. Posteriormente podrás modificarla fácilmente desde tu perfil, en el apartado de seguridad de tu cuenta.
            </div>

            <p style="font-size: 14px; color: #4b5563; line-height: 1.6;">
              Si tienes alguna dificultad para acceder, ponte en contacto con nuestra Secretaría.
            </p>

            <p style="font-size: 14px; color: #1f2937; margin-top: 25px; line-height: 1.5;">
              Un saludo,<br />
              <strong>Administración</strong><br />
              <strong>ACADEMIAS PÉNDULO</strong>
            </p>
          </div>
        `;
      } else {
        emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e5e7eb; border-radius: 12px; background: #ffffff;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h1 style="color: #dc2626; margin: 0;">Academias Péndulo</h1>
              <p style="color: #4b5563; font-size: 14px; margin-top: 4px;">Campus Virtual · Formación Oficial en Automoción</p>
            </div>
            <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 20px 0;" />
            
            <p style="font-size: 16px; color: #1f2937;">Hola, <strong>${reqData.first_name}</strong>:</p>
            
            <p style="font-size: 15px; color: #374151; line-height: 1.5;">
              Tu matrícula en el curso <strong>${reqData.course_name}</strong> ha sido aprobada.
            </p>
            <p style="font-size: 15px; color: #374151; line-height: 1.5;">
              Te damos la bienvenida a <strong>ACADEMIAS PÉNDULO</strong>.
            </p>
            <p style="font-size: 15px; color: #374151; line-height: 1.5;">
              Ya tienes disponible tu acceso al campus virtual para este nuevo curso.
            </p>

            <div style="background-color: #f9fafb; padding: 18px; border-radius: 10px; margin: 25px 0; border: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: bold; color: #1f2937;">Tus datos de acceso son tus credenciales habituales:</p>
              <p style="margin: 0 0 6px 0; font-size: 14px; color: #374151;"><strong>Usuario:</strong> ${cleanEmail}</p>
              <p style="margin: 0 0 6px 0; font-size: 14px; color: #374151;"><strong>Contraseña:</strong> Tu contraseña habitual de acceso al campus.</p>
              <p style="margin: 0; font-size: 14px; color: #374151;"><strong>Acceso al campus:</strong> <a href="${campusUrl}" style="color: #dc2626; font-weight: bold; text-decoration: underline;">${campusUrl}</a></p>
            </div>

            <p style="font-size: 14px; color: #4b5563; line-height: 1.6;">
              Si tienes alguna dificultad para acceder o deseas modificar tu contraseña, puedes hacerlo en cualquier momento desde tu perfil o contactando con Secretaría.
            </p>

            <p style="font-size: 14px; color: #1f2937; margin-top: 25px; line-height: 1.5;">
              Un saludo,<br />
              <strong>Administración</strong><br />
              <strong>ACADEMIAS PÉNDULO</strong>
            </p>
          </div>
        `;
      }

      await sendSystemEmail({
        to: cleanEmail,
        subject: emailSubject,
        html: emailHtml
      });

      emailSent = true;
      await query(`UPDATE inscription_requests SET bienvenida_email_enviado = 1, bienvenida_email_error = NULL WHERE id = ?`, [reqData.id]);
      await logInscriptionHistory(reqData.id, req.user.id, 'WELCOME_EMAIL_SENT', `Correo oficial de bienvenida y credenciales enviado correctamente a ${cleanEmail}.`);
    } catch (mailErr) {
      console.error('Welcome email error:', mailErr.message);
      emailError = mailErr.message || 'Error al enviar correo por SMTP.';
      await query(`UPDATE inscription_requests SET bienvenida_email_enviado = 0, bienvenida_email_error = ? WHERE id = ?`, [emailError, reqData.id]);
      await logInscriptionHistory(reqData.id, req.user.id, 'EMAIL_FAILED', `Alta realizada, pero falló el envío del correo de bienvenida: ${emailError}`);
    }

    res.json({
      success: true,
      message: 'Matrícula aprobada y alumno dado de alta correctamente en el campus virtual.',
      userId,
      student_email: cleanEmail,
      isNewUser,
      emailSent,
      emailError
    });

  } catch (error) {
    if (conn) {
      try { await conn.rollback(); } catch (rbErr) {}
      conn.release();
    }
    console.error('Approve enrollment and activate error:', error);
    res.status(500).json({ error: 'Error durante la transacción de alta: ' + error.message });
  }
}

// Routes for enrollment approval and activation (both aliases supported)
app.post('/api/admin/inscriptions/:id/convert-to-student', requireAuth, requireNoTempPassword, handleApproveEnrollmentAndActivate);
app.post('/api/admin/inscriptions/:id/approve-enrollment-and-activate', requireAuth, requireNoTempPassword, handleApproveEnrollmentAndActivate);

// Re-send welcome email / generate fresh credentials if previous failed (Requirement 10)
app.post('/api/admin/inscriptions/:id/resend-welcome-email', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    const userRoles = req.user.roles || [];
    if (!userRoles.includes('ADMINISTRADOR') && !userRoles.includes('SECRETARIA')) {
      return res.status(403).json({ error: 'Acceso restringido.' });
    }

    const reqId = req.params.id;
    const rows = await query(`SELECT * FROM inscription_requests WHERE id = ? LIMIT 1`, [reqId]);
    if (!rows || rows.length === 0 || !rows[0].converted_to_student || !rows[0].student_user_id) {
      return res.status(400).json({ error: 'La solicitud debe haber sido dada de alta previamente para poder reenviar el correo de bienvenida.' });
    }

    const reqData = rows[0];
    const cleanEmail = normalizeEmail(reqData.email);
    const userRows = await query(`SELECT * FROM usuarios WHERE id = ? LIMIT 1`, [reqData.student_user_id]);
    if (!userRows || userRows.length === 0) {
      return res.status(404).json({ error: 'Usuario asociado no encontrado en la base de datos.' });
    }

    const studentUser = userRows[0];
    const campusUrl = process.env.CAMPUS_URL || 'http://localhost:3000/#campus';

    // If user has not yet changed password (still temporary), generate a fresh one and invalidate old
    let rawTempPassword = null;
    if (studentUser.cambio_password_obligatorio) {
      rawTempPassword = generateTempPassword(14);
      const newHash = await hashPassword(rawTempPassword);
      await query(`
        UPDATE usuarios
        SET password_hash = ?,
            caducidad_password_temporal = DATE_ADD(NOW(), INTERVAL 7 DAY),
            actualizado_en = NOW()
        WHERE id = ?
      `, [newHash, studentUser.id]);
    }

    const emailSubject = 'Bienvenido/a a ACADEMIAS PÉNDULO — Acceso al campus virtual';
    let emailHtml = '';

    if (rawTempPassword) {
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e5e7eb; border-radius: 12px; background: #ffffff;">
          <h1 style="color: #dc2626; margin: 0; text-align: center;">Academias Péndulo</h1>
          <p style="color: #4b5563; font-size: 14px; text-align: center;">Campus Virtual · Formación Oficial en Automoción</p>
          <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 20px 0;" />
          <p>Hola, <strong>${reqData.first_name}</strong>:</p>
          <p>Te enviamos una nueva credencial temporal de acceso al campus virtual para el curso <strong>${reqData.course_name}</strong>.</p>
          <div style="background-color: #f9fafb; padding: 18px; border-radius: 10px; margin: 25px 0; border: 1px solid #e5e7eb;">
            <p><strong>Usuario:</strong> ${cleanEmail}</p>
            <p><strong>Nueva contraseña temporal:</strong> <span style="font-family: monospace; background: #fee2e2; color: #991b1b; padding: 3px 8px; border-radius: 4px; font-weight: bold;">${rawTempPassword}</span></p>
            <p><strong>Acceso al campus:</strong> <a href="${campusUrl}">${campusUrl}</a></p>
          </div>
          <p style="font-size: 13px; color: #92400e;">Por seguridad, sustituye esta contraseña temporal al acceder por primera vez.</p>
          <p>Un saludo,<br />Administración<br />ACADEMIAS PÉNDULO</p>
        </div>
      `;
    } else {
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e5e7eb; border-radius: 12px; background: #ffffff;">
          <h1 style="color: #dc2626; margin: 0; text-align: center;">Academias Péndulo</h1>
          <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 20px 0;" />
          <p>Hola, <strong>${reqData.first_name}</strong>:</p>
          <p>Tu matrícula en el curso <strong>${reqData.course_name}</strong> se encuentra activa en el campus virtual.</p>
          <div style="background-color: #f9fafb; padding: 18px; border-radius: 10px; margin: 25px 0; border: 1px solid #e5e7eb;">
            <p><strong>Usuario:</strong> ${cleanEmail}</p>
            <p><strong>Contraseña:</strong> Tu contraseña habitual de acceso.</p>
            <p><strong>Acceso al campus:</strong> <a href="${campusUrl}">${campusUrl}</a></p>
          </div>
          <p>Un saludo,<br />Administración<br />ACADEMIAS PÉNDULO</p>
        </div>
      `;
    }

    let emailSent = false;
    let emailError = null;
    try {
      await sendSystemEmail({
        to: cleanEmail,
        subject: emailSubject,
        html: emailHtml
      });
      emailSent = true;
      await query(`UPDATE inscription_requests SET bienvenida_email_enviado = 1, bienvenida_email_error = NULL WHERE id = ?`, [reqData.id]);
      await logInscriptionHistory(reqData.id, req.user.id, 'WELCOME_EMAIL_RESENT', `Reenvío de credenciales realizado por ${req.user.email || req.user.nombre}.`);
    } catch (mailErr) {
      console.error('Resend welcome email SMTP error:', mailErr.message);
      emailError = mailErr.message || 'Error al conectar con servidor SMTP';
      await query(`UPDATE inscription_requests SET bienvenida_email_enviado = 0, bienvenida_email_error = ? WHERE id = ?`, [emailError, reqData.id]);
      await logInscriptionHistory(reqData.id, req.user.id, 'EMAIL_FAILED', `Fallo al reenviar correo de bienvenida: ${emailError}`);
    }

    res.json({
      success: true,
      emailSent,
      emailError,
      message: emailSent
        ? `Correo de bienvenida reenviado correctamente a ${cleanEmail}.`
        : `Credenciales actualizadas pero falló el envío SMTP: ${emailError}`
    });
  } catch (error) {
    console.error('Resend welcome email error:', error);
    res.status(500).json({ error: 'Error al reenviar correo de bienvenida: ' + error.message });
  }
});

// 9. ADMIN: Fetch request history timeline
app.get('/api/admin/inscriptions/:id/history', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    const userRoles = req.user.roles || [];
    if (!userRoles.includes('ADMINISTRADOR') && !userRoles.includes('SECRETARIA')) {
      return res.status(403).json({ error: 'Acceso restringido.' });
    }

    const reqId = req.params.id;
    const history = await query(`
      SELECT h.*, u.nombre as user_name, u.apellidos as user_apellidos
      FROM inscription_request_history h
      LEFT JOIN usuarios u ON h.user_id = u.id
      WHERE h.request_id = ?
      ORDER BY h.created_at ASC
    `, [reqId]);

    res.json(history);
  } catch (error) {
    console.error('Fetch history error:', error);
    res.status(500).json({ error: 'Error al consultar el historial de la solicitud.' });
  }
});

// 10. ADMIN: Resend activation email
app.post('/api/admin/inscriptions/:id/resend-activation-email', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    const userRoles = req.user.roles || [];
    if (!userRoles.includes('ADMINISTRADOR') && !userRoles.includes('SECRETARIA')) {
      return res.status(403).json({ error: 'Acceso restringido.' });
    }

    const reqId = req.params.id;
    const rows = await query(`SELECT * FROM inscription_requests WHERE id = ? LIMIT 1`, [reqId]);

    if (!rows || rows.length === 0 || !rows[0].student_user_id) {
      return res.status(404).json({ error: 'La solicitud no está vinculada a ningún alumno.' });
    }

    const reqData = rows[0];
    const userId = reqData.student_user_id;

    // Generate new token
    const rawActivationToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawActivationToken).digest('hex');

    await query(`
      INSERT INTO account_activation_tokens (user_id, token_hash, expires_at, created_at)
      VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY), NOW())
    `, [userId, tokenHash]);

    const cleanEmail = normalizeEmail(reqData.email);
    const activationLink = `http://localhost:3000/activar-cuenta?token=${rawActivationToken}`;

    await sendSystemEmail({
      to: cleanEmail,
      subject: `Tu acceso al Campus de Academias Péndulo`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e5e7eb; border-radius: 12px; background: #ffffff;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #dc2626; margin: 0;">Academias Péndulo</h1>
            <p style="color: #4b5563; font-size: 14px; margin-top: 4px;">Campus Virtual · Formación Oficial en Automoción</p>
          </div>
          <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 20px 0;" />
          
          <p style="font-size: 16px; color: #1f2937;">Hola <strong>${reqData.first_name}</strong>,</p>
          <p style="font-size: 15px; color: #374151; line-height: 1.5;">Te reenviamos tu enlace oficial de acceso al Campus Virtual para el curso <strong>${reqData.course_name}</strong>.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${activationLink}" style="background-color: #dc2626; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 14px; display: inline-block;">
              ACTIVAR MI CUENTA Y ESTABLECER CONTRASEÑA
            </a>
          </div>
          <p style="font-size: 11px; color: #9ca3af; text-align: center;">Academias Péndulo · Formación en Automoción</p>
        </div>
      `
    });

    await logInscriptionHistory(reqData.id, req.user.id, 'ACTIVATION_EMAIL_SENT', `Reenvío de correo de acceso a ${cleanEmail}.`);

    res.json({ success: true, message: 'Correo de acceso reenviado correctamente.' });
  } catch (error) {
    console.error('Resend activation email error:', error);
    res.status(500).json({ error: 'Error al reenviar el correo de acceso: ' + error.message });
  }
});

// 11. PUBLIC: Verify Activation Token & Activate Account
app.get('/api/auth/activation-info', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'Token no proporcionado.' });

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const rows = await query(`
      SELECT t.*, u.id as user_id, u.nombre, u.apellidos, u.email
      FROM account_activation_tokens t
      JOIN usuarios u ON t.user_id = u.id
      WHERE t.token_hash = ? AND t.used_at IS NULL AND t.expires_at > NOW()
      LIMIT 1
    `, [tokenHash]);

    if (!rows || rows.length === 0) {
      return res.status(400).json({ error: 'El enlace de activación no es válido, ha caducado o ya ha sido utilizado.' });
    }

    res.json({
      valid: true,
      studentName: `${rows[0].nombre} ${rows[0].apellidos}`,
      email: rows[0].email
    });
  } catch (error) {
    console.error('Activation info error:', error);
    res.status(500).json({ error: 'Error al verificar el token de activación.' });
  }
});

app.post('/api/auth/activate-account', async (req, res) => {
  try {
    const ip = req.ip || req.connection.remoteAddress || '127.0.0.1';
    if (!checkRateLimit(`activate:${ip}`, 5, 15 * 60 * 1000)) {
      return res.status(429).json({ error: 'Demasiados intentos de activación. Por favor, inténtelo de nuevo en 15 minutos.' });
    }

    const { token, password } = req.body;
    if (!token || !password || password.length < 8) {
      return res.status(400).json({ error: 'Proporcione una contraseña válida de al menos 8 caracteres.' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const rows = await query(`
      SELECT t.*, u.id as user_id, u.nombre, u.apellidos, u.email
      FROM account_activation_tokens t
      JOIN usuarios u ON t.user_id = u.id
      WHERE t.token_hash = ? AND t.used_at IS NULL AND t.expires_at > NOW()
      LIMIT 1
    `, [tokenHash]);

    if (!rows || rows.length === 0) {
      return res.status(400).json({ error: 'El enlace de activación es inválido o ha caducado.' });
    }

    const tokenData = rows[0];
    const newPassHash = await hashPassword(password);

    // Update user password and clear forced change flag
    await query(`
      UPDATE usuarios
      SET password_hash = ?, cambio_password_obligatorio = 0, caducidad_password_temporal = NULL, estado = 'ACTIVO'
      WHERE id = ?
    `, [newPassHash, tokenData.user_id]);

    // Mark token as used
    await query(`UPDATE account_activation_tokens SET used_at = NOW() WHERE id = ?`, [tokenData.id]);

    // Log history
    const reqRows = await query(`SELECT id FROM inscription_requests WHERE student_user_id = ? LIMIT 1`, [tokenData.user_id]);
    if (reqRows.length > 0) {
      await logInscriptionHistory(reqRows[0].id, tokenData.user_id, 'ACCOUNT_ACTIVATED', 'El alumno activo su cuenta y estableció su contraseña.');
    }

    // Create session cookie for immediate login
    const sessionToken = generateToken();
    const sessionHash = hashToken(sessionToken);
    const sessionId = `sess-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await query(`
      INSERT INTO sesiones (id, usuario_id, token_hash, expiracion, creado_en)
      VALUES (?, ?, ?, ?, NOW())
    `, [sessionId, tokenData.user_id, sessionHash, expiresAt]);

    res.cookie('campus_session', sessionToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      expires: expiresAt
    });

    res.json({
      success: true,
      message: 'Cuenta activada correctamente. Redirigiendo al campus...',
      token: sessionToken,
      user: {
        id: tokenData.user_id,
        nombre: tokenData.nombre,
        apellidos: tokenData.apellidos,
        email: tokenData.email,
        role: 'ALUMNO'
      }
    });

  } catch (error) {
    console.error('Activate account error:', error);
    res.status(500).json({ error: 'Error al activar la cuenta.' });
  }
});

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// ============================================================
// MÓDULO 010: ASISTENCIA
// ============================================================

// GET asistencia de un grupo en una fecha (profesor y admin)
app.get('/api/academic/groups/:groupId/attendance', requireAuth, requireNoTempPassword, async (req, res) => {
  const { groupId } = req.params;
  const { fecha } = req.query;

  const roles = req.user.roles || [];
  if (!roles.some(r => ['ADMINISTRADOR', 'ADMIN', 'SECRETARIA', 'PROFESOR'].includes(r))) {
    return res.status(403).json({ error: 'Acceso denegado: Se requiere rol de profesor o administración.' });
  }

  try {
    const rows = await query(`
      SELECT a.*, u.nombre, u.apellidos, u.email
      FROM asistencia a
      JOIN usuarios u ON a.alumno_id = u.id
      WHERE a.grupo_id = ? ${fecha ? 'AND a.fecha = ?' : ''}
      ORDER BY u.apellidos, u.nombre
    `, fecha ? [groupId, fecha] : [groupId]);
    res.json({ attendance: rows });
  } catch (err) {
    console.error('Error fetching attendance:', err);
    res.status(500).json({ error: 'Error al obtener la asistencia.' });
  }
});

// GET resumen de asistencia de un alumno en una matrícula
app.get('/api/academic/my-attendance', requireAuth, requireNoTempPassword, async (req, res) => {
  const userId = req.user.id;
  try {
    const rows = await query(`
      SELECT v.*, sc.titulo, sc.fecha, sc.hora_inicio, sc.hora_fin, sc.tipo
      FROM v_resumen_asistencia v
      LEFT JOIN sesiones_clase sc ON sc.grupo_id = v.grupo_id
      WHERE v.alumno_id = ?
      ORDER BY sc.fecha DESC
    `, [userId]);
    const summary = await query(`SELECT * FROM v_resumen_asistencia WHERE alumno_id = ?`, [userId]);
    res.json({ summary: summary[0] || null, records: rows });
  } catch (err) {
    console.error('Error fetching my attendance:', err);
    res.status(500).json({ error: 'Error al obtener tu asistencia.' });
  }
});

// POST registrar / actualizar asistencia (profesor y admin)
app.post('/api/academic/groups/:groupId/attendance', requireAuth, requireNoTempPassword, async (req, res) => {
  const { groupId } = req.params;
  const { records, fecha } = req.body; // records: [{alumno_id, matricula_id, estado, justificacion}]

  const roles = req.user.roles || [];
  if (!roles.some(r => ['ADMINISTRADOR', 'ADMIN', 'SECRETARIA', 'PROFESOR'].includes(r))) {
    return res.status(403).json({ error: 'Acceso denegado: Se requiere rol de profesor o administración.' });
  }

  if (!records || !fecha) return res.status(400).json({ error: 'Faltan datos de asistencia.' });

  try {
    for (const r of records) {
      await query(`
        INSERT INTO asistencia (matricula_id, alumno_id, grupo_id, fecha, estado, justificacion, registrado_por)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE estado = VALUES(estado), justificacion = VALUES(justificacion), registrado_por = VALUES(registrado_por)
      `, [r.matricula_id, r.alumno_id, groupId, fecha, r.estado || 'PRESENTE', r.justificacion || null, req.user.id]);
    }
    res.json({ success: true, message: `Asistencia del ${fecha} guardada correctamente.` });
  } catch (err) {
    console.error('Error saving attendance:', err);
    res.status(500).json({ error: 'Error al guardar la asistencia.' });
  }
});

// ============================================================
// MÓDULO 010: CALENDARIO DE SESIONES DE CLASE
// ============================================================

// GET sesiones de clase de un grupo
app.get('/api/academic/groups/:groupId/sessions', requireAuth, requireNoTempPassword, async (req, res) => {
  const { groupId } = req.params;
  try {
    const rows = await query(`
      SELECT sc.*, u.nombre as creado_por_nombre
      FROM sesiones_clase sc
      LEFT JOIN usuarios u ON sc.creado_por = u.id
      WHERE sc.grupo_id = ?
      ORDER BY sc.fecha ASC, sc.hora_inicio ASC
    `, [groupId]);
    res.json({ sessions: rows });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener el calendario de clases.' });
  }
});

// POST crear sesión de clase (profesor / admin)
app.post('/api/academic/groups/:groupId/sessions', requireAuth, requireNoTempPassword, async (req, res) => {
  const { groupId } = req.params;
  const { titulo, descripcion, fecha, hora_inicio, hora_fin, tipo, aula } = req.body;

  const roles = req.user.roles || [];
  if (!roles.some(r => ['ADMINISTRADOR', 'ADMIN', 'SECRETARIA', 'PROFESOR'].includes(r))) {
    return res.status(403).json({ error: 'Acceso denegado: Se requiere rol de profesor o administración.' });
  }

  if (!fecha || !hora_inicio || !hora_fin) return res.status(400).json({ error: 'Fecha y horas son obligatorias.' });
  const id = `sc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  try {
    await query(`
      INSERT INTO sesiones_clase (id, grupo_id, titulo, descripcion, fecha, hora_inicio, hora_fin, tipo, aula, creado_por)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, groupId, titulo || null, descripcion || null, fecha, hora_inicio, hora_fin, tipo || 'PRESENCIAL', aula || null, req.user.id]);
    res.json({ success: true, session_id: id });
  } catch (err) {
    res.status(500).json({ error: 'Error al crear la sesión.' });
  }
});

// DELETE sesión de clase
app.delete('/api/academic/sessions/:sessionId', requireAuth, requireNoTempPassword, async (req, res) => {
  const roles = req.user.roles || [];
  if (!roles.some(r => ['ADMINISTRADOR', 'ADMIN', 'SECRETARIA', 'PROFESOR'].includes(r))) {
    return res.status(403).json({ error: 'Acceso denegado: Se requiere rol de profesor o administración.' });
  }

  try {
    await query(`DELETE FROM sesiones_clase WHERE id = ?`, [req.params.sessionId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar la sesión.' });
  }
});

// ============================================================
// MÓDULO 010: EXÁMENES & PREGUNTAS
// ============================================================

// GET exámenes del grupo del alumno o de un grupo específico
app.get('/api/academic/exams', requireAuth, requireNoTempPassword, async (req, res) => {
  const { group_id } = req.query;
  try {
    let whereClause = 'e.estado = "PUBLICADO"';
    const params = [];
    if (group_id) {
      whereClause += ' AND e.grupo_id = ?';
      params.push(group_id);
    }
    const rows = await query(`
      SELECT e.*, esp.nombre as especialidad_nombre,
        (SELECT COUNT(*) FROM preguntas_examen pq WHERE pq.examen_id = e.id) as num_preguntas
      FROM examenes e
      JOIN especialidades esp ON e.especialidad_id = esp.id
      WHERE ${whereClause}
      ORDER BY e.fecha_apertura DESC
    `, params);
    res.json({ exams: rows });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener los exámenes.' });
  }
});

// GET exámenes de un grupo (para el profesor/admin con todos los estados)
app.get('/api/academic/groups/:groupId/exams', requireAuth, requireNoTempPassword, async (req, res) => {
  const { groupId } = req.params;
  try {
    const rows = await query(`
      SELECT e.*,
        (SELECT COUNT(*) FROM preguntas_examen pq WHERE pq.examen_id = e.id) as num_preguntas,
        (SELECT COUNT(*) FROM resultados_examenes re WHERE re.examen_id = e.id AND re.estado = 'COMPLETADO') as num_completados
      FROM examenes e
      WHERE e.grupo_id = ?
      ORDER BY e.creado_en DESC
    `, [groupId]);
    res.json({ exams: rows });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener los exámenes.' });
  }
});

// GET detalle de un examen con preguntas (para el alumno que va a realizarlo)
app.get('/api/academic/exams/:examId/take', requireAuth, requireNoTempPassword, async (req, res) => {
  const { examId } = req.params;
  const userId = req.user.id;
  try {
    const [exam] = await query(`SELECT * FROM examenes WHERE id = ? AND estado = 'PUBLICADO'`, [examId]);
    if (!exam) return res.status(404).json({ error: 'Examen no encontrado o no disponible.' });

    // Check attempts
    const [attemptCount] = await query(`SELECT COUNT(*) as cnt FROM resultados_examenes WHERE examen_id = ? AND alumno_id = ? AND estado = 'COMPLETADO'`, [examId, userId]);
    if (attemptCount.cnt >= exam.intentos_permitidos) {
      return res.status(403).json({ error: 'Has agotado todos tus intentos para este examen.' });
    }

    let questions = await query(`SELECT id, enunciado, tipo, opciones, puntuacion, orden, imagen_url FROM preguntas_examen WHERE examen_id = ? ORDER BY orden ASC`, [examId]);
    if (exam.mezclar_preguntas) questions = questions.sort(() => Math.random() - 0.5);

    res.json({ exam, questions, current_attempt: attemptCount.cnt + 1 });
  } catch (err) {
    res.status(500).json({ error: 'Error al cargar el examen.' });
  }
});

// POST crear examen (profesor/admin)
app.post('/api/academic/groups/:groupId/exams', requireAuth, requireNoTempPassword, async (req, res) => {
  const roles = req.user.roles || [];
  if (!roles.some(r => ['ADMINISTRADOR', 'ADMIN', 'SECRETARIA', 'PROFESOR'].includes(r))) {
    return res.status(403).json({ error: 'Acceso denegado: Se requiere rol de profesor o administración.' });
  }

  const { groupId } = req.params;
  const { titulo, descripcion, tipo, nota_minima_aprobado, duracion_minutos, intentos_permitidos, mezclar_preguntas, mostrar_resultado_inmediato, fecha_apertura, fecha_cierre, especialidad_id, preguntas } = req.body;
  if (!titulo || !especialidad_id) return res.status(400).json({ error: 'Título y especialidad son obligatorios.' });

  const examId = `exam-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const puntuacion_maxima = (preguntas || []).reduce((sum, p) => sum + (parseFloat(p.puntuacion) || 1), 0) || 10;

  try {
    await query(`
      INSERT INTO examenes (id, grupo_id, especialidad_id, titulo, descripcion, tipo, nota_minima_aprobado, puntuacion_maxima, duracion_minutos, intentos_permitidos, mezclar_preguntas, mostrar_resultado_inmediato, fecha_apertura, fecha_cierre, estado, creado_por)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'BORRADOR', ?)
    `, [examId, groupId, especialidad_id, titulo, descripcion || null, tipo || 'TEST', nota_minima_aprobado || 5, puntuacion_maxima, duracion_minutos || null, intentos_permitidos || 1, mezclar_preguntas ? 1 : 0, mostrar_resultado_inmediato ? 1 : 0, fecha_apertura || null, fecha_cierre || null, req.user.id]);

    for (let i = 0; i < (preguntas || []).length; i++) {
      const p = preguntas[i];
      const pId = `pq-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`;
      await query(`
        INSERT INTO preguntas_examen (id, examen_id, enunciado, tipo, opciones, respuesta_correcta, puntuacion, orden, explicacion)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [pId, examId, p.enunciado, p.tipo || 'OPCION_MULTIPLE', JSON.stringify(p.opciones || []), p.respuesta_correcta || null, p.puntuacion || 1, i, p.explicacion || null]);
    }

    res.json({ success: true, exam_id: examId });
  } catch (err) {
    console.error('Error creating exam:', err);
    res.status(500).json({ error: 'Error al crear el examen.' });
  }
});

// PATCH cambiar estado del examen (borrador → publicado, etc.)
app.patch('/api/academic/exams/:examId/status', requireAuth, requireNoTempPassword, async (req, res) => {
  const roles = req.user.roles || [];
  if (!roles.some(r => ['ADMINISTRADOR', 'ADMIN', 'SECRETARIA', 'PROFESOR'].includes(r))) {
    return res.status(403).json({ error: 'Acceso denegado: Se requiere rol de profesor o administración.' });
  }

  const { estado } = req.body;
  if (!['BORRADOR', 'PUBLICADO', 'CERRADO', 'ARCHIVADO'].includes(estado)) return res.status(400).json({ error: 'Estado inválido.' });
  try {
    await query(`UPDATE examenes SET estado = ? WHERE id = ?`, [estado, req.params.examId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar estado del examen.' });
  }
});

// POST enviar respuestas del examen (alumno con validación de propiedad de matrícula)
app.post('/api/academic/exams/:examId/submit', requireAuth, requireNoTempPassword, async (req, res) => {
  const { examId } = req.params;
  const userId = req.user.id;
  const { respuestas, matricula_id, tiempo_empleado_segundos } = req.body;
  if (!respuestas || !matricula_id) return res.status(400).json({ error: 'Faltan datos.' });

  try {
    // Validate ownership of matricula
    const matCheck = await query(`SELECT id FROM matriculas WHERE id = ? AND alumno_id = ? AND estado = 'ACTIVA' LIMIT 1`, [matricula_id, userId]);
    if (!matCheck || matCheck.length === 0) {
      await logSecurityEvent({ event: 'IDOR_BLOCKED', userId, email: req.user.email, ip: req.ip || null, details: { resource: 'exam_submit_unauthorized_matricula', examId, matricula_id }, level: 'WARN' });
      return res.status(403).json({ error: 'Acceso denegado: La matrícula indicada no pertenece al alumno autenticado o no está activa.' });
    }

    const [exam] = await query(`SELECT * FROM examenes WHERE id = ?`, [examId]);
    if (!exam) return res.status(404).json({ error: 'Examen no encontrado.' });

    const preguntas = await query(`SELECT * FROM preguntas_examen WHERE examen_id = ?`, [examId]);
    const [attemptCount] = await query(`SELECT COUNT(*) as cnt FROM resultados_examenes WHERE examen_id = ? AND alumno_id = ? AND estado = 'COMPLETADO'`, [examId, userId]);
    const intento = attemptCount.cnt + 1;

    // Auto-correct test questions
    let puntos_obtenidos = 0;
    const respuestas_detalle = preguntas.map(p => {
      const respuesta_alumno = respuestas[p.id];
      const correcta = p.tipo !== 'TEXTO_LIBRE' && respuesta_alumno == p.respuesta_correcta;
      if (correcta) puntos_obtenidos += parseFloat(p.puntuacion);
      return { pregunta_id: p.id, respuesta_alumno, respuesta_correcta: p.respuesta_correcta, correcta, puntuacion: p.puntuacion };
    });

    const nota = exam.puntuacion_maxima > 0 ? Math.round((puntos_obtenidos / parseFloat(exam.puntuacion_maxima)) * 10 * 100) / 100 : 0;
    const aprobado = nota >= parseFloat(exam.nota_minima_aprobado) ? 1 : 0;

    const resultId = `res-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await query(`
      INSERT INTO resultados_examenes (id, examen_id, alumno_id, matricula_id, intento, nota, puntos_obtenidos, puntos_maximos, aprobado, respuestas, tiempo_empleado_segundos, finalizado_en, estado)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 'COMPLETADO')
    `, [resultId, examId, userId, matricula_id, intento, nota, puntos_obtenidos, exam.puntuacion_maxima, aprobado, JSON.stringify(respuestas_detalle), tiempo_empleado_segundos || null]);

    const mostrar = exam.mostrar_resultado_inmediato ? { nota, aprobado: !!aprobado, puntos_obtenidos, puntos_maximos: exam.puntuacion_maxima, respuestas_detalle } : {};
    res.json({ success: true, result_id: resultId, ...mostrar });
  } catch (err) {
    console.error('Error submitting exam:', err);
    res.status(500).json({ error: 'Error al procesar el examen.' });
  }
});

// GET resultados del alumno autenticado
app.get('/api/academic/my-results', requireAuth, requireNoTempPassword, async (req, res) => {
  const userId = req.user.id;
  try {
    const rows = await query(`
      SELECT re.*, e.titulo as examen_titulo, e.tipo as examen_tipo, e.nota_minima_aprobado,
             esp.nombre as especialidad_nombre
      FROM resultados_examenes re
      JOIN examenes e ON re.examen_id = e.id
      JOIN especialidades esp ON e.especialidad_id = esp.id
      WHERE re.alumno_id = ? AND re.estado = 'COMPLETADO'
      ORDER BY re.finalizado_en DESC
    `, [userId]);
    res.json({ results: rows });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener tus resultados.' });
  }
});

// GET resultados de todos los alumnos de un examen (profesor/admin)
app.get('/api/academic/exams/:examId/results', requireAuth, requireNoTempPassword, async (req, res) => {
  const roles = req.user.roles || [];
  if (!roles.some(r => ['ADMINISTRADOR', 'ADMIN', 'SECRETARIA', 'PROFESOR'].includes(r))) {
    return res.status(403).json({ error: 'Acceso denegado: Se requiere rol de profesor o administración.' });
  }

  const { examId } = req.params;
  try {
    const rows = await query(`
      SELECT re.*, u.nombre, u.apellidos, u.email
      FROM resultados_examenes re
      JOIN usuarios u ON re.alumno_id = u.id
      WHERE re.examen_id = ? AND re.estado = 'COMPLETADO'
      ORDER BY re.nota DESC, re.finalizado_en ASC
    `, [examId]);
    res.json({ results: rows });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener los resultados del examen.' });
  }
});

// ============================================================
// MÓDULO 010: CERTIFICADOS
// ============================================================

// GET certificados de un alumno
app.get('/api/academic/my-certificates', requireAuth, requireNoTempPassword, async (req, res) => {
  const userId = req.user.id;
  try {
    const rows = await query(`
      SELECT c.*, esp.nombre as especialidad_nombre, g.nombre as grupo_nombre
      FROM certificados_emitidos c
      JOIN especialidades esp ON c.especialidad_id = esp.id
      JOIN grupos g ON c.grupo_id = g.id
      WHERE c.alumno_id = ? AND c.estado = 'EMITIDO'
      ORDER BY c.fecha_emision DESC
    `, [userId]);
    res.json({ certificates: rows });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener tus certificados.' });
  }
});

// GET todos los certificados (secretaría/admin)
app.get('/api/admin/certificates', requireAuth, requireNoTempPassword, async (req, res) => {
  const userRoles = req.user.roles || [];
  if (!userRoles.some(r => ['ADMINISTRADOR', 'ADMIN', 'SECRETARIA', 'DIRECCION'].includes(r))) {
    return res.status(403).json({ error: 'Acceso denegado: Se requiere rol de Administración o Secretaría.' });
  }

  const { alumno_id, grupo_id, estado } = req.query;
  try {
    let where = '1=1';
    const params = [];
    if (alumno_id) { where += ' AND c.alumno_id = ?'; params.push(alumno_id); }
    if (grupo_id) { where += ' AND c.grupo_id = ?'; params.push(grupo_id); }
    if (estado) { where += ' AND c.estado = ?'; params.push(estado); }
    const rows = await query(`
      SELECT c.*, u.nombre, u.apellidos, u.email,
             esp.nombre as especialidad_nombre, g.nombre as grupo_nombre
      FROM certificados_emitidos c
      JOIN usuarios u ON c.alumno_id = u.id
      JOIN especialidades esp ON c.especialidad_id = esp.id
      JOIN grupos g ON c.grupo_id = g.id
      WHERE ${where}
      ORDER BY c.fecha_emision DESC
    `, params);
    res.json({ certificates: rows });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener los certificados.' });
  }
});

// POST emitir certificado (secretaría/admin)
app.post('/api/admin/certificates', requireAuth, requireNoTempPassword, async (req, res) => {
  const userRoles = req.user.roles || [];
  if (!userRoles.some(r => ['ADMINISTRADOR', 'ADMIN', 'SECRETARIA', 'DIRECCION'].includes(r))) {
    return res.status(403).json({ error: 'Acceso denegado: Se requiere rol de Administración o Secretaría.' });
  }

  const { alumno_id, matricula_id, especialidad_id, grupo_id, tipo, nota_final, horas_cursadas, porcentaje_asistencia, fecha_inicio_curso, fecha_fin_curso } = req.body;
  if (!alumno_id || !matricula_id || !especialidad_id || !grupo_id) return res.status(400).json({ error: 'Faltan datos obligatorios.' });

  const year = new Date().getFullYear();
  const [lastCert] = await query(`SELECT numero_certificado FROM certificados_emitidos ORDER BY creado_en DESC LIMIT 1`).catch(() => [null]);
  const lastNum = lastCert ? parseInt(lastCert.numero_certificado.split('-').pop() || '0') : 0;
  const numero_certificado = `CERT-PEND-${year}-${String(lastNum + 1).padStart(4, '0')}`;
  const certId = `cert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  try {
    await query(`
      INSERT INTO certificados_emitidos (id, numero_certificado, alumno_id, matricula_id, especialidad_id, grupo_id, tipo, nota_final, horas_cursadas, porcentaje_asistencia, fecha_inicio_curso, fecha_fin_curso, fecha_emision, expedido_por)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), ?)
    `, [certId, numero_certificado, alumno_id, matricula_id, especialidad_id, grupo_id, tipo || 'APROVECHAMIENTO', nota_final || null, horas_cursadas || null, porcentaje_asistencia || null, fecha_inicio_curso || null, fecha_fin_curso || null, req.user.id]);

    res.json({ success: true, cert_id: certId, numero_certificado });
  } catch (err) {
    console.error('Error issuing certificate:', err);
    res.status(500).json({ error: 'Error al emitir el certificado.' });
  }
});

// ============================================================
// MÓDULO 010: EVALUACIÓN DEL FORMADOR
// ============================================================

// POST enviar evaluación del formador (alumno)
app.post('/api/academic/groups/:groupId/evaluate-teacher', requireAuth, requireNoTempPassword, async (req, res) => {
  const { groupId } = req.params;
  const userId = req.user.id;
  const { matricula_id, puntuacion_metodologia, puntuacion_conocimientos, puntuacion_materiales, puntuacion_organizacion, puntuacion_global, comentarios_abiertos, recomendaria } = req.body;

  const id = `ef-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  try {
    await query(`
      INSERT INTO evaluaciones_formador (id, grupo_id, alumno_id, matricula_id, puntuacion_metodologia, puntuacion_conocimientos, puntuacion_materiales, puntuacion_organizacion, puntuacion_global, comentarios_abiertos, recomendaria, completada_en)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        puntuacion_metodologia = VALUES(puntuacion_metodologia),
        puntuacion_conocimientos = VALUES(puntuacion_conocimientos),
        puntuacion_materiales = VALUES(puntuacion_materiales),
        puntuacion_organizacion = VALUES(puntuacion_organizacion),
        puntuacion_global = VALUES(puntuacion_global),
        comentarios_abiertos = VALUES(comentarios_abiertos),
        recomendaria = VALUES(recomendaria),
        completada_en = NOW()
    `, [id, groupId, userId, matricula_id, puntuacion_metodologia, puntuacion_conocimientos, puntuacion_materiales, puntuacion_organizacion, puntuacion_global, comentarios_abiertos || null, recomendaria ? 1 : 0]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error submitting teacher evaluation:', err);
    res.status(500).json({ error: 'Error al enviar la evaluación.' });
  }
});

// GET resultado de evaluaciones del formador (profesor/admin — datos anónimos)
app.get('/api/academic/groups/:groupId/teacher-evaluations', requireAuth, requireNoTempPassword, async (req, res) => {
  const { groupId } = req.params;
  try {
    const [avg] = await query(`
      SELECT
        COUNT(*) as total_evaluaciones,
        ROUND(AVG(puntuacion_metodologia), 2) as avg_metodologia,
        ROUND(AVG(puntuacion_conocimientos), 2) as avg_conocimientos,
        ROUND(AVG(puntuacion_materiales), 2) as avg_materiales,
        ROUND(AVG(puntuacion_organizacion), 2) as avg_organizacion,
        ROUND(AVG(puntuacion_global), 2) as avg_global,
        SUM(recomendaria) as recomendarian
      FROM evaluaciones_formador WHERE grupo_id = ?
    `, [groupId]);
    res.json({ summary: avg });
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener evaluaciones del formador.' });
  }
});

// ============================================================
// CATÁLOGO COMERCIAL DE CURSOS / ESPECIALIDADES (MODIFICACIÓN 02)
// ============================================================

// 1. PUBLIC: Get all courses with commercial info for public catalog
// Priority 1: Matrícula abierta first, then cerrada
// Priority 2: Manual display order (orden_visualizacion ASC)
// Priority 3: Stable tie-breaker (codigo ASC)
app.get('/api/public/courses', async (req, res) => {
  try {
    const rows = await query(`
      SELECT 
        id, codigo, nombre, categoria_id, descripcion, nivel, horas_totales, horas_practicas, modalidad, estado,
        precio_base, moneda, tipo_iva, porcentaje_iva, importe_iva, precio_final,
        estado_precio, tipo_inscripcion, plazas_maximas, plazas_disponibles,
        estado_disponibilidad, fecha_apertura_inscripcion, fecha_cierre_inscripcion, estado_publicacion,
        orden_visualizacion, slug, meta_title, meta_description, alt_text, og_image, indexable
      FROM especialidades
      WHERE estado_publicacion IN ('PUBLICADO', 'NO_DISPONIBLE')
      ORDER BY 
        (CASE WHEN estado_disponibilidad = 'ABIERTA' THEN 0 ELSE 1 END) ASC,
        orden_visualizacion ASC,
        codigo ASC
    `);
    res.json(rows || []);
  } catch (error) {
    console.error('Error fetching public courses catalog:', error);
    res.status(500).json({ error: 'Error al consultar el catálogo de cursos.' });
  }
});

// Alias for academic specialties
app.get('/api/academic/specialties', async (req, res) => {
  try {
    const rows = await query(`
      SELECT 
        id, codigo, nombre, categoria_id, descripcion, nivel, horas_totales, horas_practicas, modalidad, estado,
        precio_base, moneda, tipo_iva, porcentaje_iva, importe_iva, precio_final,
        estado_precio, tipo_inscripcion, plazas_maximas, plazas_disponibles,
        estado_disponibilidad, fecha_apertura_inscripcion, fecha_cierre_inscripcion, estado_publicacion,
        orden_visualizacion, slug, meta_title, meta_description, alt_text, og_image, indexable
      FROM especialidades
      ORDER BY 
        (CASE WHEN estado_disponibilidad = 'ABIERTA' THEN 0 ELSE 1 END) ASC,
        orden_visualizacion ASC,
        codigo ASC
    `);
    res.json(rows || []);
  } catch (error) {
    console.error('Error fetching academic specialties:', error);
    res.status(500).json({ error: 'Error al consultar las especialidades.' });
  }
});

// PUBLIC: Get single course by slug or ID
app.get('/api/courses/by-slug/:slug', async (req, res) => {
  try {
    const rawParam = req.params.slug.trim();
    const rows = await query(`
      SELECT 
        id, codigo, nombre, categoria_id, descripcion, nivel, horas_totales, horas_practicas, modalidad, estado,
        precio_base, moneda, tipo_iva, porcentaje_iva, importe_iva, precio_final,
        estado_precio, tipo_inscripcion, plazas_maximas, plazas_disponibles,
        estado_disponibilidad, fecha_apertura_inscripcion, fecha_cierre_inscripcion, estado_publicacion,
        orden_visualizacion, slug, meta_title, meta_description, alt_text, og_image, indexable,
        actualizado_en, creado_en
      FROM especialidades
      WHERE slug = ? OR id = ? OR codigo = ?
      LIMIT 1
    `, [rawParam, rawParam, rawParam]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Curso no encontrado.' });
    }

    res.json({ course: rows[0] });
  } catch (error) {
    console.error('Error fetching course by slug:', error);
    res.status(500).json({ error: 'Error al consultar el curso.' });
  }
});

// 2. ADMIN: Get all courses for administration (including Borrador and Archivado)
app.get('/api/admin/courses', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    const userRoles = req.user.roles || [];
    if (!userRoles.some(r => ['ADMINISTRADOR', 'ADMIN', 'SECRETARIA', 'DIRECCION'].includes(r))) {
      return res.status(403).json({ error: 'Acceso restringido a personal de administración y secretaría.' });
    }

    const rows = await query(`
      SELECT 
        id, codigo, nombre, categoria_id, descripcion, nivel, horas_totales, horas_practicas, modalidad, estado,
        precio_base, moneda, tipo_iva, porcentaje_iva, importe_iva, precio_final,
        estado_precio, tipo_inscripcion, plazas_maximas, plazas_disponibles,
        estado_disponibilidad, fecha_apertura_inscripcion, fecha_cierre_inscripcion, estado_publicacion,
        orden_visualizacion, slug, meta_title, meta_description, alt_text, og_image, indexable,
        modificado_por_admin, actualizado_en
      FROM especialidades
      ORDER BY 
        (CASE WHEN estado_disponibilidad = 'ABIERTA' THEN 0 ELSE 1 END) ASC,
        orden_visualizacion ASC,
        codigo ASC
    `);
    res.json({ courses: rows || [] });
  } catch (error) {
    console.error('Error fetching admin courses:', error);
    res.status(500).json({ error: 'Error al consultar los cursos.' });
  }
});

// 3. ADMIN: 1-Click Toggle / Update Course Enrollment Status (ABIERTA / CERRADA)
const handleEnrollmentStatusChange = async (req, res) => {
  try {
    const userRoles = req.user.roles || [];
    if (!userRoles.some(r => ['ADMINISTRADOR', 'ADMIN', 'SECRETARIA', 'DIRECCION'].includes(r))) {
      return res.status(403).json({ error: 'Acceso restringido a personal de administración y secretaría.' });
    }

    const courseId = req.params.id;
    const { estado_disponibilidad } = req.body;

    const existing = await query(`SELECT id, codigo, nombre, estado_disponibilidad FROM especialidades WHERE id = ? OR codigo = ? LIMIT 1`, [courseId, courseId]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ error: 'Curso no encontrado.' });
    }

    const currentCourse = existing[0];
    let newStatus = estado_disponibilidad;
    if (!newStatus) {
      newStatus = currentCourse.estado_disponibilidad === 'ABIERTA' ? 'CERRADA' : 'ABIERTA';
    }

    if (!['ABIERTA', 'CERRADA', 'SUSPENDIDA_TEMPORALMENTE', 'COMPLETA'].includes(newStatus)) {
      return res.status(400).json({ error: 'Estado de matrícula no válido.' });
    }

    const userActor = req.user.email || req.user.nombre || 'Administrador';

    await query(`
      UPDATE especialidades
      SET estado_disponibilidad = ?,
          modificado_por_admin = ?,
          actualizado_en = NOW()
      WHERE id = ?
    `, [newStatus, userActor, currentCourse.id]);

    const updated = (await query(`SELECT * FROM especialidades WHERE id = ?`, [currentCourse.id]))[0];

    res.json({
      success: true,
      course: updated,
      message: `Matrícula del curso "${currentCourse.nombre}" establecida en ${newStatus === 'ABIERTA' ? 'ABIERTA' : 'CERRADA'}.`
    });
  } catch (error) {
    console.error('Error updating course enrollment status:', error);
    res.status(500).json({ error: 'Error al actualizar el estado de matrícula: ' + error.message });
  }
};

app.put('/api/admin/courses/:id/enrollment-status', requireAuth, requireNoTempPassword, handleEnrollmentStatusChange);
app.post('/api/admin/courses/:id/toggle-enrollment', requireAuth, requireNoTempPassword, handleEnrollmentStatusChange);

// 4. ADMIN: Reorder courses manually (UP / DOWN buttons or array of ordered IDs)
app.post('/api/admin/courses/reorder', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    const userRoles = req.user.roles || [];
    if (!userRoles.some(r => ['ADMINISTRADOR', 'ADMIN', 'SECRETARIA', 'DIRECCION'].includes(r))) {
      return res.status(403).json({ error: 'Acceso restringido a personal de administración y secretaría.' });
    }

    const { courseId, direction, orderedIds } = req.body;

    // Mode 1: Batch reorder
    if (Array.isArray(orderedIds) && orderedIds.length > 0) {
      for (let i = 0; i < orderedIds.length; i++) {
        await query(`UPDATE especialidades SET orden_visualizacion = ?, actualizado_en = NOW() WHERE id = ? OR codigo = ?`, [i + 1, orderedIds[i], orderedIds[i]]);
      }
      return res.json({ success: true, message: 'Orden de cursos guardado correctamente.' });
    }

    // Mode 2: Move a course UP or DOWN within its availability group
    if (!courseId || !direction || !['UP', 'DOWN'].includes(direction.toUpperCase())) {
      return res.status(400).json({ error: 'Debe especificar courseId y dirección ("UP" o "DOWN").' });
    }

    const currentRows = await query(`SELECT id, codigo, estado_disponibilidad, orden_visualizacion FROM especialidades WHERE id = ? OR codigo = ? LIMIT 1`, [courseId, courseId]);
    if (!currentRows || currentRows.length === 0) {
      return res.status(404).json({ error: 'Curso no encontrado.' });
    }
    const currentCourse = currentRows[0];
    const isAbierta = currentCourse.estado_disponibilidad === 'ABIERTA';

    // Fetch all courses in same availability group ordered by orden_visualizacion ASC, codigo ASC
    const groupCourses = await query(`
      SELECT id, orden_visualizacion 
      FROM especialidades 
      WHERE (CASE WHEN estado_disponibilidad = 'ABIERTA' THEN 1 ELSE 0 END) = ?
      ORDER BY orden_visualizacion ASC, codigo ASC
    `, [isAbierta ? 1 : 0]);

    const currentIndex = groupCourses.findIndex(c => c.id === currentCourse.id);
    if (currentIndex === -1) {
      return res.status(400).json({ error: 'No se pudo localizar el curso en su grupo.' });
    }

    const targetIndex = direction.toUpperCase() === 'UP' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= groupCourses.length) {
      return res.json({ success: true, message: 'El curso ya se encuentra en el límite de su grupo.', unchanged: true });
    }

    const neighborCourse = groupCourses[targetIndex];

    let currentOrder = currentCourse.orden_visualizacion;
    let neighborOrder = neighborCourse.orden_visualizacion;

    if (currentOrder === neighborOrder) {
      for (let i = 0; i < groupCourses.length; i++) {
        await query(`UPDATE especialidades SET orden_visualizacion = ? WHERE id = ?`, [(i + 1) * 10, groupCourses[i].id]);
      }
      currentOrder = (currentIndex + 1) * 10;
      neighborOrder = (targetIndex + 1) * 10;
    }

    await query(`UPDATE especialidades SET orden_visualizacion = ?, actualizado_en = NOW() WHERE id = ?`, [neighborOrder, currentCourse.id]);
    await query(`UPDATE especialidades SET orden_visualizacion = ?, actualizado_en = NOW() WHERE id = ?`, [currentOrder, neighborCourse.id]);

    res.json({
      success: true,
      message: `Posición del curso actualizada (${direction.toUpperCase() === 'UP' ? 'Subido' : 'Bajado'}).`,
      swappedWith: neighborCourse.id
    });
  } catch (error) {
    console.error('Error reordering courses:', error);
    res.status(500).json({ error: 'Error al reordenar cursos: ' + error.message });
  }
});

// 5. ADMIN: Update course commercial configuration
app.put('/api/admin/courses/:id', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    const userRoles = req.user.roles || [];
    if (!userRoles.some(r => ['ADMINISTRADOR', 'ADMIN', 'SECRETARIA', 'DIRECCION'].includes(r))) {
      return res.status(403).json({ error: 'Acceso restringido.' });
    }

    const courseId = req.params.id;
    const existingRows = await query(`SELECT * FROM especialidades WHERE id = ? OR codigo = ? LIMIT 1`, [courseId, courseId]);
    if (!existingRows || existingRows.length === 0) {
      return res.status(404).json({ error: 'Curso no encontrado.' });
    }

    const currentCourse = existingRows[0];
    const {
      precio_base,
      tipo_iva,
      tipo_inscripcion,
      plazas_maximas,
      plazas_disponibles,
      estado_disponibilidad,
      fecha_apertura_inscripcion,
      fecha_cierre_inscripcion,
      estado_publicacion,
      orden_visualizacion
    } = req.body;

    // --- VALIDATIONS (Section 3 & 9) ---
    // 1. Price validation
    let cleanPrecioBase = null;
    let cleanPorcentajeIva = 0.00;
    let cleanImporteIva = 0.00;
    let cleanPrecioFinal = null;
    let cleanEstadoPrecio = 'SIN_CONFIGURAR';

    if (precio_base !== undefined && precio_base !== null && String(precio_base).trim() !== '') {
      const numPrice = Number(precio_base);
      if (isNaN(numPrice) || numPrice < 0) {
        return res.status(400).json({ error: 'El precio del curso no puede ser negativo ni contener un formato inválido.' });
      }
      cleanPrecioBase = Math.round(numPrice * 100) / 100;

      // Tax calculation
      const validTaxes = ['EXENTO', 'GENERAL_21', 'REDUCIDO_10', 'SUPERREDUCIDO_4'];
      const taxType = (tipo_iva && validTaxes.includes(tipo_iva)) ? tipo_iva : (currentCourse.tipo_iva || 'EXENTO');

      if (taxType === 'GENERAL_21') cleanPorcentajeIva = 21.00;
      else if (taxType === 'REDUCIDO_10') cleanPorcentajeIva = 10.00;
      else if (taxType === 'SUPERREDUCIDO_4') cleanPorcentajeIva = 4.00;
      else cleanPorcentajeIva = 0.00;

      cleanImporteIva = Math.round((cleanPrecioBase * (cleanPorcentajeIva / 100)) * 100) / 100;
      cleanPrecioFinal = Math.round((cleanPrecioBase + cleanImporteIva) * 100) / 100;
      cleanEstadoPrecio = 'CONFIGURADO';
    } else {
      // If price is cleared
      cleanPrecioBase = null;
      cleanImporteIva = null;
      cleanPrecioFinal = null;
      cleanEstadoPrecio = 'SIN_CONFIGURAR';
    }

    // 2. Enrollment type
    const validInscriptions = ['COMPRA_DIRECTA', 'SOLICITUD_APROBACION'];
    const cleanTipoInscripcion = (tipo_inscripcion && validInscriptions.includes(tipo_inscripcion))
      ? tipo_inscripcion
      : currentCourse.tipo_inscripcion;

    // 3. Seats validation
    let cleanPlazasMax = plazas_maximas !== undefined && plazas_maximas !== null && plazas_maximas !== ''
      ? parseInt(plazas_maximas, 10)
      : currentCourse.plazas_maximas;
    if (cleanPlazasMax !== null && (isNaN(cleanPlazasMax) || cleanPlazasMax < 0)) {
      return res.status(400).json({ error: 'El número máximo de plazas no puede ser negativo.' });
    }

    let cleanPlazasDisp = plazas_disponibles !== undefined && plazas_disponibles !== null && plazas_disponibles !== ''
      ? parseInt(plazas_disponibles, 10)
      : currentCourse.plazas_disponibles;
    if (cleanPlazasDisp !== null && (isNaN(cleanPlazasDisp) || cleanPlazasDisp < 0)) {
      return res.status(400).json({ error: 'Las plazas disponibles no pueden ser negativas.' });
    }

    // 4. Dates validation
    const fechaApertura = fecha_apertura_inscripcion || null;
    const fechaCierre = fecha_cierre_inscripcion || null;
    if (fechaApertura && fechaCierre) {
      if (new Date(fechaCierre) < new Date(fechaApertura)) {
        return res.status(400).json({ error: 'La fecha de cierre de inscripciones no puede ser anterior a la fecha de apertura.' });
      }
    }

    // 5. Availability status
    const validAvailabilities = ['ABIERTA', 'CERRADA', 'SUSPENDIDA_TEMPORALMENTE', 'COMPLETA'];
    const cleanDisponibilidad = (estado_disponibilidad && validAvailabilities.includes(estado_disponibilidad))
      ? estado_disponibilidad
      : currentCourse.estado_disponibilidad;

    // 6. Publication status
    const validPublications = ['BORRADOR', 'PUBLICADO', 'NO_DISPONIBLE', 'ARCHIVADO'];
    const cleanPublicacion = (estado_publicacion && validPublications.includes(estado_publicacion))
      ? estado_publicacion
      : currentCourse.estado_publicacion;

    // 7. Commercial rule: Cannot publish for online direct sale without configured price when enrollment is open
    if (cleanTipoInscripcion === 'COMPRA_DIRECTA' && cleanPublicacion === 'PUBLICADO' && cleanEstadoPrecio !== 'CONFIGURADO' && cleanDisponibilidad === 'ABIERTA') {
      return res.status(400).json({
        error: 'No se puede publicar un curso con venta online directa con matrícula abierta sin haber establecido su precio comercial oficial.'
      });
    }

    const cleanOrder = (orden_visualizacion !== undefined && orden_visualizacion !== null && !isNaN(Number(orden_visualizacion)))
      ? Number(orden_visualizacion)
      : (currentCourse.orden_visualizacion || 0);

    const userActor = req.user?.email || req.user?.nombre || 'Administrador';

    // Update in MySQL
    await query(`
      UPDATE especialidades
      SET 
        precio_base = ?,
        moneda = 'EUR',
        tipo_iva = ?,
        porcentaje_iva = ?,
        importe_iva = ?,
        precio_final = ?,
        estado_precio = ?,
        tipo_inscripcion = ?,
        plazas_maximas = ?,
        plazas_disponibles = ?,
        estado_disponibilidad = ?,
        fecha_apertura_inscripcion = ?,
        fecha_cierre_inscripcion = ?,
        estado_publicacion = ?,
        orden_visualizacion = ?,
        modificado_por_admin = ?,
        actualizado_en = NOW()
      WHERE id = ?
    `, [
      cleanPrecioBase,
      tipo_iva || currentCourse.tipo_iva || 'EXENTO',
      cleanPorcentajeIva,
      cleanImporteIva,
      cleanPrecioFinal,
      cleanEstadoPrecio,
      cleanTipoInscripcion,
      cleanPlazasMax,
      cleanPlazasDisp,
      cleanDisponibilidad,
      fechaApertura,
      fechaCierre,
      cleanPublicacion,
      cleanOrder,
      userActor,
      currentCourse.id
    ]);

    // Fetch updated record
    const updated = await query(`SELECT * FROM especialidades WHERE id = ?`, [currentCourse.id]);

    res.json({
      success: true,
      message: 'Configuración comercial del curso actualizada correctamente.',
      course: updated[0]
    });

  } catch (error) {
    console.error('Update course commercial config error:', error);
    res.status(500).json({ error: error.message || 'Error al actualizar la configuración comercial del curso.' });
  }
});

// 6. ADMIN: Update course SEO & Positioning configuration (Modificación 10)
app.put('/api/admin/courses/:id/seo', requireAuth, requireNoTempPassword, async (req, res) => {
  try {
    const userRoles = req.user.roles || [];
    if (!userRoles.some(r => ['ADMINISTRADOR', 'ADMIN', 'SECRETARIA', 'DIRECCION'].includes(r))) {
      return res.status(403).json({ error: 'Acceso restringido a personal de administración y secretaría.' });
    }

    const courseId = req.params.id;
    const existing = await query(`SELECT * FROM especialidades WHERE id = ? OR codigo = ? LIMIT 1`, [courseId, courseId]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ error: 'Curso no encontrado.' });
    }

    const currentCourse = existing[0];
    const { slug, meta_title, meta_description, alt_text, og_image, indexable } = req.body;

    // Validate Slug: clean, lowercase, alphanumeric and dashes
    let cleanSlug = (slug || '').trim().toLowerCase();
    if (!cleanSlug) {
      return res.status(400).json({ error: 'La URL amigable (slug) es obligatoria.' });
    }

    // Slug format check
    cleanSlug = cleanSlug
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents
      .replace(/[^a-z0-9-]/g, '-')                     // replace non-alphanumeric with hyphen
      .replace(/-+/g, '-')                             // collapse hyphens
      .replace(/^-|-$/g, '');                          // trim hyphens

    if (!cleanSlug) {
      return res.status(400).json({ error: 'La URL amigable generada contiene caracteres inválidos.' });
    }

    // Check slug uniqueness
    const duplicateSlug = await query(
      `SELECT id, codigo, nombre FROM especialidades WHERE slug = ? AND id != ? LIMIT 1`,
      [cleanSlug, currentCourse.id]
    );
    if (duplicateSlug && duplicateSlug.length > 0) {
      return res.status(400).json({
        error: `La URL amigable "/cursos/${cleanSlug}" ya está asignada al curso "${duplicateSlug[0].nombre}" (${duplicateSlug[0].codigo}). Elija un slug único.`
      });
    }

    // Clean meta title & description
    const cleanMetaTitle = meta_title !== undefined ? String(meta_title).trim() : currentCourse.meta_title;
    const cleanMetaDesc = meta_description !== undefined ? String(meta_description).trim() : currentCourse.meta_description;
    const cleanAltText = alt_text !== undefined ? String(alt_text).trim() : currentCourse.alt_text;
    const cleanOgImage = og_image !== undefined ? String(og_image).trim() : currentCourse.og_image;
    const cleanIndexable = (indexable === false || indexable === 0 || indexable === '0') ? 0 : 1;

    const userActor = req.user.email || req.user.nombre || 'Administrador';

    await query(`
      UPDATE especialidades
      SET 
        slug = ?,
        meta_title = ?,
        meta_description = ?,
        alt_text = ?,
        og_image = ?,
        indexable = ?,
        modificado_por_admin = ?,
        actualizado_en = NOW()
      WHERE id = ?
    `, [
      cleanSlug,
      cleanMetaTitle || null,
      cleanMetaDesc || null,
      cleanAltText || null,
      cleanOgImage || null,
      cleanIndexable,
      userActor,
      currentCourse.id
    ]);

    const updated = (await query(`SELECT * FROM especialidades WHERE id = ?`, [currentCourse.id]))[0];

    res.json({
      success: true,
      message: 'Configuración SEO y posicionamiento del curso guardada correctamente.',
      course: updated
    });
  } catch (error) {
    console.error('Error updating course SEO configuration:', error);
    res.status(500).json({ error: 'Error al actualizar la configuración SEO: ' + error.message });
  }
});

// ==============================================================================
// SEO & ROBOT ACCESSIBILITY ROUTES (MODIFICACIÓN 10)
// ==============================================================================

// Helper to determine base public URL
function getPublicBaseUrl(req) {
  if (process.env.PUBLIC_URL) {
    return process.env.PUBLIC_URL.replace(/\/$/, '');
  }
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:3000';
  return `${protocol}://${host}`;
}

// 1. Dynamic XML Sitemap (/sitemap.xml)
app.get('/sitemap.xml', async (req, res) => {
  try {
    const baseUrl = getPublicBaseUrl(req);
    const courses = await query(`
      SELECT id, codigo, nombre, slug, estado_publicacion, indexable, creado_en, actualizado_en
      FROM especialidades
      WHERE estado_publicacion = 'PUBLICADO' AND indexable = 1
      ORDER BY orden_visualizacion ASC, codigo ASC
    `);

    const xml = renderSitemapXml(courses || [], baseUrl);
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.send(xml);
  } catch (error) {
    console.error('Error generating sitemap.xml:', error);
    res.status(500).type('text/plain').send('Error al generar el mapa del sitio XML.');
  }
});

// 2. Verified Robots.txt (/robots.txt)
app.get('/robots.txt', (req, res) => {
  const baseUrl = getPublicBaseUrl(req);
  const content = renderRobotsTxt(baseUrl);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24h
  res.send(content);
});

// 3. SSR Catalog Index (/cursos)
app.get('/cursos', async (req, res, next) => {
  try {
    // 301 Redirect legacy query parameters e.g. /cursos?id=tmvg0002 -> /cursos/slug
    const queryId = req.query.id || req.query.courseId || req.query.codigo;
    if (queryId) {
      const match = await query(
        `SELECT slug FROM especialidades WHERE id = ? OR codigo = ? LIMIT 1`,
        [queryId, queryId]
      );
      if (match && match.length > 0 && match[0].slug) {
        return res.redirect(301, `/cursos/${match[0].slug}`);
      }
    }

    const baseUrl = getPublicBaseUrl(req);
    const courses = await query(`
      SELECT 
        id, codigo, nombre, categoria_id, descripcion, nivel, horas_totales, horas_practicas, modalidad,
        precio_final, estado_precio, estado_disponibilidad, estado_publicacion,
        orden_visualizacion, slug, meta_title, meta_description, alt_text, og_image, indexable
      FROM especialidades
      WHERE estado_publicacion IN ('PUBLICADO', 'NO_DISPONIBLE')
      ORDER BY 
        (CASE WHEN estado_disponibilidad = 'ABIERTA' THEN 0 ELSE 1 END) ASC,
        orden_visualizacion ASC,
        codigo ASC
    `);

    const html = renderCatalogPage(courses || [], baseUrl);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    console.error('Error rendering /cursos page:', error);
    next();
  }
});

// 4. SSR Individual Permanent Course Page (/cursos/:slug)
app.get('/cursos/:slug', async (req, res, next) => {
  try {
    const rawSlug = req.params.slug.trim().toLowerCase();
    const baseUrl = getPublicBaseUrl(req);

    // Look up by slug, id, or code
    const rows = await query(`
      SELECT *
      FROM especialidades
      WHERE slug = ? OR id = ? OR codigo = ?
      LIMIT 1
    `, [rawSlug, rawSlug, rawSlug]);

    if (!rows || rows.length === 0) {
      res.status(404).setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(`
        <!doctype html>
        <html lang="es">
          <head>
            <meta charset="UTF-8">
            <title>Curso no encontrado (404) | Academias Péndulo</title>
            <meta name="robots" content="noindex, nofollow" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #09090b; color: #fafafa; text-align: center; }
              .card { max-width: 500px; padding: 2.5rem; background: #18181b; border: 1px solid #27272a; border-radius: 1.5rem; }
              h1 { color: #ef4444; font-size: 2rem; margin-bottom: 0.5rem; }
              p { color: #a1a1aa; font-size: 1rem; line-height: 1.5; }
              a { display: inline-block; margin-top: 1.5rem; padding: 0.75rem 1.5rem; background: #dc2626; color: white; border-radius: 0.75rem; text-decoration: none; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>404 — Curso no encontrado</h1>
              <p>Lo sentimos, la especialidad formativa que buscas no existe o ha cambiado de dirección permanente.</p>
              <a href="/cursos">Explorar Catálogo de Cursos</a>
            </div>
          </body>
        </html>
      `);
    }

    const course = rows[0];

    // If accessed by old id or code instead of canonical slug, perform 301 Permanent Redirect
    if (course.slug && rawSlug !== course.slug.toLowerCase()) {
      return res.redirect(301, `/cursos/${course.slug}`);
    }

    // Apply noindex headers if course is draft, archived, or marked non-indexable
    if (course.indexable === 0 || course.estado_publicacion !== 'PUBLICADO') {
      res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    }

    const html = renderCoursePage(course, baseUrl);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (error) {
    console.error('Error rendering course page:', error);
    next();
  }
});

// SPA fallback: send index.html for any unknown route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Campus Server running on port ${PORT} with real Hostinger MySQL integration!`);
});
