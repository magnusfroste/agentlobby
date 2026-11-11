// What answer engines and agents read, besides the page itself.
//
// The page is already server-rendered with no client JavaScript, so a crawler
// gets every word on the first request. What it could not do was find the
// source: /site.md served the markdown verbatim, but nothing pointed at it.
// These are the four ways a machine now gets from the page to the words:
//
//   - <link rel="alternate" type="text/markdown"> in the page's head
//   - /llms.txt, the file agents look for first (https://llmstxt.org)
//   - Accept: text/markdown on / answers with the markdown itself
//   - JSON-LD built from the frontmatter and any ::faq blocks
//
// Everything here is derived from the one markdown file. A site gains all of
// it without being edited.

const { marked } = require('marked');

// Whether a request asked for markdown rather than HTML. A browser lists
// text/html first and never markdown; an agent that wants the source says
// text/markdown. Markdown wins when it is listed and text/html is either not
// listed or ranked no higher. A wildcard alone (curl's */*) still gets HTML,
// which is what a person running curl expects to see.
function wantsMarkdown(accept) {
  const ranks = {};
  for (const part of String(accept || '').split(',')) {
    const [type, ...params] = part.trim().toLowerCase().split(';').map(s => s.trim());
    if (!type) continue;
    let q = 1;
    for (const p of params) {
      const m = /^q=([0-9.]+)$/.exec(p);
      if (m) q = parseFloat(m[1]);
    }
    if (!Number.isFinite(q)) q = 0;
    ranks[type] = Math.max(ranks[type] ?? 0, q);
  }
  const md = ranks['text/markdown'] ?? 0;
  if (md <= 0) return false;
  const html = ranks['text/html'];
  return html === undefined || md >= html;
}

// Answers are written in markdown; structured data wants plain text.
function plainText(src) {
  return marked.parse(String(src || ''))
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// The question/answer pairs of every ::faq block, in page order.
function faqPairs(blocks, parseItems) {
  const pairs = [];
  for (const b of blocks || []) {
    if (b.type !== 'faq') continue;
    for (const item of parseItems(b.body)) {
      const q = item.q || item.label;
      if (q && item.a) pairs.push({ q: plainText(q), a: plainText(item.a) });
    }
  }
  return pairs;
}

// One JSON-LD graph for the page. WebPage always, Organization when the
// frontmatter names one, FAQPage when the page has questions with answers.
// FAQ markup is what answer engines quote most directly, and it is exactly
// what an ::faq block already holds.
function jsonLd({ meta = {}, canonical = '', siteName = '', faqs = [] }) {
  const graph = [];
  const page = {
    '@type': 'WebPage',
    name: meta.title || siteName,
    inLanguage: meta.lang || 'en'
  };
  if (meta.description) page.description = meta.description;
  if (canonical) page.url = canonical;
  if (meta.image) page.primaryImageOfPage = meta.image;
  graph.push(page);

  if (meta.organization) {
    const org = { '@type': 'Organization', name: meta.organization };
    if (canonical) org.url = canonical;
    if (meta.logo) org.logo = meta.logo;
    graph.push(org);
    page.publisher = { '@type': 'Organization', name: meta.organization };
  }

  if (faqs.length) {
    const faq = {
      '@type': 'FAQPage',
      mainEntity: faqs.map(f => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a }
      }))
    };
    if (canonical) faq.url = canonical;
    graph.push(faq);
  }

  // A "</script>" inside an answer would end the element early; escaping "<"
  // keeps the JSON valid and the page intact.
  const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })
    .replace(/</g, '\\u003c');
  return `<script type="application/ld+json">${json}</script>`;
}

// llms.txt as llmstxt.org describes it: an H1 with the name, a blockquote
// summary, then a list of links. A site is one page, so the list is one link
// to its markdown, which is the version an agent should read.
function llmsTxt({ meta = {}, base = '', siteName = '' }) {
  const title = meta.title || siteName;
  const lines = [`# ${title}`, ''];
  if (meta.description) lines.push(`> ${meta.description}`, '');
  lines.push('## Site', '');
  lines.push(`- [${title}](${base}/site.md)${meta.description ? `: ${meta.description}` : ''}`);
  return lines.join('\n') + '\n';
}

module.exports = { wantsMarkdown, plainText, faqPairs, jsonLd, llmsTxt };
