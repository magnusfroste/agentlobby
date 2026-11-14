// A small edit to a page: the header writer, and the store's patch.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { parseFrontmatter, setFrontmatter } = require('../render');

const PAGE = `---
title: "Rope — sold by the metre"
description: Braided rope.
theme: warm
---

::hero
# Rope that holds.
Rope, braided in Gothenburg.
::
`;

let dir;
let store;

before(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lobby-patch-'));
  process.env.SITES_DIR = dir;
  store = require('../store');
});

after(() => fs.rmSync(dir, { recursive: true, force: true }));

test('setting a key changes its line and nothing else', () => {
  const out = setFrontmatter(PAGE, { description: 'Braided rope, pull-tested.' });
  assert.strictEqual(out, PAGE.replace('description: Braided rope.', 'description: Braided rope, pull-tested.'));
});

test('a new key goes last in the header, and null removes one', () => {
  const out = setFrontmatter(PAGE, { accent: '#0a7', theme: null });
  assert.deepStrictEqual(parseFrontmatter(out).meta, { title: 'Rope — sold by the metre', description: 'Braided rope.', accent: '#0a7' });
  assert.ok(out.startsWith('---\ntitle: "Rope — sold by the metre"\ndescription: Braided rope.\naccent: #0a7\n---\n\n::hero'));
  assert.strictEqual(setFrontmatter(PAGE, { accent: '' }), PAGE);
});

test('a quoted line stays quoted, and a value with quotes at its ends survives', () => {
  assert.match(setFrontmatter(PAGE, { title: 'Rope' }), /^---\ntitle: "Rope"\n/);
  for (const value of ['"Holds" — every time', 'Rope they call "the best"', "'til it holds", 'true', 'A: B']) {
    assert.strictEqual(parseFrontmatter(setFrontmatter(PAGE, { title: value })).meta.title, value);
  }
  assert.strictEqual(parseFrontmatter(setFrontmatter(PAGE, { noindex: true })).meta.noindex, 'true');
});

test('a page with no header gets one, and a key written twice is left once', () => {
  assert.strictEqual(setFrontmatter('::hero\n# Hi\n::\n', { title: 'Hi' }), '---\ntitle: Hi\n---\n\n::hero\n# Hi\n::\n');
  const twice = '---\ntheme: warm\ntitle: T\ntheme: swiss\n---\nbody';
  assert.strictEqual(setFrontmatter(twice, { theme: 'aurora' }), '---\ntheme: aurora\ntitle: T\n---\nbody');
  assert.strictEqual(setFrontmatter('---\r\ntitle: T\r\n---\r\nbody', { lang: 'sv' }), '---\r\ntitle: T\r\nlang: sv\r\n---\r\nbody');
});

test('what cannot be one header line is refused', () => {
  assert.throws(() => setFrontmatter(PAGE, { description: 'two\nlines' }), /one line/);
  assert.throws(() => setFrontmatter(PAGE, { 'bad key': 'x' }), /cannot be a frontmatter key/);
  assert.throws(() => setFrontmatter(PAGE, { tags: ['a', 'b'] }), /must be text/);
});

test('patch replaces text that occurs once and says why when it does not', () => {
  const v1 = store.write('rope.example', PAGE).version;
  const p = store.patch('rope.example', { old: '# Rope that holds.', new: '# Rope that **holds**.' });
  assert.strictEqual(p.changed, true);
  assert.notStrictEqual(p.version, v1);
  assert.strictEqual(p.content, PAGE.replace('# Rope that holds.', '# Rope that **holds**.'));
  assert.deepStrictEqual(store.read('rope.example'), { host: 'rope.example', content: p.content, version: p.version });
  assert.strictEqual(p.created, undefined);

  assert.throws(() => store.patch('rope.example', { old: 'Hemp', new: 'Jute' }), /was not found/);
  assert.throws(() => store.patch('rope.example', { old: 'Rope', new: 'Line' }), /occurs 3 times/);
  assert.throws(() => store.patch('rope.example', { old: '', new: 'x' }), /old must be/);
  assert.throws(() => store.patch('rope.example', { old: 'Gothenburg' }), /new must be/);
  assert.throws(() => store.patch('rope.example', {}), /Nothing to change/);
  assert.throws(() => store.patch('rope.example', { frontmatter: {} }), /frontmatter must be/);
  // None of the refusals touched the file.
  assert.strictEqual(store.read('rope.example').version, p.version);
});

test('patch takes the replacement literally, and can do both edits at once', () => {
  store.write('both.example', PAGE);
  const p = store.patch('both.example', { old: 'Rope, braided in Gothenburg.', new: 'From $& a metre.', frontmatter: { theme: 'swiss' } });
  assert.match(p.content, /^From \$& a metre\.$/m);
  assert.strictEqual(parseFrontmatter(p.content).meta.theme, 'swiss');
  assert.strictEqual(store.patch('both.example', { old: 'From $& a metre.\n', new: '' }).content.includes('metre.'), false);
});

test('patch refuses a stale version, changes nothing when nothing differs, and needs a site', () => {
  const v = store.write('stale.example', PAGE).version;
  assert.throws(() => store.patch('stale.example', { frontmatter: { theme: 'swiss' } }, 'abc123abc123'), e => e.conflict && e.currentVersion === v);
  const same = store.patch('stale.example', { frontmatter: { theme: 'warm' } }, v);
  assert.strictEqual(same.changed, false);
  assert.strictEqual(same.version, v);
  assert.strictEqual(store.patch('nobody.example', { frontmatter: { theme: 'warm' } }), null);
  assert.throws(() => store.patch('../etc/passwd', { frontmatter: { theme: 'warm' } }), /Invalid host/);
});
