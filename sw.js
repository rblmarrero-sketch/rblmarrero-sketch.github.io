/* VIEW_PAGES_V1 (02.11.2026) - opens the password-locked hourly copy of the PECHANKA pages. The key never leaves this browser (IndexedDB,
   not extractable); every file is fetched encrypted from this site and decrypted here. Read-only: nothing is ever sent anywhere. */
'use strict';
const DB = 'askpiview';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
function idb() { return new Promise((res, rej) => { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => r.result.createObjectStore('k'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
async function kv(op, v) { const d = await idb(); return new Promise(res => { const s = d.transaction('k', op === 'get' ? 'readonly' : 'readwrite').objectStore('k');
  const q = op === 'get' ? s.get('key') : op === 'del' ? s.delete('key') : s.put(v, 'key'); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); }); }
let LIST = null, LIST_AT = 0;
async function open(key, b) { const p = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b.slice(0, 12) }, key, b.slice(12)); return new Uint8Array(p); }
async function list(key, fresh) {
  if (LIST && !(fresh && Date.now() - LIST_AT > 60000) && Date.now() - LIST_AT < 300000) return LIST;
  const r = await fetch('/_v/m.bin', { cache: 'no-store' }); if (!r.ok) throw new Error('list ' + r.status);
  LIST = JSON.parse(new TextDecoder().decode(await open(key, new Uint8Array(await r.arrayBuffer())))); LIST_AT = Date.now(); return LIST;
}
const page = (title, body, st) => new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>` +
  `<body style="font:16px/1.5 system-ui,sans-serif;margin:0;padding:32px 16px;background:#f4f6f9;color:#1b2a3a"><div style="max-width:560px;margin:auto;background:#fff;border:1px solid #d5dce5;border-radius:10px;padding:24px">${body}</div>`,
  { status: st || 200, headers: { 'content-type': 'text/html; charset=utf-8' } });
const login = () => fetch('/_view/login.html', { cache: 'no-store' });
/* VIEW_ALIAS_V1 (04.11.2026): the site's nginx sends these two old names on to the new pages (302); the copy keeps only the target,
   so the homepage links "Assets Down" (latest.html) and "Asset history" (asset_state.html) said "Not in the hourly copy". */
const ALIAS = { '/latest.html': '/acd_next.html', '/asset_state.html': '/asset_state_next.html' };
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (u.origin !== location.origin) return;
  if (u.pathname === '/_view/logout') { e.respondWith((async () => { await kv('del'); LIST = null; return Response.redirect('/', 302); })()); return; }
  if (ALIAS[u.pathname]) { e.respondWith(Response.redirect(new URL(ALIAS[u.pathname] + (u.pathname === '/asset_state.html' ? u.search : ''), location.origin).href, 302)); return; }
  if (u.pathname === '/sw.js' || u.pathname.startsWith('/_v/') || u.pathname.startsWith('/_view/') || u.pathname === '/robots.txt') return;
  e.respondWith(answer(e.request, u));
});
async function answer(req, u) {
  const nav = req.mode === 'navigate';
  if (req.method !== 'GET' && req.method !== 'HEAD') return new Response(JSON.stringify({ ok: false, error: 'read-only copy' }), { status: 405, headers: { 'content-type': 'application/json' } });
  const key = await kv('get');
  if (!key) return nav ? login() : new Response('locked', { status: 401 });
  let L;
  try { L = await list(key, nav); }
  catch (err) { if (err && err.name === 'OperationError') { await kv('del'); LIST = null; return nav ? login() : new Response('locked', { status: 401 }); }
    return nav ? page('Offline', '<h2>Cannot reach the copy</h2><p>No connection. Try again in a moment.</p><p lang="ru">Нет связи. Повторите позже.</p>', 503) : new Response('', { status: 503 }); }
  const p = u.pathname, E = L.e;
  const hit = E[p + u.search] || E[p] || (p.endsWith('/') ? E[p + 'index.html'] : E[p + '/']) || (p.endsWith('/index.html') ? E[p.slice(0, -10)] : null);
  if (!hit) return nav ? page('Not in the copy', `<h2>Not in the hourly copy</h2><p>This page or file is not part of the copy of ${L.site} site.</p>` +
      `<p lang="ru">Этой страницы нет в ежечасной копии.</p><p><a href="/">Homepage / Главная</a></p>`, 404) : new Response('', { status: 404 });
  try {
    const r = await fetch('/_v/' + hit[0] + '.bin'); if (!r.ok) throw new Error('file ' + r.status);
    let body = await open(key, new Uint8Array(await r.arrayBuffer()));
    const t = hit[1] || 'application/octet-stream';
    if (/^text\/html/.test(t)) {
      let s = new TextDecoder().decode(body), tag = `<script src="/_view/inject.js?at=${encodeURIComponent(L.site)}"></script>`;
      const m = s.match(/<head[^>]*>/i); s = m ? s.replace(m[0], m[0] + tag) : tag + s; body = new TextEncoder().encode(s);
    }
    return new Response(req.method === 'HEAD' ? null : body, { status: 200, headers: { 'content-type': t + (/^text\/|json|javascript/.test(t) ? '; charset=utf-8' : ''), 'cache-control': 'no-store' } });
  } catch (err) { return nav ? page('Error', '<h2>Could not open this page</h2><p>Try again in a moment.</p>', 502) : new Response('', { status: 502 }); }
}
