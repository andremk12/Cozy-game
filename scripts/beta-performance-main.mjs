// Production main/preload/CSP; all data stays in a unique disposable test profile.
import { app } from 'electron';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const profile = path.join(root, 'work', `beta-performance-${randomUUID()}`);
mkdirSync(profile, { recursive: true });
app.setPath('userData', profile);
// Default: retain the normal GPU path. An explicit software run is labeled.
const software = process.env.HAVEN_PERFORMANCE_SOFTWARE === '1';
if (software) app.disableHardwareAcceleration();
const logicalProcessors = os.cpus().length;
const auditStarted = performance.now();
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const report = {
  date: new Date().toISOString(), completed: false,
  environment: { platform: os.platform(), release: os.release(), arch: os.arch(), node: process.versions.node,
    electron: process.versions.electron, cpu: os.cpus()[0]?.model, logicalProcessors,
    totalMemoryGiB: os.totalmem() / 1024 ** 3, softwareRenderingRequested: software },
  method: {
    sampleDurationMs: 8000,
    cpu: 'Delta of cumulative process CPU seconds / wall seconds; oneCorePercent uses 100% for one logical CPU, machinePercent divides by the logical processor count. Only PIDs present at both boundaries count.',
    memory: 'Sum of app.getAppMetrics privateBytes and workingSetSize in KiB / 1024. Working-set sums may double-count shared pages; private MiB excludes shared pages.',
    docs: ['https://www.electronjs.org/docs/latest/api/structures/cpu-usage', 'https://www.electronjs.org/docs/latest/api/structures/memory-info'],
    continuity: 'Native window events, renderer visibility/focus events and commands issued by this script are recorded. A sample with an unexpected visibility/minimized transition is invalid for comparison; its raw measurements remain in the report. Event records do not identify an external actor or infer why a window restored.',
    limits: 'Short local sample, default empty garden, no photo stress, no long-duration leak proof, no hardware compatibility claim. Test scripts are outside the distributed application.',
  },
  phases: [], rendererErrors: [], nativeEvents: [], rendererEvents: [],
};

async function waitFor(check, message, timeout = 10000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await check()) return;
    await wait(50);
  }
  throw new Error(message);
}

async function saveReport() {
  await mkdir(path.join(root, 'outputs'), { recursive: true });
  await writeFile(path.join(root, 'outputs', 'beta-performance.json'), `${JSON.stringify(report, null, 2)}\n`);
}

app.once('browser-window-created', (_event, window) => {
  const evaluate = (source) => window.webContents.executeJavaScript(source);
  const nativeState = () => window.isDestroyed() ? { destroyed: true } : {
    minimized: window.isMinimized(), visible: window.isVisible(), focused: window.isFocused(),
    maximized: window.isMaximized(), fullscreen: window.isFullScreen(), bounds: window.getBounds(),
  };
  const recordNative = (event, detail) => {
    report.nativeEvents.push({ event, timestamp: Date.now(), atMs: performance.now() - auditStarted,
      state: nativeState(), ...detail });
  };
  for (const event of ['minimize', 'restore', 'focus', 'blur', 'show', 'hide', 'maximize', 'unmaximize',
    'enter-full-screen', 'leave-full-screen', 'closed']) window.on(event, () => recordNative(event));
  function command(action, phase) {
    recordNative('script-command', { action, phase });
    window[action]();
    recordNative('script-command-returned', { action, phase });
  }
  function showWindow(phase) {
    if (window.isMinimized()) command('restore', phase);
    command('show', phase);
    command('focus', phase);
  }
  const readState = (scene) => evaluate(`(() => {
    const scene = document.querySelector(${JSON.stringify(scene)});
    return { hidden: document.hidden, visibilityState: document.visibilityState, focused: document.hasFocus(),
      scenePaused: scene?.classList.contains('is-paused'),
      audioContexts: window.__betaAudioContexts.map((context) => context.state),
      audioButtonOn: document.querySelector('.sound-toggle')?.getAttribute('aria-pressed') === 'true',
      runningAnimations: document.getAnimations().filter((animation) => animation.playState === 'running').length,
      pausedAnimations: document.getAnimations().filter((animation) => animation.playState === 'paused').length };
  })()`);
  window.webContents.on('console-message', (event) => {
    if (event.level === 'error') report.rendererErrors.push(event.message);
  });
  window.webContents.on('render-process-gone', (_event, details) => report.rendererErrors.push(`Renderer gone: ${details.reason}`));
  window.webContents.once('did-finish-load', async () => {
    try {
      await waitFor(() => evaluate(`Boolean(document.querySelector('svg.room-art') && document.querySelector('.sound-toggle:not(:disabled)'))`), 'Production room did not mount.');
      await evaluate(`(() => {
        const NativeAudioContext = window.AudioContext;
        window.__betaAudioContexts = [];
        window.__betaVisibilityEvents = [];
        const record = (type) => window.__betaVisibilityEvents.push({ type,
          timestamp: performance.timeOrigin + performance.now(), hidden: document.hidden,
          visibilityState: document.visibilityState, focused: document.hasFocus() });
        document.addEventListener('visibilitychange', () => record('visibilitychange'));
        window.addEventListener('focus', () => record('focus'));
        window.addEventListener('blur', () => record('blur'));
        record('probe-installed');
        window.AudioContext = class extends NativeAudioContext {
          constructor(...args) { super(...args); window.__betaAudioContexts.push(this); }
        };
      })(); true;`);
      report.environment.gpuFeatures = app.getGPUFeatureStatus();

      async function sample(name, scene, minimized) {
        if (minimized) command('minimize', name);
        else showWindow(name);
        await waitFor(async () => window.isMinimized() === minimized
          && await evaluate(`document.hidden === ${minimized}`), `Native/renderer visibility did not settle for ${name}.`);
        await wait(1200);
        const initialState = await readState(scene);
        const initialNativeState = nativeState();
        if (initialState.hidden !== minimized || initialNativeState.minimized !== minimized) {
          report.rendererEvents = await evaluate('window.__betaVisibilityEvents');
          recordNative('sample-precondition-lost', { phase: name, initialState, expectedMinimized: minimized });
          throw new Error(`Measurement ${name} lost its visibility precondition during settling; inspect nativeEvents and rendererEvents. No product pause assertion was made.`);
        }
        const nativeEventStart = report.nativeEvents.length;
        const before = app.getAppMetrics();
        const started = performance.now();
        const startedTimestamp = Date.now();
        recordNative('sample-begin', { phase: name, expectedMinimized: minimized });
        await wait(8000);
        const durationMs = performance.now() - started;
        const endedTimestamp = Date.now();
        const after = app.getAppMetrics();
        const byPid = new Map(before.map((metric) => [metric.pid, metric]));
        const stable = after.filter((metric) => byPid.has(metric.pid)
          && byPid.get(metric.pid).creationTime === metric.creationTime);
        const supported = stable.length > 0 && stable.every((metric) => Number.isFinite(metric.cpu.cumulativeCPUUsage)
          && Number.isFinite(byPid.get(metric.pid).cpu.cumulativeCPUUsage));
        const cpuSeconds = supported ? stable.reduce((sum, metric) => sum + Math.max(0,
          metric.cpu.cumulativeCPUUsage - byPid.get(metric.pid).cpu.cumulativeCPUUsage), 0) : null;
        const sumMemory = (key) => after.every((metric) => Number.isFinite(metric.memory[key]))
          ? after.reduce((sum, metric) => sum + metric.memory[key], 0) / 1024 : null;
        const state = await readState(scene);
        const finalNativeState = nativeState();
        report.rendererEvents = await evaluate('window.__betaVisibilityEvents');
        recordNative('sample-end', { phase: name, expectedMinimized: minimized });
        const nativeEventsDuringSample = report.nativeEvents.slice(nativeEventStart);
        const rendererEventsDuringSample = report.rendererEvents.filter((event) => event.timestamp >= startedTimestamp
          && event.timestamp <= Date.now());
        const nativeChanged = nativeEventsDuringSample.some((event) => event.state.minimized !== minimized);
        const rendererChanged = rendererEventsDuringSample.some((event) => event.type === 'visibilitychange' && event.hidden !== minimized);
        const validForComparison = state.hidden === minimized && finalNativeState.minimized === minimized
          && !nativeChanged && !rendererChanged;
        const continuity = { expectedMinimized: minimized, startedTimestamp, endedTimestamp,
          initialNativeState, finalNativeState, initialRendererState: initialState,
          nativeEventsDuringSample, rendererEventsDuringSample, nativeChanged, rendererChanged };
        const phase = { name, durationMs, cpuSeconds,
          oneCorePercent: cpuSeconds === null ? null : cpuSeconds / (durationMs / 1000) * 100,
          machinePercent: cpuSeconds === null ? null : cpuSeconds / (durationMs / 1000) / logicalProcessors * 100,
          privateMiB: sumMemory('privateBytes'), workingSetMiB: sumMemory('workingSetSize'),
          processCount: after.length, stableProcessCount: stable.length, state, validForComparison, continuity,
          processes: after.map((metric) => ({ pid: metric.pid, type: metric.type, serviceName: metric.serviceName,
            cpu: metric.cpu, memory: metric.memory })) };
        report.phases.push(phase);
        await saveReport();
        console.log(`Beta performance ${name}: ${JSON.stringify({ oneCorePercent: phase.oneCorePercent,
          machinePercent: phase.machinePercent, privateMiB: phase.privateMiB, validForComparison, state })}`);
        if (!validForComparison) {
          throw new Error(`Measurement ${name} was interrupted by an unexpected native/renderer visibility state. Raw CPU/RAM is invalid for comparison. Inspect continuity/nativeEvents/rendererEvents; the cause is not inferred.`);
        }
        if (minimized) assert.equal(state.scenePaused, true, 'Hidden scene must explicitly pause its animation.');
        return phase;
      }

      await sample('room-visible-silent', '.room-scene', false);
      await sample('room-minimized-silent', '.room-scene', true);
      showWindow('navigate-garden');
      await waitFor(() => evaluate('!document.hidden'), 'Window did not restore.');
      await evaluate(`document.querySelector('.world-navigation [aria-label="The Garden"]').click(); true;`);
      await waitFor(() => evaluate(`Boolean(document.querySelector('svg.garden-art'))`), 'Garden did not mount.');
      await sample('garden-visible-silent', '.garden-scene', false);
      await sample('garden-minimized-silent', '.garden-scene', true);

      showWindow('navigate-journey');
      await waitFor(() => evaluate('!document.hidden'), 'Window did not restore for Journey.');
      await evaluate(`document.querySelector('.world-navigation [aria-label="The Journey"]').click(); true;`);
      await waitFor(() => evaluate(`Boolean(document.querySelector('svg.journey-art'))`), 'Journey did not mount.');
      const point = await evaluate(`(() => {
        const button = document.querySelector('.sound-toggle');
        button.scrollIntoView({ block: 'center' }); const bounds = button.getBoundingClientRect();
        return { x: Math.round(bounds.x + bounds.width / 2), y: Math.round(bounds.y + bounds.height / 2) };
      })()`);
      window.webContents.sendInputEvent({ type: 'mouseDown', button: 'left', clickCount: 1, ...point });
      window.webContents.sendInputEvent({ type: 'mouseUp', button: 'left', clickCount: 1, ...point });
      await waitFor(() => evaluate(`document.querySelector('.sound-toggle')?.getAttribute('aria-pressed') === 'true'`), 'Audio did not activate from the test click.');
      await sample('journey-visible-audio', '.journey-scene', false);
      const minimizedAudio = await sample('journey-minimized-audio', '.journey-scene', true);
      assert.deepEqual(minimizedAudio.state.audioContexts, ['running'], 'Ambient audio must continue while minimized.');
      assert.equal(minimizedAudio.state.audioButtonOn, true);
      assert.deepEqual(report.rendererErrors, []);
      report.completed = true;
      await saveReport();
      app.quit();
    } catch (error) {
      report.failure = error.message;
      await saveReport();
      console.error(`Beta performance failed: ${error.message}`);
      app.exit(1);
    }
  });
});

// Import without yielding first: the local privileged scheme must register before ready.
await import('../electron/main/index.js');
