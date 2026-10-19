import test from 'node:test';
import assert from 'node:assert/strict';
import { AmbientAudio } from '../src/services/ambientAudio.js';

function fakeParameter() {
  return {
    value: 0,
    targets: [],
    cancelAndHoldAtTime() {},
    setTargetAtTime(value) {
      this.targets.push(value);
      this.value = value;
    },
  };
}

function fakeContext() {
  const context = {
    sampleRate: 1000,
    currentTime: 0,
    state: 'suspended',
    destination: {},
    gains: [],
    nodes: [],
    createBufferSource() {
      const node = this.node();
      node.start = () => {
        node.started = true;
      };
      node.stop = () => {
        node.stopped = true;
      };
      this.source = node;
      return node;
    },
    node() {
      const node = {
        connect() {},
        disconnect() {
          this.disconnected = true;
        },
      };
      this.nodes.push(node);
      return node;
    },
    createBiquadFilter() {
      return Object.assign(this.node(), { frequency: { value: 0 }, Q: { value: 0 } });
    },
    createGain() {
      const gain = Object.assign(this.node(), { gain: fakeParameter() });
      this.gains.push(gain);
      return gain;
    },
    createBuffer(channels, length) {
      const data = Array.from({ length: channels }, () => new Float32Array(length));
      return { getChannelData: (channel) => data[channel] };
    },
    async resume() {
      this.state = 'running';
    },
    async suspend() {
      this.state = 'suspended';
    },
    async close() {
      this.state = 'closed';
    },
  };
  return context;
}

test('audio construction and preference updates cannot start playback', async () => {
  let contexts = 0;
  const audio = new AmbientAudio({
    contextFactory: () => {
      contexts += 1;
      return fakeContext();
    },
  });
  audio.setVolume(0.9);
  audio.setRain(false);
  assert.equal(contexts, 0);
  await audio.dispose();
  assert.equal(await audio.start(), false);
  assert.equal(contexts, 0);
});

test('explicit start uses quiet bounded gain, fades rain, and disposes every node', async () => {
  const context = fakeContext();
  let contexts = 0;
  const audio = new AmbientAudio({
    contextFactory: () => {
      contexts += 1;
      return context;
    },
  });
  assert.equal(await audio.start(), true);
  const [rain, master] = context.gains;
  assert.equal(master.gain.targets.at(-1), 0.25 * 0.25);
  audio.setVolume(8);
  assert.equal(master.gain.targets.at(-1), 0.25);
  audio.setVolume(NaN);
  assert.equal(master.gain.targets.at(-1), 0);
  audio.setRain(false);
  assert.equal(rain.gain.targets.at(-1), 0);
  audio.setRain(true);
  assert.equal(rain.gain.targets.at(-1), 1);
  audio.stop();
  assert.equal(master.gain.targets.at(-1), 0);
  assert.equal(await audio.start(), true);
  assert.equal(contexts, 1);
  await audio.dispose();
  assert.equal(context.source.stopped, true);
  assert.equal(context.state, 'closed');
  assert.ok(context.nodes.every((node) => node.disconnected));
  await audio.dispose();
});

test('a pending resume cannot turn sound back on after stop', async () => {
  const context = fakeContext();
  let finishResume;
  context.resume = () =>
    new Promise((resolve) => {
      finishResume = () => {
        context.state = 'running';
        resolve();
      };
    });
  const audio = new AmbientAudio({ contextFactory: () => context });
  const starting = audio.start();
  audio.stop();
  finishResume();
  assert.equal(await starting, false);
  assert.equal(context.gains[1].gain.targets.at(-1), 0);
  await audio.dispose();
});

test('unsupported or denied Web Audio returns a usable failure state', async () => {
  const unsupported = new AmbientAudio({ contextFactory: () => null });
  assert.equal(await unsupported.start(), false);
  await unsupported.dispose();
  const denied = new AmbientAudio({
    contextFactory: () => {
      throw new Error('unavailable');
    },
  });
  assert.equal(await denied.start(), false);
  await denied.dispose();
});
