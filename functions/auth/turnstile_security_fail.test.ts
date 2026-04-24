import test from 'node:test';
import assert from 'node:assert';
import { onRequest as onRequestLogin } from './login.ts';

test('onRequestLogin returns 403 when TURNSTILE_SECRET_KEY is missing', async () => {
    const request = new Request('https://example.com/auth/login?cf_token=mock-token', {
        method: 'GET'
    });

    const context = {
        request,
        env: {
            GOOGLE_CLIENT_ID: 'client-id',
            GOOGLE_CALLBACK_URL: 'callback-url'
            // TURNSTILE_SECRET_KEY is missing
        }
    } as any;

    const response = await onRequestLogin(context);
    assert.strictEqual(response.status, 403);
    const body = await response.text();
    assert.strictEqual(body, 'Turnstile verification failed');
});
