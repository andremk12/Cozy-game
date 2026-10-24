// Run through desktop-smoke.mjs after npm run build. Uses a separate work profile.
import { app, BrowserWindow, dialog } from 'electron';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
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

async function waitFor(check, message, timeout = 5_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 40));
  }
  throw new Error(message);
}

async function clickRendererButton(window, selector) {
  const point = await window.webContents.executeJavaScript(`(() => {
    const button = document.querySelector(${JSON.stringify(selector)});
    if (!button) throw new Error('Desktop smoke button is missing.');
    button.scrollIntoView({ block: 'center' });
    const rect = button.getBoundingClientRect();
    return { x: Math.round(rect.x + rect.width / 2), y: Math.round(rect.y + rect.height / 2) };
  })()`);
  if (!window.isVisible()) window.show();
  window.focus();
  await waitFor(() => window.isFocused(), 'Desktop window could not receive input.');
  window.webContents.sendInputEvent({ type: 'mouseMove', ...point });
  window.webContents.sendInputEvent({ type: 'mouseDown', button: 'left', clickCount: 1, ...point });
  window.webContents.sendInputEvent({ type: 'mouseUp', button: 'left', clickCount: 1, ...point });
}

async function verifyJourneyContextualObjects(window) {
  const contents = window.webContents;
  const evaluate = (source) => contents.executeJavaScript(source);
  const lampSelector = '.journey-object[aria-label="Luminária de leitura"]';
  const lampOn = await evaluate(`document.querySelector(${JSON.stringify(lampSelector)}).getAttribute('aria-pressed') === 'true'`);
  for (const expectedOn of [!lampOn, lampOn]) {
    await clickRendererButton(window, lampSelector);
    await waitFor(() => evaluate(`(() => {
      const lamp = document.querySelector(${JSON.stringify(lampSelector)});
      return lamp.getAttribute('aria-pressed') === '${expectedOn}'
        && document.querySelector('.journey-scene').dataset.lampOn === '${expectedOn}'
        && [...document.querySelectorAll('.journey-lamp-illumination')].every((light) => light.getAttribute('opacity') === '${expectedOn ? 1 : 0}');
    })()`), 'A real click did not update the Journey lamp state and illumination.');
  }

  for (const [label, kind, title] of [
    ['Abrir livro', 'book', 'Pequenas paisagens'],
    ['Consultar bilhete', 'ticket', 'Bilhete de viagem'],
  ]) {
    const selector = `.journey-object[aria-label="${label}"]`;
    await clickRendererButton(window, selector);
    await waitFor(() => evaluate(`Boolean(document.querySelector('dialog.journey-keepsake--${kind}[open]'))`), `A real click did not open the Journey ${kind}.`);
    assert.equal(await evaluate(`(() => {
      const contextual = document.querySelector('dialog.journey-keepsake--${kind}');
      const heading = document.getElementById(contextual.getAttribute('aria-labelledby'));
      return contextual.matches(':modal')
        && contextual.contains(document.activeElement)
        && heading.textContent.trim() === ${JSON.stringify(title)};
    })()`), true, `The Journey ${kind} did not open as a named modal with keyboard focus.`);
    assert.equal(window.isFullScreen(), true, `Opening the Journey ${kind} left native fullscreen.`);
    assert.equal(await evaluate(`document.fullscreenElement?.classList.contains('immersive-viewport') === true`), true, `Opening the Journey ${kind} left DOM fullscreen.`);

    await waitFor(() => evaluate(`document.querySelector('dialog.journey-keepsake')?.dataset.keyboardLock === 'true'`), 'The contextual Escape key was not captured in native fullscreen.');
    contents.sendInputEvent({ type: 'keyDown', keyCode: 'Escape' });
    contents.sendInputEvent({ type: 'keyUp', keyCode: 'Escape' });
    await waitFor(() => evaluate(`!document.querySelector('dialog.journey-keepsake[open]')`), `Escape did not close the Journey ${kind}.`);
    assert.equal(window.isFullScreen(), true, `The first Escape closed native fullscreen instead of only the Journey ${kind}.`);
    assert.equal(await evaluate(`document.fullscreenElement?.classList.contains('immersive-viewport') === true`), true, `The first Escape closed DOM fullscreen instead of only the Journey ${kind}.`);
    await waitFor(() => evaluate(`document.activeElement === document.querySelector(${JSON.stringify(selector)})`), `Closing the Journey ${kind} did not restore its object's focus.`);
  }
}

async function verifyJourneyImmersive(window) {
  const contents = window.webContents;
  const evaluate = (source) => contents.executeJavaScript(source);
  await evaluate(`document.querySelector('[aria-label="The Journey"]').click(); true;`);
  await waitFor(() => evaluate(`Boolean(document.querySelector('[aria-label="Modo Imersivo"]'))`), 'Journey immersive entry did not render.');
  await evaluate(`window.__journeySmokeArt = document.querySelector('svg.journey-art'); true;`);

  let nativeEntries = 0;
  let nativeExits = 0;
  const countEntry = () => { nativeEntries += 1; };
  const countExit = () => { nativeExits += 1; };
  contents.on('enter-html-full-screen', countEntry);
  contents.on('leave-html-full-screen', countExit);
  try {
    for (const maximized of [false, true]) {
      if (maximized) window.maximize();
      else window.unmaximize();
      await waitFor(() => window.isMaximized() === maximized, 'Pre-fullscreen window state did not settle.');
      const normalBounds = window.getNormalBounds();
      const scenery = maximized ? 'sunset' : 'rainy-night';
      await evaluate(`(() => {
        const select = document.querySelector('[aria-label="Paisagem da viagem"]');
        select.value = '${scenery}';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      })(); true;`);
      await waitFor(() => evaluate(`document.querySelector('.journey-scene')?.dataset.scenery === '${scenery}'`), 'Selected scenery did not settle.');
      await clickRendererButton(window, '[aria-label="Modo Imersivo"]');
      await waitFor(async () => window.isFullScreen() && await evaluate(`document.fullscreenElement?.classList.contains('immersive-viewport') === true`), 'Journey did not enter native and DOM fullscreen.');
      assert.equal(nativeEntries, maximized ? 2 : 1, 'Native HTML fullscreen entry event was missing.');

      // Fullscreen sizing may update on the next ResizeObserver/animation frame.
      await waitFor(() => evaluate(`(() => {
        const art = document.querySelector('.immersive-art svg.journey-art');
        const viewport = document.fullscreenElement;
        const rect = art?.getBoundingClientRect();
        const frame = viewport?.getBoundingClientRect();
        if (!rect || !frame) return false;
        const fit = Math.min(frame.width * devicePixelRatio / 480, frame.height * devicePixelRatio / 270);
        const scale = (fit >= 1 ? Math.floor(fit) : fit) / devicePixelRatio;
        return Math.abs(rect.width - 480 * scale) < .2 && Math.abs(rect.height - 270 * scale) < .2;
      })()`), 'Immersive pixel art did not settle at the expected physical-pixel scale.');

      const state = await evaluate(`(() => {
        const viewport = document.fullscreenElement;
        const art = viewport.querySelector('svg.journey-art');
        const rect = art.getBoundingClientRect();
        const frame = viewport.getBoundingClientRect();
        const parallax = art.querySelector('.journey-parallax');
        const rain = art.querySelector('.journey-rainfall');
        const outsideControl = document.querySelector('.world-navigation button');
        outsideControl.focus();
        return {
          sameArt: art === window.__journeySmokeArt,
          scenery: document.querySelector('.journey-scene').dataset.scenery,
          centered: Math.abs(rect.x - frame.x - (frame.width - rect.width) / 2) < .6 && Math.abs(rect.y - frame.y - (frame.height - rect.height) / 2) < .6,
          contained: rect.left >= frame.left - .2 && rect.top >= frame.top - .2 && rect.right <= frame.right + .2 && rect.bottom <= frame.bottom + .2,
          aspectRatio: rect.width / rect.height,
          pixelated: getComputedStyle(art).imageRendering,
          noScrolling: viewport.scrollWidth <= viewport.clientWidth && viewport.scrollHeight <= viewport.clientHeight,
          chromeExcluded: !viewport.contains(document.querySelector('.app-header')) && !viewport.contains(document.querySelector('.world-navigation')) && !viewport.contains(document.querySelector('.journey-controls')),
          outsideFocusBlocked: document.activeElement !== outsideControl,
          visibleControls: Array.from(viewport.querySelectorAll('button, input, select, a')).filter((control) => control.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })).length,
          animation: getComputedStyle(parallax).animationName,
          motion: getComputedStyle(parallax).animationPlayState,
          reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
          transform: getComputedStyle(parallax).transform,
          rainMotion: rain && getComputedStyle(rain).animationPlayState,
        };
      })()`);
      assert.equal(state.sameArt, true, 'Entering fullscreen remounted the scene art.');
      assert.equal(state.scenery, scenery);
      assert.equal(state.centered, true, 'Immersive art is not centered.');
      assert.equal(state.contained, true, 'Immersive art is cropped.');
      assert.ok(Math.abs(state.aspectRatio - 16 / 9) < .001, 'Immersive art is distorted.');
      assert.equal(state.pixelated, 'pixelated');
      assert.equal(state.noScrolling, true, 'Immersive viewport has scrollbars.');
      assert.equal(state.chromeExcluded, true, 'Normal interface is inside the fullscreen surface.');
      assert.equal(state.outsideFocusBlocked, true, 'Normal navigation can steal immersive keyboard focus.');
      assert.equal(state.visibleControls, 0, 'A control remains visible over the immersive art.');
      if (state.reducedMotion) assert.equal(state.animation, 'none');
      else {
        assert.equal(state.motion, 'running');
        await waitFor(() => evaluate(`getComputedStyle(document.querySelector('.journey-parallax')).transform !== ${JSON.stringify(state.transform)}`), 'Landscape animation stopped in fullscreen.');
        if (!maximized) assert.equal(state.rainMotion, 'running', 'Rain stopped in fullscreen.');
      }
      if (!maximized) {
        const output = path.join(root, 'outputs', 'Little-Haven-Journey-immersive-desktop.png');
        await mkdir(path.dirname(output), { recursive: true });
        await writeFile(output, (await contents.capturePage()).toPNG());
      }

      await verifyJourneyContextualObjects(window);
      assert.equal(nativeExits, maximized ? 1 : 0, 'A contextual Escape unexpectedly left native HTML fullscreen.');

      contents.sendInputEvent({ type: 'keyDown', keyCode: 'Escape' });
      contents.sendInputEvent({ type: 'keyUp', keyCode: 'Escape' });
      await waitFor(async () => !window.isFullScreen() && await evaluate('document.fullscreenElement === null'), 'Escape did not leave native and DOM fullscreen.');
      await waitFor(() => window.isMaximized() === maximized, 'Fullscreen exit did not restore maximized state.');
      await waitFor(() => evaluate(`document.activeElement === document.querySelector('[aria-label="Modo Imersivo"]')`), 'Fullscreen exit did not restore entry-button focus.');
      assert.equal(nativeExits, maximized ? 2 : 1, 'Native HTML fullscreen exit event was missing.');
      await waitFor(() => JSON.stringify(window.getNormalBounds()) === JSON.stringify(normalBounds), 'Fullscreen exit did not restore normal window bounds.');
      assert.deepEqual(window.getNormalBounds(), normalBounds, 'Fullscreen exit changed normal window bounds.');
      assert.equal(await evaluate(`document.querySelector('.journey-scene').dataset.scenery`), scenery, 'Fullscreen exit changed the selected scenery.');
      assert.equal(await evaluate(`document.querySelector('svg.journey-art') === window.__journeySmokeArt`), true, 'Fullscreen exit remounted the scene art.');
    }
    await evaluate('delete window.__journeySmokeArt; true;');
    return 'native/DOM fullscreen, art scaling, motion, lamp clicks, book/ticket contextual Escape and focus, normal/maximized restoration';
  } finally {
    contents.removeListener('enter-html-full-screen', countEntry);
    contents.removeListener('leave-html-full-screen', countExit);
  }
}

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
      await waitFor(() => window.webContents.executeJavaScript(`Boolean(document.querySelector('#root')?.children.length && document.querySelector('.world-navigation'))`), 'React root did not mount.');
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
      result.immersive = await verifyJourneyImmersive(window);
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
