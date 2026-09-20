/* =========================================================
   José Luis Cantilo 5465 · Interacción
   ========================================================= */
(() => {
  'use strict';

  // Canal de contacto del formulario. Completá al menos uno.
  // whatsapp: número internacional sin "+" ni espacios, por ejemplo '5491155550000'.
  const CONTACT = { whatsapp: '5491132020548', email: 'constructorabflsrl@hotmail.com' };

  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const desktop = matchMedia('(min-width: 900px)');
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const lockScroll = on => { root.style.overflow = on ? 'hidden' : ''; };

  /* ---------- Titulares divididos en palabras ---------- */
  function splitWords(el) {
    const frag = document.createDocumentFragment();
    let i = 0;
    Array.from(el.childNodes).forEach(node => {
      if (node.nodeType !== 3) { frag.appendChild(node.cloneNode(true)); return; }
      node.textContent.split(/(\s+)/).forEach(part => {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
        const w = document.createElement('span');
        w.className = 'w';
        const s = document.createElement('span');
        s.textContent = part;
        s.style.setProperty('--i', i++);
        w.appendChild(s);
        frag.appendChild(w);
      });
    });
    el.textContent = '';
    el.appendChild(frag);
    el.classList.add('split');
  }
  $$('[data-split]').forEach(splitWords);

  /* ---------- Revelado al entrar en pantalla ---------- */
  const revealIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      revealIO.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  $$('[data-reveal], [data-split]:not([data-hero-split]), .reveal-img').forEach(el => revealIO.observe(el));

  /* ---------- Loader e intro ---------- */
  const loader = $('.loader');
  const t0 = performance.now();
  const heroImg = $('.hero-media img');
  const minShow = reduce ? 0 : 1250;
  const assetsReady = Promise.all([
    heroImg && heroImg.decode ? heroImg.decode().catch(() => {}) : null,
    document.fonts ? document.fonts.ready.catch(() => {}) : null,
  ]);
  function reveal() {
    lockScroll(false);
    root.classList.add('ready');
    if (loader) loader.classList.add('done');
    $$('[data-hero], [data-hero-split]').forEach(el => el.classList.add('in'));
    setTimeout(() => loader && loader.remove(), 1400);
  }
  // La portada con "Ver desarrollo" aparece siempre: ese clic es el gesto que habilita la música en todos los navegadores
  function showGate() {
    lockScroll(true);
    loader.classList.add('gate');
    loader.removeAttribute('aria-hidden');
    const enter = $('[data-enter]', loader);
    enter.addEventListener('click', () => { music.start(); reveal(); }, { once: true });
    enter.focus({ preventScroll: true });
  }
  Promise.race([assetsReady, new Promise(r => setTimeout(r, 3500))]).then(() => {
    setTimeout(() => (loader ? showGate() : reveal()), Math.max(0, minShow - (performance.now() - t0)));
  });

  /* ---------- Música de fondo ---------- */
  // Al abrir intenta sonar sola (si el navegador lo permite). La portada "Ver desarrollo" se muestra siempre y
  // su clic es el gesto que habilita el audio donde estaba bloqueado. Las barras del nav abren Play/Stop y volumen.
  const bgm = $('#bgm');
  const soundBtn = $('.sound-btn');
  const player = $('#player');
  const music = { decided: Promise.resolve('off'), start() {}, stop() {} };
  if (bgm && soundBtn && player) {
    const VOL_KEY = 'cantilo-volumen';
    const toggle = $('.player-toggle', player);
    const volInput = $('#vol', player);
    const volOut = $('output', player);
    let vol = 0.5, fadeRaf = 0, stopping = false, resume = false;
    try { const v = parseFloat(localStorage.getItem(VOL_KEY)); if (v >= 0 && v <= 1) vol = v; } catch (e) {}
    // iOS no deja cambiar el volumen desde la página (se usan los botones del teléfono): ahí se oculta el control
    const probe = new Audio();
    probe.volume = 0.5;
    if (probe.volume !== 0.5) $('.player-vol', player).hidden = true;

    const paint = () => {
      const on = !bgm.paused;
      soundBtn.classList.toggle('playing', on);
      player.classList.toggle('is-playing', on);
      toggle.setAttribute('aria-label', on ? 'Detener música' : 'Reproducir música');
    };
    const paintVol = () => {
      const pct = Math.round(vol * 100);
      volInput.value = pct;
      volInput.style.setProperty('--p', pct + '%');
      volInput.setAttribute('aria-valuetext', pct + ' %');
      volOut.textContent = pct;
    };
    const fadeTo = (target, ms, done) => {
      cancelAnimationFrame(fadeRaf);
      const from = bgm.volume, start = performance.now();
      const step = now => {
        const t = clamp((now - start) / ms);
        bgm.volume = lerp(from, target, t);
        if (t < 1) fadeRaf = requestAnimationFrame(step);
        else if (done) done();
      };
      fadeRaf = requestAnimationFrame(step);
    };
    const play = () => {
      stopping = false;
      if (!bgm.paused) { fadeTo(vol, 600); return Promise.resolve(); }
      bgm.volume = 0;
      return Promise.resolve(bgm.play()).then(() => fadeTo(vol, 2500));
    };
    // Stop de verdad: baja, pausa y vuelve al principio del tema
    const stop = () => {
      stopping = true;
      fadeTo(0, 400, () => { stopping = false; bgm.pause(); bgm.currentTime = 0; });
    };
    const setPlayer = open => {
      player.hidden = !open;
      soundBtn.setAttribute('aria-expanded', String(open));
    };

    soundBtn.addEventListener('click', () => setPlayer(player.hidden));
    toggle.addEventListener('click', () => (bgm.paused ? play().catch(() => {}) : stop()));
    volInput.addEventListener('input', () => {
      vol = clamp(volInput.value / 100);
      if (!bgm.paused && !stopping) { cancelAnimationFrame(fadeRaf); bgm.volume = vol; }
      paintVol();
      try { localStorage.setItem(VOL_KEY, String(vol)); } catch (e) {}
    });
    document.addEventListener('pointerdown', e => {
      if (!player.hidden && !player.contains(e.target) && !soundBtn.contains(e.target)) setPlayer(false);
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !player.hidden) { setPlayer(false); soundBtn.focus(); }
    });
    bgm.addEventListener('play', paint);
    bgm.addEventListener('pause', paint);
    // Al cambiar de pestaña (o abrir WhatsApp) se pausa, y vuelve al regresar
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (bgm.paused) return;
        cancelAnimationFrame(fadeRaf);
        bgm.pause();
        if (stopping) { stopping = false; bgm.currentTime = 0; } else resume = true;
      } else if (resume) { resume = false; play().catch(() => {}); }
    });

    paint();
    paintVol();
    music.start = () => { play().catch(() => {}); };
    music.stop = () => { if (!bgm.paused) stop(); };
    // Intento de arranque automático: 'playing', 'blocked' (el navegador pide un clic) o 'pending' (sigue cargando)
    const srcAttr = bgm.getAttribute('src') || '';
    const source = srcAttr.startsWith('data:')
      ? fetch(srcAttr).then(r => r.blob()).then(b => new Promise(res => {
          bgm.src = URL.createObjectURL(b);
          bgm.addEventListener('canplay', res, { once: true });
          setTimeout(res, 3000);
          bgm.load();
        })).catch(() => {})
      : Promise.resolve();
    music.decided = new Promise(resolve => {
      let settled = false;
      const done = s => { if (!settled) { settled = true; resolve(s); } };
      bgm.volume = 0;
      source.then(() => Promise.resolve(bgm.play()))
        .then(() => { fadeTo(vol, 2500); done('playing'); })
        .catch(err => done(err && err.name === 'NotAllowedError' ? 'blocked' : 'error'));
      setTimeout(() => done('pending'), 4000);
    });
  }

  /* ---------- Motor de scroll (un solo rAF) ---------- */
  const scrubs = [];
  const scrubIO = new IntersectionObserver(entries => {
    entries.forEach(e => { const s = scrubs.find(x => x.el === e.target); if (s) s.on = e.isIntersecting; });
    // Al entrar una sección (p. ej. tras un salto de ancla) se recalcula aunque el scroll ya esté quieto
    force = true;
  }, { rootMargin: '30% 0px 30% 0px' });

  function scrub(el, fn, mode = 'pin') {
    if (!el || reduce) return;
    const s = { el, fn, mode, on: false, last: -1 };
    scrubs.push(s);
    scrubIO.observe(el);
  }

  let vh = innerHeight, lastY = -1, force = true;
  const layoutFns = [];
  function onResize() { vh = innerHeight; layoutFns.forEach(f => f()); force = true; }
  addEventListener('resize', onResize, { passive: true });
  addEventListener('orientationchange', () => setTimeout(onResize, 250));

  function tick() {
    const y = scrollY;
    if (y !== lastY || force) {
      for (const s of scrubs) {
        if (!s.on && !force) continue;
        const r = s.el.getBoundingClientRect();
        let p;
        if (s.mode === 'pin') {
          const len = r.height - vh;
          p = len > 1 ? clamp(-r.top / len) : clamp((vh - r.top) / (vh + r.height));
        } else {
          p = clamp((vh - r.top) / (vh + r.height));
        }
        if (force || Math.abs(p - s.last) > 0.0002) { s.last = p; s.fn(p); }
      }
      navUpdate(y);
      lastY = y;
      force = false;
    }
    requestAnimationFrame(tick);
  }

  /* ---------- Navegación ---------- */
  const nav = $('#nav');
  const navProg = $('.nav-progress');
  const menu = $('#menu');
  const menuBtn = $('.menu-btn');
  let menuOpen = false, prevY = 0;

  function navUpdate(y) {
    nav.classList.toggle('scrolled', y > 24);
    const max = document.documentElement.scrollHeight - vh;
    navProg.style.transform = 'scaleX(' + (max > 0 ? clamp(y / max) : 0) + ')';
    if (!menuOpen) {
      if (y > vh * 0.9 && y > prevY + 4) nav.classList.add('hide');
      else if (y < prevY - 4 || y < vh * 0.5) nav.classList.remove('hide');
    }
    prevY = y;
  }

  function setMenu(open) {
    menuOpen = open;
    menu.hidden = !open;
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    lockScroll(open);
    if (open) nav.classList.remove('hide');
  }
  menuBtn.addEventListener('click', () => setMenu(!menuOpen));
  $$('#menu a').forEach(a => a.addEventListener('click', () => setMenu(false)));

  const navLinks = $$('.nav-links a');
  const sectionIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const key = e.target.dataset.nav;
      navLinks.forEach(a => a.classList.toggle('active', a.dataset.link === key));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('[data-nav]').forEach(s => sectionIO.observe(s));

  /* ---------- Hero ---------- */
  const hero = $('.hero');
  const heroPar = $('.hero-par');
  const heroMove = $('.hero-move');
  const heroContent = $('.hero-content');
  scrub(hero, p => {
    const q = clamp((p - 0.5) * 2);
    heroPar.style.transform = 'translate3d(0,' + (q * 16).toFixed(2) + '%,0) scale(' + (1 + q * 0.05).toFixed(4) + ')';
    heroContent.style.transform = 'translate3d(0,' + (-q * 90).toFixed(1) + 'px,0)';
    heroContent.style.opacity = (1 - smooth(0, 0.65, q)).toFixed(3);
  }, 'pass');

  if (!reduce && matchMedia('(pointer: fine)').matches) {
    let mx = 0, my = 0, cx = 0, cy = 0, moving = false;
    hero.addEventListener('pointermove', e => {
      mx = e.clientX / innerWidth - 0.5;
      my = e.clientY / innerHeight - 0.5;
      if (!moving) { moving = true; requestAnimationFrame(follow); }
    });
    function follow() {
      cx += (mx - cx) * 0.06;
      cy += (my - cy) * 0.06;
      heroMove.style.transform = 'translate3d(' + (-cx * 22).toFixed(2) + 'px,' + (-cy * 14).toFixed(2) + 'px,0)';
      if (Math.abs(mx - cx) + Math.abs(my - cy) > 0.001) requestAnimationFrame(follow); else moving = false;
    }
  }

  /* ---------- Parallax de imágenes ---------- */
  const arqImg = $('.arq-media img');
  scrub($('.arq-media'), p => { arqImg.style.transform = 'translate3d(0,' + ((p - 0.5) * -9).toFixed(2) + '%,0)'; }, 'pass');

  const matA = $('.mat-a'), matB = $('.mat-b');
  scrub($('[data-duo]'), p => {
    if (!desktop.matches) { matA.style.transform = ''; matB.style.transform = 'translate3d(0,' + ((p - 0.5) * -70).toFixed(1) + 'px,0)'; return; }
    matA.style.transform = 'translate3d(0,' + ((p - 0.5) * -70).toFixed(1) + 'px,0)';
    matB.style.transform = 'translate3d(0,' + ((p - 0.5) * -190).toFixed(1) + 'px,0)';
  }, 'pass');

  const cocImg = $('.coc-main img');
  scrub($('.coc-main'), p => { cocImg.style.transform = 'scale(' + lerp(1.14, 1, smooth(0, 0.55, p)).toFixed(4) + ')'; }, 'pass');

  const ctImg = $('.ct-media img');
  scrub($('.contacto'), p => { ctImg.style.transform = 'scale(' + lerp(1.16, 1, smooth(0, 0.6, p)).toFixed(4) + ')'; }, 'pass');

  /* ---------- Living que se expande + puntos de detalle ---------- */
  const expand = $('[data-expand]');
  const frameEl = $('.expand-frame', expand);
  const coverBox = $('.cover-box', expand);
  if (reduce) expand.classList.add('hs-on');
  scrub(expand, p => {
    if (!desktop.matches) {
      frameEl.style.clipPath = '';
      coverBox.style.removeProperty('--s');
      expand.classList.add('hs-on');
      return;
    }
    const e = easeOut(smooth(0, 0.62, p));
    const iy = lerp(18, 0, e), ix = lerp(24, 0, e);
    frameEl.style.clipPath = 'inset(' + iy.toFixed(2) + '% ' + ix.toFixed(2) + '% ' + iy.toFixed(2) + '% ' + ix.toFixed(2) + '%)';
    coverBox.style.setProperty('--s', lerp(1.12, 1, e).toFixed(4));
    const on = e > 0.97;
    expand.classList.toggle('hs-on', on);
    if (!on) closeTip();
  });
  desktop.addEventListener('change', () => { force = true; });

  const tip = $('.hs-tip');
  const detail = $('.hs-detail');
  function closeTip() {
    tip.classList.remove('show');
    $$('.hs.open').forEach(b => b.classList.remove('open'));
  }
  $$('.hs').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const wasOpen = btn.classList.contains('open');
      closeTip();
      if (wasOpen) return;
      btn.classList.add('open');
      const x = parseFloat(btn.style.getPropertyValue('--x'));
      const y = parseFloat(btn.style.getPropertyValue('--y'));
      $('h3', tip).textContent = btn.dataset.title;
      $('p', tip).textContent = btn.dataset.text;
      tip.style.left = x + '%';
      tip.style.top = y + '%';
      tip.classList.toggle('left', x > 60);
      tip.classList.add('show');
      $('h3', detail).textContent = btn.dataset.title;
      $('p', detail).textContent = btn.dataset.text;
      detail.removeAttribute('aria-hidden');
    });
  });
  document.addEventListener('click', e => { if (!e.target.closest('.hs, .hs-tip')) closeTip(); });

  /* ---------- Balcón ---------- */
  const bal = $('.balcon');
  const balImg = $('.bal-media img');
  scrub(bal, p => {
    balImg.style.transform = 'scale(' + lerp(1.18, 1, easeOut(clamp(p * 1.5))).toFixed(4) + ')';
    bal.style.setProperty('--t1', smooth(0.06, 0.26, p).toFixed(3));
    bal.style.setProperty('--t2', smooth(0.18, 0.38, p).toFixed(3));
    bal.style.setProperty('--t3', smooth(0.3, 0.5, p).toFixed(3));
  });

  /* ---------- Dormitorio: paneo horizontal ---------- */
  const dorm = $('.dorm');
  const pan = $('.pan', dorm);
  const panRatio = 2600 / 1462;
  let panDist = 0;
  function layoutPan() {
    const h = $('.sticky', dorm).clientHeight || vh;
    const w = document.documentElement.clientWidth;
    const bw = Math.max(h * panRatio, w * 1.35);
    pan.style.width = bw + 'px';
    panDist = bw - w;
  }
  layoutFns.push(layoutPan);
  layoutPan();
  scrub(dorm, p => {
    const e = smooth(0.04, 0.96, p);
    pan.style.transform = 'translate3d(' + (-e * panDist).toFixed(1) + 'px,0,0)';
  });

  /* ---------- Contrafrente: cortina entre dos vistas ---------- */
  const ident = $('.ident');
  const identA = $('.ident-a', ident);
  const identB = $('.ident-b', ident);
  const identLine = $('.ident-line', ident);
  const identFrame = $('.ident-frame', ident);
  const identSteps = $$('.ident-steps li', ident);
  let frameW = 0;
  layoutFns.push(() => { frameW = identFrame.clientWidth; });
  frameW = identFrame.clientWidth;
  scrub(ident, p => {
    const w = smooth(0.3, 0.72, p);
    identB.style.clipPath = 'inset(0 0 0 ' + ((1 - w) * 100).toFixed(2) + '%)';
    identLine.style.transform = 'translate3d(' + ((1 - w) * frameW).toFixed(1) + 'px,0,0)';
    identLine.style.opacity = w > 0.002 && w < 0.998 ? '1' : '0';
    identA.style.transform = 'scale(' + lerp(1.1, 1, p).toFixed(4) + ')';
    identSteps[0].classList.toggle('on', w < 0.5);
    identSteps[1].classList.toggle('on', w >= 0.5);
  });

  /* ---------- Edificio 3D + niveles ---------- */
  const LEVELS = [
    { name: 'Subsuelo', cota: '−2,50', items: ['Bicicletero con sector asignado para cada unidad', 'Espacio para personal de mantenimiento', 'Baño de servicio', 'Llegada de ascensor y escalera'] },
    { name: 'Planta baja', cota: '±0,00', items: ['136 m² totales: 101 m² cubiertos y 35 m² de patio', 'Estar, comedor y cocina integrados de 6,92 × 5,82 m', 'Suite principal de 4,04 × 3,45 m con baño en suite', 'Dormitorio secundario de 2,63 × 3,06 m con baño completo', 'Patio propio al contrafrente con parrilla', 'Acceso independiente desde el hall'] },
    { name: 'Primer piso', cota: '+3,20', items: ['154 m² totales: 109 m² cubiertos, 12 m² de balcón y 33 m² de terraza al contrafrente', 'Estar y comedor de 4,76 × 5,87 m', 'Cocina de 3,30 × 2,72 m', 'Suite principal de 2,89 × 3,65 m con vestidor y baño en suite', 'Dormitorio secundario de 5,33 × 3,09 m con baño completo', 'Toilette de recepción', 'Balcón al frente con parrilla'] },
    { name: 'Segundo piso', cota: '+6,12', items: ['165 m² totales: 109 m² cubiertos, 12 m² de balcón y 44 m² de terraza al frente', 'Estar, comedor y cocina de 5,17 × 5,87 m', 'Cocina de 2,89 × 3,42 m', 'Suite principal de 2,89 × 3,65 m con vestidor y baño en suite', 'Dormitorio secundario de 5,33 × 3,09 m con baño completo', 'Toilette de recepción', 'Balcón al frente y parrilla en la terraza propia de 44 m²'] },
    { name: 'Terraza', cota: '+9,00', items: ['Azotea', 'Sala de máquinas', 'Tanques de reserva de agua'] },
  ];
  const OVERVIEW = { name: 'El edificio', cota: 'Cuatro niveles + terraza', items: ['Tres unidades de 136, 154 y 165 m² totales', 'Parrilla en todas las unidades', 'Ascensor desde el subsuelo', 'Bicicletero en subsuelo'] };

  const ed = $('#edificio');
  const lvlBtns = $$('.lvl-btn', ed);
  const lvlDetail = $('.lvl-detail', ed);
  const lvlPlanBtn = $('.lvl-plan', ed);
  let selLevel = -1;
  let building = null;

  function renderDetail(i) {
    const d = i >= 0 ? LEVELS[i] : OVERVIEW;
    $('.lvl-cota', lvlDetail).textContent = d.cota;
    $('.lvl-name', lvlDetail).textContent = d.name;
    const ul = $('.lvl-items', lvlDetail);
    ul.textContent = '';
    d.items.forEach(t => { const li = document.createElement('li'); li.textContent = t; ul.appendChild(li); });
    $('span', lvlPlanBtn).textContent = i >= 0 ? 'Ver plano' : 'Ver planos';
    lvlDetail.classList.remove('swap');
    void lvlDetail.offsetWidth;
    lvlDetail.classList.add('swap');
  }

  function selectLevel(i, fromScene) {
    selLevel = i;
    lvlBtns.forEach(b => {
      const on = Number(b.dataset.level) === i;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', String(on));
    });
    renderDetail(i);
    if (building && !fromScene) building.select(i);
  }
  lvlBtns.forEach(b => b.addEventListener('click', () => {
    const i = Number(b.dataset.level);
    selectLevel(selLevel === i ? -1 : i);
  }));
  lvlPlanBtn.addEventListener('click', () => openPlan(selLevel >= 0 ? selLevel : 1));
  renderDetail(-1);

  let edP = reduce ? 1 : 0;
  scrub(ed, p => { edP = p; if (building) building.setProgress(p); });

  function initBuilding() {
    const planImgs = $$('[data-plan-img]');
    Promise.all(planImgs.map(img => (img.decode ? img.decode().catch(() => {}) : null))).then(() => {
      if (!window.CantiloBuilding) return fallback3d();
      building = window.CantiloBuilding.create({
        stage: $('.b3d-stage', ed),
        canvas: $('.b3d-canvas', ed),
        labelsEl: $('.b3d-labels', ed),
        planImgs,
        names: LEVELS.map(l => l.name),
        cotas: LEVELS.map(l => l.cota),
        // Zona libre del escenario donde se encuadra la maqueta (px relativos al escenario)
        getRegion: () => {
          const st = $('.b3d-stage', ed).getBoundingClientRect();
          const head = $('.b3d-head', ed).getBoundingClientRect();
          if (desktop.matches) {
            const panel = $('.b3d-panel', ed).getBoundingClientRect();
            return { l: head.right - st.left - 30, r: panel.left - st.left - 190, t: 76, b: st.height - 24 };
          }
          return { l: 10, r: st.width - 104, t: head.bottom - st.top + 8, b: st.height - 10 };
        },
        onSelect: i => selectLevel(i, true),
      });
      if (!building) return fallback3d();
      building.setProgress(edP);
      if (selLevel >= 0) building.select(selLevel);
    });
  }
  function fallback3d() {
    $('.b3d-fallback', ed).hidden = false;
    $('.b3d-canvas', ed).hidden = true;
    $('.b3d-hint', ed).hidden = true;
  }
  const edIO = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) { edIO.disconnect(); initBuilding(); }
  }, { rootMargin: '150% 0px' });
  edIO.observe(ed);

  /* ---------- Visor de planos ---------- */
  const pm = $('.plan-modal');
  const pmView = $('.pm-view', pm);
  const pmCanvas = $('.pm-canvas', pm);
  const pmImgs = $$('[data-plan-img]', pm);
  const pmTabs = $$('.pm-tabs button', pm);
  const pmMode = $('.pm-mode', pm);
  const PW = 1455, PH = 2896;
  const view = { s: 1, x: 0, y: 0, fit: 1, idx: 1 };
  let pmLastFocus = null;

  function pmApply() { pmCanvas.style.transform = 'translate(' + view.x + 'px,' + view.y + 'px) scale(' + view.s + ')'; }
  function pmFit() {
    const r = pmView.getBoundingClientRect();
    view.fit = Math.min(r.width / PW, r.height / PH) * 0.94;
    view.s = view.fit;
    view.x = (r.width - PW * view.s) / 2;
    view.y = (r.height - PH * view.s) / 2;
    pmApply();
  }
  function pmZoomAt(f, cx, cy) {
    const ns = clamp(view.s * f, view.fit * 0.8, view.fit * 6);
    const k = ns / view.s;
    view.x = cx - (cx - view.x) * k;
    view.y = cy - (cy - view.y) * k;
    view.s = ns;
    pmApply();
  }
  function pmShow(i) {
    view.idx = i;
    pmImgs.forEach((img, k) => img.classList.toggle('on', k === i));
    pmTabs.forEach((t, k) => t.setAttribute('aria-selected', String(k === i)));
    $('.pm-title', pm).textContent = LEVELS[i].name;
    $('.pm-cota', pm).textContent = LEVELS[i].cota;
    pmFit();
  }
  function openPlan(i) {
    pmLastFocus = document.activeElement;
    pm.hidden = false;
    lockScroll(true);
    requestAnimationFrame(() => { pm.classList.add('open'); pmShow(i); $('.pm-close', pm).focus(); });
  }
  function closePlan() {
    pm.classList.remove('open');
    lockScroll(false);
    setTimeout(() => { pm.hidden = true; }, 350);
    if (pmLastFocus) pmLastFocus.focus();
  }
  pmTabs.forEach((t, k) => t.addEventListener('click', () => pmShow(k)));
  $('.pm-close', pm).addEventListener('click', closePlan);
  pmMode.addEventListener('click', () => {
    const orig = pm.classList.toggle('original');
    pmMode.textContent = orig ? 'Ver en oscuro' : 'Ver original';
  });
  $$('[data-zoom]', pm).forEach(b => b.addEventListener('click', () => {
    const r = pmView.getBoundingClientRect();
    const z = b.dataset.zoom;
    if (z === 'fit') pmFit(); else pmZoomAt(z === 'in' ? 1.5 : 1 / 1.5, r.width / 2, r.height / 2);
  }));
  pmView.addEventListener('wheel', e => {
    e.preventDefault();
    const r = pmView.getBoundingClientRect();
    pmZoomAt(Math.exp(-e.deltaY * 0.0016), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  pmView.addEventListener('dblclick', e => {
    const r = pmView.getBoundingClientRect();
    if (view.s > view.fit * 1.4) pmFit(); else pmZoomAt(2.4, e.clientX - r.left, e.clientY - r.top);
  });
  const pts = new Map();
  let pinch = null;
  pmView.addEventListener('pointerdown', e => { pmView.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); });
  pmView.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId)) return;
    const prev = pts.get(e.pointerId);
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 1) {
      view.x += e.clientX - prev.x;
      view.y += e.clientY - prev.y;
      pmApply();
    } else if (pts.size === 2) {
      const [a, b] = Array.from(pts.values());
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const r = pmView.getBoundingClientRect();
      const mx = (a.x + b.x) / 2 - r.left, my = (a.y + b.y) / 2 - r.top;
      if (pinch) pmZoomAt(dist / pinch, mx, my);
      pinch = dist;
    }
  });
  const endPt = e => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; };
  pmView.addEventListener('pointerup', endPt);
  pmView.addEventListener('pointercancel', endPt);
  addEventListener('resize', () => { if (!pm.hidden) pmFit(); });

  /* ---------- Lightbox ---------- */
  const lb = $('.lightbox');
  const lbImg = $('.lb-fig img', lb);
  const lbCap = $('.lb-fig figcaption', lb);
  const lbItems = $$('[data-lb]');
  let lbIdx = 0, lbLastFocus = null;
  function lbShow(i) {
    lbIdx = (i + lbItems.length) % lbItems.length;
    const src = lbItems[lbIdx];
    lbImg.src = src.currentSrc || src.src;
    lbImg.alt = src.alt;
    lbCap.textContent = src.dataset.caption || '';
  }
  function lbOpen(i) {
    lbLastFocus = document.activeElement;
    lbShow(i);
    lb.hidden = false;
    lockScroll(true);
    requestAnimationFrame(() => { lb.classList.add('open'); $('.lb-close', lb).focus(); });
  }
  function lbClose() {
    lb.classList.remove('open');
    lockScroll(false);
    setTimeout(() => { lb.hidden = true; }, 350);
    if (lbLastFocus) lbLastFocus.focus();
  }
  lbItems.forEach((img, i) => {
    img.setAttribute('tabindex', '0');
    img.setAttribute('role', 'button');
    img.addEventListener('click', () => lbOpen(i));
    img.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); lbOpen(i); } });
  });
  $('.lb-close', lb).addEventListener('click', lbClose);
  $('.lb-prev', lb).addEventListener('click', () => lbShow(lbIdx - 1));
  $('.lb-next', lb).addEventListener('click', () => lbShow(lbIdx + 1));
  lb.addEventListener('click', e => { if (e.target === lb || e.target.classList.contains('lb-fig')) lbClose(); });
  let swipeX = null;
  $('.lb-fig', lb).addEventListener('pointerdown', e => { swipeX = e.clientX; });
  $('.lb-fig', lb).addEventListener('pointerup', e => {
    if (swipeX === null) return;
    const dx = e.clientX - swipeX;
    swipeX = null;
    if (Math.abs(dx) > 50) lbShow(lbIdx + (dx < 0 ? 1 : -1));
  });

  document.addEventListener('keydown', e => {
    if (!lb.hidden) {
      if (e.key === 'Escape') lbClose();
      if (e.key === 'ArrowRight') lbShow(lbIdx + 1);
      if (e.key === 'ArrowLeft') lbShow(lbIdx - 1);
    } else if (!pm.hidden) {
      if (e.key === 'Escape') closePlan();
      if (e.key === 'ArrowRight') pmShow(Math.min(4, view.idx + 1));
      if (e.key === 'ArrowLeft') pmShow(Math.max(0, view.idx - 1));
    } else if (menuOpen && e.key === 'Escape') setMenu(false);
  });

  /* ---------- Tabs de terminaciones ---------- */
  const tabs = $$('.tabs [role="tab"]');
  const panels = $$('.tab-panel');
  function showTab(i, focus) {
    tabs.forEach((t, k) => {
      const on = k === i;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      panels[k].hidden = !on;
      panels[k].classList.toggle('enter', on);
    });
    if (focus) tabs[i].focus();
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => showTab(i));
    t.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') showTab((i + 1) % tabs.length, true);
      if (e.key === 'ArrowLeft') showTab((i - 1 + tabs.length) % tabs.length, true);
    });
  });

  /* ---------- Formulario de contacto ---------- */
  const form = $('.ct-form');
  const status = $('.form-status', form);
  const fields = {
    nombre: $('#f-nombre'), tel: $('#f-tel'), email: $('#f-email'), unidad: $('#f-unidad'), msg: $('#f-msg'),
  };
  function setErr(key, msg) {
    const input = fields[key];
    $('#e-' + key).textContent = msg || '';
    input.closest('.field').classList.toggle('invalid', !!msg);
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  }
  form.addEventListener('submit', e => {
    e.preventDefault();
    status.className = 'form-status';
    status.textContent = '';
    const nombre = fields.nombre.value.trim();
    const tel = fields.tel.value.trim();
    const email = fields.email.value.trim();
    let ok = true;
    setErr('nombre', nombre ? '' : 'Ingresá tu nombre.');
    if (!nombre) ok = false;
    const emailOk = !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    setErr('email', emailOk ? '' : 'Revisá el formato del email.');
    if (!emailOk) ok = false;
    if (!tel && !email) { setErr('tel', 'Dejanos un teléfono o un email.'); ok = false; } else setErr('tel', '');
    if (!ok) { form.querySelector('.invalid input').focus(); return; }

    const lines = [
      'Hola, quiero consultar por José Luis Cantilo 5465.',
      'Nombre: ' + nombre,
      'Unidad de interés: ' + fields.unidad.value,
      tel ? 'Teléfono: ' + tel : '',
      email ? 'Email: ' + email : '',
      fields.msg.value.trim() ? 'Mensaje: ' + fields.msg.value.trim() : '',
    ].filter(Boolean).join('\n');

    if (CONTACT.whatsapp) {
      window.open('https://wa.me/' + CONTACT.whatsapp + '?text=' + encodeURIComponent(lines), '_blank', 'noopener');
      status.textContent = 'Abrimos WhatsApp con tu consulta lista para enviar.';
      status.classList.add('ok');
    } else if (CONTACT.email) {
      location.href = 'mailto:' + CONTACT.email + '?subject=' + encodeURIComponent('Consulta José Luis Cantilo 5465') + '&body=' + encodeURIComponent(lines);
      status.textContent = 'Abrimos tu correo con la consulta lista para enviar.';
      status.classList.add('ok');
    } else {
      status.textContent = 'El canal de contacto todavía no está configurado.';
      status.classList.add('err');
    }
  });

  requestAnimationFrame(tick);
})();
