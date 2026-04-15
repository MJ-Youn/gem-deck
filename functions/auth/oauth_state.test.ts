import test from 'node:test';
import assert from 'node:assert';
import { onRequest as loginHandler } from './login.ts';
import { onRequest as callbackHandler } from './callback.ts';
import { parse } from '../utils/cookie.ts';

const mockEnv = {
    GOOGLE_CLIENT_ID: 'client_id',
    GOOGLE_CLIENT_SECRET: 'client_secret',
    GOOGLE_CALLBACK_URL: 'http://localhost/callback',
    ENCRYPTION_SECRET: 'test_secret',
    TURNSTILE_SECRET_KEY: 'turnstile_secret'
};

test('Login handler should generate and set oauth_state cookie', async (t) => {
    // Mock Turnstile verification to succeed
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(JSON.stringify({ success: true }));

    try {
        const request = new Request('http://localhost/auth/login?cf_token=valid_token');
        const response = await (loginHandler as any)({ request, env: mockEnv } as any);

        assert.strictEqual(response.status, 302);

        const setCookie = response.headers.get('Set-Cookie');
        assert.ok(setCookie, 'Should set a cookie');

        const cookies = parse(setCookie);
        assert.ok(cookies.oauth_state, 'Should set oauth_state cookie');

        const location = response.headers.get('Location');
        assert.ok(location?.includes(`state=${cookies.oauth_state}`), 'OAuth URL should include the state');
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test('Callback handler should reject request with missing state parameter', async () => {
    const request = new Request('http://localhost/auth/callback?code=valid_code');
    const response = await (callbackHandler as any)({ request, env: mockEnv } as any);

    assert.strictEqual(response.status, 403);
    assert.strictEqual(await response.text(), 'Invalid state');
});

test('Callback handler should reject request with missing state cookie', async () => {
    const request = new Request('http://localhost/auth/callback?code=valid_code&state=some_state');
    const response = await (callbackHandler as any)({ request, env: mockEnv } as any);

    assert.strictEqual(response.status, 403);
});

test('Callback handler should reject request with mismatched state', async () => {
    const request = new Request('http://localhost/auth/callback?code=valid_code&state=state_a', {
        headers: { 'Cookie': 'oauth_state=state_b' }
    });
    const response = await (callbackHandler as any)({ request, env: mockEnv } as any);

    assert.strictEqual(response.status, 403);

    const setCookie = response.headers.get('Set-Cookie');
    assert.ok(setCookie?.includes('oauth_state=;'), 'Should clear state cookie on failure');
});

test('Callback handler should accept request with matching state', async (t) => {
    // Mock OAuth token and user info fetch
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url) => {
        if (url.toString().includes('oauth2.googleapis.com/token')) {
            return new Response(JSON.stringify({ access_token: 'valid_token' }));
        }
        if (url.toString().includes('googleapis.com/oauth2/v2/userinfo')) {
            return new Response(JSON.stringify({ email: 'test@example.com', name: 'Test User', picture: 'pic' }));
        }
        return new Response('Not found', { status: 404 });
    };

    try {
        const state = 'matching_state';
        const request = new Request(`http://localhost/auth/callback?code=valid_code&state=${state}`, {
            headers: { 'Cookie': `oauth_state=${state}` }
        });
        const response = await (callbackHandler as any)({ request, env: mockEnv } as any);

        assert.strictEqual(response.status, 302);
        assert.strictEqual(response.headers.get('Location'), '/dashboard');

        const setCookies = response.headers.getSetCookie();
        assert.ok(setCookies.some(c => c.includes('auth_session=')), 'Should set auth_session cookie');
        assert.ok(setCookies.some(c => c.includes('oauth_state=;')), 'Should clear oauth_state cookie');
    } finally {
        globalThis.fetch = originalFetch;
    }
});
