import { app, BrowserWindow, dialog, nativeImage, shell } from 'electron';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBouquet, DEFAULT_SUBJECT } from '../shared/bouquets.js';
import { createGarden, GROWTH_THRESHOLDS } from '../shared/garden.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
await mkdir(path.join(root, 'work'), { recursive: true });
const profile = await mkdtemp(path.join(root, 'work', 'bouquets-smoke-'));
app.setPath('userData', profile);
app.disableHardwareAcceleration();
const opened = [];
const dialogs = [];
// Exercise the real IPC path, never the user's mail application or filesystem dialog.
shell.openExternal = async (destination) => { opened.push(destination); };
dialog.showSaveDialog = async (_parent, options) => {
  dialogs.push(options);
  return { canceled: false, filePath: path.join(profile, options.defaultPath) };
};

async function waitFor(check, message) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 40));
  }
  throw new Error(message);
}

// A valid ancillary tEXt chunk proves the native decoder removes metadata,
// not only bytes appended after IEND. All test content is synthetic.
function withSyntheticMetadata(png) {
  const content = Buffer.from('Comment\0BOUQUET_SYNTHETIC_HIDDEN', 'utf8');
  const typeAndContent = Buffer.concat([Buffer.from('tEXt'), content]);
  let crc = 0xffffffff;
  for (const byte of typeAndContent) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  const chunk = Buffer.alloc(content.length + 12);
  chunk.writeUInt32BE(content.length, 0);
  typeAndContent.copy(chunk, 4);
  chunk.writeUInt32BE((crc ^ 0xffffffff) >>> 0, chunk.length - 4);
  return Buffer.concat([png.subarray(0, -12), chunk, png.subarray(-12), Buffer.from('BOUQUET_SYNTHETIC_TRAILING')]);
}

app.once('browser-window-created', (_event, window) => {
  const errors = [];
  window.webContents.on('console-message', (_event, level, message) => { if (level >= 3) errors.push(message); });
  window.webContents.once('did-finish-load', async () => {
    const evaluate = (source) => window.webContents.executeJavaScript(source);
    let untrusted;
    try {
      await waitFor(() => evaluate('Boolean(document.querySelector("#root")?.children.length)'), 'Renderer did not mount');
      const preferences = window.webContents.getLastWebPreferences();
      assert.equal(preferences.sandbox, true);
      assert.equal(preferences.contextIsolation, true);
      assert.equal(preferences.nodeIntegration, false);
      assert.equal(await evaluate('typeof window.require'), 'undefined');
      assert.equal(await evaluate('window.haven.getBouquetDraft()'), null);
      assert.deepEqual(opened, []);
      assert.deepEqual(dialogs, []);

      const bouquet = { ...createBouquet(), stems: ['rose-red', 'daisy', 'cosmos'], subject: 'SYNTHETIC Flores para você 💐', message: 'SYNTHETIC Carta\nOlá, você!' };
      const save = async (includeLetter) => evaluate(`window.haven.saveBouquetDraft(${JSON.stringify({ bouquet, includeLetter })})`);
      await save(false);
      let saved = JSON.parse(await readFile(path.join(profile, 'bouquet-draft.json'), 'utf8'));
      assert.equal(saved.message, '');
      assert.equal(saved.subject, DEFAULT_SUBJECT);
      assert.equal(Object.hasOwn(saved, 'recipient'), false);
      await save(true);
      saved = JSON.parse(await readFile(path.join(profile, 'bouquet-draft.json'), 'utf8'));
      assert.deepEqual(saved, bouquet);
      const garden = createGarden();
      garden.plants = bouquet.stems.map((species, index) => ({
        slotId: `bed-${index + 1}`, species, elapsedMs: GROWTH_THRESHOLDS.at(-1), updatedAt: Date.now(), wateredStages: [],
      }));
      await evaluate(`window.haven.saveGarden(${JSON.stringify(garden)})`);
      const reloaded = new Promise((resolve) => window.webContents.once('did-finish-load', resolve));
      window.webContents.reload();
      await reloaded;
      assert.deepEqual(await evaluate('window.haven.getBouquetDraft()'), bouquet);

      const invalid = { recipient: 'synthetic@example.test', subject: 'Hi\r\nBcc:bad@example.test', message: '' };
      assert.equal(await evaluate(`window.haven.openBouquetEmail(${JSON.stringify(invalid)}).then(()=>false,()=>true)`), true);
      assert.deepEqual(opened, []);
      const email = { recipient: 'synthetic@example.test', subject: bouquet.subject, message: bouquet.message };
      assert.equal(await evaluate(`window.haven.openBouquetEmail(${JSON.stringify(email)})`), true);
      assert.equal(opened.length, 1);
      assert.equal(new URL(opened[0]).searchParams.get('subject'), bouquet.subject);
      assert.equal(new URL(opened[0]).searchParams.get('body'), bouquet.message.replace(/\n/g, '\r\n'));
      assert.equal((await readFile(path.join(profile, 'bouquet-draft.json'), 'utf8')).includes(email.recipient), false);
      const longEmail = { ...email, message: '💐'.repeat(1000) };
      assert.equal(await evaluate(`window.haven.openBouquetEmail(${JSON.stringify(longEmail)}).then(()=>false,()=>true)`), true);
      assert.equal(opened.length, 1, 'An oversized letter must never reach the OS handler');
      assert.equal(await evaluate(`window.haven.openBouquetEmail(${JSON.stringify({ ...longEmail, message: '' })})`), true);
      assert.equal(opened.length, 2);
      assert.equal(new URL(opened[1]).searchParams.get('subject'), bouquet.subject);
      assert.equal(new URL(opened[1]).searchParams.get('body'), '');

      const dataUrl = await evaluate(`(() => { const canvas = document.createElement('canvas'); canvas.width=64; canvas.height=64; const ctx=canvas.getContext('2d'); ctx.fillStyle='#dc91a4'; ctx.fillRect(8,8,48,48); return canvas.toDataURL('image/png'); })()`);
      const decoratedPng = withSyntheticMetadata(Buffer.from(dataUrl.slice(22), 'base64'));
      assert.equal(nativeImage.createFromBuffer(decoratedPng).isEmpty(), false);
      await evaluate(`window.haven.saveBouquetImage(${JSON.stringify({ dataUrl: `data:image/png;base64,${decoratedPng.toString('base64')}`, kind: 'card' })})`);
      const exported = await readFile(path.join(profile, 'Little-Haven-cartao.png'));
      assert.deepEqual(nativeImage.createFromBuffer(exported).getSize(), { width: 64, height: 64 });
      assert.equal(exported.includes(Buffer.from('BOUQUET_SYNTHETIC_HIDDEN')), false);
      assert.equal(exported.includes(Buffer.from('BOUQUET_SYNTHETIC_TRAILING')), false);
      const htmlMessage = '<script>SYNTHETIC_XSS</script>\nCarinho 💐';
      await evaluate(`window.haven.saveBouquetImage(${JSON.stringify({ dataUrl, kind: 'card-html', message: htmlMessage, letterPaper: 'rose' })})`);
      const html = await readFile(path.join(profile, 'Little-Haven-cartao.html'), 'utf8');
      assert.equal(html.includes('<script>'), false);
      assert.match(html, /&lt;script&gt;SYNTHETIC_XSS&lt;\/script&gt;/);
      assert.equal(html.includes(email.recipient), false);
      assert.equal(dialogs.length, 2);

      // Exercise the actual SVG -> canvas -> IPC export under the production CSP.
      const click = async (label) => {
        const selector = `[aria-label="${label}"]`;
        await waitFor(() => evaluate(`Boolean(document.querySelector(${JSON.stringify(selector)})
          || [...document.querySelectorAll('button')].find((button) => button.textContent.trim() === ${JSON.stringify(label)}))`), `Bouquet control did not appear: ${label}`);
        await evaluate(`(() => {
          const target = document.querySelector(${JSON.stringify(selector)})
            || [...document.querySelectorAll('button')].find((button) => button.textContent.trim() === ${JSON.stringify(label)});
          if (!target || target.disabled) throw new Error('Missing enabled bouquet control.');
          target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        })()`);
      };
      await waitFor(() => evaluate(`Boolean(document.querySelector('button[aria-label="The Garden"]'))`), 'Navigation did not mount');
      await click('The Garden');
      await waitFor(() => evaluate('Boolean(document.querySelector("svg.garden-art"))'), 'Garden did not open');
      await click('Abrir Little Bouquets');
      await waitFor(() => evaluate('Boolean(document.querySelector(".bouquet-workshop"))'), 'Workshop did not open');
      await click('Retomar rascunho');
      await click('Confirmar retomada');
      await waitFor(() => evaluate('document.querySelectorAll(".bouquet-preview [data-bouquet-stem]").length === 3'), 'Draft did not return to the workshop');
      await click('Escrever a carta');
      await click('Revisar presente');
      await waitFor(() => evaluate(`Boolean(document.querySelector('[data-testid="review-subject"]'))`), 'Gift review did not open');
      assert.equal(await evaluate(`document.querySelector('[data-testid="review-subject"]').textContent`), bouquet.subject);
      await click('Salvar cartão PNG');
      await waitFor(async () => {
        const bytes = await readFile(path.join(profile, 'Little-Haven-cartao.png'));
        return nativeImage.createFromBuffer(bytes).getSize().width === 1200;
      }, 'Actual bouquet export did not create a 1200px PNG under the desktop CSP');
      assert.equal(dialogs.length, 3);
      assert.equal(opened.length, 2, 'Export must not open any mail handler');
      assert.deepEqual((await evaluate('window.haven.getGarden()')).garden.plants, garden.plants);

      // The identical preload in another webContents cannot access the trusted IPC.
      untrusted = new BrowserWindow({ show: false, webPreferences: {
        preload: path.join(root, 'electron/preload/index.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true,
      } });
      await untrusted.loadFile(path.join(root, 'dist', 'index.html'));
      assert.equal(await untrusted.webContents.executeJavaScript('window.haven.getBouquetDraft().then(()=>false,()=>true)'), true);
      untrusted.destroy();
      untrusted = null;
      await evaluate('window.haven.deleteBouquetDraft()');
      assert.equal(await evaluate('window.haven.getBouquetDraft()'), null);
      assert.deepEqual(errors, []);
      console.log('Bouquet desktop smoke passed: sandbox, origin validation, opt-in draft/reload/delete, Unicode mailto, metadata stripping, actual SVG/canvas PNG export under CSP and static HTML export; OS email and file dialogs were mocked.');
      app.quit();
    } catch (error) {
      if (untrusted && !untrusted.isDestroyed()) untrusted.destroy();
      console.error(`Bouquet desktop smoke failed: ${error.message}`);
      app.exit(1);
    }
  });
});

await import('../electron/main/index.js');
