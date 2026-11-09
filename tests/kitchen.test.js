import test from 'node:test';
import assert from 'node:assert/strict';
import { KITCHEN_RECIPES } from '../shared/kitchenRecipes.js';
import { createKitchen, formatKitchenTime, getKitchenView, KitchenTimer, recoverKitchen,
  validateKitchen, validateKitchenCommand } from '../shared/kitchen.js';

function clock(kitchen = createKitchen()) {
  let wall = 1_000;
  let mono = 0;
  let sequence = 0;
  const options = { now: () => wall, monotonic: () => mono,
    idFactory: () => `00000000-0000-4000-8000-${String(++sequence).padStart(12, '0')}` };
  const timer = new KitchenTimer(kitchen, options);
  return { timer, options, advance(ms, wallMs = ms) { mono += ms; wall += wallMs; }, setWall(value) { wall = value; } };
}

test('catalog preserves seven exact Portuguese names, durations and unique completion messages', () => {
  assert.deepEqual(KITCHEN_RECIPES.map(({ name, minutes }) => [name, minutes]), [
    ['Chá Quentinho', 5], ['Torradas da Manhã', 10], ['Biscoitos Caseiros', 15],
    ['Sopa Aconchegante', 25], ['Macarrão Caseiro', 35], ['Pão Quentinho', 45], ['Bolo de Cenoura com Chocolate', 60],
  ]);
  assert.equal(new Set(KITCHEN_RECIPES.map((recipe) => recipe.completionTitle)).size, 7);
  assert.equal(new Set(KITCHEN_RECIPES.map((recipe) => recipe.completionMessage)).size, 7);
  assert.equal(KITCHEN_RECIPES[0].completionMessage,
    'O chá está quentinho! Preparei com carinho para você. Até as pequenas pausas merecem ser especiais. ♡');
  assert.equal(KITCHEN_RECIPES.at(-1).completionMessage,
    'O bolo ficou pronto! Olha só o que a gente preparou! Você merece uma pausinha. Fiz com carinho, especialmente para você! ♡');
  assert.ok(KITCHEN_RECIPES.every((recipe) => recipe.description && recipe.durationMs === recipe.minutes * 60_000));
});

for (const recipe of KITCHEN_RECIPES) {
  test(`${recipe.name}: real elapsed time, completed dish and single presentation stay synchronized`, () => {
    const c = clock();
    c.timer.command({ type: 'start', recipeId: recipe.id });
    assert.equal(c.timer.kitchen.session.durationMs, recipe.durationMs);
    c.advance(recipe.durationMs - 1);
    c.timer.reconcile();
    assert.equal(c.timer.kitchen.session.status, 'running');
    assert.equal(getKitchenView(c.timer.kitchen).remainingMs, 1);
    c.advance(1);
    c.timer.reconcile();
    const { session } = c.timer.kitchen;
    assert.equal(session.status, 'completed');
    assert.equal(session.presentation, 'pending');
    assert.deepEqual(getKitchenView(c.timer.kitchen), { recipe, remainingMs: 0, progress: 1,
      stage: { id: 'ready', label: 'Prontinho, com carinho', pose: 'present' } });
    assert.equal(c.timer.command({ type: 'present', sessionId: session.id }).presented, true);
    for (let index = 0; index < 3; index += 1) {
      assert.equal(c.timer.command({ type: 'present', sessionId: session.id }).presented, false);
      c.advance(10_000);
      assert.equal(c.timer.reconcile().session.elapsedMs, recipe.durationMs);
    }
    c.timer.command({ type: 'close', sessionId: session.id });
    assert.equal(c.timer.kitchen.session.presentation, 'closed');
    assert.equal(c.timer.command({ type: 'present', sessionId: session.id }).presented, false);
    assert.doesNotThrow(() => validateKitchen(c.timer.kitchen));
  });
}

test('pause, resume, cancel and explicit restart preserve a single session without wall-clock drift', () => {
  const c = clock();
  c.timer.command({ type: 'start', recipeId: 'tea', durationMs: 600_000 });
  const firstId = c.timer.kitchen.session.id;
  c.advance(30_000, 3_600_000);
  c.timer.command({ type: 'start', recipeId: 'cake' });
  assert.equal(c.timer.kitchen.session.id, firstId);
  assert.equal(c.timer.kitchen.session.elapsedMs, 30_000);
  c.timer.command({ type: 'pause' });
  c.advance(999_999);
  assert.equal(c.timer.reconcile().session.elapsedMs, 30_000);
  c.timer.command({ type: 'resume' });
  c.advance(10_000, -900_000);
  c.timer.command({ type: 'cancel' });
  assert.equal(c.timer.kitchen.session.elapsedMs, 40_000);
  c.advance(999_999);
  assert.equal(c.timer.reconcile().session.status, 'cancelled');
  assert.equal(c.timer.command({ type: 'present', sessionId: firstId }).presented, false);
  c.timer.command({ type: 'restart' });
  assert.notEqual(c.timer.kitchen.session.id, firstId);
  assert.equal(c.timer.kitchen.session.durationMs, 600_000);
  assert.equal(c.timer.kitchen.session.elapsedMs, 0);
  assert.equal(c.timer.kitchen.session.status, 'running');
});

test('a delayed callback catches up in one reconciliation, and decorative changes never restart time', () => {
  const c = clock();
  c.timer.command({ type: 'start', recipeId: 'tea' });
  const id = c.timer.kitchen.session.id;
  c.advance(80_000);
  c.timer.command({ type: 'settings', patch: { lampOn: false, atmosphere: 'night', weather: 'rain' } });
  assert.equal(c.timer.kitchen.session.id, id);
  assert.equal(c.timer.kitchen.session.elapsedMs, 80_000);
  c.advance(2_000_000);
  assert.equal(c.timer.reconcile().session.elapsedMs, 300_000);
  assert.equal(c.timer.kitchen.session.status, 'completed');
  assert.equal(c.timer.kitchen.session.completedAt, 301_000);
});

test('suspension counts the sleep gap once with either platform monotonic-clock behavior', () => {
  for (const monotonicSleep of [0, 120_000]) {
    const c = clock();
    c.timer.command({ type: 'start', recipeId: 'tea' });
    c.advance(20_000);
    c.timer.suspend();
    c.advance(monotonicSleep, 120_000);
    c.timer.resume();
    assert.equal(c.timer.kitchen.session.elapsedMs, 140_000);
    c.timer.reconcile();
    assert.equal(c.timer.kitchen.session.elapsedMs, 140_000);
    c.timer.command({ type: 'pause' });
    c.timer.suspend();
    c.advance(0, 900_000);
    c.timer.resume();
    assert.equal(c.timer.kitchen.session.elapsedMs, 140_000);
    assert.equal(c.timer.kitchen.session.status, 'paused');
  }
});

test('reopening restores the same running session, preserves pause and never starts a new session', () => {
  const c = clock();
  c.timer.command({ type: 'start', recipeId: 'tea' });
  c.advance(50_000);
  const saved = c.timer.reconcile();
  const restored = new KitchenTimer(saved, { ...c.options, now: () => saved.session.updatedAt + 300_000 });
  assert.equal(restored.kitchen.session.id, saved.session.id);
  assert.equal(restored.kitchen.session.status, 'completed');
  assert.equal(restored.kitchen.session.presentation, 'pending');
  restored.command({ type: 'present', sessionId: saved.session.id });
  const readAgain = new KitchenTimer(restored.kitchen, c.options);
  assert.equal(readAgain.kitchen.session.presentation, 'presented');
  c.timer.command({ type: 'pause' });
  const paused = new KitchenTimer(c.timer.kitchen, { ...c.options, now: () => 9_000_000 });
  assert.equal(paused.kitchen.session.status, 'paused');
  assert.equal(paused.kitchen.session.elapsedMs, 50_000);
  assert.equal(new KitchenTimer(createKitchen(), c.options).kitchen.session, null);
});

test('a backwards clock on reopening pauses recovery without subtracting prior progress', () => {
  const c = clock();
  c.timer.command({ type: 'start', recipeId: 'tea' });
  c.advance(10_000);
  const saved = c.timer.reconcile();
  const restored = new KitchenTimer(saved, { ...c.options, now: () => 500 });
  assert.equal(restored.clockChanged, true);
  assert.equal(restored.kitchen.session.status, 'paused');
  assert.equal(restored.kitchen.session.elapsedMs, 10_000);
  restored.command({ type: 'resume' });
  assert.equal(restored.clockChanged, false);
  assert.equal(restored.kitchen.session.status, 'running');
});

test('cake stages follow the actual chosen duration, including all six preparation steps', () => {
  const c = clock();
  c.timer.command({ type: 'start', recipeId: 'cake', durationMs: 300_000 });
  const ids = [];
  for (const fraction of [0, 0.08, 0.25, 0.32, 0.72, 0.90, 1]) {
    c.timer.kitchen.session.elapsedMs = fraction * 300_000;
    if (fraction === 1) c.timer.advance(0, 1_000);
    ids.push(getKitchenView(c.timer.kitchen).stage.id);
  }
  assert.deepEqual(ids, ['ingredients', 'batter', 'oven', 'baking', 'chocolate', 'serving', 'ready']);
  assert.equal(formatKitchenTime(3_600_000), '60:00');
  assert.equal(formatKitchenTime(1), '00:01');
  assert.equal(formatKitchenTime(0), '00:00');
});

test('commands and persisted schema reject unknown text, invalid minutes and malformed session data', () => {
  for (const command of [null, [], { type: 'reconcile' }, { type: 'pause', text: 'SYNTHETIC_PRIVATE_KITCHEN' },
    { type: 'start', recipeId: 'unknown' }, ...[0, 299_999, 300_001, 3_660_000, NaN, Infinity].map((durationMs) => ({ type: 'start', recipeId: 'tea', durationMs })),
    { type: 'settings', patch: {} }, { type: 'settings', patch: { draft: 'SYNTHETIC_PRIVATE_KITCHEN' } },
    { type: 'settings', patch: { completionSoundEnabled: 'true' } }, { type: 'present', sessionId: 'other' }]) {
    assert.throws(() => validateKitchenCommand(command), TypeError);
  }
  assert.doesNotThrow(() => validateKitchenCommand({ type: 'start', recipeId: 'cake', durationMs: 3_600_000 }));
  const c = clock();
  c.timer.command({ type: 'start', recipeId: 'tea' });
  for (const value of [{ ...c.timer.kitchen, draft: 'SYNTHETIC_PRIVATE_KITCHEN' },
    { ...c.timer.kitchen, session: { ...c.timer.kitchen.session, elapsedMs: Infinity } },
    { ...c.timer.kitchen, session: { ...c.timer.kitchen.session, completedAt: 1 } },
    { ...c.timer.kitchen, session: { ...c.timer.kitchen.session, presentation: 'pending' } }]) assert.throws(() => validateKitchen(value));
  const recovered = recoverKitchen({ version: 1, session: { text: 'SYNTHETIC_PRIVATE_KITCHEN' }, settings: { lampOn: false, draft: 'SYNTHETIC_PRIVATE_KITCHEN' } });
  assert.equal(recovered.kitchen.session, null);
  assert.deepEqual(recovered.kitchen, createKitchen());
  assert.equal(JSON.stringify(recovered).includes('SYNTHETIC_PRIVATE_KITCHEN'), false);
  assert.equal(recoverKitchen({ version: 2 }).status, 'unsupported');
});
