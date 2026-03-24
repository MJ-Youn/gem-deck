import test from 'node:test';
import assert from 'node:assert';
import { signSession, verifySession } from './crypto.ts';

test('signSession and verifySession round-trip correctly', async () => {
    const secret = 'test-secret';
    const payload = { email: 'user@example.com', name: 'User' };

    const token = await signSession(payload, secret);
    assert.ok(token.includes('.'), 'Token should contain a dot separator');

    const decoded = await verifySession<typeof payload>(token, secret);
    assert.deepStrictEqual(decoded, payload);
});

test('verifySession returns null for invalid signature', async () => {
    const secret = 'test-secret';
    const payload = { email: 'user@example.com' };

    const token = await signSession(payload, secret);
    const tamperedToken = token.slice(0, -1) + (token.endsWith('0') ? '1' : '0');

    const decoded = await verifySession(tamperedToken, secret);
    assert.strictEqual(decoded, null);
});

test('verifySession returns null for incorrect secret', async () => {
    const secret = 'test-secret';
    const wrongSecret = 'wrong-secret';
    const payload = { email: 'user@example.com' };

    const token = await signSession(payload, secret);
    const decoded = await verifySession(token, wrongSecret);
    assert.strictEqual(decoded, null);
});

test('verifySession returns null for malformed token', async () => {
    const secret = 'test-secret';
    assert.strictEqual(await verifySession('not-a-token', secret), null);
    assert.strictEqual(await verifySession('one.two.three', secret), null);
});
