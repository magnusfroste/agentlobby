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
  assert.strictEqual(r.serverInfo.version, '0.3.0');
});

test('a notification gets 202 and no body', async () => {
  const res = await call({ jsonrpc: '2.0', method: 'notifications/initialized' });
  assert.strictEqual(res.status, 202);
  assert.strictEqual(res.body, '');
});

test('tools/list includes the format tools', async () => {
  const res = await call({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
  const names = JSON.parse(res.body).result.tools.map(t => t.name);
  for (const n of ['describe_format', 'check_site', 'write_site', 'list_sites']) assert.ok(names.includes(n), n);
});

test('describe_format: the whole format, or one block', async () => {
  const all = (await tool('describe_format')).data;
  assert.ok(all.blocks.compare.fields.values);
  assert.ok(all.blocks.hero.example.startsWith('::hero'));
  assert.ok(all.themes.some(t => t.name === 'aurora'));
  assert.ok(all.universal_attrs.tone);
  const one = (await tool('describe_format', { block: 'split' })).data;
  assert.strictEqual(one.block, 'two-column');
  const none = await tool('describe_format', { block: 'carousel' });
  assert.strictEqual(none.isError, true);
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
