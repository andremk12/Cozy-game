import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  contentSecurityPolicy,
  getDevelopmentUrl,
  isAllowedFullscreenPermission,
  isAllowedKeyboardLockPermission,
  isAllowedResource,
} from '../electron/services/security.js';

const directory = path.resolve('dist');
test('contextual keyboard lock requires native fullscreen and the exact trusted main page', () => {
  for (const expectedPage of [pathToFileURL(path.join(directory, 'index.html')).href, 'http://127.0.0.1:5173/']) {
    const contents = { mainFrame: { url: expectedPage } };
    const request = {
      permission: 'keyboardLock', fullscreen: true, contents, trustedContents: contents,
      expectedPage, details: { isMainFrame: true, requestingUrl: expectedPage },
    };
    assert.equal(isAllowedKeyboardLockPermission(request), true);
    for (const fullscreen of [false, undefined, 'true']) {
      assert.equal(isAllowedKeyboardLockPermission({ ...request, fullscreen }), false);
    }
    for (const permission of ['pointerLock', 'automatic-fullscreen', 'media', 'unknown']) {
      assert.equal(isAllowedKeyboardLockPermission({ ...request, permission }), false);
    }
    assert.equal(isAllowedKeyboardLockPermission({ ...request, contents: null }), false);
    assert.equal(isAllowedKeyboardLockPermission({ ...request, trustedContents: undefined }), false);
    assert.equal(isAllowedKeyboardLockPermission({ ...request, contents: { mainFrame: { url: expectedPage } } }), false);
    assert.equal(isAllowedKeyboardLockPermission({ ...request, details: undefined }), false);
    assert.equal(isAllowedKeyboardLockPermission({ ...request, details: { ...request.details, isMainFrame: false } }), false);
    for (const requestingUrl of ['https://example.com/', `${expectedPage}?other`, undefined]) {
      assert.equal(isAllowedKeyboardLockPermission({ ...request, details: { ...request.details, requestingUrl } }), false);
    }
    contents.mainFrame.url = 'https://example.com/';
    assert.equal(isAllowedKeyboardLockPermission(request), false);
  }
});

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

test('fullscreen is limited to the exact local page in the trusted main frame', () => {
  for (const expectedPage of [
    pathToFileURL(path.join(directory, 'index.html')).href,
    'http://127.0.0.1:5173/',
  ]) {
    const contents = { mainFrame: { url: expectedPage } };
    const request = {
      permission: 'fullscreen',
      contents,
      trustedContents: contents,
      expectedPage,
      details: { isMainFrame: true, requestingUrl: expectedPage },
    };
    assert.equal(isAllowedFullscreenPermission(request), true);
    for (const permission of ['automatic-fullscreen', 'media', 'notifications', 'keyboardLock', 'unknown']) {
      assert.equal(isAllowedFullscreenPermission({ ...request, permission }), false);
    }
    assert.equal(isAllowedFullscreenPermission({ ...request, contents: null }), false);
    assert.equal(isAllowedFullscreenPermission({ ...request, trustedContents: undefined }), false);
    assert.equal(isAllowedFullscreenPermission({
      ...request, contents: { mainFrame: { url: expectedPage } },
    }), false);
    assert.equal(isAllowedFullscreenPermission({ ...request, details: undefined }), false);
    assert.equal(isAllowedFullscreenPermission({
      ...request, details: { ...request.details, isMainFrame: false },
    }), false);
    for (const requestingUrl of [
      undefined, 'https://example.com/', 'http://127.0.0.1:5174/', `${expectedPage}?other`,
      pathToFileURL(path.join(directory, 'other.html')).href,
    ]) {
      assert.equal(isAllowedFullscreenPermission({
        ...request, details: { ...request.details, requestingUrl },
      }), false);
    }
    contents.mainFrame.url = 'https://example.com/';
    assert.equal(isAllowedFullscreenPermission(request), false);
  }
});
