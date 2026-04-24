import test from 'node:test';
import assert from 'node:assert';
import { getCryptoKey, encryptPath, decryptPath, signSession, verifySession } from './crypto.ts';

test('signSession produces deterministic output', async () => {
    const payload = { id: 123, role: 'admin' };
    const secret = 'test-secret';
    const token1 = await signSession(payload, secret);
    const token2 = await signSession(payload, secret);
    assert.strictEqual(token1, token2);
});

test('signSession produces different output for different secrets', async () => {
    const payload = { id: 123 };
    const token1 = await signSession(payload, 'secret1');
    const token2 = await signSession(payload, 'secret2');
    assert.notStrictEqual(token1, token2);
});

test('signSession produces different output for different payloads', async () => {
    const secret = 'test-secret';
    const token1 = await signSession({ id: 1 }, secret);
    const token2 = await signSession({ id: 2 }, secret);
    assert.notStrictEqual(token1, token2);
});

test('signSession handles various payload types', async () => {
    const secret = 'test-secret';
    const payloads = [
        'simple string',
        12345,
        [1, 2, 3],
        { a: 1, b: [2, 3] },
        null,
        true,
        false
    ];

    for (const payload of payloads) {
        const token = await signSession(payload, secret);
        const recovered = await verifySession(token, secret);
        assert.deepStrictEqual(recovered, payload);
    }
});

test('signSession supports Unicode characters in payload', async () => {
    const secret = 'test-secret';
    const payload = { greeting: '안녕하세요', emoji: '🚀' };
    const token = await signSession(payload, secret);
    const recovered = await verifySession<typeof payload>(token, secret);
    assert.deepStrictEqual(recovered, payload);
});

test('getCryptoKey returns a valid CryptoKey object', async () => {
    const secret = 'my-secret';
    const key = await getCryptoKey(secret);
    assert.strictEqual(key.constructor.name, 'CryptoKey');
    assert.strictEqual((key.algorithm as KeyAlgorithm).name, 'AES-GCM');
    assert.strictEqual(key.extractable, true);
});

test('getCryptoKey returns deterministic keys for same secret and salt', async () => {
    const secret = 'my-secret';
    const salt = 'my-salt';
    const key1 = await getCryptoKey(secret, salt);
    const key2 = await getCryptoKey(secret, salt);
    assert.strictEqual(key1, key2); // Should be same instance due to caching
});

test('getCryptoKey returns different keys for different salts', async () => {
    const secret = 'my-secret';
    const key1 = await getCryptoKey(secret, 'salt1');
    const key2 = await getCryptoKey(secret, 'salt2');
    assert.notStrictEqual(key1, key2);
});

test('encryptPath and decryptPath round-trip correctly with salt', async () => {
    const path = '/some/path/to/resource';
    const secret = 'super-secret-key';
    const salt = 'unique-salt';
    const encrypted = await encryptPath(path, secret, salt);
    assert.notStrictEqual(encrypted, path);

    const decrypted = await decryptPath(encrypted, secret, salt);
    assert.strictEqual(decrypted, path);
});

test('decryptPath fallback to legacy salt', async () => {
    const path = '/legacy/path';
    const secret = 'secret';

    // Encrypt with legacy salt
    const encryptedLegacy = await encryptPath(path, secret, 'salt');

    // Decrypt with new salt should still work due to fallback
    const decryptedWithNewSalt = await decryptPath(encryptedLegacy, secret, 'new-salt');
    assert.strictEqual(decryptedWithNewSalt, path);
});

test('encryptPath produces different outputs for the same input', async () => {
    const path = '/some/path';
    const secret = 'secret';
    const encrypted1 = await encryptPath(path, secret);
    const encrypted2 = await encryptPath(path, secret);
    assert.notStrictEqual(encrypted1, encrypted2);
});

test('decryptPath returns null for invalid encrypted strings', async () => {
    const secret = 'secret';
    const invalidEncrypted = 'not-a-hex-string';
    const result = await decryptPath(invalidEncrypted, secret);
    assert.strictEqual(result, null);
});

test('decryptPath returns null for incorrect secret', async () => {
    const path = '/secure/path';
    const correctSecret = 'correct';
    const incorrectSecret = 'wrong';
    const encrypted = await encryptPath(path, correctSecret);
    const result = await decryptPath(encrypted, incorrectSecret);
    assert.strictEqual(result, null);
});

test('encryptPath and decryptPath work with CryptoKey input', async () => {
    const path = '/some/secret/path';
    const secret = 'another-secret';
    const key = await getCryptoKey(secret);

    const encrypted = await encryptPath(path, key);
    assert.notStrictEqual(encrypted, path);

    const decrypted = await decryptPath(encrypted, key);
    assert.strictEqual(decrypted, path);
});

test('encryptPath and decryptPath interoperability between string secret and CryptoKey', async () => {
    const path = '/interop/path';
    const secret = 'interop-secret';
    const salt = 'interop-salt';
    const key = await getCryptoKey(secret, salt);

    // Encrypt with Key, Decrypt with Secret
    const encryptedWithKey = await encryptPath(path, key);
    const decryptedWithSecret = await decryptPath(encryptedWithKey, secret, salt);
    assert.strictEqual(decryptedWithSecret, path);

    // Encrypt with Secret, Decrypt with Key
    const encryptedWithSecret = await encryptPath(path, secret, salt);
    const decryptedWithKey = await decryptPath(encryptedWithSecret, key);
    assert.strictEqual(decryptedWithKey, path);
});
