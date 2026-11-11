// What an agent is told about a page it cannot see.
const { test } = require('node:test');
const assert = require('node:assert');
const { lintSite } = require('../lint');

const GOOD = `---
title: Rope
description: Braided rope, sold by the metre.
theme: swiss
accent: "#0a7"
font: serif
tags: campaign, founders
---

::nav{brand="Rope"}
- Prices → #prices
::

::hero{eyebrow="since 1904" align=center}
# Rope that holds.
[See prices](#prices){.primary}
::

::pricing{id=prices title="Prices" tone=soft}
- name: Metre
  price: 20 kr
::
`;

test('a clean page has no warnings and an outline', () => {
  const r = lintSite(GOOD);
  assert.deepStrictEqual(r.warnings, []);
  assert.strictEqual(r.ok, true);
  assert.deepStrictEqual(r.outline, ['nav', 'hero', 'pricing']);
  assert.strictEqual(r.theme, 'swiss');
});

function only(src) {
  return lintSite(src).warnings;
}

const HEAD = '---\ntitle: T\ndescription: D\n---\n\n::hero\n# Hi\n::\n\n';

test('frontmatter: missing, unknown theme, bad accent, unknown key', () => {
  assert.match(only('::hero\n# Hi\n::').join('\n'), /No frontmatter/);
  const w = only('---\ntitle: T\ndescription: D\ntheme: brutal\naccent: blue\nfont: comic\ndescripton: x\n---\n\n::hero\n# Hi\n::').join('\n');
  assert.match(w, /theme "brutal" does not exist.*Did you mean "brutalist"\?/);
  assert.match(w, /accent "blue" is not a #rgb or #rrggbb colour/);
  assert.match(w, /font "comic"/);
  assert.match(w, /"descripton" is not a key this format reads. Did you mean "description"\?/);
});

test('an unknown block names the line and the likely block', () => {
  const w = only(HEAD + '::feature{title="x"}\n- title: A\n::');
  assert.deepStrictEqual(w.length, 1);
  assert.match(w[0], /^line 10 ::feature: unknown block, rendered as plain text. Did you mean "features"\?/);
});

test('unknown attributes and fields are reported with what the block takes', () => {
  const w = only(HEAD + '::features{title="x" colums=3}\n- title: A\n  descripton: B\n::').join('\n');
  assert.match(w, /attribute "colums" is not read by this block. Did you mean "columns"\?/);
  assert.match(w, /item 1 has field "descripton", which this block ignores. Did you mean "body"\?|item 1 has field "descripton", which this block ignores\. Fields: icon, title, body/);
});

test('unclosed and nested blocks', () => {
  assert.match(only(HEAD + '::cta\n## Go').join('\n'), /::cta: never closed/);
  assert.match(only(HEAD + '::text\nIntro\n::features\n- title: A\n::').join('\n'), /contains "::features". Blocks do not nest/);
});

test('anchors must point at an id, and ids must be unique', () => {
  const w = only(HEAD + '::nav\n- Prices → #prices\n::\n\n::text{id=a}\nx\n::\n\n::text{id=a}\ny\n::').join('\n');
  assert.match(w, /links to #prices, but no block has id=prices/);
  assert.match(w, /id "a" is already used on line \d+/);
});

test('list blocks without items, compare widths, missing alt text', () => {
  assert.match(only(HEAD + '::steps\nJust prose.\n::').join('\n'), /has no items. Write them as a markdown list/);
  const c = only(HEAD + '::compare{columns="A, B, C"}\n- row: x\n  values: yes; no\n::').join('\n');
  assert.match(c, /row 1 has 2 values for 3 columns/);
  assert.match(only(HEAD + '::two-column{image="https://x.y/a.jpg"}\nText\n::').join('\n'), /image has no imageAlt/);
  assert.match(only(HEAD + '::gallery\n- image: https://x.y/a.jpg\n::').join('\n'), /item 1 has an image with no alt/);
});

test('a page without a hero is told so; tone, align and button class are checked', () => {
  assert.match(only('---\ntitle: T\ndescription: D\n---\n\n::text\nx\n::').join('\n'), /No ::hero/);
  const w = only(HEAD + '::text{tone=neon align=right}\n[Go](https://x.y){.big}\n::').join('\n');
  assert.match(w, /tone "neon" is not one of plain, soft, accent, dark/);
  assert.match(w, /align "right" is not one of left, center/);
  assert.match(w, /button class ".big"/);
});

test('video src is checked', () => {
  assert.match(only(HEAD + '::video\n::').join('\n'), /needs src=/);
  assert.match(only(HEAD + '::video{src="https://example.com/x"}\n::').join('\n'), /renders as a link/);
  assert.deepStrictEqual(only(HEAD + '::video{src="https://youtu.be/abcDEF12345"}\n::'), []);
});
