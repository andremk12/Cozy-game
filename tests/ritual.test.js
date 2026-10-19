import test from 'node:test';
import assert from 'node:assert/strict';
import { ritualReducer as reduce, initialRitual } from '../src/scenes/LetItFloat/ritual.js';

test('release requires intentional nonempty writing and immediately drops the text reference', () => {
  assert.deepEqual(reduce(initialRitual, { type: 'RELEASE' }), initialRitual);
  const written = reduce(initialRitual, { type: 'WRITE', value: 'Um pensamento privado' });
  assert.equal(written.draft, 'Um pensamento privado');
  const folded = reduce(written, { type: 'RELEASE' });
  assert.deepEqual(folded, { phase: 'folding', draft: '' });
  assert.deepEqual(reduce(folded, { type: 'SAIL' }), { phase: 'sailing', draft: '' });
  assert.deepEqual(reduce(reduce(folded, { type: 'SAIL' }), { type: 'COMPLETE' }), {
    phase: 'complete',
    draft: '',
  });
});
test('reduced motion completes without timed sailing, and stale actions cannot restart ritual', () => {
  const completed = reduce(
    { phase: 'writing', draft: 'release me' },
    { type: 'RELEASE', reducedMotion: true },
  );
  assert.deepEqual(completed, { phase: 'complete', draft: '' });
  assert.equal(reduce(completed, { type: 'SAIL' }), completed);
  assert.equal(reduce(completed, { type: 'WRITE', value: 'ignored' }), completed);
});
test('draft has a bound and reset discards all writing', () => {
  const draft = reduce(initialRitual, { type: 'WRITE', value: 'a'.repeat(2500) });
  assert.equal(draft.draft.length, 2000);
  assert.deepEqual(reduce(draft, { type: 'RESET' }), initialRitual);
});
