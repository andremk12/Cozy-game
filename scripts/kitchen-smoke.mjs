// Four real Electron launches, with synthetic state and isolated profiles.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createKitchen } from '../shared/kitchen.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const work = path.join(root, 'work');
await mkdir(work, { recursive: true });
const profile = await mkdtemp(path.join(work, 'kitchen-smoke-'));
const sessionId = '11111111-1111-4111-8111-111111111111';
await writeFile(path.join(profile, 'kitchen.json'), JSON.stringify({
  version: 1,
  session: { id: sessionId, recipeId: 'tea', durationMs: 300000, elapsedMs: 298000,
    updatedAt: Date.now(), status: 'paused', presentation: 'closed', completedAt: null },
  settings: { lampOn: true, atmosphere: 'sunset', weather: 'clear', messagesEnabled: true,
    completionSoundEnabled: false, effectsEnabled: false },
}));
const environment = { ...process.env, HAVEN_KITCHEN_SMOKE_PROFILE: profile };
delete environment.ELECTRON_RUN_AS_NODE;
delete environment.LITTLE_HAVEN_DEV_URL;
const require = createRequire(import.meta.url);
const motionProfile = await mkdtemp(path.join(work, 'kitchen-smoke-motion-'));
await writeFile(path.join(motionProfile, 'kitchen.json'), JSON.stringify(createKitchen()));
await writeFile(path.join(motionProfile, 'preferences.json'), JSON.stringify({ companion: {
  enabled: true, name: 'Mochi Chef', appearance: 'ginger', soundEnabled: false, introduced: true,
} }));
for (const phase of ['paused', 'complete', 'restored', 'motion']) {
  await new Promise((resolve, reject) => {
    const child = spawn(require('electron'), [path.join(root, 'scripts/kitchen-smoke-main.mjs')], {
      cwd: root, env: { ...environment, HAVEN_KITCHEN_SMOKE_PHASE: phase,
        HAVEN_KITCHEN_SMOKE_PROFILE: phase === 'motion' ? motionProfile : profile }, stdio: 'inherit', windowsHide: true,
    });
    const timer = setTimeout(() => { child.kill(); reject(new Error(`Kitchen smoke ${phase} timed out.`)); }, phase === 'motion' ? 60_000 : 30_000);
    child.on('error', (error) => { clearTimeout(timer); reject(error); });
    child.on('exit', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(); else reject(new Error(`Kitchen smoke ${phase} exited ${code}.`));
    });
  });
}
console.log('Kitchen desktop smoke passed: persistence, minimized time, one completion, native walking/speech, recipe book and contextual fullscreen Escape.');
