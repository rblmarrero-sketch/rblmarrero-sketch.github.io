/* VIEW_PAGES_V1 - runs first in every page of the off-site copy: the copy is read-only, the page's own service worker stays off, and a small
   label says how old the copy is, with Log out. */
(function () {
  'use strict';
  var at = ''; try { at = decodeURIComponent((document.currentScript.src.split('at=')[1] || '')); } catch (e) {}
  try { if (navigator.serviceWorker) navigator.serviceWorker.register = function () { return Promise.reject(new Error('off in the copy')); }; } catch (e) {}
  function ru() { try { return (localStorage.getItem('askpi_lang') || document.documentElement.lang || '').slice(0, 2) === 'ru'; } catch (e) { return false; } }
  function show() {
    if (!document.body || document.getElementById('vwTag')) return;
    var d = document.createElement('div'); d.id = 'vwTag';
    d.setAttribute('style', 'position:fixed;right:10px;bottom:10px;z-index:2147483647;font:12px/1.3 system-ui,sans-serif;background:#13294b;color:#fff;' +
      'border-radius:16px;padding:6px 10px;box-shadow:0 2px 8px rgba(0,0,0,.25);display:flex;gap:10px;align-items:center;opacity:.92');
    var r = ru();
    d.innerHTML = '<span>' + (r ? 'Копия ' : 'Copy ') + at + (r ? ' (площадка) · только чтение' : ' site · read-only') + '</span>' +
      '<a href="/_view/logout" style="color:#9cc3ff">' + (r ? 'Выйти' : 'Log out') + '</a>' +
      '<button type="button" aria-label="Hide" style="background:none;border:0;color:#fff;font-size:15px;cursor:pointer;padding:0 2px">×</button>';
    d.querySelector('button').onclick = function () { d.remove(); };
    document.body.appendChild(d);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', show); else show();
})();
