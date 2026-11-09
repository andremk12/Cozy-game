import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { readPcm16Wav, measurePcm } from '../scripts/audio-metrics.mjs';
import { prepareLoop } from '../src/services/audio/AudioLayer.js';

const root = new URL('../public/assets/audio/', import.meta.url);
const context = {
  createBuffer(channels, length, sampleRate) {
    const data = Array.from({ length: channels }, () => new Float32Array(length));
    return { length, sampleRate, numberOfChannels: channels, getChannelData: (channel) => data[channel] };
  },
};
const load = async (id) => {
  const bytes = await readFile(new URL(`${id}.wav`, root));
  const audio = readPcm16Wav(bytes);
  return { bytes, audio };
};
const asBuffer = (audio) => ({ length: audio.length, numberOfChannels: audio.channels,
  sampleRate: audio.rate, getChannelData: (channel) => audio.samples[channel] });

test('revised environmental assets retain provenance, headroom and a seamless 48-second playback cycle', async () => {
  const manifest = JSON.parse(await readFile(new URL('manifest.json', root), 'utf8'));
  for (const id of ['leaves', 'train-track', 'train-wheels', 'carriage']) {
    const { bytes, audio } = await load(id);
    const entry = manifest.find((item) => item.id === id);
    assert.equal(entry.sha256, createHash('sha256').update(bytes).digest('hex'), id);
    assert.equal(entry.sources.length, id === 'leaves' ? 20 : 1);
    assert.ok(entry.sources.every((source) => /^[a-f0-9]{64}$/.test(source.sha256)));
    const metrics = measurePcm(audio);
    assert.equal(metrics.duration, 48.75);
    assert.ok(metrics.peak <= 0.2351 && metrics.peak >= 0.22, id);
    assert.ok(metrics.rms > 0.02 && metrics.rms < 0.06, id);
    assert.ok(Math.abs(metrics.mean) < 0.0001, id);
    // Runtime overlap should consume identical audio, preserving natural
    // energy and the rail cadence instead of crossfading unrelated measures.
    const append = audio.rate * 0.75;
    for (let i = 0; i < append; i += 1) assert.equal(audio.samples[0][i], audio.samples[0][audio.length - append + i], id);
    const prepared = prepareLoop(context, asBuffer(audio));
    assert.equal(prepared.length / prepared.sampleRate, 48);
    const samples = prepared.getChannelData(0);
    assert.ok(Math.abs(samples[0] - samples.at(-1)) < 0.001, id);
    let openingEnergy = 0;
    let endingEnergy = 0;
    for (let i = 0; i < audio.rate / 10; i += 1) {
      openingEnergy += samples[i] ** 2;
      endingEnergy += samples[samples.length - 1 - i] ** 2;
    }
    assert.ok(openingEnergy > 0.01 && endingEnergy > 0.01, `${id}: loop must not fade to silence`);
  }
});

test('leaf arrangement replaces sparse isolated contacts with audible irregular foliage movement', async () => {
  const { audio } = await load('leaves');
  const metrics = measurePcm(audio);
  assert.ok(metrics.quietFraction < 0.02);
  assert.ok(metrics.crestDb < 21);
  // Warm EQ suppresses sharp dry-foley sample jumps while retaining dynamics.
  assert.ok(metrics.maxStep < 0.1);
  const levels = [];
  const size = audio.rate;
  for (let at = 0; at < audio.rate * 48; at += size) {
    let sum = 0;
    for (let i = at; i < at + size; i += 1) sum += audio.samples[0][i] ** 2;
    levels.push(Math.sqrt(sum / size));
  }
  assert.ok(Math.max(...levels) / Math.min(...levels) > 2, 'gusts retain clear slow dynamics');
  assert.ok(new Set(levels.map((level) => level.toFixed(4))).size > 30, 'no identical short repeated grain loop');
});

test('rail articulation emerges in paired contacts above the underlying continuous carriage texture', async () => {
  for (const id of ['train-track', 'train-wheels']) {
    const { audio } = await load(id);
    const samples = audio.samples[0];
    const energy = (time, seconds) => {
      let sum = 0;
      for (let i = Math.floor(time * audio.rate); i < Math.floor((time + seconds) * audio.rate); i += 1) sum += samples[i] ** 2;
      return sum / (seconds * audio.rate);
    };
    let contacts = 0;
    let intervals = 0;
    for (let pair = 0; pair < 40; pair += 1) {
      const time = pair * 1.2 + 0.075 * Math.sin(2 * Math.PI * pair / 40);
      contacts += energy(time + 0.01, 0.1) + energy(time + 0.195, 0.1);
      intervals += energy(time + 0.55, 0.1) + energy(time + 0.85, 0.1);
    }
    assert.ok(contacts / intervals > 1.8, `${id}: characteristic rhythm must emerge rather than be masked by rumble`);
    assert.ok(measurePcm(audio).maxStep < 0.08, `${id}: rounded transient edges`);
  }
});
