import test from 'node:test';
import assert from 'node:assert';
import { onRequest } from './logout.ts';

test('onRequest logout clears auth_session cookie and redirects to /', async () => {
    // PagesFunction typically takes a context object, but logout.ts doesn't use it.
    // We cast to any to avoid providing a full PagesFunctionContext object.
    const response = await (onRequest as any)({} as any);

    assert.strictEqual(response.status, 302);
    assert.strictEqual(response.headers.get('Location'), '/');

    const setCookie = response.headers.get('Set-Cookie');
    assert.ok(setCookie, 'Set-Cookie header should be present');

    // Check that the cookie is cleared
    assert.ok(setCookie.includes('auth_session=;'), 'Should clear auth_session cookie');
    assert.ok(setCookie.includes('Max-Age=0'), 'Cookie should expire immediately');
    assert.ok(setCookie.includes('HttpOnly'), 'Cookie should be HttpOnly');
    assert.ok(setCookie.includes('Secure'), 'Cookie should be Secure');
    assert.ok(setCookie.includes('Path=/'), 'Cookie path should be /');
});
