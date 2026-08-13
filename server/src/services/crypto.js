// AES-256-GCM encryption for sensitive credentials (API keys).
// Secrets are stored in Supabase as: enc:v1:<iv>:<tag>:<ciphertext>
// (all components base64). Values without the "enc:v1:" prefix are
// treated as legacy plaintext and passed through unchanged, which lets
// migrateKeys.js run without downtime.

import crypto from 'node:crypto';
import dotenv from 'dotenv';
dotenv.config();

const PREFIX = 'enc:v1:';
const ALGO = 'aes-256-gcm';
const IV_BYTES = 12;
const TAG_BYTES = 16;

export function getEncryptionKey() {
  const raw = process.env.CREDENTIALS_ENC_KEY;
  if (!raw) {
    throw new Error(
      '[crypto] Missing CREDENTIALS_ENC_KEY in server/.env. Set a base64 32-byte key (see .env.example) to enable credential encryption.'
    );
  }
  let key;
  try {
    key = Buffer.from(raw, 'base64');
  } catch {
    key = null;
  }
  if (!key || key.length !== 32) {
    throw new Error(
      '[crypto] CREDENTIALS_ENC_KEY must be a base64-encoded 32-byte key. Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"'
    );
  }
  return key;
}

export function isEncrypted(stored) {
  return typeof stored === 'string' && stored.startsWith(PREFIX);
}

export function encryptSecret(plaintext) {
  if (!plaintext) return '';
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptSecret(stored) {
  if (!stored) return '';
  if (!isEncrypted(stored)) return stored;
  const key = getEncryptionKey();
  const [ivB64, tagB64, dataB64] = stored.slice(PREFIX.length).split(':');
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error('[crypto] Malformed encrypted value');
  }
  const decipher = crypto.createDecipheriv(
    ALGO,
    key,
    Buffer.from(ivB64, 'base64')
  );
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}
