import assert from 'node:assert/strict';
import { build } from 'esbuild';

// WebCrypto in Node 20+ is exposed on globalThis.crypto, so the hashing service
// runs unmodified here: no shims, no source-text surgery.
if (!globalThis.crypto?.subtle) {
  console.error('SKIP: this Node build has no global WebCrypto (needs Node 20+)');
  process.exit(1);
}

const bundle = await build({
  stdin: {
    contents: "export * from './src/services/passwordHash';",
    resolveDir: process.cwd(), loader: 'ts',
  },
  bundle: true, write: false, platform: 'node', format: 'esm',
});
const api = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));

const {
  PBKDF2_ITERATIONS,
  PBKDF2_MIN_ITERATIONS,
  PASSWORD_SALT_BYTES,
  hashPassword,
  verifyPassword,
  isLegacyPasswordHash,
  isStoredPasswordHash,
  isSecurePasswordStorageAvailable,
} = api;

let checks = 0;
const check = (label, condition) => {
  assert.ok(condition, label);
  checks += 1;
};

assert.equal(isSecurePasswordStorageAvailable(), true, 'WebCrypto must be available');
checks += 1;
assert.ok(PBKDF2_ITERATIONS >= PBKDF2_MIN_ITERATIONS);
assert.ok(PBKDF2_ITERATIONS >= 100_000, 'iteration count must stay above the OWASP floor');
checks += 1;

const PASSWORD = 'пароль с пробелами и кириллицей 123';

// Salts and digests must differ between runs even for the same password.
const salts = new Set();
const hashes = new Set();
const records = [];
for (let i = 0; i < 3; i += 1) {
  const record = await hashPassword(PASSWORD);
  records.push(record);
  salts.add(record.salt);
  hashes.add(record.hash);
  assert.equal(record.iterations, PBKDF2_ITERATIONS);
  assert.equal(typeof record.salt, 'string');
  assert.equal(typeof record.hash, 'string');
  assert.ok(Number.isInteger(record.iterations));
  assert.equal(atob(record.salt).length, PASSWORD_SALT_BYTES, 'salt must be 16 bytes');
  assert.equal(atob(record.hash).length, 32, 'PBKDF2-SHA256 output must be 32 bytes');
  checks += 7;
}
assert.equal(salts.size, 3, 'every run must use a fresh salt');
assert.equal(hashes.size, 3, 'the same password must not produce the same digest twice');
checks += 2;

for (const record of records) {
  assert.equal(await verifyPassword(PASSWORD, record), true, 'the correct password must verify');
  assert.equal(await verifyPassword(PASSWORD + ' ', record), false, 'a wrong password must not verify');
  assert.equal(await verifyPassword('', record), false, 'an empty password must not verify');
  assert.equal(await verifyPassword('ПАРОЛЬ', record), false, 'the check must stay case sensitive');
  checks += 4;
}

// A single flipped bit in the stored digest has to fail verification.
const tampered = { ...records[0], hash: records[0].hash.slice(0, -2) + (records[0].hash.at(-2) === 'A' ? 'BB' : 'AA') };
assert.equal(await verifyPassword(PASSWORD, tampered), false, 'a tampered digest must not verify');
checks += 1;

// The pre-PBKDF2 format is a bare 64-char hex digest and is never verifiable.
const legacy = 'a'.repeat(64);
assert.equal(isLegacyPasswordHash(legacy), true);
assert.equal(isLegacyPasswordHash(records[0]), false, 'a PBKDF2 record is not a legacy hash');
assert.equal(isLegacyPasswordHash('a'.repeat(63)), false);
assert.equal(isLegacyPasswordHash(null), false);
assert.equal(await verifyPassword(PASSWORD, legacy), false, 'a legacy digest must never verify');
checks += 5;

// Malformed records are rejected instead of throwing.
for (const bad of [undefined, null, 0, '', 'x', [], {}, { salt: '', hash: '', iterations: 0 },
  { salt: 'a', hash: 'b', iterations: PBKDF2_MIN_ITERATIONS - 1 },
  { salt: 'a', hash: 'b', iterations: 1.5 }]) {
  assert.equal(isStoredPasswordHash(bad), false, `must reject ${JSON.stringify(bad)}`);
  assert.equal(await verifyPassword(PASSWORD, bad), false);
  checks += 2;
}

// A record with a non-decodable salt is rejected rather than crashing.
assert.equal(await verifyPassword(PASSWORD, { salt: '!!!not base64!!!', hash: 'also bad', iterations: PBKDF2_ITERATIONS }), false);
checks += 1;

console.log(`PASS: ${checks} PBKDF2 checks — salting, iteration floor, verification, tamper and legacy rejection.`);
