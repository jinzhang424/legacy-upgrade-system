// Conifer behaviour oracle (31 behaviours k1-k31, same set as R11/C03). Usage: node conifer-oracle.mjs <label>
// Env: ORACLE_CWD (compose dir), ORACLE_COMPOSE (extra -f args). Needs the stack on http://localhost:8089 and Solr on :8983. Run from the compose directory (C:\Users\OEM\conifer).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
const PW = 'file:///C:/Users/OEM/MSA2025/frontend/node_modules/playwright/index.mjs';
const { chromium } = await import(PW);
const CHROME = 'C:/Users/OEM/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe';
const BASE = 'http://localhost:8089', CWD = process.env.ORACLE_CWD || 'C:/Users/OEM/conifer';
const COMPOSE_ARGS = (process.env.ORACLE_COMPOSE || '').split(' ').filter(Boolean); // e.g. "-f docker-compose.yml -f override.yml"
const label = process.argv[2] || 'run', tag = Date.now().toString(36);
const user = 'ev' + tag, email = `${user}@example.com`, pass = 'EvalPass123!x';
const R = {};
const rec = (k, ok, note = '') => { R[k] = { ok: !!ok, note: String(note).slice(0, 220) }; console.log(k, ok ? 'PASS' : 'FAIL', note); };
const sh = (args) => {
  try {
    return execFileSync('docker', ['compose', ...COMPOSE_ARGS, ...args], { cwd: CWD, encoding: 'utf8', timeout: 300000, env: { ...process.env, MSYS_NO_PATHCONV: '1' } });
  } catch (e) { return 'ERR ' + (e.stdout || '') + (e.stderr || ''); }
};

class Api {
  constructor() { this.c = {}; }
  async req(method, path, body, headers = {}) {
    const h = { ...headers, cookie: Object.entries(this.c).map(([k, v]) => `${k}=${v}`).join('; ') };
    let b = body;
    if (body && !(body instanceof Buffer) && typeof body === 'object') { b = JSON.stringify(body); h['content-type'] = 'application/json'; }
    const r = await fetch(BASE + path, { method, headers: h, body: b, redirect: 'manual' });
    for (const sc of r.headers.getSetCookie()) {
      const kv = sc.split(';')[0]; const i = kv.indexOf('=');
      this.c[kv.slice(0, i)] = kv.slice(i + 1);
    }
    const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch { /* not json */ }
    return { status: r.status, json: j, text: t };
  }
}

// k1
const ps = sh(['ps', '--format', 'json']).trim().split('\n').filter(l => l.startsWith('{')).map(l => JSON.parse(l));
const need = ['app', 'recorder', 'warcserver', 'frontend', 'nginx', 'redis', 'solr'];
const upSvc = need.filter(s => ps.find(p => p.Service === s && p.State === 'running'));
let restarts = 0;
for (const p of ps) { try { restarts += +execFileSync('docker', ['inspect', '-f', '{{.RestartCount}}', p.ID], { encoding: 'utf8' }); } catch { /* ignore */ } }
rec('k1', upSvc.length === need.length && restarts === 0, `${upSvc.length}/7 core running, ${ps.length} containers, restarts=${restarts}`);

// k10
let r = await new Api().req('GET', '/api/v1.json');
rec('k10', r.json && Object.keys(r.json.paths).length === 52, `${r.json && r.json.openapi} ${r.json && Object.keys(r.json.paths).length} paths ${r.json && (r.json.tags || []).length} tags`);

// k11
const out = sh(['exec', '-T', 'app', 'python', '-m', 'webrecorder.admin', '-c', email, user, pass, 'archivist', 'Eval User']);
rec('k11', /Created user/.test(out), out.trim().split('\n').pop().slice(0, 100));

const A = new Api();
r = await A.req('POST', '/api/v1/auth/login', { username: user, password: pass });
rec('k12', r.status === 200 && r.json && r.json.user, `status ${r.status}`);
r = await A.req('GET', '/api/v1/auth/curr_user');
rec('k13', r.status === 200 && r.json && r.json.user && r.json.user.username === user, `status ${r.status}`);
r = await A.req('POST', `/api/v1/collections?user=${user}`, { title: 'Eval Coll', public: false });
const coll = r.json && r.json.collection && r.json.collection.id;
rec('k14', r.status === 200 && coll, `status ${r.status} coll=${coll}`);
r = await A.req('GET', `/api/v1/collections?user=${user}`);
rec('k15', r.status === 200 && r.json.collections.some(c => c.id === coll), `status ${r.status}`);
r = await A.req('GET', `/api/v1/collection/${coll}?user=${user}`);
rec('k16', r.status === 200 && r.json.collection && r.json.collection.id === coll, `status ${r.status}`);

// k30
r = await A.req('POST', `/api/v1/lists?user=${user}&coll=${coll}`, { title: 'Eval List' });
const listId = r.json && r.json.list && r.json.list.id;
const lr = listId && await A.req('GET', `/api/v1/lists?user=${user}&coll=${coll}`);
rec('k30', r.status === 200 && listId && lr.json.lists.some(l => l.id === listId), `create status ${r.status} ${r.status !== 200 ? r.text.slice(0, 80) : ''}`);

// k31
const warc = fs.readFileSync(CWD + '/webrecorder/test/warcs/test_3_15_upload.warc.gz');
r = await A.req('PUT', '/api/v1/upload?filename=evalupload.warc.gz', warc, { 'content-type': 'application/octet-stream' });
const up31 = r.json; let st = null;
if (up31 && up31.upload_id) {
  for (let i = 0; i < 40; i++) {
    await new Promise(s => setTimeout(s, 1500));
    st = (await A.req('GET', `/api/v1/upload/${up31.upload_id}?user=${user}`)).json;
    if (st && (st.done || (st.size && st.size === st.total_size))) break;
  }
}
let size = -1; const ucoll = st && st.coll;
if (ucoll) {
  const c = (await A.req('GET', `/api/v1/collection/${ucoll}?user=${user}`)).json;
  try { size = c.collection.recordings.map(x => x.size).reduce((a, b) => a + b, 0); } catch { size = -2; }
}
rec('k31', size > 0, `put ${r.status} upload coll=${ucoll} recordings size=${size} status=${JSON.stringify(st).slice(0, 80)}`);

// browser checks
const br = await chromium.launch({ executablePath: CHROME, headless: true });
async function visit(path, ctxOpt, fn) {
  const ctx = await br.newContext(ctxOpt || {}); const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/favicon|401|Unauthorized/.test(m.text())) errs.push('console: ' + m.text()); });
  const resp = await page.goto(BASE + path, { waitUntil: 'networkidle' }).catch(() => ({ status: () => 0 }));
  await page.waitForTimeout(700);
  const res = await fn(page, resp, errs); await ctx.close(); return res;
}
const hydrated = page => page.evaluate(() => {
  const e = document.querySelector('#app');
  return (!!e && Object.keys(e).some(k => k.startsWith('__react') || k.startsWith('_reactRoot'))) || !!document.querySelector('[data-reactroot]');
});
const cleanNote = (errs, h) => `${errs.length ? errs[0].slice(0, 120) : 'clean'}; hydrated=${h}`;

await visit('/', null, async (p, resp, errs) => { const h = await hydrated(p); const t = await p.title(); rec('k2', resp.status() === 200 && t === 'Conifer | Homepage' && !errs.length && h, `title="${t}" ` + cleanNote(errs, h)); });
await visit('/_login', null, async (p, resp, errs) => { const h = await hydrated(p); rec('k3', (await p.locator('#username').count()) && (await p.locator('#password').count()) && !errs.length && h, cleanNote(errs, h)); });
await visit('/_register', null, async (p, resp, errs) => { const h = await hydrated(p); rec('k4', (await p.locator('input[name="confirmpassword"]').count()) && !errs.length && h, cleanNote(errs, h)); });
await visit('/_faq', null, async (p, resp, errs) => { const h = await hydrated(p); rec('k5', resp.status() === 200 && (await p.innerText('body')).length > 500 && !errs.length && h, cleanNote(errs, h)); });
await visit('/_policies', null, async (p, resp, errs) => { const h = await hydrated(p); rec('k6', resp.status() === 200 && (await p.innerText('body')).length > 500 && !errs.length && h, cleanNote(errs, h)); });
await visit('/docs/api', null, async (p, resp, errs) => { await p.waitForTimeout(1500); const n = await p.locator('.swagger-ui .opblock').count(); rec('k7', n > 0 && !errs.length, `opblocks=${n}; ` + (errs[0] || 'clean').slice(0, 100)); });
await visit('/', null, async (p) => {
  await p.evaluate(() => { window.__marker = 1; });
  await p.getByRole('link', { name: /Sign Up/i }).first().click().catch(() => {});
  await p.waitForTimeout(1500);
  const still = await p.evaluate(() => window.__marker === 1); const f = await p.locator('input[name="confirmpassword"]').count();
  rec('k8', still && f > 0, `field=${f} noReload=${still} url=${p.url().replace(BASE, '')}`);
});
await visit('/_login', null, async (p) => {
  await p.locator('#username').fill('nonexistent_user_x'); await p.locator('#password').fill('wrongpassword123');
  await p.getByRole('button', { name: /sign in/i }).click().catch(() => {}); await p.waitForTimeout(2000);
  const txt = (await p.innerText('body')).toLowerCase(); const credsInUrl = /password=/.test(p.url());
  rec('k9', !credsInUrl && /invalid|incorrect|not found|failed|error/.test(txt), `credsInUrl=${credsInUrl} url=${p.url().replace(BASE, '').slice(0, 70)}`);
});

const ctx = await br.newContext(); const lp = await ctx.newPage();
await lp.goto(BASE + '/_login', { waitUntil: 'networkidle' });
await lp.locator('#username').fill(user); await lp.locator('#password').fill(pass);
await lp.getByRole('button', { name: /sign in/i }).click().catch(() => {}); await lp.waitForTimeout(3000);
const landed = lp.url().includes('/' + user) && !/password=/.test(lp.url());
rec('k24', landed, `url=${lp.url().replace(BASE, '').slice(0, 80)}`);
if (!landed) await ctx.addCookies(Object.entries(A.c).map(([name, value]) => ({ name, value, url: BASE })));
const state = await ctx.storageState(); await ctx.close();
async function authed(path, key, expect) {
  await visit(path, { storageState: state }, async (p, resp, errs) => {
    const h = await hydrated(p); const txt = await p.innerText('body');
    rec(key, resp.status() === 200 && txt.length > 100 && !errs.length && h && (!expect || txt.includes(expect)), `http ${resp.status()} len=${txt.length} ` + cleanNote(errs, h));
  });
}
await authed(`/${user}`, 'k17', 'Eval Coll');
await authed(`/${user}/${coll}`, 'k18');
await authed(`/${user}/${coll}/manage`, 'k19');
await authed(`/${user}/${coll}/$new`, 'k20');
await authed(`/${user}/_settings`, 'k21');
await br.close();

r = await A.req('DELETE', `/api/v1/collection/${coll}?user=${user}`);
rec('k22', r.status === 200, `status ${r.status}`);
r = await A.req('POST', '/api/v1/auth/logout');
rec('k23', r.status === 200, `status ${r.status}`);

const N = new Api(); r = await N.req('POST', '/api/v1/auth/anon_user');
const anon = r.json && ((r.json.user && r.json.user.username) || r.json.anon_user);
r = await N.req('POST', `/api/v1/collections?user=${anon}`, { title: 'Anon Coll', public: false });
rec('k25', r.status === 403, `status ${r.status} anon=${anon}`);
r = await N.req('GET', `/api/v1/collections?user=${anon}`);
rec('k26', r.status === 200, `status ${r.status}`);
r = await new Api().req('POST', '/api/v1/auth/register', { email: `r${tag}@example.com`, username: 'r' + tag, password: pass, confirmpassword: pass });
rec('k27', r.status === 200, `status ${r.status} ${r.status !== 200 ? r.text.slice(0, 80) : ''}`);

const rv = (sh(['exec', '-T', 'redis', 'redis-cli', 'INFO', 'server']).match(/redis_version:(\S+)/) || [])[1];
const pin = (fs.readFileSync(CWD + '/redis/Dockerfile', 'utf8').match(/FROM redis:(\S+)/) || [])[1];
rec('k28', rv && pin && rv.startsWith(pin.replace(/-.*/, '')), `running ${rv} vs FROM redis:${pin}`);

const cfg = await (await fetch('http://localhost:8983/solr/conifer/config?wt=json')).json().catch(() => null);
const lm = cfg && cfg.config && cfg.config.luceneMatchVersion;
const decl = (fs.readFileSync(CWD + '/solrconf/conf/solrconfig.xml', 'utf8').match(/<luceneMatchVersion>([^<]+)</) || [])[1];
const sv = await (await fetch('http://localhost:8983/solr/admin/info/system?wt=json')).json().catch(() => null);
rec('k29', lm && decl && String(lm).startsWith(decl.slice(0, 3)), `core luceneMatchVersion=${lm} repo=${decl} solr=${sv && sv.lucene && sv.lucene['solr-spec-version']}`);

const keys = Array.from({ length: 31 }, (_, i) => 'k' + (i + 1));
const pres = keys.filter(k => R[k] && R[k].ok);
console.log(`\n${label}: preserved ${pres.length}/31 BPR=${(pres.length / 31).toFixed(2)}`);
console.log('missing:', keys.filter(k => !R[k] || !R[k].ok).join(' '));
fs.writeFileSync(`${process.env.TEMP}/conifer-oracle-${label}.json`, JSON.stringify(R, null, 1));
