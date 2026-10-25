import crypto from 'crypto';

// Secret key for AES-256-GCM outbox encryption (reads from env or generates a consistent fallback seed)
const ENCRYPTION_SECRET = process.env.MAIL_ENCRYPTION_SECRET || 'academias_pendulo_secure_outbox_key_2026';
const KEY = crypto.scryptSync(ENCRYPTION_SECRET, 'outbox_salt_2026', 32);

/**
 * Normalize email for unique comparison (trim and lowercase)
 */
export function normalizeEmail(email) {
  if (!email) return '';
  return email.trim().toLowerCase();
}

/**
 * Hash a password using scrypt with a random salt
 * Format stored in DB: scrypt$salt$hashHex
 */
export async function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`scrypt$${salt}$${derivedKey.toString('hex')}`);
    });
  });
}

/**
 * Verify a plain password against a stored scrypt hash
 */
export async function verifyPassword(password, storedHash) {
  return new Promise((resolve) => {
    if (!storedHash || typeof storedHash !== 'string') return resolve(false);

    const parts = storedHash.split('$');
    if (parts.length !== 3 || parts[0] !== 'scrypt') {
      return resolve(false);
    }

    const salt = parts[1];
    const originalHashHex = parts[2];

    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return resolve(false);
      const derivedHex = derivedKey.toString('hex');
      try {
        const hashBuffer = Buffer.from(originalHashHex, 'hex');
        const derivedBuffer = Buffer.from(derivedHex, 'hex');
        if (hashBuffer.length !== derivedBuffer.length) return resolve(false);
        resolve(crypto.timingSafeEqual(hashBuffer, derivedBuffer));
      } catch (e) {
        resolve(false);
      }
    });
  });
}

/**
 * Generate a cryptographically strong random temporary password
 * Requirement 9: High entropy, guaranteed upper, lower, digits, symbols.
 * No predefined passwords, no personal data, no predictable sequences.
 */
export function generateTempPassword(length = 14) {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%&*';
  const allChars = upper + lower + digits + symbols;

  // Guarantee at least one character from each set
  const chars = [
    upper[crypto.randomInt(0, upper.length)],
    lower[crypto.randomInt(0, lower.length)],
    digits[crypto.randomInt(0, digits.length)],
    symbols[crypto.randomInt(0, symbols.length)]
  ];

  // Fill remaining characters
  for (let i = chars.length; i < length; i++) {
    chars.push(allChars[crypto.randomInt(0, allChars.length)]);
  }

  // Shuffle using Fisher-Yates with crypto.randomInt
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}

/**
 * Generate a random token for session or reset token
 */
export function generateToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash a token (SHA-256) before storing in sessions or access_tokens
 */
export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * AES-256-GCM Encrypt sensitive mail payload for outbox
 */
export function encryptPayload(payloadObj) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const jsonStr = JSON.stringify(payloadObj);
  let encrypted = cipher.update(jsonStr, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return {
    iv: iv.toString('hex'),
    authTag,
    ciphertext: encrypted
  };
}

/**
 * AES-256-GCM Decrypt sensitive mail payload from outbox
 */
export function decryptPayload(encryptedObj) {
  try {
    const iv = Buffer.from(encryptedObj.iv, 'hex');
    const authTag = Buffer.from(encryptedObj.authTag, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedObj.ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  } catch (err) {
    throw new Error('Failed to decrypt outbox payload: invalid key or tampered data');
  }
}

/**
 * Validates Spanish DNI or NIE using official checksum algorithm (TRWAGMYFPDXBNJZSQVHLCKE)
 */
export function isValidDniNie(documentNumber) {
  if (!documentNumber || typeof documentNumber !== 'string') return false;
  const clean = documentNumber.trim().toUpperCase();
  const dniNieRegex = /^[0-9XYZ][0-9]{7}[TRWAGMYFPDXBNJZSQVHLCKE]$/;
  if (!dniNieRegex.test(clean)) return false;

  const validLetters = 'TRWAGMYFPDXBNJZSQVHLCKE';
  let numberPart = clean.slice(0, 8);
  const letter = clean.charAt(8);

  // NIE: X -> 0, Y -> 1, Z -> 2
  if (numberPart.startsWith('X')) {
    numberPart = '0' + numberPart.slice(1);
  } else if (numberPart.startsWith('Y')) {
    numberPart = '1' + numberPart.slice(1);
  } else if (numberPart.startsWith('Z')) {
    numberPart = '2' + numberPart.slice(1);
  }

  const num = parseInt(numberPart, 10);
  if (isNaN(num)) return false;

  return letter === validLetters[num % 23];
}

/**
 * Generate HMAC-SHA256 signature for signed download links or tokens
 */
export function generateHmacSignature(data, secret = process.env.MAIL_ENCRYPTION_SECRET || 'academias_pendulo_secure_outbox_key_2026') {
  return crypto.createHmac('sha256', secret).update(String(data)).digest('hex').substring(0, 32);
}

/**
 * Verify HMAC-SHA256 signature in constant time
 */
export function verifyHmacSignature(data, signature, secret = process.env.MAIL_ENCRYPTION_SECRET || 'academias_pendulo_secure_outbox_key_2026') {
  if (!signature || typeof signature !== 'string') return false;
  const expected = generateHmacSignature(data, secret);
  try {
    const a = Buffer.from(signature, 'hex');
    const b = Buffer.from(expected, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch (err) {
    return false;
  }
}

/**
 * Validate file uploads against whitelist and malicious magic byte patterns
 */
export function validateFileBuffer(buffer, filename, category = 'RECEIPT') {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
    return { valid: false, error: 'Archivo vacío o corrupto.' };
  }

  // Maximum sizes: 10 MB
  if (buffer.length > 10 * 1024 * 1024) {
    return { valid: false, error: 'El archivo excede el tamaño máximo permitido (10 MB).' };
  }

  const ext = (filename ? filename.substring(filename.lastIndexOf('.')) : '').toLowerCase();
  
  // Forbidden executable signatures
  if (buffer.length >= 2 && buffer[0] === 0x4D && buffer[1] === 0x5A) {
    return { valid: false, error: 'Formato de archivo no permitido (ejecutable detectado).' };
  }
  if (buffer.length >= 4 && buffer[0] === 0x7F && buffer[1] === 0x45 && buffer[2] === 0x4C && buffer[3] === 0x46) {
    return { valid: false, error: 'Formato de archivo binario no permitido.' };
  }

  // Scan start of buffer for script or PHP tags
  const startStr = buffer.slice(0, 512).toString('latin1').toLowerCase();
  if (startStr.includes('<?php') || startStr.includes('<script') || startStr.includes('<html')) {
    return { valid: false, error: 'El contenido del archivo contiene código no permitido.' };
  }

  if (category === 'RECEIPT') {
    const allowedExts = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
    if (!allowedExts.includes(ext)) {
      return { valid: false, error: `Extensión no válida (${ext}). Solo se admiten archivos PDF o imágenes (JPG, PNG, WebP).` };
    }

    // Magic bytes check
    const isPdf = buffer.length >= 4 && buffer.slice(0, 4).toString() === '%PDF';
    const isPng = buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
    const isJpg = buffer.length >= 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
    const isWebp = buffer.length >= 12 && buffer.slice(0, 4).toString() === 'RIFF' && buffer.slice(8, 12).toString() === 'WEBP';

    if (!isPdf && !isPng && !isJpg && !isWebp) {
      return { valid: false, error: 'El contenido del archivo no coincide con un formato de documento o imagen válido.' };
    }

    return { valid: true, ext };
  }

  if (category === 'CV') {
    const allowedExts = ['.pdf', '.doc', '.docx', '.odt', '.rtf'];
    if (!allowedExts.includes(ext)) {
      return { valid: false, error: `Extensión no válida (${ext}). Solo se admiten documentos en formato PDF o Word (DOC, DOCX, ODT).` };
    }

    const isPdf = buffer.length >= 4 && buffer.slice(0, 4).toString() === '%PDF';
    const isDoc = buffer.length >= 4 && buffer[0] === 0xD0 && buffer[1] === 0xCF && buffer[2] === 0x11 && buffer[3] === 0xE0;
    const isDocxOrZip = buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4B && buffer[2] === 0x03 && buffer[3] === 0x04;
    const isRtf = buffer.length >= 5 && buffer.slice(0, 5).toString() === '{\\rtf';

    if (!isPdf && !isDoc && !isDocxOrZip && !isRtf) {
      return { valid: false, error: 'El contenido del archivo de currículum no coincide con el tipo de documento declarado.' };
    }

    return { valid: true, ext };
  }

  return { valid: false, error: 'Categoría de archivo no soportada.' };
}

