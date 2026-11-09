// Run after npm run build. All content and destinations are synthetic.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const environment = { ...process.env };
delete environment.ELECTRON_RUN_AS_NODE;
delete environment.LITTLE_HAVEN_DEV_URL;
const require = createRequire(import.meta.url);
const child = spawn(require('electron'), [path.join(root, 'scripts/bouquets-smoke-main.mjs')], {
  cwd: root, env: environment, stdio: 'inherit', windowsHide: true,
});
const timer = setTimeout(() => { child.kill(); process.exitCode = 1; console.error('Bouquet desktop smoke timed out.'); }, 45_000);
child.on('error', (error) => { clearTimeout(timer); console.error(error.message); process.exitCode = 1; });
child.on('exit', (code) => { clearTimeout(timer); process.exitCode = code ?? 1; });
