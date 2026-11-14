// MCP so an agent can run the hotel.
//
// Same shape as AgentHotel's own endpoint: JSON-RPC 2.0 over HTTP with a
// bearer token. The tools are deliberately few, because a site is a file —
// list them, read one, write one, delete one. Anything more elaborate would be
// inventing an API on top of a filesystem that already has one. patch_site is
// still a write to that one file; it only spares the caller sending the part
// that did not change.
//
// The two that are not about files are about the format. An agent working
// alone cannot see the page it wrote, so it is told what the format offers
// (describe_format) and what is wrong with what it wrote (check_site, and the
// warnings on every write), instead of learning by copying someone's page.
// For the same reason the themes come with their colours, and the format with
// a version and a list of what changed.
//
// Writing a site is publishing it, so the endpoint is off unless a token is
// set. A world-writable CMS is not a default anyone should get by accident.

const { listThemes } = require('./themes');
const store = require('./store');
const { lintSite } = require('./lint');
const { FORMAT, BLOCKS, ALIASES, UNIVERSAL_ATTRS, TONES, FRONTMATTER, FONTS } = require('./blocks');

const PROTOCOL = '2024-11-05';

// Read by clients that show a server's instructions to their model. It is the
// order of work that keeps an agent from guessing the format.
const INSTRUCTIONS = `Lobby hosts landing pages: one markdown file per hostname.
Before writing your first page, call describe_format: it lists every block, its attributes and fields, with examples, plus the themes and their colours. It has a version and a list of changes, so later you can tell what is new.
Write pages with write_site; read the warnings it returns and fix them. check_site gives the same review without saving.
To change part of a page that exists, use patch_site (frontmatter keys, or one exact piece of text) instead of sending the whole file again.
For variety across many pages, change the theme, accent and font in frontmatter, the order of blocks, and tone= bands — not only the words.`;

const TOOLS = {
  describe_format: {
    description: 'The page format: frontmatter keys, every block with its attributes, list fields and a working example, the attributes every block takes, button syntax, and themes with their colours. Starts with the format version and what changed in each, newest first. Call this before writing a page. Pass block to get one block only',
    inputSchema: {
      type: 'object',
      properties: { block: { type: 'string', description: 'Optional. One block name, e.g. compare' } }
    }
  },
  list_sites: {
    description: 'List the sites this Lobby serves: hostname, title, description, theme, tags, last update, URL and whether the hostname is routed here',
    inputSchema: {
      type: 'object',
      properties: { tag: { type: 'string', description: 'Optional. Only sites whose frontmatter tags include this one' } }
    }
  },
  read_site: {
    description: "Read a site's markdown source, exactly as it is on disk, with its version",
    inputSchema: {
      type: 'object',
      properties: { host: { type: 'string', description: 'Hostname, e.g. acme.com' } },
      required: ['host']
    }
  },
  check_site: {
    description: 'Review a page without saving it: unknown blocks, attributes or fields, unclosed or nested blocks, missing title, description or alt text, broken #anchors. Returns warnings with line numbers and the block outline',
    inputSchema: {
      type: 'object',
      properties: { content: { type: 'string', description: 'The complete markdown source' } },
      required: ['content']
    }
  },
  write_site: {
    description: 'Create or replace a site. The content is the whole file including frontmatter — this overwrites, it does not merge. For a small change to a site that exists, use patch_site. The reply has the URL and the same warnings as check_site; fix them and write again',
    inputSchema: {
      type: 'object',
      properties: {
        host: { type: 'string', description: 'Hostname, e.g. acme.com' },
        content: { type: 'string', description: 'The complete markdown source' },
        if_version: { type: 'string', description: "Optional. The version from read_site — the write is refused if someone else saved in the meantime, instead of quietly overwriting them" }
      },
      required: ['host', 'content']
    }
  },
  patch_site: {
    description: 'Change part of a site without resending it. Give frontmatter (keys to set, e.g. {"description": "…"}; null removes a key), or old and new (one exact piece of text to replace; old must occur exactly once in the file, so include enough of the text around it), or both — the text is replaced first. The reply is the same as write_site: the URL, the new version and the warnings for the whole page',
    inputSchema: {
      type: 'object',
      properties: {
        host: { type: 'string', description: 'Hostname of a site that exists, e.g. acme.com' },
        frontmatter: {
          type: 'object',
          description: 'Frontmatter keys to set, each a single line. null removes the key. Keys not named are left alone',
          additionalProperties: { type: ['string', 'number', 'boolean', 'null'] }
        },
        old: { type: 'string', description: 'Text exactly as it is in the file, spaces and line breaks included. It must occur once' },
        new: { type: 'string', description: 'What replaces old. An empty string removes it' },
        if_version: { type: 'string', description: 'Optional. The version from read_site or the last write — the patch is refused if the site changed since' }
      },
      required: ['host']
    }
  },
  delete_site: {
    description: 'Delete a site. The hostname keeps resolving until its route is removed too, so it will fall back to the default site',
    inputSchema: {
      type: 'object',
      properties: { host: { type: 'string' } },
      required: ['host']
    }
  },
  list_themes: {
    description: 'List the themes a site may set in frontmatter as `theme: name`. Each has a one-line signature describing what makes it recognisable, and its background, text and accent colours as hex: under light and dark when the theme follows the visitor\'s colour scheme, under both when it looks the same in either. Use them to choose an accent that stands out on every background',
    inputSchema: { type: 'object', properties: {} }
  }
};

function describeFormat(block) {
  if (block) {
    const name = ALIASES[block] || block;
    const b = BLOCKS[name];
    if (!b) return null;
    return { version: FORMAT.version, block: name, ...b, universal_attrs: UNIVERSAL_ATTRS };
  }
  return {
    version: FORMAT.version,
    changes: FORMAT.changes,
    file: 'Optional frontmatter between --- lines, then blocks. A block opens with ::name{attr="value" other=3} on its own line and closes with a line that is only ::. Blocks do not nest. Markdown outside a block is a text block.',
    frontmatter: FRONTMATTER,
    universal_attrs: UNIVERSAL_ATTRS,
    tones: TONES,
    fonts: Object.keys(FONTS),
    lists: 'Blocks with fields take a markdown list: each item starts with "- field: value", and further fields of the same item are indented two spaces, "  field: value". Links in nav and footer are "- Label → /href".',
    buttons: '[Label](https://…){.primary} or {.ghost} turns a link into a button, in hero, two-column, text, cta and banner.',
    blocks: Object.fromEntries(Object.entries(BLOCKS).map(([name, b]) => [name, {
      summary: b.summary,
      attrs: b.attrs,
      ...(b.items ? { fields: b.items } : { body: b.body }),
      example: b.example
    }])),
    aliases: ALIASES,
    themes: listThemes(),
    tips: [
      'Open with ::hero, close with ::cta and ::footer; put proof (stats, logos, testimonials, compare) in between.',
      'Give a long page rhythm with tone=soft, tone=dark or tone=accent on every second or third block.',
      'Give each campaign its own theme, accent colour and font, so pages for different audiences do not look alike.',
      'Check an accent against the theme\'s colours: it has to stand out on the background in every colour scheme the theme lists, light and dark.',
      'To fix one line of a page that exists, use patch_site instead of writing the whole file again.',
      'Images must be full https:// URLs you know exist. With none, leave image out rather than inventing one.',
      'Add tags: in frontmatter (e.g. "campaign, founders") so list_sites can find a group of pages later.'
    ]
  };
}

function siteUrl(host) {
  return `https://${host}/`;
}

// The host becomes a filename, so it is validated rather than trusted — the
// same rule the request path uses, for the same reason.
function safeHost(host) {
  const bare = String(host || '').toLowerCase().trim().replace(/\.$/, '');
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/.test(bare)) return null;
  if (bare.includes('..') || bare.length > 253) return null;
  return bare;
}

function ok(result) { return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }; }
function fail(message) { return { content: [{ type: 'text', text: JSON.stringify({ error: message }) }], isError: true }; }

// What every save answers with: where the page is, whether anyone can reach
// it, and the review of the whole page. write_site and patch_site share it,
// so a one-line edit is checked exactly as a rewrite is.
function saved(result, content, verb) {
  const review = lintSite(content);
  const routed = store.isRouted(result.host);
  return ok({
    ...result,
    url: siteUrl(result.host),
    routed,
    warnings: review.warnings,
    outline: review.outline,
    note: [
      verb,
      routed === false ? 'The hostname is not routed to this Lobby yet, so the URL will not answer until it is.' : '',
      review.warnings.length ? `${review.warnings.length} warning(s): fix them and write again.` : 'No warnings.'
    ].filter(Boolean).join(' ')
  });
}

function callTool(name, args) {
  switch (name) {
    case 'describe_format': {
      const guide = describeFormat(args.block ? String(args.block).toLowerCase() : '');
      return guide ? ok(guide) : fail(`No block "${args.block}". Blocks: ${Object.keys(BLOCKS).join(', ')}`);
    }

    case 'list_sites': {
      const domains = store.configuredDomains();
      const tag = String(args.tag || '').trim().toLowerCase();
      const sites = store.list()
        .filter(s => !tag || s.tags.includes(tag))
        .map(s => ({ ...s, url: siteUrl(s.host), routed: store.isRouted(s.host, domains) }));
      return ok({ sites, domains });
    }

    case 'read_site': {
      const site = store.read(args.host);
      if (!site) return fail(`No site for ${args.host}`);
      // The version comes back so a careful writer can pass it to write_site
      // and be told about a clash instead of quietly winning one.
      return ok(site);
    }

    case 'check_site':
      return ok(lintSite(args.content));

    case 'write_site': {
      const result = store.write(args.host, args.content, args.if_version);
      return saved(result, args.content, result.created ? 'Created.' : 'Replaced.');
    }

    case 'patch_site': {
      const patched = store.patch(args.host, { frontmatter: args.frontmatter, old: args.old, new: args.new }, args.if_version);
      if (!patched) return fail(`No site for ${args.host}. write_site creates one`);
      const { content, ...result } = patched;
      return saved(result, content, result.changed ? 'Patched.' : 'Nothing changed: the file already says that.');
    }

    case 'delete_site':
      return store.remove(args.host)
        ? ok({ host: args.host, deleted: true })
        : fail(`No site for ${args.host}`);

    case 'list_themes':
      return ok({ themes: listThemes() });

    default:
      return fail(`Unknown tool: ${name}`);
  }
}

function handle(req, res, body, { sitesDir, token }) {
  if (!token) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'MCP is disabled — set LOBBY_API_TOKEN to enable it' }));
  }

  const auth = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (auth !== token) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Unauthorized' }));
  }

  let rpc;
  try { rpc = JSON.parse(body || '{}'); }
  catch (e) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }));
  }

  // A notification has no id and wants no answer. The spec says 202 with an
  // empty body; a JSON reply here is something a strict client may trip on.
  if (rpc && rpc.id === undefined && typeof rpc.method === 'string' && rpc.method.startsWith('notifications/')) {
    res.writeHead(202);
    return res.end();
  }

  const reply = (result) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ jsonrpc: '2.0', id: rpc.id ?? null, result }));
  };

  try {
    switch (rpc.method) {
      case 'initialize':
        return reply({
          protocolVersion: PROTOCOL,
          capabilities: { tools: {} },
          serverInfo: { name: 'lobby', version: '0.4.0' },
          instructions: INSTRUCTIONS
        });
      case 'tools/list':
        return reply({ tools: Object.entries(TOOLS).map(([name, t]) => ({ name, ...t })) });
      case 'tools/call':
        try {
          return reply(callTool(rpc.params?.name, rpc.params?.arguments || {}));
        } catch (err) {
          // A stale write is a normal outcome an agent should handle, not a
          // server fault — say which version is current so it can re-read.
          return reply(fail(err.conflict ? `${err.message} (current version ${err.currentVersion})` : err.message));
        }
      default:
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          jsonrpc: '2.0', id: rpc.id ?? null,
          error: { code: -32601, message: `Unknown method: ${rpc.method}` }
        }));
    }
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ jsonrpc: '2.0', id: rpc.id ?? null, error: { code: -32603, message: err.message } }));
  }
}

module.exports = { handle, TOOLS, callTool, describeFormat, INSTRUCTIONS };
