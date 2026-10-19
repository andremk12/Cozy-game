import { app, BrowserWindow, dialog, ipcMain, session } from 'electron';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PreferencesStore } from '../services/preferences.js';
import { contentSecurityPolicy, getDevelopmentUrl, isAllowedResource } from '../services/security.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const distDirectory = path.join(projectRoot, 'dist');
const developmentUrl = getDevelopmentUrl(process.env, app.isPackaged);
const entryFile = path.join(distDirectory, 'index.html');
const expectedPage = developmentUrl ? `${developmentUrl}/` : pathToFileURL(entryFile).href;
let window;
let preferences;
let quitting = false;

app.setName('Little Haven');
app.setAppUserModelId('studio.littlehaven.desktop');
// Application-wide sandboxing also protects any future renderer.
app.enableSandbox();

function verifySender(event) {
  if (!window || event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame
    || event.senderFrame.url !== expectedPage) {
    throw new Error('Untrusted preference request.');
  }
}

function protectSession() {
  const localSession = session.defaultSession;
  localSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  localSession.setPermissionCheckHandler(() => false);
  localSession.webRequest.onBeforeRequest((details, callback) => {
    callback({ cancel: !isAllowedResource(details.url, distDirectory, developmentUrl) });
  });
  localSession.webRequest.onHeadersReceived((details, callback) => {
    callback({ responseHeaders: {
      ...details.responseHeaders,
      'Content-Security-Policy': [contentSecurityPolicy(developmentUrl)],
    } });
  });
  localSession.on('will-download', (event) => event.preventDefault());
}

async function createWindow() {
  window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 760,
    minHeight: 600,
    title: 'Little Haven',
    icon: path.join(projectRoot, 'public/assets/icons/haven.png'),
    backgroundColor: '#191d32',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(projectRoot, 'electron/preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: false,
      spellcheck: false,
    },
  });
  window.removeMenu();
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event) => event.preventDefault());
  window.webContents.on('will-frame-navigate', (event) => event.preventDefault());
  window.webContents.on('will-attach-webview', (event) => event.preventDefault());
  window.webContents.on('will-prevent-unload', (event) => {
    const choice = dialog.showMessageBoxSync(window, {
      type: 'question',
      title: 'Seu papel ainda está aqui',
      message: 'Sair da escrita?',
      detail: 'O texto deste papel será descartado ao sair. Você pode ficar e terminar no seu tempo.',
      buttons: ['Continuar escrevendo', 'Descartar e sair'],
      defaultId: 0,
      cancelId: 0,
      noLink: true,
    });
    // Electron treats preventDefault here as permission to ignore beforeunload.
    if (choice === 1) event.preventDefault();
  });
  window.on('page-title-updated', (event) => event.preventDefault());
  window.once('ready-to-show', () => window?.show());
  window.on('closed', () => { window = undefined; });
  if (developmentUrl) await window.loadURL(expectedPage);
  else await window.loadFile(entryFile);
}

app.whenReady().then(async () => {
  preferences = new PreferencesStore(path.join(app.getPath('userData'), 'preferences.json'));
  await preferences.get();
  protectSession();
  ipcMain.handle('haven:preferences:get', async (event) => {
    verifySender(event);
    return preferences.get();
  });
  ipcMain.handle('haven:preferences:save', async (event, patch) => {
    verifySender(event);
    return preferences.save(patch);
  });
  await createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow().catch(showStartupError);
  });
}).catch(showStartupError);

function showStartupError() {
  // Thought content is never logged or passed to the main process.
  dialog.showErrorBox('Little Haven', 'The room could not open. Build the app first, or start the development server with npm run dev.');
  app.quit();
}

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', (event) => {
  if (!preferences || quitting) return;
  event.preventDefault();
  quitting = true;
  preferences.flush().catch(() => undefined).finally(() => app.quit());
});
