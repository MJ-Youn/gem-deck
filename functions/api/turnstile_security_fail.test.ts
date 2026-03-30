import test from 'node:test';
import assert from 'node:assert';
import { onRequestDelete } from './docs/[filename].ts';
import { onRequestPost } from './upload.ts';
import { onRequest as onRequestLogin } from '../auth/login.ts';
import { signSession } from '../utils/crypto.ts';

test('onRequestDelete returns 403 when TURNSTILE_SECRET_KEY is missing', async () => {
    const filename = 'test.html';
    const request = new Request(`https://example.com/api/docs/${filename}`, {
        method: 'DELETE',
        headers: {
            'X-Turnstile-Token': 'mock-token'
        }
    });

    const context = {
        request,
        params: { filename },
        env: {
            GEM_DECK: {} as any,
            ENCRYPTION_SECRET: 'test-secret'
            // TURNSTILE_SECRET_KEY is missing
        }
    } as any;

    const response = await onRequestDelete(context);
    assert.strictEqual(response.status, 403);
    const body = await response.text();
    assert.strictEqual(body, 'Turnstile verification failed');
});

test('onRequestPost returns 403 when TURNSTILE_SECRET_KEY is missing', async () => {
    const secret = 'test-secret';
    const session = await signSession({ email: 'user@example.com' }, secret);

    const formData = new FormData();
    formData.append('cf-turnstile-response', 'mock-token');
    formData.append('html', new Blob(['test'], { type: 'text/html' }), 'test.html');

    const request = new Request('https://example.com/api/upload', {
        method: 'POST',
        headers: {
            'Cookie': `auth_session=${session}`
        },
        body: formData
    });

    const context = {
        request,
        env: {
            GEM_DECK: {} as any,
            ENCRYPTION_SECRET: secret
            // TURNSTILE_SECRET_KEY is missing
        }
    } as any;

    const response = await onRequestPost(context);
    assert.strictEqual(response.status, 403);
    const body = await response.text();
    assert.strictEqual(body, 'Turnstile verification failed');
});

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
