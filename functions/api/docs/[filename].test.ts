import test from 'node:test';
import assert from 'node:assert';
import { onRequestDelete } from './[filename].ts';
import { encryptPath } from '../../utils/crypto.ts';

test('onRequestDelete (user) deletes images and html file using multiple calls (current)', async () => {
    const secret = 'test-secret';
    const email = 'user@example.com';
    const filename = 'test.html';
    const docKey = `docs/${email}/${filename}`;

    // Encrypted paths for images
    const img1Path = `image/${email}/img1.png`;
    const img1Enc = await encryptPath(img1Path, secret);

    const htmlContent = `<html><body><img src="/api/file/${img1Enc}"></body></html>`;

    const deletedKeys: (string | string[])[] = [];
    let deleteCallCount = 0;
    const mockR2 = {
        get: async (key: string) => {
            if (key === docKey) {
                return {
                    text: async () => htmlContent
                };
            }
            return null;
        },
        delete: async (key: string | string[]) => {
            deleteCallCount++;
            deletedKeys.push(key);
        }
    };

    const request = new Request(`https://example.com/api/docs/${filename}`, {
        method: 'DELETE',
        headers: {
            'Cookie': `auth_session={"email":"${email}"}`,
            'X-Turnstile-Token': 'mock-token'
        }
    });

    // Mock Turnstile
    const originalFetch = global.fetch;
    (global as any).fetch = async () => ({
        json: async () => ({ success: true })
    });

    try {
        const context = {
            request,
            params: { filename },
            env: {
                GEM_DECK: mockR2,
                ENCRYPTION_SECRET: secret
            }
        } as any;

        const response = await onRequestDelete(context);
        const result = await response.json() as { success: boolean };

        assert.strictEqual(result.success, true);

        // Optimized implementation: 1 bulk call for images + 1 call for html = 2 calls
        // In this case, 1 image also goes through bulk delete array
        assert.strictEqual(deleteCallCount, 2);

        const bulkImages = deletedKeys[0] as string[];
        assert.ok(Array.isArray(bulkImages));
        assert.strictEqual(bulkImages.length, 1);
        assert.strictEqual(bulkImages[0], img1Path);

        assert.strictEqual(deletedKeys[1], docKey);
    } finally {
        (global as any).fetch = originalFetch;
    }
});
