// The admin's site list: the hostname opens the site, Edit edits it.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');

const PORT = 19000 + Math.floor(Math.random() * 1000);
let dir;
let child;

function request(method, pathname, { body = '', headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port: PORT, method, path: pathname, headers: { Host: 'admin.example', ...headers } }, res => {
      let text = '';
      res.setEncoding('utf8');
      res.on('data', c => { text += c; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: text }));
    });
    req.on('error', reject);
    req.end(body);
  });
}

before(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lobby-admin-'));
  fs.writeFileSync(path.join(dir, 'live.lobby.example.md'), '---\ntitle: Live\n---\n\n# Hi\n');
  fs.writeFileSync(path.join(dir, 'stray.other.example.md'), '---\ntitle: Stray\n---\n\n# Hi\n');
  child = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], {
    env: { ...process.env, PORT: String(PORT), SITES_DIR: dir, LOBBY_ADMIN_PASSWORD: 'pw-for-test', AGENTHOTEL_DOMAINS: '*.lobby.example, new.lobby.example' },
    stdio: 'ignore'
  });
  for (let i = 0; i < 50; i++) {
    try { await request('GET', '/healthz'); return; } catch (_) { await new Promise(r => setTimeout(r, 100)); }
  }
  throw new Error('server did not start');
});

after(() => {
  child.kill();
  fs.rmSync(dir, { recursive: true, force: true });
});

test('the hostname opens the site, Edit opens the editor', async () => {
  const login = await request('POST', '/admin/login', {
    body: 'user=admin&password=pw-for-test',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  assert.strictEqual(login.status, 303);
  const cookie = String(login.headers['set-cookie']).split(';')[0];

  const page = (await request('GET', '/admin', { headers: { Cookie: cookie } })).body;
  // Routed: the name links to the live site in a new tab.
  assert.match(page, /<td class="host"><a href="https:\/\/live\.lobby\.example\/" target="_blank" rel="noreferrer">live\.lobby\.example ↗<\/a><\/td>/);
  assert.match(page, /<a class="btn ghost" href="\/admin\/edit\?host=live\.lobby\.example">Edit<\/a>/);
  // Not routed: nothing to open, but it can still be edited.
  assert.match(page, /<td class="host">stray\.other\.example<\/td>/);
  assert.match(page, /href="\/admin\/edit\?host=stray\.other\.example">Edit<\/a>/);
  // A routed name with no file is offered Create, not a link.
  assert.match(page, /<td class="host">new\.lobby\.example<\/td>[\s\S]*?href="\/admin\/edit\?host=new\.lobby\.example&amp;new=1">Create<\/a>/);
});
