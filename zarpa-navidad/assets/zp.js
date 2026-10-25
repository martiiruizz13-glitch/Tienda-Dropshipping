/* Zarpa · Navidad — Zaldori */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var designMode = document.documentElement.classList.contains('zp-design-mode');

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function formatMoney(cents) {
    var format = (window.ZP && window.ZP.moneyFormat) || '{{amount_with_comma_separator}} €';
    var value = (cents / 100);
    function withSep(n, thousands, decimal, precision) {
      var parts = n.toFixed(precision).split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousands);
      return parts.join(decimal);
    }
    return format.replace(/\{\{\s*(\w+)\s*\}\}/, function (_, key) {
      switch (key) {
        case 'amount': return withSep(value, ',', '.', 2);
        case 'amount_no_decimals': return withSep(value, ',', '.', 0);
        case 'amount_with_comma_separator': return withSep(value, '.', ',', 2);
        case 'amount_no_decimals_with_comma_separator': return withSep(value, '.', ',', 0);
        case 'amount_with_apostrophe_separator': return withSep(value, "'", '.', 2);
        default: return withSep(value, '.', ',', 2);
      }
    });
  }

  /* ---------- Snow ---------- */
  function initSnow() {
    var canvas = $('[data-zp-snow]');
    if (!canvas || reduceMotion) return;
    var ctx = canvas.getContext('2d');
    var flakes = [];
    var w, h, dpr;
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var count = Math.round(Math.min(90, w / 14));
      flakes = [];
      for (var i = 0; i < count; i++) flakes.push(make(true));
    }
    function make(anywhere) {
      return {
        x: Math.random() * w,
        y: anywhere ? Math.random() * h : -10,
        r: Math.random() * 2.2 + .6,
        s: Math.random() * .6 + .25,
        d: Math.random() * Math.PI * 2,
        o: Math.random() * .5 + .35
      };
    }
    var running = true;
    document.addEventListener('visibilitychange', function () {
      running = !document.hidden;
      if (running) requestAnimationFrame(tick);
    });
    function tick() {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < flakes.length; i++) {
        var f = flakes[i];
        f.d += .01;
        f.y += f.s;
        f.x += Math.sin(f.d) * .35;
        if (f.y > h + 10) flakes[i] = make(false);
        ctx.beginPath();
        ctx.fillStyle = 'rgba(255,255,255,' + f.o + ')';
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
      }
      requestAnimationFrame(tick);
    }
    resize();
    window.addEventListener('resize', resize, { passive: true });
    requestAnimationFrame(tick);
  }

  /* ---------- Header ---------- */
  function initHeader() {
    var header = $('[data-zp-header]');
    if (!header) return;
    function onScroll() { header.classList.toggle('is-scrolled', window.scrollY > 24); }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- Countdowns ---------- */
  function parseDate(str) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((str || '').trim());
    if (!m) return null;
    return new Date(+m[1], +m[2] - 1, +m[3], 0, 0, 0);
  }
  function initCountdowns() {
    $$('[data-zp-days]').forEach(function (el) {
      var target = parseDate(el.getAttribute('data-zp-days'));
      if (!target) return;
      var days = Math.ceil((target - new Date()) / 86400000);
      if (days < 0) return;
      $('[data-zp-days-text]', el).textContent = days === 0 ? '¡Hoy es Navidad!' : (days === 1 ? 'Falta 1 día' : 'Faltan ' + days + ' días');
      el.hidden = false;
    });

    var boxes = $$('[data-zp-countdown]');
    if (!boxes.length) return;
    function pad(n) { return n < 10 ? '0' + n : '' + n; }
    function update() {
      boxes.forEach(function (box) {
        var target = parseDate(box.getAttribute('data-zp-countdown'));
        if (!target) return;
        var diff = Math.max(0, target - new Date());
        var d = Math.floor(diff / 86400000);
        var h = Math.floor(diff / 3600000) % 24;
        var m = Math.floor(diff / 60000) % 60;
        var s = Math.floor(diff / 1000) % 60;
        var map = { d: d, h: pad(h), m: pad(m), s: pad(s) };
        $$('[data-zp-cd]', box).forEach(function (el) { el.textContent = map[el.getAttribute('data-zp-cd')]; });
      });
    }
    update();
    setInterval(update, 1000);
  }

  /* ---------- Reveal on scroll ---------- */
  function initReveal() {
    var els = $$('.zp-reveal, [data-zp-trail]');
    if (!('IntersectionObserver' in window) || reduceMotion || designMode) {
      els.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .12 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Hero tilt ---------- */
  function initTilt() {
    if (reduceMotion || !window.matchMedia('(hover: hover)').matches) return;
    $$('[data-zp-tilt]').forEach(function (el) {
      var hero = el.closest('section') || el;
      hero.addEventListener('pointermove', function (e) {
        var r = hero.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - .5;
        var y = (e.clientY - r.top) / r.height - .5;
        el.style.setProperty('--tx', (x * 18).toFixed(1) + 'px');
        el.style.setProperty('--ty', (y * 14).toFixed(1) + 'px');
      });
      hero.addEventListener('pointerleave', function () {
        el.style.setProperty('--tx', '0px');
        el.style.setProperty('--ty', '0px');
      });
    });
  }

  /* ---------- Layers (exploded view on scroll) ---------- */
  function initLayers() {
    $$('[data-zp-layers]').forEach(function (sec) {
      var stack = $('.zp-capas__stack', sec);
      var slabs = $$('[data-zp-layer]', sec);
      var items = $$('[data-zp-layer-item]', sec);
      var n = items.length;
      if (!stack || !n) return;

      function setActive(i) {
        items.forEach(function (it) { it.classList.toggle('is-active', +it.getAttribute('data-zp-layer-item') === i); });
        slabs.forEach(function (sl) { sl.classList.toggle('is-active', +sl.getAttribute('data-zp-layer') === i); });
      }
      items.forEach(function (it) {
        it.addEventListener('mouseenter', function () { setActive(+it.getAttribute('data-zp-layer-item')); });
      });

      if (reduceMotion || designMode) {
        stack.style.setProperty('--p', 1);
        slabs.forEach(function (s) { s.style.setProperty('--p', 1); });
        setActive(0);
        return;
      }
      var ticking = false;
      function update() {
        ticking = false;
        var r = sec.getBoundingClientRect();
        var vh = window.innerHeight;
        var p = (vh - r.top) / (vh + r.height * .5);
        p = Math.max(0, Math.min(1, (p - .15) / .6));
        slabs.forEach(function (s) { s.style.setProperty('--p', p.toFixed(3)); });
        sec.style.setProperty('--p', p.toFixed(3));
        if (p > .05) setActive(Math.min(n - 1, Math.floor(p * n * .999)));
      }
      window.addEventListener('scroll', function () {
        if (!ticking) { ticking = true; requestAnimationFrame(update); }
      }, { passive: true });
      update();
    });
  }

  /* ---------- Cart ---------- */
  var Cart = {
    dialog: null,
    open: function () {
      if (!this.dialog) return;
      if (typeof this.dialog.showModal === 'function') {
        if (!this.dialog.open) this.dialog.showModal();
      } else {
        window.location.href = window.ZP.routes.cart;
      }
    },
    close: function () { if (this.dialog && this.dialog.open) this.dialog.close(); },
    fetch: function () {
      return fetch(window.ZP.routes.cart + '.js', { headers: { Accept: 'application/json' } }).then(function (r) { return r.json(); });
    },
    render: function (cart) {
      var list = $('[data-zp-cart-items]');
      var empty = $('[data-zp-cart-empty]');
      var total = $('[data-zp-cart-total]');
      var checkout = $('[data-zp-checkout]');
      $$('[data-zp-cart-count]').forEach(function (el) {
        el.textContent = cart.item_count;
        el.setAttribute('data-count', cart.item_count);
      });
      if (!list) return;
      list.innerHTML = '';
      cart.items.forEach(function (item) {
        var li = document.createElement('li');
        li.className = 'zp-cart__item';
        var img = item.image ? item.image.replace(/(\.[a-z]+)(\?|$)/i, '_200x$1$2') : '';
        var name = (item.product_title || '').split(' · ')[0];
        li.innerHTML =
          (img ? '<img src="' + img + '" alt="" width="76" height="76" loading="lazy">' : '<span></span>') +
          '<div><p class="zp-cart__item-name"></p><p class="zp-cart__item-variant"></p>' +
          '<div class="zp-cart__item-qty"><button type="button" data-zp-line-step="-1" aria-label="Quitar una unidad">−</button><span></span><button type="button" data-zp-line-step="1" aria-label="Añadir una unidad">+</button></div></div>' +
          '<p class="zp-cart__item-price"></p>';
        $('.zp-cart__item-name', li).textContent = name;
        $('.zp-cart__item-variant', li).textContent = item.variant_title || '';
        $('.zp-cart__item-qty span', li).textContent = item.quantity;
        $('.zp-cart__item-price', li).textContent = formatMoney(item.final_line_price);
        $$('[data-zp-line-step]', li).forEach(function (btn) {
          btn.addEventListener('click', function () {
            var q = Math.max(0, item.quantity + (+btn.getAttribute('data-zp-line-step')));
            Cart.change(item.key, q);
          });
        });
        list.appendChild(li);
      });
      if (empty) empty.hidden = cart.item_count > 0;
      list.hidden = cart.item_count === 0;
      if (total) total.textContent = formatMoney(cart.total_price);
      if (checkout) checkout.disabled = cart.item_count === 0;
    },
    change: function (key, quantity) {
      return fetch(window.ZP.routes.cartChange + '.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ id: key, quantity: quantity })
      }).then(function (r) { return r.json(); }).then(function (cart) { Cart.render(cart); });
    },
    add: function (id, quantity) {
      return fetch(window.ZP.routes.cartAdd + '.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ items: [{ id: id, quantity: quantity }] })
      }).then(function (r) {
        return r.json().then(function (data) {
          if (!r.ok) throw new Error(data.description || data.message || 'No hemos podido añadirlo.');
          return data;
        });
      });
    }
  };

  function initCart() {
    Cart.dialog = $('[data-zp-cart]');
    $$('[data-zp-cart-open]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        Cart.fetch().then(function (c) { Cart.render(c); });
        Cart.open();
      });
    });
    $$('[data-zp-cart-close]').forEach(function (btn) { btn.addEventListener('click', function () { Cart.close(); }); });
    if (Cart.dialog) {
      Cart.dialog.addEventListener('click', function (e) { if (e.target === Cart.dialog) Cart.close(); });
    }
  }

  /* ---------- Buy box ---------- */
  function initBuy() {
    $$('[data-zp-buy]').forEach(function (box) {
      var form = $('[data-zp-buy-form]', box);
      var dataEl = $('[data-zp-variants]', box);
      if (!form || !dataEl) return;
      var variants = [];
      try { variants = JSON.parse(dataEl.textContent); } catch (e) { return; }

      var idInput = $('[data-zp-variant-id]', form);
      var priceEl = $('[data-zp-price]', form);
      var compareEl = $('[data-zp-compare]', form);
      var saveEl = $('[data-zp-save]', form);
      var flagEl = $('[data-zp-flag]', box);
      var stockEl = $('[data-zp-stock]', form);
      var stockText = $('[data-zp-stock-text]', form);
      var addBtn = $('[data-zp-add]', form);
      var addLabel = $('[data-zp-add-label]', form);
      var errorEl = $('[data-zp-error]', form);
      var mainImg = $('.zp-buy__img', box);
      var qty = $('[data-zp-qty]', form);
      var barPrice = $('[data-zp-bar-price]');
      var okLabel = addLabel ? addLabel.textContent : 'Añadir al carrito';
      var inStockText = stockText ? stockText.textContent : 'Disponible';
      var optionInputs = $$('[data-zp-option]', form);
      var optionCount = 0;
      optionInputs.forEach(function (i) { optionCount = Math.max(optionCount, +i.getAttribute('data-zp-option') + 1); });

      function selected() {
        var vals = [];
        for (var i = 0; i < optionCount; i++) {
          var c = form.querySelector('[data-zp-option="' + i + '"]:checked');
          vals.push(c ? c.value : null);
        }
        return vals;
      }
      function find(vals) {
        for (var i = 0; i < variants.length; i++) {
          var ok = true;
          for (var j = 0; j < vals.length; j++) if (variants[i].options[j] !== vals[j]) { ok = false; break; }
          if (ok) return variants[i];
        }
        return null;
      }
      function swapImage(src, srcset, alt) {
        if (!mainImg || !src || mainImg.getAttribute('src') === src) return;
        mainImg.classList.add('is-swapping');
        var pre = new Image();
        pre.onload = pre.onerror = function () {
          mainImg.removeAttribute('srcset');
          if (srcset) mainImg.setAttribute('srcset', srcset);
          mainImg.src = src;
          if (alt) mainImg.alt = alt;
          requestAnimationFrame(function () { mainImg.classList.remove('is-swapping'); });
        };
        pre.src = src;
        $$('[data-zp-thumb]', box).forEach(function (t) { t.classList.toggle('is-active', t.getAttribute('data-src') === src); });
      }
      function markAvailability(vals) {
        optionInputs.forEach(function (input) {
          var idx = +input.getAttribute('data-zp-option');
          var test = vals.slice();
          test[idx] = input.value;
          var v = find(test);
          input.classList.toggle('is-unavailable', !v || !v.available);
        });
      }
      function update(fromUser) {
        var vals = selected();
        var v = find(vals);
        if (!v && fromUser) {
          // Keep the option just changed, pick the first available combination for the rest.
          var changed = fromUser;
          var idx = +changed.getAttribute('data-zp-option');
          for (var i = 0; i < variants.length; i++) {
            if (variants[i].options[idx] === changed.value && variants[i].available) { v = variants[i]; break; }
          }
          if (!v) for (var k = 0; k < variants.length; k++) if (variants[k].options[idx] === changed.value) { v = variants[k]; break; }
          if (v) {
            v.options.forEach(function (val, j) {
              var input = form.querySelector('[data-zp-option="' + j + '"][value="' + CSS.escape(val) + '"]');
              if (input) input.checked = true;
            });
            vals = selected();
          }
        }
        for (var o = 0; o < optionCount; o++) {
          var cur = form.querySelector('[data-zp-option-current="' + o + '"]');
          if (cur && vals[o]) cur.textContent = vals[o];
        }
        markAvailability(vals);
        if (!v) {
          addBtn.disabled = true;
          addLabel.textContent = 'No disponible';
          return;
        }
        idInput.value = v.id;
        priceEl.textContent = v.price;
        if (barPrice) barPrice.textContent = v.price;
        if (v.compare) {
          compareEl.textContent = v.compare; compareEl.hidden = false;
          if (saveEl) saveEl.hidden = false;
          if (flagEl) { flagEl.textContent = '-' + v.pct + '%'; flagEl.hidden = false; }
        } else {
          compareEl.hidden = true;
          if (saveEl) saveEl.hidden = true;
          if (flagEl) flagEl.hidden = true;
        }
        stockEl.setAttribute('data-state', v.available ? 'in' : 'out');
        stockText.textContent = v.available ? inStockText : 'Agotado en esta combinación';
        addBtn.disabled = !v.available;
        addLabel.textContent = v.available ? okLabel : 'Agotado';
        if (v.image && fromUser) swapImage(v.image.src, v.image.srcset, v.image.alt);
        if (fromUser && window.history.replaceState && document.body.contains(box) && /\/products\//.test(location.pathname)) {
          var url = new URL(location.href);
          url.searchParams.set('variant', v.id);
          window.history.replaceState({}, '', url.toString());
        }
      }

      optionInputs.forEach(function (input) {
        input.addEventListener('change', function () { update(input); });
      });
      $$('[data-zp-thumb]', box).forEach(function (t) {
        t.addEventListener('click', function () { swapImage(t.getAttribute('data-src'), t.getAttribute('data-srcset'), t.getAttribute('data-alt')); });
      });
      $$('[data-zp-qty-step]', form).forEach(function (btn) {
        btn.addEventListener('click', function () {
          var n = Math.max(1, Math.min(10, (parseInt(qty.value, 10) || 1) + (+btn.getAttribute('data-zp-qty-step'))));
          qty.value = n;
        });
      });

      form.addEventListener('submit', function (e) {
        if (!window.fetch) return;
        e.preventDefault();
        if (addBtn.disabled) return;
        errorEl.hidden = true;
        addBtn.classList.add('is-loading');
        addBtn.disabled = true;
        Cart.add(+idInput.value, Math.max(1, parseInt(qty.value, 10) || 1))
          .then(function () { return Cart.fetch(); })
          .then(function (cart) {
            Cart.render(cart);
            addLabel.textContent = '¡Añadido! 🐾';
            $$('.zp-cart-btn').forEach(function (b) {
              b.classList.remove('is-bump'); void b.offsetWidth; b.classList.add('is-bump');
            });
            Cart.open();
            setTimeout(function () { addLabel.textContent = okLabel; }, 2200);
          })
          .catch(function (err) {
            errorEl.textContent = err.message || 'No hemos podido añadirlo. Inténtalo de nuevo.';
            errorEl.hidden = false;
          })
          .then(function () {
            addBtn.classList.remove('is-loading');
            addBtn.disabled = false;
          });
      });

      update(null);
    });
  }

  /* ---------- Sticky mobile bar ---------- */
  function initBar() {
    var bar = $('[data-zp-bar]');
    var buy = $('[data-zp-buy-form]');
    if (!bar || !buy || !('IntersectionObserver' in window)) return;
    var buyVisible = false;
    var pastTop = false;
    function sync() {
      var show = pastTop && !buyVisible;
      bar.classList.toggle('is-visible', show);
      bar.setAttribute('aria-hidden', show ? 'false' : 'true');
      if (show) bar.removeAttribute('inert'); else bar.setAttribute('inert', '');
    }
    new IntersectionObserver(function (entries) {
      buyVisible = entries[0].isIntersecting; sync();
    }, { threshold: 0 }).observe(buy);
    window.addEventListener('scroll', function () {
      var p = window.scrollY > window.innerHeight * .6;
      if (p !== pastTop) { pastTop = p; sync(); }
    }, { passive: true });
  }

  function init() {
    initSnow();
    initHeader();
    initCountdowns();
    initReveal();
    initTilt();
    initLayers();
    initCart();
    initBuy();
    initBar();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  document.addEventListener('shopify:section:load', function () { initReveal(); initLayers(); initBuy(); initCountdowns(); });
})();
