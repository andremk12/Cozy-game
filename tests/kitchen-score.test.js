import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const directory = new URL('../public/assets/audio/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('cafe-na-cozinha.json', directory), 'utf8'));
const bytes = readFileSync(new URL(manifest.file, directory));

test('the delivered original kitchen music is a complete local stereo Ogg Opus asset', () => {
  assert.equal(bytes.length, manifest.bytes);
  assert.ok(bytes.length > 1_000_000 && bytes.length < 4_000_000, 'the full composition stays compact');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), manifest.sha256);
  assert.equal(bytes.toString('ascii', 0, 4), 'OggS');
  const headerStart = 27 + bytes[26];
  assert.equal(bytes.toString('ascii', headerStart, headerStart + 8), 'OpusHead');
  assert.equal(bytes[headerStart + 9], 2);
  const preSkip = bytes.readUInt16LE(headerStart + 10);
  assert.ok(preSkip >= 5760, 'codec preroll must be decoded before the audible loop');
  let finalGranule = 0n;
  let offset = 0;
  let pages = 0;
  while (offset < bytes.length) {
    assert.equal(bytes.toString('ascii', offset, offset + 4), 'OggS');
    const segments = bytes[offset + 26];
    let bodyLength = 0;
    for (let segment = 0; segment < segments; segment += 1) bodyLength += bytes[offset + 27 + segment];
    assert.equal(bytes.readUInt32LE(offset + 18), pages);
    if (bytes[offset + 5] & 4) finalGranule = bytes.readBigUInt64LE(offset + 6);
    pages += 1;
    offset += 27 + segments + bodyLength;
  }
  assert.equal(offset, bytes.length);
  assert.ok(pages > 9000, 'the deliverable contains the full three-minute score');
  assert.equal(Number(finalGranule) - preSkip, 192 * 48000, 'padding is trimmed to exact musical length');
});

test('the kitchen score has written melody, harmony, rests and eight arranged sections', () => {
  assert.equal(manifest.bpm, 80);
  assert.equal(manifest.timeSignature, '4/4');
  assert.equal(manifest.bars, 64);
  assert.equal(manifest.score.length, 64);
  assert.equal(manifest.measurements.duration, manifest.bars * 4 * 60 / manifest.bpm);
  assert.equal(new Set(manifest.score.map((bar) => bar.section)).size, 8);
  assert.ok(new Set(manifest.score.map((bar) => bar.chord)).size >= 8);
  assert.ok(new Set(manifest.score.map((bar) => JSON.stringify(bar.melody))).size >= 30,
    'the melody develops beyond a few-second repeated phrase');
  let noteCount = 0;
  for (const [index, bar] of manifest.score.entries()) {
    assert.equal(bar.bar, index + 1);
    assert.ok(bar.melody.length >= 1 && bar.melody.length <= 5);
    for (const note of bar.melody) {
      assert.ok(Number.isInteger(note.midi) && note.midi >= 60 && note.midi <= 84);
      assert.ok(note.beat >= 0 && note.beat < 4);
      assert.ok(note.beats > 0 && note.beats <= 2);
      noteCount += 1;
    }
  }
  assert.ok(noteCount >= 150);
});

test('the hashed final music has decoded headroom, stereo width and measured loop continuity', () => {
  const measured = manifest.measurements;
  assert.equal(measured.channels, 2);
  assert.equal(measured.sampleRate, 48000);
  assert.ok(measured.peak > 0.1 && measured.peak <= 0.24);
  assert.ok(measured.rms > 0.02 && measured.rms < 0.06);
  assert.ok(measured.stereoDifferenceRms > 0.001 && measured.stereoDifferenceRms < measured.rms);
  assert.ok(measured.seamSampleDelta.every((delta) => delta < 0.002), 'the decoded seam has no large sample jump');
  assert.ok(measured.barRmsMin > 0.015 && measured.barRmsMax / measured.barRmsMin < 2.5);
  assert.match(manifest.auditoryReview, /Pending human listening/);
});
