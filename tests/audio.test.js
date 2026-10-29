import test from 'node:test';
import assert from 'node:assert/strict';
import { AudioEngine, MAX_MASTER_GAIN } from '../src/services/audio/AudioEngine.js';
import { createPresetMix } from '../shared/audio.js';
import { createProceduralBuffer, prepareLoop, SAMPLE_CEILING } from '../src/services/audio/AudioLayer.js';
import { fakeAudioContext as fakeContext } from './audio-fixture.js';

function proceduralMix() {
  const mix = createPresetMix('rainy-evening');
  mix.layers.fire.enabled = false;
  return mix;
}

test('restoring mix, mute and master volume cannot create or resume an AudioContext', async () => {
  let contexts = 0;
  const audio = new AudioEngine({ contextFactory: () => { contexts += 1; return fakeContext(); } });
  audio.setVolume(0.9);
  audio.setMix({ ...createPresetMix('quiet-night'), muted: true });
  audio.setMix(proceduralMix());
  assert.equal(contexts, 0);
  await audio.dispose();
  assert.equal(await audio.start(), false);
  assert.equal(contexts, 0);
});

test('independent layers keep their sources and gains while master and mute preserve their mix', async () => {
  const context = fakeContext();
  let contexts = 0;
  const audio = new AudioEngine({ contextFactory: () => { contexts += 1; return context; } });
  const mix = proceduralMix();
  audio.setMix(mix);
  assert.equal(await audio.start(), true);
  assert.equal(context.sources.length, 2);
  const [master, rain, wind] = context.gains;
  assert.equal(master.gain.targets.at(-1), 0.25 * MAX_MASTER_GAIN);
  assert.equal(rain.gain.targets.at(-1), 0.4);
  assert.equal(wind.gain.targets.at(-1), 0.15);
  const windUpdates = wind.gain.targets.length;
  mix.layers['rain-soft'].volume = 0.25;
  audio.setMix(mix);
  assert.equal(rain.gain.targets.at(-1), 0.25);
  assert.equal(wind.gain.targets.length, windUpdates);
  audio.setVolume(8);
  assert.equal(master.gain.targets.at(-1), MAX_MASTER_GAIN);
  audio.setMix({ ...mix, muted: true });
  assert.equal(master.gain.targets.at(-1), 0);
  assert.equal(master.gain.times.at(-1), 0.025);
  assert.equal(rain.gain.targets.at(-1), 0.25);
  audio.setMix({ ...mix, muted: false });
  assert.equal(master.gain.targets.at(-1), MAX_MASTER_GAIN);
  audio.setVolume(NaN);
  assert.equal(master.gain.targets.at(-1), 0);
  assert.equal(context.sources.length, 2);
  assert.equal(contexts, 1);
  await audio.dispose();
  assert.ok(context.sources.every((source) => source.stopped && source.buffer === null));
  assert.ok(context.nodes.every((node) => node.disconnected));
  assert.equal(context.state, 'closed');
  await audio.dispose();
});

test('zero gain is exact and temporary layer toggles cancel release without restarting audio', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const context = fakeContext();
  const audio = new AudioEngine({ contextFactory: () => context });
  const mix = proceduralMix();
  audio.setMix(mix);
  await audio.start();
  const rain = context.sources[0];
  mix.layers['rain-soft'].volume = 0;
  audio.setMix(mix);
  assert.equal(context.gains[1].gain.targets.at(-1), 0);
  assert.equal(audio._mix.layers['rain-soft'].enabled, true);
  t.mock.timers.tick(100);
  mix.layers['rain-soft'].volume = 0.3;
  audio.setMix(mix);
  t.mock.timers.tick(850);
  assert.equal(rain.stopped, undefined);
  assert.equal(context.sources.length, 2);
  mix.layers['rain-soft'].enabled = false;
  audio.setMix(mix);
  t.mock.timers.tick(850);
  assert.equal(rain.stopped, true);
  assert.equal(rain.buffer, null);
  audio.stop();
  t.mock.timers.tick(850);
  assert.equal(context.state, 'suspended');
  assert.ok(context.sources.every((source) => source.stopped));
  await audio.dispose();
});

test('a pending user activation cannot create sources after stop or disposal', async () => {
  const context = fakeContext();
  let finishResume;
  context.resume = () => new Promise((resolve) => {
    finishResume = () => { context.state = 'running'; resolve(); };
  });
  const audio = new AudioEngine({ contextFactory: () => context });
  audio.setMix(proceduralMix());
  const starting = audio.start();
  audio.stop();
  finishResume();
  assert.equal(await starting, false);
  assert.equal(context.sources.length, 0);
  await audio.dispose();
});

test('unsupported or denied Web Audio has a recoverable, silent failure', async () => {
  const unsupported = new AudioEngine({ contextFactory: () => null });
  assert.equal(await unsupported.start(), false);
  await unsupported.dispose();
  const denied = new AudioEngine({ contextFactory: () => { throw new Error('Synthetic denial'); } });
  assert.equal(await denied.start(), false);
  await denied.dispose();
});

test('all procedural textures and decoded recordings are bounded continuous loop buffers', () => {
  const context = fakeContext();
  let seed = 12345;
  const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (const id of ['rain-soft', 'rain-heavy', 'rain-window', 'wind', 'leaves']) {
    const buffer = createProceduralBuffer(context, id, random);
    for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
      const samples = buffer.getChannelData(channel);
      assert.ok(samples.some((sample) => Math.abs(sample) > 0.00001), `${id} must contain real samples`);
      assert.ok(samples.every((sample) => Number.isFinite(sample) && Math.abs(sample) <= SAMPLE_CEILING + 0.000001));
    }
  }
  const input = context.createBuffer(1, 4000);
  input.getChannelData(0).fill(1);
  const prepared = prepareLoop(context, input);
  assert.equal(prepared.length, 3250);
  assert.ok(prepared.getChannelData(0).every((sample) => Math.abs(sample - SAMPLE_CEILING) < 0.000001));
});
