import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  contentSecurityPolicy,
  getDevelopmentUrl,
  isAllowedResource,
} from '../electron/services/security.js';

const directory = path.resolve('dist');
test('development server requires explicit loopback URL and cannot be enabled in a packaged app', () => {
  assert.equal(getDevelopmentUrl({}, false), null);
  assert.equal(
    getDevelopmentUrl({ LITTLE_HAVEN_DEV_URL: 'http://127.0.0.1:5173' }, false),
    'http://127.0.0.1:5173',
  );
  assert.throws(() => getDevelopmentUrl({ LITTLE_HAVEN_DEV_URL: 'https://example.com' }, false));
  assert.equal(getDevelopmentUrl({ LITTLE_HAVEN_DEV_URL: 'http://127.0.0.1:5173' }, true), null);
});

test('production blocks remote requests and files outside the renderer bundle', () => {
  assert.equal(
    isAllowedResource(
      pathToFileURL(path.join(directory, 'assets', 'room.js')).href,
      directory,
      null,
    ),
    true,
  );
  assert.equal(
    isAllowedResource(pathToFileURL(path.resolve('secret.txt')).href, directory, null),
    false,
  );
  for (const url of [
    'https://example.com',
    'http://127.0.0.1:5173/',
    'ws://127.0.0.1:5173/',
    'file:///etc/passwd',
    'ftp://example.com',
  ]) {
    assert.equal(isAllowedResource(url, directory, null), false);
  }
  assert.equal(
    isAllowedResource('http://127.0.0.1:5173/src/main.jsx', directory, 'http://127.0.0.1:5173'),
    true,
  );
  assert.equal(
    isAllowedResource('http://127.0.0.1:5174/', directory, 'http://127.0.0.1:5173'),
    false,
  );
  assert.equal(
    isAllowedResource('http://127.0.0.1.evil.example:5173/', directory, 'http://127.0.0.1:5173'),
    false,
  );
});

test('production CSP blocks connections, frames and script evaluation', () => {
  const csp = contentSecurityPolicy(null);
  assert.match(csp, /connect-src 'none'/);
  assert.match(csp, /frame-src 'none'/);
  assert.match(csp, /script-src 'self'/);
  assert.doesNotMatch(csp, /unsafe-eval/);
});
