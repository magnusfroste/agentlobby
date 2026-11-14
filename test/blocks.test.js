// The blocks an agent builds pages from, and what they promise.
const { test } = require('node:test');
const assert = require('node:assert');
const { parseBlocks, renderBlocks, safeUrl, videoEmbed, renderers } = require('../render');
const crypto = require('node:crypto');
const { FORMAT, BLOCKS, ALIASES, UNIVERSAL_ATTRS, TONES, ALIGNS, FRONTMATTER, FONTS, BUTTON_KINDS } = require('../blocks');
const { THEMES, siteCss, themeCss, listThemes } = require('../themes');
const styles = require('../styles');
const { TOOLS } = require('../mcp');

const render = src => renderBlocks(parseBlocks(src));

test('every block in the table has a renderer, and every example renders', () => {
  for (const [name, b] of Object.entries(BLOCKS)) {
    assert.ok(renderers[name], `no renderer for ${name}`);
    const html = render(b.example);
    assert.match(html, /<(section|nav)/, `${name} example rendered nothing`);
    assert.doesNotMatch(html, /::/, `${name} example left a directive in the page`);
  }
  for (const alias of Object.keys(ALIASES)) assert.ok(renderers[alias], `no renderer for alias ${alias}`);
});

test('id, tone and align work on any block', () => {
  const html = render('::features{id=what tone=dark align=center}\n- title: A\n::');
  assert.match(html, /^<section id="what" class="block features tone-dark align-center"/);
  // tone=plain and unknown values add nothing.
  assert.match(render('::text{tone=plain}\nx\n::'), /^<section class="block text">/);
  assert.match(render('::text{tone=neon id="1bad"}\nx\n::'), /^<section class="block text">/);
});

test('a banner is an accent band unless told otherwise', () => {
  assert.match(render('::banner\nNews. [Read](#a){.primary}\n::'), /class="block banner tone-accent".*<a class="btn btn-primary" href="#a">Read<\/a>/s);
  assert.match(render('::banner{tone=dark}\nNews\n::'), /class="block banner tone-dark"/);
});

test('steps are numbered in order', () => {
  const html = render('::steps\n- title: One\n- title: Two\n  body: Then **this**.\n::');
  assert.match(html, /<span class="step-n">1<\/span>[\s\S]*One[\s\S]*<span class="step-n">2<\/span>[\s\S]*Two[\s\S]*<strong>this<\/strong>/);
});

test('compare turns yes and no into marks and highlights the first column', () => {
  const html = render('::compare{columns="Us, Them"}\n- row: Fast\n  values: yes; no\n- row: Price\n  values: Free; partial\n::');
  assert.match(html, /<th class="col-hl">Us<\/th><th>Them<\/th>/);
  assert.match(html, /<td class="col-hl"><span class="mark-yes" aria-label="yes">✓<\/span><\/td><td><span class="mark-no" aria-label="no">✗<\/span><\/td>/);
  assert.match(html, /<td class="col-hl">Free<\/td><td><span class="mark-partial">Partial<\/span><\/td>/);
  assert.doesNotMatch(render('::compare{columns="A, B" highlight=0}\n- row: x\n  values: yes; yes\n::'), /col-hl/);
});

test('logos take bare names or images', () => {
  const html = render('::logos{title="Runs on"}\n- Docker\n- name: Caddy\n  image: https://example.com/caddy.svg\n::');
  assert.match(html, /<p class="logos-title">Runs on<\/p>/);
  assert.match(html, /<span class="logo-name">Docker<\/span>/);
  assert.match(html, /<img class="logo-img" src="https:\/\/example.com\/caddy.svg" alt="Caddy"/);
});

test('cards link when they have an href and stay plain when they do not', () => {
  const html = render('::cards{columns=2}\n- title: A\n  href: #a\n  tag: New\n  cta: Read →\n- title: B\n::');
  assert.match(html, /style="--cols:2"/);
  assert.match(html, /<a class="link-card" href="#a">[\s\S]*<p class="card-tag">New<\/p>[\s\S]*<p class="card-cta">Read →<\/p>/);
  assert.match(html, /<div class="link-card">[\s\S]*<h3>B<\/h3>/);
});

test('testimonials and gallery', () => {
  assert.match(render('::testimonials\n- quote: Great.\n  by: Sam\n  role: CTO\n::'), /<blockquote>Great.<\/blockquote>[\s\S]*Sam · CTO/);
  const g = render('::gallery\n- image: https://example.com/a.jpg\n  alt: A\n  caption: First\n- image: javascript:alert(1)\n  alt: B\n::');
  assert.match(g, /<figure><img src="https:\/\/example.com\/a.jpg" alt="A" loading="lazy"><figcaption>First<\/figcaption><\/figure>/);
  assert.doesNotMatch(g, /javascript/);
});

test('a hero with an image puts the picture beside the text', () => {
  const html = render('::hero{image="https://example.com/h.jpg" imageAlt="Hall"}\n# Hi\n::');
  assert.match(html, /class="block hero hero-media"><div class="hero-text">[\s\S]*<h1>Hi<\/h1>[\s\S]*<div class="hero-picture"><img src="https:\/\/example.com\/h.jpg" alt="Hall"/);
  assert.match(render('::hero\n# Hi\n::'), /^<section class="block hero"><h1>/);
});

test('videos embed without tracking, and an unknown host becomes a link', () => {
  assert.deepStrictEqual(videoEmbed('https://www.youtube.com/watch?v=abcDEF12345'), { kind: 'iframe', url: 'https://www.youtube-nocookie.com/embed/abcDEF12345' });
  assert.deepStrictEqual(videoEmbed('https://youtu.be/abcDEF12345?t=3'), { kind: 'iframe', url: 'https://www.youtube-nocookie.com/embed/abcDEF12345' });
  assert.deepStrictEqual(videoEmbed('https://vimeo.com/123456'), { kind: 'iframe', url: 'https://player.vimeo.com/video/123456?dnt=1' });
  assert.strictEqual(videoEmbed('https://cdn.example.com/a.mp4').kind, 'file');
  assert.strictEqual(videoEmbed('https://example.com/page'), null);
  assert.match(render('::video{src="https://cdn.example.com/a.mp4" poster="https://cdn.example.com/a.jpg"}\n::'), /<video controls preload="metadata" src="https:\/\/cdn.example.com\/a.mp4" poster="https:\/\/cdn.example.com\/a.jpg"/);
  assert.match(render('::video{src="https://example.com/page"}\n::'), /<a class="btn btn-ghost" href="https:\/\/example.com\/page">Watch the video<\/a>/);
});

test('no link or picture can carry javascript:', () => {
  assert.strictEqual(safeUrl('javascript:alert(1)'), '');
  assert.strictEqual(safeUrl(' JavaScript:alert(1)'), '');
  assert.strictEqual(safeUrl('data:text/html,x'), '');
  for (const ok of ['https://a.b/c', '/x', '#y', 'mailto:a@b.c', 'tel:+46', 'logo.png']) assert.strictEqual(safeUrl(ok), ok);
  const html = render('::hero\n[Go](javascript:alert(1)){.primary}\n::\n\n::nav{brand="X" home="javascript:alert(1)"}\n- A → javascript:alert(1)\n::');
  assert.doesNotMatch(html, /javascript:/i);
});

test('the parser says where a block opens and when it never closes', () => {
  const blocks = parseBlocks('intro\n\n::hero\n# Hi\n::\n\n::cta\nopen');
  assert.deepStrictEqual(blocks.map(b => [b.type, b.line, !!b.unclosed]), [['text', 1, false], ['hero', 3, false], ['cta', 7, true]]);
});

test('accent and font override the theme, and the button text stays readable', () => {
  const dark = siteCss({ theme: 'warm', accent: '#123' });
  assert.match(dark, /:root \{ --accent: #112233; --accent-fg: #ffffff; \}$/);
  assert.match(siteCss({ accent: '#ffe066' }), /--accent-fg: #111111/);
  assert.doesNotMatch(siteCss({ accent: 'red; } body { display:none' }), /display:none/);
  assert.match(siteCss({ font: 'serif' }), /body \{ font-family: ui-serif/);
  assert.doesNotMatch(siteCss({ font: 'comic' }), /font-family: comic/);
});

// Where a theme's palette is written: the base stylesheet for the default
// theme, the theme's own CSS for the rest.
const paletteSource = name => (name === 'default' ? styles : siteCss({ theme: name }));

test('the colours an agent is told are the colours in the stylesheet', () => {
  for (const t of listThemes()) {
    const [unconditional, forDark = ''] = paletteSource(t.name).split('@media (prefers-color-scheme: dark)');
    const schemes = Object.keys(t.colors);
    assert.ok(['light,dark', 'both'].includes(schemes.join()), `${t.name}: ${schemes}`);
    for (const [scheme, c] of Object.entries(t.colors)) {
      for (const [role, hex] of Object.entries(c)) assert.match(hex, /^#[0-9a-f]{6}$/, `${t.name} ${scheme} ${role}`);
      const rule = new RegExp(`:root \\{ --bg: ${c.background}; --fg: ${c.text};[^}]*--accent: ${c.accent};`);
      // The light or only palette is unconditional; the dark one sits behind
      // the media query.
      assert.match(scheme === 'dark' ? forDark : unconditional, rule, `${t.name} ${scheme} palette is not in the CSS`);
    }
  }
  // The base stylesheet takes the default theme's palette from the same table.
  assert.ok(styles.includes(`--bg: ${THEMES.default.light.bg};`) && styles.includes(`--bg: ${THEMES.default.dark.bg};`));
});

test('a theme that ignores the visitor\'s colour scheme says so, and only those do', () => {
  for (const t of listThemes()) {
    const fixed = !!t.colors.both;
    assert.strictEqual(/both colour schemes/.test(t.description), fixed, `${t.name}: "${t.description}"`);
    if (fixed) assert.doesNotMatch(themeCss(t.name), /prefers-color-scheme/, `${t.name} changes with the colour scheme`);
  }
});

test('midnight is dark for every visitor', () => {
  const midnight = listThemes().find(t => t.name === 'midnight');
  assert.deepStrictEqual(midnight.colors, { both: { background: '#0a0f16', text: '#dfe7f0', accent: '#22d3ee' } });
  assert.doesNotMatch(midnight.description, /by default/);
  assert.strictEqual(siteCss({ theme: 'midnight' }).match(/--bg:/g).length, 1);
});

test('the format version is the newest entry in its list of changes', () => {
  assert.strictEqual(FORMAT.changes[0].version, FORMAT.version);
  FORMAT.changes.forEach((c, i) => {
    assert.strictEqual(c.version, FORMAT.version - i, 'changes are newest first, one entry per version');
    assert.match(c.date, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(c.changed.length && c.changed.every(line => typeof line === 'string' && line.length > 10));
  });
});

// Everything an agent can name: blocks, attributes, fields, frontmatter keys,
// themes and tools. Wording is left out, so fixing a typo in a description
// does not count as a new version.
const SHAPE = '2:32d7f4228aca';

test('the format cannot change without a new version', () => {
  const shape = crypto.createHash('sha256').update(JSON.stringify({
    blocks: Object.entries(BLOCKS).map(([name, b]) => [name, Object.keys(b.attrs), Object.keys(b.items || {})]),
    aliases: ALIASES,
    universal: Object.keys(UNIVERSAL_ATTRS),
    tones: TONES,
    aligns: ALIGNS,
    frontmatter: Object.keys(FRONTMATTER),
    fonts: Object.keys(FONTS),
    buttons: BUTTON_KINDS,
    themes: listThemes().map(t => [t.name, Object.keys(t.colors)]),
    tools: Object.entries(TOOLS).map(([name, t]) => [name, Object.keys(t.inputSchema.properties)])
  })).digest('hex').slice(0, 12);
  assert.strictEqual(`${FORMAT.version}:${shape}`, SHAPE,
    `What an agent can use has changed. Raise FORMAT.version in blocks.js, add an entry to FORMAT.changes saying what is new, then set SHAPE in this test to '${FORMAT.version}:${shape}'.`);
});
