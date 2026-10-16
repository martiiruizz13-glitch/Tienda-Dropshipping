/* VORTIX — interacciones y animaciones (GSAP + ScrollTrigger)
   Principios: solo se animan transform/opacity/clip-path, curvas de salida
   rápidas para la interfaz, todo interrumpible y desactivado si el sistema
   pide menos movimiento. Sin JS o sin GSAP, la página se ve completa. */
(function () {
  'use strict';
  var html = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- Dinero ---------- */
  function money(cents) {
    var fmt = document.body.getAttribute('data-money') || '{{amount_with_comma_separator}} €';
    var n = (cents / 100);
    var withDot = n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    var withComma = n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return fmt.replace(/\{\{\s*(\w+)\s*\}\}/, function (_, k) {
      if (k === 'amount_no_decimals') return Math.round(n).toString();
      if (k === 'amount_with_comma_separator') return withComma;
      if (k === 'amount_no_decimals_with_comma_separator') return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      return withDot;
    });
  }

  /* ---------- Aviso ---------- */
  var toastTimer;
  function toast(msg) {
    var t = $('.vx-toast');
    if (!t) return;
    t.innerHTML = msg;
    t.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('is-on'); }, 3200);
  }

  /* ---------- Compra ---------- */
  function initBuy() {
    var box = $('[data-vx-form]');
    if (!box) return;
    var variants = [];
    try { variants = JSON.parse($('[data-vx-variants]', box).textContent); } catch (e) {}
    var form = $('form', box);
    var idInput = $('[data-vx-id]', box);
    var addBtn = $('[data-vx-add]', box);
    var qty = $('[data-vx-qty]', box);
    var main = $('[data-vx-main]');
    var stickyImg = $('[data-vx-sticky-img]');

    function swapMain(src) {
      if (!main || !src) return;
      var cur = $('img', main);
      if (cur && cur.getAttribute('src') === src) return;
      var img = new Image();
      img.alt = cur ? cur.alt : '';
      img.src = src;
      img.decode().catch(function () {}).then(function () {
        if (cur) {
          cur.classList.add('is-leaving');
          setTimeout(function () { cur.remove(); }, 380);
        }
        main.appendChild(img);
      });
      $$('[data-vx-thumb]').forEach(function (t) { t.setAttribute('aria-current', t.getAttribute('data-src') === src ? 'true' : 'false'); });
    }

    function select(id, scroll) {
      var v = variants.filter(function (x) { return String(x.id) === String(id); })[0];
      if (!v) return;
      idInput.value = v.id;
      $$('[data-vx-pill]', box).forEach(function (p) { p.checked = String(p.value) === String(v.id); });
      $$('[data-vx-price]').forEach(function (el) { el.textContent = money(v.price); });
      $$('[data-vx-variant-name]').forEach(function (el) { el.textContent = v.title; });
      var label = addBtn.getAttribute('data-label');
      addBtn.disabled = !v.available;
      $('.vx-btn__label', addBtn).firstChild.nodeValue = v.available ? label : 'Agotado';
      if (v.media) {
        swapMain(v.media.src);
        if (stickyImg) stickyImg.src = v.media.thumb;
      }
      if (scroll) {
        var target = document.getElementById('comprar');
        if (target) target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      }
    }

    $$('[data-vx-pill]', box).forEach(function (p) {
      p.addEventListener('change', function () { select(p.value); });
    });
    $$('[data-vx-thumb]').forEach(function (t) {
      t.addEventListener('click', function () { swapMain(t.getAttribute('data-src')); });
    });
    $$('[data-vx-pick]').forEach(function (b) {
      b.addEventListener('click', function () { select(b.getAttribute('data-vx-pick'), true); });
    });
    $$('[data-vx-step]', box).forEach(function (b) {
      b.addEventListener('click', function () {
        var n = Math.max(1, Math.min(10, (parseInt(qty.value, 10) || 1) + parseInt(b.getAttribute('data-vx-step'), 10)));
        qty.value = n;
      });
    });

    function add() {
      if (addBtn.disabled || addBtn.classList.contains('is-loading')) return;
      addBtn.classList.add('is-loading');
      addBtn.setAttribute('aria-busy', 'true');
      var root = document.body.getAttribute('data-root') || '/';
      fetch(root + 'cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ items: [{ id: Number(idInput.value), quantity: parseInt(qty.value, 10) || 1 }] })
      })
        .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw j; return j; }); })
        .then(function () { return fetch(root + 'cart.js').then(function (r) { return r.json(); }); })
        .then(function (cart) {
          $$('[data-vx-count]').forEach(function (c) {
            c.textContent = cart.item_count;
            c.setAttribute('data-count', cart.item_count);
            c.classList.remove('is-bump'); void c.offsetWidth; c.classList.add('is-bump');
          });
          addBtn.classList.remove('is-loading');
          addBtn.classList.add('is-done');
          toast('Añadido a tu cesta · <a href="' + root + 'cart">Ver cesta</a>');
          setTimeout(function () { addBtn.classList.remove('is-done'); }, 1800);
        })
        .catch(function (err) {
          addBtn.classList.remove('is-loading');
          toast((err && err.description) ? err.description : 'No se ha podido añadir. Inténtalo de nuevo.');
        })
        .then(function () { addBtn.removeAttribute('aria-busy'); });
    }
    form.addEventListener('submit', function (e) { e.preventDefault(); add(); });
    var stickyAdd = $('[data-vx-sticky-add]');
    if (stickyAdd) stickyAdd.addEventListener('click', add);

    /* Barra fija: aparece cuando el bloque de compra queda atrás o aún no ha llegado tras la portada */
    var sticky = $('[data-vx-sticky]');
    var hero = $('[data-vx-hero]');
    if (sticky && 'IntersectionObserver' in window) {
      var heroOut = false, buyIn = false;
      var update = function () {
        var on = heroOut && !buyIn;
        sticky.classList.toggle('is-visible', on);
        sticky.setAttribute('aria-hidden', on ? 'false' : 'true');
        stickyAdd.tabIndex = on ? 0 : -1;
      };
      if (hero) new IntersectionObserver(function (e) { heroOut = !e[0].isIntersecting; update(); }).observe(hero);
      new IntersectionObserver(function (e) { buyIn = e[0].isIntersecting; update(); }, { threshold: 0.15 }).observe(box);
    }
  }

  /* ---------- Menú que se esconde al bajar ---------- */
  function initNav() {
    var nav = $('[data-vx-nav]');
    if (!nav) return;
    var last = window.scrollY, ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var y = window.scrollY;
        nav.classList.toggle('is-hidden', y > last && y > 400);
        last = y;
        ticking = false;
      });
    }, { passive: true });
  }

  /* ---------- Vídeo: solo se reproduce cuando se ve ---------- */
  function initVideo() {
    $$('[data-vx-video-frame]').forEach(function (frame) {
      var video = $('video', frame);
      if (!video) return;
      var toggle = $('[data-vx-video-toggle]', frame);
      var userPaused = false;
      if (reduce) { userPaused = true; if (toggle) toggle.setAttribute('aria-pressed', 'false'); }
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (e) {
          if (e[0].isIntersecting && !userPaused) video.play().catch(function () {});
          else video.pause();
        }, { threshold: 0.25 }).observe(frame);
      }
      if (toggle) toggle.addEventListener('click', function () {
        if (video.paused) { userPaused = false; video.play().catch(function () {}); toggle.setAttribute('aria-pressed', 'true'); }
        else { userPaused = true; video.pause(); toggle.setAttribute('aria-pressed', 'false'); }
      });
    });
  }

  /* ---------- Historia: paso activo con IntersectionObserver ---------- */
  function initStory() {
    $$('[data-vx-story]').forEach(function (sec) {
      var steps = $$('[data-vx-step]', sec);
      var imgs = $$('.vx-story__visual img', sec);
      var now = $('[data-vx-story-now]', sec);
      if (!steps.length || !('IntersectionObserver' in window)) return;
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          var i = steps.indexOf(en.target);
          steps.forEach(function (s, k) { s.classList.toggle('is-active', k === i); });
          imgs.forEach(function (im, k) { im.classList.toggle('is-active', k === i); });
          if (now) now.textContent = ('0' + (i + 1)).slice(-2);
        });
      }, { rootMargin: '-45% 0px -45% 0px' });
      steps.forEach(function (s) { io.observe(s); });
    });
  }

  /* ---------- Animaciones con GSAP ---------- */
  function initMotion() {
    var gsap = window.gsap, ST = window.ScrollTrigger;
    if (!gsap || !ST) return false;
    gsap.registerPlugin(ST);
    gsap.defaults({ ease: 'expo.out', duration: 1 });

    var loader = $('[data-vx-loader]');
    var seen = html.classList.contains('vx-seen');
    var intro = gsap.timeline({ paused: true });

    /* Entrada de la portada */
    var heroLines = $$('.vx-hero .vx-line > span');
    var product = $('[data-vx-product]');
    intro
      .to(heroLines, { yPercent: 0, y: 0, duration: 1.1, stagger: 0.09 }, 0)
      .fromTo(product, { opacity: 0, scale: 0.86, y: 60, filter: 'blur(14px)' }, { opacity: 1, scale: 1, y: 0, filter: 'blur(0px)', duration: 1.5 }, 0)
      .fromTo('.vx-hero [data-vx-float]', { opacity: 0, scale: 0.9, y: 16 }, { opacity: 1, scale: 1, y: 0, duration: 0.9, stagger: 0.12 }, 0.55)
      .fromTo('.vx-hero__foot [data-hero-in]', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.9, stagger: 0.07 }, 0.25)
      .fromTo('[data-vx-bigword]', { opacity: 0, scale: 1.08 }, { opacity: 1, scale: 1, duration: 1.8 }, 0);
    gsap.set(heroLines, { yPercent: 110, y: 0 });

    if (loader && !seen) {
      var letters = $$('.vx-loader__word span', loader);
      gsap.set(letters, { yPercent: 110 });
      gsap.timeline({ onComplete: function () { loader.remove(); try { sessionStorage.setItem('vx-seen', '1'); } catch (e) {} } })
        .to(letters, { yPercent: 0, duration: 0.8, stagger: 0.05, ease: 'expo.out' })
        .to('.vx-loader__bar i', { scaleX: 1, duration: 0.7, ease: 'power2.inOut' }, 0.15)
        .to(letters, { yPercent: -110, duration: 0.6, stagger: 0.03, ease: 'expo.in' }, 0.95)
        .to(loader, { clipPath: 'inset(0 0 100% 0)', duration: 0.8, ease: 'expo.inOut' }, 1.25)
        .add(function () { intro.play(); }, 1.45);
    } else {
      if (loader) loader.remove();
      intro.play();
    }

    /* Portada al hacer scroll: el producto crece y la palabra se desliza */
    var hero = $('[data-vx-hero]');
    if (hero) {
      var tlHero = gsap.timeline({ scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.6 } });
      tlHero
        .to('.vx-hero__stage', { yPercent: -18, scale: 1.22, ease: 'none' }, 0)
        .to('[data-vx-bigword]', { xPercent: -18, ease: 'none' }, 0)
        .to('.vx-hero__foot', { yPercent: 30, opacity: 0, ease: 'none' }, 0);
    }

    /* Inclinación 3D con el ratón (solo ratón, con quickTo para no saturar) */
    if (product && fine) {
      var rx = gsap.quickTo(product, 'rotationX', { duration: 0.8, ease: 'power3.out' });
      var ry = gsap.quickTo(product, 'rotationY', { duration: 0.8, ease: 'power3.out' });
      var floats = $$('[data-vx-float]').map(function (f) {
        return { x: gsap.quickTo(f, 'x', { duration: 1, ease: 'power3.out' }), y: gsap.quickTo(f, 'y', { duration: 1, ease: 'power3.out' }), d: parseFloat(f.getAttribute('data-vx-float')) || 1 };
      });
      gsap.set(product, { transformPerspective: 900 });
      hero.addEventListener('pointermove', function (e) {
        var px = e.clientX / window.innerWidth - 0.5, py = e.clientY / window.innerHeight - 0.5;
        ry(px * 14); rx(-py * 10);
        floats.forEach(function (f) { f.x(px * 30 * f.d); f.y(py * 20 * f.d); });
      });
      hero.addEventListener('pointerleave', function () { rx(0); ry(0); floats.forEach(function (f) { f.x(0); f.y(0); }); });
    }

    /* Imagen que se expande: de tarjeta redondeada a pantalla completa */
    $$('[data-vx-expand]').forEach(function (sec) {
      var stage = $('[data-vx-expand-stage]', sec);
      var media = $('[data-vx-expand-media]', sec);
      var img = $('img', media);
      var cap = $('[data-vx-expand-caption]', sec);
      var mm = gsap.matchMedia();
      mm.add({ desk: '(min-width: 761px)', mob: '(max-width: 760px)' }, function (ctx) {
        var start = ctx.conditions.desk ? 'inset(16% 22% 16% 22% round 32px)' : 'inset(18% 6% 18% 6% round 24px)';
        var tl = gsap.timeline({ scrollTrigger: { trigger: stage, start: 'top top', end: '+=120%', scrub: 0.8, pin: true, anticipatePin: 1 } });
        tl.fromTo(media, { clipPath: start }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none' }, 0)
          .fromTo(img, { scale: 1.35 }, { scale: 1, ease: 'none' }, 0)
          .fromTo(cap, { opacity: 0, y: 40 }, { opacity: 1, y: 0, ease: 'power2.out', duration: 0.35 }, 0.62);
      });
    });

    /* Cifras: barras y contadores */
    $$('[data-vx-stats]').forEach(function (sec) {
      ST.create({
        trigger: sec, start: 'top 70%', once: true,
        onEnter: function () {
          $$('.vx-bar i', sec).forEach(function (b, i) {
            var v = parseFloat(getComputedStyle(b).getPropertyValue('--v')) || 1;
            gsap.fromTo(b, { scaleX: 0 }, { scaleX: v, duration: 1.6, delay: 0.15 + i * 0.1, ease: 'expo.out' });
          });
          $$('[data-vx-count-to]', sec).forEach(function (el, i) {
            var end = parseFloat(el.getAttribute('data-vx-count-to')) || 0;
            var o = { n: 0 };
            gsap.to(o, { n: end, duration: 1.8, delay: 0.15 + i * 0.1, ease: 'expo.out', onUpdate: function () { el.textContent = Math.round(o.n).toLocaleString('es-ES'); } });
          });
        }
      });
    });

    /* Colores: scroll horizontal fijado (escritorio) con parallax interno */
    $$('[data-vx-colors]').forEach(function (sec) {
      var track = $('[data-vx-colors-track]', sec);
      var viewport = $('[data-vx-colors-viewport]', sec);
      var mm = gsap.matchMedia();
      mm.add('(min-width: 761px)', function () {
        var dist = function () { return Math.max(0, track.scrollWidth - viewport.clientWidth); };
        var tween = gsap.to(track, { x: function () { return -dist(); }, ease: 'none', scrollTrigger: { trigger: viewport, start: 'center center', end: function () { return '+=' + dist(); }, scrub: 0.8, pin: sec, invalidateOnRefresh: true, anticipatePin: 1 } });
        $$('.vx-color__media img', track).forEach(function (im) {
          gsap.fromTo(im, { xPercent: -6 }, { xPercent: 6, ease: 'none', scrollTrigger: { trigger: im.parentNode, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } });
        });
      });
    });

    /* Parallax suave en imágenes marcadas */
    $$('[data-vx-parallax]').forEach(function (el) {
      var k = parseFloat(el.getAttribute('data-vx-parallax')) || 0.1;
      gsap.fromTo(el, { yPercent: -k * 50 }, { yPercent: k * 50, ease: 'none', scrollTrigger: { trigger: el.parentNode, start: 'top bottom', end: 'bottom top', scrub: true } });
    });

    /* Vídeo: entra creciendo */
    $$('[data-vx-video-frame]').forEach(function (f) {
      gsap.fromTo(f, { scale: 0.88, borderRadius: 48 }, { scale: 1, borderRadius: 32, ease: 'none', scrollTrigger: { trigger: f, start: 'top bottom', end: 'center center', scrub: 0.6 } });
    });

    /* Llamada final: letras que suben escalonadas */
    $$('[data-vx-cta-word]').forEach(function (w) {
      gsap.fromTo($$('span', w), { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, stagger: 0.05, ease: 'none', scrollTrigger: { trigger: w, start: 'top 95%', end: 'top 45%', scrub: 0.6 } });
    });

    /* Revelado general en lote (barato: un solo ScrollTrigger por lote) */
    ST.batch('[data-vx-reveal]', {
      start: 'top 88%', once: true,
      onEnter: function (els) { gsap.to(els, { opacity: 1, y: 0, duration: 1, stagger: 0.08, ease: 'expo.out', overwrite: true }); }
    });

    /* Botones magnéticos */
    if (fine) {
      $$('[data-vx-magnetic]').forEach(function (b) {
        var bx = gsap.quickTo(b, 'x', { duration: 0.5, ease: 'power3.out' });
        var by = gsap.quickTo(b, 'y', { duration: 0.5, ease: 'power3.out' });
        b.addEventListener('pointermove', function (e) {
          var r = b.getBoundingClientRect();
          bx((e.clientX - r.left - r.width / 2) * 0.25);
          by((e.clientY - r.top - r.height / 2) * 0.35);
        });
        b.addEventListener('pointerleave', function () { bx(0); by(0); });
      });
    }

    /* Anclas internas con desplazamiento suave */
    $$('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href').slice(1);
        var t = id && document.getElementById(id);
        if (!t) return;
        e.preventDefault();
        t.scrollIntoView({ behavior: 'smooth', block: 'start' });
        history.replaceState(null, '', '#' + id);
      });
    });

    window.addEventListener('load', function () { ST.refresh(); });
    return true;
  }

  function showAll() {
    html.classList.add('vx-fallback');
    var l = $('[data-vx-loader]');
    if (l) l.remove();
  }

  function boot() {
    initNav();
    initBuy();
    initVideo();
    initStory();
    var ok = false;
    if (!reduce) {
      try { ok = initMotion(); } catch (e) { ok = false; }
    }
    if (!ok) showAll();
    window.__vxReady = true;
  }

  /* Editor de Shopify: al recargar una sección, refrescar */
  document.addEventListener('shopify:section:load', function () {
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
    initStory();
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
