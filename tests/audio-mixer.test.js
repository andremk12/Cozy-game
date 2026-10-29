import test from 'node:test';
import assert from 'node:assert/strict';
import { AudioEngine } from '../src/services/audio/AudioEngine.js';
import { AUDIO_LAYER_IDS, createPresetMix } from '../shared/audio.js';
import { fakeAudioContext, deferred } from './audio-fixture.js';

function onlyLayer(id) {
  const mix = createPresetMix('custom');
  for (const key of AUDIO_LAYER_IDS) mix.layers[key] = { enabled: key === id, volume: 0.5 };
  return mix;
}

test('a disabled recording finishing its lazy decode never starts or retains nodes', async () => {
  const context = fakeAudioContext();
  const decoded = deferred();
  const states = [];
  const audio = new AudioEngine({ contextFactory: () => context, recordingLoader: () => decoded.promise,
    onStateChange: (state) => states.push(state) });
  const mix = onlyLayer('birds');
  audio.setMix(mix);
  const starting = audio.start();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(states.at(-1).layers.birds, 'loading');
  mix.layers.birds.enabled = false;
  audio.setMix(mix);
  decoded.resolve(context.createBuffer(1, 4000));
  assert.equal(await starting, true);
  assert.equal(context.sources.length, 0);
  assert.equal(states.at(-1).layers.birds, 'idle');
  assert.equal(context.gains[1].disconnected, true);
  await audio.dispose();
  assert.ok(context.nodes.every((node) => node.disconnected));
});

test('stop or disposal during lazy loading prevents orphan sources and stale status updates', async () => {
  for (const action of ['stop', 'dispose']) {
    const context = fakeAudioContext();
    const decoded = deferred();
    const states = [];
    const audio = new AudioEngine({ contextFactory: () => context, recordingLoader: () => decoded.promise,
      onStateChange: (state) => states.push(state) });
    audio.setMix(onlyLayer('fire'));
    const starting = audio.start();
    await Promise.resolve();
    await Promise.resolve();
    await audio[action]();
    const updates = states.length;
    decoded.resolve(context.createBuffer(1, 4000));
    assert.equal(await starting, false);
    assert.equal(context.sources.length, 0);
    if (action === 'dispose') assert.equal(states.length, updates);
    await audio.dispose();
    assert.ok(context.nodes.every((node) => node.disconnected));
  }
});

test('rapid preset changes share pending recordings and use the most recent gain', async () => {
  const context = fakeAudioContext();
  const decoded = deferred();
  let loads = 0;
  const audio = new AudioEngine({ contextFactory: () => context,
    recordingLoader: () => { loads += 1; return decoded.promise; } });
  const mix = onlyLayer('birds');
  audio.setMix(mix);
  const starting = audio.start();
  await Promise.resolve();
  await Promise.resolve();
  for (const volume of [0.2, 0.7, 0, 0.1, 0.6]) {
    mix.layers.birds.volume = volume;
    audio.setMix(mix);
  }
  decoded.resolve(context.createBuffer(1, 4000));
  assert.equal(await starting, true);
  assert.equal(loads, 1);
  assert.equal(context.sources.length, 1);
  assert.equal(context.gains[1].gain.targets.at(-1), 0.6);
  await audio.dispose();
});

test('decode failure leaves other layers playing and a later toggle can retry', async () => {
  const context = fakeAudioContext();
  let fail = true;
  let last;
  const audio = new AudioEngine({ contextFactory: () => context,
    recordingLoader: async () => {
      if (fail) throw new Error('Synthetic decode failure');
      return context.createBuffer(1, 4000);
    }, onStateChange: (state) => { last = state; } });
  const mix = createPresetMix('rainy-evening');
  audio.setMix(mix);
  assert.equal(await audio.start(), true);
  assert.equal(last.layers.fire, 'error');
  assert.equal(last.layers['rain-soft'], 'playing');
  assert.equal(last.layers.wind, 'playing');
  assert.ok(last.error);
  assert.equal(context.gains.at(-1).disconnected, true);
  fail = false;
  mix.layers.fire.enabled = false;
  audio.setMix(mix);
  mix.layers.fire.enabled = true;
  audio.setMix(mix);
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(last.layers.fire, 'playing');
  assert.equal(last.error, '');
  await audio.dispose();
});

test('partial gain allocation failure releases nodes and does not interrupt existing sources', async () => {
  const context = fakeAudioContext();
  const createGain = context.createGain.bind(context);
  let allocations = 0;
  context.createGain = () => {
    const gain = createGain();
    allocations += 1;
    if (allocations === 3) gain.connect = () => { throw new Error('Synthetic allocation failure'); };
    return gain;
  };
  let last;
  const audio = new AudioEngine({ contextFactory: () => context, onStateChange: (state) => { last = state; } });
  const mix = onlyLayer('rain-soft');
  mix.layers.wind.enabled = true;
  audio.setMix(mix);
  assert.equal(await audio.start(), true);
  assert.equal(last.layers['rain-soft'], 'playing');
  assert.equal(last.layers.wind, 'error');
  assert.equal(context.gains[2].disconnected, true);
  await audio.dispose();
  assert.ok(context.nodes.every((node) => node.disconnected));
});

test('a failed initial graph and rejected suspend/resume do not prevent an explicit retry', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const broken = fakeAudioContext();
  broken.createGain = () => { throw new Error('Synthetic graph failure'); };
  const context = fakeAudioContext();
  let attempts = 0;
  const audio = new AudioEngine({ contextFactory: () => (++attempts === 1 ? broken : context) });
  audio.setMix(onlyLayer('rain-soft'));
  assert.equal(await audio.start(), false);
  assert.equal(broken.state, 'closed');
  context.resume = async () => { throw new Error('Synthetic resume denial'); };
  assert.equal(await audio.start(), false);
  context.resume = async () => { context.state = 'running'; };
  assert.equal(await audio.start(), true);
  context.suspend = async () => { throw new Error('Synthetic suspend denial'); };
  audio.stop();
  t.mock.timers.tick(850);
  await Promise.resolve();
  assert.ok(context.sources.every((source) => source.stopped));
  assert.equal(await audio.start(), true);
  assert.equal(attempts, 2);
  await audio.dispose();
});
