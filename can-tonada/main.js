(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Opening hours (Europe/Madrid). Day 0 = Sunday. [open, close] in minutes.
  const HOURS = {
    0: [12 * 60, 20 * 60],
    1: [9 * 60, 23 * 60], 2: [9 * 60, 23 * 60], 3: [9 * 60, 23 * 60],
    4: [9 * 60, 23 * 60], 5: [9 * 60, 23 * 60], 6: [9 * 60, 23 * 60]
  };
  const fmt = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

  const storage = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } }
  };

  let lang = storage.get('ct-lang') || ((navigator.language || '').toLowerCase().startsWith('ca') ? 'ca' : 'es');
  const t = () => window.UI[lang];

  /* ---------------- i18n ---------------- */
  const norm = (s) => s.replace(/\s+/g, ' ').trim();
  function applyLang(next) {
    lang = next;
    root.lang = lang;
    $$('[data-t]').forEach((el) => {
      if (el.dataset.es === undefined) el.dataset.es = norm(el.innerHTML);
      const es = el.dataset.es;
      el.innerHTML = lang === 'ca' ? (window.CA[es] ?? es) : es;
    });
    $$('.lang button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    document.title = t().pageTitle;
    $('.hero-title')?.setAttribute('aria-label', t().heroLabel);
    $('.burger')?.setAttribute('aria-label', menuOpen ? t().closeMenu : t().openMenu);
    renderStatus();
    markToday();
    fillTimes();
    requestAnimationFrame(moveInk);
    storage.set('ct-lang', lang);
  }
  $$('.lang button').forEach((b) => b.addEventListener('click', () => applyLang(b.dataset.lang)));

  /* ---------------- Madrid clock ---------------- */
  function madridNow() {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Madrid', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23'
    }).formatToParts(new Date());
    const get = (type) => parts.find((p) => p.type === type)?.value;
    const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
    return { day, mins: Number(get('hour')) * 60 + Number(get('minute')) };
  }

  function renderStatus() {
    const el = $('#status');
    if (!el) return;
    const { day, mins } = madridNow();
    const [open, close] = HOURS[day];
    let text;
    el.classList.remove('is-open', 'is-closed');
    if (mins >= open && mins < close) {
      text = t().openUntil(fmt(close));
      el.classList.add('is-open');
    } else if (mins < open) {
      text = t().closedOpensToday(fmt(open));
      el.classList.add('is-closed');
    } else {
      const next = (day + 1) % 7;
      text = t().closedOpensTomorrow(t().tomorrow, fmt(HOURS[next][0]));
      el.classList.add('is-closed');
    }
    $('.status-text', el).textContent = text;
  }

  function markToday() {
    const { day } = madridNow();
    $$('.hours tr').forEach((tr) => {
      const today = tr.dataset.days.split(',').map(Number).includes(day);
      tr.classList.toggle('is-today', today);
      const th = $('th', tr);
      if (today) th.dataset.today = t().today; else delete th.dataset.today;
    });
  }

  /* ---------------- Nav ---------------- */
  const nav = $('#nav');
  const hero = $('.hero');
  const actionbar = $('.actionbar');
  let pastHero = false;
  if (hero && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => {
      pastHero = !e.isIntersecting;
      nav.classList.toggle('is-solid', pastHero);
      actionbar?.classList.toggle('is-visible', pastHero);
    }, { rootMargin: `-${nav.offsetHeight}px 0px 0px 0px` }).observe(hero);
  }

  let lastY = scrollY;
  let ticking = false;
  addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = scrollY;
      const goingDown = y > lastY + 4;
      const goingUp = y < lastY - 4;
      if (pastHero && goingDown && !menuOpen) nav.classList.add('is-hidden');
      if (goingUp || !pastHero) nav.classList.remove('is-hidden');
      lastY = y;
      ticking = false;
    });
  }, { passive: true });
  // Never keep the nav hidden while it holds focus
  nav.addEventListener('focusin', () => nav.classList.remove('is-hidden'));

  /* ---------------- Mobile menu ---------------- */
  const burger = $('.burger');
  const menu = $('#menu');
  let menuOpen = false;
  function setMenu(open) {
    menuOpen = open;
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? t().closeMenu : t().openMenu);
    document.body.classList.toggle('menu-open', open);
    if (open) {
      menu.hidden = false;
      requestAnimationFrame(() => menu.classList.add('is-open'));
      nav.classList.remove('is-hidden');
      $('a', menu)?.focus({ preventScroll: true });
    } else {
      menu.classList.remove('is-open');
      const done = () => { if (!menuOpen) menu.hidden = true; };
      reduceMotion ? done() : setTimeout(done, 400);
    }
  }
  burger?.addEventListener('click', () => setMenu(!menuOpen));
  $$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menuOpen) { setMenu(false); burger.focus(); }
  });
  matchMedia('(min-width: 1081px)').addEventListener('change', (e) => { if (e.matches && menuOpen) setMenu(false); });

  /* ---------------- Reveal (once) ---------------- */
  const reveals = $$('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('in'));
  }

  /* ---------------- Moments: day → night ---------------- */
  const moments = $('#momentos');
  const steps = $$('.step', moments);
  const visuals = $$('.mv-img', moments);
  const counter = $('.mv-current', moments);
  function setMoment(i) {
    moments.dataset.moment = i;
    steps.forEach((s, k) => s.classList.toggle('is-active', k === i));
    visuals.forEach((v, k) => v.classList.toggle('is-active', k === i));
    if (counter) counter.textContent = String(i + 1).padStart(2, '0');
  }
  if (moments && 'IntersectionObserver' in window) {
    setMoment(0);
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) setMoment(Number(e.target.dataset.step)); });
    }, { rootMargin: '-45% 0px -45% 0px' });
    steps.forEach((s) => io.observe(s));
  }

  /* ---------------- Carta tabs ---------------- */
  const tablist = $('.tabs');
  const tabs = $$('[role="tab"]', tablist);
  const ink = $('.tabs-ink', tablist);
  const panels = tabs.map((tab) => document.getElementById(tab.getAttribute('aria-controls')));
  panels.forEach((p) => $$('.dish', p).forEach((d, i) => d.style.setProperty('--d', i)));

  function moveInk() {
    const active = tabs.find((x) => x.getAttribute('aria-selected') === 'true');
    if (!active || !ink) return;
    ink.style.setProperty('--ink-x', `${active.offsetLeft}px`);
    ink.style.setProperty('--ink-w', `${active.offsetWidth}px`);
  }
  function selectTab(tab, focus = false) {
    tabs.forEach((x, i) => {
      const on = x === tab;
      x.setAttribute('aria-selected', String(on));
      x.tabIndex = on ? 0 : -1;
      panels[i].hidden = !on;
      if (on) {
        panels[i].classList.remove('is-entering');
        void panels[i].offsetWidth;
        panels[i].classList.add('is-entering');
      }
    });
    if (focus) tab.focus();
    tab.scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
    moveInk();
  }
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', (e) => {
      let n = null;
      if (e.key === 'ArrowRight') n = (i + 1) % tabs.length;
      if (e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
      if (e.key === 'Home') n = 0;
      if (e.key === 'End') n = tabs.length - 1;
      if (n !== null) { e.preventDefault(); selectTab(tabs[n], true); }
    });
  });
  panels.forEach((p, i) => { p.hidden = i !== 0; });
  addEventListener('resize', moveInk);
  document.fonts?.ready.then(moveInk);

  /* ---------------- Reservation form ---------------- */
  const form = $('#reserve-form');
  const dateEl = $('#f-date');
  const timeEl = $('#f-time');
  const msg = $('#form-msg');

  function isoToday() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function fillTimes() {
    if (!timeEl) return;
    const prev = timeEl.value;
    const placeholder = timeEl.options[0];
    const day = dateEl.value ? new Date(`${dateEl.value}T12:00:00`).getDay() : null;
    const ranges = day === null ? [[9 * 60, 23 * 60]] : [HOURS[day]];
    timeEl.length = 1;
    placeholder.selected = true;
    ranges.forEach(([o, c]) => {
      for (let m = o; m <= c - 60; m += 30) timeEl.add(new Option(fmt(m), fmt(m)));
    });
    if ([...timeEl.options].some((o) => o.value === prev && prev)) timeEl.value = prev;
  }
  if (dateEl) {
    dateEl.min = isoToday();
    dateEl.addEventListener('change', fillTimes);
  }

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const fields = ['f-name', 'f-phone', 'f-date', 'f-time'].map((id) => document.getElementById(id));
    let ok = true;
    fields.forEach((f) => {
      const bad = !f.value.trim() || (f.id === 'f-date' && f.value < isoToday());
      f.classList.toggle('is-invalid', bad);
      f.setAttribute('aria-invalid', String(bad));
      if (bad) ok = false;
    });
    msg.classList.toggle('is-error', !ok);
    if (!ok) {
      msg.textContent = t().formMissing;
      fields.find((f) => f.classList.contains('is-invalid'))?.focus();
      return;
    }
    const data = Object.fromEntries(new FormData(form));
    const dateLabel = new Date(`${data.date}T12:00:00`).toLocaleDateString(lang === 'ca' ? 'ca-ES' : 'es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    const f = { ...data, date: dateLabel };
    const href = `mailto:restaurant@cantonada.cat?subject=${encodeURIComponent(t().mailSubject(f.name, f.date, f.time, f.people))}&body=${encodeURIComponent(t().mailBody(f))}`;
    msg.textContent = t().formOk;
    location.href = href;
  });
  form?.addEventListener('input', (e) => {
    if (e.target.classList.contains('is-invalid') && e.target.value.trim()) {
      e.target.classList.remove('is-invalid');
      e.target.removeAttribute('aria-invalid');
    }
  });

  /* ---------------- Footer wordmark: fit to width ---------------- */
  const word = $('.wordmark span');
  function fitWordmark() {
    if (!word) return;
    const box = word.parentElement;
    box.style.fontSize = '100px';
    const target = box.clientWidth * 0.92;
    box.style.fontSize = `${(100 * target) / word.offsetWidth}px`;
  }
  fitWordmark();
  addEventListener('resize', fitWordmark);
  document.fonts?.ready.then(fitWordmark);

  /* ---------------- Misc ---------------- */
  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  applyLang(lang);
  setInterval(renderStatus, 60 * 1000);
})();
