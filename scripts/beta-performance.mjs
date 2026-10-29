// Local production Electron audit. Run after npm run build; no personal profile.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { access, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
await access(path.join(root, 'dist', 'index.html'));
await mkdir(path.join(root, 'work'), { recursive: true });
const environment = { ...process.env };
delete environment.ELECTRON_RUN_AS_NODE;
delete environment.LITTLE_HAVEN_DEV_URL;
const child = spawn(require('electron'), [path.join(root, 'scripts/beta-performance-main.mjs')], {
  cwd: root, env: environment, stdio: 'inherit', windowsHide: true,
});
const timeout = setTimeout(() => {
  child.kill();
  process.exitCode = 1;
  console.error('Beta performance audit timed out.');
}, 100_000);
child.on('error', (error) => { clearTimeout(timeout); console.error(error.message); process.exitCode = 1; });
child.on('exit', (code) => { clearTimeout(timeout); process.exitCode = code ?? 1; });
