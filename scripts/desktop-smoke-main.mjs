// Run through desktop-smoke.mjs after npm run build. Uses a separate work profile.
import { app, BrowserWindow, dialog } from 'electron';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const profile = path.join(root, 'work', 'desktop-smoke-profile');
// Keep the smoke test deterministic on machines without a usable GPU session.
app.disableHardwareAcceleration();
await mkdir(profile, { recursive: true });
app.setPath('userData', profile);
let settled = false;
const finish = (code) => {
  if (settled) return;
  settled = true;
  if (code === 0) app.quit();
  else app.exit(code);
};

app.on('browser-window-created', (_event, window) => {
  const errors = [];
  window.webContents.on('console-message', (event) => {
    if (event.level === 'error') errors.push(event.message);
  });
  window.webContents.on('did-fail-load', (_event, code, description) => {
    console.error(`Desktop page failed to load (${code}): ${description}`);
    finish(1);
  });
  window.webContents.once('did-finish-load', async () => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const settings = window.webContents.getLastWebPreferences();
      assert.equal(settings.contextIsolation, true);
      assert.equal(settings.nodeIntegration, false);
      assert.equal(settings.sandbox, true);
      const result = await window.webContents.executeJavaScript(`(async () => {
        if (!document.querySelector('#root')?.children.length) throw new Error('React root is empty.');
        if (typeof window.require !== 'undefined' || typeof window.process !== 'undefined') throw new Error('Node leaked to the renderer.');
        if (Object.keys(window.haven).sort().join(',') !== 'getPreferences,savePreferences') throw new Error('Unexpected bridge API.');
        const initial = await window.haven.getPreferences();
        await window.haven.savePreferences({ lampOn: !initial.lampOn, volume: 0.1 });
        const changed = await window.haven.getPreferences();
        if (changed.lampOn === initial.lampOn || changed.volume !== 0.1) throw new Error('Preferences did not save.');
        let rejected = false;
        try { await window.haven.savePreferences({ thought: 'must-not-be-written' }); } catch { rejected = true; }
        if (!rejected) throw new Error('Unknown preference was accepted.');
        await window.haven.savePreferences(initial);
        return { title: document.title, bridge: 'ok', preferences: 'ok', react: 'mounted' };
      })()`);
      assert.equal(window.getTitle(), 'Little Haven');
      assert.equal(BrowserWindow.getAllWindows().length, 1);
      assert.deepEqual(errors, [], `Renderer console errors: ${errors.join('; ')}`);
      const originalPrompt = dialog.showMessageBoxSync;
      let chosenButton = 0;
      let prompts = 0;
      let reloads = 0;
      const countReload = () => { reloads += 1; };
      window.webContents.on('did-finish-load', countReload);
      dialog.showMessageBoxSync = (_parent, options) => {
        assert.equal(options.defaultId, 0);
        assert.equal(options.cancelId, 0);
        assert.equal(options.buttons[0], 'Continuar escrevendo');
        prompts += 1;
        return chosenButton;
      };
      try {
        await window.webContents.executeJavaScript('window.onbeforeunload = () => false; true;', true);
        window.webContents.reload();
        await new Promise((resolve) => setTimeout(resolve, 200));
        assert.equal(prompts, 1, 'Native discard confirmation did not appear.');
        assert.equal(reloads, 0, 'Staying must preserve the current renderer.');
        chosenButton = 1;
        const reloaded = new Promise((resolve) => window.webContents.once('did-finish-load', resolve));
        window.webContents.reload();
        await reloaded;
        assert.equal(prompts, 2);
        assert.equal(reloads, 1, 'Explicit discard must permit reloading.');
        result.unloadProtection = 'stay and explicit discard verified';
      } finally {
        dialog.showMessageBoxSync = originalPrompt;
        window.webContents.removeListener('did-finish-load', countReload);
      }
      console.log(`Desktop smoke passed: ${JSON.stringify(result)}`);
      finish(0);
    } catch (error) {
      console.error(`Desktop smoke failed: ${error.message}`);
      finish(1);
    }
  });
});

await import('../electron/main/index.js');
