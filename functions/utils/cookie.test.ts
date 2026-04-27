import test from 'node:test';
import assert from 'node:assert';
import { serialize, parse } from './cookie.ts';

test('serialize basic', () => {
  assert.strictEqual(serialize('foo', 'bar'), 'foo=bar');
  assert.strictEqual(serialize('foo', 'bar baz'), 'foo=bar%20baz');
});

test('serialize with maxAge', () => {
  assert.strictEqual(serialize('foo', 'bar', { maxAge: 1000 }), 'foo=bar; Max-Age=1000');
  assert.strictEqual(serialize('foo', 'bar', { maxAge: 1000.5 }), 'foo=bar; Max-Age=1000');
});

test('serialize with domain', () => {
  assert.strictEqual(serialize('foo', 'bar', { domain: 'example.com' }), 'foo=bar; Domain=example.com');
});

test('serialize with path', () => {
  assert.strictEqual(serialize('foo', 'bar', { path: '/' }), 'foo=bar; Path=/');
});

test('serialize with expires', () => {
  const date = new Date('2026-02-13T12:00:00Z');
  assert.strictEqual(serialize('foo', 'bar', { expires: date }), 'foo=bar; Expires=Fri, 13 Feb 2026 12:00:00 GMT');
});

test('serialize with httpOnly', () => {
  assert.strictEqual(serialize('foo', 'bar', { httpOnly: true }), 'foo=bar; HttpOnly');
});

test('serialize with secure', () => {
  assert.strictEqual(serialize('foo', 'bar', { secure: true }), 'foo=bar; Secure');
});

test('serialize with priority', () => {
  assert.strictEqual(serialize('foo', 'bar', { priority: 'high' }), 'foo=bar; Priority=high');
});

test('serialize with sameSite', () => {
  assert.strictEqual(serialize('foo', 'bar', { sameSite: true }), 'foo=bar; SameSite=Strict');
  assert.strictEqual(serialize('foo', 'bar', { sameSite: 'lax' }), 'foo=bar; SameSite=Lax');
  assert.strictEqual(serialize('foo', 'bar', { sameSite: 'strict' }), 'foo=bar; SameSite=Strict');
  assert.strictEqual(serialize('foo', 'bar', { sameSite: 'none' }), 'foo=bar; SameSite=None');
  // Test case insensitivity using a string that is a valid union member when lowercased
  assert.strictEqual(serialize('foo', 'bar', { sameSite: 'LAX' as 'lax' }), 'foo=bar; SameSite=Lax');
});

test('serialize with custom encode', () => {
  assert.strictEqual(serialize('foo', 'bar', { encode: (v) => v.toUpperCase() }), 'foo=BAR');
});

test('parse basic', () => {
  assert.deepStrictEqual(parse('foo=bar'), { foo: 'bar' });
  assert.deepStrictEqual(parse('foo=bar; baz=qux'), { foo: 'bar', baz: 'qux' });
});

test('parse with whitespace', () => {
  assert.deepStrictEqual(parse(' foo=bar ;  baz=qux '), { foo: 'bar', baz: 'qux' });
});

test('parse with quoted values', () => {
  assert.deepStrictEqual(parse('foo="bar"'), { foo: 'bar' });
  assert.deepStrictEqual(parse('foo="bar baz"'), { foo: 'bar baz' });
});

test('parse with URL decoding', () => {
  assert.deepStrictEqual(parse('foo=bar%20baz'), { foo: 'bar baz' });
});

test('parse handles missing values', () => {
  // Current implementation skips pairs without '='
  assert.deepStrictEqual(parse('foo'), {});
  assert.deepStrictEqual(parse('foo=bar; baz'), { foo: 'bar' });
});
