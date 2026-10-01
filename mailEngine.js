import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { ImapFlow } from 'imapflow';
import nodemailer from 'nodemailer';
import { simpleParser } from 'mailparser';
import sanitizeHtml from 'sanitize-html';
import pool from './db.js';
const db = pool;
import { encryptPayload, decryptPayload } from './authUtils.js';

// In-memory set to lock mailbox sync processes per cuenta_id
const activeSyncLocks = new Set();
let isOutboxProcessing = false;

/**
 * Sanitize HTML content of incoming emails
 * - Blocks script tags, style tags with script vectors, forms, inputs
 * - Blocks remote images by default (replaces src with placeholder or removes)
 * - Removes inline on* handlers (onclick, onload, etc.)
 */
export function sanitizeEmailHtml(rawHtml) {
  if (!rawHtml || typeof rawHtml !== 'string') return '';

  return sanitizeHtml(rawHtml, {
    allowedTags: [
      'p', 'b', 'i', 'strong', 'em', 'u', 's', 'a', 'br', 'hr',
      'span', 'div', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'table', 'thead', 'tbody', 'tr', 'td', 'th', 'blockquote', 'pre', 'code',
      'img'
    ],
    allowedAttributes: {
      'a': ['href', 'title', 'target', 'rel'],
      'img': ['src', 'alt', 'width', 'height', 'title', 'data-blocked-src'],
      '*': ['style', 'class']
    },
    transformTags: {
      'a': (tagName, attribs) => {
        // Enforce safe target and rel
        return {
          tagName: 'a',
          attribs: {
            ...attribs,
            target: '_blank',
            rel: 'noopener noreferrer'
          }
        };
      },
      'img': (tagName, attribs) => {
        const src = attribs.src || '';
        // Allow inline data URIs for embedded images, block external http/https tracking pixels by default
        if (src.startsWith('data:image/')) {
          return { tagName: 'img', attribs };
        }
        return {
          tagName: 'img',
          attribs: {
            ...attribs,
            'src': '',
            'data-blocked-src': src,
            'alt': attribs.alt ? `${attribs.alt} [Imagen remota bloqueada por seguridad]` : '[Imagen remota bloqueada por seguridad]'
          }
        };
      }
    },
    allowedSchemes: ['http', 'https', 'mailto', 'data'],
    allowProtocolRelative: false,
    disallowedTagsMode: 'discard'
  });
}

/**
 * Encrypt account credentials (password / tokens)
 */
export function encryptAccountSecret(secretStr) {
  return JSON.stringify(encryptPayload({ secret: secretStr }));
}

/**
 * Decrypt account credentials
 */
export function decryptAccountSecret(secretoRefStr) {
  try {
    const encryptedObj = JSON.parse(secretoRefStr);
    const decryptedObj = decryptPayload(encryptedObj);
    return decryptedObj.secret;
  } catch (err) {
    throw new Error('No se pudo desencriptar las credenciales del buzón de correo');
  }
}

/**
 * Group email into existing thread or create a new one
 */
async function resolveOrCreateThread(connection, cuentaId, messageId, inReplyTo, referencesHeader, subject) {
  // 1. Search existing correos in this cuenta_id matching in_reply_to or references
  let targetThreadId = null;

  const candidateMessageIds = [];
  if (inReplyTo) candidateMessageIds.push(inReplyTo.trim());
  if (referencesHeader) {
    const refs = referencesHeader.split(/\s+/).map(r => r.trim()).filter(Boolean);
    candidateMessageIds.push(...refs);
  }

  if (candidateMessageIds.length > 0) {
    const [rows] = await connection.query(
      `SELECT hilo_id FROM correos 
       WHERE cuenta_id = ? AND message_id IN (?) AND hilo_id IS NOT NULL 
       LIMIT 1`,
      [cuentaId, candidateMessageIds]
    );

    if (rows.length > 0 && rows[0].hilo_id) {
      targetThreadId = rows[0].hilo_id;
    }
  }

  // 2. If no thread found by message ID, check if subject matches "Re: ..." in recent threads of SAME mailbox
  if (!targetThreadId && subject) {
    const cleanSubject = subject.replace(/^(Re|Fwd|RV|RES):\s*/i, '').trim();
    if (cleanSubject.length > 3) {
      const [rows] = await connection.query(
        `SELECT id FROM hilos_correo 
         WHERE cuenta_id = ? AND (asunto_hilo = ? OR asunto_hilo = ?) 
         ORDER BY actualizado_en DESC LIMIT 1`,
        [cuentaId, cleanSubject, `Re: ${cleanSubject}`]
      );
      if (rows.length > 0) {
        targetThreadId = rows[0].id;
      }
    }
  }

  // 3. If still no thread found, create a new thread
  if (!targetThreadId) {
    targetThreadId = `th_${crypto.randomUUID()}`;
    const cleanSubject = subject ? subject.trim() : 'Sin Asunto';
    await connection.query(
      `INSERT INTO hilos_correo (id, cuenta_id, asunto_hilo, creado_en, actualizado_en)
       VALUES (?, ?, ?, NOW(), NOW())`,
      [targetThreadId, cuentaId, cleanSubject]
    );
  } else {
    // Touch updated timestamp on existing thread
    await connection.query(
      `UPDATE hilos_correo SET actualizado_en = NOW() WHERE id = ?`,
      [targetThreadId]
    );
  }

  return targetThreadId;
}

/**
 * Save attachment file securely to disk and DB
 */
async function saveEmailAttachment(connection, correoId, attachment, autorId = null) {
  const uploadDir = path.join(process.cwd(), 'uploads', 'private');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const fileExt = path.extname(attachment.filename || 'adjunto.bin');
  const uniqueFilename = `${crypto.randomUUID()}${fileExt}`;
  const filePath = path.join(uploadDir, uniqueFilename);

  fs.writeFileSync(filePath, attachment.content);

  // Get admin user ID if autorId not provided
  let uId = autorId;
  if (!uId) {
    const [admins] = await connection.query(`SELECT id FROM usuarios WHERE estado = 'ACTIVO' LIMIT 1`);
    if (admins.length > 0) uId = admins[0].id;
  }

  const archivoId = `arc_${crypto.randomUUID()}`;
  await connection.query(
    `INSERT INTO archivos (id, clave_almacenamiento, nombre_original, mime_type, tamano_bytes, autor_id, creado_en)
     VALUES (?, ?, ?, ?, ?, ?, NOW())`,
    [
      archivoId,
      uniqueFilename,
      attachment.filename || 'adjunto_sin_nombre',
      attachment.contentType || 'application/octet-stream',
      attachment.size || attachment.content.length,
      uId
    ]
  );

  await connection.query(
    `INSERT INTO correo_archivos (correo_id, archivo_id) VALUES (?, ?)`,
    [correoId, archivoId]
  );

  return archivoId;
}

/**
 * Synchronize a single mailbox account via IMAP
 */
export async function syncMailbox(cuentaId) {
  if (activeSyncLocks.has(cuentaId)) {
    return { status: 'LOCKED', message: 'Sincronización ya en curso para este buzón.' };
  }

  activeSyncLocks.add(cuentaId);
  const connection = await db.getConnection();

  try {
    // Get account details
    const [accounts] = await connection.query(
      `SELECT * FROM cuentas_correo WHERE id = ? AND estado != 'INACTIVA'`,
      [cuentaId]
    );

    if (accounts.length === 0) {
      return { status: 'ERROR', message: 'Cuenta de correo no encontrada o inactiva.' };
    }

    const account = accounts[0];
    const config = typeof account.configuracion === 'string'
      ? JSON.parse(account.configuracion)
      : (account.configuracion || {});

    const imapHost = config.imap_host || 'mail.hostinger.com';
    const imapPort = parseInt(config.imap_port || '993', 10);
    const imapTls = config.imap_tls !== false;
    const buzonEmail = account.buzon;
    const password = decryptAccountSecret(account.secreto_ref);

    const maxMsgSize = (config.max_msg_size_mb || 25) * 1024 * 1024;
    const maxAttachmentSize = (config.max_attachment_size_mb || 15) * 1024 * 1024;

    // Fetch stored checkpoint
    const [syncRows] = await connection.query(
      `SELECT * FROM sincronizacion_correo WHERE cuenta_id = ? AND carpeta = 'INBOX'`,
      [cuentaId]
    );

    let storedUidValidity = syncRows.length > 0 ? syncRows[0].uidvalidity : 0;
    let lastUid = syncRows.length > 0 ? syncRows[0].last_uid : 0;

    // Connect to IMAP server using ImapFlow with TLS validation
    const client = new ImapFlow({
      host: imapHost,
      port: imapPort,
      secure: imapTls,
      auth: {
        user: buzonEmail,
        pass: password
      },
      tls: {
        rejectUnauthorized: true
      },
      logger: false
    });

    await client.connect();
    const lock = await client.getMailboxLock('INBOX');

    let importedCount = 0;

    try {
      const mailboxStatus = client.mailbox;
      const currentUidValidity = mailboxStatus.uidValidity || 0;

      // Handle UIDVALIDITY change
      if (storedUidValidity > 0 && storedUidValidity !== currentUidValidity) {
        // UIDVALIDITY changed: reset cursor, but deduplication logic will prevent importing twice
        lastUid = 0;
        storedUidValidity = currentUidValidity;
      } else if (storedUidValidity === 0) {
        storedUidValidity = currentUidValidity;
      }

      // Fetch messages newer than lastUid
      const searchCriteria = lastUid > 0 ? `${lastUid + 1}:*` : '1:*';
      
      const fetchRange = mailboxStatus.exists > 0 ? searchCriteria : null;

      if (fetchRange) {
        for await (const message of client.fetch(fetchRange, { uid: true, source: true, flags: true, bodyStructure: true, envelope: true })) {
          if (message.uid <= lastUid) continue;

          // Enforce message size limit
          if (message.size && message.size > maxMsgSize) {
            lastUid = Math.max(lastUid, message.uid);
            continue;
          }

          // Parse raw message MIME source
          const parsed = await simpleParser(message.source);

          const messageId = parsed.messageId || `<${message.uid}.${currentUidValidity}@${buzonEmail}>`;
          const inReplyTo = parsed.inReplyTo || null;
          const referencesHeader = Array.isArray(parsed.references) ? parsed.references.join(' ') : (parsed.references || null);
          const fromEmail = parsed.from && parsed.from.value && parsed.from.value[0] ? parsed.from.value[0].address : 'desconocido@pendulo.com';
          const fromName = parsed.from && parsed.from.value && parsed.from.value[0] ? (parsed.from.value[0].name || fromEmail) : fromEmail;
          const recipientsList = parsed.to ? (Array.isArray(parsed.to) ? parsed.to.map(t => t.text) : [parsed.to.text]) : [buzonEmail];
          const subject = parsed.subject || 'Sin Asunto';
          const bodyText = parsed.text || '';
          const bodyHtml = sanitizeEmailHtml(parsed.html || (bodyText ? `<p>${bodyText.replace(/\n/g, '<br>')}</p>` : ''));
          const fechaCorreo = parsed.date ? new Date(parsed.date) : new Date();

          // Apply sync_start_date filter if configured
          if (config.sync_start_date) {
            const startDate = new Date(config.sync_start_date);
            if (fechaCorreo < startDate) {
              lastUid = Math.max(lastUid, message.uid);
              continue;
            }
          }

          // Deduplication Check in DB (by account_id and message_id OR provider_id)
          const providerId = `imap_${currentUidValidity}_${message.uid}`;
          const [existing] = await connection.query(
            `SELECT id FROM correos 
             WHERE cuenta_id = ? AND (provider_id = ? OR message_id = ?) 
             LIMIT 1`,
            [cuentaId, providerId, messageId]
          );

          if (existing.length === 0) {
            await connection.beginTransaction();

            try {
              // Group into thread
              const hiloId = await resolveOrCreateThread(connection, cuentaId, messageId, inReplyTo, referencesHeader, subject);
              const correoId = `msg_${crypto.randomUUID()}`;

              await connection.query(
                `INSERT INTO correos 
                 (id, cuenta_id, hilo_id, provider_id, message_id, in_reply_to, references_header, remitente, destinatarios, asunto, cuerpo_texto, cuerpo_html, fecha_correo, direccion, creado_en)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'INBOUND', NOW())`,
                [
                  correoId,
                  cuentaId,
                  hiloId,
                  providerId,
                  messageId,
                  inReplyTo,
                  referencesHeader,
                  `${fromName} <${fromEmail}>`,
                  JSON.stringify(recipientsList),
                  subject,
                  bodyText,
                  bodyHtml,
                  fechaCorreo
                ]
              );

              // Process Attachments securely
              if (parsed.attachments && parsed.attachments.length > 0) {
                for (const att of parsed.attachments) {
                  if (att.size && att.size > maxAttachmentSize) continue;
                  await saveEmailAttachment(connection, correoId, att);
                }
              }

              await connection.commit();
              importedCount++;
            } catch (err) {
              await connection.rollback();
              throw err;
            }
          }

          lastUid = Math.max(lastUid, message.uid);
        }
      }

      // Checkpoint successful sync state
      await connection.query(
        `INSERT INTO sincronizacion_correo (cuenta_id, carpeta, uidvalidity, uid_next, last_uid, fecha_sincronizacion, ultimo_error)
         VALUES (?, 'INBOX', ?, ?, ?, NOW(), NULL)
         ON DUPLICATE KEY UPDATE 
           uidvalidity = VALUES(uidvalidity),
           last_uid = VALUES(last_uid),
           fecha_sincronizacion = NOW(),
           ultimo_error = NULL`,
        [cuentaId, currentUidValidity, lastUid + 1, lastUid]
      );

      // Update account status to ACTIVA
      await connection.query(
        `UPDATE cuentas_correo SET estado = 'ACTIVA' WHERE id = ?`,
        [cuentaId]
      );

    } finally {
      lock.release();
      await client.logout();
    }

    return {
      status: 'OK',
      importedCount,
      lastSync: new Date().toISOString()
    };

  } catch (err) {
    const sanitizedError = err.message ? err.message.replace(/(pass|password|auth|secret)=[^&\s]+/gi, '$1=***') : 'Error de conexión IMAP';

    await connection.query(
      `INSERT INTO sincronizacion_correo (cuenta_id, carpeta, uidvalidity, uid_next, last_uid, fecha_sincronizacion, ultimo_error)
       VALUES (?, 'INBOX', 0, 1, 0, NOW(), ?)
       ON DUPLICATE KEY UPDATE 
         fecha_sincronizacion = NOW(),
         ultimo_error = VALUES(ultimo_error)`,
      [cuentaId, sanitizedError]
    );

    await connection.query(
      `UPDATE cuentas_correo SET estado = 'ERROR' WHERE id = ?`,
      [cuentaId]
    );

    return {
      status: 'ERROR',
      message: sanitizedError
    };
  } finally {
    connection.release();
    activeSyncLocks.delete(cuentaId);
  }
}

/**
 * Queue an outbound email reply into cola_correos outbox
 */
export async function queueOutboundReply({ cuentaId, hiloId, remitenteId, destinatarios, asunto, cuerpoTexto, cuerpoHtml, inReplyTo, referencesHeader, attachments = [] }) {
  const connection = await db.getConnection();

  try {
    const [accounts] = await connection.query(
      `SELECT buzon FROM cuentas_correo WHERE id = ? AND estado != 'INACTIVA'`,
      [cuentaId]
    );

    if (accounts.length === 0) {
      throw new Error('Cuenta de correo remitente no configurada o inactiva.');
    }

    const fromBuzon = accounts[0].buzon;
    const messageId = `<reply.${Date.now()}.${crypto.randomBytes(4).toString('hex')}@${fromBuzon.split('@')[1] || 'pendulo.com'}>`;
    const sanitizedHtml = sanitizeEmailHtml(cuerpoHtml || `<p>${(cuerpoTexto || '').replace(/\n/g, '<br>')}</p>`);

    // Create local OUTBOUND correo record
    const correoId = `msg_${crypto.randomUUID()}`;
    await connection.query(
      `INSERT INTO correos 
       (id, cuenta_id, hilo_id, provider_id, message_id, in_reply_to, references_header, remitente, destinatarios, asunto, cuerpo_texto, cuerpo_html, fecha_correo, direccion, creado_en)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 'OUTBOUND', NOW())`,
      [
        correoId,
        cuentaId,
        hiloId,
        messageId,
        messageId,
        inReplyTo || null,
        referencesHeader || null,
        fromBuzon,
        JSON.stringify(destinatarios),
        asunto,
        cuerpoTexto,
        sanitizedHtml
      ]
    );

    // Save attachments if any
    for (const att of attachments) {
      await saveEmailAttachment(connection, correoId, att, remitenteId);
    }

    // Touch thread updated_at
    await connection.query(
      `UPDATE hilos_correo SET actualizado_en = NOW() WHERE id = ?`,
      [hiloId]
    );

    // Generate Idempotency Key
    const idempotencySeed = `${cuentaId}:${destinatarios.join(',')}:${asunto}:${messageId}`;
    const idempotencyKey = crypto.createHash('sha256').update(idempotencySeed).digest('hex');

    // Encrypt sensitive outbound mail payload
    const payload = {
      cuentaId,
      correoId,
      fromBuzon,
      destinatarios,
      asunto,
      cuerpoTexto,
      cuerpoHtml: sanitizedHtml,
      messageId,
      inReplyTo,
      referencesHeader
    };

    const encryptedPayload = encryptPayload(payload);

    // Insert into cola_correos
    const outboxId = `out_${crypto.randomUUID()}`;
    await connection.query(
      `INSERT INTO cola_correos 
       (id, tipo, destinatario, correo_id, contenido_ref, clave_idempotencia, estado, intentos, proxima_ejecucion, creado_en)
       VALUES (?, 'RESPUESTA_OFICIAL', ?, ?, ?, ?, 'PENDIENTE', 0, NOW(), NOW())`,
      [
        outboxId,
        destinatarios[0] || fromBuzon,
        correoId,
        JSON.stringify(encryptedPayload),
        idempotencyKey
      ]
    );

    // Audit log
    await connection.query(
      `INSERT INTO auditoria (actor_id, accion_administrativa, recurso, recurso_id, diff_cambios, creado_en)
       VALUES (?, 'ENVIAR_CORREO_OFICIAL', 'correos', ?, ?, NOW())`,
      [
        remitenteId,
        correoId,
        JSON.stringify({ destinatarios, asunto, hiloId })
      ]
    );

    return {
      status: 'QUEUED',
      outboxId,
      correoId,
      messageId
    };

  } finally {
    connection.release();
  }
}

/**
 * Worker: Process pending emails in cola_correos via SMTP
 */
export async function processOutboxQueue() {
  if (isOutboxProcessing) return;
  isOutboxProcessing = true;

  const connection = await db.getConnection();

  try {
    const [pendingItems] = await connection.query(
      `SELECT * FROM cola_correos 
       WHERE estado IN ('PENDIENTE', 'ERROR') 
         AND intentos < 5 
         AND proxima_ejecucion <= NOW() 
       ORDER BY creado_en ASC LIMIT 10`
    );

    for (const item of pendingItems) {
      let payload;
      try {
        const encryptedObj = typeof item.contenido_ref === 'string'
          ? JSON.parse(item.contenido_ref)
          : item.contenido_ref;
        payload = decryptPayload(encryptedObj);
      } catch (err) {
        await connection.query(
          `UPDATE cola_correos SET estado = 'ERROR', error_sanitizado = 'Error al desencriptar carga de correo' WHERE id = ?`,
          [item.id]
        );
        continue;
      }

      // Mark status as ENVIANDO
      await connection.query(
        `UPDATE cola_correos SET estado = 'ENVIANDO' WHERE id = ?`,
        [item.id]
      );

      // Fetch account SMTP settings
      const [accounts] = await connection.query(
        `SELECT * FROM cuentas_correo WHERE id = ?`,
        [payload.cuentaId]
      );

      if (accounts.length === 0) {
        await connection.query(
          `UPDATE cola_correos SET estado = 'ERROR', error_sanitizado = 'Cuenta de correo no existe' WHERE id = ?`,
          [item.id]
        );
        continue;
      }

      const account = accounts[0];
      const config = typeof account.configuracion === 'string'
        ? JSON.parse(account.configuracion)
        : (account.configuracion || {});

      const smtpHost = config.smtp_host || 'smtp.hostinger.com';
      const smtpPort = parseInt(config.smtp_port || '465', 10);
      const smtpTls = config.smtp_tls !== false;
      const password = decryptAccountSecret(account.secreto_ref);

      // Create SMTP Transporter with TLS certificate verification
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpTls,
        auth: {
          user: account.buzon,
          pass: password
        },
        tls: {
          rejectUnauthorized: true
        }
      });

      const mailOptions = {
        from: `Secretaría Academias Péndulo <${account.buzon}>`,
        to: payload.destinatarios,
        subject: payload.asunto,
        text: payload.cuerpoTexto,
        html: payload.cuerpoHtml,
        headers: {
          'Message-ID': payload.messageId,
          ...(payload.inReplyTo ? { 'In-Reply-To': payload.inReplyTo } : {}),
          ...(payload.referencesHeader ? { 'References': payload.referencesHeader } : {})
        }
      };

      try {
        await transporter.sendMail(mailOptions);

        // Mark as ENVIADO
        await connection.query(
          `UPDATE cola_correos SET estado = 'ENVIADO', error_sanitizado = NULL WHERE id = ?`,
          [item.id]
        );
      } catch (err) {
        const attempts = item.intentos + 1;
        const backoffMinutes = Math.pow(2, attempts); // 2, 4, 8, 16... minutes
        const sanitizedErr = err.message ? err.message.replace(/(pass|password|auth|secret)=[^&\s]+/gi, '$1=***') : 'Error al enviar por SMTP';

        await connection.query(
          `UPDATE cola_correos 
           SET estado = 'ERROR', 
               intentos = ?, 
               proxima_ejecucion = DATE_ADD(NOW(), INTERVAL ? MINUTE), 
               error_sanitizado = ? 
           WHERE id = ?`,
          [attempts, backoffMinutes, sanitizedErr, item.id]
        );
      }
    }
  } catch (err) {
    console.error('Error in outbox queue worker:', err.message);
  } finally {
    connection.release();
    isOutboxProcessing = false;
  }
}

/**
 * Sync all active mailboxes registered in DB
 */
export async function syncAllActiveMailboxes() {
  const [rows] = await db.query(
    `SELECT id FROM cuentas_correo WHERE estado != 'INACTIVA'`
  );

  for (const account of rows) {
    await syncMailbox(account.id);
  }
}
