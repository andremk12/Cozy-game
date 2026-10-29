import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const environment = { ...process.env };
delete environment.ELECTRON_RUN_AS_NODE;
delete environment.LITTLE_HAVEN_DEV_URL;
// Both processes use one synthetic profile selected here, never a caller path.
environment.HAVEN_MEMORY_SMOKE_PROFILE_ID = randomUUID();

async function runPhase(phase) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (code) => { if (!settled) { settled = true; clearTimeout(timeout); resolve(code); } };
    const child = spawn(require('electron'), [path.join(root, 'scripts/memory-smoke-main.mjs')], {
      cwd: root, env: { ...environment, HAVEN_MEMORY_SMOKE_PHASE: String(phase) }, stdio: 'inherit', windowsHide: true,
    });
    const timeout = setTimeout(() => {
      child.kill();
      console.error(`Memory Corner smoke phase ${phase} timed out.`);
      finish(1);
    }, 90_000);
    child.once('error', (error) => { console.error(error.message); finish(1); });
    child.once('exit', (code) => finish(code ?? 1));
  });
}

for (const phase of [1, 2]) {
  const code = await runPhase(phase);
  if (code !== 0) { process.exitCode = code; break; }
}
