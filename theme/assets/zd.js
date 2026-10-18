/* Zaldori flagship page.
 * Commerce (cart API, variants, drawer, sticky bar) works without GSAP.
 * Motion is layered on top with gsap.matchMedia(): desktop, mobile and reduced motion.
 */
(() => {
  'use strict';

  const ZD = window.ZD || { routes: { cart: '/cart', cartAdd: '/cart/add', cartChange: '/cart/change' }, strings: {} };
  const S = Object.assign(
    {
      add: 'Añadir al carrito',
      adding: 'Añadiendo…',
      added: 'Añadido',
      soldOut: 'Agotado',
      unavailable: 'No disponible',
      error: 'No hemos podido añadirlo. Inténtalo de nuevo.',
      empty: 'Tu carrito está vacío.',
      remove: 'Quitar',
      available: 'Disponible'
    },
    ZD.strings
  );

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const html = document.documentElement;
  const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mqFine = window.matchMedia('(hover: hover) and (pointer: fine)');
  const mqDesktop = window.matchMedia('(min-width: 990px)');
  const designMode = html.classList.contains('zd-design-mode') || (window.Shopify && window.Shopify.designMode);

  html.classList.add('zd-js-ready');

  /* ------------------------------------------------------------------ Money */
  function formatMoney(cents, format) {
    const fmt = format || ZD.moneyFormat || '{{amount_with_comma_separator}} €';
    if (typeof cents === 'string') cents = cents.replace('.', '');
    const value = Number(cents) || 0;
    const fmtNum = (n, precision, thousands = ',', decimal = '.') => {
      const fixed = (n / 100).toFixed(precision);
      const parts = fixed.split('.');
      const dollars = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, `$1${thousands}`);
      return dollars + (parts[1] ? decimal + parts[1] : '');
    };
    return fmt.replace(/\{\{\s*(\w+)\s*\}\}/, (_, key) => {
      switch (key) {
        case 'amount': return fmtNum(value, 2);
        case 'amount_no_decimals': return fmtNum(value, 0);
        case 'amount_with_comma_separator': return fmtNum(value, 2, '.', ',');
        case 'amount_no_decimals_with_comma_separator': return fmtNum(value, 0, '.', ',');
        case 'amount_with_apostrophe_separator': return fmtNum(value, 2, "'", '.');
        case 'amount_with_space_separator': return fmtNum(value, 2, ' ', ',');
        default: return fmtNum(value, 2);
      }
    });
  }

  const escapeHtml = (s) =>
    String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  /* ------------------------------------------------------------------- Cart */
  const Cart = {
    async request(url, options = {}) {
      const res = await fetch(url, {
        credentials: 'same-origin',
        ...options,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(options.headers || {}) }
      });
      let data = null;
      try { data = await res.json(); } catch (e) { /* empty body */ }
      if (!res.ok) {
        const msg = (data && (data.description || data.message)) || S.error;
        const err = new Error(typeof msg === 'string' ? msg : S.error);
        err.status = res.status;
        throw err;
      }
      return data;
    },
    get() { return this.request(`${ZD.routes.cart}.js`, { method: 'GET' }); },
    add(id, quantity) {
      return this.request(`${ZD.routes.cartAdd}.js`, {
        method: 'POST',
        body: JSON.stringify({ items: [{ id: Number(id), quantity: Math.max(1, Number(quantity) || 1) }] })
      });
    },
    change(key, quantity) {
      return this.request(`${ZD.routes.cartChange}.js`, { method: 'POST', body: JSON.stringify({ id: key, quantity }) });
    }
  };

  /* ----------------------------------------------------------- Dialog helper */
  const lockState = { count: 0 };
  function lockScroll(lock) {
    lockState.count += lock ? 1 : -1;
    lockState.count = Math.max(0, lockState.count);
    if (window.zdLenis) lockState.count ? window.zdLenis.stop() : window.zdLenis.start();
  }

  function makeSheet(dialog, { onOpen, onClose } = {}) {
    if (!dialog || typeof dialog.showModal !== 'function') return null;
    let closing = false;
    let opener = null;
    const panel = dialog.firstElementChild;

    const open = (trigger) => {
      if (dialog.open) return;
      opener = trigger || document.activeElement;
      dialog.showModal();
      lockScroll(true);
      requestAnimationFrame(() => requestAnimationFrame(() => dialog.classList.add('is-open')));
      onOpen && onOpen();
    };
    const close = (after) => {
      if (!dialog.open || closing) return;
      closing = true;
      dialog.classList.remove('is-open');
      const done = () => {
        if (!closing) return;
        closing = false;
        dialog.close();
        lockScroll(false);
        onClose && onClose();
        if (opener && typeof opener.focus === 'function') opener.focus({ preventScroll: true });
        if (typeof after === 'function') after();
      };
      if (mqReduce.matches) return done();
      panel.addEventListener('transitionend', (e) => { if (e.target === panel) done(); }, { once: true });
      setTimeout(done, 520);
    };
    dialog.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
    dialog.addEventListener('click', (e) => { if (e.target === dialog) close(); });
    return { open, close, get isOpen() { return dialog.open; } };
  }

  /* ------------------------------------------------------------ Cart drawer */
  const cartDialog = $('[data-zd-cart]');
  const cartBody = cartDialog && $('[data-zd-cart-body]', cartDialog);
  const cartFoot = cartDialog && $('[data-zd-cart-foot]', cartDialog);
  const cartStatus = cartDialog && $('[data-zd-cart-status]', cartDialog);
  const cartSheet = makeSheet(cartDialog, { onOpen: () => bar.update(), onClose: () => bar.update() });

  function updateCounts(count, bump) {
    $$('[data-zd-cart-count]').forEach((el) => {
      el.textContent = count;
      el.dataset.count = count;
      if (bump && el.closest('.zd-cart-btn')) {
        el.classList.remove('is-bumped');
        void el.offsetWidth;
        el.classList.add('is-bumped');
      }
    });
  }

  function renderCart(cart, highlightKey) {
    if (!cartBody) return;
    updateCounts(cart.item_count, Boolean(highlightKey));
    if (!cart.item_count) {
      cartBody.innerHTML = `<p class="zd-cart__empty">${escapeHtml(S.empty)}</p>`;
      if (cartFoot) cartFoot.hidden = true;
      return;
    }
    const items = cart.items
      .map((item) => {
        const name = String(item.product_title || item.title).split(' · ')[0];
        const variant = item.product_has_only_default_variant ? '' : item.variant_title || '';
        const img = item.image ? `${item.image}${item.image.includes('?') ? '&' : '?'}width=160` : '';
        return `
        <li class="zd-cart__item${item.key === highlightKey ? ' is-new' : ''}" data-key="${escapeHtml(item.key)}">
          ${img ? `<img class="zd-cart__img" src="${escapeHtml(img)}" alt="" width="80" height="80" loading="lazy">` : '<span class="zd-cart__img"></span>'}
          <div class="zd-cart__info">
            <p class="zd-cart__name">${escapeHtml(name)}</p>
            ${variant ? `<p class="zd-cart__variant">${escapeHtml(variant)}</p>` : ''}
            <div class="zd-cart__row">
              <div class="zd-qty zd-qty--sm">
                <button type="button" class="zd-qty__btn" data-cart-step="-1" aria-label="Quitar una unidad de ${escapeHtml(name)}"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10" stroke="currentColor" stroke-width="1.5"/></svg></button>
                <span class="zd-qty__input" aria-label="Cantidad" role="status">${item.quantity}</span>
                <button type="button" class="zd-qty__btn" data-cart-step="1" aria-label="Añadir una unidad de ${escapeHtml(name)}"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M8 3v10" stroke="currentColor" stroke-width="1.5"/></svg></button>
              </div>
              <p class="zd-cart__line">${formatMoney(item.final_line_price)}</p>
            </div>
            <button type="button" class="zd-cart__remove" data-cart-remove>${escapeHtml(S.remove)}</button>
          </div>
        </li>`;
      })
      .join('');
    cartBody.innerHTML = `<ul class="zd-cart__items" role="list">${items}</ul>`;
    if (cartFoot) {
      cartFoot.hidden = false;
      const sub = $('[data-zd-cart-subtotal]', cartFoot);
      if (sub) sub.textContent = formatMoney(cart.total_price);
    }
  }

  async function refreshCart(highlightKey) {
    try {
      const cart = await Cart.get();
      renderCart(cart, highlightKey);
      return cart;
    } catch (e) {
      return null;
    }
  }

  if (cartBody) {
    cartBody.addEventListener('click', async (e) => {
      const li = e.target.closest('[data-key]');
      if (!li) return;
      const step = e.target.closest('[data-cart-step]');
      const remove = e.target.closest('[data-cart-remove]');
      if (!step && !remove) return;
      const qtyEl = $('.zd-qty__input', li);
      const current = Number(qtyEl ? qtyEl.textContent : 1);
      const next = remove ? 0 : Math.max(0, current + Number(step.dataset.cartStep));
      cartDialog.classList.add('is-busy');
      try {
        const cart = await Cart.change(li.dataset.key, next);
        renderCart(cart);
        if (cartStatus) cartStatus.textContent = next === 0 ? 'Producto eliminado del carrito.' : 'Cantidad actualizada.';
      } catch (err) {
        if (cartStatus) cartStatus.textContent = err.message;
      } finally {
        cartDialog.classList.remove('is-busy');
      }
    });
  }

  $$('[data-zd-cart-open]').forEach((btn) =>
    btn.addEventListener('click', (e) => {
      if (!cartSheet) return;
      e.preventDefault();
      refreshCart();
      cartSheet.open(btn);
    })
  );
  $$('[data-zd-cart-close]').forEach((btn) => btn.addEventListener('click', () => cartSheet && cartSheet.close()));

  /* ------------------------------------------------------------------- Menu */
  const menuDialog = $('#zd-menu');
  const menuSheet = makeSheet(menuDialog);
  $$('[data-zd-menu-open]').forEach((btn) => btn.addEventListener('click', () => menuSheet && menuSheet.open(btn)));
  $$('[data-zd-menu-close]').forEach((btn) => btn.addEventListener('click', () => menuSheet && menuSheet.close()));
  $$('[data-zd-menu-link]').forEach((a) =>
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href') || '';
      if (!href.startsWith('#') || !menuSheet) return;
      e.preventDefault();
      menuSheet.close(() => scrollToHash(href));
    })
  );

  /* -------------------------------------------------------- Smooth anchors */
  function headerOffset() {
    const h = $('[data-zd-header]');
    return h ? h.offsetHeight : 0;
  }
  function scrollToHash(hash) {
    const target = hash && hash.length > 1 ? document.getElementById(decodeURIComponent(hash.slice(1))) : null;
    if (!target) return;
    if (window.zdLenis) {
      window.zdLenis.scrollTo(target, { offset: -headerOffset() - 8, duration: 1.2 });
    } else {
      target.scrollIntoView({ behavior: mqReduce.matches ? 'auto' : 'smooth', block: 'start' });
    }
    const focusable = target.matches('a, button, input, [tabindex]') ? target : null;
    if (focusable) focusable.focus({ preventScroll: true });
    history.replaceState(null, '', hash);
  }
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-zd-menu-link') || a.classList.contains('zd-skip')) return;
    const href = a.getAttribute('href');
    if (href.length < 2 || !document.getElementById(decodeURIComponent(href.slice(1)))) return;
    e.preventDefault();
    scrollToHash(href);
  });

  /* ---------------------------------------------------------- Fly to cart */
  // A small copy of the product photo arcs into the header bag; the count bumps on landing.
  function flyToCart(img, fallback) {
    const target = $('.zd-cart-btn');
    if (mqReduce.matches || !target || typeof Element.prototype.animate !== 'function') return Promise.resolve();
    const inView = (r) => r.width > 0 && r.bottom > 0 && r.top < window.innerHeight;
    let from = img ? img.getBoundingClientRect() : null;
    if (!from || !inView(from)) from = fallback.getBoundingClientRect();
    const to = target.getBoundingClientRect();
    const size = 64;
    const x0 = from.left + from.width / 2 - size / 2;
    const y0 = from.top + from.height / 2 - size / 2;
    const x1 = to.left + to.width / 2 - size / 2;
    const y1 = to.top + to.height / 2 - size / 2;
    const lift = Math.min(160, Math.abs(y0 - y1) * 0.35 + 60);
    const dot = document.createElement('div');
    dot.className = 'zd-fly';
    dot.setAttribute('aria-hidden', 'true');
    if (img && img.currentSrc) dot.innerHTML = `<img src="${escapeHtml(img.currentSrc)}" alt="">`;
    document.body.appendChild(dot);
    const anim = dot.animate(
      [
        { transform: `translate(${x0}px, ${y0}px) scale(0.6)`, opacity: 0 },
        { transform: `translate(${x0}px, ${y0}px) scale(1)`, opacity: 1, offset: 0.12 },
        { transform: `translate(${(x0 + x1) / 2}px, ${Math.min(y0, y1) - lift}px) scale(0.75)`, opacity: 1, offset: 0.55 },
        { transform: `translate(${x1}px, ${y1}px) scale(0.18)`, opacity: 0.9 }
      ],
      { duration: 720, easing: 'cubic-bezier(0.45, 0, 0.25, 1)' }
    );
    return anim.finished.catch(() => {}).then(() => {
      dot.remove();
      const count = $('.zd-cart-btn [data-zd-cart-count]');
      if (count) {
        count.classList.remove('is-bumped');
        void count.offsetWidth;
        count.classList.add('is-bumped');
      }
    });
  }

  /* ---------------------------------------------------------------- Buy box */
  const buyBoxes = [];

  class BuyBox {
    constructor(el) {
      this.el = el;
      this.form = $('[data-zd-buy-form]', el);
      this.name = el.dataset.name || '';
      try {
        this.variants = JSON.parse($('[data-zd-variants]', el).textContent);
      } catch (e) {
        this.variants = [];
      }
      this.idInput = $('[data-zd-variant-id]', el);
      this.priceEl = $('[data-zd-price]', el);
      this.compareEl = $('[data-zd-compare]', el);
      this.stockEl = $('[data-zd-stock]', el);
      this.stockText = $('[data-zd-stock-text]', el);
      this.addBtn = $('[data-zd-add]', el);
      this.addLabel = $('[data-zd-add-label]', el);
      this.errorEl = $('[data-zd-error]', el);
      this.mainWrap = $('[data-zd-buy-main]', el);
      this.qtyInput = $('[data-zd-qty-input]', el);
      this.variant = this.variants.find((v) => String(v.id) === String(this.idInput && this.idInput.value)) || this.variants[0];
      this.listeners = new Set();

      this.form.addEventListener('change', (e) => {
        if (e.target.matches('[data-zd-option]')) this.onOptionChange();
      });
      this.form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.add(this.addBtn);
      });
      $$('[data-zd-qty-step]', el).forEach((b) =>
        b.addEventListener('click', () => {
          const v = Math.min(10, Math.max(1, (Number(this.qtyInput.value) || 1) + Number(b.dataset.zdQtyStep)));
          this.qtyInput.value = v;
        })
      );
      if (this.qtyInput) {
        this.qtyInput.addEventListener('change', () => {
          this.qtyInput.value = Math.min(10, Math.max(1, Math.round(Number(this.qtyInput.value) || 1)));
        });
      }
      $$('[data-zd-thumb]', el).forEach((t) =>
        t.addEventListener('click', () => {
          this.showImage({ src: t.dataset.src, srcset: t.dataset.srcset, alt: t.dataset.alt });
          $$('[data-zd-thumb]', el).forEach((x) => x.classList.toggle('is-active', x === t));
        })
      );
      this.markAvailability();
    }

    selectedOptions() {
      const opts = [];
      $$('[data-zd-option]', this.form).forEach((input) => {
        const i = Number(input.dataset.zdOption);
        if (input.type === 'radio') {
          if (input.checked) opts[i] = input.value;
        } else {
          opts[i] = input.value;
        }
      });
      return opts;
    }

    onOptionChange() {
      const opts = this.selectedOptions();
      const match = this.variants.find((v) => v.options.every((o, i) => opts[i] === undefined || o === opts[i]));
      $$('[data-zd-option-current]', this.form).forEach((el) => {
        el.textContent = opts[Number(el.dataset.zdOptionCurrent)] || '';
      });
      this.setVariant(match || null);
    }

    setVariant(variant) {
      this.variant = variant;
      this.hideError();
      if (!variant) {
        this.addBtn.disabled = true;
        this.addLabel.textContent = S.unavailable;
        this.setStock(false, S.unavailable);
        this.emit();
        return;
      }
      this.idInput.value = variant.id;
      this.priceEl.textContent = variant.price;
      if (this.compareEl) {
        this.compareEl.hidden = !variant.compare;
        if (variant.compare) this.compareEl.textContent = variant.compare;
      }
      this.addBtn.disabled = !variant.available;
      this.addLabel.textContent = variant.available ? S.add : S.soldOut;
      this.setStock(variant.available, variant.available ? S.available : S.soldOut);
      if (variant.image) {
        this.showImage(variant.image);
        $$('[data-zd-thumb]', this.el).forEach((t) => t.classList.toggle('is-active', t.dataset.src === variant.image.src));
      }
      this.emit();
    }

    setStock(available, text) {
      if (!this.stockEl) return;
      this.stockEl.dataset.state = available ? 'in' : 'out';
      this.stockText.textContent = text;
    }

    markAvailability() {
      const optionInputs = $$('input[type="radio"][data-zd-option]', this.form);
      const optionCount = this.variants[0] ? this.variants[0].options.length : 0;
      if (optionCount !== 1) return;
      optionInputs.forEach((input) => {
        const v = this.variants.find((x) => x.options[0] === input.value);
        const label = input.nextElementSibling;
        if (label) label.classList.toggle('is-unavailable', !v || !v.available);
      });
    }

    showImage(image) {
      if (!this.mainWrap || !image || !image.src) return;
      const img = $('img', this.mainWrap);
      if (!img || img.getAttribute('src') === image.src) return;
      const swap = () => {
        img.removeAttribute('sizes');
        if (image.srcset) {
          img.srcset = image.srcset;
          img.sizes = '(min-width: 990px) 34vw, 92vw';
        } else {
          img.removeAttribute('srcset');
        }
        img.src = image.src;
        if (image.alt) img.alt = image.alt;
        const reveal = () => this.mainWrap.classList.remove('is-swapping');
        if (img.complete) requestAnimationFrame(reveal);
        else img.addEventListener('load', reveal, { once: true });
        img.addEventListener('error', reveal, { once: true });
      };
      if (mqReduce.matches) return swap();
      this.mainWrap.classList.add('is-swapping');
      setTimeout(swap, 140);
    }

    hideError() {
      if (this.errorEl) {
        this.errorEl.hidden = true;
        this.errorEl.textContent = '';
      }
    }

    getState() {
      const v = this.variant;
      return {
        name: this.name,
        variantTitle: v && this.variants.length > 1 ? v.title : v ? v.title : '',
        price: v ? v.price : '',
        available: Boolean(v && v.available),
        id: v ? v.id : null
      };
    }

    onChange(fn) { this.listeners.add(fn); }
    emit() { this.listeners.forEach((fn) => fn(this)); }

    async add(button) {
      const v = this.variant;
      if (!v || !v.available || button.dataset.state === 'loading') return;
      const qty = this.qtyInput && button === this.addBtn ? this.qtyInput.value : 1;
      const label = $('.zd-btn__label', button);
      const idle = label ? label.textContent : '';
      this.hideError();
      button.dataset.state = 'loading';
      button.setAttribute('aria-busy', 'true');
      if (label) label.dataset.idle = idle;
      try {
        const added = await Cart.add(v.id, qty);
        const key = added && added.items && added.items[0] ? added.items[0].key : null;
        button.dataset.state = 'added';
        button.removeAttribute('aria-busy');
        if (cartStatus) cartStatus.textContent = `${this.name} añadido al carrito.`;
        const flight = flyToCart(this.mainWrap && $('img', this.mainWrap), button);
        await refreshCart(key);
        await flight;
        setTimeout(() => {
          if (cartSheet) cartSheet.open(button);
        }, mqReduce.matches ? 0 : 160);
        setTimeout(() => {
          delete button.dataset.state;
        }, 1600);
      } catch (err) {
        delete button.dataset.state;
        button.removeAttribute('aria-busy');
        const msg = err && err.status === 422 ? err.message : S.error;
        if (this.errorEl) {
          this.errorEl.textContent = msg;
          this.errorEl.hidden = false;
        }
        bar.showError(msg, this);
      }
    }
  }

  $$('[data-zd-buy]').forEach((el) => buyBoxes.push(new BuyBox(el)));

  /* ------------------------------------------------------ Mobile sticky bar */
  const bar = (() => {
    const el = $('[data-zd-bar]');
    const api = { update() {}, showError() {} };
    if (!el || !buyBoxes.length) return api;
    const nameEl = $('[data-zd-bar-name]', el);
    const variantEl = $('[data-zd-bar-variant]', el);
    const priceEl = $('[data-zd-bar-price]', el);
    const btn = $('[data-zd-bar-add]', el);
    const btnLabel = $('[data-zd-bar-label]', el);
    let active = null;
    const visibleForms = new Set();
    const chapterOf = new Map();
    buyBoxes.forEach((b) => chapterOf.set(b.el.closest('[data-zd-chapter]'), b));

    const render = () => {
      if (!active) return;
      const st = active.getState();
      nameEl.textContent = st.name;
      variantEl.textContent = st.variantTitle && active.variants.length > 1 ? st.variantTitle : '';
      priceEl.textContent = st.price;
      btn.disabled = !st.available;
      btnLabel.textContent = st.available ? 'Añadir' : S.soldOut;
    };
    api.update = () => {
      const show = Boolean(active) && !visibleForms.has(active) && !mqDesktop.matches && !(cartSheet && cartSheet.isOpen) && !(menuSheet && menuSheet.isOpen);
      el.classList.toggle('is-visible', show);
      el.toggleAttribute('inert', !show);
      el.setAttribute('aria-hidden', show ? 'false' : 'true');
      if (show) render();
    };
    api.showError = (msg, box) => {
      if (box === active && el.classList.contains('is-visible')) btnLabel.textContent = 'Reintentar';
    };
    buyBoxes.forEach((b) => b.onChange(() => { if (b === active) render(); }));

    const chapterIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const box = chapterOf.get(entry.target);
          if (!box) return;
          if (entry.isIntersecting) active = box;
          else if (active === box) active = null;
        });
        api.update();
      },
      { rootMargin: '-45% 0px -45% 0px' }
    );
    chapterOf.forEach((_, ch) => ch && chapterIO.observe(ch));

    const formIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const box = buyBoxes.find((b) => b.form === entry.target);
          if (!box) return;
          if (entry.isIntersecting) visibleForms.add(box);
          else visibleForms.delete(box);
        });
        api.update();
      },
      { threshold: 0.15 }
    );
    buyBoxes.forEach((b) => formIO.observe(b.form));

    btn.addEventListener('click', () => active && active.add(btn));
    mqDesktop.addEventListener('change', api.update);
    return api;
  })();

  /* ---------------------------------------------------------------- Header */
  const header = $('[data-zd-header]');
  if (header) {
    const onScroll = () => header.classList.toggle('is-solid', window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    const links = $$('[data-zd-nav-link]', header);
    const targets = links.map((a) => document.getElementById((a.getAttribute('href') || '').slice(1))).filter(Boolean);
    if (targets.length) {
      const navIO = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            links.forEach((a) => a.classList.toggle('is-current', a.getAttribute('href') === `#${entry.target.id}`));
          });
        },
        { rootMargin: '-50% 0px -50% 0px' }
      );
      targets.forEach((t) => navIO.observe(t));
    }
  }

  /* ---------------------------------------------------------------- Search */
  // The header pill appears once you scroll past the hero. "/" or Ctrl/⌘ K opens the palette
  // from anywhere. Results come instantly from the Liquid index; Shopify's predictive search
  // adds anything the index missed. Products with a chapter on this page scroll to it.
  (() => {
    const dialog = $('[data-zd-search]');
    const input = dialog && $('[data-zd-search-input]', dialog);
    if (!dialog || !input) return;
    const list = $('[data-zd-search-list]', dialog);
    const heading = $('[data-zd-search-heading]', dialog);
    const empty = $('[data-zd-search-empty]', dialog);
    const status = $('[data-zd-search-status]', dialog);
    const all = $('[data-zd-search-all]', dialog);
    const allText = $('[data-zd-search-all-text]', dialog);
    const form = $('[data-zd-search-form]', dialog);
    const searchUrl = (form && form.getAttribute('action')) || '/search';
    const suggestUrl = (ZD.routes && ZD.routes.predictiveSearch) || '/search/suggest';

    const fold = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    let index = [];
    try {
      index = JSON.parse($('[data-zd-search-index]').textContent).map((p) => ({ ...p, hay: fold(`${p.name} ${p.sub} ${p.words}`), title: fold(`${p.name} ${p.sub}`) }));
    } catch (e) {
      index = [];
    }
    const chapterFor = (handle) => $(`[data-zd-chapter][data-zd-handle="${CSS.escape(handle)}"]`);

    let results = [];
    let active = -1;
    let seq = 0;
    let timer = 0;

    const sheet = makeSheet(dialog, {
      onOpen: () => {
        list.classList.add('is-intro');
        render(input.value);
        setTimeout(() => input.focus(), 0);
        setTimeout(() => list.classList.remove('is-intro'), 700);
      }
    });
    if (!sheet) return;

    function score(p, terms) {
      let s = 0;
      for (const t of terms) {
        if (!p.hay.includes(t)) return 0;
        s += p.title.includes(t) ? (p.title.split(/\s+/).some((w) => w.startsWith(t)) ? 4 : 3) : 1;
      }
      return s;
    }

    function localSearch(q) {
      const terms = fold(q).split(/\s+/).filter(Boolean);
      if (!terms.length) return index.slice();
      return index
        .map((p) => ({ p, s: score(p, terms) }))
        .filter((r) => r.s > 0)
        .sort((a, b) => b.s - a.s)
        .map((r) => r.p);
    }

    function setActive(i) {
      const items = $$('[role="option"]', list);
      active = items.length ? (i + items.length) % items.length : -1;
      items.forEach((el, n) => el.setAttribute('aria-selected', n === active ? 'true' : 'false'));
      if (active > -1) {
        input.setAttribute('aria-activedescendant', items[active].id);
        items[active].scrollIntoView({ block: 'nearest' });
      } else {
        input.removeAttribute('aria-activedescendant');
      }
    }

    function draw(q) {
      const query = q.trim();
      heading.textContent = query ? 'Resultados' : 'Nuestros objetos';
      list.innerHTML = results
        .map((p, i) => {
          const price = p.price ? `<span class="zd-search__price">${p.from ? 'Desde ' : ''}${escapeHtml(p.price)}</span>` : '';
          const img = p.image ? `<img src="${escapeHtml(p.image)}" alt="" width="56" height="56" loading="lazy">` : '';
          const here = chapterFor(p.handle) ? '<span class="zd-search__here">En esta página</span>' : '';
          return `<li class="zd-search__item" role="option" id="zd-search-opt-${i}" aria-selected="false" data-i="${i}" style="--i:${i}">
            <span class="zd-search__thumb">${img}</span>
            <span class="zd-search__text"><span class="zd-search__name">${escapeHtml(p.name)}</span><span class="zd-search__sub">${escapeHtml(p.sub || '')}</span></span>
            <span class="zd-search__meta">${price}${here}</span>
          </li>`;
        })
        .join('');
      empty.hidden = results.length > 0;
      if (!results.length) empty.textContent = `Nada coincide con «${query}». Prueba con otra palabra o mira todo el catálogo.`;
      all.hidden = !query;
      if (query) {
        all.href = `${searchUrl}?q=${encodeURIComponent(query)}&type=product`;
        allText.textContent = `Buscar «${query}» en toda la tienda`;
      }
      status.textContent = query ? (results.length === 1 ? '1 resultado' : `${results.length} resultados`) : '';
      setActive(query && results.length ? 0 : -1);
    }

    async function remote(q, ticket) {
      try {
        const res = await fetch(`${suggestUrl}.json?q=${encodeURIComponent(q)}&resources[type]=product&resources[limit]=6`, { headers: { Accept: 'application/json' } });
        if (!res.ok || ticket !== seq) return;
        const data = await res.json();
        const found = (data.resources && data.resources.results && data.resources.results.products) || [];
        if (ticket !== seq) return;
        let changed = false;
        found.forEach((r) => {
          if (results.some((p) => p.handle === r.handle)) return;
          const local = index.find((p) => p.handle === r.handle);
          const parts = String(r.title || '').split(' · ');
          const price = r.price != null ? formatMoney(Math.round(parseFloat(r.price) * 100)) : '';
          results.push(local || { handle: r.handle, name: parts[0], sub: parts[1] || '', url: r.url, price, image: r.image || (r.featured_image && r.featured_image.url) || null });
          changed = true;
        });
        if (changed) draw(q);
      } catch (e) {
        /* offline or not available: the local index already answered */
      }
    }

    function render(q) {
      const ticket = ++seq;
      results = localSearch(q);
      draw(q);
      clearTimeout(timer);
      if (q.trim().length > 1) timer = setTimeout(() => remote(q.trim(), ticket), 180);
    }

    function go(p) {
      if (!p) return;
      const chapter = chapterFor(p.handle);
      if (chapter && chapter.id) {
        sheet.close(() => scrollToHash(`#${chapter.id}`));
      } else {
        window.location.href = p.url;
      }
    }

    input.addEventListener('input', () => render(input.value));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
      else if (e.key === 'Enter' && active > -1 && results[active]) { e.preventDefault(); go(results[active]); }
      else if (e.key === 'Escape') { e.preventDefault(); sheet.close(); }
    });
    form.addEventListener('submit', (e) => {
      if (!input.value.trim()) e.preventDefault();
    });
    list.addEventListener('click', (e) => {
      const li = e.target.closest('[role="option"]');
      if (li) go(results[Number(li.dataset.i)]);
    });
    list.addEventListener('pointermove', (e) => {
      const li = e.target.closest('[role="option"]');
      if (li && Number(li.dataset.i) !== active && e.pointerType === 'mouse') setActive(Number(li.dataset.i));
    });
    $$('[data-zd-search-chip]', dialog).forEach((chip) =>
      chip.addEventListener('click', () => {
        input.value = chip.dataset.zdSearchChip;
        render(input.value);
        input.focus();
      })
    );
    $$('[data-zd-search-close]', dialog).forEach((b) => b.addEventListener('click', () => sheet.close()));
    $$('[data-zd-search-open]').forEach((b) => b.addEventListener('click', () => sheet.open(b)));

    document.addEventListener('keydown', (e) => {
      if (sheet.isOpen || e.defaultPrevented || e.altKey) return;
      const t = e.target;
      const typing = t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName));
      const isSlash = e.key === '/' && !e.ctrlKey && !e.metaKey && !typing;
      const isK = (e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey);
      if (!isSlash && !isK) return;
      if ($('dialog[open]')) return;
      e.preventDefault();
      sheet.open($('[data-zd-search-open]'));
    });

    // Reveal the header pill once the hero has scrolled away.
    const hero = $('[data-zd-hero]');
    if (header) {
      const reveal = () => {
        const limit = hero ? hero.offsetTop + hero.offsetHeight * 0.6 : window.innerHeight * 0.6;
        header.classList.toggle('is-searchable', window.scrollY > limit);
      };
      reveal();
      window.addEventListener('scroll', reveal, { passive: true });
      window.addEventListener('resize', reveal, { passive: true });
    }
  })();

  /* --------------------------------------------------------------- Chooser */
  $$('[data-zd-chooser]').forEach((root) => {
    const tablist = $('[data-zd-tabs]', root);
    const tabs = tablist ? $$('[role="tab"]', tablist) : [];
    const panels = $$('[data-zd-panel]', root);
    if (!tabs.length) return;
    const select = (tab, focus) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
      });
      panels.forEach((p) => (p.hidden = p.id !== tab.getAttribute('aria-controls')));
      if (focus) tab.focus();
    };
    const setup = () => {
      if (mqDesktop.matches) {
        tablist.hidden = true;
        panels.forEach((p) => (p.hidden = false));
        panels.forEach((p) => p.removeAttribute('role'));
      } else {
        tablist.hidden = false;
        panels.forEach((p) => p.setAttribute('role', 'tabpanel'));
        select(tabs.find((t) => t.getAttribute('aria-selected') === 'true') || tabs[0]);
      }
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(t));
      t.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'Home' && e.key !== 'End') return;
        e.preventDefault();
        let n = i;
        if (e.key === 'ArrowRight') n = (i + 1) % tabs.length;
        if (e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
        if (e.key === 'Home') n = 0;
        if (e.key === 'End') n = tabs.length - 1;
        select(tabs[n], true);
      });
    });
    setup();
    mqDesktop.addEventListener('change', setup);
  });

  /* ---------------------------------------------------------------- Videos */
  const videos = $$('[data-zd-video]');
  if (videos.length) {
    const playable = () => !mqReduce.matches;
    const videoIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const v = entry.target;
          if (entry.isIntersecting && playable()) {
            if (v.preload !== 'auto') v.preload = 'auto';
            const p = v.play();
            if (p && p.catch) p.catch(() => {});
          } else {
            v.pause();
          }
        });
      },
      { threshold: 0.25 }
    );
    videos.forEach((v) => {
      if (!playable()) v.controls = true;
      videoIO.observe(v);
    });
  }

  /* ------------------------------------------------- TermoCalm tension */
  $$('[data-zd-tension]').forEach((root) => {
    const levels = Number(root.dataset.levels) || 9;
    const states = (root.dataset.states || '').split('|');
    const levelEl = $('[data-zd-tension-level]', root);
    const stateEl = $('[data-zd-tension-state]', root);
    const bars = $$('.zd-tension__bar li', root);
    const knots = $$('.zd-t-knot', root);
    let lastLevel = 0;
    let lastState = -1;
    const update = (pos) => {
      const warm = (100 - pos) / 100; // share of the illustration already warmed up
      const level = Math.max(1, Math.round(1 + warm * (levels - 1)));
      if (level !== lastLevel) {
        lastLevel = level;
        levelEl.textContent = level;
        bars.forEach((b, i) => b.classList.toggle('is-on', i < level));
      }
      const idx = warm < 0.34 ? 0 : warm < 0.67 ? 1 : 2;
      if (idx !== lastState && states[idx]) {
        lastState = idx;
        stateEl.textContent = states[idx];
        stateEl.classList.remove('is-changing');
        void stateEl.offsetWidth;
        stateEl.classList.add('is-changing');
      }
      knots.forEach((k) => (k.style.opacity = String(1 - warm * 0.7)));
    };
    root.addEventListener('zd:compare', (e) => update(e.detail));
  });

  /* ------------------------------------------------------- Before / after */
  $$('[data-zd-compare]').forEach((root) => {
    const stage = $('[data-zd-compare-stage]', root);
    const after = $('[data-zd-compare-after]', root);
    const handle = $('[data-zd-compare-handle]', root);
    const range = $('[data-zd-compare-range]', root);
    const labels = $$('.zd-compare__tag', root).map((t) => t.textContent.trim());
    if (!stage || !after || !handle || !range) return;
    let pos = 50;
    let width = stage.clientWidth;
    let dragging = false;
    let touched = false;

    const render = () => {
      after.style.clipPath = `inset(0 0 0 ${pos}%)`;
      handle.style.transform = `translateX(${(width * pos) / 100}px)`;
    };
    const set = (value, fromRange) => {
      pos = Math.min(100, Math.max(0, value));
      render();
      root.dispatchEvent(new CustomEvent('zd:compare', { detail: pos, bubbles: true }));
      if (!fromRange) range.value = Math.round(pos);
      range.setAttribute('aria-valuetext', `${Math.round(pos)} % ${labels[0] || ''}, ${Math.round(100 - pos)} % ${labels[1] || ''}`);
    };
    const fromEvent = (e) => {
      const r = stage.getBoundingClientRect();
      return ((e.clientX - r.left) / r.width) * 100;
    };

    // Mouse: grab immediately. Touch/pen: only once the gesture is clearly horizontal,
    // so a vertical swipe across the slider still scrolls the page untouched.
    let start = null;
    const begin = (e) => {
      dragging = true;
      touched = true;
      root.classList.add('is-dragging');
      try { stage.setPointerCapture(e.pointerId); } catch (err) { /* already released */ }
      set(fromEvent(e));
    };
    stage.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      if (e.pointerType === 'mouse') begin(e);
      else start = { x: e.clientX, y: e.clientY, id: e.pointerId };
    });
    stage.addEventListener('pointermove', (e) => {
      if (dragging) return set(fromEvent(e));
      if (!start || e.pointerId !== start.id) return;
      const dx = Math.abs(e.clientX - start.x);
      const dy = Math.abs(e.clientY - start.y);
      if (dx > 6 && dx > dy) begin(e);
      else if (dy > 6) start = null;
    });
    const end = (e) => {
      // A clean tap (no movement) moves the handle there.
      if (!dragging && start && e && e.type === 'pointerup' && e.pointerId === start.id) {
        touched = true;
        set(fromEvent(e));
      }
      start = null;
      dragging = false;
      root.classList.remove('is-dragging');
    };
    stage.addEventListener('pointerup', end);
    stage.addEventListener('pointercancel', end);
    range.addEventListener('input', () => {
      touched = true;
      set(Number(range.value), true);
    });
    new ResizeObserver(() => {
      width = stage.clientWidth;
      render();
    }).observe(stage);
    set(50);

    // One gentle hint the first time it comes into view, so people know it moves.
    if (!mqReduce.matches) {
      const io = new IntersectionObserver(
        (entries) => {
          if (!entries[0].isIntersecting) return;
          io.disconnect();
          if (touched || typeof window.gsap === 'undefined') return;
          const state = { p: 50 };
          window.gsap
            .timeline({ delay: 0.3, onUpdate: () => !touched && set(state.p) })
            .to(state, { p: 34, duration: 0.7, ease: 'power2.inOut' })
            .to(state, { p: 50, duration: 0.8, ease: 'expo.out' });
        },
        { threshold: 0.6 }
      );
      io.observe(stage);
    }
  });

  /* ================================================================ Motion */
  const hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';

  function finishIntro() {
    html.classList.remove('zd-intro');
    try { sessionStorage.setItem('zd-intro', '1'); } catch (e) { /* private mode */ }
  }

  function runIntro() {
    return new Promise((resolve) => {
      const pre = $('[data-zd-preloader]');
      if (!html.classList.contains('zd-intro') || !pre || !hasGsap) {
        finishIntro();
        resolve();
        return;
      }
      const { gsap } = window;
      const body = $('.zd-preloader__symbol .zd-logo__body', pre);
      const dot = $('.zd-preloader__symbol .zd-logo__dot', pre);
      const word = $('.zd-preloader__word', pre);
      let len = 3000;
      try { len = body.getTotalLength(); } catch (e) { /* not rendered */ }

      gsap.set(body, { attr: { 'stroke-dasharray': len, 'stroke-dashoffset': len, stroke: 'currentColor', 'stroke-width': 10 }, fillOpacity: 0 });
      gsap.set(dot, { opacity: 0, scale: 0.6, transformOrigin: '50% 50%' });
      gsap.set(word, { clipPath: 'inset(0% 100% 0% 0%)' });

      let released = false;
      const release = () => {
        if (released) return;
        released = true;
        finishIntro();
        resolve();
      };
      const tl = gsap.timeline({
        defaults: { ease: 'expo.out' },
        onComplete: () => {
          release();
          pre.remove();
        }
      });
      tl.to(body, { attr: { 'stroke-dashoffset': 0 }, duration: 0.6, ease: 'power2.inOut' })
        .to(body, { fillOpacity: 1, duration: 0.3, ease: 'power1.out' }, 0.42)
        .to(dot, { opacity: 1, scale: 1, duration: 0.45 }, 0.38)
        .to(word, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.6 }, 0.3)
        .to(pre, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.6, ease: 'expo.inOut' }, 0.95)
        // The hero starts entering while the curtain is still lifting.
        .call(release, null, 1.15);

      const skip = () => tl.progress(1);
      ['keydown', 'pointerdown', 'wheel', 'touchstart'].forEach((ev) => window.addEventListener(ev, skip, { once: true, passive: true }));
      // Hard cap: never longer than ~1.6s.
      setTimeout(skip, 1700);
    });
  }

  function initLenis() {
    if (!hasGsap || typeof window.Lenis === 'undefined' || !mqFine.matches || mqReduce.matches || designMode) return;
    const { gsap, ScrollTrigger } = window;
    const lenis = new window.Lenis({ duration: 1.05, easing: (t) => 1 - Math.pow(1 - t, 3.2), smoothWheel: true, syncTouch: false });
    window.zdLenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  function initMotion(introDone) {
    if (!hasGsap) {
      html.classList.remove('zd-hero-pending');
      return;
    }
    const { gsap, ScrollTrigger } = window;
    const SplitText = window.SplitText;
    gsap.registerPlugin(ScrollTrigger);
    if (SplitText) gsap.registerPlugin(SplitText);
    ScrollTrigger.config({ ignoreMobileResize: true });
    html.classList.add('zd-js-motion');

    const mm = gsap.matchMedia();

    mm.add(
      {
        isDesktop: '(min-width: 990px)',
        isMobile: '(max-width: 989px)',
        reduce: '(prefers-reduced-motion: reduce)'
      },
      (context) => {
        const { isDesktop, reduce } = context.conditions;

        /* ---------- Reduced motion: opacity only, no pins, no parallax ---------- */
        if (reduce || designMode) {
          html.classList.remove('zd-hero-pending');
          ScrollTrigger.batch('[data-zd-fade], [data-zd-lines], [data-zd-mask]', {
            start: 'top 92%',
            once: true,
            onEnter: (els) => gsap.fromTo(els, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'none', stagger: 0.04 })
          });
          return;
        }

        const R = isDesktop ? 28 : 20;

        /* ---------- Hero entrance ---------- */
        const hero = $('[data-zd-hero]');
        if (hero) {
          const intro = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } });
          intro.from($$('[data-zd-hero-title] .zd-mask__in', hero), { yPercent: 110, duration: 1.1, stagger: 0.07 }, 0.05);

          const pieces = $$('[data-zd-piece] .zd-piece__frame', hero);
          intro
            .fromTo(
              pieces,
              { clipPath: `inset(100% 0% 0% 0% round ${R}px)` },
              { clipPath: `inset(0% 0% 0% 0% round ${R}px)`, duration: 1.2, stagger: 0.08, clearProps: 'clipPath' },
              0.15
            )
            .from($$('.zd-piece__img', hero), { scale: 1.14, duration: 1.6, stagger: 0.08 }, 0.15)
            .from($$('.zd-piece__caption, [data-zd-fade]', hero), { opacity: 0, y: 14, duration: 0.8, stagger: 0.06 }, 0.55);
          intro.progress(0.0001).pause();
          html.classList.remove('zd-hero-pending');
          Promise.resolve(introDone).then(() => intro.play(0));

          // Subtle depth on the wall while leaving the hero.
          $$('[data-zd-parallax]', hero).forEach((frame) => {
            const amount = Number(frame.dataset.zdParallax) || 4;
            gsap.to(frame, {
              yPercent: -amount * (isDesktop ? 1.4 : 0.8),
              ease: 'none',
              scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true }
            });
          });
        }

        /* ---------- Rooms: pinned three-room sequence ---------- */
        $$('[data-zd-rooms]').forEach((section) => {
          const stage = $('[data-zd-rooms-stage]', section);
          const rooms = $$('[data-zd-room]', section);
          const tints = $$('[data-zd-tint]', section);
          const dots = $$('[data-zd-room-dot]', section);
          if (rooms.length < 2) return;
          section.classList.add('is-pinned');

          const exhibit = `inset(0% 0% 0% 0% round ${R}px)`;
          const small = isDesktop ? `inset(30% 26% 30% 26% round ${R * 4}px)` : `inset(28% 18% 28% 18% round ${R * 3}px)`;
          const gone = `inset(0% 0% 100% 0% round ${R}px)`;

          const titleLines = (i) => $$('[data-zd-room-title] .zd-mask__in', rooms[i]);

          rooms.forEach((room, i) => {
            const frame = $('[data-zd-room-frame]', room);
            const media = $('[data-zd-room-media]', room);
            const label = $('[data-zd-room-label]', room);
            gsap.set(frame, { clipPath: i === 0 ? exhibit : small });
            gsap.set(media, { scale: i === 0 ? 1 : 1.22 });
            gsap.set(room, { opacity: i === 0 ? 1 : 0, pointerEvents: i === 0 ? 'auto' : 'none' });
            if (i > 0) {
              gsap.set(titleLines(i), { yPercent: 110 });
              gsap.set(label, { opacity: 0, y: 24 });
            }
          });
          tints.forEach((t, i) => gsap.set(t, { opacity: i === 0 ? 1 : 0 }));

          const tl = gsap.timeline({ defaults: { ease: 'none' } });
          tl.addLabel('room0').to({}, { duration: 0.35 });

          for (let i = 1; i < rooms.length; i++) {
            const prev = rooms[i - 1];
            const room = rooms[i];
            const at = `room${i}-start`;
            tl.addLabel(at);
            tl.to($('[data-zd-room-frame]', prev), { clipPath: gone, duration: 1, ease: 'power2.inOut' }, at)
              .to($('[data-zd-room-media]', prev), { yPercent: -12, duration: 1, ease: 'power2.inOut' }, at)
              .to(titleLines(i - 1), { yPercent: -110, duration: 0.6, ease: 'power2.out', stagger: 0.04 }, at)
              .to($('[data-zd-room-label]', prev), { opacity: 0, y: -16, duration: 0.5, ease: 'power2.out' }, at)
              .to(tints[i], { opacity: 1, duration: 0.9, ease: 'power1.inOut' }, `${at}+=0.2`)
              .set(room, { opacity: 1, pointerEvents: 'auto' }, `${at}+=0.3`)
              .to($('[data-zd-room-frame]', room), { clipPath: exhibit, duration: 1.1, ease: 'expo.out' }, `${at}+=0.35`)
              .to($('[data-zd-room-media]', room), { scale: 1, duration: 1.3, ease: 'expo.out' }, `${at}+=0.35`)
              .to(titleLines(i), { yPercent: 0, duration: 0.9, ease: 'expo.out', stagger: 0.05 }, `${at}+=0.55`)
              .to($('[data-zd-room-label]', room), { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out' }, `${at}+=0.7`)
              .set(prev, { opacity: 0, pointerEvents: 'none' })
              .addLabel(`room${i}`)
              .to({}, { duration: 0.35 });
          }

          const steps = rooms.length - 1;
          const roomsST = ScrollTrigger.create({
            trigger: section,
            start: 'top top',
            end: () => `+=${window.innerHeight * (isDesktop ? 1.3 : 1.05) * steps}`,
            pin: stage,
            pinSpacing: true,
            scrub: isDesktop ? 0.8 : 0.5,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            animation: tl,
            snap: {
              snapTo: 'labelsDirectional',
              duration: { min: 0.25, max: 0.8 },
              delay: 0.08,
              ease: 'power2.inOut'
            },
            onUpdate: (self) => {
              const p = self.progress * steps;
              dots.forEach((d, i) => {
                const local = gsap.utils.clamp(0, 1, p - i + 1);
                d.style.setProperty('--p', i === 0 ? 1 : local);
                d.classList.toggle('is-active', Math.round(p) === i);
              });
            },
            onToggle: (self) => header && header.classList.toggle('is-tinted', self.isActive)
          });

          // Keyboard and screen-reader users: focusing a room's link scrolls the sequence to it.
          const onFocus = (e) => {
            const i = rooms.findIndex((r) => r.contains(e.target));
            if (i < 0) return;
            const t = tl.labels[`room${i}`] / tl.duration();
            const y = roomsST.start + (roomsST.end - roomsST.start) * t;
            if (Math.abs(window.scrollY - y) < 4) return;
            if (window.zdLenis) window.zdLenis.scrollTo(y, { immediate: true });
            else window.scrollTo(0, y);
          };
          stage.addEventListener('focusin', onFocus);
          context.add(() => () => stage.removeEventListener('focusin', onFocus));
        });

        /* ---------- Pattern: expand ---------- */
        $$('[data-zd-expand]').forEach((wrap) => {
          const frame = $('[data-zd-expand-frame]', wrap);
          const media = $('[data-zd-expand-media]', wrap);
          const statement = $('[data-zd-expand-statement]', wrap);
          const from = isDesktop ? `inset(16% 24% 16% 24% round ${R}px)` : `inset(9% 6% 9% 6% round ${R}px)`;
          const tl = gsap.timeline({ defaults: { ease: 'none' } });
          tl.fromTo(frame, { clipPath: from }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', duration: 1 }, 0)
            .fromTo(media, { scale: 1.16 }, { scale: 1, duration: 1 }, 0);
          if (statement) tl.fromTo(statement, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' }, 0.62);
          ScrollTrigger.create({
            trigger: wrap,
            start: isDesktop ? 'top top' : 'top 80%',
            end: isDesktop ? '+=110%' : 'bottom 60%',
            pin: isDesktop,
            scrub: isDesktop ? 0.6 : 0.4,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            animation: tl
          });
        });

        /* ---------- Chapter headings and fades ---------- */
        $$('[data-zd-chapter] [data-zd-lines], .zd-ads [data-zd-lines], .zd-chooser [data-zd-lines], .zd-trust [data-zd-lines], .zd-gfaq [data-zd-lines]').forEach((el) => {
          if (!SplitText) return;
          SplitText.create(el, {
            type: 'lines',
            mask: 'lines',
            autoSplit: true,
            onSplit: (self) =>
              gsap.from(self.lines, {
                yPercent: 110,
                duration: 1,
                ease: 'expo.out',
                stagger: 0.08,
                scrollTrigger: { trigger: el, start: 'top 86%', once: true }
              })
          });
        });

        $$('[data-zd-mask]').forEach((el) => {
          gsap.from($$('.zd-mask__in', el), {
            yPercent: 110,
            duration: 1,
            ease: 'expo.out',
            stagger: 0.08,
            scrollTrigger: { trigger: el, start: 'top 88%', once: true }
          });
        });

        const fades = $$('[data-zd-fade]').filter((el) => !el.closest('[data-zd-hero]'));
        gsap.set(fades, { opacity: 0, y: 24 });
        ScrollTrigger.batch(fades, {
          start: 'top 90%',
          once: true,
          onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out', stagger: 0.07, overwrite: true })
        });

        /* ---------- Pattern: editorial ---------- */
        $$('[data-zd-parallax-inner]').forEach((inner) => {
          const img = $('img', inner);
          if (!img) return;
          gsap.fromTo(
            img,
            { yPercent: isDesktop ? -5 : -3 },
            {
              yPercent: isDesktop ? 5 : 3,
              ease: 'none',
              scrollTrigger: { trigger: inner.closest('figure') || inner, start: 'top bottom', end: 'bottom top', scrub: true }
            }
          );
        });
        $$('[data-zd-scale]').forEach((scale) => {
          gsap.from($$('.zd-scale__step', scale), {
            scaleY: 0.08,
            duration: 0.9,
            ease: 'expo.out',
            stagger: 0.05,
            scrollTrigger: { trigger: scale, start: 'top 82%', once: true }
          });
        });

        /* ---------- Pattern: collage depth ---------- */
        $$('[data-zd-collage] [data-zd-depth]').forEach((item) => {
          const depth = Number(item.dataset.zdDepth) || 0;
          gsap.to(item, {
            yPercent: -depth * (isDesktop ? 60 : 30),
            ease: 'none',
            scrollTrigger: { trigger: item.closest('[data-zd-collage]'), start: 'top bottom', end: 'bottom top', scrub: true }
          });
        });

        /* ---------- Magnetic primary CTA (desktop, fine pointer) ---------- */
        if (isDesktop && mqFine.matches) {
          $$('[data-zd-magnetic]').forEach((btn) => {
            const xTo = gsap.quickTo(btn, 'x', { duration: 0.4, ease: 'expo.out' });
            const yTo = gsap.quickTo(btn, 'y', { duration: 0.4, ease: 'expo.out' });
            const move = (e) => {
              const r = btn.getBoundingClientRect();
              xTo(((e.clientX - r.left) / r.width - 0.5) * 10);
              yTo(((e.clientY - r.top) / r.height - 0.5) * 8);
            };
            const leave = () => { xTo(0); yTo(0); };
            btn.addEventListener('pointermove', move);
            btn.addEventListener('pointerleave', leave);
            return () => {
              btn.removeEventListener('pointermove', move);
              btn.removeEventListener('pointerleave', leave);
            };
          });
        }

        /* ---------- Information bands: speed and direction follow the scroll ---------- */
        const bands = $$('[data-zd-marquee]').map((band) => {
          const track = $('[data-zd-marquee-track]', band);
          if (!track) return null;
          const dir = Number(band.dataset.direction) < 0 ? -1 : 1;
          const speed = parseFloat(getComputedStyle(band).getPropertyValue('--zd-marquee-speed')) || 45;
          band.classList.add('is-driven');
          const loop = gsap.fromTo(track, { xPercent: dir < 0 ? 0 : -50 }, { xPercent: dir < 0 ? -50 : 0, duration: speed, ease: 'none', repeat: -1, paused: true });
          loop.totalTime(speed * 400); // room to run backwards when you scroll up
          let settle = null;
          ScrollTrigger.create({
            trigger: band,
            start: 'top bottom',
            end: 'bottom top',
            onToggle: (self) => (self.isActive ? loop.play() : loop.pause()),
            onUpdate: (self) => {
              const boost = gsap.utils.clamp(1, 6, 1 + Math.abs(self.getVelocity()) / 300);
              const sign = self.direction;
              settle && settle.kill();
              gsap.to(loop, { timeScale: sign * boost, duration: 0.25, overwrite: true });
              settle = gsap.to(loop, { timeScale: sign, duration: 1.1, delay: 0.25, ease: 'power2.out' });
            }
          });
          return band;
        });

        /* ---------- Reading progress ---------- */
        const progress = document.createElement('div');
        progress.className = 'zd-progress';
        progress.setAttribute('aria-hidden', 'true');
        document.body.appendChild(progress);
        gsap.to(progress, { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } });

        /* ---------- Figures count up the first time they are seen ---------- */
        const figures = $$('.zd-feat__val')
          .filter((el) => /^\d{2,5}$/.test(el.textContent.trim()))
          .map((el) => {
            const raw = el.textContent.trim();
            el.style.display = 'inline-block';
            el.style.minWidth = `${el.getBoundingClientRect().width}px`;
            const o = { v: 0 };
            el.textContent = '0';
            ScrollTrigger.create({
              trigger: el,
              start: 'top 90%',
              once: true,
              onEnter: () =>
                gsap.to(o, {
                  v: Number(raw),
                  duration: 1.4,
                  ease: 'expo.out',
                  onUpdate: () => { el.textContent = String(Math.round(o.v)); },
                  onComplete: () => { el.textContent = raw; }
                })
            });
            return { el, raw };
          });

        /* ---------- Hero pieces lean towards the pointer (desktop, mouse) ---------- */
        const tilts = [];
        if (isDesktop && mqFine.matches) {
          $$('[data-zd-piece] .zd-piece__link').forEach((link) => {
            gsap.set(link, { transformPerspective: 900, transformOrigin: '50% 60%' });
            const rx = gsap.quickTo(link, 'rotationX', { duration: 0.7, ease: 'power3.out' });
            const ry = gsap.quickTo(link, 'rotationY', { duration: 0.7, ease: 'power3.out' });
            const move = (e) => {
              const r = link.getBoundingClientRect();
              ry(((e.clientX - r.left) / r.width - 0.5) * 9);
              rx(-((e.clientY - r.top) / r.height - 0.5) * 7);
            };
            const leave = () => { rx(0); ry(0); };
            link.addEventListener('pointermove', move);
            link.addEventListener('pointerleave', leave);
            tilts.push(() => {
              link.removeEventListener('pointermove', move);
              link.removeEventListener('pointerleave', leave);
            });
          });
        }

        return () => {
          $$('[data-zd-rooms]').forEach((s) => s.classList.remove('is-pinned'));
          header && header.classList.remove('is-tinted');
          bands.forEach((b) => b && b.classList.remove('is-driven'));
          progress.remove();
          figures.forEach(({ el, raw }) => { el.textContent = raw; el.style.display = ''; el.style.minWidth = ''; });
          tilts.forEach((off) => off());
        };
      }
    );

    // Keep trigger positions honest as images and fonts arrive.
    let refreshTimer = 0;
    const queueRefresh = () => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => ScrollTrigger.refresh(), 150);
    };
    $$('main img').forEach((img) => {
      if (!img.complete) img.addEventListener('load', queueRefresh, { once: true });
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(queueRefresh);
    window.addEventListener('load', queueRefresh, { once: true });
  }

  const start = () => {
    initLenis();
    const introDone = runIntro();
    initMotion(introDone);
    introDone.then(() => {
      if (location.hash) setTimeout(() => scrollToHash(location.hash), 60);
    });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  // Theme editor: re-measure after a section is edited.
  document.addEventListener('shopify:section:load', () => {
    if (hasGsap) window.ScrollTrigger.refresh();
  });
})();
