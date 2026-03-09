import test from 'node:test';
import assert from 'node:assert';
import { sanitizeFilename } from './path.ts';

test('sanitizeFilename removes path segments', () => {
    assert.strictEqual(sanitizeFilename('path/to/file.html'), 'file.html');
    assert.strictEqual(sanitizeFilename('C:\\Windows\\System32\\cmd.exe'), 'cmd.exe');
    assert.strictEqual(sanitizeFilename('../../../etc/passwd'), 'passwd');
});

test('sanitizeFilename removes illegal characters', () => {
    assert.strictEqual(sanitizeFilename('file<name>.html'), 'filename.html');
    assert.strictEqual(sanitizeFilename('file:name.html'), 'filename.html');
    assert.strictEqual(sanitizeFilename('file|name.html'), 'filename.html');
    assert.strictEqual(sanitizeFilename('file?name.html'), 'filename.html');
    assert.strictEqual(sanitizeFilename('file*name.html'), 'filename.html');
});

test('sanitizeFilename handles empty or null input', () => {
    assert.strictEqual(sanitizeFilename(''), '');
});

test('sanitizeFilename preserves normal filenames', () => {
    assert.strictEqual(sanitizeFilename('my-presentation.html'), 'my-presentation.html');
    assert.strictEqual(sanitizeFilename('presentation_2024.html'), 'presentation_2024.html');
});

test('sanitizeFilename prevents path traversal using ..', () => {
    // Current implementation replaces .. with .
    assert.strictEqual(sanitizeFilename('../../test.html'), 'test.html');
    assert.strictEqual(sanitizeFilename('..\\..\\test.html'), 'test.html');
});
