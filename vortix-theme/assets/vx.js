/* ==========================================================================
   VORTIX — interacción y movimiento
   GSAP + ScrollTrigger para el scroll; CSS para micro-interacciones.
   Reglas: solo transform/opacity, curvas ease-out, todo se desactiva con
   prefers-reduced-motion y cada init comprueba que su elemento existe.
   ========================================================================== */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var hasGsap = !!(window.gsap && window.ScrollTrigger);
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var EASE = 'expo.out';

  if (hasGsap) {
    gsap.registerPlugin(ScrollTrigger);
    gsap.defaults({ ease: 'power3.out', duration: 0.9 });
  }

  /* ---------- dinero ---------- */
  function money(cents) {
    var fmt = (window.vxConfig && window.vxConfig.moneyFormat) || '{{amount_with_comma_separator}} €';
    var n = (cents / 100);
    var withComma = n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    var withDot = n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return fmt
      .replace(/\{\{\s*amount_with_comma_separator\s*\}\}/, withComma)
      .replace(/\{\{\s*amount_no_decimals_with_comma_separator\s*\}\}/, Math.round(n).toString())
      .replace(/\{\{\s*amount_no_decimals\s*\}\}/, Math.round(n).toString())
      .replace(/\{\{\s*amount\s*\}\}/, withDot);
  }

  /* ---------- preloader + intro del hero ---------- */
  function initIntro() {
    var loader = $('.vx-loader');
    var hero = $('[data-vx-hero]');
    var skip = document.documentElement.classList.contains('vx-no-loader') || !hasGsap || reduce;
    var tl;

    if (!hasGsap || reduce) {
      if (loader) loader.remove();
      return;
    }

    var lines = hero ? $$('[data-hero-line]', hero) : [];
    var fades = hero ? $$('[data-hero-fade]', hero) : [];
    var product = hero && $('[data-hero-product]', hero);
    var badges = hero ? $$('[data-hero-badge]', hero) : [];
    var vortex = hero && $('[data-hero-vortex]', hero);

    if (hero) {
      gsap.set(lines, { yPercent: 110, rotate: 4 });
      gsap.set(fades, { autoAlpha: 0, y: 24 });
      if (product) gsap.set(product, { scale: 0.86, autoAlpha: 0, rotate: -8, y: 40 });
      if (vortex) gsap.set(vortex, { scale: 0.7, autoAlpha: 0 });
      gsap.set(badges, { autoAlpha: 0, scale: 0.92, y: 16 });
    }

    tl = gsap.timeline({ defaults: { ease: EASE } });

    if (loader && !skip) {
      loader.style.animation = 'none';
      var num = $('[data-loader-num]', loader);
      var counter = { v: 0 };
      tl.to('.vx-loader__r1', { rotate: 720, duration: 1.4, ease: 'power2.inOut', transformOrigin: '50% 50%' }, 0)
        .to('.vx-loader__r2', { rotate: -540, duration: 1.4, ease: 'power2.inOut', transformOrigin: '50% 50%' }, 0)
        .to('.vx-loader__r3', { rotate: 900, duration: 1.4, ease: 'power2.inOut', transformOrigin: '50% 50%' }, 0)
        .to(counter, {
          v: 7000, duration: 1.3, ease: 'power3.inOut',
          onUpdate: function () { if (num) num.textContent = String(Math.round(counter.v)).padStart(4, '0'); }
        }, 0)
        .to('.vx-loader__inner', { scale: 0.9, autoAlpha: 0, duration: 0.35, ease: 'power2.in' }, 1.35)
        .to(loader, { clipPath: 'inset(0 0 100% 0)', duration: 0.9, ease: 'expo.inOut' }, 1.5)
        .set(loader, { display: 'none' });
      try { sessionStorage.setItem('vx-seen', '1'); } catch (e) {}
    } else if (loader) {
      loader.remove();
    }

    if (hero) {
      var at = (loader && !skip) ? 1.75 : 0.05;
      tl.to(vortex, { scale: 1, autoAlpha: 1, duration: 1.4 }, at)
        .to(product, { scale: 1, autoAlpha: 1, rotate: 0, y: 0, duration: 1.4 }, at + 0.05)
        .to(lines, { yPercent: 0, rotate: 0, duration: 1.1, stagger: 0.09 }, at + 0.1)
        .to(fades, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.08 }, at + 0.4)
        .to(badges, { autoAlpha: 1, scale: 1, y: 0, duration: 0.8, stagger: 0.12, ease: 'back.out(1.6)' }, at + 0.7);
    }
  }

  /* ---------- hero: parallax con scroll + cursor ---------- */
  function initHeroScroll() {
    var hero = $('[data-vx-hero]');
    if (!hero || !hasGsap || reduce) return;
    var product = $('[data-hero-product]', hero);
    var stage = $('[data-hero-stage]', hero);
    var parts = $$('[data-hero-particles] i', hero);

    gsap.to(stage, {
      yPercent: 14, scale: 1.1, rotate: 6, ease: 'none',
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.6 }
    });
    gsap.to('.vx-hero__copy', {
      yPercent: -14, autoAlpha: 0.2, ease: 'none',
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.6 }
    });
    parts.forEach(function (p, i) {
      gsap.to(p, {
        y: (i % 2 ? -1 : 1) * (60 + i * 25), ease: 'none',
        scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 1 }
      });
      gsap.to(p, { x: (i % 2 ? 10 : -10), scale: 1.25, duration: 2.4 + i * 0.3, repeat: -1, yoyo: true, ease: 'sine.inOut' });
    });

    if (finePointer && stage) {
      var qx = gsap.quickTo(stage, 'rotationY', { duration: 0.9, ease: 'power3.out' });
      var qy = gsap.quickTo(stage, 'rotationX', { duration: 0.9, ease: 'power3.out' });
      gsap.set(stage, { transformPerspective: 1200 });
      hero.addEventListener('pointermove', function (e) {
        var r = hero.getBoundingClientRect();
        var dx = (e.clientX - r.left) / r.width - 0.5;
        var dy = (e.clientY - r.top) / r.height - 0.5;
        qx(dx * 10); qy(-dy * 8);
      });
      hero.addEventListener('pointerleave', function () { qx(0); qy(0); });
    }
  }

  /* ---------- reveals genéricos ---------- */
  function initReveals() {
    var els = $$('[data-reveal]');
    if (!els.length || !hasGsap || reduce) return;
    gsap.set(els, { autoAlpha: 0, y: 36 });
    ScrollTrigger.batch(els, {
      start: 'top 88%',
      once: true,
      onEnter: function (batch) {
        gsap.to(batch, { autoAlpha: 1, y: 0, duration: 1, ease: EASE, stagger: 0.08, overwrite: true });
      }
    });
  }

  /* ---------- contadores ---------- */
  function initCounters() {
    $$('[data-count]').forEach(function (el) {
      var raw = String(el.getAttribute('data-count')).replace(/\./g, '').replace(',', '.');
      var target = parseFloat(raw);
      if (isNaN(target)) return;
      var dec = parseInt(el.getAttribute('data-decimals') || '0', 10);
      var fmt = function (v) { return v.toLocaleString('es-ES', { minimumFractionDigits: dec, maximumFractionDigits: dec }); };
      if (!hasGsap || reduce) { el.textContent = fmt(target); return; }
      var o = { v: 0 };
      el.textContent = fmt(0);
      ScrollTrigger.create({
        trigger: el, start: 'top 90%', once: true,
        onEnter: function () {
          gsap.to(o, { v: target, duration: 2, ease: 'power2.out', onUpdate: function () { el.textContent = fmt(o.v); } });
        }
      });
    });
  }

  /* ---------- barras ---------- */
  function initBars() {
    $$('[data-bars]').forEach(function (wrap) {
      var fills = $$('[data-bar]', wrap);
      if (!fills.length || !hasGsap || reduce) return;
      gsap.set(fills, { scaleX: 0 });
      ScrollTrigger.create({
        trigger: wrap, start: 'top 80%', once: true,
        onEnter: function () {
          fills.forEach(function (f, i) {
            gsap.to(f, { scaleX: parseFloat(f.getAttribute('data-bar')) || 0, duration: 1.6, delay: i * 0.08, ease: 'expo.out' });
          });
        }
      });
    });
  }

  /* ---------- marquesina sensible a la velocidad del scroll ---------- */
  function initMarquee() {
    var skews = $$('.vx-marquee__skew');
    if (!skews.length || !hasGsap || reduce) return;
    var setters = skews.map(function (s) { return gsap.quickTo(s, 'skewX', { duration: 0.5, ease: 'power3.out' }); });
    ScrollTrigger.create({
      onUpdate: function (self) {
        var v = gsap.utils.clamp(-8, 8, self.getVelocity() / -300);
        setters.forEach(function (fn) { fn(v); });
      }
    });
    ScrollTrigger.addEventListener('scrollEnd', function () { setters.forEach(function (fn) { fn(0); }); });
  }

  /* ---------- imagen que se expande al hacer scroll ---------- */
  function initExpand() {
    $$('[data-expand]').forEach(function (sec) {
      var pin = $('[data-expand-pin]', sec);
      var media = $('[data-expand-media]', sec);
      var img = media && media.querySelector('img, video');
      var title = $('[data-expand-title]', sec);
      var sides = $$('[data-expand-side]', sec);
      if (!media || !hasGsap || reduce) return;

      var mm = gsap.matchMedia();
      mm.add({ desk: '(min-width: 750px)', mob: '(max-width: 749px)' }, function (ctx) {
        gsap.set(media, { '--vx-ex-y': ctx.conditions.desk ? '22%' : '24%', '--vx-ex-x': ctx.conditions.desk ? '30%' : '10%', '--vx-ex-r': '28px' });
        gsap.set(title, { autoAlpha: 0, y: 60 });
        var tl = gsap.timeline({
          scrollTrigger: { trigger: sec, start: 'top top', end: '+=140%', scrub: 0.8, pin: pin, anticipatePin: 1 }
        });
        tl.to(media, { '--vx-ex-y': '0%', '--vx-ex-x': '0%', '--vx-ex-r': '0px', ease: 'power2.inOut', duration: 1 }, 0)
          .to(img, { scale: 1, ease: 'power2.inOut', duration: 1 }, 0)
          .to(sides[0], { xPercent: -60, autoAlpha: 0, ease: 'power2.in', duration: 0.6 }, 0)
          .to(sides[1], { xPercent: 60, autoAlpha: 0, ease: 'power2.in', duration: 0.6 }, 0)
          .to(media, { '--vx-ex-shade': 1, duration: 0.4 }, 0.6)
          .to(title, { autoAlpha: 1, y: 0, ease: 'power3.out', duration: 0.4 }, 0.65);
      });
    });
  }

  /* ---------- anuncio animado (timeline en bucle tipo vídeo) ---------- */
  function initFilm() {
    $$('[data-film]').forEach(function (sec) {
      var video = $('video', sec);
      var vbtn = $('[data-film-video-toggle]', sec);
      if (video && vbtn) {
        var setV = function (playing) {
          vbtn.innerHTML = playing ? iconPause : iconPlay;
          vbtn.setAttribute('aria-label', playing ? 'Pausar vídeo' : 'Reproducir vídeo');
        };
        vbtn.addEventListener('click', function () { if (video.paused) { video.play(); setV(true); } else { video.pause(); setV(false); } });
        if (reduce) { video.pause(); setV(false); }
        return;
      }

      var cup = $('[data-film-cup]', sec);
      if (!cup || !hasGsap) return;
      var caps = $$('[data-film-cap]', sec);
      var powder = $$('[data-film-powder] circle', sec);
      var liquid = $('[data-film-liquid]', sec);
      var wave = $('[data-film-wave]', sec);
      var lumps = $$('[data-film-lumps] circle', sec);
      var swirl = $('[data-film-swirl]', sec);
      var ellipses = $$('[data-film-swirl] ellipse', sec);
      var lid = $('[data-film-lid]', sec);
      var button = $('[data-film-button]', sec);
      var ripple = $('[data-film-ripple]', sec);
      var glow = $('[data-film-glow]', sec);
      var big = $('[data-film-big]', sec);
      var flash = $('[data-film-flash]', sec);
      var bar = $('[data-film-progress]', sec);
      var toggle = $('[data-film-toggle]', sec);

      if (reduce) {
        gsap.set(liquid, { y: 120 }); gsap.set(caps[caps.length - 1], { autoAlpha: 1 }); gsap.set(lumps, { autoAlpha: 0 });
        if (toggle) toggle.hidden = true;
        return;
      }

      gsap.set(liquid, { y: 262 });
      gsap.set(lid, { y: -70, autoAlpha: 0 });
      gsap.set(swirl, { autoAlpha: 0 });
      gsap.set(lumps, { autoAlpha: 0, scale: 1, transformOrigin: '50% 50%' });
      gsap.set([powder, ripple], { autoAlpha: 0 });
      gsap.set(caps, { autoAlpha: 0, y: 30 });
      gsap.to(wave, { x: -80, duration: 1.4, repeat: -1, ease: 'none' });
      var spin = gsap.to(ellipses, { rotate: 360, svgOrigin: '100 200', duration: 0.5, repeat: -1, ease: 'none', paused: true });

      function cap(i, at, dur) {
        tl.to(caps[i], { autoAlpha: 1, y: 0, duration: 0.5, ease: EASE }, at)
          .to(caps[i], { autoAlpha: 0, y: -24, duration: 0.35, ease: 'power2.in' }, at + dur);
      }

      var tl = gsap.timeline({ repeat: -1, repeatDelay: 0.4, paused: true, onUpdate: function () { if (bar) gsap.set(bar, { scaleX: tl.progress() }); } });
      tl.fromTo(cup, { scale: 0.92, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.7, ease: EASE }, 0);
      // 1 · polvo
      cap(0, 0.2, 1.6);
      tl.fromTo(powder, { y: 0, autoAlpha: 1 }, { y: 230, duration: 1.1, stagger: 0.07, ease: 'power2.in', immediateRender: false }, 0.4)
        .to(powder, { autoAlpha: 0, duration: 0.1, stagger: 0.07 }, 1.4)
        .to(lumps, { autoAlpha: 1, duration: 0.3, stagger: 0.05 }, 1.3)
        .to(liquid, { y: 236, duration: 0.6 }, 1.3);
      // 2 · líquido
      cap(1, 2.3, 1.6);
      tl.to(liquid, { y: 118, duration: 1.6, ease: 'power2.inOut' }, 2.4)
        .to(lumps, { y: -60, duration: 1.6, ease: 'power2.inOut', stagger: 0.04 }, 2.4)
        .to(lid, { y: 0, autoAlpha: 1, duration: 0.6, ease: 'back.out(1.8)' }, 3.7);
      // 3 · pulsa
      cap(2, 4.3, 1.2);
      tl.to(button, { scale: 0.8, transformOrigin: '50% 50%', svgOrigin: '100 287', duration: 0.12, ease: 'power2.in' }, 4.9)
        .to(button, { scale: 1, svgOrigin: '100 287', duration: 0.3, ease: 'back.out(3)' }, 5.02)
        .fromTo(ripple, { scale: 1, autoAlpha: 0.9, svgOrigin: '100 287' }, { scale: 3.2, autoAlpha: 0, svgOrigin: '100 287', duration: 0.8, ease: 'power2.out', immediateRender: false }, 4.95)
        .to(glow, { autoAlpha: 1, duration: 0.4 }, 5);
      // 4 · 7000 rpm
      cap(3, 5.7, 1.8);
      tl.call(function () { spin.play(); }, null, 5.2)
        .to(swirl, { autoAlpha: 1, duration: 0.3 }, 5.2)
        .to(lumps, { scale: 0, autoAlpha: 0, duration: 0.9, stagger: 0.1, ease: 'power2.in' }, 5.4)
        .to(cup, { x: 3, duration: 0.05, repeat: 30, yoyo: true, ease: 'none' }, 5.2)
        .fromTo(big, { autoAlpha: 0, scale: 0.8 }, { autoAlpha: 1, scale: 1, duration: 0.8, ease: EASE }, 5.6)
        .fromTo(flash, { autoAlpha: 0 }, { autoAlpha: 0.35, duration: 0.08, yoyo: true, repeat: 1 }, 5.6)
        .to(big, { autoAlpha: 0, scale: 1.15, duration: 0.5, ease: 'power2.in' }, 7.3);
      // 5 · listo
      tl.to(swirl, { autoAlpha: 0, duration: 0.4 }, 7.4)
        .call(function () { spin.pause(); }, null, 7.8)
        .to(glow, { autoAlpha: 0, duration: 0.6 }, 7.5)
        .to(cup, { x: 0, y: -10, duration: 0.6, ease: EASE }, 7.5);
      cap(4, 7.7, 1.8);
      tl.to(cup, { y: 0, autoAlpha: 0, scale: 0.96, duration: 0.5, ease: 'power2.in' }, 9.6)
        .to({}, { duration: 0.01 }, 10.2);

      var userPaused = false;
      ScrollTrigger.create({
        trigger: sec, start: 'top 75%', end: 'bottom 20%',
        onToggle: function (self) { if (self.isActive && !userPaused) tl.play(); else tl.pause(); }
      });
      if (toggle) toggle.addEventListener('click', function () {
        userPaused = !userPaused;
        if (userPaused) { tl.pause(); spin.pause(); } else { tl.play(); }
        toggle.innerHTML = userPaused ? iconPlay : iconPause;
        toggle.setAttribute('aria-label', userPaused ? 'Reproducir animación' : 'Pausar animación');
      });
    });
  }
  var iconPlay = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l13-7.5z"/></svg>';
  var iconPause = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="4.5" width="4" height="15" rx="1"/><rect x="14" y="4.5" width="4" height="15" rx="1"/></svg>';

  /* ---------- galería horizontal con scroll (escritorio) ---------- */
  function initPeople() {
    $$('[data-people]').forEach(function (sec) {
      var track = $('[data-people-track]', sec);
      var pin = $('[data-people-pin]', sec);
      if (!track || !hasGsap || reduce) return;
      var mm = gsap.matchMedia();
      mm.add('(min-width: 990px)', function () {
        var dist = function () { return Math.max(0, track.scrollWidth - window.innerWidth); };
        if (dist() < 40) return;
        var cards = $$('.vx-person', track);
        var tween = gsap.to(track, {
          x: function () { return -dist(); }, ease: 'none',
          scrollTrigger: { trigger: sec, start: 'top top', end: function () { return '+=' + dist(); }, scrub: 0.8, pin: pin, invalidateOnRefresh: true, anticipatePin: 1 }
        });
        cards.forEach(function (c) {
          var im = c.querySelector('img');
          if (im && !c.classList.contains('vx-person--product')) {
            gsap.fromTo(im, { xPercent: -8, scale: 1.15 }, { xPercent: 8, scale: 1.15, ease: 'none', scrollTrigger: { trigger: c, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } });
          }
        });
      });
    });
  }

  /* ---------- características sticky ---------- */
  function initFeatures() {
    $$('[data-features]').forEach(function (sec) {
      var items = $$('[data-feat-item]', sec);
      var imgs = $$('[data-feat-img]', sec);
      var cur = $('[data-feat-current]', sec);
      if (!items.length) return;
      var activate = function (i) {
        items.forEach(function (el, k) { el.classList.toggle('is-active', k === i); });
        imgs.forEach(function (el, k) { el.classList.toggle('is-active', k === i); });
        if (cur) cur.textContent = String(i + 1).padStart(2, '0');
      };
      if (hasGsap) {
        items.forEach(function (el, i) {
          ScrollTrigger.create({ trigger: el, start: 'top 55%', end: 'bottom 55%', onToggle: function (self) { if (self.isActive) activate(i); } });
        });
      } else if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) activate(items.indexOf(e.target)); }); }, { rootMargin: '-45% 0px -45% 0px' });
        items.forEach(function (el) { io.observe(el); });
      }
    });
  }

  /* ---------- parallax simple (data-parallax="0.2") ---------- */
  function initParallax() {
    if (!hasGsap || reduce) return;
    $$('[data-parallax]').forEach(function (el) {
      var k = parseFloat(el.getAttribute('data-parallax')) || 0.15;
      gsap.fromTo(el, { yPercent: -k * 50 }, { yPercent: k * 50, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    var giant = $('[data-footer-giant]');
    if (giant) gsap.fromTo(giant, { yPercent: 40 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: giant, start: 'top bottom', end: 'bottom bottom', scrub: true } });
  }

  /* ---------- botones magnéticos ---------- */
  function initMagnetic() {
    if (!finePointer || reduce || !hasGsap) return;
    $$('[data-magnetic]').forEach(function (b) {
      var qx = gsap.quickTo(b, 'x', { duration: 0.5, ease: 'power3.out' });
      var qy = gsap.quickTo(b, 'y', { duration: 0.5, ease: 'power3.out' });
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        qx((e.clientX - r.left - r.width / 2) * 0.25);
        qy((e.clientY - r.top - r.height / 2) * 0.35);
      });
      b.addEventListener('pointerleave', function () { qx(0); qy(0); });
    });
  }

  /* ---------- header ---------- */
  function initHeader() {
    var h = $('[data-vx-header]');
    if (!h) return;
    var last = window.scrollY;
    var ticking = false;
    var update = function () {
      var y = window.scrollY;
      h.classList.toggle('is-solid', y > 40);
      if (!document.body.classList.contains('vx-lock')) h.classList.toggle('is-hidden', y > last && y > 400);
      last = y; ticking = false;
    };
    window.addEventListener('scroll', function () { if (!ticking) { requestAnimationFrame(update); ticking = true; } }, { passive: true });
    update();

    var nav = $('[data-mobile-nav]');
    var openBtn = $('[data-menu-open]');
    if (nav && openBtn) {
      var close = function () { nav.classList.remove('is-open'); openBtn.setAttribute('aria-expanded', 'false'); document.body.style.overflow = ''; openBtn.focus(); };
      openBtn.addEventListener('click', function () {
        nav.classList.add('is-open'); openBtn.setAttribute('aria-expanded', 'true'); document.body.style.overflow = 'hidden';
        var f = nav.querySelector('a, button'); if (f) setTimeout(function () { f.focus(); }, 50);
      });
      $$('[data-menu-close]', nav).forEach(function (el) { el.addEventListener('click', close); });
      nav.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    }
  }

  /* ---------- anclas suaves con compensación de cabecera ---------- */
  function initAnchors() {
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href*="#"]');
      if (!a) return;
      var url = new URL(a.href, location.href);
      if (url.pathname !== location.pathname || !url.hash || url.hash === '#') return;
      var target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
      if (!target) return;
      e.preventDefault();
      var y = target.getBoundingClientRect().top + window.scrollY - 70;
      window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
      history.replaceState(null, '', url.hash);
    });
  }

  /* ---------- reseñas: filtros, ver más, útil, formulario ---------- */
  function initReviews() {
    $$('[data-reviews]').forEach(function (sec) {
      var cards = $$('.vx-review', sec);
      var chips = $$('[data-filter]', sec);
      var more = $('[data-review-more]', sec);
      var initial = parseInt(sec.getAttribute('data-initial') || '6', 10);
      var shown = initial;
      var filter = 'all';
      var apply = function () {
        var visible = cards.filter(function (c) {
          if (filter === '5') return c.getAttribute('data-rating') === '5';
          if (filter === 'photo') return c.getAttribute('data-photo') === '1';
          return true;
        });
        cards.forEach(function (c) { c.hidden = true; });
        visible.slice(0, shown).forEach(function (c) { c.hidden = false; });
        if (more) more.hidden = visible.length <= shown;
        if (hasGsap) ScrollTrigger.refresh();
      };
      chips.forEach(function (ch) {
        ch.addEventListener('click', function () {
          chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c === ch)); });
          filter = ch.getAttribute('data-filter'); shown = initial; apply();
          if (hasGsap && !reduce) gsap.fromTo(cards.filter(function (c) { return !c.hidden; }), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.04, ease: EASE });
        });
      });
      if (more) more.addEventListener('click', function () {
        var before = cards.filter(function (c) { return !c.hidden; }).length;
        shown += initial; apply();
        var fresh = cards.filter(function (c) { return !c.hidden; }).slice(before);
        if (hasGsap && !reduce) gsap.fromTo(fresh, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.05, ease: EASE });
        if (fresh[0]) { var b = fresh[0].querySelector('button'); if (b) b.focus({ preventScroll: true }); }
      });
      $$('[data-helpful]', sec).forEach(function (b) {
        b.addEventListener('click', function () { var on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', String(on)); });
      });
      apply();

      var dlg = $('[data-review-dialog]', sec);
      var openB = $('[data-review-open]', sec);
      if (dlg && openB && typeof dlg.showModal === 'function') {
        openB.addEventListener('click', function () { dlg.showModal(); });
        $$('[data-review-close]', dlg).forEach(function (b) { b.addEventListener('click', function () { dlg.close(); }); });
        dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
        if (/contact_posted=true/.test(location.search) && $('[data-review-ok]', dlg)) dlg.showModal();
      }
    });
  }

  /* ---------- compra ---------- */
  function initBuy() {
    $$('[data-buy]').forEach(function (sec) {
      var form = $('[data-buy-form]', sec) || $('form[action*="/cart/add"]', sec);
      if (!form) return;
      var variants = [];
      try { variants = JSON.parse($('[data-variants]', sec).textContent); } catch (e) {}
      var idInput = $('[data-variant-id]', form);
      var addBtn = $('[data-add]', form);
      var addLabel = $('[data-add-label]', form);
      var addText = addLabel ? addLabel.textContent : 'Añadir al carrito';
      var nowBtn = $('[data-buy-now]', form);
      var msg = $('[data-buy-msg]', form);
      var priceEl = $('[data-price]', sec);
      var cmpEl = $('[data-compare]', sec);
      var saveEl = $('[data-save]', sec);
      var qty = $('[data-qty-input]', form);
      var stickyPrice = $('[data-sticky-price]');

      /* galería */
      var imgs = $$('.vx-gallery__main img', sec);
      var thumbs = $$('[data-thumb]', sec);
      var gi = 0;
      var show = function (i) {
        if (!imgs.length) return;
        gi = (i + imgs.length) % imgs.length;
        imgs.forEach(function (im, k) { im.classList.toggle('is-active', k === gi); if (k === gi) im.loading = 'eager'; });
        thumbs.forEach(function (t, k) { t.setAttribute('aria-current', String(k === gi)); });
      };
      show(0);
      thumbs.forEach(function (t) { t.addEventListener('click', function () { show(parseInt(t.getAttribute('data-thumb'), 10)); }); });
      var prev = $('[data-gallery-prev]', sec), next = $('[data-gallery-next]', sec);
      if (prev) prev.addEventListener('click', function () { show(gi - 1); });
      if (next) next.addEventListener('click', function () { show(gi + 1); });
      var main = $('.vx-gallery__main', sec);
      if (main) {
        var sx = null;
        main.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
        main.addEventListener('touchend', function (e) { if (sx === null) return; var dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 40) show(gi + (dx < 0 ? 1 : -1)); sx = null; });
      }

      /* variantes */
      var current = function () {
        var sel = $$('fieldset[data-option-index]', form).map(function (fs) {
          var c = fs.querySelector('input:checked'); return c ? c.value : null;
        });
        return variants.find(function (v) { return v.options.every(function (o, i) { return sel[i] === null || o === sel[i]; }); });
      };
      var render = function (v) {
        if (!v) {
          if (addBtn) addBtn.disabled = true; if (nowBtn) nowBtn.disabled = true;
          if (addLabel) addLabel.textContent = 'No disponible';
          return;
        }
        idInput.value = v.id;
        if (priceEl) priceEl.textContent = money(v.price);
        if (stickyPrice) stickyPrice.textContent = money(v.price);
        var onSale = v.compare_at_price && v.compare_at_price > v.price;
        if (cmpEl) { cmpEl.hidden = !onSale; if (onSale) cmpEl.textContent = money(v.compare_at_price); }
        if (saveEl) { saveEl.hidden = !onSale; if (onSale) saveEl.textContent = '-' + Math.round((v.compare_at_price - v.price) * 100 / v.compare_at_price) + ' %'; }
        if (addBtn) addBtn.disabled = !v.available;
        if (nowBtn) nowBtn.disabled = !v.available;
        if (addLabel) addLabel.textContent = v.available ? addText : 'Agotado';
        if (v.featured_media && v.featured_media.position) show(v.featured_media.position - 1);
        v.options.forEach(function (o, i) { var l = $('[data-option-label="' + i + '"]', form); if (l) l.textContent = o; });
        if (priceEl && hasGsap && !reduce) gsap.fromTo(priceEl, { y: 6, autoAlpha: 0.4 }, { y: 0, autoAlpha: 1, duration: 0.35, ease: EASE });
        var url = new URL(location.href);
        if (sec.closest('.template-product')) { url.searchParams.set('variant', v.id); history.replaceState(null, '', url.toString()); }
      };
      $$('input[data-option]', form).forEach(function (r) { r.addEventListener('change', function () { render(current()); }); });
      var initV = current();
      if (initV && initV.featured_media && initV.featured_media.position) show(initV.featured_media.position - 1);

      /* cantidad */
      $$('[data-qty]', form).forEach(function (b) {
        b.addEventListener('click', function () {
          var n = Math.max(1, Math.min(10, (parseInt(qty.value, 10) || 1) + parseInt(b.getAttribute('data-qty'), 10)));
          qty.value = n;
        });
      });

      /* añadir */
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!addBtn || addBtn.disabled) return;
        addBtn.classList.add('is-loading'); addBtn.setAttribute('aria-busy', 'true'); if (msg) msg.textContent = '';
        fetch(window.vxConfig.cartAdd, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ items: [{ id: parseInt(idInput.value, 10), quantity: parseInt(qty.value, 10) || 1 }] })
        }).then(function (r) { return r.json().then(function (j) { if (!r.ok) throw j; return j; }); })
          .then(function () { return Cart.refresh(true); })
          .catch(function (err) { if (msg) msg.textContent = (err && (err.description || err.message)) || 'No se ha podido añadir. Inténtalo de nuevo.'; })
          .then(function () { addBtn.classList.remove('is-loading'); addBtn.removeAttribute('aria-busy'); });
      });
      if (nowBtn) nowBtn.addEventListener('click', function () {
        if (nowBtn.disabled) return;
        nowBtn.classList.add('is-loading');
        location.href = '/cart/' + idInput.value + ':' + (parseInt(qty.value, 10) || 1);
      });

      /* barra flotante */
      var sticky = $('[data-sticky]');
      if (sticky) {
        var heroEl = $('[data-vx-hero]');
        var buyVisible = true, pastHero = false;
        var upd = function () {
          var on = pastHero && !buyVisible;
          sticky.classList.toggle('is-visible', on);
          sticky.setAttribute('aria-hidden', String(!on));
          var b = $('[data-sticky-btn]', sticky); if (b) b.tabIndex = on ? 0 : -1;
        };
        if ('IntersectionObserver' in window) {
          new IntersectionObserver(function (es) { buyVisible = es[0].isIntersecting; upd(); }, { threshold: 0.05 }).observe(sec);
          if (heroEl) new IntersectionObserver(function (es) { pastHero = !es[0].isIntersecting; upd(); }).observe(heroEl);
          else pastHero = true;
        }
      }
    });

    /* fechas de entrega */
    $$('[data-eta]').forEach(function (el) {
      var addBiz = function (d, n) { d = new Date(d); while (n > 0) { d.setDate(d.getDate() + 1); var w = d.getDay(); if (w !== 0 && w !== 6) n--; } return d; };
      var f = function (d) { return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }); };
      var now = new Date();
      var a = addBiz(now, parseInt(el.getAttribute('data-min'), 10) || 8);
      var b = addBiz(now, parseInt(el.getAttribute('data-max'), 10) || 15);
      var out = $('[data-eta-range]', el);
      if (out) out.textContent = f(a) + ' y el ' + f(b);
    });
  }

  /* ---------- carrito lateral ---------- */
  var Cart = {
    el: null, lastFocus: null,
    init: function () {
      this.el = $('[data-drawer]');
      if (!this.el) return;
      var self = this;
      document.addEventListener('click', function (e) {
        var o = e.target.closest('[data-cart-open]');
        if (o) { e.preventDefault(); self.refresh(true); }
        if (e.target.closest('[data-drawer-close]')) self.close();
      });
      this.el.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') self.close();
        if (e.key === 'Tab') {
          var f = $$('a[href], button:not([disabled]), input', self.el.querySelector('.vx-drawer__panel')).filter(function (x) { return x.offsetParent !== null; });
          if (!f.length) return;
          if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
          else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
        }
      });
      this.el.addEventListener('click', function (e) {
        var q = e.target.closest('[data-line-qty]');
        var rm = e.target.closest('[data-line-remove]');
        if (q) self.change(q.getAttribute('data-key'), parseInt(q.getAttribute('data-line-qty'), 10));
        if (rm) self.change(rm.getAttribute('data-key'), 0);
      });
    },
    open: function () {
      if (!this.el || this.el.classList.contains('is-open')) return;
      this.lastFocus = document.activeElement;
      this.el.classList.add('is-open'); this.el.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      var p = this.el.querySelector('.vx-drawer__panel'); setTimeout(function () { p.focus(); }, 60);
    },
    close: function () {
      if (!this.el) return;
      this.el.classList.remove('is-open'); this.el.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      if (this.lastFocus && this.lastFocus.focus) this.lastFocus.focus();
    },
    refresh: function (openAfter) {
      var self = this;
      return fetch(window.vxConfig.cartJs, { headers: { Accept: 'application/json' } })
        .then(function (r) { return r.json(); })
        .then(function (cart) { self.render(cart); if (openAfter) self.open(); return cart; });
    },
    change: function (key, q) {
      var self = this;
      this.el.classList.add('is-busy');
      return fetch(window.vxConfig.cartChange, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ id: key, quantity: Math.max(0, q) })
      }).then(function (r) { return r.json(); })
        .then(function (cart) { self.render(cart); })
        .catch(function () {})
        .then(function () { self.el.classList.remove('is-busy'); });
    },
    render: function (cart) {
      var items = $('[data-drawer-items]', this.el);
      var foot = $('[data-drawer-foot]', this.el);
      var total = $('[data-drawer-total]', this.el);
      $$('[data-cart-count]').forEach(function (c) {
        var before = c.textContent;
        c.textContent = cart.item_count;
        c.classList.toggle('has-items', cart.item_count > 0);
        if (String(before) !== String(cart.item_count)) { c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }
      });
      if (!cart.items.length) {
        items.innerHTML = '<div class="vx-drawer__empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M5 8h14l-1.2 12.1a1 1 0 01-1 .9H7.2a1 1 0 01-1-.9z"/><path d="M9 8V6.5a3 3 0 016 0V8"/></svg><p>Tu carrito está vacío.</p><a class="vx-btn" href="/#comprar" data-drawer-close>Ver Vortix</a></div>';
        foot.hidden = true;
        return;
      }
      foot.hidden = false;
      total.textContent = money(cart.total_price);
      var esc = function (s) { var d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; };
      items.innerHTML = cart.items.map(function (it) {
        var img = it.image ? it.image.replace(/(\.[a-z]+)(\?|$)/i, '_200x$1$2') : '';
        var variant = it.variant_title && it.variant_title !== 'Default Title' ? '<div class="vx-cline__variant">' + esc(it.variant_title) + '</div>' : '<div class="vx-cline__variant"></div>';
        return '<div class="vx-cline">' +
          (img ? '<img src="' + esc(img) + '" alt="" width="76" height="76" loading="lazy">' : '<span></span>') +
          '<div><div class="vx-cline__title">' + esc(it.product_title) + '</div>' + variant +
          '<div class="vx-qty"><button type="button" aria-label="Quitar una unidad" data-key="' + esc(it.key) + '" data-line-qty="' + (it.quantity - 1) + '">−</button>' +
          '<input type="text" readonly value="' + it.quantity + '" aria-label="Cantidad">' +
          '<button type="button" aria-label="Añadir una unidad" data-key="' + esc(it.key) + '" data-line-qty="' + (it.quantity + 1) + '">+</button></div></div>' +
          '<div><div class="vx-cline__price">' + money(it.final_line_price) + '</div><button type="button" class="vx-cline__remove" data-key="' + esc(it.key) + '" data-line-remove>Eliminar</button></div>' +
          '</div>';
      }).join('');
    }
  };

  /* ---------- arranque ---------- */
  function boot() {
    try { initIntro(); } catch (e) { var l = $('.vx-loader'); if (l) l.remove(); }
    [initHeader, initAnchors, initHeroScroll, initReveals, initCounters, initBars, initMarquee, initExpand, initFilm, initPeople, initFeatures, initParallax, initMagnetic, initReviews, initBuy]
      .forEach(function (fn) { try { fn(); } catch (e) { if (window.console) console.warn('[vortix]', fn.name, e); } });
    Cart.init();
    if (hasGsap) {
      window.addEventListener('load', function () { ScrollTrigger.refresh(); });
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  /* editor de Shopify: reinicia al recargar secciones */
  document.addEventListener('shopify:section:load', function () { if (hasGsap) { ScrollTrigger.getAll().forEach(function (t) { t.kill(); }); } boot(); });
})();
