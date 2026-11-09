import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const root = new URL('../public/assets/pets/dalmatian/', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('animation-manifest.json', root), 'utf8'));
const animations = Object.fromEntries(manifest.animations.map((animation) => [animation.stateId, animation]));
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');

for (const animation of manifest.animations) {
  test(`approved dalmatian ${animation.stateId} PNG and atlas match playback metadata`, async () => {
    const [png, atlasBytes] = await Promise.all([
      readFile(new URL(animation.path, root)),
      readFile(new URL(animation.metadataPath, root)),
    ]);
    const atlas = JSON.parse(atlasBytes.toString('utf8'));
    assert.equal(hash(png), animation.sha256.png, 'the approved image bytes remain unchanged');
    assert.equal(hash(atlasBytes), animation.sha256.atlas, 'the original Aseprite atlas remains unchanged');
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(png.toString('ascii', 12, 16), 'IHDR');
    assert.equal(png.readUInt32BE(16), animation.sheetWidth);
    assert.equal(png.readUInt32BE(20), animation.sheetHeight);
    assert.equal(png[24], 8, '8-bit channels');
    assert.equal(png[25], 6, 'RGBA includes the original transparency');
    assert.deepEqual(atlas.meta.size, { w: animation.sheetWidth, h: animation.sheetHeight });
    assert.equal(atlas.meta.image, animation.fileName);
    assert.equal(atlas.frames.length, animation.frameCount);
    assert.equal(animation.columns * animation.rows, animation.frameCount);
    assert.equal(animation.sheetWidth, animation.frameWidth * animation.columns);
    assert.equal(animation.sheetHeight, animation.frameHeight * animation.rows);
    assert.deepEqual(animation.frameOrder, Array.from({ length: animation.frameCount }, (_, index) => index));
    assert.deepEqual(atlas.frames.map((frame) => frame.duration), animation.durationsMs);
    assert.equal(animation.totalMs, animation.durationsMs.reduce((total, duration) => total + duration, 0));
    const tag = atlas.meta.frameTags.find((entry) => entry.name === animation.tag);
    assert.ok(tag, 'the selected tag exists in the exported atlas');
    assert.equal(tag.from, 0);
    assert.equal(tag.to, animation.frameCount - 1);
    assert.equal(tag.direction, animation.playbackDirection);
    if (!animation.loop) assert.equal(tag.repeat, '1');
    for (const [index, frame] of atlas.frames.entries()) {
      assert.deepEqual(frame.frame, {
        x: (index % animation.columns) * animation.frameWidth,
        y: Math.floor(index / animation.columns) * animation.frameHeight,
        w: animation.frameWidth,
        h: animation.frameHeight,
      });
      assert.equal(frame.trimmed, false);
      assert.equal(frame.rotated, false);
      assert.ok(frame.duration > 0);
    }
    const slice = atlas.meta.slices.find((entry) => entry.name === 'pet_frame');
    assert.deepEqual(slice.keys[0].pivot, { x: animation.anchor.x, y: animation.anchor.y });
    assert.deepEqual(slice.keys[0].bounds, { x: 0, y: 0, w: animation.frameWidth, h: animation.frameHeight });
  });
}

test('dalmatian keeps its documented transition seams, asymmetric orientation and baked kitchen props', () => {
  for (const [stateId, from, to, entryFrame] of [
    ['stand_up', 'seated_idle', 'walk', 0],
    ['lie_down', 'seated_idle', 'sleep', 3],
    ['wake_up', 'sleep', 'seated_idle', 3],
  ]) {
    const transition = animations[stateId];
    assert.equal(transition.loop, false);
    assert.equal(transition.fromState, from);
    assert.equal(transition.toState, to);
    assert.equal(transition.transition.entryStateFrame, entryFrame);
    assert.equal(transition.transition.exitStateFrame, 0);
  }
  for (const stateId of ['seated_idle', 'walk', 'sleep', 'cook']) assert.equal(animations[stateId].loop, true);
  for (const animation of manifest.animations) {
    assert.equal(animation.automaticMirroring, false);
    assert.deepEqual(animation.anchor, { x: 32, y: 55, origin: 'top-left', indexBase: 0 });
  }
  assert.equal(animations.walk.facing, 'right_three_quarter');
  assert.equal(animations.walk.frameCount, 4, '16 source frames are four repetitions, not 16 exported cells');
  assert.deepEqual(animations.sleep.effectsBakedIntoSheet, ['FX_Sono_ZZZ']);
  assert.equal(animations.cook.propsBakedIntoSheet, true);
  assert.equal(animations.cook.costumeBakedIntoSheet, true);
  assert.deepEqual(animations.cook.bowlBounds, { x: 38, y: 44, w: 21, h: 11 });
});
