import test from 'node:test';
import assert from 'node:assert';
import { onRequest } from './[[path]].ts';
import { encryptPath } from '../../utils/crypto.ts';

test('onRequest returns 403 for invalid or unencrypted path', async () => {
    const secret = 'test-secret';

    // Test with no path params
    const context1 = {
        params: { path: [] },
        env: { ENCRYPTION_SECRET: secret }
    } as any;
    const response1 = await onRequest(context1);
    assert.strictEqual(response1.status, 403);
    assert.strictEqual(await response1.text(), 'Forbidden: Invalid or unencrypted path');

    // Test with cleartext path (legacy array)
    const context2 = {
        params: { path: ['docs', 'user', 'file.html'] },
        env: { ENCRYPTION_SECRET: secret }
    } as any;
    const response2 = await onRequest(context2);
    assert.strictEqual(response2.status, 403);
});

test('onRequest returns 404 when file is not found in R2', async () => {
    const secret = 'test-secret';
    const filePath = 'docs/user@example.com/missing.html';
    const encryptedPath = await encryptPath(filePath, secret);

    const mockR2 = {
        get: async (key: string) => {
            assert.strictEqual(key, filePath);
            return null;
        }
    };

    const context = {
        params: { path: [encryptedPath] },
        env: {
            GEM_DECK: mockR2,
            ENCRYPTION_SECRET: secret
        }
    } as any;

    const response = await onRequest(context);
    assert.strictEqual(response.status, 404);
    assert.strictEqual(await response.text(), 'Not Found');
});

test('onRequest returns 200 and file content for valid encrypted path', async () => {
    const secret = 'test-secret';
    const filePath = 'docs/user@example.com/test.html';
    const encryptedPath = await encryptPath(filePath, secret);
    const content = '<html><body>Hello World</body></html>';
    const etag = 'test-etag';

    const mockR2 = {
        get: async (key: string) => {
            assert.strictEqual(key, filePath);
            return {
                body: content,
                httpEtag: etag,
                writeHttpMetadata: (headers: Headers) => {
                    headers.set('Content-Type', 'text/html');
                }
            };
        }
    };

    const context = {
        params: { path: [encryptedPath] },
        env: {
            GEM_DECK: mockR2,
            ENCRYPTION_SECRET: secret
        }
    } as any;

    const response = await onRequest(context);
    assert.strictEqual(response.status, 200);
    assert.strictEqual(await response.text(), content);
    assert.strictEqual(response.headers.get('etag'), etag);
    assert.strictEqual(response.headers.get('Content-Type'), 'text/html');
    assert.strictEqual(response.headers.get('X-Content-Type-Options'), 'nosniff');
    assert.strictEqual(response.headers.get('X-Frame-Options'), 'DENY');
    assert.ok(response.headers.get('Content-Security-Policy')?.includes('sandbox'));
});
