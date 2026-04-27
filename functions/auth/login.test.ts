import test from 'node:test';
import assert from 'node:assert';
import { onRequest } from './login.ts';
import { parse } from '../utils/cookie.ts';

const mockEnv = {
  GOOGLE_CLIENT_ID: 'test-client-id',
  GOOGLE_CALLBACK_URL: 'https://example.com/auth/callback',
  TURNSTILE_SECRET_KEY: 'test-secret-key'
};

test('onRequest login returns 403 when cf_token is missing', async () => {
  const request = new Request('https://example.com/auth/login');
  const context = {
    request,
    env: mockEnv
  } as any;

  const response = await onRequest(context);
  assert.strictEqual(response.status, 403);
  assert.strictEqual(await response.text(), 'Turnstile token required');
});

test('onRequest login returns 403 when Turnstile verification fails', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ success: false }));

  try {
    const request = new Request('https://example.com/auth/login?cf_token=invalid-token');
    const context = {
      request,
      env: mockEnv
    } as any;

    const response = await onRequest(context);
    assert.strictEqual(response.status, 403);
    assert.strictEqual(await response.text(), 'Turnstile verification failed');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('onRequest login redirects to Google OAuth on success', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ success: true }));

  try {
    const request = new Request('https://example.com/auth/login?cf_token=valid-token', {
        headers: {
            'CF-Connecting-IP': '1.2.3.4'
        }
    });
    const context = {
      request,
      env: mockEnv
    } as any;

    const response = await onRequest(context);
    assert.strictEqual(response.status, 302);

    const location = response.headers.get('Location');
    assert.ok(location?.startsWith('https://accounts.google.com/o/oauth2/v2/auth?'));

    const url = new URL(location!);
    assert.strictEqual(url.searchParams.get('client_id'), mockEnv.GOOGLE_CLIENT_ID);
    assert.strictEqual(url.searchParams.get('redirect_uri'), mockEnv.GOOGLE_CALLBACK_URL);
    assert.strictEqual(url.searchParams.get('response_type'), 'code');
    assert.strictEqual(url.searchParams.get('scope'), 'openid email profile');
    assert.strictEqual(url.searchParams.get('access_type'), 'online');
    assert.ok(url.searchParams.has('state'));

    const setCookie = response.headers.get('Set-Cookie');
    assert.ok(setCookie);
    const cookies = parse(setCookie);
    assert.ok(cookies.oauth_state);
    assert.strictEqual(cookies.oauth_state, url.searchParams.get('state'));

    assert.ok(setCookie.includes('HttpOnly'));
    assert.ok(setCookie.includes('Max-Age=300'));
    assert.ok(setCookie.includes('Path=/'));
    assert.ok(setCookie.includes('SameSite=Lax'));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
