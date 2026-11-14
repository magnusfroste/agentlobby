// What a page can be made of, written down once.
//
// The renderer, the checker and the guide an agent reads over MCP all come
// from this table, so the three cannot disagree: a block an agent is told about
// is a block that renders, and a field the checker accepts is a field the
// renderer reads. Before it existed an agent learned the format by reading
// someone else's page and guessing, and a misspelt field vanished silently.

// Every block takes these, on top of its own.
// The format has a version, so an agent that read it last week can tell what
// is new without comparing the whole guide. Raise the number and add an entry
// at the top whenever something an agent can use changes: a block, an
// attribute, a field, a frontmatter key, a theme or a tool. A test in
// test/blocks.test.js fails until you do, because a version nobody remembers
// to raise is worse than none.
const FORMAT = {
  version: 2,
  changes: [
    {
      version: 2,
      date: '2026-11-12',
      changed: [
        'New tool patch_site: change a page without resending it, by setting frontmatter keys or replacing one exact piece of text',
        'Themes list their colours: background, text and accent for each colour scheme, in list_themes and describe_format',
        'Theme midnight is dark in both colour schemes; it used to turn light for a visitor in light mode',
        'describe_format carries this version and list of changes'
      ]
    },
    {
      version: 1,
      date: '2026-11-12',
      changed: [
        'The format as describe_format first published it: 20 blocks; id, tone and align on every block; frontmatter accent, font and tags; 8 themes'
      ]
    }
  ]
};

const UNIVERSAL_ATTRS = {
  id: 'Anchor name, so a nav link can point at it: id=pricing, then `- Pricing → #pricing`',
  tone: 'Background band across the full width: soft, accent, dark or plain. Alternate tones to give a long page rhythm',
  align: 'center or left. Centres headings, text and buttons'
};

const TONES = ['plain', 'soft', 'accent', 'dark'];
const ALIGNS = ['left', 'center'];

const BLOCKS = {
  banner: {
    summary: 'A thin announcement strip, usually the first block. Defaults to tone=accent',
    attrs: {},
    body: 'One line of markdown; a {.primary} link becomes a small button',
    defaults: { tone: 'accent' },
    example: '::banner\nNew: wildcard domains, so a site needs no DNS change. [Read more](#faq)\n::'
  },
  nav: {
    summary: 'Sticky header with a brand and links',
    attrs: { brand: 'Name shown on the left', home: 'Where the brand links, default /' },
    items: { label: 'Written `- Label → /href` or `- Label → #anchor`' },
    example: '::nav{brand="Acme"}\n- Features → #features\n- Pricing → #pricing\n::'
  },
  hero: {
    summary: 'The opening statement: eyebrow, # headline, ## subline, buttons. With image= it gets a picture beside it',
    attrs: { eyebrow: 'Small caps line above the headline', image: 'Picture URL shown beside the text', imageAlt: 'Describes the picture' },
    body: 'Markdown: # headline, ## subline, paragraphs, button links',
    example: '::hero{eyebrow="for small teams" align=center}\n# Rope that **holds**.\n## Braided in Gothenburg, sold by the metre.\n\n[See the catalogue](#catalogue){.primary} [Call us](tel:+46000000){.ghost}\n::'
  },
  'two-column': {
    summary: 'Text beside an image. Alias ::split',
    attrs: { eyebrow: 'Small caps line above the text', image: 'Picture URL', imageAlt: 'Describes the picture', reverse: 'true puts the picture on the left' },
    body: 'Markdown with optional button links',
    example: '::two-column{image="https://images.unsplash.com/photo-1481277542470-605612bd2d61?w=1200&q=80" imageAlt="A hotel corridor"}\n## Made to be trusted\nEvery batch is pull-tested and stamped.\n::'
  },
  text: {
    summary: 'Plain markdown: headings, paragraphs, lists, code, tables. Anything outside a block is a text block too',
    attrs: {},
    body: 'Markdown',
    example: '::text\n## Why it exists\nOne paragraph of prose.\n::'
  },
  features: {
    summary: 'A grid of cards with icon, title and body',
    attrs: { title: 'Heading above the grid', columns: '2, 3 or 4 (default 3)' },
    items: { icon: 'An emoji or a short symbol', title: 'Card heading', body: 'One or two sentences, inline markdown' },
    example: '::features{title="What it does" columns=3}\n- icon: ⚡\n  title: Fast\n  body: Live in a minute.\n- icon: 🔒\n  title: Private\n  body: Runs on **your** server.\n::'
  },
  cards: {
    summary: 'Link cards, optionally with a picture and a tag: use cases, case studies, resources',
    attrs: { title: 'Heading above the cards', columns: '2, 3 or 4 (default 3)' },
    items: { title: 'Card heading', body: 'Short text, inline markdown', href: 'Where the card links', image: 'Picture URL on top of the card', alt: 'Describes the picture', tag: 'Small label above the title', cta: 'Link text at the bottom, default none' },
    example: '::cards{title="Who uses it" columns=3}\n- tag: Agencies\n  title: One server, every client\n  body: Each client gets a subdomain.\n  href: #agencies\n  cta: How agencies use it →\n::'
  },
  steps: {
    summary: 'Numbered steps: how it works, getting started',
    attrs: { title: 'Heading above the steps' },
    items: { title: 'Step heading', body: 'What happens, inline markdown' },
    example: '::steps{title="Live in three steps"}\n- title: Install\n  body: One command on any VPS.\n- title: Pick a template\n  body: Click **Deploy**.\n- title: Share the link\n  body: It has HTTPS already.\n::'
  },
  stats: {
    summary: 'A row of big numbers with labels',
    attrs: { title: 'Heading above the row' },
    items: { value: 'The number, e.g. 42 or 99.9%', label: 'What it counts' },
    example: '::stats\n- value: 30+\n  label: templates\n- value: 1\n  label: command to install\n::'
  },
  logos: {
    summary: 'A row of names or logos: works with, built on, trusted by',
    attrs: { title: 'Small line above the row, e.g. "Works with"' },
    items: { name: 'Written `- Name`, or name: with image:', image: 'Logo URL (shown instead of the name)', href: 'Optional link' },
    example: '::logos{title="Runs on"}\n- Docker\n- Caddy\n- Cloudflare\n::'
  },
  quote: {
    summary: 'One large pull quote',
    attrs: { by: 'Who said it', role: 'Their role or company' },
    body: 'The quote, markdown',
    example: '::quote{by="Ada" role="CTO, Acme"}\nWe moved twelve agents over in an afternoon.\n::'
  },
  testimonials: {
    summary: 'Several quotes as cards',
    attrs: { title: 'Heading above the cards' },
    items: { quote: 'What they said', by: 'Who', role: 'Role or company', avatar: 'Small portrait URL' },
    example: '::testimonials{title="What people say"}\n- quote: It replaced three dashboards.\n  by: Sam\n  role: Founder, Example AB\n::'
  },
  compare: {
    summary: 'A comparison table: you against the alternatives. yes/no become ✓ and ✗',
    attrs: { title: 'Heading above the table', columns: 'Comma-separated column names, e.g. "AgentHotel, DIY, PaaS"', highlight: 'Which column to emphasise, 1-based (default 1, 0 for none)' },
    items: { row: 'What is compared', values: 'Semicolon-separated, one per column: yes, no, or short text' },
    example: '::compare{title="Compared" columns="Lobby, Page builder"}\n- row: Agents can publish\n  values: yes; no\n- row: Price\n  values: Free; $29/month\n::'
  },
  pricing: {
    summary: 'Price tiers as cards; one may be featured',
    attrs: { title: 'Heading above the tiers' },
    items: { name: 'Tier name', price: 'e.g. $0 or 59 kr', period: 'e.g. /month', body: 'One line about who it is for', features: 'Semicolon-separated list', cta: 'Button text', href: 'Button link', featured: 'true highlights this tier' },
    example: '::pricing{title="Prices"}\n- name: Free\n  price: $0\n  features: One server; All templates\n  cta: Install\n  href: #install\n- name: Team\n  price: $19\n  period: /month\n  features: Everything in Free; Support\n  cta: Talk to us\n  href: mailto:hi@example.com\n  featured: true\n::'
  },
  gallery: {
    summary: 'A grid of pictures with captions',
    attrs: { title: 'Heading above the grid', columns: '2, 3 or 4 (default 3)' },
    items: { image: 'Picture URL', alt: 'Describes the picture', caption: 'Optional line under it' },
    example: '::gallery{columns=2}\n- image: https://images.unsplash.com/photo-1497366216548-37526070297c?w=900&q=80\n  alt: An office\n  caption: Where it started\n::'
  },
  video: {
    summary: 'An embedded video: YouTube, Vimeo, or a direct .mp4/.webm link',
    attrs: { src: 'The video URL', title: 'Accessible title for the player', poster: 'Still image for a direct video file' },
    body: 'Optional caption, markdown',
    example: '::video{src="https://www.youtube.com/watch?v=dQw4w9WgXcQ" title="Demo"}\nTwo minutes from install to a live agent.\n::'
  },
  faq: {
    summary: 'Questions and answers as native <details>. Also published as FAQPage structured data',
    attrs: { title: 'Heading above the list' },
    items: { q: 'The question', a: 'The answer, markdown' },
    example: '::faq{title="Questions"}\n- q: Is there a contract?\n  a: No. Cancel whenever.\n::'
  },
  cta: {
    summary: 'A boxed, centred invitation with buttons — usually near the end',
    attrs: {},
    body: 'Markdown with button links',
    example: '::cta\n## Ready when you are\n[Install it](#install){.primary}\n::'
  },
  footer: {
    summary: 'A row of links and a note line',
    attrs: { note: 'Small print under the links' },
    items: { label: 'Written `- Label → /href`' },
    example: '::footer{note="© 2026 Acme"}\n- GitHub → https://github.com\n- Contact → mailto:hi@example.com\n::'
  },
  sites: {
    summary: 'A card for every site this Lobby serves — for a directory page, not a campaign',
    attrs: { title: 'Heading', hide: 'Hostnames to leave out, comma-separated' },
    body: 'Optional intro, markdown',
    example: '::sites{title="Our sites"}\n::'
  }
};

const ALIASES = { split: 'two-column' };

const FRONTMATTER = {
  title: 'Page title: the browser tab, search results and link previews. Required',
  description: 'One sentence, under ~160 characters, for search results and previews. Required',
  theme: 'One of the themes from list_themes, which gives each theme\'s background, text and accent colours',
  accent: 'Overrides the theme\'s accent colour, as #rgb or #rrggbb, in both colour schemes — so pick one that stands out on every background the theme lists. Text on the accent turns black or white by itself',
  font: 'Overrides the theme\'s typeface: sans, serif, mono or rounded',
  image: 'Share image URL for link previews (og:image)',
  lang: 'Language code, e.g. en or sv',
  tags: 'Comma-separated labels to group sites, e.g. "campaign, founders". list_sites can filter on one',
  footer: 'A plain line at the very bottom of the page',
  organization: 'Who is behind the page, for structured data',
  logo: 'Their logo URL, for structured data',
  noindex: 'true keeps the page out of search engines'
};

const FONTS = {
  sans: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  serif: 'ui-serif, Georgia, "Times New Roman", serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  rounded: 'ui-rounded, "SF Pro Rounded", "Nunito", "Varela Round", system-ui, sans-serif'
};

const BUTTON_KINDS = ['primary', 'ghost', 'secondary'];

function spec(type) {
  return BLOCKS[ALIASES[type] || type] || null;
}

module.exports = { FORMAT, BLOCKS, ALIASES, UNIVERSAL_ATTRS, TONES, ALIGNS, FRONTMATTER, FONTS, BUTTON_KINDS, spec };
