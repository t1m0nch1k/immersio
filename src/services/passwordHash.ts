import { PasswordHash, StoredPasswordHash } from '../types';

/** OWASP floor for PBKDF2-HMAC-SHA256; high enough to make brute force costly. */
export const PBKDF2_ITERATIONS = 210_000;
export const PBKDF2_MIN_ITERATIONS = 100_000;
export const PASSWORD_SALT_BYTES = 16;

const PBKDF2_KEY_BITS = 256;
/** Legacy format: a bare 64-char hex SHA-256 digest, never verifiable. */
const LEGACY_SHA256_HEX = /^[0-9a-f]{64}$/i;
/** WebCrypto only accepts views backed by a plain `ArrayBuffer`. */
type Bytes = Uint8Array<ArrayBuffer>;

/**
 * `crypto.subtle` only exists in a secure context. Plain `http://` hosts (a LAN
 * preview, a self-hosted build opened by IP) get `undefined` here, and there is
 * no honest way to store a password in that case.
 */
export const isSecurePasswordStorageAvailable = (): boolean => {
  const webcrypto: Crypto | undefined = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  return Boolean(
    webcrypto
    && webcrypto.subtle
    && typeof webcrypto.subtle.deriveBits === 'function'
    && typeof webcrypto.subtle.importKey === 'function'
    && typeof webcrypto.getRandomValues === 'function'
  );
};

/** A 64-char hex digest produced by the pre-PBKDF2 build. */
export const isLegacyPasswordHash = (value: unknown): value is string =>
  typeof value === 'string' && LEGACY_SHA256_HEX.test(value);

export const isStoredPasswordHash = (value: unknown): value is StoredPasswordHash => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const record = value as Partial<StoredPasswordHash>;
  return typeof record.salt === 'string'
    && record.salt.length > 0
    && typeof record.hash === 'string'
    && record.hash.length > 0
    && typeof record.iterations === 'number'
    && Number.isInteger(record.iterations)
    && record.iterations >= PBKDF2_MIN_ITERATIONS;
};

const randomSalt = (): Bytes => {
  const salt = new Uint8Array(PASSWORD_SALT_BYTES);
  globalThis.crypto.getRandomValues(salt);
  return salt;
};

const toBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
};

const fromBase64 = (value: string): Bytes => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

const deriveBits = async (password: string, salt: Bytes, iterations: number): Promise<Bytes> => {
  const material = await globalThis.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const bits = await globalThis.crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    material,
    PBKDF2_KEY_BITS
  );
  return new Uint8Array(bits);
};

/**
 * Derives a PBKDF2-HMAC-SHA256 record with a fresh 16-byte CSPRNG salt.
 * Throws when WebCrypto is unavailable: callers must not fall back to
 * something weaker without telling the user.
 */
export const hashPassword = async (
  password: string,
  iterations: number = PBKDF2_ITERATIONS
): Promise<StoredPasswordHash> => {
  if (!isSecurePasswordStorageAvailable()) {
    throw new Error('secure-password-storage-unavailable');
  }
  const salt = randomSalt();
  const derived = await deriveBits(password, salt, iterations);
  return { salt: toBase64(salt), hash: toBase64(derived), iterations };
};

/** Length-independent, data-independent comparison of the derived bits. */
const constantTimeEqual = (a: Uint8Array, b: Uint8Array): boolean => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
};

/**
 * Verifies a password against a stored record. Any other shape - including the
 * legacy hex digest - is rejected outright rather than verified.
 */
export const verifyPassword = async (
  password: string,
  stored: PasswordHash | undefined
): Promise<boolean> => {
  if (!isStoredPasswordHash(stored)) return false;
  if (!isSecurePasswordStorageAvailable()) return false;
  let salt: Bytes;
  let expected: Bytes;
  try {
    salt = fromBase64(stored.salt);
    expected = fromBase64(stored.hash);
  } catch {
    return false;
  }
  if (salt.length === 0 || expected.length === 0) return false;
  const actual = await deriveBits(password, salt, stored.iterations);
  return constantTimeEqual(actual, expected);
};
