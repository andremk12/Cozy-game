// Keyboard Lock belongs to the document, rather than to an individual dialog.
// Share its existing Escape-only capability while fullscreen tools and modals
// overlap. Callers retain their desktop/fullscreen permission guards.
const captures = new WeakMap();

function unlock(keyboard) {
  try { keyboard.unlock(); } catch { /* Fullscreen may already have ended. */ }
}

function request(keyboard, capture) {
  const pending = { generation: capture.generation };
  capture.pending = pending;

  function settle(succeeded) {
    if (capture.pending !== pending) return;
    capture.pending = null;
    if (pending.generation !== capture.generation) {
      // The last owner left while this request was pending. Its late result
      // must neither capture Escape without an owner nor satisfy a newer owner
      // after the earlier request was explicitly unlocked.
      unlock(keyboard);
      if (capture.owners.size) request(keyboard, capture);
      else captures.delete(keyboard);
      return;
    }
    capture.locked = succeeded;
    if (succeeded) {
      for (const owner of [...capture.owners]) {
        if (capture.owners.has(owner)) owner.onLocked(true);
      }
    }
  }

  try {
    Promise.resolve(keyboard.lock(['Escape'])).then(() => settle(true), () => settle(false));
  } catch {
    settle(false);
  }
}

/** Return an idempotent release function for this fullscreen Escape owner. */
export function acquireFullscreenEscape(keyboard, onLocked = () => {}) {
  if (!keyboard || typeof keyboard.lock !== 'function' || typeof keyboard.unlock !== 'function') return () => {};
  let capture = captures.get(keyboard);
  if (!capture) {
    capture = { owners: new Set(), generation: 0, pending: null, locked: false };
    captures.set(keyboard, capture);
  }
  const owner = { onLocked };
  capture.owners.add(owner);
  if (capture.locked) onLocked(true);
  else if (!capture.pending) request(keyboard, capture);

  return () => {
    if (!capture.owners.delete(owner) || capture.owners.size) return;
    capture.generation += 1;
    if (capture.locked || capture.pending) unlock(keyboard);
    capture.locked = false;
    // Keep a canceled pending request registered until it settles, so a rapid
    // reopen cannot race a second native request against its late completion.
    if (!capture.pending) captures.delete(keyboard);
  };
}
