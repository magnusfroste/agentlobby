// What a careful reviewer would say about a page before it goes live.
//
// The renderer forgives on purpose: an unknown block still shows its words, a
// misspelt field is ignored. That is right for a visitor and wrong for the
// author, who never learns why the layout came out flat. An agent writing many
// pages on its own has no eyes on the result, so it is told here instead, with
// the line and the fix. Nothing in this file refuses a write.

const { parseFrontmatter, parseBlocks, parseItems, videoEmbed } = require('./render');
const { BLOCKS, ALIASES, UNIVERSAL_ATTRS, TONES, ALIGNS, FRONTMATTER, FONTS, BUTTON_KINDS, spec } = require('./blocks');
const { THEMES, normaliseHex } = require('./themes');

function distance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return d[a.length][b.length];
}

function closest(word, options) {
  let best = null;
  for (const o of options) {
    const d = distance(word, o);
    if (d <= Math.max(2, Math.floor(o.length / 3)) && (!best || d < best.d)) best = { o, d };
  }
  return best ? best.o : null;
}

function didYouMean(word, options) {
  const c = closest(word, options);
  return c ? ` Did you mean "${c}"?` : '';
}

const isWebUrl = u => /^https?:\/\//i.test(String(u || '').trim());

function lintSite(content) {
  const warnings = [];
  const src = String(content || '');
  const { meta, body } = parseFrontmatter(src);
  const hasFrontmatter = /^---\r?\n/.test(src);
  // Block lines are counted from the body, so add the frontmatter's lines back
  // to point at the line the author sees in the file.
  const offset = hasFrontmatter ? src.slice(0, src.length - body.length).split('\n').length - 1 : 0;
  const at = b => `line ${b.line + offset}`;
  const warn = (where, message) => warnings.push(where ? `${where}: ${message}` : message);

  // Frontmatter
  if (!hasFrontmatter) warn('', 'No frontmatter. Start the file with ---, title: and description:, then ---.');
  if (!meta.title) warn('frontmatter', 'title is missing — it is the browser tab and the search result headline.');
  if (!meta.description) warn('frontmatter', 'description is missing — search results and link previews show it.');
  else if (meta.description.length > 170) warn('frontmatter', `description is ${meta.description.length} characters; search results cut it near 160.`);
  if (meta.theme && !THEMES[meta.theme]) warn('frontmatter', `theme "${meta.theme}" does not exist, so the default theme is used.${didYouMean(meta.theme, Object.keys(THEMES))} Themes: ${Object.keys(THEMES).join(', ')}.`);
  if (meta.accent && !normaliseHex(meta.accent)) warn('frontmatter', `accent "${meta.accent}" is not a #rgb or #rrggbb colour, so it is ignored.`);
  if (meta.font && !FONTS[meta.font.toLowerCase()]) warn('frontmatter', `font "${meta.font}" is not one of ${Object.keys(FONTS).join(', ')}.`);
  if (meta.image && !isWebUrl(meta.image)) warn('frontmatter', 'image should be a full https:// URL, or link previews cannot fetch it.');
  for (const key of Object.keys(meta)) {
    if (!FRONTMATTER[key]) warn('frontmatter', `"${key}" is not a key this format reads.${didYouMean(key, Object.keys(FRONTMATTER))}`);
  }

  // Blocks
  const blocks = parseBlocks(body);
  const known = [...Object.keys(BLOCKS), ...Object.keys(ALIASES)];
  const ids = new Map();
  const anchors = [];

  for (const b of blocks) {
    if (b.implicit) continue;
    const where = `${at(b)} ::${b.type}`;
    const s = spec(b.type);
    if (!s) {
      warn(where, `unknown block, rendered as plain text.${didYouMean(b.type, known)} Blocks: ${Object.keys(BLOCKS).join(', ')}.`);
      continue;
    }
    if (b.unclosed) warn(where, 'never closed — add a line with only :: after it. Everything below became part of this block.');
    // A block cannot contain another: the first :: closes the outer one, so a
    // nested opener shows up as text inside it.
    const nested = /^::([a-z][a-z0-9-]*)/im.exec(b.body);
    if (nested) warn(where, `contains "::${nested[1]}". Blocks do not nest — close this one with :: before opening the next.`);

    for (const name of Object.keys(b.attrs)) {
      if (UNIVERSAL_ATTRS[name] || s.attrs[name]) continue;
      warn(where, `attribute "${name}" is not read by this block.${didYouMean(name, [...Object.keys(s.attrs), ...Object.keys(UNIVERSAL_ATTRS)])} It takes: ${[...Object.keys(s.attrs), ...Object.keys(UNIVERSAL_ATTRS)].join(', ')}.`);
    }
    if (b.attrs.tone && !TONES.includes(b.attrs.tone)) warn(where, `tone "${b.attrs.tone}" is not one of ${TONES.join(', ')}.`);
    if (b.attrs.align && !ALIGNS.includes(b.attrs.align)) warn(where, `align "${b.attrs.align}" is not one of ${ALIGNS.join(', ')}.`);
    if (b.attrs.id) {
      if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(b.attrs.id)) warn(where, `id "${b.attrs.id}" must start with a letter and use only letters, digits, - and _.`);
      else if (ids.has(b.attrs.id)) warn(where, `id "${b.attrs.id}" is already used on ${ids.get(b.attrs.id)}.`);
      else ids.set(b.attrs.id, at(b));
    }
    if (b.attrs.columns && !/^[2-4]$/.test(b.attrs.columns) && b.type !== 'compare') warn(where, `columns=${b.attrs.columns} — use 2, 3 or 4.`);
    if (b.attrs.image && !b.attrs.imageAlt) warn(where, 'image has no imageAlt — describe the picture for screen readers and search.');

    // Buttons
    for (const m of b.body.matchAll(/\[[^\]]+\]\(([^)]+)\)\{\.([a-z]+)\}/g)) {
      if (!BUTTON_KINDS.includes(m[2])) warn(where, `button class ".${m[2]}" — use .primary or .ghost.`);
      if (m[1].startsWith('#')) anchors.push({ where, href: m[1] });
    }

    if (s.items) {
      const items = parseItems(b.body);
      if (!items.length) {
        warn(where, `has no items. Write them as a markdown list, e.g.\n${s.example}`);
        continue;
      }
      const fields = Object.keys(s.items);
      items.forEach((item, n) => {
        for (const key of Object.keys(item)) {
          // label/href come from the "- Label → /href" shorthand.
          if (key === 'label' || key === 'href' || fields.includes(key)) continue;
          warn(where, `item ${n + 1} has field "${key}", which this block ignores.${didYouMean(key, fields)} Fields: ${fields.join(', ')}.`);
        }
        if (item.href && item.href.startsWith('#')) anchors.push({ where, href: item.href });
        if (item.image && !item.alt && b.type !== 'logos') warn(where, `item ${n + 1} has an image with no alt.`);
      });
      if (b.type === 'compare') {
        const cols = String(b.attrs.columns || '').split(',').map(x => x.trim()).filter(Boolean);
        if (!cols.length) warn(where, 'needs columns="Us, Them" to name the columns.');
        items.forEach((item, n) => {
          const values = String(item.values || '').split(';').filter(v => v.trim());
          if (cols.length && values.length !== cols.length) warn(where, `row ${n + 1} has ${values.length} values for ${cols.length} columns.`);
        });
      }
      if (b.type === 'pricing' && items.filter(i => i.featured === 'true').length > 1) warn(where, 'more than one tier is featured; one stands out, several do not.');
    }

    if (b.type === 'video') {
      if (!b.attrs.src) warn(where, 'needs src= with a YouTube, Vimeo or .mp4 URL.');
      else if (!videoEmbed(b.attrs.src)) warn(where, `src "${b.attrs.src}" is not a YouTube, Vimeo or direct video URL, so it renders as a link.`);
    }
  }

  for (const a of anchors) {
    const id = a.href.slice(1);
    if (id && !ids.has(id)) warn(a.where, `links to ${a.href}, but no block has id=${id}.`);
  }

  const outline = blocks.map(b => (b.implicit ? 'text' : b.type));
  if (!blocks.some(b => b.type === 'hero')) warn('', 'No ::hero. A landing page usually opens with one.');
  return { ok: warnings.length === 0, warnings, outline, title: meta.title || '', theme: meta.theme || 'default' };
}

module.exports = { lintSite, closest };
