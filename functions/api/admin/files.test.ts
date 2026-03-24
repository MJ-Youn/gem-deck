import test from 'node:test';
import assert from 'node:assert';
import { onRequestDelete } from './files.ts';
import { encryptPath, signSession } from '../../utils/crypto.ts';

test('onRequestDelete (admin) deletes images and html file using multiple calls (current)', async () => {
    const secret = 'test-secret';
    const adminEmail = 'admin@example.com';
    const docKey = 'docs/user@example.com/test.html';

    // Encrypted paths for images
    const img1Path = 'image/user@example.com/img1.png';
    const img2Path = 'image/user@example.com/img2.png';
    const img1Enc = await encryptPath(img1Path, secret);
    const img2Enc = await encryptPath(img2Path, secret);

    const htmlContent = `<html><body><img src="/api/file/${img1Enc}"><img src="/api/file/${img2Enc}"></body></html>`;

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

    const session = await signSession({ email: adminEmail }, secret);

    const request = new Request('https://example.com/api/admin/files', {
        method: 'DELETE',
        headers: {
            'Cookie': `auth_session=${session}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ key: docKey })
    });

    const context = {
        request,
        env: {
            GEM_DECK: mockR2,
            ADMIN_EMAIL: adminEmail,
            ENCRYPTION_SECRET: secret
        }
    } as any;

    const response = await onRequestDelete(context);
    const result = await response.json() as { success: boolean };

    assert.strictEqual(result.success, true);

    // Optimized implementation: 1 bulk call for images + 1 call for html = 2 calls
    assert.strictEqual(deleteCallCount, 2);

    // Verify bulk delete was called with an array
    const bulkImages = deletedKeys[0] as string[];
    assert.ok(Array.isArray(bulkImages));
    assert.strictEqual(bulkImages.length, 2);
    assert.ok(bulkImages.includes(img1Path));
    assert.ok(bulkImages.includes(img2Path));

    // Verify the second call was for the HTML file
    assert.strictEqual(deletedKeys[1], docKey);
});
