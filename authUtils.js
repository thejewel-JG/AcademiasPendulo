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
 * Length: 12 chars (uppercase, lowercase, numbers, special symbol)
 */
export function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
  const bytes = crypto.randomBytes(12);
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
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
