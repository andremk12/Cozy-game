import test from 'node:test';
import assert from 'node:assert/strict';
import { getKitchenSpeechLayout, kitchenSpeechPosition } from '../src/services/kitchenSpeech.js';

test('ordinary speech stays above the head and uses logical scene coordinates at every scale', () => {
  for (const width of [355, 720, 960, 1920]) {
    const head = { x: 350, y: 186 };
    const layout = getKitchenSpeechLayout({ width, height: width * 270 / 480, head, naturalHeight: 60 });
    const point = kitchenSpeechPosition(layout, head);
    assert.equal(layout.placement, 'above');
    assert.ok(point.x >= layout.margin);
    assert.ok(point.x + layout.width <= width - layout.margin + 0.01);
    assert.ok(point.y >= layout.top);
    assert.ok(point.y + layout.height <= head.y * layout.scale - layout.gap + 0.01);
  }
});

test('a long completion adapts beside the small-scene chef without covering the clock strip', () => {
  for (const width of [320, 355, 390]) {
    const head = { x: 340, y: 210 };
    const layout = getKitchenSpeechLayout({ width, height: width * 270 / 480, head,
      kind: 'completion', naturalHeight: 225, controlsBottom: 40 });
    const point = kitchenSpeechPosition(layout, head);
    assert.equal(layout.placement, 'left');
    assert.ok(point.x >= layout.margin - 0.01);
    assert.ok(point.y >= 48);
    assert.ok(point.x + layout.width < head.x * layout.scale);
    assert.ok(point.y + layout.height <= layout.sceneHeight - layout.margin + 0.01);
    assert.ok(layout.maxHeight > 80);
  }
});

test('the same edge-clamp remains bounded throughout a route instead of following delayed React frames', () => {
  const width = 355;
  const layout = getKitchenSpeechLayout({ width, height: width * 270 / 480,
    head: { x: 130, y: 232 }, naturalHeight: 65 });
  for (let x = 8; x <= 472; x += 2) {
    const point = kitchenSpeechPosition(layout, { x, y: 232 });
    assert.ok(point.x >= layout.margin - 0.01);
    assert.ok(point.x + layout.width <= width - layout.margin + 0.01);
    assert.ok(point.y >= layout.top);
  }
  const left = getKitchenSpeechLayout({ width: 355, height: 200, head: { x: 8, y: 186 },
    kind: 'completion', naturalHeight: 220 });
  assert.equal(left.placement, 'right');
});
