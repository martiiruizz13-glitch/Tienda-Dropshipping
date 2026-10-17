/* ==========================================================================
   VORTIX WOW — interacción, carrito y animaciones
   - Variantes sincronizadas en toda la página (hero, colores, compra, barra).
   - Carrito real con la Cart API de Shopify (/cart/add.js, /cart/change.js).
   - GSAP 3.12 + ScrollTrigger con gsap.matchMedia() para escritorio,
     móvil y movimiento reducido.
   ========================================================================== */
(function () {
  'use strict';

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
  var cfg = window.vwConfig || {};
  var root = document.documentElement;
  var designMode = !!(window.Shopify && window.Shopify.designMode);
  var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- Utilidades ---------- */
  function formatMoney(cents, format) {
    if (typeof cents === 'string') cents = cents.replace('.', '');
    cents = parseInt(cents, 10) || 0;
    format = format || cfg.moneyFormat || '{{amount}} €';
    var re = /\{\{\s*(\w+)\s*\}\}/;
    function delim(n, precision, thousands, decimal) {
      var parts = (n / 100).toFixed(precision).split('.');
      return parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousands) + (parts[1] ? decimal + parts[1] : '');
    }
    var m = format.match(re);
    if (!m) return format;
    var value;
    switch (m[1]) {
      case 'amount_no_decimals': value = delim(cents, 0, ',', '.'); break;
      case 'amount_with_comma_separator': value = delim(cents, 2, '.', ','); break;
      case 'amount_no_decimals_with_comma_separator': value = delim(cents, 0, '.', ','); break;
      case 'amount_with_apostrophe_separator': value = delim(cents, 2, "'", '.'); break;
      case 'amount_with_space_separator': value = delim(cents, 2, ' ', ','); break;
      default: value = delim(cents, 2, ',', '.');
    }
    return format.replace(re, value);
  }
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function sizedImage(url, width) {
    if (!url) return '';
    if (url.indexOf('//') === 0) url = 'https:' + url;
    return url + (url.indexOf('?') > -1 ? '&' : '?') + 'width=' + width;
  }
  function readJSON(id) {
    var el = document.getElementById(id);
    if (!el) return null;
    try { return JSON.parse(el.textContent); } catch (e) { return null; }
  }
  function hexToRgba(hex, a) {
    hex = String(hex || '').trim().replace('#', '');
    if (hex.length === 3) hex = hex.replace(/(.)/g, '$1$1');
    var n = parseInt(hex.slice(0, 6), 16);
    if (isNaN(n)) return 'rgba(215,255,58,' + a + ')';
    return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  /* Divide un titular en palabras con máscara (sin plugins de pago).
     Respeta las etiquetas internas (<em>, <span class="vw-line">). */
  function splitWords(el) {
    if (el._vwWords) return el._vwWords;
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (node) {
      var parts = node.textContent.split(/(\s+)/);
      if (parts.length === 1 && !parts[0].trim()) return;
      var frag = document.createDocumentFragment();
      parts.forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
        var outer = document.createElement('span');
        outer.className = 'vw-w';
        var inner = document.createElement('span');
        inner.className = 'vw-wi';
        inner.textContent = part;
        outer.appendChild(inner);
        frag.appendChild(outer);
      });
      node.parentNode.replaceChild(frag, node);
    });
    el._vwWords = $$('.vw-wi', el);
    return el._vwWords;
  }
  function setHTMLAll(sel, html) { $$(sel).forEach(function (el) { el.innerHTML = html; }); }

  function trapFocus(container, e) {
    if (e.key !== 'Tab') return;
    var f = $$('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])', container)
      .filter(function (el) { return el.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* ======================================================================
     PRODUCTO Y VARIANTES
     ====================================================================== */
  var product = readJSON('vw-product');
  var tints = readJSON('vw-tints') || {};
  var currentVariant = null;

  function findVariant(id) {
    if (!product) return null;
    id = Number(id);
    for (var i = 0; i < product.variants.length; i++) if (product.variants[i].id === id) return product.variants[i];
    return null;
  }
  function variantFromOptions(values) {
    if (!product) return null;
    return product.variants.find(function (v) {
      return values.every(function (val, i) { return v.options[i] === val; });
    }) || null;
  }

  function applyTint(color) {
    if (!color) return;
    if (window.gsap && !reduceMQ.matches) {
      gsap.to(root, { '--vw-tint': color, duration: 0.8, ease: 'power2.out', overwrite: 'auto' });
    } else {
      root.style.setProperty('--vw-tint', color);
    }
  }

  function setVariant(id, opts) {
    var v = findVariant(id);
    if (!v) return;
    opts = opts || {};
    currentVariant = v;

    applyTint(tints[v.id]);

    // Hero: foto del color, puntos y nombre
    $$('[data-variant-img]').forEach(function (shot) {
      var active = Number(shot.getAttribute('data-variant-img')) === v.id;
      var img = $('img', shot);
      if (active && img && img.loading === 'lazy') img.loading = 'eager';
      shot.classList.toggle('is-active', active);
    });
    $$('[data-pick-variant].vw-dot').forEach(function (b) {
      b.setAttribute('aria-pressed', Number(b.getAttribute('data-pick-variant')) === v.id ? 'true' : 'false');
    });
    $$('[data-variant-name]').forEach(function (el) { el.textContent = v.title; });

    // Precio
    var price = formatMoney(v.price);
    setHTMLAll('[data-live-price]', price);
    setHTMLAll('[data-price]', price);
    $$('[data-compare]').forEach(function (el) {
      var show = v.compare_at_price && v.compare_at_price > v.price;
      el.hidden = !show;
      if (show) el.innerHTML = formatMoney(v.compare_at_price);
    });

    // Formulario de compra
    $$('[data-variant-input]').forEach(function (input) { input.value = v.id; });
    v.options.forEach(function (val, i) {
      $$('input[data-option="' + i + '"]').forEach(function (r) { r.checked = r.value === val; });
      $$('[data-option-label="' + i + '"]').forEach(function (l) { l.textContent = val; });
    });
    $$('[data-add], [data-sticky-add]').forEach(function (btn) {
      btn.disabled = !v.available;
      var label = $('[data-add-label]', btn);
      if (!label) return;
      if (!btn.dataset.label) btn.dataset.label = label.textContent;
      label.textContent = v.available ? btn.dataset.label : 'Agotado';
    });

    // Tarjetas de color
    $$('[data-color-card]').forEach(function (card) {
      card.classList.toggle('is-current', Number(card.getAttribute('data-color-card')) === v.id);
    });

    // Barra fija: miniatura
    var sImg = $('.vw-sticky__thumb img');
    if (sImg && v.featured_image && v.featured_image.src) {
      sImg.src = sizedImage(v.featured_image.src, 120);
      sImg.removeAttribute('srcset');
    }

    // Galería: ir a la foto de la variante
    if (v.featured_media && opts.source !== 'gallery') gallery.goToMedia(v.featured_media.id, opts.instant);

    // URL compartible
    if (!opts.silentUrl && window.history && history.replaceState) {
      var url = new URL(window.location.href);
      url.searchParams.set('variant', v.id);
      history.replaceState({}, '', url.toString());
    }
  }

  document.addEventListener('click', function (e) {
    var picker = e.target.closest('[data-pick-variant]');
    if (!picker) return;
    setVariant(picker.getAttribute('data-pick-variant'), { source: 'picker' });
  });

  document.addEventListener('change', function (e) {
    var r = e.target.closest('input[data-option]');
    if (!r || !product) return;
    var form = r.closest('form');
    var values = product.options.map(function (_, i) {
      var checked = $('input[data-option="' + i + '"]:checked', form);
      return checked ? checked.value : null;
    });
    var v = variantFromOptions(values);
    if (v) setVariant(v.id, { source: 'options' });
  });

  /* ======================================================================
     GALERÍA (scroll-snap nativo, ideal para el pulgar en móvil)
     ====================================================================== */
  var gallery = (function () {
    var wrap = $('[data-gallery]');
    var api = { goToMedia: function () {} };
    if (!wrap) return api;
    var track = $('[data-gallery-track]', wrap);
    var slides = $$('.vw-gallery__slide', track);
    var thumbs = $$('[data-thumb]', wrap);
    var counter = $('[data-gallery-index]', wrap);
    var index = 0;

    function go(i, instant) {
      i = Math.max(0, Math.min(slides.length - 1, i));
      track.scrollTo({ left: slides[i].offsetLeft - track.offsetLeft, behavior: instant || reduceMQ.matches ? 'auto' : 'smooth' });
    }
    function update() {
      var i = Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
      if (i === index) return;
      index = i;
      if (counter) counter.textContent = String(i + 1).padStart(2, '0');
      thumbs.forEach(function (t, n) { t.setAttribute('aria-current', n === i ? 'true' : 'false'); });
    }
    var ticking = false;
    track.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { update(); ticking = false; });
    }, { passive: true });
    thumbs.forEach(function (t) { t.addEventListener('click', function () { go(Number(t.dataset.thumb)); }); });
    var prev = $('[data-gallery-prev]', wrap), next = $('[data-gallery-next]', wrap);
    if (prev) prev.addEventListener('click', function () { go(index - 1); });
    if (next) next.addEventListener('click', function () { go(index + 1); });
    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(index + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(index - 1); }
    });

    api.goToMedia = function (mediaId, instant) {
      var i = slides.findIndex(function (s) { return Number(s.dataset.mediaId) === Number(mediaId); });
      if (i > -1) go(i, instant);
    };
    return api;
  })();

  /* ---------- Cantidad ---------- */
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-qty]');
    if (!b) return;
    var input = $('[data-qty-input]', b.closest('.vw-qty'));
    if (!input) return;
    var n = Math.max(1, Math.min(Number(input.max) || 99, (Number(input.value) || 1) + Number(b.dataset.qty)));
    input.value = n;
  });

  /* ======================================================================
     CARRITO (Cart API real de Shopify)
     ====================================================================== */
  var cart = (function () {
    var el = $('[data-cart]');
    var panel = el && $('.vw-cart__panel', el);
    var list = el && $('[data-cart-items]', el);
    var foot = el && $('[data-cart-foot]', el);
    var lastFocus = null;

    function updateCount(count) {
      $$('[data-cart-count]').forEach(function (c) { c.textContent = count; c.hidden = count === 0; });
      var label = el && $('[data-cart-count-label]', el);
      if (label) label.textContent = count ? '(' + count + ')' : '';
    }

    function render(state) {
      if (!el) return;
      updateCount(state.item_count);
      $('[data-cart-total]', el).innerHTML = formatMoney(state.total_price);
      foot.hidden = state.item_count === 0;
      if (!state.items.length) {
        list.innerHTML = '<div class="vw-cart__empty"><p>Tu carrito está vacío.</p>' +
          '<a class="vw-btn vw-btn--accent" href="#comprar" data-cart-close>Ver el producto</a></div>';
        return;
      }
      list.innerHTML = state.items.map(function (it, i) {
        var line = i + 1;
        var variant = it.variant_title && it.variant_title !== 'Default Title' ? '<p class="vw-line-item__variant">' + escapeHtml(it.variant_title) + '</p>' : '';
        return '<div class="vw-line-item">' +
          '<div class="vw-line-item__img">' + (it.image ? '<img src="' + sizedImage(it.image, 200) + '" alt="" width="84" height="84" loading="lazy">' : '') + '</div>' +
          '<div><p class="vw-line-item__title">' + escapeHtml(it.product_title) + '</p>' + variant +
          '<div class="vw-line-item__row">' +
            '<div class="vw-qty">' +
              '<button type="button" aria-label="Quitar una unidad" data-line="' + line + '" data-line-qty="' + (it.quantity - 1) + '"><svg class="vw-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg></button>' +
              '<span aria-label="Cantidad" style="min-width:22px;text-align:center;font-weight:600">' + it.quantity + '</span>' +
              '<button type="button" aria-label="Añadir una unidad" data-line="' + line + '" data-line-qty="' + (it.quantity + 1) + '"><svg class="vw-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button>' +
            '</div>' +
            '<span class="vw-line-item__price">' + formatMoney(it.final_line_price) + '</span>' +
          '</div>' +
          '<button type="button" class="vw-line-item__remove" data-line="' + line + '" data-line-qty="0">Eliminar</button>' +
          '</div></div>';
      }).join('');
    }

    function fetchCart() {
      return fetch(cfg.cartJs || '/cart.js', { headers: { Accept: 'application/json' } }).then(function (r) { return r.json(); });
    }
    function refresh() { return fetchCart().then(function (s) { render(s); return s; }); }

    function open() {
      if (!el) { window.location.href = '/cart'; return; }
      lastFocus = document.activeElement;
      el.classList.add('is-open');
      el.setAttribute('aria-hidden', 'false');
      document.body.classList.add('vw-locked');
      setTimeout(function () { panel.focus(); }, 60);
    }
    function close() {
      if (!el) return;
      el.classList.remove('is-open');
      el.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('vw-locked');
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    function add(items) {
      return fetch(cfg.cartAdd || '/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ items: items })
      }).then(function (r) {
        return r.json().then(function (data) {
          if (!r.ok || data.status) throw new Error(data.description || data.message || 'No se pudo añadir al carrito.');
          return data;
        });
      }).then(refresh).then(function () { open(); });
    }

    function change(line, qty) {
      el.classList.add('is-busy');
      return fetch(cfg.cartChange || '/cart/change.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ line: line, quantity: qty })
      }).then(function (r) { return r.json(); })
        .then(render)
        .catch(function () {})
        .then(function () {
          el.classList.remove('is-busy');
          if (!panel.contains(document.activeElement)) panel.focus();
        });
    }

    if (el) {
      el.addEventListener('click', function (e) {
        var l = e.target.closest('[data-line]');
        if (l) change(Number(l.dataset.line), Math.max(0, Number(l.dataset.lineQty)));
        if (e.target.closest('[data-cart-close]')) close();
      });
      document.addEventListener('keydown', function (e) {
        if (!el.classList.contains('is-open')) return;
        if (e.key === 'Escape') close();
        else trapFocus(panel, e);
      });
      refresh().catch(function () {});
    }
    document.addEventListener('click', function (e) {
      var opener = e.target.closest('[data-cart-open]');
      if (!opener || !el) return;
      e.preventDefault();
      refresh().catch(function () {});
      open();
    });

    return { add: add, open: open, close: close };
  })();

  function withLoading(btn, promise, msgEl) {
    if (btn) { btn.classList.add('is-loading'); btn.disabled = true; btn.setAttribute('aria-busy', 'true'); }
    if (msgEl) msgEl.textContent = '';
    return promise.catch(function (err) {
      if (msgEl) msgEl.textContent = err.message;
      else window.alert(err.message);
    }).then(function () {
      if (btn) {
        btn.classList.remove('is-loading');
        btn.removeAttribute('aria-busy');
        btn.disabled = currentVariant ? !currentVariant.available : false;
      }
    });
  }

  $$('[data-buy-form]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      if (!window.fetch) return; // envío normal del formulario
      e.preventDefault();
      var id = Number($('[data-variant-input]', form).value);
      var qty = Math.max(1, Number(($('[data-qty-input]', form) || {}).value) || 1);
      withLoading($('[data-add]', form), cart.add([{ id: id, quantity: qty }]), $('[data-buy-msg]', form));
    });
  });

  var stickyAdd = $('[data-sticky-add]');
  if (stickyAdd) {
    stickyAdd.addEventListener('click', function () {
      var v = currentVariant || (product && product.variants[0]);
      if (!v) return;
      withLoading(stickyAdd, cart.add([{ id: v.id, quantity: 1 }]));
    });
  }

  /* ======================================================================
     CABECERA Y MENÚ
     ====================================================================== */
  (function () {
    var header = $('[data-header]');
    if (!header) return;
    var toggle = $('[data-menu-toggle]', header);
    var menu = $('[data-menu]', header);
    var lastY = window.scrollY;
    var ticking = false;

    function onScroll() {
      var y = window.scrollY;
      header.classList.toggle('is-scrolled', y > 24);
      var goingDown = y > lastY + 4;
      var goingUp = y < lastY - 4;
      if (!header.classList.contains('is-open')) {
        if (goingDown && y > window.innerHeight * 0.8) header.classList.add('is-hidden');
        else if (goingUp || y < 80) header.classList.remove('is-hidden');
      }
      lastY = y;
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
    }, { passive: true });
    onScroll();

    function setMenu(open) {
      if (!menu || !toggle) return;
      header.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      $('.vw-sr', toggle).textContent = open ? 'Cerrar menú' : 'Abrir menú';
      menu.hidden = !open;
      document.body.classList.toggle('vw-locked', open);
      if (open) {
        var links = $$('a', menu);
        if (window.gsap && !reduceMQ.matches) {
          gsap.fromTo(links, { y: 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.6, stagger: 0.05, ease: 'power3.out' });
        }
        if (links[0]) links[0].focus();
      }
    }
    if (toggle) toggle.addEventListener('click', function () { setMenu(!header.classList.contains('is-open')); });
    if (menu) {
      menu.addEventListener('click', function (e) { if (e.target.closest('[data-menu-link]')) setMenu(false); });
      header.addEventListener('keydown', function (e) {
        if (!header.classList.contains('is-open')) return;
        if (e.key === 'Escape') { setMenu(false); toggle.focus(); }
        trapFocus(header, e);
      });
    }
  })();

  /* ======================================================================
     COLORES: carril con fondo que cambia al color visible
     ====================================================================== */
  (function () {
    var sec = $('[data-colors]');
    if (!sec) return;
    var rail = $('[data-colors-rail]', sec);
    var cards = $$('[data-color-card]', rail);
    var progress = $('[data-colors-progress]', sec);
    var bg = $('[data-colors-bg]', sec);

    function step(dir) {
      var w = cards[0] ? cards[0].getBoundingClientRect().width + 14 : rail.clientWidth * 0.8;
      rail.scrollBy({ left: dir * w, behavior: reduceMQ.matches ? 'auto' : 'smooth' });
    }
    var prev = $('[data-colors-prev]', sec), next = $('[data-colors-next]', sec);
    if (prev) prev.addEventListener('click', function () { step(-1); });
    if (next) next.addEventListener('click', function () { step(1); });

    var ticking = false;
    function onRail() {
      var max = rail.scrollWidth - rail.clientWidth;
      var p = max > 0 ? rail.scrollLeft / max : 1;
      if (progress) progress.style.transform = 'scaleX(' + (0.15 + p * 0.85).toFixed(3) + ')';
      // El fondo adopta el color de la tarjeta más cercana al borde izquierdo
      var left = rail.getBoundingClientRect().left;
      var best = null, bestD = Infinity;
      cards.forEach(function (c) {
        var d = Math.abs(c.getBoundingClientRect().left - left - 20);
        if (d < bestD) { bestD = d; best = c; }
      });
      if (best && bg) bg.style.setProperty('--colors-bg', getComputedStyle(best).getPropertyValue('--card'));
      ticking = false;
    }
    rail.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(onRail); }
    }, { passive: true });
    window.addEventListener('resize', onRail);
    onRail();
  })();

  /* ======================================================================
     BARRA DE COMPRA FIJA: aparece tras el hero y se oculta en la zona de compra
     ====================================================================== */
  (function () {
    var bar = $('[data-sticky]');
    var hero = $('[data-hero]');
    var buy = $('[data-buy]');
    var footer = $('.vw-footer');
    if (!bar || !('IntersectionObserver' in window)) return;
    bar.hidden = false;
    var state = { pastHero: !hero, buyVisible: false, footerVisible: false };
    function apply() {
      var show = state.pastHero && !state.buyVisible && !state.footerVisible;
      bar.classList.toggle('is-visible', show);
      bar.setAttribute('aria-hidden', show ? 'false' : 'true');
      $$('a, button', bar).forEach(function (b) { b.tabIndex = show ? 0 : -1; });
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.target === hero) state.pastHero = !en.isIntersecting && en.boundingClientRect.top < 0;
        if (en.target === buy) state.buyVisible = en.isIntersecting;
        if (en.target === footer) state.footerVisible = en.isIntersecting;
      });
      apply();
    }, { threshold: 0 });
    [hero, buy, footer].forEach(function (t) { if (t) io.observe(t); });
    apply();
  })();

  /* ======================================================================
     REMOLINO (canvas): partículas orbitando alrededor del producto
     ====================================================================== */
  function Vortex(canvas, opts) {
    this.c = canvas;
    this.ctx = canvas.getContext('2d');
    this.opts = opts || {};
    this.density = Math.max(0, Math.min(100, Number(canvas.dataset.density || 70))) / 100;
    this.boost = 1;
    this.target = 1;
    this.running = false;
    this.parts = [];
    this.resize = this.resize.bind(this);
    this.frame = this.frame.bind(this);
    this.resize();
    var self = this;
    if ('ResizeObserver' in window) new ResizeObserver(function () { self.resize(); }).observe(canvas);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        en[0].isIntersecting ? self.start() : self.stop();
      }).observe(canvas);
    } else { this.start(); }
  }
  Vortex.prototype.center = function () {
    var anchor = this.opts.anchor;
    var r = this.c.getBoundingClientRect();
    if (anchor) {
      var a = anchor.getBoundingClientRect();
      return { x: a.left - r.left + a.width / 2, y: a.top - r.top + a.height / 2 };
    }
    return { x: r.width / 2, y: r.height / 2 };
  };
  Vortex.prototype.resize = function () {
    var r = this.c.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = r.width; this.h = r.height;
    this.c.width = Math.round(r.width * dpr);
    this.c.height = Math.round(r.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var small = r.width < 750;
    var count = Math.round((small ? 130 : 260) * this.density);
    var maxR = Math.hypot(r.width, r.height) * 0.62;
    var styles = getComputedStyle(root);
    var c1 = styles.getPropertyValue('--vw-accent').trim() || '#d7ff3a';
    var c2 = styles.getPropertyValue('--vw-accent-2').trim() || '#7b5cff';
    this.parts = [];
    for (var i = 0; i < count; i++) {
      var rad = 40 + Math.pow(Math.random(), 0.75) * maxR;
      this.parts.push({
        a: Math.random() * Math.PI * 2,
        r: rad,
        s: (0.0009 + Math.random() * 0.0012) * (220 / (rad + 60)) * 4,
        z: 0.4 + Math.random() * 1.6,
        c: Math.random() < 0.6 ? c1 : (Math.random() < 0.5 ? c2 : '#f4f1ea'),
        o: 0.25 + Math.random() * 0.6
      });
    }
    this.ctx.clearRect(0, 0, this.w, this.h);
    if (reduceMQ.matches) this.draw(0, true);
  };
  Vortex.prototype.draw = function (dt, still) {
    var ctx = this.ctx;
    var c = this.center();
    if (still) ctx.clearRect(0, 0, this.w, this.h);
    else {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0,0,0,0.16)';
      ctx.fillRect(0, 0, this.w, this.h);
      ctx.globalCompositeOperation = 'source-over';
    }
    this.boost += (this.target - this.boost) * 0.06;
    for (var i = 0; i < this.parts.length; i++) {
      var p = this.parts[i];
      if (!still) p.a += p.s * dt * this.boost;
      var x = c.x + Math.cos(p.a) * p.r;
      var y = c.y + Math.sin(p.a) * p.r * 0.92;
      ctx.globalAlpha = p.o;
      ctx.fillStyle = p.c;
      ctx.beginPath();
      ctx.arc(x, y, p.z, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };
  Vortex.prototype.frame = function (t) {
    if (!this.running) return;
    var dt = this.last ? Math.min(48, t - this.last) : 16;
    this.last = t;
    this.draw(dt);
    requestAnimationFrame(this.frame);
  };
  Vortex.prototype.start = function () {
    if (this.running || reduceMQ.matches || this.density === 0) return;
    this.running = true;
    this.last = 0;
    requestAnimationFrame(this.frame);
  };
  Vortex.prototype.stop = function () { this.running = false; };

  var vortices = $$('[data-vortex]').map(function (cv) {
    var sec = cv.closest('section');
    var anchor = sec && sec.hasAttribute('data-hero') ? $('[data-stage]', sec) : null;
    return new Vortex(cv, { anchor: anchor });
  });

  /* ======================================================================
     ANIMACIONES GSAP
     ====================================================================== */
  function revealAll() {
    $$('[data-hero-in], [data-hero-title], [data-hero-media], [data-reveal], [data-split]').forEach(function (el) {
      el.style.visibility = 'visible';
    });
  }

  function initMotion() {
    if (!window.gsap || !window.ScrollTrigger) { root.classList.add('vw-nofx'); revealAll(); return; }
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });
    gsap.defaults({ ease: 'power3.out' });

    var mm = gsap.matchMedia();

    mm.add({
      desktop: '(min-width: 990px)',
      mobile: '(max-width: 989px)',
      reduce: '(prefers-reduced-motion: reduce)'
    }, function (ctx) {
      var c = ctx.conditions;
      var still = c.reduce || designMode;

      if (still) {
        revealAll();
        var rpmStill = $('[data-rpm]');
        if (rpmStill) rpmStill.classList.remove('is-fx');
        return;
      }

      /* ---- Hero: entrada ---- */
      var hero = $('[data-hero]');
      if (hero) {
        var title = $('[data-hero-title]', hero);
        var media = $('[data-hero-media]', hero);
        var ins = $$('[data-hero-in]', hero);
        var rings = $$('[data-rings] circle', hero);
        var badge = $('[data-hero-badge]', hero);
        var tl = gsap.timeline({ delay: 0.1 });

        if (title) {
          gsap.set(title, { visibility: 'visible' });
          tl.from(splitWords(title), { yPercent: 118, duration: 1.15, ease: 'expo.out', stagger: 0.07 }, 0.15);
        }
        if (media) {
          gsap.set(media, { visibility: 'visible' });
          tl.from(media, { scale: 0.82, rotate: -10, autoAlpha: 0, duration: 1.4, ease: 'expo.out' }, 0.05);
        }
        if (rings.length) tl.from(rings, { autoAlpha: 0, scale: 0.7, svgOrigin: '300 300', duration: 1.4, stagger: 0.12, ease: 'expo.out' }, 0.2);
        if (badge) tl.from(badge, { scale: 0, rotate: -90, duration: 0.9, ease: 'back.out(1.8)' }, 0.75);
        if (ins.length) {
          gsap.set(ins, { visibility: 'visible' });
          tl.from(ins, { y: 26, autoAlpha: 0, duration: 0.9, stagger: 0.08 }, 0.45);
        }

        // Rotación continua de los anillos; el scroll la acelera (como el motor)
        var spins = [];
        rings.forEach(function (r, i) {
          spins.push(gsap.to(r, { rotation: i % 2 ? -360 : 360, svgOrigin: '300 300', duration: [60, 14, 9][i] || 20, repeat: -1, ease: 'none' }));
        });
        ScrollTrigger.create({
          trigger: hero, start: 'top top', end: 'bottom top',
          onUpdate: function (self) {
            var boost = 1 + Math.min(5, Math.abs(self.getVelocity()) / 500);
            spins.forEach(function (s) { gsap.to(s, { timeScale: boost, duration: 0.3, overwrite: true }); });
            vortices.forEach(function (v) { v.target = boost; });
            clearTimeout(hero._calm);
            hero._calm = setTimeout(function () {
              spins.forEach(function (s) { gsap.to(s, { timeScale: 1, duration: 1.2, overwrite: true }); });
              vortices.forEach(function (v) { v.target = 1; });
            }, 140);
          }
        });

        // Salida del hero con profundidad
        gsap.timeline({ scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.6 } })
          .fromTo($('.vw-hero__top', hero), { yPercent: 0, autoAlpha: 1 }, { yPercent: -30, autoAlpha: 0.15, ease: 'none', immediateRender: false }, 0)
          .fromTo($('.vw-hero__stage', hero), { yPercent: 0, scale: 1 }, { yPercent: c.desktop ? 14 : 8, scale: 0.9, ease: 'none', immediateRender: false }, 0);
      }

      /* ---- Titulares por líneas con máscara ---- */
      $$('[data-split]').forEach(function (el) {
        gsap.set(el, { visibility: 'visible' });
        gsap.from(splitWords(el), {
          yPercent: 118, duration: 1.1, ease: 'expo.out', stagger: 0.045,
          scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none reverse' }
        });
      });

      /* ---- Bloques que aparecen al entrar ---- */
      var reveals = $$('[data-reveal]');
      if (reveals.length) {
        gsap.set(reveals, { visibility: 'visible', autoAlpha: 0, y: 34 });
        ScrollTrigger.batch(reveals, {
          start: 'top 90%',
          onEnter: function (batch) { gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.08, overwrite: true }); },
          onLeaveBack: function (batch) { gsap.to(batch, { autoAlpha: 0, y: 34, duration: 0.4, overwrite: true }); }
        });
      }

      /* ---- EXPANSIÓN CINEMATOGRÁFICA (momento principal) ---- */
      $$('[data-expand]').forEach(function (sec) {
        var stage = $('[data-expand-stage]', sec);
        var frame = $('[data-expand-frame]', sec);
        var mediaEl = $('[data-expand-media]', sec);
        var caption = $('[data-expand-caption]', sec);
        var wl = $('[data-expand-word="l"]', sec);
        var wr = $('[data-expand-word="r"]', sec);
        var kicker = $('.vw-expand__kicker', sec);
        var startClip = c.desktop ? 'inset(17% 27% 17% 27% round 32px)' : 'inset(27% 6% 27% 6% round 24px)';

        gsap.set(caption, { autoAlpha: 0, y: 40 });
        var tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: stage,
            start: 'top top',
            end: function () { return '+=' + Math.round(window.innerHeight * (c.desktop ? 1.6 : 1.25)); },
            pin: true,
            scrub: 0.7,
            anticipatePin: 1,
            invalidateOnRefresh: true
          }
        });
        tl.fromTo(frame, { clipPath: startClip }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', duration: 1 }, 0)
          .fromTo(mediaEl, { scale: c.desktop ? 1.18 : 1.3 }, { scale: 1, duration: 1 }, 0)
          .to(wl, { xPercent: c.desktop ? -70 : 0, yPercent: c.desktop ? 0 : -120, autoAlpha: 0, duration: 0.6 }, 0.05)
          .to(wr, { xPercent: c.desktop ? 70 : 0, yPercent: c.desktop ? 0 : 120, autoAlpha: 0, duration: 0.6 }, 0.05)
          .to(kicker, { autoAlpha: 0, y: -20, duration: 0.3 }, 0)
          .to(caption, { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power2.out' }, 0.8)
          .to({}, { duration: 0.25 }); // pequeña pausa al final con la imagen a pantalla completa
      });

      /* ---- CIFRAS fijadas con contador ---- */
      var rpm = $('[data-rpm]');
      if (rpm) {
        var items = $$('[data-rpm-item]', rpm);
        var steps = $$('[data-rpm-step]', rpm);
        var arc = $('[data-rpm-arc]', rpm);
        var halo = $('[data-rpm-halo]', rpm);
        if (items.length > 1) {
          rpm.classList.add('is-fx');
          var n = items.length;
          var rtl = gsap.timeline({
            defaults: { ease: 'none' },
            scrollTrigger: {
              trigger: $('[data-rpm-stage]', rpm),
              start: 'top top',
              end: function () { return '+=' + Math.round(window.innerHeight * n * (c.desktop ? 0.85 : 0.7)); },
              pin: true,
              scrub: 0.6,
              anticipatePin: 1,
              invalidateOnRefresh: true,
              onUpdate: function (self) {
                var idx = Math.min(n - 1, Math.floor(self.progress * n * 0.999));
                steps.forEach(function (s, i) { s.classList.toggle('is-active', i === idx); });
                items.forEach(function (it, i) { it.setAttribute('aria-hidden', i === idx ? 'false' : 'true'); });
              }
            }
          });
          gsap.set(items.slice(1), { autoAlpha: 0, y: 60 });
          var cs = getComputedStyle(root);
          var haloColors = [
            hexToRgba(cs.getPropertyValue('--vw-accent'), 0.24),
            hexToRgba(cs.getPropertyValue('--vw-accent-2'), 0.34),
            hexToRgba(cs.getPropertyValue('--vw-tint'), 0.3)
          ];
          if (halo) gsap.set(halo, { '--halo': haloColors[0] });
          items.forEach(function (it, i) {
            var numEl = $('[data-rpm-num]', it);
            var target = parseFloat(String(it.dataset.value).replace(',', '.'));
            var at = i;
            if (i > 0) {
              rtl.to(items[i - 1], { autoAlpha: 0, y: -60, duration: 0.25 }, at - 0.05)
                 .to(it, { autoAlpha: 1, y: 0, duration: 0.25 }, at + 0.05);
            }
            if (!isNaN(target) && target >= 10 && numEl) {
              var counter = { v: 0 };
              var decimals = String(it.dataset.value).indexOf(',') > -1 || String(it.dataset.value).indexOf('.') > -1 ? 1 : 0;
              var paint = function () { numEl.textContent = decimals ? counter.v.toFixed(decimals).replace('.', ',') : Math.round(counter.v); };
              if (i === 0) {
                // La primera cifra se cuenta sola al llegar, para no mostrar «0» mientras se acerca
                gsap.fromTo(counter, { v: 0 }, {
                  v: target, duration: 1.8, ease: 'power3.out', onUpdate: paint,
                  scrollTrigger: { trigger: rpm, start: 'top 65%', toggleActions: 'play none none none' }
                });
              } else {
                rtl.fromTo(counter, { v: 0 }, { v: target, duration: 0.7, onUpdate: paint }, at);
              }
            }
            if (arc) rtl.to(arc, { strokeDashoffset: 100 - ((i + 1) / n) * 100, duration: 0.7 }, at);
            if (halo && i > 0) rtl.to(halo, { '--halo': haloColors[i % 3], duration: 0.5 }, at);
          });
          rtl.to({}, { duration: 0.3 });
        }
      }

      /* ---- Parallax fotográfico ---- */
      $$('.vw-feat__img, .vw-specs__media img').forEach(function (img) {
        var amount = c.desktop ? 8 : 5;
        gsap.fromTo(img, { yPercent: -amount }, {
          yPercent: amount, ease: 'none',
          scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true }
        });
      });

      /* ---- Ventajas: marcos que se abren al entrar (eco de la expansión) ---- */
      $$('.vw-feat__media').forEach(function (m) {
        gsap.fromTo(m, { clipPath: 'inset(10% 10% 10% 10% round 24px)' }, {
          clipPath: 'inset(0% 0% 0% 0% round 24px)', ease: 'none',
          scrollTrigger: { trigger: m, start: 'top 95%', end: 'top 45%', scrub: 0.5 }
        });
        var num = $('.vw-feat__num', m);
        if (num) gsap.from(num, { yPercent: 60, autoAlpha: 0, duration: 1, scrollTrigger: { trigger: m, start: 'top 70%' } });
      });

      /* ---- Colores: tarjetas en cascada ---- */
      var colorCards = $$('[data-color-card]');
      if (colorCards.length) {
        gsap.from(colorCards, {
          x: 90, autoAlpha: 0, duration: 1.1, stagger: 0.07, ease: 'expo.out',
          scrollTrigger: { trigger: colorCards[0].parentElement, start: 'top 85%' }
        });
      }

      /* ---- Cinta cinética de momentos ---- */
      $$('[data-band]').forEach(function (row) {
        var dir = Number(row.dataset.band);
        gsap.fromTo(row, { xPercent: dir < 0 ? 0 : -22 }, {
          xPercent: dir < 0 ? -22 : 0, ease: 'none',
          scrollTrigger: { trigger: row.closest('section'), start: 'top bottom', end: 'bottom top', scrub: 0.4 }
        });
      });

      /* ---- Cierre: el remolino gana intensidad al llegar ---- */
      var fin = $('[data-final]');
      if (fin) {
        ScrollTrigger.create({
          trigger: fin, start: 'top 70%', end: 'bottom bottom',
          onEnter: function () { vortices.forEach(function (v) { v.target = 2.4; }); setTimeout(function () { vortices.forEach(function (v) { v.target = 1; }); }, 900); }
        });
      }
    });

    // Recalcular cuando cargan fuentes e imágenes (evita saltos en los pins)
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
    window.addEventListener('load', function () { ScrollTrigger.refresh(); });
    $$('img[loading="lazy"]').forEach(function (img) {
      if (!img.complete) img.addEventListener('load', function () { ScrollTrigger.refresh(); }, { once: true });
    });
  }

  /* ---------- Arranque ---------- */
  function boot() {
    if (product) {
      var params = new URLSearchParams(window.location.search);
      var fromUrl = findVariant(params.get('variant'));
      var input = $('[data-variant-input]');
      var initial = fromUrl || findVariant(input && input.value) || product.variants.find(function (v) { return v.available; }) || product.variants[0];
      try {
        if (initial) setVariant(initial.id, { instant: true, silentUrl: !fromUrl });
      } catch (e) { if (window.console) console.error('[vortix] variante', e); }
    }
    try {
      initMotion();
      window.vwReady = true;
    } catch (e) {
      // Si algo falla, el contenido nunca se queda oculto
      if (window.console) console.error('[vortix] animaciones', e);
      root.classList.add('vw-nofx');
      revealAll();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  // Editor de temas: recalcular al editar secciones
  document.addEventListener('shopify:section:load', function () { if (window.ScrollTrigger) ScrollTrigger.refresh(); });
})();
