/**
 * Encrypts/decrypts marketing credentials at rest using AES-256-GCM.
 * MARKETING_ENCRYPTION_KEY must be 64-character hex (= 32 bytes).
 */
const crypto = require('crypto');

const ALGO = 'aes-256-gcm';

function deriveKeyBuffer() {
  const raw = process.env.MARKETING_ENCRYPTION_KEY;
  if (!raw || typeof raw !== 'string') {
    throw new Error('MARKETING_ENCRYPTION_KEY env var missing (generate with: openssl rand -hex 32)');
  }
  const hex = raw.replace(/\s+/g, '');
  if (hex.length !== 64 || !/^[0-9a-fA-F]+$/.test(hex)) {
    throw new Error('MARKETING_ENCRYPTION_KEY must be 64 hex characters (32-byte key)');
  }
  return Buffer.from(hex, 'hex');
}

/** @param {object} plainObject */
exports.encryptJson = (plainObject) => {
  const key = deriveKeyBuffer();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const json = JSON.stringify(plainObject);
  const ciphertext = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('hex'),
    auth_tag: authTag.toString('hex'),
  };
};

/** @returns {object|null} */
exports.decryptJson = (ciphertextB64, ivHex, authTagHex) => {
  if (!ciphertextB64 || !ivHex || !authTagHex) return null;
  const key = deriveKeyBuffer();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const ciphertext = Buffer.from(ciphertextB64, 'base64');
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(authTag);
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(plain.toString('utf8'));
};
