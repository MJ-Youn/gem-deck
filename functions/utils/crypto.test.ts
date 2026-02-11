import test from 'node:test';
import assert from 'node:assert';
import { getCryptoKey, encryptPath, decryptPath } from './crypto.ts';

test('getCryptoKey returns a valid CryptoKey object', async () => {
    const secret = 'my-secret';
    const key = await getCryptoKey(secret);
    assert.strictEqual(key.constructor.name, 'CryptoKey');
    // @ts-ignore - key.algorithm is part of CryptoKey
    assert.strictEqual(key.algorithm.name, 'AES-GCM');
    assert.strictEqual(key.extractable, true);
});

test('encryptPath and decryptPath round-trip correctly', async () => {
    const path = '/some/path/to/resource';
    const secret = 'super-secret-key';
    const encrypted = await encryptPath(path, secret);
    assert.notStrictEqual(encrypted, path);

    const decrypted = await decryptPath(encrypted, secret);
    assert.strictEqual(decrypted, path);
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
