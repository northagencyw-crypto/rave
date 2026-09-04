/* RAVE - motion + behaviour. No dependencies. */
(function () {
  'use strict';
  var RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  // ease out expo, the "camera settles" curve
  var eo = function (t) { return t >= 1 ? 1 : 1 - Math.pow(2, -9 * t); };

  /* ---------------- PORTAL ---------------- */
  var portal = document.querySelector('[data-portal]');
  var pf = null;
  if (portal && !RM) {
    pf = {
      el: portal,
      mask: portal.querySelector('.portal__mask'),
      world: portal.querySelector('.portal__world'),
      haze: portal.querySelector('.portal__haze'),
      arch: portal.querySelector('.portal__arch'),
      jambs: portal.querySelectorAll('.portal__arch span'),
      dim: portal.querySelector('.portal__dim'),
      cue: portal.querySelector('.portal__scroll'),
      card: portal.querySelector('.portal__card'),
      brand: portal.querySelector('.portal__brand')
    };
  }

  function drawPortal() {
    if (!pf) return;
    var r = pf.el.getBoundingClientRect();
    var total = pf.el.offsetHeight - window.innerHeight;
    var p = clamp(-r.top / (total || 1), 0, 1);

    // camera approach: slow at first, then the door swallows the frame
    var s = Math.pow(16, Math.pow(p, 1.6));
    pf.mask.style.transform = 'translate(-50%,-50%) scale(' + s.toFixed(4) + ')';

    // the world settles as we get closer, and the inside slowly becomes visible
    pf.world.style.transform = 'scale(' + lerp(1.2, 1.0, eo(p)).toFixed(4) + ')';
    pf.dim.style.opacity = (0.62 * clamp(1 - (p - 0.05) / 0.55, 0, 1)).toFixed(3);

    // light leaks through before the door is open
    var h = p < 0.18 ? 0 : p < 0.62 ? (p - 0.18) / 0.44 : clamp(1 - (p - 0.62) / 0.3, 0, 1);
    pf.haze.style.opacity = (h * 0.9).toFixed(3);

    // the jambs part and fall away as we cross
    var jp = eo(clamp((p - 0.12) / 0.68, 0, 1));
    pf.jambs[0].style.transform = 'translateX(' + (-jp * 62).toFixed(2) + '%)';
    pf.jambs[1].style.transform = 'scaleX(-1) translateX(' + (-jp * 62).toFixed(2) + '%)';
    pf.arch.style.opacity = clamp(1 - (p - 0.55) / 0.2, 0, 1).toFixed(3);

    // cues out, event in
    var cu = clamp(1 - p / 0.06, 0, 1);
    pf.cue.style.opacity = cu.toFixed(3);
    pf.cue.style.visibility = cu < 0.02 ? 'hidden' : 'visible';
    pf.brand.style.opacity = (0.45 * clamp(1 - p / 0.3, 0, 1)).toFixed(3);
    var c = clamp((p - 0.74) / 0.2, 0, 1);
    pf.card.style.opacity = c.toFixed(3);
    pf.card.style.transform = 'translateY(' + ((1 - c) * 28).toFixed(1) + 'px)';
    pf.card.style.pointerEvents = c > 0.6 ? 'auto' : 'none';
  }

  /* ---------------- NAV ---------------- */
  var nav = document.querySelector('.nav');
  var lastY = 0;
  function drawNav() {
    var y = window.scrollY;
    if (!nav) return;
    nav.setAttribute('data-float', y > window.innerHeight * 0.6 ? '1' : '0');
    // during the portal the interface stays out of the way
    if (pf) {
      var pp = clamp(-pf.el.getBoundingClientRect().top / ((pf.el.offsetHeight - window.innerHeight) || 1), 0, 1);
      var vis = clamp((pp - 0.72) / 0.14, 0, 1);
      nav.style.opacity = vis.toFixed(3);
      nav.style.pointerEvents = vis > 0.5 ? 'auto' : 'none';
    }
    var inPortal = pf && pf.el.getBoundingClientRect().bottom > window.innerHeight * 0.5;
    var down = !inPortal && y > lastY && y > window.innerHeight;
    nav.style.transform = down ? 'translateY(-140%)' : 'none';
    lastY = y;
  }

  /* ---------------- PROGRESO ---------------- */
  var bar = document.querySelector('.progress');
  function drawBar() {
    if (!bar) return;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = 'scaleX(' + (max > 0 ? clamp(window.scrollY / max, 0, 1) : 0).toFixed(4) + ')';
  }

  /* ---------------- STICKY BUY ---------------- */
  var sticky = document.querySelector('.sticky-buy');
  function drawSticky() {
    if (!sticky) return;
    sticky.setAttribute('data-on', window.scrollY > window.innerHeight * 0.75 ? '1' : '0');
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      drawPortal(); drawNav(); drawSticky(); drawBar(); ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  onScroll();

  /* ---------------- CUENTA REGRESIVA ---------------- */
  document.querySelectorAll('[data-count]').forEach(function (el) {
    var when = new Date(el.getAttribute('data-count')).getTime();
    if (isNaN(when)) return;
    var days = Math.ceil((when - Date.now()) / 86400000);
    var b = el.querySelector('b'), i = el.querySelector('i');
    if (days > 1) { b.textContent = days; i.textContent = 'DIAS'; }
    else if (days === 1) { b.textContent = '1'; i.textContent = 'DIA'; }
    else if (days === 0) { b.textContent = 'HOY'; i.textContent = ''; }
    else { el.setAttribute('data-done', ''); b.textContent = ''; i.textContent = 'YA PASO'; }
  });

  /* ---------------- REVEAL ---------------- */
  var io = 'IntersectionObserver' in window
    ? new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
      }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 })
    : null;
  document.querySelectorAll('[data-rv]').forEach(function (el, i) {
    el.style.transitionDelay = (Math.min(i % 4, 3) * 70) + 'ms';
    if (io) io.observe(el); else el.classList.add('in');
  });

  /* ---------------- MENU ---------------- */
  var menu = document.querySelector('.menu');
  var burger = document.querySelector('.nav__burger');
  function setMenu(v) {
    if (!menu) return;
    menu.setAttribute('data-open', v ? '1' : '0');
    document.body.style.overflow = v ? 'hidden' : '';
  }
  if (burger) burger.addEventListener('click', function () { setMenu(true); });
  document.querySelectorAll('.menu a, .menu__x').forEach(function (a) {
    a.addEventListener('click', function () { setMenu(false); });
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { setMenu(false); closeLb(); } });

  /* ---------------- LIGHTBOX ---------------- */
  var lb = null;
  function closeLb() {
    if (!lb) return;
    lb.setAttribute('data-open', '0');
    lb.querySelector('.lb__frame').innerHTML = '';
    document.body.style.overflow = '';
  }
  function openLb(url, title) {
    if (!lb) {
      lb = document.createElement('div');
      lb.className = 'lb';
      lb.setAttribute('data-open', '0');
      lb.innerHTML = '<p class="lb__t"></p><button class="lb__x" type="button">CERRAR</button>' +
                     '<div class="lb__frame"></div>';
      document.body.appendChild(lb);
      lb.addEventListener('click', function (ev) {
        if (ev.target === lb || ev.target.classList.contains('lb__x')) closeLb();
      });
    }
    lb.querySelector('.lb__t').textContent = title || '';
    lb.querySelector('.lb__frame').innerHTML =
      '<iframe src="' + url.replace('youtube.com', 'youtube-nocookie.com') +
      '?autoplay=1&rel=0" title="' + (title || 'video') + '" allow="autoplay; encrypted-media; ' +
      'picture-in-picture" allowfullscreen loading="lazy"></iframe>';
    lb.setAttribute('data-open', '1');
    document.body.style.overflow = 'hidden';
  }
  document.querySelectorAll('[data-embed]').forEach(function (b) {
    b.addEventListener('click', function () {
      openLb(b.getAttribute('data-embed'), b.getAttribute('data-title'));
      if (window.RAVE) window.RAVE.track('play_media', { title: b.getAttribute('data-title') });
    });
  });

  /* ---------------- LAZY VIDEO ---------------- */
  // los <source data-src> solo se resuelven cuando el video se acerca a pantalla
  document.querySelectorAll('video[data-lazy]').forEach(function (v) {
    if (!io) return;
    var o = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        v.querySelectorAll('source[data-src]').forEach(function (s) {
          s.src = s.getAttribute('data-src');
        });
        v.load();
        var pr = v.play(); if (pr && pr.catch) pr.catch(function () {});
        o.unobserve(v);
      });
    }, { rootMargin: '400px' });
    o.observe(v);
  });

  document.querySelectorAll('video[data-src]').forEach(function (v) {
    if (!io) return;
    var o = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        v.src = v.getAttribute('data-src'); v.load();
        var pr = v.play(); if (pr && pr.catch) pr.catch(function () {});
        o.unobserve(v);
      });
    }, { rootMargin: '200px' });
    o.observe(v);
  });
})();
