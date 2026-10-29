// Optional local visual/performance audit. No production or personal profile is used.
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { createGarden, gardenReducer, PLANT_SLOTS, SPECIES } from '../shared/garden.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const address = 'http://127.0.0.1:4174';
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4174', '--strictPort'], {
  cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
});
let browser;
try {
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Preview did not start.')), 10_000);
    server.once('error', reject);
    server.once('exit', (code) => { clearTimeout(timeout); reject(new Error(`Preview exited: ${code}`)); });
    server.stdout.on('data', (data) => { if (String(data).includes('4174')) { clearTimeout(timeout); resolve(); } });
    server.stderr.on('data', (data) => process.stderr.write(data));
  });
  browser = await chromium.launch({ channel: process.env.HAVEN_TEST_BROWSER || 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, reducedMotion: 'no-preference' });
  const rendererErrors = [];
  page.on('pageerror', (error) => rendererErrors.push(error.message));
  let garden = createGarden();
  for (const [index, slot] of PLANT_SLOTS.entries()) garden = gardenReducer(garden, { type: 'plant', slotId: slot.id, species: SPECIES[index % SPECIES.length].id }, Date.now() - 1_200_100);
  garden = gardenReducer(garden, { type: 'decorate', slotId: 'accent-2', kind: 'mushroom' });
  garden = gardenReducer(garden, { type: 'decorate', slotId: 'accent-3', kind: 'stone' });
  garden = gardenReducer(garden, { type: 'atmosphere', value: 'night' });
  garden = gardenReducer(garden, { type: 'weather', value: 'rain' });
  await page.addInitScript((snapshot) => localStorage.setItem('haven.garden.v1', JSON.stringify(snapshot)), garden);
  await page.goto(address);
  await page.getByRole('button', { name: 'The Garden', exact: true }).click();
  await page.locator('svg.garden-art').waitFor();
  await page.waitForTimeout(1500);
  await mkdir(path.join(root, 'outputs'), { recursive: true });
  await page.screenshot({ path: path.join(root, 'outputs', 'Little-Haven-Garden-grown-night.png'), fullPage: true });
  const metrics = await page.evaluate(() => new Promise((resolve) => {
    const deltas = [];
    const longTasks = [];
    let mutations = 0;
    const mutationObserver = new MutationObserver((records) => { mutations += records.length; });
    mutationObserver.observe(document.querySelector('svg.garden-art'), { childList: true, subtree: true, attributes: true });
    const observer = new PerformanceObserver((list) => longTasks.push(...list.getEntries().map(({ duration }) => duration)));
    observer.observe({ type: 'longtask' });
    const start = performance.now();
    let previous = start;
    function frame(now) {
      deltas.push(now - previous);
      previous = now;
      if (now - start < 60_000) { requestAnimationFrame(frame); return; }
      observer.disconnect(); mutationObserver.disconnect();
      const sorted = [...deltas].sort((a, b) => a - b);
      resolve({ durationMs: now - start, frames: deltas.length, averageFps: deltas.length * 1000 / (now - start),
        p95FrameMs: sorted[Math.floor(sorted.length * .95)], framesOver33ms: deltas.filter((value) => value > 33.5).length,
        longTasksMs: longTasks, svgMutations: mutations, svgElements: document.querySelectorAll('svg.garden-art *').length,
        viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio }, hardwareConcurrency: navigator.hardwareConcurrency });
    }
    requestAnimationFrame(frame);
  }));
  await page.getByRole('button', { name: 'Luz e clima', exact: true }).click();
  await page.getByRole('combobox', { name: 'Período do dia' }).selectOption('day');
  await page.getByRole('combobox', { name: 'Clima do jardim' }).selectOption('clear');
  await page.getByRole('button', { name: 'Fechar', exact: true }).click();
  await page.screenshot({ path: path.join(root, 'outputs', 'Little-Haven-Garden-grown-day.png'), fullPage: true });
  const initialCount = await page.locator('svg.garden-art *').count();
  for (let index = 0; index < 20; index += 1) {
    await page.getByRole('button', { name: 'The Room', exact: true }).click();
    await page.getByRole('button', { name: 'The Garden', exact: true }).click();
  }
  const report = { date: new Date().toISOString(), environment: { platform: os.platform(), release: os.release(), cpu: os.cpus()[0]?.model,
    memoryGiB: Math.round(os.totalmem() / 1024 ** 3), node: process.version, browser: browser.version(), headless: true },
    scenario: '8 adult plants, 6 decorations, night, rain, fireflies and fish; audio disabled', metrics,
    navigation: { repetitions: 20, initialElements: initialCount, finalElements: await page.locator('svg.garden-art *').count() }, rendererErrors };
  await writeFile(path.join(root, 'outputs', 'garden-performance.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  if (rendererErrors.length) process.exitCode = 1;
} finally {
  await browser?.close();
  server.kill();
}
