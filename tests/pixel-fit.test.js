import test from 'node:test';
import assert from 'node:assert/strict';
import { fitPixelArt } from '../src/components/ImmersiveViewport/fitPixelArt.js';

test('pixel art uses the largest whole-pixel scale and integrated margins without cropping', () => {
  assert.deepEqual(fitPixelArt(1920, 1080, 480, 270), { width: 1920, height: 1080, left: 0, top: 0 });
  assert.deepEqual(fitPixelArt(2560, 1440, 480, 270), { width: 2400, height: 1350, left: 80, top: 45 });
  assert.deepEqual(fitPixelArt(1440, 960, 480, 270), { width: 1440, height: 810, left: 0, top: 75 });
  assert.deepEqual(fitPixelArt(1441, 961, 480, 270), { width: 1440, height: 810, left: 0, top: 75 });
});

test('display scaling keeps each logical pixel and its origin aligned to physical pixels', () => {
  const ratio = 1.25;
  const fit = fitPixelArt(1707, 960, 480, 270, ratio);
  assert.equal((fit.width / 480) * ratio, 4);
  assert.equal(fit.left * ratio, Math.floor(fit.left * ratio));
  assert.equal(fit.top * ratio, Math.floor(fit.top * ratio));
  assert.equal(fit.width / fit.height, 16 / 9);
  assert.ok(fit.width <= 1707 && fit.height <= 960);
});

test('viewports smaller than the pixel grid downscale proportionally instead of cutting it', () => {
  assert.deepEqual(fitPixelArt(320, 240, 480, 270), { width: 320, height: 180, left: 0, top: 30 });
});
