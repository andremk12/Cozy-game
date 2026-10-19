// Runs the real `npm run dev` lifecycle. The same module is a guarded, temporary
// Electron startup hook, so the application itself needs no test-only branches.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hookEnabled = process.env.LITTLE_HAVEN_DEVELOPMENT_SMOKE === '1';
const pause = (duration) => new Promise((resolve) => setTimeout(resolve, duration));

async function portIsOpen() {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port: 5173 });
    const finish = (open) => { socket.destroy(); resolve(open); };
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
    socket.setTimeout(500, () => finish(false));
  });
}

async function instrumentDesktop() {
  // Generic Node children (npm, Vite and the dev runner) import this hook too.
  // Only the Electron main process may access Electron's application API.
  const { app } = await import('electron');
  const reportFile = process.env.LITTLE_HAVEN_SMOKE_REPORT;
  const profile = process.env.LITTLE_HAVEN_SMOKE_PROFILE;
  assert.ok(reportFile && profile, 'The smoke profile and report must be explicit.');
  app.disableHardwareAcceleration();
  app.setPath('userData', profile);
  let finished = false;

  async function finish(result) {
    if (finished) return;
    finished = true;
    await writeFile(reportFile, JSON.stringify(result), 'utf8');
    // Close the real application normally; the dev runner must then stop Vite.
    if (result.ok) {
      const { BrowserWindow } = await import('electron');
      for (const window of BrowserWindow.getAllWindows()) window.close();
    } else app.exit(1);
  }

  app.on('browser-window-created', (_event, window) => {
    // Keep the test's own application window out of the user's way.
    window.on('show', () => window.hide());
    const errors = [];
    const policyViolations = [];
    window.webContents.on('console-message', (event) => {
      if (event.level === 'error' || event.level === 2) errors.push(event.message);
      if (/content security policy|violates.*directive|refused to (?:load|execute|connect)/i.test(event.message)) {
        // The familiar Electron *warning* about unsafe-inline is not a violation.
        if (!event.message.includes('Electron Security Warning')) policyViolations.push(event.message);
      }
    });
    window.webContents.once('did-fail-load', (_event, code, description) => {
      void finish({ ok: false, error: `Development renderer failed (${code}): ${description}` });
    });
    window.webContents.once('did-finish-load', async () => {
      try {
        await pause(800);
        const preferences = window.webContents.getLastWebPreferences();
        assert.equal(preferences.contextIsolation, true);
        assert.equal(preferences.nodeIntegration, false);
        assert.equal(preferences.sandbox, true);
        const renderer = await window.webContents.executeJavaScript(`(async () => {
          if (location.href !== 'http://127.0.0.1:5173/') throw new Error('Unexpected development URL.');
          if (!document.querySelector('#root')?.children.length) throw new Error('React did not mount.');
          if (!document.querySelector('.room-art')) throw new Error('The Room did not render.');
          if (typeof window.require !== 'undefined' || typeof window.process !== 'undefined') throw new Error('Node leaked to the renderer.');
          if (Object.keys(window.haven).sort().join(',') !== 'getPreferences,savePreferences') throw new Error('Unexpected bridge API.');
          await window.haven.getPreferences();
          return { title: document.title, url: location.href, react: 'mounted', bridge: 'available' };
        })()`);
        assert.equal(renderer.title, 'Little Haven — A Cozy Place to Breathe');
        assert.equal(window.getTitle(), 'Little Haven');
        assert.deepEqual(errors, [], `Renderer errors: ${errors.join('; ')}`);
        assert.deepEqual(policyViolations, [], `CSP violations: ${policyViolations.join('; ')}`);
        await finish({ ok: true, renderer, csp: 'no violations', isolation: 'verified' });
      } catch (error) {
        await finish({ ok: false, error: error.message });
      }
    });
  });
}

async function runDevelopmentSmoke() {
  assert.equal(await portIsOpen(), false, 'Port 5173 is already in use. Stop that server before running this smoke test.');
  const runDirectory = path.join(root, 'work', 'development-smoke', `${Date.now()}-${process.pid}`);
  const profile = path.join(runDirectory, 'profile');
  const reportFile = path.join(runDirectory, 'result.json');
  await mkdir(profile, { recursive: true });
  const environment = {
    ...process.env,
    LITTLE_HAVEN_DEVELOPMENT_SMOKE: '1',
    LITTLE_HAVEN_SMOKE_PROFILE: profile,
    LITTLE_HAVEN_SMOKE_REPORT: reportFile,
    NODE_OPTIONS: `${process.env.NODE_OPTIONS || ''} --import=${pathToFileURL(fileURLToPath(import.meta.url)).href}`.trim(),
  };
  delete environment.ELECTRON_RUN_AS_NODE;

  // Use the actual npm command so the documented entry point is exercised too.
  const command = process.platform === 'win32' ? (process.env.ComSpec || 'cmd.exe') : 'npm';
  const args = process.platform === 'win32' ? ['/d', '/s', '/c', 'npm run dev'] : ['run', 'dev'];
  const child = spawn(command, args, { cwd: root, env: environment, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  let output = '';
  let exited = false;
  const remember = (data) => { output = (output + data.toString()).slice(-24000); };
  child.stdout.on('data', remember);
  child.stderr.on('data', remember);
  const completion = new Promise((resolve) => {
    child.once('error', (error) => { exited = true; resolve({ code: null, error }); });
    child.once('exit', (code, signal) => { exited = true; resolve({ code, signal }); });
  });

  try {
    let report;
    const deadline = Date.now() + 45_000;
    while (Date.now() < deadline) {
      try {
        report = JSON.parse(await readFile(reportFile, 'utf8'));
        break;
      } catch (error) {
        if (error.code !== 'ENOENT' && !(error instanceof SyntaxError)) throw error;
      }
      if (exited) {
        const result = await completion;
        throw result.error || new Error('The development process exited before its renderer was verified.');
      }
      await pause(150);
    }
    assert.ok(report, 'Development startup timed out.');
    assert.equal(report.ok, true, report.error);
    let shutdownTimer;
    let result;
    try {
      result = await Promise.race([
        completion,
        new Promise((_resolve, reject) => {
          shutdownTimer = setTimeout(() => reject(new Error('Closing Electron did not stop the development process.')), 10_000);
        }),
      ]);
    } finally { clearTimeout(shutdownTimer); }
    if (result.error) throw result.error;
    assert.equal(result.code, 0, `Development exited with code ${result.code} (${result.signal || 'no signal'}).`);
    const stopDeadline = Date.now() + 5_000;
    while (await portIsOpen()) {
      assert.ok(Date.now() < stopDeadline, 'Vite still owns port 5173 after Electron closed.');
      await pause(150);
    }
    console.log(`Development smoke passed: ${JSON.stringify({ ...report, lifecycle: 'npm run dev → Vite + Electron → normal window close → Vite stopped' })}`);
  } catch (error) {
    console.error(output);
    throw error;
  } finally {
    if (!exited && child.pid) {
      // Cleanup is restricted to the process tree created by this test.
      if (process.platform === 'win32') {
        const cleanup = spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore', windowsHide: true });
        await new Promise((resolve) => { cleanup.once('exit', resolve); cleanup.once('error', resolve); });
      } else child.kill('SIGTERM');
    }
  }
}

if (hookEnabled) {
  if (process.versions.electron && process.type === 'browser') await instrumentDesktop();
} else {
  try { await runDevelopmentSmoke(); }
  catch (error) { console.error(`Development smoke failed: ${error.message}`); process.exitCode = 1; }
}
