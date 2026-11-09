import test from 'node:test';
import assert from 'node:assert/strict';
import { AudioEngine, MAX_MASTER_GAIN } from '../src/services/audio/AudioEngine.js';
import { AUDIO_LAYERS } from '../src/services/audio/audioLibrary.js';
import { prepareLoop, SAMPLE_CEILING } from '../src/services/audio/AudioLayer.js';
import { createPresetMix, normalizeMixer, validateMixer } from '../shared/audio.js';
import { fakeAudioContext, deferred } from './audio-fixture.js';

const settle = () => new Promise((resolve) => setImmediate(resolve));

test('old v1 mixes retain all existing choices and gain only safe music/effects defaults', () => {
  const old = createPresetMix('custom');
  old.muted = true;
  old.layers.birds = { enabled: true, volume: 0.27 };
  old.customLayers.fire = { enabled: true, volume: 0.51 };
  for (const layers of [old.layers, old.customLayers]) {
    delete layers['kitchen-music'];
    delete layers['kitchen-effects'];
  }
  const migrated = normalizeMixer(old);
  assert.deepEqual(migrated.layers.birds, old.layers.birds);
  assert.deepEqual(migrated.customLayers.fire, old.customLayers.fire);
  assert.equal(migrated.muted, true);
  assert.equal(migrated.preset, 'custom');
  assert.deepEqual(migrated.layers['kitchen-music'], { enabled: false, volume: 0.3 });
  assert.deepEqual(migrated.layers['kitchen-effects'], { enabled: true, volume: 1 });
  assert.deepEqual(validateMixer(migrated), migrated);
  const kitchen = createPresetMix('cozy-kitchen', migrated);
  assert.equal(kitchen.layers['rain-soft'].enabled, false);
  assert.equal(kitchen.layers['rain-window'].enabled, false);
  assert.deepEqual(kitchen.layers['kitchen-music'], { enabled: true, volume: 0.3 });
  assert.deepEqual(createPresetMix('custom', kitchen).layers, migrated.customLayers);
});

test('composed loop keeps stereo, exact musical duration and one decoded allocation', () => {
  const context = fakeAudioContext();
  const buffer = context.createBuffer(2, 192000);
  buffer.getChannelData(0).fill(0.12);
  buffer.getChannelData(1).fill(-0.18);
  assert.equal(prepareLoop(context, buffer, 0), buffer);
  assert.equal(buffer.length / buffer.sampleRate, 192);
  assert.equal(buffer.getChannelData(1)[192], Math.fround(-0.18));
  buffer.getChannelData(0)[25] = 0.8;
  prepareLoop(context, buffer, 0);
  assert.ok(buffer.getChannelData(0)[25] <= SAMPLE_CEILING + 1e-6);
  const continuousCount = AUDIO_LAYERS.filter(({ source }) => source !== 'effects').length;
  assert.equal(continuousCount, 13);
  assert.ok((continuousCount * SAMPLE_CEILING + 4 * 0.16) * MAX_MASTER_GAIN < 1);
});

test('scene eligibility never grants consent; source survives gain/mute and is released on exit', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const context = fakeAudioContext();
  let contexts = 0;
  let decodes = 0;
  const states = [];
  const audio = new AudioEngine({ contextFactory: () => { contexts++; return context; },
    recordingLoader: async () => { decodes++; return context.createBuffer(2, 192000); },
    onStateChange: (state) => states.push(state) });
  const mix = createPresetMix('cozy-kitchen');
  audio.setMix(mix);
  audio.setScene('kitchen');
  assert.equal(contexts, 0);
  await audio.start();
  const source = context.sources[0];
  assert.equal(source.buffer.length, 192000);
  mix.layers['kitchen-music'].volume = 0.21;
  audio.setMix(mix);
  audio.setMix({ ...mix, muted: true });
  assert.equal(context.gains[0].gain.targets.at(-1), 0);
  assert.equal(context.gains[1].gain.targets.at(-1), 0.21);
  audio.setMix(mix);
  audio.setScene('journey');
  assert.equal(context.gains[1].gain.targets.at(-1), 0);
  assert.equal(states.at(-1).layers['kitchen-music'], 'idle');
  t.mock.timers.tick(400);
  audio.setScene('kitchen');
  t.mock.timers.tick(850);
  assert.equal(source.stopped, undefined);
  assert.equal(decodes, 1);
  assert.equal(context.sources.length, 1);
  audio.setScene('room');
  t.mock.timers.tick(850);
  assert.equal(source.stopped, true);
  assert.equal(source.buffer, null);
  assert.equal(contexts, 1);
  await audio.dispose();
  assert.ok(context.nodes.every((node) => node.disconnected));
});

test('a slow music decode is shared across released/recreated layers and starts only the current one', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const context = fakeAudioContext();
  const decoded = deferred();
  let loads = 0;
  const audio = new AudioEngine({ contextFactory: () => context,
    recordingLoader: () => { loads++; return decoded.promise; } });
  audio.setScene('kitchen');
  audio.setMix(createPresetMix('cozy-kitchen'));
  const starting = audio.start();
  await settle();
  audio.setScene('garden');
  t.mock.timers.tick(850);
  audio.setScene('kitchen');
  await settle();
  assert.equal(loads, 1);
  decoded.resolve(context.createBuffer(2, 192000));
  await starting;
  await settle();
  assert.equal(context.sources.length, 1);
  assert.equal(audio._pendingRecordings.size, 0);
  await audio.dispose();
});

test('music finishing a decode outside the kitchen remains silent and releases its nodes', async () => {
  const context = fakeAudioContext();
  const decoded = deferred();
  const audio = new AudioEngine({ contextFactory: () => context, recordingLoader: () => decoded.promise });
  audio.setScene('kitchen');
  audio.setMix(createPresetMix('cozy-kitchen'));
  const starting = audio.start();
  await settle();
  audio.setScene('memory');
  decoded.resolve(context.createBuffer(2, 192000));
  await starting;
  assert.equal(context.sources.length, 0);
  assert.equal(audio._layers.size, 0);
  await audio.dispose();
});

test('a failed effects bus connection disconnects its partial graph and permits an explicit retry', async () => {
  const context = fakeAudioContext();
  const audio = new AudioEngine({ contextFactory: () => context });
  const mix = createPresetMix('cozy-kitchen');
  mix.layers['kitchen-music'].enabled = false;
  audio.setMix(mix);
  audio.setScene('kitchen');
  await audio.start();
  const createGain = context.createGain.bind(context);
  context.createGain = () => {
    const gain = createGain();
    gain.connect = () => { throw new Error('Synthetic effects allocation failure'); };
    return gain;
  };
  assert.equal(audio.playKitchenEffect('completion'), false);
  assert.equal(context.gains[1].disconnected, true);
  assert.equal(context.sources.length, 0);
  context.createGain = createGain;
  assert.equal(audio.playKitchenEffect('completion'), true);
  assert.equal(context.sources.length, 1);
  await audio.dispose();
  assert.ok(context.nodes.every((node) => node.disconnected));
});
