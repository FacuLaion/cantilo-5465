/* =========================================================
   Maqueta 3D del edificio José Luis Cantilo 5465 (Three.js r159)
   Losas a cotas reales: -2,50 / ±0,00 / +3,20 / +6,12 / +9,00
   Cada losa lleva su plano original como textura.
   Coordenadas del recorte de plano: u (0..8,77 m) de izquierda a derecha,
   v (0..20,17 m) desde el fondo del lote hasta el frente del balcón.
   ========================================================= */
(function () {
  'use strict';

  const W = 8.77;          // ancho del lote
  const D = 20.17;         // fondo del recorte (lote + balcón)
  const LM = 18.70;        // línea municipal
  const BACK = 4.06;       // fondo edificado (el resto es patio)
  // Recorte del lote dentro de las imágenes de planos (fracciones del ancho/alto)
  const CROP = { x0: 0.10050, x1: 0.89246, y0: 0.04545, y1: 0.96061 };
  const GAP = 3.4;         // separación extra por nivel en vista explotada
  const T = 0.24;          // espesor de losa
  const ACCENT = 0xd3b58f;

  const LEVELS = [
    { id: 'sub', y: -2.5, h: 2.5, foot: [4.12, 8.6, 7.85, LM], plan: [4.12, 8.77, 7.85, LM] },
    { id: 'pb', y: 0, h: 3.2, foot: [0, W, BACK, LM], slab: [0, W, 0, LM], plan: [0, W, 0, LM], glow: true },
    { id: 'p1', y: 3.2, h: 2.92, foot: [0, W, BACK, LM], balcony: [0.3, 8.47, LM, D], plan: [0, W, BACK, D], glow: true, facade: true },
    { id: 'p2', y: 6.12, h: 2.88, foot: [0, W, BACK, LM], balcony: [0.3, 8.47, LM, D], plan: [0, W, BACK, D], glow: true, facade: true },
    { id: 'ter', y: 9.0, h: 0, foot: [0, W, BACK, LM], canopy: [0, W, LM, D], plan: [0, W, BACK, LM], roof: true },
  ];

  const X = u => u - W / 2;
  const Z = v => v - D / 2;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  const VERT = [
    'uniform vec2 uOff;',
    'uniform vec2 uRep;',
    'varying vec2 vUv;',
    'void main() {',
    '  vUv = uOff + uv * uRep;',
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
    '}'
  ].join('\n');

  // Convierte el plano (líneas oscuras sobre blanco) en líneas claras con transparencia
  const FRAG = [
    'uniform sampler2D map;',
    'uniform vec3 uColor;',
    'uniform float uOpacity;',
    'varying vec2 vUv;',
    'void main() {',
    '  vec3 t = texture2D(map, vUv).rgb;',
    '  float l = dot(t, vec3(0.299, 0.587, 0.114));',
    '  float a = 1.0 - smoothstep(0.3, 0.94, l);',
    '  gl_FragColor = vec4(uColor, a * uOpacity);',
    '}'
  ].join('\n');

  function create(opts) {
    const { stage, canvas, labelsEl, planImgs, names, cotas, getRegion, onSelect } = opts;
    if (!window.THREE) return null;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (e) {
      return null;
    }
    const isTouch = matchMedia('(pointer: coarse)').matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isTouch ? 1.75 : 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0b0c0c, 70, 170);
    const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 400);

    scene.add(new THREE.HemisphereLight(0xf4eee4, 0x101010, 1.1));
    const sun = new THREE.DirectionalLight(0xffe4bf, 2.0);
    sun.position.set(-16, 30, 24);
    scene.add(sun);
    const rim = new THREE.DirectionalLight(0x9fb4cc, 0.5);
    rim.position.set(20, 8, -18);
    scene.add(rim);

    const grid = new THREE.GridHelper(96, 96, 0x3a3833, 0x1d1e1d);
    grid.material.transparent = true;
    grid.material.opacity = 0.5;
    grid.position.y = -3.4;
    scene.add(grid);

    const maxAniso = renderer.capabilities.getMaxAnisotropy();

    function makeTexture(img) {
      const tex = new THREE.Texture(img);
      tex.anisotropy = Math.min(8, maxAniso);
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.generateMipmaps = true;
      const ready = () => { tex.needsUpdate = true; };
      if (img.complete && img.naturalWidth) ready(); else img.addEventListener('load', ready, { once: true });
      return tex;
    }

    function planMaterial(tex, region) {
      const [u0, u1, v0, v1] = region;
      const fx0 = CROP.x0 + (u0 / W) * (CROP.x1 - CROP.x0);
      const fx1 = CROP.x0 + (u1 / W) * (CROP.x1 - CROP.x0);
      const fy0 = CROP.y0 + (v0 / D) * (CROP.y1 - CROP.y0);
      const fy1 = CROP.y0 + (v1 / D) * (CROP.y1 - CROP.y0);
      return new THREE.ShaderMaterial({
        uniforms: {
          map: { value: tex },
          uOff: { value: new THREE.Vector2(fx0, 1 - fy1) },
          uRep: { value: new THREE.Vector2(fx1 - fx0, fy1 - fy0) },
          uColor: { value: new THREE.Vector3(0.95, 0.9, 0.82) },
          uOpacity: { value: 1 },
        },
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthWrite: false,
      });
    }

    function box(parent, r, y0, y1, mat) {
      const [u0, u1, v0, v1] = r;
      const m = new THREE.Mesh(new THREE.BoxGeometry(u1 - u0, y1 - y0, v1 - v0), mat);
      m.position.set(X((u0 + u1) / 2), (y0 + y1) / 2, Z((v0 + v1) / 2));
      parent.add(m);
      return m;
    }

    function edges(parent, r, y0, y1, mat) {
      const [u0, u1, v0, v1] = r;
      const geo = new THREE.EdgesGeometry(new THREE.BoxGeometry(u1 - u0, y1 - y0, v1 - v0));
      const l = new THREE.LineSegments(geo, mat);
      l.position.set(X((u0 + u1) / 2), (y0 + y1) / 2, Z((v0 + v1) / 2));
      parent.add(l);
      return l;
    }

    const levels = LEVELS.map((L, i) => {
      const g = new THREE.Group();
      scene.add(g);
      const slabMat = new THREE.MeshStandardMaterial({ color: 0x1e1f1f, roughness: 0.85, metalness: 0.06, transparent: true });
      const metalMat = new THREE.MeshStandardMaterial({ color: 0x0f1010, roughness: 0.42, metalness: 0.6, transparent: true });
      const edgeMat = new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.4 });
      const glassMat = new THREE.MeshBasicMaterial({ color: 0xdccbb0, transparent: true, opacity: 0.035, depthWrite: false, side: THREE.DoubleSide });
      const glowMat = new THREE.MeshBasicMaterial({ color: 0xffc27a, transparent: true, opacity: 0.14, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
      const pick = [];

      // Losa
      pick.push(box(g, L.slab || L.foot, -T, 0, slabMat));
      if (L.balcony) pick.push(box(g, L.balcony, -T, 0, slabMat));
      if (L.canopy) pick.push(box(g, L.canopy, -T, 0, metalMat));

      // Plano
      const planMat = planMaterial(makeTexture(planImgs[i]), L.plan);
      const [pu0, pu1, pv0, pv1] = L.plan;
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(pu1 - pu0, pv1 - pv0), planMat);
      plane.rotation.x = -Math.PI / 2;
      plane.position.set(X((pu0 + pu1) / 2), 0.02, Z((pv0 + pv1) / 2));
      plane.renderOrder = 3;
      g.add(plane);
      pick.push(plane);

      // Volumen del nivel
      if (L.h > 0) {
        const hh = L.h - T;
        const vol = box(g, L.foot, 0, hh, glassMat);
        vol.renderOrder = 1;
        pick.push(vol);
        edges(g, L.foot, 0, hh, edgeMat);
        if (L.glow) {
          const [u0, u1, , v1] = L.foot;
          const p = new THREE.Mesh(new THREE.PlaneGeometry(u1 - u0 - 0.8, hh * 0.78), glowMat);
          p.position.set(X((u0 + u1) / 2), hh * 0.44, Z(v1) - 0.02);
          p.renderOrder = 2;
          g.add(p);
        }
      }

      // Piel de parasoles verticales al frente del balcón
      if (L.facade) {
        const hh = L.h;
        box(g, [0, 0.3, LM, D], -T, hh - T, metalMat);
        box(g, [W - 0.3, W, LM, D], -T, hh - T, metalMat);
        const slat = new THREE.BoxGeometry(0.07, hh - T, 0.12);
        const gaps = [0.17, 0.17, 0.46, 0.17, 0.3, 0.17, 0.58, 0.17];
        let u = 0.5, k = 0;
        while (u < W - 0.45) {
          const m = new THREE.Mesh(slat, metalMat);
          m.position.set(X(u), (hh - T) / 2, Z(D - 0.06));
          g.add(m);
          u += gaps[k++ % gaps.length];
        }
      }

      // Terraza: parapeto, núcleo de escalera y sala de máquinas, tanques
      if (L.roof) {
        edges(g, L.foot, 0, 1.0, edgeMat);
        box(g, [0, W, LM - 0.2, D], 0, 0.7, metalMat);
        const core = box(g, [4.12, 7.26, 7.35, 12.35], 0, 2.6, slabMat);
        pick.push(core);
        edges(g, [4.12, 7.26, 7.35, 12.35], 0, 2.6, edgeMat);
        box(g, [0.14, 2.17, 8.04, 12.19], 0, 0.35, slabMat);
        const tankMat = new THREE.MeshStandardMaterial({ color: 0x6f6d68, roughness: 0.55, metalness: 0.3, transparent: true });
        const tankGeo = new THREE.CylinderGeometry(0.7, 0.7, 1.35, 40);
        [8.68, 10.46].forEach(v => {
          const t = new THREE.Mesh(tankGeo, tankMat);
          t.position.set(X(1.34), 0.35 + 0.675, Z(v));
          g.add(t);
        });
        slabMat.userData.extra = [tankMat];
      }

      pick.forEach(m => { m.userData.level = i; });
      return { g, L, slabMat, metalMat, edgeMat, glassMat, glowMat, planMat, pick, fade: 1, lift: 0 };
    });

    const pickables = levels.flatMap(l => l.pick);

    // Etiquetas HTML proyectadas
    const labels = levels.map((lv, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'lvl-label';
      b.innerHTML = '<span>' + names[i] + '</span><em>' + cotas[i] + '</em>';
      b.addEventListener('click', () => { select(i); onSelect && onSelect(i); });
      labelsEl.appendChild(b);
      return b;
    });

    // Estado
    const tgt = { explode: 0, yaw: -0.95, pitch: 0.42 };
    const cur = { explode: 0, yaw: -0.95, pitch: 0.42, ty: 3, r: 60 };
    let dragYaw = 0, dragPitch = 0, sel = -1, hover = -1;
    let W_px = 1, H_px = 1, region = { l: 0, r: 1, t: 0, b: 1 };
    let running = false, raf = 0, t0 = performance.now();

    // La cámara se desplaza (view offset) para centrar la maqueta en la zona libre del escenario
    function resize() {
      const r = stage.getBoundingClientRect();
      W_px = Math.max(1, r.width);
      H_px = Math.max(1, r.height);
      renderer.setSize(W_px, H_px, false);
      region = getRegion ? getRegion() : { l: 0, r: W_px, t: 0, b: H_px };
      const cx = (region.l + region.r) / 2, cy = (region.t + region.b) / 2;
      camera.aspect = W_px / H_px;
      camera.setViewOffset(W_px, H_px, W_px / 2 - cx, H_px / 2 - cy, W_px, H_px);
      camera.updateProjectionMatrix();
    }
    const ro = new ResizeObserver(resize);
    ro.observe(stage);
    resize();

    function levelY(i, e) { return LEVELS[i].y + e * i * GAP; }

    const v3 = new THREE.Vector3();
    const corners = [[0, LM], [W, LM], [0, BACK], [W, BACK]];

    function updateLabels() {
      const show = cur.explode > 0.55;
      levels.forEach((lv, i) => {
        const el = labels[i];
        el.classList.toggle('show', show);
        el.classList.toggle('active', sel === i);
        if (!show) return;
        const L = lv.L;
        const vMin = L.id === 'sub' ? 7.85 : BACK;
        const uMin = L.id === 'sub' ? 4.12 : 0;
        let best = null;
        for (const [cu, cv] of corners) {
          const uu = cu === 0 ? uMin : cu;
          const vv = cv === BACK ? vMin : cv;
          v3.set(X(uu), lv.g.position.y, Z(vv)).project(camera);
          const sx = (v3.x + 1) / 2 * W_px, sy = (1 - v3.y) / 2 * H_px;
          if (!best || sx > best[0]) best = [sx, sy];
        }
        const w = el.offsetWidth || 120;
        const x = Math.min(W_px - w - 6, best[0] + 10);
        el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + (best[1] - 12).toFixed(1) + 'px)';
      });
    }

    function applyLook() {
      levels.forEach((lv, i) => {
        const active = sel < 0 || sel === i;
        lv.fade += ((active ? 1 : 0.16) - lv.fade) * 0.12;
        const f = lv.fade;
        const hot = hover === i || sel === i;
        lv.planMat.uniforms.uOpacity.value = 0.12 + 0.88 * f;
        lv.slabMat.opacity = 0.3 + 0.7 * f;
        lv.metalMat.opacity = 0.3 + 0.7 * f;
        (lv.slabMat.userData.extra || []).forEach(m => { m.opacity = 0.3 + 0.7 * f; });
        lv.edgeMat.opacity = (hot ? 0.95 : 0.38) * (0.35 + 0.65 * f);
        lv.glassMat.opacity = (sel === i ? 0.08 : 0.035) * f;
        lv.glowMat.opacity = 0.14 * f;
        const lt = sel === i ? 1.2 * cur.explode : 0;
        lv.lift += (lt - lv.lift) * 0.12;
        lv.g.position.y = levelY(i, cur.explode) + lv.lift;
      });
    }

    function frame(now) {
      raf = running ? requestAnimationFrame(frame) : 0;
      const t = (now - t0) / 1000;
      const k = 0.08;
      cur.explode += (tgt.explode - cur.explode) * k;
      cur.yaw += (tgt.yaw + dragYaw - cur.yaw) * k;
      cur.pitch += (clamp(tgt.pitch + dragPitch, 0.12, 1.15) - cur.pitch) * k;

      applyLook();

      const e = cur.explode;
      const yMin = -2.5, yMax = 9 + 2.6 + 4 * GAP * e;
      let ty = (yMin + yMax) / 2;
      if (sel >= 0) ty = ty * 0.55 + (levelY(sel, e) + 1.4) * 0.45;
      cur.ty += (ty - cur.ty) * k;

      // Encuadre: extensión proyectada aproximada de la maqueta contra el tamaño de la zona libre
      const yaw = cur.yaw + Math.sin(t * 0.25) * 0.04;
      const H = yMax - yMin;
      const tv = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
      const tH = tv * Math.max(40, (region.r - region.l) / 2) / (H_px / 2);
      const tV = tv * Math.max(40, (region.b - region.t) / 2) / (H_px / 2);
      const sy = Math.abs(Math.sin(yaw)), cyw = Math.abs(Math.cos(yaw));
      const wExt = W * cyw + D * sy + 1.5;
      const hExt = H * Math.cos(cur.pitch) + (D * cyw + W * sy) * Math.sin(cur.pitch) + 1.5;
      const fit = Math.max(wExt / 2 / tH, hExt / 2 / tV) * (sel >= 0 ? 0.92 : 1.06);
      cur.r += (fit - cur.r) * k;

      const cp = Math.cos(cur.pitch);
      camera.position.set(cur.r * cp * Math.sin(yaw), cur.ty + cur.r * Math.sin(cur.pitch), cur.r * cp * Math.cos(yaw));
      camera.lookAt(0, cur.ty, 0);

      renderer.render(scene, camera);
      updateLabels();
    }

    function start() { if (!running) { running = true; raf = requestAnimationFrame(frame); } }
    function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
    const io = new IntersectionObserver(es => { es[0].isIntersecting ? start() : stop(); }, { rootMargin: '10% 0px' });
    io.observe(stage);

    // Interacción: arrastrar para girar, tocar para elegir nivel
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    function pickAt(cx, cy) {
      const r = canvas.getBoundingClientRect();
      ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(pickables, false)[0];
      return hit ? hit.object.userData.level : -1;
    }

    let down = null;
    canvas.addEventListener('pointerdown', e => {
      down = { x: e.clientX, y: e.clientY, yaw: dragYaw, pitch: dragPitch, moved: false, id: e.pointerId, type: e.pointerType };
    });
    window.addEventListener('pointermove', e => {
      if (down && e.pointerId === down.id) {
        const dx = e.clientX - down.x, dy = e.clientY - down.y;
        if (!down.moved && Math.abs(dx) + Math.abs(dy) > 6) down.moved = true;
        if (down.moved) {
          dragYaw = down.yaw + dx * 0.006;
          if (down.type === 'mouse') dragPitch = clamp(down.pitch + dy * 0.004, -0.3, 0.5);
        }
      } else if (e.pointerType === 'mouse' && e.target === canvas && running) {
        const h = pickAt(e.clientX, e.clientY);
        if (h !== hover) { hover = h; canvas.classList.toggle('hovering', h >= 0); }
      }
    }, { passive: true });
    window.addEventListener('pointerup', e => {
      if (down && e.pointerId === down.id && !down.moved && e.target === canvas) {
        const h = pickAt(e.clientX, e.clientY);
        select(h);
        onSelect && onSelect(h);
      }
      down = null;
    });
    window.addEventListener('pointercancel', () => { down = null; });
    canvas.addEventListener('pointerleave', () => { hover = -1; canvas.classList.remove('hovering'); });

    function select(i) { sel = i; }

    function setProgress(p) {
      tgt.explode = smooth(0.04, 0.5, p);
      tgt.yaw = -0.95 + p * 0.75;
      tgt.pitch = 0.42 + smooth(0, 0.5, p) * 0.16;
    }

    return { setProgress, select, resize, start, stop };
  }

  window.CantiloBuilding = { create };
})();
