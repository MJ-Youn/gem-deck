import test from 'node:test';
import assert from 'node:assert';
import { verifyTurnstile } from './turnstile.ts';

test('verifyTurnstile returns false if token or secretKey is missing', async () => {
    assert.strictEqual(await verifyTurnstile('', 'secret'), false);
    assert.strictEqual(await verifyTurnstile('token', ''), false);
});

test('verifyTurnstile returns true on successful verification', async () => {
    const originalFetch = global.fetch;
    (global as any).fetch = async () => ({
        json: async () => ({ success: true })
    });

    try {
        const result = await verifyTurnstile('token', 'secret');
        assert.strictEqual(result, true);
    } finally {
        (global as any).fetch = originalFetch;
    }
});

test('verifyTurnstile returns false on failed verification', async () => {
    const originalFetch = global.fetch;
    (global as any).fetch = async () => ({
        json: async () => ({ success: false })
    });

    try {
        const result = await verifyTurnstile('token', 'secret');
        assert.strictEqual(result, false);
    } finally {
        (global as any).fetch = originalFetch;
    }
});

test('verifyTurnstile returns false when fetch throws error', async () => {
    const originalFetch = global.fetch;
    (global as any).fetch = async () => {
        throw new Error('Network error');
    };

    const originalConsoleError = console.error;
    console.error = () => {};

    try {
        const result = await verifyTurnstile('token', 'secret');
        assert.strictEqual(result, false);
    } finally {
        (global as any).fetch = originalFetch;
        console.error = originalConsoleError;
    }
});

test('verifyTurnstile sends correct data in fetch', async () => {
    const originalFetch = global.fetch;
    let capturedBody: any = null;
    let capturedUrl: string | null = null;

    (global as any).fetch = async (url: any, options: any) => {
        capturedUrl = url.toString();
        capturedBody = options.body;
        return {
            json: async () => ({ success: true })
        };
    };

    try {
        await verifyTurnstile('test-token', 'test-secret', '1.2.3.4');

        assert.strictEqual(capturedUrl, 'https://challenges.cloudflare.com/turnstile/v0/siteverify');
        assert.strictEqual(capturedBody?.get('response'), 'test-token');
        assert.strictEqual(capturedBody?.get('secret'), 'test-secret');
        assert.strictEqual(capturedBody?.get('remoteip'), '1.2.3.4');
    } finally {
        (global as any).fetch = originalFetch;
    }
});
