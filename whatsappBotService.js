import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import pino from 'pino';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { query } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AUTH_DIR = path.join(__dirname, '.whatsapp_auth');

export const DEFAULT_AUTOREPLY_TEMPLATE = `¡Hola! Gracias por contactar con *Academias Péndulo* (Centro Oficial Homologado Nº 0400030892 en Almería).

Hemos recibido tu solicitud de información sobre el curso:
*{{nombre_curso}}* (Código: {{codigo_curso}})
• *Duración:* {{horas_curso}}
• *Modalidad:* {{modalidad_curso}}
• *Precio:* {{precio_curso}}
• *Estado de matrícula:* {{estado_matricula}}

• *Ficha completa y temario:* {{enlace_curso}}

Un asesor de Secretaría revisará tu consulta y te responderá personalmente en breve para indicarte las próximas fechas e iniciar tu inscripción si lo deseas.
Horario de atención: Lunes a Viernes de 09:00 a 14:00 y de 16:00 a 20:00.`;

let sock = null;
let botStatus = 'DISCONNECTED'; // 'DISCONNECTED' | 'CONNECTING' | 'QR_READY' | 'CONNECTED'
let currentQrDataUrl = null;
let connectedPhone = null;
let connectedName = null;
let lastError = null;
let lastAutoReply = null;
let reconnectTimer = null;

// Track message IDs sent by our auto-responder so we never reply to our own auto-replies
const sentBotMessageIds = new Set();
// Cooldown map: `${jid}:${courseId}` -> timestamp
const replyCooldownMap = new Map();

function normalizeForMatch(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toTitleCaseSpanish(rawTitle) {
  const trimmed = String(rawTitle || '').trim();
  if (!trimmed) return '';
  if (trimmed !== trimmed.toUpperCase()) return trimmed;
  const lowerWords = new Set(['a', 'al', 'con', 'de', 'del', 'e', 'el', 'en', 'la', 'las', 'lo', 'los', 'o', 'para', 'por', 'sin', 'sobre', 'u', 'y']);
  const acronyms = new Set(['ADAS', 'ITV', 'PRL', 'VMP', 'OBD', 'HEV', 'PHEV', 'BEV', 'CAN', 'ABS', 'ESP', 'BMS', '2T', '4T', '3D']);
  return trimmed
    .split(/\s+/)
    .map((w, idx) => {
      const clean = w.replace(/[^A-ZÁÉÍÓÚÜÑ0-9]/gi, '').toUpperCase();
      if (acronyms.has(clean)) return w.toUpperCase();
      const low = w.toLocaleLowerCase('es-ES');
      if (idx > 0 && lowerWords.has(low)) return low;
      return low.charAt(0).toLocaleUpperCase('es-ES') + low.slice(1);
    })
    .join(' ');
}

export async function matchCourseFromText(incomingText) {
  const courses = await query(`SELECT * FROM especialidades WHERE estado = 'ACTIVA'`);
  if (!courses || courses.length === 0) return null;

  const normIncoming = normalizeForMatch(incomingText);
  if (!normIncoming) return null;

  // 1. Try extracting from "curso de <X> de academias pendulo"
  const regex = /curso de\s+(.+?)\s+de academias pendulo/i;
  const match = incomingText.match(regex);
  if (match && match[1]) {
    const extracted = normalizeForMatch(match[1]);
    for (const c of courses) {
      const normName = normalizeForMatch(c.nombre);
      if (normName === extracted || normName.includes(extracted) || extracted.includes(normName)) {
        return c;
      }
    }
  }

  // 2. Match by full course name or official code inside the text
  // Sort by name length descending so more specific course names match first
  const sorted = [...courses].sort((a, b) => (b.nombre?.length || 0) - (a.nombre?.length || 0));
  for (const c of sorted) {
    const normName = normalizeForMatch(c.nombre);
    const normCode = normalizeForMatch(c.codigo);
    if (normName && normName.length > 5 && normIncoming.includes(normName)) {
      return c;
    }
    if (normCode && normCode.length >= 4 && new RegExp(`\\b${normCode}\\b`, 'i').test(normIncoming)) {
      return c;
    }
  }

  return null;
}

export function buildAutoReplyText(course, customTemplate) {
  const template =
    customTemplate && String(customTemplate).trim().length > 0
      ? String(customTemplate).trim()
      : DEFAULT_AUTOREPLY_TEMPLATE;

  if (!course) {
    return `¡Hola! Gracias por contactar con *Academias Péndulo* (Centro Oficial Homologado Nº 0400030892 en Almería).\n\nHemos recibido tu consulta. Puedes consultar nuestras 33 especialidades oficiales de Automoción, Vehículo Eléctrico, Diagnosis y PRL en:\nhttps://academiaspendulo.com/#especialidades\n\nUn asesor de Secretaría te responderá personalmente en breve.\nHorario: Lunes a Viernes de 09:00 a 14:00 y de 16:00 a 20:00.`;
  }

  const nombreCurso = toTitleCaseSpanish(course.nombre || course.title || 'Especialidad Técnica');
  const codigoCurso = course.codigo || course.code || 'TMVG';
  const horasCurso =
    course.horas_totales && Number(course.horas_totales) > 0
      ? `${course.horas_totales} horas`
      : 'Consultar duración por convocatoria';
  const modalidadCurso = course.modalidad || 'Presencial en Almería (Carrera Doctoral 26)';

  let precioCurso = 'Consultar condiciones / Subvencionable';
  if (course.estado_precio === 'CONFIGURADO' && course.precio_final && Number(course.precio_final) > 0) {
    const formattedPrice = Number(course.precio_final).toFixed(2).replace('.', ',');
    const ivaLabel = course.tipo_iva === 'EXENTO' ? 'Exento de IVA' : 'IVA incluido';
    precioCurso = `${formattedPrice} € (${ivaLabel})`;
  }

  const estadoMatricula =
    course.estado_disponibilidad === 'ABIERTA'
      ? 'Matrícula Abierta (Plazas disponibles)'
      : 'Próxima convocatoria — Lista de reserva prioritaria abierta';

  const slug = course.slug || String(course.id || codigoCurso).toLowerCase();
  const enlaceCurso = `https://academiaspendulo.com/cursos/${slug}`;

  return template
    .replace(/\{\{\s*nombre_curso\s*\}\}/gi, nombreCurso)
    .replace(/\{\{\s*codigo_curso\s*\}\}/gi, codigoCurso)
    .replace(/\{\{\s*horas_curso\s*\}\}/gi, horasCurso)
    .replace(/\{\{\s*modalidad_curso\s*\}\}/gi, modalidadCurso)
    .replace(/\{\{\s*precio_curso\s*\}\}/gi, precioCurso)
    .replace(/\{\{\s*estado_matricula\s*\}\}/gi, estadoMatricula)
    .replace(/\{\{\s*enlace_curso\s*\}\}/gi, enlaceCurso);
}

function extractMessageText(msg) {
  if (!msg || !msg.message) return '';
  return (
    msg.message.conversation ||
    msg.message.extendedTextMessage?.text ||
    msg.message.imageMessage?.caption ||
    msg.message.videoMessage?.caption ||
    ''
  ).trim();
}

async function handleIncomingMessage(msg) {
  try {
    if (!msg || !msg.key || !msg.message) return;
    const msgId = msg.key.id;
    if (sentBotMessageIds.has(msgId)) return;

    const remoteJid = msg.key.remoteJid || '';
    if (!remoteJid || remoteJid.endsWith('@g.us') || remoteJid === 'status@broadcast') {
      return; // Ignore groups and status broadcasts
    }

    const text = extractMessageText(msg);
    if (!text) return;

    // Never reply to an auto-reply message itself
    if (
      text.includes('Gracias por contactar con *Academias Péndulo*') ||
      text.includes('Centro Oficial Homologado Nº 0400030892') ||
      text.includes('Ficha completa y temario:')
    ) {
      return;
    }

    // Check if auto-responder is active in DB
    const cfgRows = await query(`SELECT * FROM configuracion_bancaria WHERE id = 1 LIMIT 1`);
    const cfg = cfgRows && cfgRows[0] ? cfgRows[0] : {};
    const autoReplyActive =
      cfg.whatsapp_autorespuesta_activa !== undefined && cfg.whatsapp_autorespuesta_activa !== null
        ? Boolean(Number(cfg.whatsapp_autorespuesta_activa))
        : true;

    if (!autoReplyActive) return;

    // Determine if this is a course inquiry
    const matchedCourse = await matchCourseFromText(text);
    const isStandardInquiryPhrase = /estoy interesado\/a en el curso de|informaci[oó]n sobre el curso|solicito informaci[oó]n/i.test(text);

    // If the message is fromMe, ONLY reply if the user is testing by sending a course inquiry to their own connected number!
    if (msg.key.fromMe) {
      if (!isStandardInquiryPhrase && !matchedCourse) {
        return;
      }
    } else {
      // From another student: reply if it matches a course or is a course inquiry
      if (!matchedCourse && !isStandardInquiryPhrase) {
        return;
      }
    }

    // Cooldown check (5 minutes per JID + course so we don't spam normal conversation, except self-test which has 5s cooldown)
    const courseKey = matchedCourse ? matchedCourse.id : 'general';
    const cooldownKey = `${remoteJid}:${courseKey}`;
    const lastSentAt = replyCooldownMap.get(cooldownKey) || 0;
    const cooldownMs = msg.key.fromMe ? 5000 : 5 * 60 * 1000;
    if (Date.now() - lastSentAt < cooldownMs) {
      return;
    }

    const replyText = buildAutoReplyText(matchedCourse, cfg.whatsapp_plantilla_respuesta);
    replyCooldownMap.set(cooldownKey, Date.now());

    // Wait 1.5s so the automatic reply feels natural right after the student's message
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (sock && botStatus === 'CONNECTED') {
      const sent = await sock.sendMessage(remoteJid, { text: replyText });
      if (sent?.key?.id) {
        sentBotMessageIds.add(sent.key.id);
      }
      lastAutoReply = {
        to: remoteJid.replace(/@.*$/, ''),
        courseName: matchedCourse ? toTitleCaseSpanish(matchedCourse.nombre) : 'Consulta General',
        timestamp: new Date().toISOString()
      };
      console.log(`[WHATSAPP AUTO-REPLY] Sent automatic course info (${lastAutoReply.courseName}) to ${lastAutoReply.to}`);
    }
  } catch (err) {
    console.error('[WHATSAPP AUTO-REPLY ERROR]:', err);
  }
}

export async function startWhatsappBot() {
  if (botStatus === 'CONNECTING' || botStatus === 'CONNECTED') {
    return getWhatsappBotState();
  }

  try {
    botStatus = 'CONNECTING';
    lastError = null;

    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    let version = [2, 3000, 1015901307];
    try {
      const latest = await fetchLatestBaileysVersion();
      if (latest && latest.version) version = latest.version;
    } catch {
      // Fallback version if offline check fails
    }

    sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }),
      browser: ['Academias Pendulo CRM', 'Chrome', '1.0.0'],
      syncFullHistory: false,
      markOnlineOnConnect: false
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          currentQrDataUrl = await QRCode.toDataURL(qr, { width: 320, margin: 2 });
          botStatus = 'QR_READY';
          try {
            await QRCode.toFile(
              'C:/Users/guill/.gemini/antigravity/brain/2362d680-4ed4-4e8c-a0a1-0aad2589e140/whatsapp_qr_vinculacion.png',
              qr,
              { width: 360, margin: 2 }
            );
          } catch {}
        } catch (qrErr) {
          console.error('[WHATSAPP BOT] QR generation error:', qrErr);
        }
      }

      if (connection === 'open') {
        botStatus = 'CONNECTED';
        currentQrDataUrl = null;
        lastError = null;
        const rawId = sock?.user?.id || '';
        connectedPhone = rawId.split(':')[0].split('@')[0] || null;
        connectedName = sock?.user?.name || 'Academias Péndulo WhatsApp';
        console.log(`[WHATSAPP BOT] Connected as +${connectedPhone} (${connectedName})`);
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        currentQrDataUrl = null;

        if (!shouldReconnect) {
          // Logged out from phone -> clear session files
          botStatus = 'DISCONNECTED';
          connectedPhone = null;
          connectedName = null;
          try {
            fs.rmSync(AUTH_DIR, { recursive: true, force: true });
          } catch {}
        } else {
          botStatus = 'DISCONNECTED';
          if (reconnectTimer) clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(() => {
            startWhatsappBot().catch(() => {});
          }, 4000);
        }
      }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;
      for (const msg of messages) {
        await handleIncomingMessage(msg);
      }
    });
  } catch (err) {
    botStatus = 'DISCONNECTED';
    lastError = err.message || 'Error al iniciar el servicio de WhatsApp.';
    console.error('[WHATSAPP BOT START ERROR]:', err);
  }

  return getWhatsappBotState();
}

export async function disconnectWhatsappBot() {
  try {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (sock) {
      try {
        await sock.logout();
      } catch {}
      try {
        sock.end();
      } catch {}
      sock = null;
    }
    if (fs.existsSync(AUTH_DIR)) {
      fs.rmSync(AUTH_DIR, { recursive: true, force: true });
    }
  } catch (err) {
    console.warn('[WHATSAPP BOT DISCONNECT WARN]:', err.message);
  } finally {
    botStatus = 'DISCONNECTED';
    currentQrDataUrl = null;
    connectedPhone = null;
    connectedName = null;
  }
  return getWhatsappBotState();
}

export async function sendTestAutoReplyMessage(targetDigits, courseTitleOrCode) {
  if (!sock || botStatus !== 'CONNECTED') {
    throw new Error('El bot de WhatsApp no está vinculado todavía. Escanea primero el código QR desde el panel.');
  }
  const cleanDigits = String(targetDigits || connectedPhone || '').replace(/\D+/g, '');
  if (!cleanDigits) {
    throw new Error('Indica un número de destino válido.');
  }
  const jid = `${cleanDigits}@s.whatsapp.net`;
  const course = await matchCourseFromText(courseTitleOrCode || 'Introducción a la Automoción');
  const cfgRows = await query(`SELECT * FROM configuracion_bancaria WHERE id = 1 LIMIT 1`);
  const cfg = cfgRows && cfgRows[0] ? cfgRows[0] : {};
  const replyText = buildAutoReplyText(course, cfg.whatsapp_plantilla_respuesta);

  const sent = await sock.sendMessage(jid, { text: replyText });
  if (sent?.key?.id) {
    sentBotMessageIds.add(sent.key.id);
  }
  lastAutoReply = {
    to: cleanDigits,
    courseName: course ? toTitleCaseSpanish(course.nombre) : 'Introducción a la Automoción',
    timestamp: new Date().toISOString()
  };
  return {
    success: true,
    to: cleanDigits,
    courseName: lastAutoReply.courseName,
    messageSent: replyText
  };
}

export function getWhatsappBotState() {
  return {
    status: botStatus,
    qrDataUrl: currentQrDataUrl,
    connectedPhone,
    connectedName,
    lastError,
    lastAutoReply
  };
}

// Start bot automatically so QR or existing session is ready immediately
startWhatsappBot().catch(() => {});
