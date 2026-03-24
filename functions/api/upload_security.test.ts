import test from 'node:test';
import assert from 'node:assert';
import { onRequestPost } from './upload.ts';
import { signSession } from '../utils/crypto.ts';

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

test('onRequestPost returns 401 for plain JSON session cookie (security fix)', async () => {
    const jsonSession = JSON.stringify({ email: 'user@example.com' });

    const request = new Request('https://example.com/api/upload', {
        method: 'POST',
        headers: {
            'Cookie': `auth_session=${jsonSession}`
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

test('onRequestPost returns 401 for tampered session cookie', async () => {
    const secret = 'test-secret';
    const validToken = await signSession({ email: 'user@example.com' }, secret);
    const tamperedToken = validToken.replace('user@example.com', 'admin@example.com');

    const request = new Request('https://example.com/api/upload', {
        method: 'POST',
        headers: {
            'Cookie': `auth_session=${tamperedToken}`
        }
    });

    const context = {
        request,
        env: {
            GEM_DECK: {} as any,
            ENCRYPTION_SECRET: secret
        }
    } as any;

    const response = await onRequestPost(context);

    assert.strictEqual(response.status, 401);
});
