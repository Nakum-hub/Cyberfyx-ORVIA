/**
 * The website banner script (EX02), generated per site with its published
 * configuration embedded. It is served by this installation and loads nothing
 * else. Scripts on the customer's page are written as
 *   <script type="text/plain" data-orvia-category="analytics" data-src="..."></script>
 * and are activated only once their category is granted; scripts inserted
 * later are watched for the same marking. Withdrawal clears the cookies the
 * configuration declares for the withdrawn categories and reloads the page so
 * nothing already running keeps going. The dialog is keyboard operable, holds
 * focus while open, and gives accepting and refusing equal weight. A Global
 * Privacy Control signal is applied as a refusal when the rule says so.
 */
export type SdkConfig = {
  siteKey: string; version: number;
  categories: { key: string; label: string; description: string; required: boolean }[];
  cookies: Record<string, string[]>;
  texts: Record<string, { title: string; body: string; accept_all: string; reject_all: string; choose: string; save: string }>;
  honourGpc: boolean;
};

export function sdkSource(config: SdkConfig) {
  // JSON inside a script: escape anything that could close the element or start a comment.
  const embedded = JSON.stringify(config).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  return `/* ORVIA consent banner — served by your ORVIA installation; loads no other resource. */
(function () {
  'use strict';
  if (window.OrviaCMP) return;
  var CONFIG = ${embedded};
  var script = document.currentScript;
  var ENDPOINT = new URL(script.src).origin + '/api/v1/cmp/' + CONFIG.siteKey + '/consents';
  var STATE = 'orvia_cmp', VISITOR = 'orvia_cmp_vid', YEAR = 31536000;
  var listeners = [];
  function readCookie(name) { var m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)')); return m ? decodeURIComponent(m[1]) : null; }
  function writeCookie(name, value) { document.cookie = name + '=' + encodeURIComponent(value) + '; Max-Age=' + YEAR + '; Path=/; SameSite=Lax' + (location.protocol === 'https:' ? '; Secure' : ''); }
  function visitor() { var v = readCookie(VISITOR); if (!v || !/^[0-9a-f-]{36}$/.test(v)) { v = crypto.randomUUID(); writeCookie(VISITOR, v); } return v; }
  function current() { try { var s = JSON.parse(readCookie(STATE) || 'null'); return s && s.v === CONFIG.version ? s.c : null; } catch (e) { return null; } }
  function granted(category) { var c = current(); var cat = CONFIG.categories.filter(function (x) { return x.key === category; })[0]; return !!(cat && (cat.required || (c && c[category] === true))); }
  function language() { var l = (document.documentElement.lang || 'en').split('-')[0]; return CONFIG.texts[l] ? l : 'en'; }
  function activate(node) {
    if (node.getAttribute('data-orvia-activated') || !granted(node.getAttribute('data-orvia-category'))) return;
    var s = document.createElement('script');
    for (var i = 0; i < node.attributes.length; i++) { var a = node.attributes[i]; if (['type', 'data-src', 'data-orvia-category'].indexOf(a.name) < 0) s.setAttribute(a.name, a.value); }
    if (node.getAttribute('data-src')) s.src = node.getAttribute('data-src'); else s.text = node.text;
    node.setAttribute('data-orvia-activated', 'true');
    node.parentNode.insertBefore(s, node.nextSibling);
  }
  function activateAll() { var list = document.querySelectorAll('script[type="text/plain"][data-orvia-category]'); for (var i = 0; i < list.length; i++) activate(list[i]); }
  function clearCookies(category) {
    var patterns = CONFIG.cookies[category] || [];
    document.cookie.split('; ').forEach(function (pair) {
      var name = pair.split('=')[0];
      var match = patterns.some(function (p) { return p.slice(-1) === '*' ? name.indexOf(p.slice(0, -1)) === 0 : name === p; });
      if (!match) return;
      var parts = location.hostname.split('.');
      for (var i = 0; i < parts.length; i++) {
        var domain = parts.slice(i).join('.');
        document.cookie = name + '=; Max-Age=0; Path=/; Domain=' + domain;
      }
      document.cookie = name + '=; Max-Age=0; Path=/';
    });
  }
  function record(choices, gpc) {
    var previous = current();
    writeCookie(STATE, JSON.stringify({ v: CONFIG.version, c: choices, t: Date.now() }));
    var body = JSON.stringify({ visitor_id: visitor(), config_version: CONFIG.version, choices: choices, gpc: !!gpc, language: language() });
    var sent = fetch(ENDPOINT, { method: 'POST', mode: 'cors', credentials: 'omit', keepalive: true, headers: { 'content-type': 'application/json' }, body: body })
      .then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
    var withdrawn = previous ? Object.keys(previous).filter(function (k) { return previous[k] === true && choices[k] === false; }) : [];
    listeners.forEach(function (fn) { try { fn(choices); } catch (e) { /* a listener cannot break consent handling */ } });
    close();
    if (withdrawn.length) { withdrawn.forEach(clearCookies); sent.then(function () { location.reload(); }); return sent; }
    activateAll();
    return sent;
  }
  function all(value) { var c = {}; CONFIG.categories.forEach(function (x) { c[x.key] = x.required ? true : value; }); return c; }
  var dialog = null, lastFocus = null;
  function close() { if (dialog) { dialog.remove(); dialog = null; if (lastFocus && lastFocus.focus) lastFocus.focus(); } }
  function button(text, onClick) { var b = document.createElement('button'); b.type = 'button'; b.textContent = text; b.style.cssText = 'margin:4px;padding:8px 16px;border:1px solid #222;background:#fff;color:#111;border-radius:4px;font:inherit;cursor:pointer'; b.addEventListener('click', onClick); return b; }
  function open() {
    if (dialog) return;
    var t = CONFIG.texts[language()];
    lastFocus = document.activeElement;
    dialog = document.createElement('div');
    dialog.id = 'orvia-cmp'; dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true'); dialog.setAttribute('aria-labelledby', 'orvia-cmp-title'); dialog.setAttribute('aria-describedby', 'orvia-cmp-body');
    dialog.style.cssText = 'position:fixed;left:16px;right:16px;bottom:16px;max-width:640px;margin:0 auto;padding:16px;background:#fff;color:#111;border:2px solid #111;border-radius:8px;z-index:2147483647;font:16px/1.4 system-ui,sans-serif';
    var h = document.createElement('h2'); h.id = 'orvia-cmp-title'; h.textContent = t.title; h.style.cssText = 'margin:0 0 8px;font-size:18px';
    var p = document.createElement('p'); p.id = 'orvia-cmp-body'; p.textContent = t.body;
    var choices = document.createElement('fieldset'); choices.hidden = true; choices.style.cssText = 'border:1px solid #999;margin:8px 0;padding:8px';
    var legend = document.createElement('legend'); legend.textContent = t.choose; choices.appendChild(legend);
    var state = current() || all(false);
    CONFIG.categories.forEach(function (cat) {
      var label = document.createElement('label'); label.style.cssText = 'display:block;margin:4px 0';
      var box = document.createElement('input'); box.type = 'checkbox'; box.name = cat.key; box.checked = cat.required || state[cat.key] === true; box.disabled = cat.required;
      label.appendChild(box); label.appendChild(document.createTextNode(' ' + cat.label + ' — ' + cat.description));
      choices.appendChild(label);
    });
    var row = document.createElement('div');
    row.appendChild(button(t.accept_all, function () { record(all(true), false); }));
    row.appendChild(button(t.reject_all, function () { record(all(false), false); }));
    var chooseButton = button(t.choose, function () { choices.hidden = false; chooseButton.remove(); row.appendChild(saveButton); saveButton.focus(); });
    var saveButton = button(t.save, function () { var c = {}; CONFIG.categories.forEach(function (cat) { c[cat.key] = cat.required ? true : choices.querySelector('input[name="' + cat.key + '"]').checked; }); record(c, false); });
    row.appendChild(chooseButton);
    dialog.appendChild(h); dialog.appendChild(p); dialog.appendChild(choices); dialog.appendChild(row);
    dialog.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); record(all(false), false); return; }
      if (e.key !== 'Tab') return;
      var focusable = Array.prototype.filter.call(dialog.querySelectorAll('button, input:not([disabled])'), function (el) { return el.offsetParent !== null; }); var first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    document.body.appendChild(dialog);
    row.querySelector('button').focus();
  }
  new MutationObserver(function (mutations) { mutations.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1 && n.matches && n.matches('script[type="text/plain"][data-orvia-category]')) activate(n); }); }); })
    .observe(document.documentElement, { childList: true, subtree: true });
  window.OrviaCMP = {
    open: open, acceptAll: function () { return record(all(true), false); }, rejectAll: function () { return record(all(false), false); },
    consent: function () { return current(); }, onChange: function (fn) { listeners.push(fn); }, version: CONFIG.version,
  };
  function start() {
    if (current()) { activateAll(); return; }
    if (CONFIG.honourGpc && navigator.globalPrivacyControl === true) { record(all(false), true); return; }
    open();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
`;
}
