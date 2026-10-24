import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const DEVELOPMENT_URL = 'http://127.0.0.1:5173';

export function getDevelopmentUrl(environment, packaged) {
  if (packaged || !environment.LITTLE_HAVEN_DEV_URL) return null;
  if (environment.LITTLE_HAVEN_DEV_URL !== DEVELOPMENT_URL) {
    throw new Error('Development is restricted to the local Little Haven server.');
  }
  return DEVELOPMENT_URL;
}

export function isAllowedFullscreenPermission({
  permission, contents, trustedContents, expectedPage, details,
}) {
  // The DOM Fullscreen API needs no renderer IPC or additional device permissions.
  return permission === 'fullscreen'
    && Boolean(trustedContents)
    && contents === trustedContents
    && details?.isMainFrame === true
    && details.requestingUrl === expectedPage
    && contents.mainFrame.url === expectedPage;
}

export function isAllowedKeyboardLockPermission({ permission, fullscreen, ...request }) {
  // Electron consumes Escape before DOM events in HTML fullscreen. The local
  // contextual book/ticket locks only Escape, releasing it when the modal closes.
  return permission === 'keyboardLock'
    && fullscreen === true
    && isAllowedFullscreenPermission({ ...request, permission: 'fullscreen' });
}

export function isLocalFile(url, directory) {
  try {
    if (!url.startsWith('file:')) return false;
    const relative = path.relative(directory, fileURLToPath(url));
    return relative !== '' && !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative);
  } catch {
    return false;
  }
}

export function isAllowedResource(url, directory, developmentUrl) {
  if (url.startsWith('data:') || url.startsWith('blob:')) return true;
  if (isLocalFile(url, directory)) return true;
  if (!developmentUrl) return false;
  try {
    const parsed = new URL(url);
    return (parsed.protocol === 'http:' || parsed.protocol === 'ws:')
      && parsed.hostname === '127.0.0.1' && parsed.port === '5173';
  } catch {
    return false;
  }
}

export function contentSecurityPolicy(developmentUrl) {
  const connection = developmentUrl ? `${developmentUrl} ws://127.0.0.1:5173` : "'none'";
  return [
    "default-src 'self'",
    developmentUrl ? "script-src 'self' 'unsafe-inline'" : "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "media-src 'self' blob:",
    `connect-src ${connection}`,
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-src 'none'",
  ].join('; ');
}
