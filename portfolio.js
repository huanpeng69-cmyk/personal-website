/* ============================================================
   Portfolio interactions — intro (Conan door), particles,
   tilt, magnetic buttons, filters, nav, misc.
   Loaded with `defer`; the legacy inline script keeps running
   its own observers / demos, this file only adds on top.
   ============================================================ */
(function () {
  'use strict';
  var doc = document;
  function all(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(pointer: fine)').matches;
  var motionOff = false;

  /* ---------- toast ---------- */
  var toastEl = doc.getElementById('toast');
  var toastTimer = null;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2200);
  }

  /* ============================================================
     Intro — Conan-style castle gate (slow walk-in)
     gate stays closed (site hidden) → labeled triggers reveal
     one by one → click any door: it slowly parts, the site
     reveals behind it, the intro slides away and you land on
     that section. Skip / Esc / reduced-motion fall back.
     ============================================================ */
  var intro = doc.getElementById('intro');
  var skipBtn = doc.getElementById('skipIntro');
  var mainEl = doc.getElementById('mainContent');
  var tDoor = null, tExit = null, tHide = null;

  function stopTimers() {
    clearTimeout(tDoor); clearTimeout(tExit); clearTimeout(tHide);
  }
  function splitWord() {
    if (!intro) return;
    var word = intro.querySelector('.intro-word');
    if (!word || word.dataset.split) return;
    var text = word.textContent;
    word.dataset.split = '1';
    word.textContent = '';
    Array.prototype.forEach.call(text, function (ch, i) {
      var s = doc.createElement('span');
      s.textContent = ch;
      s.style.setProperty('--i', i);
      if (ch === '.') s.classList.add('l-dot');
      word.appendChild(s);
    });
  }
  function liftIntro() {
    doc.body.classList.add('intro-done');
    doc.body.classList.remove('intro-lock');
  }
  function focusMain() {
    if (mainEl) { try { mainEl.focus({ preventScroll: true }); } catch (e) {} }
  }
  function scrollToSection(id) {
    var t = doc.getElementById(id);
    if (t) t.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    else window.scrollTo(0, 0);
  }
  function openGateThen(sectionId) {
    if (!intro || intro.classList.contains('door-open')) { scrollToSection(sectionId); return; }
    stopTimers();
    intro.classList.add('unlock');
    tDoor = setTimeout(function () {
      intro.classList.add('door-open');
      doc.body.classList.remove('intro-lock');
    }, 400);
    tExit = setTimeout(function () {
      intro.classList.add('exit');
      liftIntro(); focusMain();
      scrollToSection(sectionId);
    }, 2400);
    tHide = setTimeout(function () { intro.hidden = true; }, 3700);
  }
  function skip() {
    if (!intro) { liftIntro(); window.scrollTo(0, 0); return; }
    if (intro.classList.contains('door-open')) {
      intro.classList.add('exit');
      tHide = setTimeout(function () { intro.hidden = true; }, 1400);
      liftIntro();
      return;
    }
    openGateThen('home');
  }
  function playIntro() {
    if (!intro) { liftIntro(); return; }
    if (reduceMotion) { intro.hidden = true; liftIntro(); focusMain(); return; }
    stopTimers();
    intro.classList.remove('play', 'unlock', 'door-open', 'exit');
    intro.classList.add('resetting');
    void intro.offsetWidth;
    intro.classList.remove('resetting');
    intro.hidden = false;
    doc.body.classList.add('intro-lock');
    splitWord();
    requestAnimationFrame(function () { intro.classList.add('play'); });
  }

  if (intro) {
    playIntro();
    if (skipBtn) skipBtn.addEventListener('click', skip);
    all('[data-jump]', intro).forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        openGateThen(a.getAttribute('data-jump'));
      });
    });
    var replayBtn = doc.getElementById('replayIntro');
    if (replayBtn) replayBtn.addEventListener('click', function () {
      window.scrollTo(0, 0);
      playIntro();
    });
    doc.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (intro && !intro.hidden) { skip(); return; }
      var modal = doc.getElementById('resumeModal');
      if (modal && modal.classList.contains('show')) { if (typeof closeResume === 'function') closeResume(); return; }
      var menu = doc.getElementById('mobileMenu');
      if (menu && menu.classList.contains('show')) { if (typeof toggleMenu === 'function') toggleMenu(); }
    });
  }

  /* ---------- hero entrance stagger (runs once intro lifts) ---------- */
  [
    ['.site-nav', 0],
    ['.hero-eyebrow', .08],
    ['.hero-person', .16],
    ['.hero-title .title-line:nth-of-type(1)', .22],
    ['.hero-title .title-line:nth-of-type(2)', .34],
    ['.hero-intro', .46],
    ['.hero-actions', .58],
    ['.hero-art', .42],
    ['.hero-foot', .68],
    ['.skill-marquee', .76]
  ].forEach(function (pair) {
    all(pair[0]).forEach(function (el) {
      el.classList.add('hero-anim');
      el.style.setProperty('--d', pair[1] + 's');
    });
  });

  /* ============================================================
     Particle field behind the chrome torus
     ============================================================ */
  var art = doc.getElementById('heroArt');
  var cv = doc.getElementById('formCanvas');
  var particles = [], raf = null, inView = true;
  var px = 0, py = 0, tx = 0, ty = 0;

  function sizeCanvas() {
    if (!cv || !art) return;
    var r = art.getBoundingClientRect();
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.max(1, Math.round(r.width * dpr));
    cv.height = Math.max(1, Math.round(r.height * dpr));
    var n = Math.max(36, Math.min(90, Math.round(r.width * r.height / 16000)));
    particles = [];
    for (var i = 0; i < n; i++) {
      particles.push({
        x: Math.random() * r.width,
        y: Math.random() * r.height,
        r: .7 + Math.random() * 1.7,
        s: .12 + Math.random() * .4,
        a: .25 + Math.random() * .5,
        ph: Math.random() * Math.PI * 2
      });
    }
  }
  function draw(t) {
    if (!cv) return;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var w = cv.width / dpr, h = cv.height / dpr;
    var ctx = cv.getContext('2d');
    px += (tx - px) * .06; py += (ty - py) * .06;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#9fd4ff';
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.y -= p.s;
      p.x += Math.sin(t / 2400 + p.ph) * .14;
      if (p.y < -6) { p.y = h + 6; p.x = Math.random() * w; }
      if (p.x < -6) p.x = w + 6;
      if (p.x > w + 6) p.x = -6;
      var tw = .55 + .45 * Math.sin(t / 900 + p.ph);
      ctx.globalAlpha = p.a * tw;
      ctx.beginPath();
      ctx.arc(p.x + px * 16, p.y + py * 10, p.r, 0, 7);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (motionOff || !inView || doc.hidden || reduceMotion) { raf = null; return; }
    raf = requestAnimationFrame(draw);
  }
  function wake() {
    if (!raf && inView && !motionOff && !reduceMotion && cv) raf = requestAnimationFrame(draw);
  }
  if (cv && art) {
    sizeCanvas();
    if (!reduceMotion) wake();
    window.addEventListener('resize', sizeCanvas);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        inView = en[0].isIntersecting;
        wake();
      }, { threshold: .05 }).observe(art);
    }
    doc.addEventListener('visibilitychange', wake);
    if (finePointer) {
      art.addEventListener('mousemove', function (e) {
        var r = art.getBoundingClientRect();
        tx = ((e.clientX - r.left) / r.width - .5) * 2;
        ty = ((e.clientY - r.top) / r.height - .5) * 2;
      });
      art.addEventListener('mouseleave', function () { tx = 0; ty = 0; });
    }
  }

  /* ---------- torus tilt (parallax) ---------- */
  var form = doc.querySelector('.form-fallback');
  if (form && art && finePointer && !reduceMotion) {
    var rx = 0, ry = 0, cx2 = 0, cy2 = 0, tiltRaf = null;
    var tiltLoop = function () {
      cx2 += (rx - cx2) * .08; cy2 += (ry - cy2) * .08;
      form.style.transform = 'rotateX(' + cy2.toFixed(2) + 'deg) rotateY(' + cx2.toFixed(2) + 'deg)';
      if (Math.abs(rx - cx2) > .02 || Math.abs(ry - cy2) > .02) tiltRaf = requestAnimationFrame(tiltLoop);
      else tiltRaf = null;
    };
    art.addEventListener('mousemove', function (e) {
      var r = art.getBoundingClientRect();
      rx = ((e.clientX - r.left) / r.width - .5) * 10;
      ry = -((e.clientY - r.top) / r.height - .5) * 8;
      if (!tiltRaf) tiltRaf = requestAnimationFrame(tiltLoop);
    });
    art.addEventListener('mouseleave', function () {
      rx = 0; ry = 0;
      if (!tiltRaf) tiltRaf = requestAnimationFrame(tiltLoop);
    });
  }

  /* ---------- magnetic buttons ---------- */
  if (finePointer && !reduceMotion) {
    all('[data-magnetic]').forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2);
        var dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = 'translate(' + (dx * .18).toFixed(1) + 'px,' + (dy * .18).toFixed(1) + 'px)';
      });
      el.addEventListener('mouseleave', function () { el.style.transform = ''; });
    });
  }

  /* ---------- motion toggle ---------- */
  var mt = doc.getElementById('motionToggle');
  var ml = doc.getElementById('motionLabel');
  if (mt) {
    mt.addEventListener('click', function () {
      motionOff = !motionOff;
      doc.body.classList.toggle('motion-off', motionOff);
      mt.setAttribute('aria-pressed', String(!motionOff));
      mt.setAttribute('aria-label', motionOff ? '开启动态效果' : '关闭动态效果');
      if (ml) ml.textContent = motionOff ? '动态效果 关' : '动态效果 开';
      if (motionOff) { if (form) form.style.transform = ''; }
      else wake();
    });
  }

  /* ---------- reveal on scroll ---------- */
  var revealSel = '.section-label,.sec-head,.work-toolbar,.repo-card,.about-portrait,.about-copy,.timeline-label,.tl-item,.play-tabs,.play-stage,.edu-card,.iv-left,.iv-right,.contact-main,.contact-bottom';
  var revealEls = all(revealSel);
  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: .12, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach(function (el, i) {
      el.classList.add('reveal');
      el.style.setProperty('--d', (i % 3) * .07 + 's');
      io.observe(el);
    });
  }

  /* ---------- project filters ---------- */
  var cards = all('.repo-card');
  var workCount = doc.getElementById('workCount');
  var countLabel = {
    all: 'SHOWING 08 PROJECTS',
    product: 'SHOWING 05 PROJECTS · AI & EFFICIENCY',
    creative: 'SHOWING 03 PROJECTS · CREATIVE'
  };
  all('.filter-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var f = btn.dataset.filter;
      all('.filter-btn').forEach(function (b) {
        var on = b === btn;
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', String(on));
      });
      cards.forEach(function (c, i) {
        var show = f === 'all' || c.dataset.cat === f;
        c.classList.toggle('hide', !show);
        if (show) {
          c.style.animation = 'none';
          void c.offsetWidth;
          c.style.animation = 'card-in .55s cubic-bezier(.22,.61,.21,1) ' + ((i % 6) * .05) + 's both';
        }
      });
      if (workCount) workCount.textContent = countLabel[f] || countLabel.all;
    });
  });

  /* ---------- nav spy + scrolled state ---------- */
  var navLinks = all('.nav-links a');
  if ('IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        navLinks.forEach(function (a) {
          var on = a.getAttribute('href') === '#' + e.target.id;
          a.classList.toggle('active', on);
          a.setAttribute('aria-current', on ? 'true' : 'false');
        });
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    ['home', 'repos', 'intern', 'playground', 'interview'].forEach(function (id) {
      var s = doc.getElementById(id);
      if (s) spy.observe(s);
    });
  }
  var siteNav = doc.querySelector('.site-nav');
  window.addEventListener('scroll', function () {
    if (siteNav) siteNav.classList.toggle('scrolled', window.scrollY > 12);
  }, { passive: true });

  /* ---------- copy email ---------- */
  var ce = doc.getElementById('copyEmail');
  if (ce) {
    ce.addEventListener('click', function () {
      var email = 'huanpeng69@gmail.com';
      var done = function () { toast('邮箱已复制，随时来信'); };
      var fallback = function () {
        var ta = doc.createElement('textarea');
        ta.value = email;
        ta.style.position = 'fixed'; ta.style.opacity = '0';
        doc.body.appendChild(ta);
        ta.select();
        try { doc.execCommand('copy'); done(); }
        catch (e) { toast('复制失败，请手动选择邮箱'); }
        ta.remove();
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(email).then(done).catch(fallback);
      } else fallback();
    });
  }

  /* ---------- copyright year ---------- */
  var cyEl = doc.getElementById('copyrightYear');
  if (cyEl) cyEl.textContent = String(new Date().getFullYear());
})();
