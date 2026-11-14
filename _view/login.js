/* VIEW_PAGES_V1 - the password page of the off-site copy. The password turns into the key here (PBKDF2), is checked against the encrypted
   page list, and only the key (not extractable) is kept in this browser. Nothing is sent anywhere. */
(function () {
  'use strict';
  var $ = function (i) { return document.getElementById(i); };
  var next = location.pathname.indexOf('/_view/') === 0 ? '/' : location.pathname + location.search + location.hash;
  function say(en, ru) { $('msg').textContent = en + (ru ? ' / ' + ru : ''); }
  function idb() { return new Promise(function (res, rej) { var r = indexedDB.open('askpiview', 1); r.onupgradeneeded = function () { r.result.createObjectStore('k'); };
    r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); }; }); }
  function put(k) { return idb().then(function (d) { return new Promise(function (res, rej) { var q = d.transaction('k', 'readwrite').objectStore('k').put(k, 'key');
    q.onsuccess = function () { res(); }; q.onerror = function () { rej(q.error); }; }); }); }
  function b64(s) { var b = atob(s), a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }
  if (!('serviceWorker' in navigator) || !window.crypto || !crypto.subtle) { say('This browser cannot open the copy. Use a current Chrome, Edge or Safari.', 'Обновите браузер.'); $('go').disabled = true; return; }
  fetch('/_v/p.json', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (p) {
    var d = new Date(p.at); if (!isNaN(d)) { var s = new Date(d.getTime() + 12 * 3600e3).toISOString(); $('at').textContent = 'Copy of ' + s.slice(8, 10) + '.' + s.slice(5, 7) + ' ' + s.slice(11, 16) + ' site time · Копия'; }
  }).catch(function () {});
  $('f').addEventListener('submit', function (ev) {
    ev.preventDefault(); $('go').disabled = true; say('Checking…', 'Проверка…');
    var pw = $('pw').value, P;
    fetch('/_v/p.json', { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error('nocopy'); return r.json(); }).then(function (p) { P = p;
      return crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']); })
    .then(function (base) { return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: b64(P.salt), iterations: P.iter }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']); })
    .then(function (key) { return fetch('/_v/m.bin', { cache: 'no-store' }).then(function (r) { return r.arrayBuffer(); }).then(function (buf) {
      var b = new Uint8Array(buf); return crypto.subtle.decrypt({ name: 'AES-GCM', iv: b.slice(0, 12) }, key, b.slice(12)); }).then(function () { return key; }); })
    .then(function (key) { return put(key); })
    .then(function () { return navigator.serviceWorker.register('/sw.js', { scope: '/' }); })
    .then(function () { return navigator.serviceWorker.ready; })
    .then(function () { if (navigator.serviceWorker.controller) return; return new Promise(function (res) { navigator.serviceWorker.addEventListener('controllerchange', res); setTimeout(res, 3000); }); })
    .then(function () { location.replace(next); })
    .catch(function (e) { $('go').disabled = false;
      if (e && e.name === 'OperationError') say('Wrong password.', 'Неверный пароль.'); else if (e && e.message === 'nocopy') say('The copy is not published yet.', 'Копия ещё не опубликована.');
      else say('Could not open: ' + (e && e.name || e), 'Не удалось открыть.'); });
  });
})();
