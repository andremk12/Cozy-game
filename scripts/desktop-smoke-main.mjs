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

async function clickRendererButton(window, selector, text) {
  const point = await window.webContents.executeJavaScript(`(() => {
    const text = ${JSON.stringify(text ?? null)};
    const button = text === null ? document.querySelector(${JSON.stringify(selector)})
      : [...document.querySelectorAll(${JSON.stringify(selector)})].find((item) => item.textContent.trim() === text);
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

async function verifyImmersiveCompanion(window) {
  const contents = window.webContents;
  const evaluate = (source) => contents.executeJavaScript(source);
  const input = (keyCode) => {
    contents.sendInputEvent({ type: 'keyDown', keyCode });
    contents.sendInputEvent({ type: 'keyUp', keyCode });
  };
  input('C');
  await waitFor(() => evaluate(`document.fullscreenElement?.querySelector('.companion-panel[open]')?.dataset.keyboardLock === 'true'`), 'Companion settings did not open in native fullscreen.');
  assert.equal(await evaluate(`document.querySelector('.companion-panel').contains(document.activeElement)`), true, 'Companion settings did not receive focus.');
  input('Escape');
  await waitFor(() => evaluate(`!document.querySelector('.companion-panel[open]')`), 'Escape did not close companion settings.');
  assert.equal(window.isFullScreen(), true, 'Closing companion settings left native fullscreen.');
  assert.equal(await evaluate('document.fullscreenElement !== null'), true, 'Closing companion settings left DOM fullscreen.');
  assert.equal(await evaluate(`window.__desktopMixerProbe.contexts.length`), 1, 'Companion created another AudioContext.');
}

async function verifyCompanion(window) {
  const contents = window.webContents;
  const evaluate = (source) => contents.executeJavaScript(source);
  await clickRendererButton(window, '[aria-label="Abrir My Companion"]');
  await waitFor(() => evaluate(`Boolean(document.querySelector('.companion-panel[open]'))`), 'Companion settings did not open.');
  const welcome = await evaluate(`Boolean(document.querySelector('.companion-panel input[type="text"]'))`);
  if (!welcome) await clickRendererButton(window, '.companion-panel button', 'Renomear');
  await waitFor(() => evaluate(`Boolean(document.querySelector('.companion-panel input[type="text"]'))`), 'Companion naming input did not render.');
  await evaluate(`document.querySelector('.companion-panel input[type="text"]').select(); true;`);
  await contents.insertText('Mochi Smoke');
  await clickRendererButton(window, '.companion-panel button[type="submit"]');
  if (welcome) {
    await waitFor(() => evaluate(`!document.querySelector('.companion-panel[open]')`), 'Confirming companion name did not close welcome.');
    await clickRendererButton(window, '[aria-label="Abrir My Companion"]');
  }
  await waitFor(() => evaluate(`document.querySelector('.companion-current-name')?.textContent === 'Mochi Smoke'`), 'Companion name did not update.');
  await clickRendererButton(window, '.companion-panel button', 'Renomear');
  await waitFor(() => evaluate(`Boolean(document.querySelector('.companion-panel input[type="text"]'))`), 'Companion rename input did not render.');
  await evaluate(`document.querySelector('.companion-panel input[type="text"]').select(); true;`);
  await contents.insertText('CANCELLED_SYNTHETIC_NAME');
  await clickRendererButton(window, '.companion-panel button', 'Cancelar');
  assert.equal(await evaluate(`document.querySelector('.companion-current-name').textContent`), 'Mochi Smoke', 'Cancelling rename changed the saved name.');
  const visibility = '.companion-panel [role="switch"]';
  if (await evaluate(`document.querySelector('${visibility}').getAttribute('aria-checked') === 'false'`)) await clickRendererButton(window, visibility);
  await clickRendererButton(window, visibility);
  await waitFor(() => evaluate(`!document.querySelector('g.companion')`), 'Companion visibility did not hide the character.');
  await clickRendererButton(window, visibility);
  await waitFor(() => evaluate(`document.querySelector('g.companion')?.getAttribute('aria-label') === 'Fazer carinho em Mochi Smoke'`), 'Companion did not reappear with its chosen name.');
  await waitFor(() => evaluate(`window.haven.getPreferences().then(({ companion }) => companion.enabled === true && companion.name === 'Mochi Smoke')`), 'Companion changes did not finish saving.');
  const saved = await evaluate(`window.haven.getPreferences().then(({ companion }) => companion)`);
  assert.equal(saved.name, 'Mochi Smoke');
  assert.equal(saved.enabled, true);
  assert.equal(saved.soundEnabled, false);
  await clickRendererButton(window, '[aria-label="Fechar My Companion"]');
  await clickRendererButton(window, 'g.companion');
  await waitFor(() => evaluate(`document.querySelector('g.companion')?.dataset.pose === 'petting'`), 'Companion did not respond to a real petting click.');
  return 'native name/rename-cancel, local persistence, visibility, real petting and no companion sounds';
}

async function verifyImmersiveMixer(window) {
  const evaluate = (source) => window.webContents.executeJavaScript(source);
  window.focus();
  await waitFor(async () => window.isFocused() && await evaluate('document.hasFocus()'), 'Fullscreen window did not settle its keyboard focus.');
  const input = (keyCode) => {
    window.webContents.sendInputEvent({ type: 'keyDown', keyCode });
    window.webContents.sendInputEvent({ type: 'keyUp', keyCode });
  };
  input('M');
  try {
    await waitFor(() => evaluate(`document.fullscreenElement?.querySelector('dialog.sound-mixer[open]')?.dataset.keyboardLock === 'true'`), 'Mixer did not open inside fullscreen with native Escape captured.');
  } catch (error) {
    const state = await evaluate(`({ scene: document.querySelector('.garden-scene') ? 'garden' : 'journey', tool: document.querySelector('.garden-scene')?.dataset.tool, focused: document.activeElement?.tagName, dialogs: [...document.querySelectorAll('dialog[open]')].map((item) => ({className: item.className, lock: item.dataset.keyboardLock})), fullscreen: Boolean(document.fullscreenElement) })`);
    throw new Error(`${error.message} ${JSON.stringify(state)}`);
  }
  assert.equal(window.isFullScreen(), true);
  assert.equal(await evaluate(`document.querySelector('.sound-mixer').contains(document.activeElement)`), true);
  input('Escape');
  await waitFor(() => evaluate(`!document.querySelector('dialog.sound-mixer[open]')`), 'Escape did not close the immersive mixer.');
  assert.equal(window.isFullScreen(), true, 'Closing mixer left native fullscreen.');
  assert.equal(await evaluate('document.fullscreenElement !== null'), true, 'Closing mixer left DOM fullscreen.');
  assert.equal(await evaluate(`window.__desktopMixerProbe.contexts.length`), 1, 'Immersive mixer created another AudioContext.');
  assert.equal(await evaluate(`window.__desktopMixerProbe.contexts[0].state`), 'running', 'Closing mixer stopped ambient audio.');
}

async function verifySoundMixer(window) {
  const evaluate = (source) => window.webContents.executeJavaScript(source);
  await evaluate(`(() => {
    const NativeContext = window.AudioContext;
    window.__desktopMixerProbe = { contexts: [] };
    window.AudioContext = class extends NativeContext {
      constructor(...args) { super(...args); window.__desktopMixerProbe.contexts.push(this); }
    };
  })(); true;`);
  await clickRendererButton(window, '[aria-label="Abrir Cozy Sound Mixer"]');
  await waitFor(() => evaluate(`Boolean(document.querySelector('.sound-mixer[open]'))`), 'Mixer did not open.');
  assert.equal(await evaluate('window.__desktopMixerProbe.contexts.length'), 0, 'Opening mixer started audio.');
  const choose = async (id) => {
    await evaluate(`(() => {
      const select = document.querySelector('.mixer-atmosphere select');
      select.value = ${JSON.stringify(id)};
      select.dispatchEvent(new Event('change', { bubbles: true }));
    })(); true;`);
  };
  await choose('rainy-evening');
  // A profile from a preceding smoke run may contain a remembered mute.
  if (await evaluate(`document.querySelector('.mixer-mute')?.getAttribute('aria-pressed') === 'true'`)) {
    await clickRendererButton(window, '.mixer-mute');
    await waitFor(() => evaluate(`document.querySelector('.mixer-mute')?.getAttribute('aria-pressed') === 'false'`), 'The remembered mute did not clear.');
  }
  await clickRendererButton(window, '.mixer-start');
  for (const [id, expected] of [
    ['rainy-evening', ['rain-soft', 'fire', 'wind']],
    ['morning-garden', ['birds', 'stream', 'wind']],
    ['quiet-night', ['crickets', 'stream', 'wind']],
    ['peaceful-journey', ['train-track', 'train-wheels', 'wind']],
  ]) {
    await choose(id);
    await waitFor(() => evaluate(`${JSON.stringify(expected)}.every((id) => document.querySelector('.mixer-layer[data-layer="' + id + '"]')?.dataset.status === 'playing')`), `Local audio did not decode/play for ${id}.`);
  }
  for (const id of ['rain-heavy', 'rain-window', 'leaves', 'carriage']) {
    await clickRendererButton(window, `.mixer-layer[data-layer="${id}"] [role="switch"]`);
    await waitFor(() => evaluate(`document.querySelector('.mixer-layer[data-layer="${id}"]')?.dataset.status === 'playing'`), `Local sound ${id} did not start.`);
  }
  assert.equal(await evaluate('window.__desktopMixerProbe.contexts.length'), 1, 'Mixer duplicated its AudioContext.');
  assert.equal(await evaluate(`Boolean(document.querySelector('.mixer-notice'))`), false, 'A local sound failed to load.');
  await clickRendererButton(window, '.mixer-mute');
  await waitFor(() => evaluate(`document.querySelector('.mixer-mute')?.getAttribute('aria-pressed') === 'true'`), 'Mute did not update after its native click.');
  await clickRendererButton(window, '.mixer-mute');
  await waitFor(() => evaluate(`document.querySelector('.mixer-mute')?.getAttribute('aria-pressed') === 'false'`), 'Unmute did not update after its native click.');
  await choose('rainy-evening');
  await clickRendererButton(window, '[aria-label="Fechar mixer"]');
  return 'all 12 local layers decoded/started, four presets, mute, one context, no autoplay';
}

async function verifyGardenImmersive(window) {
  const contents = window.webContents;
  const evaluate = (source) => contents.executeJavaScript(source);
  const escape = () => {
    contents.sendInputEvent({ type: 'keyDown', keyCode: 'Escape' });
    contents.sendInputEvent({ type: 'keyUp', keyCode: 'Escape' });
  };
  await evaluate(`document.querySelector('.world-navigation [aria-label="The Garden"]').click(); true;`);
  await waitFor(() => evaluate(`Boolean(document.querySelector('svg.garden-art') && document.querySelector('.garden-scene [aria-label="Modo Imersivo"]'))`), 'Garden immersive entry did not render.');
  const original = await evaluate(`(() => {
    window.__gardenSmokeArt = document.querySelector('svg.garden-art');
    const scene = document.querySelector('.garden-scene');
    return { atmosphere: scene.dataset.atmosphere, weather: scene.dataset.weather };
  })()`);
  await clickRendererButton(window, '.garden-scene [aria-label="Modo Imersivo"]');
  await waitFor(async () => window.isFullScreen() && await evaluate(`document.fullscreenElement?.classList.contains('immersive-viewport') === true`), 'Garden did not enter native and DOM fullscreen.');
  assert.equal(await evaluate(`document.fullscreenElement.querySelector('svg.garden-art') === window.__gardenSmokeArt`), true, 'Entering fullscreen remounted Garden art.');
  await waitFor(() => evaluate(`(() => {
    const art = document.querySelector('svg.garden-art').getBoundingClientRect();
    const viewport = document.fullscreenElement.getBoundingClientRect();
    return art.width > 0 && Math.abs(art.width / art.height - 16 / 9) < .001
      && art.left >= viewport.left - .2 && art.top >= viewport.top - .2
      && art.right <= viewport.right + .2 && art.bottom <= viewport.bottom + .2;
  })()`), 'Garden art did not fit fullscreen without distortion or cropping.');
  await verifyImmersiveMixer(window);
  await verifyImmersiveCompanion(window);

  const slotSelector = '.garden-art [data-slot-id="bed-1"]';
  await clickRendererButton(window, slotSelector);
  await waitFor(() => evaluate(`Boolean(document.querySelector('dialog.garden-context[open]'))`), 'A real Garden slot click did not open its context.');
  assert.equal(await evaluate(`(() => {
    const dialog = document.querySelector('dialog.garden-context[open]');
    return dialog.matches(':modal') && dialog.contains(document.activeElement)
      && Boolean(document.getElementById(dialog.getAttribute('aria-labelledby'))?.textContent.trim());
  })()`), true, 'Garden context did not open as a named modal with focus.');
  await waitFor(() => evaluate(`document.querySelector('dialog.garden-context')?.dataset.keyboardLock === 'true'`), 'Garden context did not capture native Escape.');
  escape();
  await waitFor(() => evaluate(`!document.querySelector('dialog.garden-context[open]')`), 'Escape did not close Garden context.');
  assert.equal(window.isFullScreen(), true, 'Contextual Escape left Garden native fullscreen.');
  assert.equal(await evaluate('document.fullscreenElement !== null'), true, 'Contextual Escape left Garden DOM fullscreen.');
  await waitFor(() => evaluate(`document.activeElement === document.querySelector(${JSON.stringify(slotSelector)})`), 'Garden context did not return focus to its slot.');

  const catSelector = '.garden-art [aria-label="Gato laranja entre as plantas"]';
  await clickRendererButton(window, catSelector);
  await waitFor(() => evaluate(`document.querySelector(${JSON.stringify(catSelector)})?.dataset.catVisible === 'true'`), 'A real click did not reveal the Garden cat.');
  assert.equal(await evaluate(`document.activeElement === document.querySelector(${JSON.stringify(catSelector)})`), true, 'Garden cat did not receive keyboard focus.');

  const toolsSelector = '.garden-art [aria-label="Ferramentas do jardim"]';
  await clickRendererButton(window, toolsSelector);
  await waitFor(() => evaluate(`document.querySelector('dialog.garden-context[open]')?.dataset.keyboardLock === 'true'`), 'Garden tool context did not open with native Escape captured.');
  await clickRendererButton(window, 'dialog.garden-context .garden-tool-buttons button', 'Mover');
  await waitFor(() => evaluate(`!document.querySelector('dialog.garden-context[open]') && document.querySelector('.garden-scene')?.dataset.tool === 'move'`), 'Garden Mover tool did not activate after its context closed.');
  await waitFor(() => evaluate(`document.querySelector('.garden-scene')?.dataset.keyboardLock === 'true'`), 'Garden active tool did not capture native Escape.');
  await verifyImmersiveMixer(window);
  await verifyImmersiveCompanion(window);
  assert.equal(await evaluate(`document.querySelector('.garden-scene')?.dataset.tool`), 'move', 'Mixer changed the active Garden tool.');
  escape();
  await waitFor(() => evaluate(`document.querySelector('.garden-scene')?.dataset.tool === 'observe'`), 'Escape did not cancel the active Garden tool.');
  assert.equal(window.isFullScreen(), true, 'Cancelling Garden tool left native fullscreen.');
  assert.equal(await evaluate('document.fullscreenElement !== null'), true, 'Cancelling Garden tool left DOM fullscreen.');

  const output = path.join(root, 'outputs', 'Little-Haven-Garden-immersive-desktop.png');
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, (await contents.capturePage()).toPNG());
  escape();
  await waitFor(async () => !window.isFullScreen() && await evaluate('document.fullscreenElement === null'), 'A second Escape did not leave Garden fullscreen.');
  await waitFor(() => evaluate(`document.activeElement === document.querySelector('.garden-scene [aria-label="Modo Imersivo"]')`), 'Garden fullscreen exit did not return focus to the entry button.');
  const returned = await evaluate(`(() => {
    const scene = document.querySelector('.garden-scene');
    return { atmosphere: scene.dataset.atmosphere, weather: scene.dataset.weather };
  })()`);
  assert.deepEqual(returned, original, 'Garden fullscreen interactions changed its saved atmosphere or weather.');
  assert.equal(await evaluate(`document.querySelector('svg.garden-art') === window.__gardenSmokeArt`), true, 'Leaving fullscreen remounted Garden art.');
  await evaluate('delete window.__gardenSmokeArt; true;');
  return 'native/DOM fullscreen, art identity, context Escape/focus, cat click, tool cancellation and entry focus';
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
      await verifyImmersiveMixer(window);
      await verifyImmersiveCompanion(window);
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
        if (Object.keys(window.haven).sort().join(',') !== 'getGarden,getPreferences,memoryExport,memoryGet,memoryImport,memoryRestore,memorySave,openDeveloperContact,saveGarden,savePreferences') throw new Error('Unexpected bridge API.');
        const initial = await window.haven.getPreferences();
        await window.haven.savePreferences({ lampOn: !initial.lampOn, volume: 0.1 });
        const changed = await window.haven.getPreferences();
        if (changed.lampOn === initial.lampOn || changed.volume !== 0.1) throw new Error('Preferences did not save.');
        let rejected = false;
        try { await window.haven.savePreferences({ thought: 'must-not-be-written' }); } catch { rejected = true; }
        if (!rejected) throw new Error('Unknown preference was accepted.');
        await window.haven.savePreferences(initial);
        const originalGarden = await window.haven.getGarden();
        if (!['ok', 'missing', 'recovered'].includes(originalGarden.status)) throw new Error('Garden did not load.');
        const changedGarden = { ...originalGarden.garden, atmosphere: 'night', weather: 'rain' };
        await window.haven.saveGarden(changedGarden);
        const restoredGarden = await window.haven.getGarden();
        if (restoredGarden.garden.atmosphere !== 'night' || restoredGarden.garden.weather !== 'rain') throw new Error('Garden did not save.');
        rejected = false;
        try { await window.haven.saveGarden({ ...changedGarden, thought: 'must-not-be-written' }); } catch { rejected = true; }
        if (!rejected) throw new Error('Unknown garden field was accepted.');
        await window.haven.saveGarden(originalGarden.garden);
        return { title: document.title, bridge: 'ok', preferences: 'ok', garden: 'ok', react: 'mounted' };
      })()`);
      assert.equal(window.getTitle(), 'Little Haven — Beta');
      assert.equal(BrowserWindow.getAllWindows().length, 1);
      result.companion = await verifyCompanion(window);
      result.audioMixer = await verifySoundMixer(window);
      result.gardenImmersive = await verifyGardenImmersive(window);
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
        await waitFor(() => window.webContents.executeJavaScript(`document.querySelector('g.companion')?.getAttribute('aria-label') === 'Fazer carinho em Mochi Smoke'`), 'Companion name did not restore after reloading the desktop renderer.');
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
      if (error.stack) console.error(error.stack);
      if (errors.length) console.error(`Renderer diagnostics: ${errors.join('; ')}`);
      finish(1);
    }
  });
});

await import('../electron/main/index.js');
