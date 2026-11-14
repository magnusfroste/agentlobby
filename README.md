# AgentLobby

**A hotel for landing pages.** One process, many domains — each site is a
single markdown file.

Part of [AgentHotel](https://github.com/magnusfroste/agenthotel), where it is
the **Lobby** template. Its sibling
[AgentPages](https://github.com/magnusfroste/agentpages) gives an agent a link
to what it built; AgentLobby gives it a front door on your own domains.

```
acme.com       → sites/acme.com.md
otherbrand.io  → sites/otherbrand.io.md
```

The request's `Host` decides which file is the site, the same way a reverse
proxy picks a backend by hostname. There is no database: publishing is writing
a file, backing up is copying a folder, and the source a human edits is the
source a language model reads.

Point a wildcard at it and there is no per-site setup left at all. Adding a
customer is one file — no DNS record, no config entry, no redeploy:

```bash
curl -X POST https://lobby.example.com/mcp \
  -H "Authorization: Bearer $LOBBY_API_TOKEN" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{
        "name":"write_site",
        "arguments":{"host":"newcustomer.example.com","content":"---\ntitle: Hello\n---\n\n::hero\n# Live.\n::"}}}'
```

That call takes about 150 ms, and the site is serving when it returns.

## Why it is like this

- **Files, not a database.** A database buys transactions and indexes that a
  hundred landing pages never need, and costs the thing that makes the format
  worth using. The one real risk files carry — two writers clobbering — is
  handled where it lives: writes are atomic and versioned, so a stale save is
  refused rather than quietly winning.
- **Rendered on the server, no client JavaScript.** Not minimalism for its own
  sake. The point is that crawlers and language models read the page, so the
  page has to exist without running anything.
- **Agents and people share one store.** An agent writing over MCP and a human
  clicking in `/admin` edit the same file, so neither works from a private copy
  of the truth.

## The format

Optional frontmatter, then blocks. Anything outside a block is ordinary
markdown, so a plain `.md` file renders fine with no directives at all.

```markdown
---
title: "Acme — industrial rope"
description: "Rope since 1904."
footer: "© Acme"
---

::hero{eyebrow="since 1904"}
# Rope that **holds**.
## Braided in Gothenburg, tested to failure, sold by the metre.

[See the catalogue](/site.md){.primary} [Call us](tel:+46000000){.ghost}
::

::two-column{image="https://example.com/rope.jpg" imageAlt="Coiled rope" reverse=true}
## Made to be trusted
Every batch is pull-tested and stamped.
::

::cta
## Need a quote?
[Email us](mailto:hi@example.com){.primary}
::
```

| Directive | What it is |
| --- | --- |
| `::banner` | A thin announcement strip, accent-coloured by default |
| `::nav` | Sticky header. `brand=` names it, list items are `Label → /href` or `Label → #anchor` |
| `::hero` | The opening statement, with call-to-action links. `image=` puts a picture beside it |
| `::two-column` | Text beside an image. `reverse=true` flips it. Alias: `::split` |
| `::text` | Everything else |
| `::features` | Grid of icon, title and body. `columns=2..4` |
| `::cards` | Link cards with optional picture, tag and call to action |
| `::steps` | Numbered steps: how it works, getting started |
| `::stats` | A row of numbers with labels |
| `::logos` | A row of names or logos: works with, trusted by |
| `::quote` | A pull quote. `by=` and `role=` attribute it |
| `::testimonials` | Several quotes as cards, with optional avatars |
| `::compare` | A comparison table; `yes`/`no` become ✓ and ✗, one column highlighted |
| `::pricing` | Tiers as cards. `features:` is semicolon-separated, `featured: true` highlights one |
| `::gallery` | A grid of pictures with captions |
| `::video` | YouTube (no-cookie), Vimeo (do-not-track) or a direct `.mp4`/`.webm` |
| `::faq` | Question and answer pairs, rendered as native `<details>` |
| `::cta` | A boxed invitation, centred |
| `::footer` | Link row plus a `note=` line |
| `::sites` | A card for every site this hotel serves. `title=` heads it, `hide=` omits hostnames |

Every block also takes three attributes:

| Attribute | Effect |
| --- | --- |
| `id=pricing` | An anchor, so `[Prices](#pricing)` or a nav item `- Prices → #pricing` jumps to it |
| `tone=soft`, `dark`, `accent` | Paints the block as a full-width band. Alternating tones is what gives a long page rhythm |
| `align=center` | Centres headings, text and buttons |

The whole reference — every block's attributes, list fields and a working
example — is in [`blocks.js`](blocks.js), which is also what the renderer, the
checker and the `describe_format` tool read. [`examples/showcase.example.com.md`](examples/showcase.example.com.md)
uses every block once.

The format has a version, kept in `blocks.js` beside the blocks with a list of
what changed in each. `describe_format` returns both, so an agent that has read
the format before can tell what is new. A test fails when a block, attribute,
field, frontmatter key, theme or tool changes without a new version.

Blocks that hold several records take them as markdown lists, so the file still
reads as prose:

```markdown
::features{columns=3 title="What it does"}
- icon: ⚖️
  title: The rules are kept for you
  body: It objects *before* you publish, not after.
- icon: 🔁
  title: Shift swaps without a middleman
  body: Staff post and take shifts in the app.
::

::pricing{title="Prices"}
- name: Standard
  price: 59 kr
  period: /person/month
  features: Everything in Small; Forecasting; Payroll export
  cta: Try it free
  href: mailto:hi@example.com
  featured: true
::

::faq{title="Common questions"}
- q: How long is the contract?
  a: There isn't one. Monthly, cancel whenever.
::
```

`::faq` renders native `<details>` rather than a scripted accordion: it opens
without JavaScript, the answers are findable with the browser's own search, and
screen readers already know what it is.

`::sites` is a directive rather than a built-in page so a landing page opts in —
a customer's site should not list its neighbours just because they share a
container. Signed in as admin, each card gains an edit link and a delete
button.

A link written `[Label](/where){.primary}` becomes a button (`.primary`,
`.ghost`). An unknown directive still renders its words — a typo in a block
name costs you the layout, never the content.

`GET /site.md` serves the source verbatim. That is the point of the format,
not a debug hatch. *Answer engines and agents* below says how a machine finds
it.

## Running it

```bash
npm install && npm start          # http://localhost:8080
npm test                          # node:test, no extra dependencies
docker build -t lobby . && docker run -p 8080:8080 lobby
```

A deploy starts with no sites: the admin lists each routed hostname with a
**Create** button that opens a starter page. To browse the example sites in
[`examples/`](examples) locally:

```bash
SITES_DIR=examples DEFAULT_SITE=example.com npm start
```

| Variable | Default | Meaning |
| --- | --- | --- |
| `PORT` | `8080` | Port to listen on |
| `SITES_DIR` | `/sites` | Where the markdown files live |
| `DEFAULT_SITE` | *(unset)* | Optional catch-all site. Unset means an unknown hostname gets a 404 |
| `LOBBY_API_TOKEN` | *(unset)* | Bearer token for `/mcp`. Unset means the endpoint is off |
| `LOBBY_ADMIN_PASSWORD` | *(unset)* | Password for `/admin`. Unset means the admin is off |
| `LOBBY_ADMIN_USER` | `admin` | Admin username |
| `AGENTHOTEL_DOMAINS` | *(unset)* | Hostnames routed here, so the admin can show which sites are live |

## Themes

Set `theme:` in frontmatter. Each theme is a palette, a typeface pairing and
one signature detail you can recognise at a glance — without that, themes are
the same page in different colours and an agent picking one is guessing.

| Theme | Signature |
| --- | --- |
| `default` | None — the neutral baseline |
| `editorial` | Drop cap on the first paragraph after a heading |
| `brutalist` | Heavy rules above every block, no rounded corners |
| `warm` | Pill buttons and a tinted hero |
| `midnight` | Near-black blue in both colour schemes, glowing hairline under the hero |
| `aurora` | Deep violet night in both colour schemes, gradient headline over an aurora-lit hero, glassy cards |
| `swiss` | Oversized tight headlines, signal red, a red square before every section heading |
| `playful` | Candy pastels and chunky outlines; hard offset shadows make buttons and cards look like stickers |

`midnight` and `aurora` are dark for every visitor. The other six follow the
visitor's colour scheme, so each has a light and a dark palette.

An agent choosing an `accent` cannot see the page, so `list_themes` and
`describe_format` give each theme's background, text and accent colours as hex,
per colour scheme. They are read from the palettes in [`themes.js`](themes.js)
that the stylesheet is built from, so what an agent is told is what a visitor
gets. An `accent` in frontmatter applies in both schemes: it has to stand out
on every background the theme lists.

## Admin

`/admin` is the human half of the same job: a list of every site, click one to
edit its markdown, save. Agents write over MCP, people click here, and both go
through the same store — an agent's change shows up in the editor immediately.

Set `LOBBY_ADMIN_PASSWORD` to turn it on. Signed in, every site also carries an
**Edit this page** button, so you can go from reading a page to fixing its
typo without finding it in a list.

The list marks a site **live** when a hostname is actually routed here, and
warns when a routed hostname has **no file** — a visitor gets the default site
and nothing looks broken, which makes it the hardest failure to notice. That
comparison is why the container is told its own domains.

Writes are atomic and versioned. When an agent saves a site while you have it
open, saving refuses with a conflict rather than silently discarding their
work; your text stays in the editor so you can decide.

## MCP — letting an agent run the hotel

`POST /mcp` speaks JSON-RPC 2.0 with a bearer token, the same shape as
AgentHotel's own endpoint.

| Tool | What it does |
| --- | --- |
| `describe_format` | The format itself: its version and what changed, frontmatter keys, every block with its attributes, fields and an example, the attributes every block takes, themes with their colours. Pass `block` for one |
| `check_site` | Reviews a page without saving it, with line numbers |
| `write_site` | Creates or replaces a site. Answers with the URL, whether the hostname is routed here, and the same warnings as `check_site` |
| `patch_site` | Changes part of a site without resending it: `frontmatter` keys to set (`null` removes one), or `old` and `new` for one exact piece of text that must occur once. Answers like `write_site`, with the review of the whole page |
| `read_site` | The source and its version, for a write that refuses to clobber |
| `list_sites` | Every site with title, description, theme, tags, URL and routing. `tag` filters |
| `delete_site` | Removes one |
| `list_themes` | Themes with their one-line signature and their background, text and accent colours per colour scheme |

An agent working alone cannot see the page it wrote. Without these it learned
the format by copying someone else's page, published probe pages to see what
rendered, and never found out that a misspelt field had been ignored. The
checker reports unknown blocks, attributes and fields (with the likely name),
unclosed and nested blocks, `#anchors` that point nowhere, duplicate ids,
missing title, description and alt text, and comparison rows of the wrong
width. It never refuses a write: the renderer stays forgiving for visitors,
the author is told.

`initialize` carries `instructions` that put `describe_format` first.

```json
{
  "mcpServers": {
    "lobby": {
      "url": "https://lobby.example.com/mcp",
      "headers": { "Authorization": "Bearer YOUR_TOKEN" }
    }
  }
}
```

Writing a site publishes it, so the endpoint stays closed until
`LOBBY_API_TOKEN` is set — a world-writable CMS is not a default anyone should
get by accident. `write_site` replaces the whole file rather than merging, so
read before you edit — or use `patch_site`, which changes only what it is
given. A replacement that matches nowhere, or in more than one place, is
refused with the reason rather than guessed at. Both take `if_version` to
refuse a save over someone else's.

The image ships no sites, so nothing an operator deletes comes back on a
redeploy, and no example sits under a hostname they do not own.

## SEO

The pages are server-rendered with no client JavaScript, which is the part
that matters most: a crawler or a language model gets the words on the first
request without running anything. On top of that each site emits a canonical
URL, Open Graph and Twitter card tags, `robots.txt` and a `sitemap.xml`, and
returns a real 404 for anything that is not its one page.

Frontmatter carries the rest:

| Key | Effect |
| --- | --- |
| `title` | `<title>`, `og:title` |
| `description` | meta description, `og:description` |
| `lang` | the `lang` attribute — set it, the default is `en` |
| `image` | `og:image`, and upgrades the Twitter card to a large image |
| `noindex: true` | keeps a site out of search results |
| `organization` | an `Organization` in the page's JSON-LD, and the page's publisher |
| `logo` | that organization's logo |
| `theme` | one of the themes above |
| `accent` | `#rgb` or `#rrggbb`, overriding the theme's accent in both colour schemes; the button text picks black or white to stay readable |
| `font` | `sans`, `serif`, `mono` or `rounded`, overriding the theme's typeface |
| `tags` | comma-separated labels, e.g. `campaign, founders`; `list_sites` filters on them |

## Answer engines and agents

The words are already in the HTML, but an agent that wants the source can find
it four ways. All of it comes from the one markdown file, so a site gains it
without being edited.

| What | Where |
| --- | --- |
| A link to the markdown | `<link rel="alternate" type="text/markdown" href="/site.md">` in every page's head |
| `llms.txt` | `/llms.txt` names the site, gives its description, and links to `/site.md` ([llmstxt.org](https://llmstxt.org)) |
| Content negotiation | `GET /` with `Accept: text/markdown` returns the markdown (`Vary: Accept`). A browser, or curl's `*/*`, still gets HTML |
| Structured data | JSON-LD with a `WebPage`, an `Organization` when the frontmatter names one, and a `FAQPage` built from every `::faq` block |

The markdown answers carry `Link: <https://host/>; rel="canonical"`, so a
search engine that finds both versions counts one page.

## Notes

- The hostname reaches the filesystem, so it is validated rather than trusted:
  lowercased, port stripped, restricted to what a domain may contain. A `Host`
  of `../../etc/passwd` gets the default site, not a file read.
- `www.example.com` falls back to `example.com.md`, so one file serves both.
- An unknown hostname gets a real 404. Behind a wildcard route every possible
  subdomain reaches this process, so a silent fallback would render a page for
  every mistyped link and never a mistake. Set `DEFAULT_SITE` to opt into a
  catch-all.
- No client-side JavaScript. The page renders on arrival, which is what makes
  it readable by crawlers and language models.

## Running it on AgentHotel

AgentLobby is built to be checked in as a guest of
[AgentHotel](https://github.com/magnusfroste/agenthotel): deploy the **Lobby**
template, or pick the **Git App** runtime, give it this repository, port
`8080`, and a health check path of `/healthz`. Set `DOMAIN_ALIASES` to `*.example.com` and the panel writes the
wildcard route for you; it also passes `AGENTHOTEL_DOMAINS` in, which is what
lets the admin tell a live site from an unrouted one.

Nothing here depends on it — AgentLobby is an ordinary container with two
environment variables and a volume.

## Credits

The `::directive{attr}` format follows
[markdownweb](https://github.com/magnusfroste/markdownweb), so content moves
between them.
