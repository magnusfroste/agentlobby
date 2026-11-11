// A site is one markdown file. This turns it into HTML.
//
// The format is markdownweb's: optional YAML-ish frontmatter, then blocks
// written as ::name{attr="value"} … :: with markdown inside. Anything outside
// a block is a text block, so a plain markdown file renders fine with no
// directives at all — that is the floor we never want to fall below.

const { marked } = require('marked');
const store = require('./store');
const { TONES, spec } = require('./blocks');

marked.setOptions({ mangle: false, headerIds: false });
// Every link and picture in markdown goes through the same gate as the ones in
// block attributes, so [x](javascript:…) cannot ride in on plain prose.
marked.use({
  walkTokens(token) {
    if (token.type === 'link' || token.type === 'image') token.href = safeUrl(token.href) || '#';
  }
});

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// Frontmatter is three dashes, then key: value lines. Deliberately not a YAML
// parser: a site's header is a handful of strings, and a real parser would be
// the largest dependency in the project.
function parseFrontmatter(src) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(src);
  if (!m) return { meta: {}, body: src };
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^\s*([A-Za-z0-9_-]+)\s*:\s*(.*)$/.exec(line);
    if (kv) meta[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, '');
  }
  return { meta, body: src.slice(m[0].length) };
}

// ::name{a="b" c=3} — quoted values may contain spaces, bare ones may not.
function parseAttrs(raw) {
  const attrs = {};
  if (!raw) return attrs;
  const re = /([A-Za-z0-9_-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s}]+))/g;
  let m;
  while ((m = re.exec(raw))) attrs[m[1]] = m[2] ?? m[3] ?? m[4];
  return attrs;
}

// Each block remembers the line it opened on (counted within the body), so a
// checker can say where a problem is instead of only what it is.
function parseBlocks(body) {
  const blocks = [];
  const open = /^::([a-z][a-z0-9-]*)(\{[^\n]*\})?\s*$/im;
  let rest = body;
  let consumed = 0;
  const lineAt = offset => body.slice(0, offset).split('\n').length;

  while (rest.length) {
    const m = open.exec(rest);
    if (!m) { pushText(blocks, rest, lineAt(consumed)); break; }

    pushText(blocks, rest.slice(0, m.index), lineAt(consumed));
    const after = rest.slice(m.index + m[0].length);
    // A block ends at a line that is exactly "::". An unclosed block runs to
    // the end of the file rather than swallowing the page silently.
    const close = /^::\s*$/m.exec(after);
    const inner = close ? after.slice(0, close.index) : after;
    const block = { type: m[1].toLowerCase(), attrs: parseAttrs(m[2]), body: inner.trim(), line: lineAt(consumed + m.index) };
    if (!close) block.unclosed = true;
    blocks.push(block);
    const used = m.index + m[0].length + (close ? close.index + close[0].length : after.length);
    consumed += used;
    rest = rest.slice(used);
  }
  return blocks;
}

function pushText(blocks, text, line) {
  if (text && text.trim()) blocks.push({ type: 'text', attrs: {}, body: text.trim(), line, implicit: true });
}

// A URL an agent wrote ends up in src= or href=. Only web addresses, page
// anchors, relative paths, mailto: and tel: get through; javascript: and data:
// never do, whoever wrote the page.
function safeUrl(u) {
  const s = String(u || '').trim();
  if (!s) return '';
  if (/^(https?:\/\/|\/|#|\.\/|mailto:|tel:)/i.test(s)) return s;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) return s;   // relative, e.g. "logo.png"
  return '';
}

function heading(b) {
  return b.attrs.title ? `<h2>${escapeHtml(b.attrs.title)}</h2>` : '';
}

function columns(b, fallback = 3) {
  return Math.min(4, Math.max(2, parseInt(b.attrs.columns) || fallback));
}

function img(src, alt, cls = '') {
  const url = safeUrl(src);
  if (!url) return '';
  return `<img${cls ? ` class="${cls}"` : ''} src="${escapeHtml(url)}" alt="${escapeHtml(alt || '')}" loading="lazy">`;
}

// yes/no in a comparison read faster as marks than as words.
function compareCell(v) {
  const t = String(v || '').trim();
  if (/^(yes|y|true|✓|✔)$/i.test(t)) return '<span class="mark-yes" aria-label="yes">✓</span>';
  if (/^(no|n|false|✗|✘|-|—)$/i.test(t)) return '<span class="mark-no" aria-label="no">✗</span>';
  if (/^(partial|some|limited|~)$/i.test(t)) return '<span class="mark-partial">Partial</span>';
  return inline(t);
}

// The players a video URL can be turned into. YouTube goes through its
// no-cookie domain and Vimeo with do-not-track, so a landing page does not set
// tracking cookies just by being opened.
function videoEmbed(src) {
  const s = String(src || '').trim();
  let m = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/.exec(s);
  if (m) return { kind: 'iframe', url: `https://www.youtube-nocookie.com/embed/${m[1]}` };
  m = /vimeo\.com\/(?:video\/)?(\d+)/.exec(s);
  if (m) return { kind: 'iframe', url: `https://player.vimeo.com/video/${m[1]}?dnt=1` };
  if (/^https?:\/\/\S+\.(mp4|webm|ogg)(\?\S*)?$/i.test(s)) return { kind: 'file', url: s };
  return null;
}

// Links written as [label](/href){.primary} become buttons; the class marks
// intent, so a hero's call to action is styled without inventing new syntax.
function extractActions(md) {
  const actions = [];
  const rest = md.replace(/\[([^\]]+)\]\(([^)]+)\)\{\.([a-z]+)\}/g, (_, label, href, kind) => {
    actions.push({ label, href, kind });
    return '';
  });
  return { actions, rest };
}

function actionsHtml(actions) {
  if (!actions.length) return '';
  return `<p class="actions">${actions.map(a =>
    `<a class="btn btn-${escapeHtml(a.kind)}" href="${escapeHtml(safeUrl(a.href) || '#')}">${escapeHtml(a.label)}</a>`
  ).join('')}</p>`;
}

function md(src) {
  return marked.parse(src || '');
}


// Several blocks are lists of small records. Written as markdown lists so the
// file still reads as prose, in two shapes:
//
//   - Label → /href                       (nav, footer: a link)
//   - title: Agents author                (features, pricing, faq: fields)
//     body: MCP exposes 40+ skills
//
// Deliberately not YAML. These are a handful of one-line values, and a real
// parser would be the largest dependency in the project for no gain.
function parseItems(body) {
  const items = [];
  let current = null;
  for (const raw of String(body || '').split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (!line.trim()) continue;

    const start = /^\s*-\s+(.*)$/.exec(line);
    if (start) {
      current = {};
      items.push(current);
      const kv = /^([A-Za-z][A-Za-z0-9_]*)\s*:\s*(.*)$/.exec(start[1]);
      if (kv) { current[kv[1].toLowerCase()] = kv[2].trim(); continue; }
      // "Label → /href" or "Label -> /href"
      const link = /^(.*?)\s*(?:→|->)\s*(\S+)$/.exec(start[1]);
      if (link) { current.label = link[1].trim(); current.href = link[2].trim(); continue; }
      current.label = start[1].trim();
      continue;
    }

    const cont = /^\s+([A-Za-z][A-Za-z0-9_]*)\s*:\s*(.*)$/.exec(line);
    if (cont && current) { current[cont[1].toLowerCase()] = cont[2].trim(); continue; }
    // A plain continuation line extends whichever field came last.
    if (current) {
      const keys = Object.keys(current);
      if (keys.length) current[keys[keys.length - 1]] += ' ' + line.trim();
    }
  }
  return items;
}

function inline(text) {
  // marked wraps a lone line in <p>; inside a card that is unwanted markup.
  return md(text).replace(/^<p>|<\/p>\s*$/g, '').trim();
}

const renderers = {
  hero(b) {
    const { actions, rest } = extractActions(b.body);
    const eyebrow = b.attrs.eyebrow
      ? `<p class="eyebrow">${escapeHtml(b.attrs.eyebrow)}</p>` : '';
    const text = `${eyebrow}${md(rest)}${actionsHtml(actions)}`;
    const picture = img(b.attrs.image, b.attrs.imageAlt);
    if (!picture) return `<section class="block hero">${text}</section>`;
    return `<section class="block hero hero-media"><div class="hero-text">${text}</div><div class="hero-picture">${picture}</div></section>`;
  },

  banner(b) {
    const { actions, rest } = extractActions(b.body);
    const buttons = actions.map(a =>
      `<a class="btn btn-${escapeHtml(a.kind)}" href="${escapeHtml(safeUrl(a.href) || '#')}">${escapeHtml(a.label)}</a>`).join('');
    return `<section class="block banner"><p>${inline(rest)}${buttons}</p></section>`;
  },

  cards(b) {
    const cards = parseItems(b.body).map(i => {
      const href = safeUrl(i.href);
      const pic = img(i.image, i.alt, 'card-img');
      const inner = `${pic}<div class="card-body">
        ${i.tag ? `<p class="card-tag">${escapeHtml(i.tag)}</p>` : ''}
        <h3>${escapeHtml(i.title || i.label || '')}</h3>
        ${i.body ? `<p>${inline(i.body)}</p>` : ''}
        ${i.cta ? `<p class="card-cta">${escapeHtml(i.cta)}</p>` : ''}
      </div>`;
      return href
        ? `<a class="link-card" href="${escapeHtml(href)}">${inner}</a>`
        : `<div class="link-card">${inner}</div>`;
    }).join('');
    return `<section class="block cards">${heading(b)}<div class="link-card-grid" style="--cols:${columns(b)}">${cards}</div></section>`;
  },

  steps(b) {
    const rows = parseItems(b.body).map((i, n) => `<li class="step">
      <span class="step-n">${n + 1}</span>
      <div><h3>${escapeHtml(i.title || i.label || '')}</h3>${i.body ? `<p>${inline(i.body)}</p>` : ''}</div>
    </li>`).join('');
    return `<section class="block steps">${heading(b)}<ol class="step-list">${rows}</ol></section>`;
  },

  logos(b) {
    const title = b.attrs.title ? `<p class="logos-title">${escapeHtml(b.attrs.title)}</p>` : '';
    const items = parseItems(b.body).map(i => {
      const name = i.name || i.label || '';
      const mark = img(i.image, name, 'logo-img') || `<span class="logo-name">${escapeHtml(name)}</span>`;
      const href = safeUrl(i.href);
      return href ? `<a class="logo" href="${escapeHtml(href)}">${mark}</a>` : `<span class="logo">${mark}</span>`;
    }).join('');
    return `<section class="block logos">${title}<div class="logo-row">${items}</div></section>`;
  },

  testimonials(b) {
    const cards = parseItems(b.body).map(i => {
      const who = [i.by, i.role].filter(Boolean).map(escapeHtml).join(' · ');
      return `<figure class="testimonial">
        <blockquote>${inline(i.quote || i.label || '')}</blockquote>
        ${who ? `<figcaption>${img(i.avatar, i.by, 'avatar')}<span>${who}</span></figcaption>` : ''}
      </figure>`;
    }).join('');
    return `<section class="block testimonials">${heading(b)}<div class="testimonial-grid">${cards}</div></section>`;
  },

  compare(b) {
    const cols = String(b.attrs.columns || '').split(',').map(s => s.trim()).filter(Boolean);
    const hl = b.attrs.highlight === undefined ? 1 : parseInt(b.attrs.highlight) || 0;
    const cls = n => (n === hl ? ' class="col-hl"' : '');
    const head = cols.length
      ? `<thead><tr><th></th>${cols.map((c, n) => `<th${cls(n + 1)}>${escapeHtml(c)}</th>`).join('')}</tr></thead>` : '';
    const rows = parseItems(b.body).map(i => {
      const values = String(i.values || '').split(';').map(v => v.trim());
      const width = Math.max(cols.length, values.length);
      const cells = Array.from({ length: width }, (_, n) => `<td${cls(n + 1)}>${compareCell(values[n])}</td>`).join('');
      return `<tr><th scope="row">${inline(i.row || i.label || '')}</th>${cells}</tr>`;
    }).join('');
    return `<section class="block compare">${heading(b)}<div class="compare-wrap"><table class="compare-table">${head}<tbody>${rows}</tbody></table></div></section>`;
  },

  gallery(b) {
    const figs = parseItems(b.body).map(i => {
      const pic = img(i.image, i.alt);
      if (!pic) return '';
      return `<figure>${pic}${i.caption ? `<figcaption>${inline(i.caption)}</figcaption>` : ''}</figure>`;
    }).join('');
    return `<section class="block gallery">${heading(b)}<div class="gallery-grid" style="--cols:${columns(b)}">${figs}</div></section>`;
  },

  video(b) {
    const v = videoEmbed(b.attrs.src);
    const title = escapeHtml(b.attrs.title || 'Video');
    let player = '';
    if (v && v.kind === 'iframe') {
      player = `<div class="video-frame"><iframe src="${escapeHtml(v.url)}" title="${title}" loading="lazy" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`;
    } else if (v) {
      const poster = safeUrl(b.attrs.poster);
      player = `<div class="video-frame"><video controls preload="metadata" src="${escapeHtml(v.url)}"${poster ? ` poster="${escapeHtml(poster)}"` : ''} title="${title}"></video></div>`;
    } else if (safeUrl(b.attrs.src)) {
      // Not a player we know: a link is still better than an empty box.
      player = `<p><a class="btn btn-ghost" href="${escapeHtml(safeUrl(b.attrs.src))}">Watch the video</a></p>`;
    }
    const caption = b.body ? `<div class="video-caption">${md(b.body)}</div>` : '';
    return `<section class="block video">${player}${caption}</section>`;
  },

  // "split" is markdownweb's name; "two-column" is the same thing said plainly.
  split(b) {
    const { actions, rest } = extractActions(b.body);
    const eyebrow = b.attrs.eyebrow
      ? `<p class="eyebrow">${escapeHtml(b.attrs.eyebrow)}</p>` : '';
    const picture = img(b.attrs.image, b.attrs.imageAlt);
    const media = picture ? `<div class="split-media">${picture}</div>` : '';
    const flip = b.attrs.reverse === 'true' ? ' split-reverse' : '';
    return `<section class="block split${flip}">`
      + `<div class="split-text">${eyebrow}${md(rest)}${actionsHtml(actions)}</div>${media}</section>`;
  },

  cta(b) {
    const { actions, rest } = extractActions(b.body);
    return `<section class="block cta"><div class="cta-inner">${md(rest)}${actionsHtml(actions)}</div></section>`;
  },

  text(b) {
    const { actions, rest } = extractActions(b.body);
    return `<section class="block text">${md(rest)}${actionsHtml(actions)}</section>`;
  },

  // A landing page usually has a header. Sticky, because a long page without
  // one strands the reader at the bottom.
  nav(b) {
    const brand = b.attrs.brand
      ? `<a class="nav-brand" href="${escapeHtml(safeUrl(b.attrs.home) || '/')}">${escapeHtml(b.attrs.brand)}</a>` : '';
    const links = parseItems(b.body)
      .filter(i => i.label)
      .map(i => `<a href="${escapeHtml(safeUrl(i.href) || '#')}">${escapeHtml(i.label)}</a>`)
      .join('');
    return `<nav class="site-nav"><div class="nav-inner">${brand}<div class="nav-links">${links}</div></div></nav>`;
  },

  features(b) {
    const cols = Math.min(4, Math.max(2, parseInt(b.attrs.columns) || 3));
    const heading = b.attrs.title ? `<h2>${escapeHtml(b.attrs.title)}</h2>` : '';
    const cards = parseItems(b.body).map(i => `<div class="feature">
      ${i.icon ? `<div class="feature-icon">${escapeHtml(i.icon)}</div>` : ''}
      <h3>${escapeHtml(i.title || i.label || '')}</h3>
      ${i.body ? `<p>${inline(i.body)}</p>` : ''}
    </div>`).join('');
    return `<section class="block features">${heading}<div class="feature-grid" style="--cols:${cols}">${cards}</div></section>`;
  },

  stats(b) {
    const heading = b.attrs.title ? `<h2>${escapeHtml(b.attrs.title)}</h2>` : '';
    const cells = parseItems(b.body).map(i => `<div class="stat">
      <div class="stat-value">${escapeHtml(i.value || '')}</div>
      <div class="stat-label">${escapeHtml(i.label || '')}</div>
    </div>`).join('');
    return `<section class="block stats">${heading}<div class="stat-row">${cells}</div></section>`;
  },

  quote(b) {
    const who = [b.attrs.by, b.attrs.role].filter(Boolean).map(escapeHtml).join(' · ');
    return `<section class="block quote"><blockquote>${md(b.body)}</blockquote>${
      who ? `<p class="quote-by">${who}</p>` : ''}</section>`;
  },

  // Prices are the part of a page people scan hardest, so each tier is a card
  // and one may be marked featured. Features are semicolon-separated because a
  // nested list inside a list item is where this format would start fighting
  // the reader.
  pricing(b) {
    const heading = b.attrs.title ? `<h2>${escapeHtml(b.attrs.title)}</h2>` : '';
    const cards = parseItems(b.body).map(i => {
      const feats = String(i.features || '').split(';').map(f => f.trim()).filter(Boolean)
        .map(f => `<li>${inline(f)}</li>`).join('');
      const cta = i.cta
        ? `<p class="actions"><a class="btn ${i.featured === 'true' ? 'btn-primary' : 'btn-ghost'}" href="${escapeHtml(safeUrl(i.href) || '#')}">${escapeHtml(i.cta)}</a></p>`
        : '';
      return `<div class="tier${i.featured === 'true' ? ' tier-featured' : ''}">
        <h3>${escapeHtml(i.name || '')}</h3>
        <p class="tier-price">${escapeHtml(i.price || '')}<span>${escapeHtml(i.period || '')}</span></p>
        ${i.body ? `<p class="tier-body">${inline(i.body)}</p>` : ''}
        ${feats ? `<ul class="tier-feats">${feats}</ul>` : ''}${cta}
      </div>`;
    }).join('');
    return `<section class="block pricing">${heading}<div class="tier-grid">${cards}</div></section>`;
  },

  // Plain <details> rather than scripted accordions: it opens without
  // JavaScript, it is searchable in the page, and screen readers already know
  // what it is.
  faq(b) {
    const heading = b.attrs.title ? `<h2>${escapeHtml(b.attrs.title)}</h2>` : '';
    const rows = parseItems(b.body).map(i => `<details>
      <summary>${escapeHtml(i.q || i.label || '')}</summary>
      <div class="faq-a">${md(i.a || '')}</div>
    </details>`).join('');
    return `<section class="block faq">${heading}<div class="faq-list">${rows}</div></section>`;
  },

  footer(b) {
    const links = parseItems(b.body).filter(i => i.label)
      .map(i => `<a href="${escapeHtml(safeUrl(i.href) || '#')}">${escapeHtml(i.label)}</a>`).join('');
    return `<section class="block site-footer">
      <div class="footer-links">${links}</div>
      ${b.attrs.note ? `<p class="footer-note">${escapeHtml(b.attrs.note)}</p>` : ''}
    </section>`;
  },


  // A directory of every site the hotel serves. It is a directive rather than
  // a hardcoded page so a landing page opts in — a customer's site should not
  // list its neighbours just because it lives in the same container.
  sites(b, ctx = {}) {
    const all = store.list().filter(s => s.host !== 'default');
    const domains = store.configuredDomains();
    const hidden = new Set(String(b.attrs.hide || '').split(/[,\s]+/).filter(Boolean));
    const list = all.filter(s => !hidden.has(s.host));

    const heading = b.attrs.title ? `<h2>${escapeHtml(b.attrs.title)}</h2>` : '';
    const intro = b.body.trim() ? md(b.body) : '';

    if (!list.length) {
      return `<section class="block sites">${heading}${intro}<p class="note">No sites yet.</p></section>`;
    }

    const cards = list.map(s => {
      const live = store.isRouted(s.host, domains) !== false;
      // Only a signed-in admin is offered the destructive action, and the
      // form posts to the admin route, which checks the session again. The
      // button being hidden is a courtesy, not the control.
      const remove = ctx.isAdmin
        ? `<form method="post" action="/admin/delete" class="card-del"
             onsubmit="return confirm('Delete ${escapeHtml(s.host)}? The file is removed for good.')">
             <input type="hidden" name="host" value="${escapeHtml(s.host)}">
             <button type="submit" title="Delete this site">×</button>
           </form>`
        : '';
      const edit = ctx.isAdmin
        ? `<a class="card-edit" href="/admin/edit?host=${encodeURIComponent(s.host)}">Edit</a>`
        : '';
      const href = live ? `https://${s.host}/` : `#`;
      return `<article class="card">
        ${remove}
        <a class="card-link" href="${escapeHtml(href)}"${live ? '' : ' aria-disabled="true"'}>
          <h3>${escapeHtml(s.title || s.host)}</h3>
          <p class="card-host">${escapeHtml(s.host)}</p>
        </a>
        <p class="card-meta">${(s.bytes / 1024).toFixed(1)} kB · ${escapeHtml(s.updated.slice(0, 10))}${live ? '' : ' · not routed'}</p>
        ${edit}
      </article>`;
    }).join('');

    return `<section class="block sites">${heading}${intro}<div class="card-grid">${cards}</div></section>`;
  }
};

renderers['two-column'] = renderers.split;

// id, tone and align work on every block, so they are applied here once
// rather than taught to each renderer.
function decorate(html, b) {
  const attrs = { ...((spec(b.type) || {}).defaults || {}), ...b.attrs };
  const classes = [];
  if (TONES.includes(attrs.tone) && attrs.tone !== 'plain') classes.push(`tone-${attrs.tone}`);
  if (attrs.align === 'center') classes.push('align-center');
  const id = /^[A-Za-z][A-Za-z0-9_-]*$/.test(attrs.id || '') ? attrs.id : '';
  if (!classes.length && !id) return html;
  return html.replace(/^<section class="block([^"]*)"/,
    (_, cls) => `<section${id ? ` id="${escapeHtml(id)}"` : ''} class="block${cls}${classes.map(c => ' ' + c).join('')}"`);
}

function renderBlocks(blocks, ctx = {}) {
  return blocks.map(b => {
    const fn = renderers[b.type];
    // An unknown directive renders as text rather than vanishing. A typo in a
    // block name should cost you the layout, never the words.
    return decorate(fn ? fn(b, ctx) : renderers.text(b, ctx), b);
  }).join('\n');
}

module.exports = { parseFrontmatter, parseBlocks, parseItems, renderBlocks, escapeHtml, safeUrl, videoEmbed, renderers };
