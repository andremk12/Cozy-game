// Original Little Haven score and instruments. No samples, downloads or new deps.
// Run: node scripts/compose-kitchen-music.mjs
// Node renders a circular score; the existing Edge/Playwright encodes local Opus.
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import http from 'node:http';
import { chromium } from '@playwright/test';

const RATE = 24000;
const BPM = 80;
const BEAT = 60 / BPM;
const BARS = 64;
const SECONDS = BARS * 4 * BEAT;
const LENGTH = RATE * SECONDS;
const destination = new URL('../public/assets/audio/', import.meta.url);
const channels = [new Float32Array(LENGTH), new Float32Array(LENGTH)];
let seed = 0x4c484b31;
const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
const hz = (note) => 440 * 2 ** ((note - 69) / 12);
const score = [];

// Close, rootless jazz voicings over a gentle acoustic-style bass.
const chords = {
  F9: { name: 'Fmaj9', bass: [41, 48], notes: [57, 60, 64, 67] },
  Dm9: { name: 'Dm9', bass: [38, 45], notes: [53, 57, 60, 64] },
  Gm9: { name: 'Gm9', bass: [43, 50], notes: [58, 62, 65, 69] },
  C13: { name: 'C13', bass: [36, 43], notes: [58, 62, 64, 69] },
  Am9: { name: 'Am9', bass: [45, 40], notes: [55, 59, 60, 64] },
  D13: { name: 'D13', bass: [38, 45], notes: [54, 60, 64, 71] },
  Bb9: { name: 'Bbmaj9', bass: [46, 41], notes: [57, 60, 62, 65] },
  Bdim: { name: 'Bdim7', bass: [47, 41], notes: [56, 59, 62, 65] },
};
const home = ['F9', 'Dm9', 'Gm9', 'C13', 'Am9', 'D13', 'Gm9', 'C13'];
const bridge = ['Bb9', 'Bdim', 'Am9', 'D13', 'Gm9', 'C13', 'F9', 'C13'];
const sections = [
  { name: 'Janela da manhã', progression: home, melody: 0, intensity: 0.70, guitar: false, percussion: false },
  { name: 'Café na mesa', progression: home, melody: 1, intensity: 0.92, guitar: true, percussion: true },
  { name: 'Uma conversa sem palavras', progression: home, melody: 2, intensity: 0.86, guitar: true, percussion: true },
  { name: 'Luz na bancada', progression: bridge, melody: 3, intensity: 0.88, guitar: false, percussion: true },
  { name: 'O perfume do café', progression: bridge, melody: 4, intensity: 0.94, guitar: true, percussion: true },
  { name: 'De volta à mesa', progression: home, melody: 1, intensity: 0.86, guitar: true, percussion: true },
  { name: 'Um pouco de silêncio', progression: bridge, melody: 2, intensity: 0.68, guitar: true, percussion: false },
  { name: 'A manhã continua', progression: home, melody: 1, intensity: 0.78, guitar: false, percussion: true },
];

// Each item is [beat, MIDI note, held beats]. Rests are part of the melody.
// Five written eight-bar phrases: related gestures and answering lines, not a
// short random arpeggio. Phrase 0 is a sparse introduction, phrase 3 the bridge.
const melodies = [
  [ [[1,69,1],[2.5,67,0.5]], [[0.5,65,1],[2.5,64,0.75]], [[1,65,0.5],[2,69,1]], [[1.5,67,1],[3,64,0.5]], [[0.5,67,1],[2,64,0.75]], [[1,66,1],[3,64,0.5]], [[1,62,0.75],[2.5,65,1]], [[1.5,64,1],[3,67,0.5]] ],
  [ [[0.5,69,0.75],[1.5,72,0.5],[2.5,71,0.5],[3.25,69,0.5]], [[0.5,69,0.5],[1.5,65,0.75],[2.75,64,0.75]], [[0,65,0.75],[1.25,69,0.5],[2,70,0.75],[3.25,69,0.5]], [[0.5,67,1],[2,64,0.75],[3.25,62,0.5]], [[0.5,64,0.5],[1.5,67,0.5],[2.25,71,1]], [[0.5,69,0.5],[1.25,66,0.75],[2.5,64,0.75]], [[0,65,0.75],[1.5,62,0.75],[2.75,69,0.75]], [[0.5,67,0.75],[1.75,64,0.5],[3,67,0.5]] ],
  [ [[0.75,72,1],[2.25,69,0.5],[3,67,0.5]], [[0.5,69,0.75],[1.75,72,0.5],[2.75,76,0.75]], [[0.75,74,0.5],[1.75,70,0.75],[3,69,0.5]], [[0,72,0.5],[1,69,1],[2.5,67,0.75]], [[0.5,71,0.75],[1.75,72,0.5],[2.75,76,0.75]], [[0.25,74,1],[1.75,71,0.75],[3,69,0.5]], [[0.75,69,0.5],[1.5,65,0.75],[2.75,62,0.75]], [[0.5,64,1],[2.25,67,0.5],[3.25,69,0.5]] ],
  [ [[0.5,74,0.75],[1.75,72,0.5],[3,69,0.75]], [[0.75,71,0.75],[2,68,0.5],[3,65,0.5]], [[0.5,67,0.5],[1.5,71,0.75],[2.75,72,0.75]], [[0.5,74,1],[2,71,0.5],[3,66,0.5]], [[0.75,70,0.75],[2,69,0.5],[3,65,0.5]], [[0.5,64,0.75],[1.75,67,0.75],[3,69,0.5]], [[0.5,72,1],[2,69,0.75],[3.25,67,0.5]], [[0.75,64,0.75],[2,62,0.5],[3,67,0.5]] ],
  [ [[0.5,69,0.5],[1.25,72,0.75],[2.5,74,0.5],[3.25,72,0.5]], [[0.5,71,0.75],[1.75,68,0.5],[2.75,65,0.75]], [[0.5,64,0.75],[1.75,67,0.5],[2.75,71,0.75]], [[0.5,69,1],[2,66,0.5],[3.25,64,0.5]], [[0.75,65,0.5],[1.5,69,0.75],[2.75,70,0.5]], [[0.5,69,0.5],[1.5,67,0.75],[2.75,64,0.75]], [[0.5,67,0.75],[1.75,69,1]], [[0.75,67,0.75],[2.25,64,0.5],[3.25,67,0.5]] ],
];

function addVoice(samples, start, pan, amplitude) {
  const startIndex = Math.round(start * RATE);
  const left = Math.cos((pan + 1) * Math.PI / 4) * amplitude;
  const right = Math.sin((pan + 1) * Math.PI / 4) * amplitude;
  // Circular addition carries the last notes and room tails over the seam. No
  // whole-track fade, truncated reverb, missing beat or shortened musical bar.
  for (let i = 0; i < samples.length; i += 1) {
    const index = ((startIndex + i) % LENGTH + LENGTH) % LENGTH;
    channels[0][index] += samples[i] * left;
    channels[1][index] += samples[i] * right;
  }
}

function ep(note, held = 0.7, velocity = 0.8) {
  const frequency = hz(note);
  const duration = held + 2.7;
  const samples = new Float32Array(Math.ceil(duration * RATE));
  const detune = 1 + (random() - 0.5) * 0.0018;
  const phase = random() * Math.PI * 2;
  for (let i = 0; i < samples.length; i += 1) {
    const time = i / RATE;
    const attack = 1 - Math.exp(-time * 145);
    const release = Math.exp(-Math.max(0, time - held) / 0.58);
    const envelope = attack * release;
    const fundamental = Math.sin(2 * Math.PI * frequency * time) * Math.exp(-time / 2.1);
    const body = Math.sin(2 * Math.PI * frequency * detune * time + 0.009 * Math.sin(time * 20 + phase)) * Math.exp(-time / 1.7);
    const partial2 = Math.sin(2 * Math.PI * frequency * 2.002 * time) * 0.23 * Math.exp(-time / 0.72);
    const tine = Math.sin(2 * Math.PI * frequency * 3.003 * time + 0.22 * Math.exp(-time * 12)) * 0.075 * velocity * Math.exp(-time / 0.28);
    samples[i] = envelope * (0.53 * fundamental + 0.43 * body + partial2 + tine) * velocity;
  }
  return samples;
}

function guitar(note, held = 0.4) {
  const frequency = hz(note);
  const duration = held + 1.45;
  const samples = new Float32Array(Math.ceil(duration * RATE));
  const phases = Array.from({ length: 7 }, () => (random() - 0.5) * 0.09);
  for (let harmonic = 1; harmonic <= 7; harmonic += 1) {
    const amplitude = (harmonic % 2 ? 1 : 0.62) / harmonic ** 1.65;
    const decay = 1.1 / harmonic ** 0.5;
    const f = frequency * harmonic * Math.sqrt(1 + 0.00007 * harmonic ** 2);
    if (f > 7500) continue;
    for (let i = 0; i < samples.length; i += 1) {
      const time = i / RATE;
      const envelope = (1 - Math.exp(-time * 260)) * Math.exp(-time / decay) * Math.exp(-Math.max(0, time - held) / 0.3);
      samples[i] += Math.sin(time * 2 * Math.PI * f + phases[harmonic - 1]) * amplitude * envelope;
    }
  }
  return samples;
}

function bass(note, held = 0.95) {
  const frequency = hz(note);
  const samples = new Float32Array(Math.ceil((held + 0.5) * RATE));
  for (let i = 0; i < samples.length; i += 1) {
    const time = i / RATE;
    const phase = 2 * Math.PI * frequency * (time + 0.002 * (1 - Math.exp(-time * 20)));
    const envelope = (1 - Math.exp(-time * 95)) * Math.exp(-time / 0.95) * Math.exp(-Math.max(0, time - held) / 0.16);
    samples[i] = envelope * (Math.sin(phase) + 0.26 * Math.sin(phase * 2) + 0.06 * Math.sin(phase * 3));
  }
  return samples;
}

function percussion(kind) {
  const duration = kind === 'brush' ? 0.23 : kind === 'rim' ? 0.10 : 0.22;
  const samples = new Float32Array(Math.ceil(duration * RATE));
  let low = 0;
  let middle = 0;
  for (let i = 0; i < samples.length; i += 1) {
    const time = i / RATE;
    const noise = random() * 2 - 1;
    low += (noise - low) * 0.08;
    middle += (noise - middle) * 0.5;
    const attack = 1 - Math.exp(-time * (kind === 'brush' ? 90 : 300));
    const release = Math.exp(-time / (kind === 'brush' ? 0.052 : 0.025));
    if (kind === 'brush') samples[i] = (middle - low) * attack * release;
    else if (kind === 'rim') samples[i] = (0.48 * Math.sin(time * 2 * Math.PI * 540) + 0.2 * Math.sin(time * 2 * Math.PI * 830) + low * 0.3) * attack * release;
    else samples[i] = Math.sin(2 * Math.PI * (60 * time + 0.45 * (1 - Math.exp(-time * 40)))) * attack * Math.exp(-time * 23);
  }
  return samples;
}

for (let bar = 0; bar < BARS; bar += 1) {
  const sectionIndex = Math.floor(bar / 8);
  const section = sections[sectionIndex];
  const chord = chords[section.progression[bar % 8]];
  const at = bar * 4 * BEAT;
  const feeling = section.intensity * (0.96 + random() * 0.08);
  score.push({ bar: bar + 1, section: section.name, chord: chord.name, melody: [] });
  // The low bass anchors beats 1/3; short anticipations make a gentle bossa pulse.
  for (const [beat, index, gain] of [[0,0,0.062],[1.5,1,0.037],[2,1,0.052],[3.5,0,0.028]]) {
    addVoice(bass(chord.bass[index], (beat % 1 ? 0.36 : 0.95) * BEAT), at + beat * BEAT, -0.02, gain * feeling);
  }
  const compBeats = bar % 2 ? [0.5, 1.75, 3] : [0, 1.5, 2.75];
  for (const [hit, beat] of compBeats.entries()) {
    chord.notes.forEach((note, index) => {
      const instrument = section.guitar && hit !== 0 ? guitar : ep;
      const gain = instrument === guitar ? 0.021 : 0.018;
      const strum = instrument === guitar ? index * 0.012 : index * 0.004;
      addVoice(instrument(note, 0.35 * BEAT, 0.62), at + beat * BEAT + strum + (random() - 0.5) * 0.009, instrument === guitar ? -0.33 : 0.16, gain * feeling * (0.92 + random() * 0.16));
    });
  }
  // Returning verses change octave, rests and one answering note rather than
  // replaying a copied stereo phrase. Soft close-room tails bind the instruments.
  const melodyBar = melodies[section.melody][bar % 8];
  for (const [index, [beat, writtenNote, duration]] of melodyBar.entries()) {
    if (sectionIndex === 6 && index % 2 === 1) continue;
    let note = writtenNote;
    if (sectionIndex === 5 && bar % 8 === 0 && index === 2) note = 67;
    if (sectionIndex === 7 && bar % 8 === 6) note = [69, 67, 65][index % 3];
    // Phrase 2 can cross the bridge in section 6: use the bridge's own chord tone.
    if (sectionIndex === 6) note = chord.notes[(index + 1) % chord.notes.length] + 12;
    const offset = at + beat * BEAT + (random() - 0.5) * 0.016;
    const voice = ep(note, duration * BEAT, 0.72 + random() * 0.12);
    const gain = 0.052 * feeling;
    addVoice(voice, offset, 0.1, gain);
    addVoice(voice, offset + 0.081, -0.5, gain * 0.075);
    addVoice(voice, offset + 0.127, 0.55, gain * 0.05);
    addVoice(voice, offset + 0.211, -0.22, gain * 0.025);
    score[bar].melody.push({ beat, midi: note, beats: duration });
  }
  if (section.percussion) {
    for (let hit = 0; hit < 8; hit += 1) {
      const gain = (hit % 2 ? 0.008 : 0.012) * feeling;
      addVoice(percussion('brush'), at + hit * 0.5 * BEAT + 0.006, -0.4, gain);
    }
    for (const beat of [1, 3]) addVoice(percussion('rim'), at + beat * BEAT + 0.009, 0.32, 0.008 * feeling);
    for (const beat of [0, 2.5]) addVoice(percussion('kick'), at + beat * BEAT, 0, 0.011 * feeling);
  }
}

// A short diffuse room, no bright plate/repeating delay, no dynamics compressor.
const dry = channels.map((channel) => channel.slice());
for (const [delay, gain, cross] of [[0.037,0.05,false],[0.061,0.038,true],[0.113,0.027,false],[0.173,0.019,true],[0.257,0.012,true]]) {
  const offset = Math.round(delay * RATE);
  for (let channel = 0; channel < 2; channel += 1) {
    const source = dry[cross ? 1 - channel : channel];
    for (let i = 0; i < LENGTH; i += 1) channels[channel][(i + offset) % LENGTH] += source[i] * gain;
  }
}
let peak = 0;
for (const channel of channels) {
  let mean = 0;
  for (const value of channel) mean += value / LENGTH;
  for (let i = 0; i < LENGTH; i += 1) { channel[i] -= mean; peak = Math.max(peak, Math.abs(channel[i])); }
}
// A single linear whole-score gain leaves the written dynamics intact. Headroom
// below the engine ceiling accounts for a few percent of lossy-codec overshoot.
const scale = 0.205 / peak;
for (const channel of channels) for (let i = 0; i < LENGTH; i += 1) channel[i] *= scale;

// Secure loopback origin is needed for WebCodecs. The server exposes only this
// synthetic in-memory PCM and an empty HTML page, and closes after encoding.
const server = http.createServer((request, response) => {
  if (request.url === '/pcm') {
    response.setHeader('Content-Type', 'application/octet-stream');
    for (const channel of channels) response.write(Buffer.from(channel.buffer));
    response.end();
  } else if (request.url === '/') response.end('<!doctype html><title>Local kitchen renderer</title>');
  else { response.statusCode = 404; response.end(); }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
let browser;
let encoded;
try {
  browser = await chromium.launch({ channel: process.env.HAVEN_TEST_BROWSER || 'msedge', headless: true });
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  encoded = await page.evaluate(async ({ rate, length }) => {
    const input = new Float32Array(await (await fetch('/pcm')).arrayBuffer());
    const packets = [];
    let header;
    let encodingError;
    const encoder = new AudioEncoder({
      output: (chunk, metadata) => {
        const data = new Uint8Array(chunk.byteLength);
        chunk.copyTo(data);
        packets.push(Array.from(data));
        if (metadata.decoderConfig?.description) header = Array.from(new Uint8Array(metadata.decoderConfig.description));
      },
      error: (error) => { encodingError = error.message; },
    });
    encoder.configure({ codec: 'opus', sampleRate: rate, numberOfChannels: 2, bitrate: 112000, bitrateMode: 'variable' });
    const blockSize = rate / 50;
    // Encode the preceding loop's 120 ms as real preroll. Ogg's increased pre-
    // skip discards it AFTER decoding so both codec states are already warm at
    // the first retained sample. It is not silence or a shortened first bar.
    const preroll = Math.round(rate * 0.12);
    for (let start = 0; start < length + preroll; start += blockSize) {
      const frames = Math.min(blockSize, length + preroll - start);
      const data = new Float32Array(frames * 2);
      for (let channel = 0; channel < 2; channel += 1) {
        for (let frame = 0; frame < frames; frame += 1) {
          const index = (start + frame - preroll + length) % length;
          data[channel * frames + frame] = input[channel * length + index];
        }
      }
      const audio = new AudioData({ format: 'f32-planar', sampleRate: rate, numberOfFrames: frames, numberOfChannels: 2, timestamp: Math.round(start * 1e6 / rate), data });
      encoder.encode(audio);
      audio.close();
      if (encoder.encodeQueueSize > 100) await new Promise((resolve) => { encoder.ondequeue = resolve; });
    }
    await encoder.flush();
    encoder.close();
    if (encodingError) throw new Error(encodingError);
    return { header, packets };
  }, { rate: RATE, length: LENGTH });
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}

// Ogg Opus framing (RFC 7845): one packet/page, exact final granule trims Opus
// padding. Decoding is gapless and the score length stays an exact 64 bars.
function crc32(bytes) {
  let crc = 0;
  for (const byte of bytes) {
    crc ^= byte << 24;
    for (let bit = 0; bit < 8; bit += 1) crc = crc & 0x80000000 ? (crc << 1) ^ 0x04c11db7 : crc << 1;
  }
  return crc >>> 0;
}
let pageNumber = 0;
function oggPage(packet, flags, granule) {
  const lacing = [...Array(Math.floor(packet.length / 255)).fill(255), packet.length % 255];
  const page = Buffer.alloc(27 + lacing.length + packet.length);
  page.write('OggS');
  page[5] = flags;
  page.writeBigUInt64LE(BigInt(granule), 6);
  page.writeUInt32LE(0x4c484b31, 14);
  page.writeUInt32LE(pageNumber++, 18);
  page[26] = lacing.length;
  page.set(lacing, 27);
  page.set(packet, 27 + lacing.length);
  page.writeUInt32LE(crc32(page), 22);
  return page;
}
const header = Buffer.from(encoded.header);
const preSkip = header.readUInt16LE(10) + Math.round(0.12 * 48000);
header.writeUInt16LE(preSkip, 10);
const vendor = Buffer.from('Little Haven original score renderer');
const tags = Buffer.alloc(8 + 4 + vendor.length + 4);
tags.write('OpusTags');
tags.writeUInt32LE(vendor.length, 8);
vendor.copy(tags, 12);
const pages = [oggPage(header, 2, 0), oggPage(tags, 0, 0)];
encoded.packets.forEach((packet, index) => {
  const final = index === encoded.packets.length - 1;
  pages.push(oggPage(Buffer.from(packet), final ? 4 : 0, final ? SECONDS * 48000 + preSkip : (index + 1) * 960));
});
const ogg = Buffer.concat(pages);
await mkdir(destination, { recursive: true });
await writeFile(new URL('cafe-na-cozinha.ogg', destination), ogg);

// Decode the actual deliverable (not just source PCM) and report sample peak,
// channel difference, RMS, exact duration and seam versus adjacent samples.
const verificationBrowser = await chromium.launch({ channel: process.env.HAVEN_TEST_BROWSER || 'msedge', headless: true });
let measurements;
try {
  const page = await verificationBrowser.newPage();
  measurements = await page.evaluate(async (base64) => {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const context = new OfflineAudioContext(2, 1, 48000);
    const buffer = await context.decodeAudioData(bytes.buffer);
    let peak = 0;
    let square = 0;
    let differenceSquare = 0;
    const seam = [];
    const windows = [];
    for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
      const data = buffer.getChannelData(channel);
      seam.push(Math.abs(data[0] - data[data.length - 1]));
      for (let i = 0; i < data.length; i += 1) { peak = Math.max(peak, Math.abs(data[i])); square += data[i] ** 2; }
    }
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    for (let i = 0; i < left.length; i += 1) differenceSquare += (left[i] - right[i]) ** 2;
    for (let start = 0; start < left.length; start += buffer.sampleRate * 3) {
      let energy = 0;
      const end = Math.min(start + buffer.sampleRate * 3, left.length);
      for (let i = start; i < end; i += 1) energy += (left[i] ** 2 + right[i] ** 2) / 2;
      windows.push(Math.sqrt(energy / (end - start)));
    }
    return { duration: buffer.duration, sampleRate: buffer.sampleRate, channels: buffer.numberOfChannels, peak, rms: Math.sqrt(square / (buffer.length * buffer.numberOfChannels)), stereoDifferenceRms: Math.sqrt(differenceSquare / left.length), seamSampleDelta: seam, barRmsMin: Math.min(...windows), barRmsMax: Math.max(...windows) };
  }, ogg.toString('base64'));
} finally { await verificationBrowser.close(); }
if (Math.abs(measurements.duration - SECONDS) > 1 / 48000) throw new Error('Opus granule duration is not the musical length.');
if (measurements.peak > 0.24) throw new Error('Decoded music exceeds the layer sample ceiling.');
const manifest = {
  id: 'cafe-na-cozinha', title: 'Café na Cozinha', file: 'cafe-na-cozinha.ogg',
  bytes: ogg.length, sha256: createHash('sha256').update(ogg).digest('hex'),
  format: 'Ogg Opus', targetBitrate: 112000, sourceSampleRate: RATE,
  bpm: BPM, timeSignature: '4/4', bars: BARS,
  source: 'Original score and original additive/physical-style instrument synthesis; no third-party samples.',
  license: 'Project original material; same distribution terms as Little Haven. No third-party audio license.',
  loop: 'Exact 64-bar circular render; source/reverb tails wrap; Opus pre-skip and end granule respected. Do not shorten with prepareLoop().',
  measurements, score,
  auditoryReview: 'Pending human listening; these measurements do not certify timbre, comfort or naturalness.',
};
await writeFile(new URL('cafe-na-cozinha.json', destination), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ file: manifest.file, bytes: manifest.bytes, sha256: manifest.sha256, ...measurements }, null, 2));
