// The server end to end: one site in a temporary folder, real HTTP requests.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');

const PORT = 18000 + Math.floor(Math.random() * 1000);
const HOST = 'rope.example';
let dir;
let child;

const SITE = `---
title: Rope that holds
description: Braided rope, sold by the metre
lang: sv
organization: Rope AB
---

::hero
# Rope that **holds**.
::

::faq
- q: Do you ship abroad?
  a: Yes, anywhere in the EU.
::
`;

// http.request, not fetch: fetch drops a Host header silently, and the Host is
// what picks the site.
function get(pathname, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port: PORT, path: pathname, headers: { Host: HOST, ...headers } }, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', c => { body += c; });
      res.on('end', () => resolve({ status: res.statusCode, headers: { get: k => res.headers[k.toLowerCase()] ?? null }, body }));
    });
    req.on('error', reject);
    req.end();
  });
}

before(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lobby-'));
  fs.writeFileSync(path.join(dir, `${HOST}.md`), SITE);
  child = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], {
    env: { ...process.env, PORT: String(PORT), SITES_DIR: dir, CANONICAL_SCHEME: 'https' },
    stdio: 'ignore'
  });
  for (let i = 0; i < 50; i++) {
    try { await fetch(`http://127.0.0.1:${PORT}/healthz`); return; } catch (_) { await new Promise(r => setTimeout(r, 100)); }
  }
  throw new Error('server did not start');
});

after(() => {
  child.kill();
  fs.rmSync(dir, { recursive: true, force: true });
});

test('the page points at its markdown and carries JSON-LD', async () => {
  const r = await get('/', { Accept: 'text/html' });
  assert.strictEqual(r.status, 200);
  assert.match(r.headers.get('content-type'), /text\/html/);
  assert.match(r.headers.get('vary'), /Accept/);
  assert.match(r.body, /<link rel="alternate" type="text\/markdown" href="\/site\.md">/);
  const ld = JSON.parse(/<script type="application\/ld\+json">(.*?)<\/script>/.exec(r.body)[1]);
  assert.deepStrictEqual(ld['@graph'].map(n => n['@type']), ['WebPage', 'Organization', 'FAQPage']);
  assert.strictEqual(ld['@graph'][0].url, 'https://rope.example/');
});

test('Accept: text/markdown on / answers with the source', async () => {
  const r = await get('/', { Accept: 'text/markdown' });
  assert.strictEqual(r.status, 200);
  assert.match(r.headers.get('content-type'), /text\/markdown/);
  assert.strictEqual(r.headers.get('link'), '<https://rope.example/>; rel="canonical"');
  assert.strictEqual(r.body, SITE);
});

test('/site.md names the page as canonical', async () => {
  const r = await get('/site.md');
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.headers.get('link'), '<https://rope.example/>; rel="canonical"');
  assert.strictEqual(r.body, SITE);
});

test('/llms.txt links to the markdown', async () => {
  const r = await get('/llms.txt');
  assert.strictEqual(r.status, 200);
  assert.match(r.headers.get('content-type'), /text\/plain/);
  assert.match(r.body, /^# Rope that holds\n\n> Braided rope, sold by the metre\n/);
  assert.match(r.body, /\(https:\/\/rope\.example\/site\.md\)/);
});

test('a missing site gets none of it', async () => {
  const r = await get('/llms.txt', { Host: 'nobody.example' });
  assert.strictEqual(r.status, 404);
  const page = await get('/', { Host: 'nobody.example' });
  assert.doesNotMatch(page.body, /text\/markdown|ld\+json/);
});
