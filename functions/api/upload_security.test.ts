import test from 'node:test';
import assert from 'node:assert';
import { onRequestPost } from './upload.ts';

test('onRequestPost returns 401 for plain text session cookie (security fix)', async () => {
    const plainTextEmail = 'user@example.com';

    const request = new Request('https://example.com/api/upload', {
        method: 'POST',
        headers: {
            'Cookie': `auth_session=${plainTextEmail}`
        }
    });

    const context = {
        request,
        env: {
            GEM_DECK: {} as any,
            ENCRYPTION_SECRET: 'test-secret'
        }
    } as any;

    const response = await onRequestPost(context);

    assert.strictEqual(response.status, 401);
    const body = await response.text();
    assert.strictEqual(body, 'Unauthorized');
});

test('onRequestPost returns 401 for invalid JSON session cookie', async () => {
    const invalidJson = '{"email": "user@example.com", "incomplete": ';

    const request = new Request('https://example.com/api/upload', {
        method: 'POST',
        headers: {
            'Cookie': `auth_session=${invalidJson}`
        }
    });

    const context = {
        request,
        env: {
            GEM_DECK: {} as any,
            ENCRYPTION_SECRET: 'test-secret'
        }
    } as any;

    const response = await onRequestPost(context);

    assert.strictEqual(response.status, 401);
});
