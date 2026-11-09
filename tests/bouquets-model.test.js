import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createBouquet, DEFAULT_SUBJECT, MAX_MAILTO_LENGTH, normalizeSubject, validateMessage, validateRecipient,
  validateBouquet, prepareBouquetDraft, buildBouquetMailto, validateBouquetImage,
} from '../shared/bouquets.js';

test('subject preserves Unicode, trims edges, defaults empty and bounds code points', () => {
  assert.equal(normalizeSubject('  Flores, André! 💐 ♡  '), 'Flores, André! 💐 ♡');
  for (const empty of ['', '   ', '\u00a0']) assert.equal(normalizeSubject(empty), DEFAULT_SUBJECT);
  assert.equal(normalizeSubject('💐'.repeat(120)), '💐'.repeat(120));
  assert.throws(() => normalizeSubject('💐'.repeat(121)), /120/);
  assert.equal(normalizeSubject('a\u0301'), 'a\u0301');
});

test('subjects reject raw header separators and controls before trimming', () => {
  for (const bad of ['\r', '\n', '\r\nBcc: test@example.test', '\t', '\u0000', '\u001f', '\u007f', '\u0085', '\u009f', '\u2028', '\u2029', '\u202e', '\ud800']) {
    assert.throws(() => normalizeSubject(`Flores${bad}`), /única linha/);
  }
  for (const bad of [null, undefined, 42, {}, ['Flores']]) assert.throws(() => normalizeSubject(bad));
});

test('letters retain editable multiline Unicode while rejecting invalid controls and excessive text', () => {
  assert.equal(validateMessage('Olá, você! 💐\r\nLinha dois\rTrês\nQuatro'), 'Olá, você! 💐\nLinha dois\nTrês\nQuatro');
  assert.equal(validateMessage('💐'.repeat(1000)).length, 2000);
  for (const bad of ['x'.repeat(1001), 'a\0b', 'a\u0085b', '\ud800', 42]) assert.throws(() => validateMessage(bad));
});

test('recipient is optional, singular and cannot add headers or a URL destination', () => {
  assert.equal(validateRecipient('  synthetic+gift@example.test  '), 'synthetic+gift@example.test');
  assert.equal(validateRecipient(''), '');
  for (const bad of ['a@example.test,b@example.test', 'a@example.test; b@example.test', 'A <a@example.test>',
    'a@example.test?bcc=b@example.test', 'a@example.test\r\nBcc:b@example.test', 'a%0d%0abcc@example.test',
    'https://example.test', 'mailto:a@example.test', 'a@-example.test', 'a@host..test', 'a..b@example.test',
    '.a@example.test', 'a.@example.test', 'a@example', 'a@example.test#extra', 'a@other@example.test']) {
    assert.throws(() => validateRecipient(bad), /único endereço/);
  }
});

test('mailto encodes each component, custom subject and multiline body without adding parameters', () => {
  const subject = 'Acentos: coração 💐 & surpresa? %0d%0aBcc:teste';
  const message = 'Carta sintética\nCorpo &cc=never@example.test\nOlá ♡';
  const url = new URL(buildBouquetMailto({ recipient: 'synthetic+gift@example.test', subject, message }));
  assert.equal(url.protocol, 'mailto:');
  assert.equal(decodeURIComponent(url.pathname), 'synthetic+gift@example.test');
  assert.equal(url.searchParams.get('subject'), subject);
  assert.equal(url.searchParams.get('body'), message.replace(/\n/g, '\r\n'));
  assert.deepEqual([...url.searchParams.keys()], ['subject', 'body']);
  assert.equal(new URL(buildBouquetMailto({ recipient: '', subject: ' ', message: '' })).searchParams.get('subject'), DEFAULT_SUBJECT);
  assert.throws(() => buildBouquetMailto({ recipient: '', subject: 'a\nBcc:b@example.test', message: '' }));
  assert.throws(() => buildBouquetMailto({ recipient: '', subject: 'a', message: '', attachment: '/private.png' }));
});

test('composition validates visual limits and preserves flower order independently of subject edits', () => {
  const bouquet = { ...createBouquet(), stems: ['rose-red', 'daisy', 'lavender', 'rose-pink'], message: 'Carta sintética.' };
  const edited = validateBouquet({ ...bouquet, subject: '  Você merece flores 💐  ' });
  assert.equal(edited.subject, 'Você merece flores 💐');
  assert.equal(edited.message, bouquet.message);
  assert.deepEqual(edited.stems, bouquet.stems);
  assert.notEqual(edited.stems, bouquet.stems);
  assert.equal(validateBouquet({ ...bouquet, stems: Array(12).fill('daisy') }).stems.length, 12);
  for (const patch of [{ version: 2 }, { stems: Array(13).fill('daisy') }, { stems: Array(2) },
    { stems: ['fern'] }, { stems: ['unknown'] }, { paper: 'html' }, { ribbon: '#fff' }, { foliage: 1 }, { tag: 'true' },
    { letterPaper: 'unknown' }, { recipient: 'synthetic@example.test' }]) assert.throws(() => validateBouquet({ ...bouquet, ...patch }));
});

test('the mailto builder retains the full Unicode letter and lets callers detect Windows limits', () => {
  const gift = { recipient: 'synthetic@example.test', subject: 'Um carinho 💐', message: '💐'.repeat(1000) };
  const url = buildBouquetMailto(gift);
  assert.ok(url.length > MAX_MAILTO_LENGTH);
  assert.equal(new URL(url).searchParams.get('body'), gift.message);
  const fallback = buildBouquetMailto({ ...gift, message: '' });
  assert.ok(fallback.length <= MAX_MAILTO_LENGTH);
  assert.equal(new URL(fallback).searchParams.get('subject'), gift.subject);
  assert.equal(decodeURIComponent(new URL(fallback).pathname), gift.recipient);
  assert.equal(gift.message, '💐'.repeat(1000));
});

test('explicit draft consent is required to retain the message and custom subject', () => {
  const bouquet = { ...createBouquet(), stems: ['daisy'], subject: 'SYNTHETIC_SUBJECT', message: 'SYNTHETIC_LETTER' };
  const visualOnly = prepareBouquetDraft(bouquet);
  assert.equal(visualOnly.subject, DEFAULT_SUBJECT);
  assert.equal(visualOnly.message, '');
  assert.deepEqual(visualOnly.stems, ['daisy']);
  assert.equal(bouquet.message, 'SYNTHETIC_LETTER');
  assert.deepEqual(prepareBouquetDraft(bouquet, { includeLetter: true }), bouquet);
  assert.throws(() => prepareBouquetDraft(bouquet, { includeLetter: 'true' }));
  assert.throws(() => prepareBouquetDraft({ ...bouquet, recipient: 'synthetic@example.test' }, { includeLetter: true }));
});

test('image transport accepts only bounded PNG payloads and no filesystem paths', () => {
  assert.deepEqual(validateBouquetImage({ dataUrl: 'data:image/png;base64,AAAA', kind: 'card' }), { dataUrl: 'data:image/png;base64,AAAA', kind: 'card' });
  for (const value of [{ dataUrl: 'https://example.test/image.png', kind: 'card' },
    { dataUrl: 'data:image/svg+xml;base64,AAAA', kind: 'card' }, { dataUrl: 'data:image/png;base64,AAAA', kind: '../file' },
    { dataUrl: 'data:image/png;base64,AAAA', kind: 'card', path: 'C:/private.png' }]) assert.throws(() => validateBouquetImage(value));
});
