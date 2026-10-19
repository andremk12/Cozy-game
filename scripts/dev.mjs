import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const electronExecutable = require('electron');
const viteExecutable = path.join(root, 'node_modules/vite/bin/vite.js');
const environment = { ...process.env, LITTLE_HAVEN_DEV_URL: 'http://127.0.0.1:5173' };
// Some terminals and editor hosts set this for their own child Node processes.
delete environment.ELECTRON_RUN_AS_NODE;
let vite;
let desktop;
let stopping = false;

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of [desktop, vite]) {
    if (!child || child.exitCode !== null || !child.pid) continue;
    if (process.platform === 'win32') {
      // Electron has helper processes. Limit tree cleanup to our own child PID.
      spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore', windowsHide: true })
        .on('error', () => child.kill());
    } else child.kill();
  }
  process.exitCode = code;
}

process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
process.on('exit', () => stop());

try {
  vite = spawn(process.execPath, [viteExecutable, '--host', '127.0.0.1', '--port', '5173', '--strictPort'], {
    cwd: root, env: environment, stdio: 'inherit', windowsHide: true,
  });
  vite.on('error', (error) => { console.error(`Could not start the room: ${error.message}`); stop(1); });
  vite.on('exit', (code) => { if (!stopping) stop(code || 1); });

  const deadline = Date.now() + 30_000;
  let ready = false;
  while (!stopping && Date.now() < deadline) {
    try {
      const response = await fetch(environment.LITTLE_HAVEN_DEV_URL, { signal: AbortSignal.timeout(1000) });
      ready = response.ok;
    } catch { /* The local server is still starting. */ }
    if (ready) break;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  if (!ready || stopping) throw new Error('The local development server did not become ready.');
  desktop = spawn(electronExecutable, ['.'], {
    cwd: root, env: environment, stdio: 'inherit', windowsHide: true,
  });
  desktop.on('error', (error) => { console.error(`Could not open Little Haven: ${error.message}`); stop(1); });
  desktop.on('exit', (code) => stop(code || 0));
} catch (error) {
  console.error(error.message);
  stop(1);
}
