// The MCP endpoint as an agent meets it.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

let dir;
let mcp;

before(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lobby-mcp-'));
  process.env.SITES_DIR = dir;
  process.env.AGENTHOTEL_DOMAINS = '*.lobby.example';
  mcp = require('../mcp');
});

after(() => fs.rmSync(dir, { recursive: true, force: true }));

// A minimal stand-in for http.ServerResponse.
function call(rpc, token = 'tok') {
  return new Promise(resolve => {
    const res = {
      status: 0, headers: {}, body: '',
      writeHead(s, h) { this.status = s; this.headers = h || {}; },
      end(b) { this.body = b || ''; resolve(this); }
    };
    mcp.handle({ headers: { authorization: `Bearer ${token}` } }, res, JSON.stringify(rpc), { token: 'tok' });
  });
}

async function tool(name, args = {}) {
  const res = await call({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } });
  const result = JSON.parse(res.body).result;
  return { isError: !!result.isError, data: JSON.parse(result.content[0].text) };
}

test('initialize tells the agent where to start', async () => {
  const res = await call({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} });
  const r = JSON.parse(res.body).result;
  assert.match(r.instructions, /describe_format/);
  assert.match(r.instructions, /patch_site/);
  assert.strictEqual(r.serverInfo.version, '0.4.0');
});

test('a notification gets 202 and no body', async () => {
  const res = await call({ jsonrpc: '2.0', method: 'notifications/initialized' });
  assert.strictEqual(res.status, 202);
  assert.strictEqual(res.body, '');
});

test('tools/list includes the format tools', async () => {
  const res = await call({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
  const names = JSON.parse(res.body).result.tools.map(t => t.name);
  for (const n of ['describe_format', 'check_site', 'write_site', 'patch_site', 'list_sites']) assert.ok(names.includes(n), n);
});

test('describe_format: the whole format, or one block', async () => {
  const all = (await tool('describe_format')).data;
  assert.ok(all.blocks.compare.fields.values);
  assert.ok(all.blocks.hero.example.startsWith('::hero'));
  assert.ok(all.themes.some(t => t.name === 'aurora'));
  assert.ok(all.universal_attrs.tone);
  const one = (await tool('describe_format', { block: 'split' })).data;
  assert.strictEqual(one.block, 'two-column');
  assert.strictEqual(one.version, all.version);
  const none = await tool('describe_format', { block: 'carousel' });
  assert.strictEqual(none.isError, true);
});

test('describe_format opens with its version and what changed, newest first', async () => {
  const all = (await tool('describe_format')).data;
  assert.deepStrictEqual(Object.keys(all).slice(0, 2), ['version', 'changes']);
  assert.strictEqual(all.changes[0].version, all.version);
  assert.ok(all.changes[0].changed.some(line => /patch_site/.test(line)));
  assert.ok(all.changes.at(-1).version < all.version);
});

test('themes come with the colours to choose an accent against', async () => {
  const fromFormat = (await tool('describe_format')).data.themes;
  const { themes } = (await tool('list_themes')).data;
  assert.deepStrictEqual(fromFormat, themes);
  const by = Object.fromEntries(themes.map(t => [t.name, t.colors]));
  assert.deepStrictEqual(by.warm.light, { background: '#fffaf5', text: '#2b1f18', accent: '#c2410c' });
  assert.deepStrictEqual(by.warm.dark, { background: '#1a1310', text: '#f3e6dc', accent: '#fb923c' });
  assert.deepStrictEqual(by.default.light, { background: '#ffffff', text: '#16181d', accent: '#4f46e5' });
  assert.deepStrictEqual(Object.keys(by.aurora), ['both']);
  assert.deepStrictEqual(Object.keys(by.midnight), ['both']);
});

test('check_site reviews without saving', async () => {
  const r = (await tool('check_site', { content: '::heros\n# Hi\n::' })).data;
  assert.strictEqual(r.ok, false);
  assert.ok(r.warnings.some(w => /Did you mean "hero"/.test(w)));
  assert.deepStrictEqual(fs.readdirSync(dir), []);
});

test('write_site answers with the URL, routing and warnings', async () => {
  const w = (await tool('write_site', { host: 'founders.lobby.example', content: '---\ntitle: F\ndescription: D\ntags: Campaign, founders\n---\n\n::hero\n# Hi\n::\n\n::stats\n- value: 1\n  lable: x\n::' })).data;
  assert.strictEqual(w.url, 'https://founders.lobby.example/');
  assert.strictEqual(w.routed, true);
  assert.strictEqual(w.created, true);
  assert.ok(w.warnings.some(x => /field "lable"/.test(x)));
  assert.match(w.note, /1 warning/);
  const elsewhere = (await tool('write_site', { host: 'a.b.lobby.example', content: '---\ntitle: X\ndescription: D\n---\n\n::hero\n# Hi\n::' })).data;
  assert.strictEqual(elsewhere.routed, false);
  assert.match(elsewhere.note, /not routed/);
});

test('list_sites carries theme and tags, and filters on a tag', async () => {
  const all = (await tool('list_sites')).data.sites;
  assert.strictEqual(all.length, 2);
  const f = all.find(s => s.host === 'founders.lobby.example');
  assert.deepStrictEqual(f.tags, ['campaign', 'founders']);
  assert.strictEqual(f.theme, 'default');
  assert.strictEqual(f.url, 'https://founders.lobby.example/');
  const tagged = (await tool('list_sites', { tag: 'Founders' })).data.sites;
  assert.deepStrictEqual(tagged.map(s => s.host), ['founders.lobby.example']);
});

test('a wrong token is refused', async () => {
  const res = await call({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, 'nope');
  assert.strictEqual(res.status, 401);
});

test('patch_site fixes one thing and reviews the whole page like write_site', async () => {
  const long = 'A description that runs on well past what a search result will show. '.repeat(3).trim();
  const body = '\n::hero\n# Hi\n::\n\n' + '::text\nA paragraph that is not being changed.\n::\n\n'.repeat(40) + '::stats\n- value: 1\n  lable: x\n::\n';
  const content = `---\ntitle: P\ndescription: ${long}\n---\n${body}`;
  const w = (await tool('write_site', { host: 'patch.lobby.example', content })).data;
  assert.ok(w.warnings.some(x => /description is \d+ characters/.test(x)));

  const p = (await tool('patch_site', { host: 'patch.lobby.example', frontmatter: { description: 'Short and sweet.' }, if_version: w.version })).data;
  assert.deepStrictEqual(Object.keys(p).sort(), ['bytes', 'changed', 'host', 'note', 'outline', 'routed', 'url', 'version', 'warnings']);
  assert.strictEqual(p.url, 'https://patch.lobby.example/');
  assert.strictEqual(p.routed, true);
  assert.strictEqual(p.changed, true);
  // The description warning is gone; the one about the rest of the page is still reported.
  assert.deepStrictEqual(p.warnings, w.warnings.filter(x => !/description is/.test(x)));
  assert.strictEqual(p.warnings.length, 1);
  assert.deepStrictEqual(p.outline, w.outline);
  assert.match(p.note, /^Patched\. 1 warning/);

  const fixed = (await tool('patch_site', { host: 'patch.lobby.example', old: '  lable: x', new: '  label: x' })).data;
  assert.deepStrictEqual(fixed.warnings, []);
  assert.match(fixed.note, /^Patched\. No warnings\.$/);
  const now = (await tool('read_site', { host: 'patch.lobby.example' })).data;
  assert.strictEqual(now.version, fixed.version);
  assert.strictEqual(now.content, `---\ntitle: P\ndescription: Short and sweet.\n---\n${body.replace('lable', 'label')}`);

  const again = (await tool('patch_site', { host: 'patch.lobby.example', frontmatter: { title: 'P' } })).data;
  assert.strictEqual(again.changed, false);
  assert.match(again.note, /^Nothing changed/);
});

test('patch_site says what went wrong instead of guessing', async () => {
  const many = await tool('patch_site', { host: 'patch.lobby.example', old: 'A paragraph that is not being changed.', new: 'x' });
  assert.strictEqual(many.isError, true);
  assert.match(many.data.error, /occurs 40 times/);
  const none = await tool('patch_site', { host: 'patch.lobby.example', old: 'not in the file', new: 'x' });
  assert.match(none.data.error, /was not found/);
  const stale = await tool('patch_site', { host: 'patch.lobby.example', frontmatter: { title: 'Q' }, if_version: '000000000000' });
  assert.match(stale.data.error, /changed since you read it \(current version [0-9a-f]{12}\)/);
  const missing = await tool('patch_site', { host: 'nobody.lobby.example', frontmatter: { title: 'Q' } });
  assert.match(missing.data.error, /No site for nobody\.lobby\.example/);
  const empty = await tool('patch_site', { host: 'patch.lobby.example' });
  assert.match(empty.data.error, /Nothing to change/);
});
