import test from 'node:test';
import assert from 'node:assert/strict';
import { AudioEngine } from '../src/services/audio/AudioEngine.js';
import { createKitchenEffect, KITCHEN_EFFECT_SECONDS } from '../src/services/audio/kitchenEffects.js';
import { createPresetMix } from '../shared/audio.js';
import { fakeAudioContext } from './audio-fixture.js';

function silentMix() {
  const mix = createPresetMix('custom');
  for (const layer of Object.values(mix.layers)) layer.enabled = false;
  mix.layers['kitchen-effects'] = { enabled: true, volume: 1 };
  return mix;
}

test('every original kitchen effect is finite, quiet, nonempty and fades at both ends', () => {
  const context = fakeAudioContext();
  const seen = new Set();
  for (const [kind, seconds] of Object.entries(KITCHEN_EFFECT_SECONDS)) {
    const buffer = createKitchenEffect(context, kind);
    assert.equal(buffer.length, Math.ceil(seconds * context.sampleRate));
    const samples = buffer.getChannelData(0);
    assert.ok(samples.some((sample) => Math.abs(sample) > 0.0001));
    assert.ok(samples.every((sample) => Number.isFinite(sample) && Math.abs(sample) <= 0.160001));
    assert.equal(samples[0], 0);
    assert.equal(samples.at(-1), 0);
    const signature = [...samples.slice(1, 20)].join(',');
    assert.equal(seen.has(signature), false);
    seen.add(signature);
  }
  assert.throws(() => createKitchenEffect(context, 'unknown'), TypeError);
});

test('effects cannot create or resume audio and share the existing master after activation', async () => {
  const context = fakeAudioContext();
  let contexts = 0;
  let resumes = 0;
  context.resume = async () => { resumes += 1; context.state = 'running'; };
  const audio = new AudioEngine({ contextFactory: () => { contexts += 1; return context; } });
  audio.setScene('kitchen');
  audio.setMix(silentMix());
  assert.equal(audio.playKitchenEffect('completion'), false);
  assert.equal(contexts, 0);
  await audio.start();
  const targets = [];
  const originalCreateSource = context.createBufferSource;
  context.createBufferSource = function () {
    const source = originalCreateSource.call(this);
    source.connect = (target) => targets.push(target);
    return source;
  };
  for (const kind of Object.keys(KITCHEN_EFFECT_SECONDS)) assert.equal(audio.playKitchenEffect(kind), true);
  assert.equal(contexts, 1);
  assert.equal(resumes, 1);
  assert.equal(context.gains.length, 2);
  assert.ok(targets.every((target) => target === context.gains[1]));
  assert.equal(context.gains[1].gain.targets.at(-1), 1);
  assert.ok(context.sources.every((source) => source.started && source.loop === false));
  assert.equal(audio.playKitchenEffect('completion'), false, 'an active effect is never stacked with itself');
  const bell = context.sources[0];
  bell.onended();
  assert.equal(bell.buffer, null);
  assert.equal(bell.disconnected, true);
  assert.equal(bell.onended, null);
  assert.equal(audio._effects.size, 3);
  await audio.dispose();
  assert.equal(audio._effects.size, 0);
  assert.ok(context.nodes.every((node) => node.disconnected));
  assert.ok(context.sources.every((source) => source.buffer === null));
  assert.equal(audio.playKitchenEffect('completion'), false);
});

test('mute, zero volume, stop and a suspended context prevent late kitchen sound', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const context = fakeAudioContext();
  const audio = new AudioEngine({ contextFactory: () => context });
  audio.setScene('kitchen');
  const mix = silentMix();
  audio.setMix(mix);
  await audio.start();
  audio.playKitchenEffect('kettle');
  const kettle = context.sources.at(-1);
  audio.setMix({ ...mix, muted: true });
  assert.equal(kettle.stopped, true);
  assert.equal(kettle.buffer, null);
  assert.equal(audio.playKitchenEffect('completion'), false);
  audio.setMix(mix);
  assert.equal(context.sources.length, 1, 'unmuting must not replay a skipped effect');
  audio.playKitchenEffect('simmer');
  const simmer = context.sources.at(-1);
  audio.setVolume(0);
  assert.equal(simmer.stopped, true);
  assert.equal(audio.playKitchenEffect('completion'), false);
  audio.setVolume(0.25);
  context.state = 'suspended';
  assert.equal(audio.playKitchenEffect('completion'), false);
  assert.equal(context.state, 'suspended');
  context.state = 'running';
  assert.equal(audio.playKitchenEffect('utensil'), true);
  const utensil = context.sources.at(-1);
  audio.stop();
  assert.equal(utensil.stopped, true);
  assert.equal(audio.playKitchenEffect('completion'), false);
  t.mock.timers.tick(850);
  assert.equal(context.state, 'suspended');
  await audio.dispose();
});

test('a failed effect allocation releases its source without breaking the shared engine', async () => {
  const context = fakeAudioContext();
  const audio = new AudioEngine({ contextFactory: () => context });
  audio.setScene('kitchen');
  audio.setMix(silentMix());
  await audio.start();
  const createBuffer = context.createBuffer;
  context.createBuffer = () => { throw new Error('Synthetic allocation failure'); };
  assert.equal(audio.playKitchenEffect('completion'), false);
  assert.equal(audio._effects.size, 0);
  assert.equal(context.sources.at(-1).disconnected, true);
  context.createBuffer = createBuffer;
  assert.equal(audio.playKitchenEffect('completion'), true);
  await audio.dispose();
});

test('the independent kitchen effects control scales its bus and suppresses disabled or zero effects without replay', async () => {
  const context = fakeAudioContext();
  const audio = new AudioEngine({ contextFactory: () => context });
  audio.setScene('kitchen');
  const mix = silentMix();
  mix.layers['kitchen-effects'].volume = 0.15;
  mix.layers['kitchen-music'].volume = 0.3;
  audio.setMix(mix);
  await audio.start();
  assert.equal(audio.playKitchenEffect('kettle'), true);
  const bus = context.gains[1];
  const kettle = context.sources.at(-1);
  assert.equal(bus.gain.targets.at(-1), 0.15);
  assert.equal(context.gains[0].gain.targets.at(-1), 0.25 * 0.25);
  mix.layers['kitchen-effects'].volume = 0.4;
  audio.setMix(mix);
  assert.equal(bus.gain.targets.at(-1), 0.4);
  assert.equal(audio._mix.layers['kitchen-music'].volume, 0.3);
  mix.layers['kitchen-effects'].enabled = false;
  audio.setMix(mix);
  assert.equal(kettle.stopped, true);
  assert.equal(audio.playKitchenEffect('completion'), false);
  mix.layers['kitchen-effects'] = { enabled: true, volume: 0 };
  audio.setMix(mix);
  assert.equal(audio.playKitchenEffect('utensil'), false);
  mix.layers['kitchen-effects'].volume = 0.15;
  audio.setMix(mix);
  assert.equal(context.sources.length, 1, 'Re-enabling the bus never plays a skipped effect.');
  assert.equal(audio.playKitchenEffect('simmer'), true);
  await audio.dispose();
});
