/* RAVE - single analytics layer. Nothing calls GA/Meta directly. */
(function () {
  'use strict';
  var CFG = window.RAVE_CONFIG || {};
  var KEY = 'rave_attr';
  var UTM = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid', 'rrpp'];

  function readAttr() {
    var q = new URLSearchParams(location.search), found = {}, has = false;
    UTM.forEach(function (k) { var v = q.get(k); if (v) { found[k] = v; has = true; } });
    if (!has) {
      try { return JSON.parse(sessionStorage.getItem(KEY) || '{}'); } catch (e) { return {}; }
    }
    found.landing = location.pathname;
    found.ts = Date.now();
    try { sessionStorage.setItem(KEY, JSON.stringify(found)); } catch (e) {}
    return found;
  }
  var attr = readAttr();

  function track(name, params) {
    var d = Object.assign({}, attr, params || {});
    if (window.gtag) window.gtag('event', name, d);
    if (window.fbq) {
      var std = { view_event: 'ViewContent', view_artist: 'ViewContent', click_ticket: 'InitiateCheckout', lead: 'Lead' };
      if (std[name]) window.fbq('track', std[name], d); else window.fbq('trackCustom', name, d);
    }
    (window.dataLayer = window.dataLayer || []).push(Object.assign({ event: name }, d));
    if (CFG.debug) console.log('[rave]', name, d);
  }
  window.RAVE = { track: track, attribution: attr };

  // page type declared once, in the body dataset
  var b = document.body.dataset;
  track('page_view', { page_type: b.page || 'page', entity: b.entity || null });
  if (b.page === 'event') track('view_event', { event_slug: b.entity, price: b.price });
  if (b.page === 'artist') track('view_artist', { artist_slug: b.entity });
  if (b.page === 'article') track('view_article', { article_slug: b.entity });

  // ticket clicks: fire, then leave
  document.querySelectorAll('[data-ticket]').forEach(function (a) {
    a.addEventListener('click', function () {
      track('click_ticket', {
        event_slug: a.getAttribute('data-ticket'),
        price: a.getAttribute('data-price') || null,
        placement: a.getAttribute('data-placement') || 'unknown'
      });
    });
  });

  // capture form: no backend yet, so it does not pretend to succeed
  document.querySelectorAll('form[data-capture]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = (f.querySelector('input[type=email]') || {}).value || '';
      if (!email) return;
      track('lead', { list: f.getAttribute('data-capture') });
      var note = f.querySelector('[data-note]');
      if (note) note.textContent = 'PENDING: conectar endpoint de captura. El evento lead ya se dispara.';
      if (CFG.capture_endpoint && CFG.capture_endpoint !== 'PENDING') {
        fetch(CFG.capture_endpoint, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email, attribution: attr })
        }).then(function () { if (note) note.textContent = 'Estas adentro.'; f.reset(); }).catch(function () {});
      }
    });
  });
})();
