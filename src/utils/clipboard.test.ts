import test, { describe } from 'node:test';
import assert from 'node:assert';
import { handleCopyLink } from './clipboard.ts';
import { toast } from 'sonner';

describe('handleCopyLink', () => {
    test('shows error toast if URL is missing', async (t) => {
        const errorMock = t.mock.method(toast, 'error', () => {});

        await handleCopyLink('');

        assert.strictEqual(errorMock.mock.callCount(), 1);
        assert.strictEqual(errorMock.mock.calls[0].arguments[0], '복사할 링크가 없습니다.');
    });

    test('copies link successfully and shows success toast', async (t) => {
        const mockOrigin = 'https://gem-deck.com';
        const mockUrl = '/test-path';
        let copiedText = '';

        // Safely mock navigator and window
        if (!(global as any).navigator) (global as any).navigator = {};
        if (!(global as any).navigator.clipboard) (global as any).navigator.clipboard = {};

        const originalWriteText = (global as any).navigator.clipboard.writeText;
        (global as any).navigator.clipboard.writeText = async (text: string) => {
            copiedText = text;
        };

        const originalWindow = (global as any).window;
        (global as any).window = {
            location: { origin: mockOrigin }
        };

        const successMock = t.mock.method(toast, 'success', () => {});

        try {
            await handleCopyLink(mockUrl);
            assert.strictEqual(copiedText, mockOrigin + mockUrl);
            assert.strictEqual(successMock.mock.callCount(), 1);
            assert.strictEqual(successMock.mock.calls[0].arguments[0], '링크가 클립보드에 복사되었습니다.');
        } finally {
            (global as any).navigator.clipboard.writeText = originalWriteText;
            (global as any).window = originalWindow;
        }
    });

    test('shows error toast when clipboard copy fails', async (t) => {
        const mockOrigin = 'https://gem-deck.com';
        const mockUrl = '/test-path';

        // Safely mock navigator and window
        if (!(global as any).navigator) (global as any).navigator = {};
        if (!(global as any).navigator.clipboard) (global as any).navigator.clipboard = {};

        const originalWriteText = (global as any).navigator.clipboard.writeText;
        (global as any).navigator.clipboard.writeText = async () => {
            throw new Error('Clipboard error');
        };

        const originalWindow = (global as any).window;
        (global as any).window = {
            location: { origin: mockOrigin }
        };

        const errorMock = t.mock.method(toast, 'error', () => {});

        try {
            await handleCopyLink(mockUrl);
            assert.strictEqual(errorMock.mock.callCount(), 1);
            assert.strictEqual(errorMock.mock.calls[0].arguments[0], '클립보드 복사에 실패했습니다. 새 창으로 열기를 이용해주세요.');
        } finally {
            (global as any).navigator.clipboard.writeText = originalWriteText;
            (global as any).window = originalWindow;
        }
    });
});
