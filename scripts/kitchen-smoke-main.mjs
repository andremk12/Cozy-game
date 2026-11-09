import { app } from 'electron';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const profile = path.resolve(process.env.HAVEN_KITCHEN_SMOKE_PROFILE || '');
assert.equal(path.dirname(profile), path.join(root, 'work'));
assert.match(path.basename(profile), /^kitchen-smoke-/);
const phase = process.env.HAVEN_KITCHEN_SMOKE_PHASE;
assert.ok(['paused', 'complete', 'restored', 'motion'].includes(phase));
app.disableHardwareAcceleration();
app.setPath('userData', profile);
let finished = false;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitFor(check, message, timeout = 8000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await check()) return;
    await sleep(40);
  }
  throw new Error(message);
}

async function clickRenderer(window, selector) {
  const point = await window.webContents.executeJavaScript(`(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) throw new Error('Kitchen smoke control is missing.');
    element.scrollIntoView({block:'center'});
    const rect = element.getBoundingClientRect();
    return {x:Math.round(rect.x+rect.width/2),y:Math.round(rect.y+rect.height/2)};
  })()`);
  window.show(); window.focus();
  await waitFor(() => window.isFocused(), 'Kitchen window could not receive native input.');
  window.webContents.sendInputEvent({ type: 'mouseMove', ...point });
  window.webContents.sendInputEvent({ type: 'mouseDown', button: 'left', clickCount: 1, ...point });
  window.webContents.sendInputEvent({ type: 'mouseUp', button: 'left', clickCount: 1, ...point });
}

function escape(window) {
  window.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Escape' });
  window.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Escape' });
}

async function capture(window, name) {
  // Capture the readable book after its finite opening animation, rather than
  // the deliberately transparent first frame of the native top layer.
  await window.webContents.executeJavaScript(`Promise.all([...document.querySelectorAll('.kitchen-dialog[open]')]
    .flatMap((element)=>element.getAnimations())
    .filter((animation)=>animation.effect.getTiming().iterations!==Infinity)
    .map((animation)=>animation.finished.catch(()=>{}))).then(()=>true)`);
  await mkdir(path.join(root, 'outputs'), { recursive: true });
  await writeFile(path.join(root, 'outputs', `Little-Haven-Kitchen-${name}-desktop.png`), (await window.webContents.capturePage()).toPNG());
}

async function verifyRefinements(window, evaluate) {
  await evaluate(`document.querySelector('[aria-label="The Cozy Kitchen"]').click(); true;`);
  await waitFor(() => evaluate(`Boolean(document.querySelector('[data-kitchen-book="closed"]'))`), 'Closed recipe book did not mount.');
  await capture(window, 'closed-book');
  await clickRenderer(window, '[data-kitchen-book="closed"]');
  await waitFor(() => evaluate(`Boolean(document.querySelector('.kitchen-recipe-book[open]'))`), 'Native book object did not open its recipe book.');
  assert.equal(await evaluate(`(() => {
    const dialog=document.querySelector('.kitchen-recipe-book');
    const close=dialog.querySelector('.kitchen-dialog-header button');
    const body=dialog.querySelector('.kitchen-dialog-body');
    body.scrollTop=body.scrollHeight;
    const rect=close.getBoundingClientRect();
    return rect.top>=0&&rect.bottom<=innerHeight&&dialog.contains(document.activeElement);
  })()`), true, 'Book close control escaped the visible native window.');
  await capture(window, 'book-normal');
  await clickRenderer(window, '.kitchen-recipe-book .kitchen-primary-button');
  await waitFor(() => evaluate(`document.querySelector('.kitchen-scene')?.dataset.status==='running'`), 'Native recipe did not start.');
  window.webContents.sendInputEvent({ type: 'mouseMove', x: 0, y: 0 });
  await waitFor(() => evaluate(`document.querySelector('.companion')?.dataset.kitchenPhase==='walking'`), 'Chef did not enter a walking phase.');
  const sample = () => evaluate(`(() => {
    const art=document.querySelector('.kitchen-art');
    const head=document.querySelector('[data-companion-head]');
    const bubble=document.querySelector('.kitchen-speech');
    const cat=document.querySelector('.companion');
    if(!head||!bubble)return null;
    const point=new DOMPoint(0,0).matrixTransform(head.getScreenCTM());
    const logical=point.matrixTransform(art.getScreenCTM().inverse());
    const bounds=bubble.getBoundingClientRect();
    const frame=art.getBoundingClientRect();
    return {x:logical.x,y:logical.y,phase:cat.dataset.kitchenPhase,action:cat.dataset.kitchenAction,
      contained:bounds.left>=frame.left-2&&bounds.right<=frame.right+2&&bounds.top>=frame.top-2&&bounds.bottom<=frame.bottom+2};
  })()`);
  const first = await sample();
  assert.ok(first, 'Chef head and speech did not share a visible native scene.');
  assert.equal(first.phase, 'walking');
  assert.equal(first.contained, true, 'Speech was clipped outside the kitchen.');
  assert.ok(!['mixing', 'stirring', 'baking', 'icing', 'presenting'].includes(first.action), 'Cooking started while the chef was walking.');
  await sleep(700);
  const second = await sample();
  assert.ok(second.x > first.x, 'The rendered chef did not move toward the worktop.');
  assert.ok(Math.abs(second.y - first.y) < 4, 'The floor walk drifted diagonally through furniture.');
  assert.equal(second.contained, true);
  await capture(window, 'walking-speech');
  await waitFor(() => evaluate(`document.querySelector('.companion')?.dataset.kitchenPhase==='acting'`), 'Chef did not settle after the walk.', 20_000);
  assert.equal(await evaluate(`document.querySelector('.companion')?.dataset.kitchenAction`), 'reading');
  await capture(window, 'arrived');
  const before = await evaluate('window.haven.getKitchen()');
  await clickRenderer(window, '[data-kitchen-book="closed"]');
  await waitFor(() => evaluate(`Boolean(document.querySelector('.kitchen-recipe-book[open]'))`), 'Recipe book did not reopen.');
  await sleep(600);
  const after = await evaluate('window.haven.getKitchen()');
  assert.equal(after.kitchen.session.id, before.kitchen.session.id);
  assert.equal(after.kitchen.session.status, 'running');
  assert.ok(after.kitchen.session.elapsedMs > before.kitchen.session.elapsedMs + 400, 'Book opening paused the Pomodoro.');
  escape(window);
  await waitFor(() => evaluate(`!document.querySelector('.kitchen-recipe-book[open]')`), 'Escape did not close the native book.');
  await waitFor(() => evaluate(`document.activeElement===document.querySelector('[data-kitchen-book="closed"]')`), 'Book close did not restore its object focus.');
  await clickRenderer(window, '.kitchen-scene [aria-label="Modo Imersivo"]');
  await waitFor(async () => window.isFullScreen() && await evaluate(`Boolean(document.fullscreenElement)`), 'Kitchen did not enter native and DOM fullscreen.');
  // Restart a synthetic session to show a fresh contextual message in fullscreen.
  await evaluate(`window.haven.commandKitchen({type:'restart'})`);
  await waitFor(() => evaluate(`Boolean(document.querySelector('.kitchen-speech'))`), 'Fullscreen speech did not appear.');
  await capture(window, 'speech-immersive');
  await clickRenderer(window, '[data-kitchen-book="closed"]');
  await waitFor(() => evaluate(`document.querySelector('.kitchen-recipe-book')?.dataset.keyboardLock==='true'`), 'Recipe book did not capture native contextual Escape.');
  await capture(window, 'book-immersive');
  escape(window);
  await waitFor(() => evaluate(`!document.querySelector('.kitchen-recipe-book[open]')`), 'First Escape did not close only the immersive book.');
  assert.equal(window.isFullScreen(), true);
  assert.equal(await evaluate('document.fullscreenElement!==null'), true);
  escape(window);
  await waitFor(async () => !window.isFullScreen() && await evaluate('document.fullscreenElement===null'), 'Second Escape did not restore the normal kitchen.');
}
app.on('browser-window-created', (_event, window) => {
  const errors = [];
  const evaluate = (source) => window.webContents.executeJavaScript(source);
  window.webContents.on('console-message', (event) => { if (event.level === 'error') errors.push(event.message); });
  window.webContents.once('did-finish-load', async () => {
    if (finished) return;
    try {
      await waitFor(() => evaluate(`Boolean(document.querySelector('.world-navigation'))`), 'Navigation did not mount.');
      const settings = window.webContents.getLastWebPreferences();
      assert.equal(settings.sandbox, true);
      assert.equal(settings.contextIsolation, true);
      assert.equal(settings.nodeIntegration, false);
      const initial = await evaluate('window.haven.getKitchen()');
      if (phase !== 'motion') assert.equal(initial.kitchen.session.id, '11111111-1111-4111-8111-111111111111');
      if (phase === 'motion') {
        assert.equal(initial.kitchen.session, null);
        await verifyRefinements(window, evaluate);
      } else if (phase === 'paused') {
        assert.equal(initial.kitchen.session.status, 'paused');
        await sleep(250);
        assert.equal((await evaluate('window.haven.getKitchen()')).kitchen.session.elapsedMs, 298000);
        await evaluate(`window.haven.commandKitchen({type:'settings',patch:{weather:'rain'}})`);
      } else if (phase === 'complete') {
        assert.equal(initial.kitchen.session.status, 'paused');
        assert.equal(initial.kitchen.settings.weather, 'rain');
        await evaluate(`window.haven.commandKitchen({type:'resume'})`);
        await evaluate(`document.querySelector('[aria-label="The Garden"]').click(); true;`);
        window.minimize();
        await waitFor(() => window.isMinimized(), 'Window did not minimize.');
        await sleep(2300);
        const completed = await evaluate('window.haven.getKitchen()');
        assert.equal(completed.kitchen.session.status, 'completed');
        assert.equal(completed.kitchen.session.elapsedMs, 300000);
        assert.equal(completed.kitchen.session.presentation, 'pending');
        assert.equal(await evaluate(`Boolean(document.querySelector('.kitchen-completion'))`), false);
        window.restore(); window.show(); window.focus();
        await evaluate(`document.querySelector('[aria-label="The Cozy Kitchen"]').click(); true;`);
        await waitFor(() => evaluate(`Boolean(document.querySelector('.kitchen-completion'))`), 'Pending completion did not appear after returning.');
        await waitFor(async () => (await evaluate('window.haven.getKitchen()')).kitchen.session.presentation === 'presented', 'Completion was not claimed.');
        assert.equal(await evaluate(`document.querySelectorAll('.kitchen-completion').length`), 1);
        assert.equal(await evaluate(`document.querySelector('.kitchen-completion').textContent.includes('Seu chá está pronto!')`), true);
        await mkdir(path.join(root, 'outputs'), { recursive: true });
        await writeFile(path.join(root, 'outputs', 'Little-Haven-Kitchen-desktop.png'), (await window.webContents.capturePage()).toPNG());
        await evaluate(`([...document.querySelectorAll('.kitchen-completion button')].find((item)=>item.textContent.trim()==='Fechar')).click(); true;`);
        await waitFor(async () => (await evaluate('window.haven.getKitchen()')).kitchen.session.presentation === 'closed', 'Dismissal did not persist.');
      } else {
        assert.equal(initial.kitchen.session.status, 'completed');
        assert.equal(initial.kitchen.session.presentation, 'closed');
        await evaluate(`document.querySelector('[aria-label="The Cozy Kitchen"]').click(); true;`);
        await waitFor(() => evaluate(`Boolean(document.querySelector('.kitchen-scene'))`), 'Kitchen did not mount.');
        await sleep(200);
        assert.equal(await evaluate(`Boolean(document.querySelector('.kitchen-completion'))`), false, 'A consumed conclusion replayed after reopening.');
      }
      assert.deepEqual(errors, []);
      console.log(`Kitchen smoke ${phase}: passed`);
      finished = true;
      app.quit();
    } catch (error) {
      finished = true;
      console.error(`Kitchen smoke ${phase}: ${error.stack}`);
      if (errors.length) console.error(errors.join('\n'));
      app.exit(1);
    }
  });
});
await import('../electron/main/index.js');
