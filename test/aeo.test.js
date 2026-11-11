// What answer engines and agents read besides the page.
const { test } = require('node:test');
const assert = require('node:assert');
const { wantsMarkdown, faqPairs, jsonLd, llmsTxt } = require('../aeo');
const { parseBlocks, parseItems } = require('../render');

test('a browser gets HTML, an agent that asks for markdown gets markdown', () => {
  // Chrome, Firefox and curl never ask for markdown.
  assert.strictEqual(wantsMarkdown('text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'), false);
  assert.strictEqual(wantsMarkdown('*/*'), false);
  assert.strictEqual(wantsMarkdown(''), false);
  assert.strictEqual(wantsMarkdown(undefined), false);
  // An agent that wants the source.
  assert.strictEqual(wantsMarkdown('text/markdown'), true);
  assert.strictEqual(wantsMarkdown('text/markdown, text/html;q=0.9'), true);
  assert.strictEqual(wantsMarkdown('text/markdown, */*'), true);
  assert.strictEqual(wantsMarkdown('text/html, text/markdown'), true, 'a tie goes to markdown: it was asked for by name');
  // Ranked below HTML, or refused.
  assert.strictEqual(wantsMarkdown('text/html, text/markdown;q=0.5'), false);
  assert.strictEqual(wantsMarkdown('text/markdown;q=0'), false);
});

const PAGE = `::hero
# Rope that holds.
::

::faq{title="Questions"}
- q: Do you ship abroad?
  a: Yes, **anywhere** in the EU.
- q: Can I return it?
  a: Within 30 days.
- q: A question with no answer
::

::faq
- q: Is there a second FAQ?
  a: Then its questions count too.
::`;

test('every answered question of every ::faq block, as plain text', () => {
  const pairs = faqPairs(parseBlocks(PAGE), parseItems);
  assert.deepStrictEqual(pairs, [
    { q: 'Do you ship abroad?', a: 'Yes, anywhere in the EU.' },
    { q: 'Can I return it?', a: 'Within 30 days.' },
    { q: 'Is there a second FAQ?', a: 'Then its questions count too.' }
  ]);
  assert.deepStrictEqual(faqPairs(parseBlocks('# Just text'), parseItems), []);
});

function graphOf(html) {
  const m = /^<script type="application\/ld\+json">(.*)<\/script>$/.exec(html);
  assert.ok(m, 'one JSON-LD script element');
  return JSON.parse(m[1])['@graph'];
}

test('JSON-LD: a WebPage always, FAQPage and Organization when the page has them', () => {
  const plain = graphOf(jsonLd({ meta: { title: 'Rope', lang: 'sv' }, canonical: 'https://rope.example/', siteName: 'rope.example' }));
  assert.deepStrictEqual(plain.map(n => n['@type']), ['WebPage']);
  assert.strictEqual(plain[0].inLanguage, 'sv');
  assert.strictEqual(plain[0].url, 'https://rope.example/');

  const full = graphOf(jsonLd({
    meta: { title: 'Rope', description: 'Braided rope', organization: 'Rope AB', logo: 'https://rope.example/logo.png' },
    canonical: 'https://rope.example/',
    faqs: [{ q: 'Do you ship abroad?', a: 'Yes.' }]
  }));
  assert.deepStrictEqual(full.map(n => n['@type']), ['WebPage', 'Organization', 'FAQPage']);
  assert.strictEqual(full[1].logo, 'https://rope.example/logo.png');
  assert.deepStrictEqual(full[2].mainEntity[0], {
    '@type': 'Question', name: 'Do you ship abroad?', acceptedAnswer: { '@type': 'Answer', text: 'Yes.' }
  });
});

test('an answer cannot close the script element early', () => {
  const html = jsonLd({ meta: { title: 'x' }, faqs: [{ q: 'q', a: '</script><script>alert(1)</script>' }] });
  assert.strictEqual(html.indexOf('</script>'), html.length - '</script>'.length);
  assert.strictEqual(graphOf(html)[1].mainEntity[0].acceptedAnswer.text, '</script><script>alert(1)</script>');
});

test('llms.txt names the site and links to its markdown', () => {
  assert.strictEqual(
    llmsTxt({ meta: { title: 'Rope', description: 'Braided rope' }, base: 'https://rope.example', siteName: 'rope.example' }),
    '# Rope\n\n> Braided rope\n\n## Site\n\n- [Rope](https://rope.example/site.md): Braided rope\n'
  );
  assert.strictEqual(
    llmsTxt({ meta: {}, base: 'https://bare.example', siteName: 'bare.example' }),
    '# bare.example\n\n## Site\n\n- [bare.example](https://bare.example/site.md)\n'
  );
});
