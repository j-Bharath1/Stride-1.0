/* 3D exercise demos: a lit athlete model driven by the same pose rig as the 2D figures.
   One WebGL renderer is shared and moved between views (player, move sheet, workout preview). */
'use strict';

const Fig3D = (() => {
  if (typeof THREE === 'undefined') return { ok: false };
  const T = THREE;
  if (T.ColorManagement) T.ColorManagement.legacyMode = false; // treat hex colours as sRGB
  let renderer = null, ok = true;
  try {
    renderer = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    // Keep the model crisp without overloading mid-range Android GPUs.
    renderer.setPixelRatio(Math.min(1.6, window.devicePixelRatio || 1));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
  } catch (e) { ok = false; }
  if (!ok) return { ok: false };

  const M = (color, rough = .7, metal = 0) => new T.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
  const MAT = {
    skin: M(0xb57b55, .48), shirt: M(0x3f4651, .68), shorts: M(0x18191c, .7), shoe: M(0xf2f3f5, .42), sole: M(0x222222, .8),
    hair: M(0x1b1411, .9), iron: M(0x2b2e33, .35, .7), chrome: M(0xc9ced6, .25, .9), pad: M(0x2a2f37, .6), wood: M(0x3a4250, .7),
    kb: M(0x1f2226, .45, .5), cable: M(0x8a939e, .4, .6),
    // anatomy style: pale body, dark trunks, worked muscles in red
    body: M(0xe7ded2, .62), trunks: M(0x24262b, .7), hi: Object.assign(M(0xd93f2b, .45), { emissive: new T.Color(0x3a0d06), emissiveIntensity: .9 }), shoeA: M(0xd8d8da, .55),
  };

  // Which muscle shapes light up for each term used in the exercise library.
  const MUSCLE = {
    chest: ['pecL', 'pecR'], back: ['lats', 'traps'], 'lower back': ['lowback'], spine: ['lowback', 'traps'],
    posture: ['traps', 'lowback'], shoulders: ['deltL', 'deltR'], biceps: ['biL', 'biR'], triceps: ['triL', 'triR'],
    forearms: ['faL', 'faR'], abs: ['abs'], 'upper abs': ['abs'], 'lower abs': ['absLow'],
    core: ['abs', 'obL', 'obR'], 'deep core': ['abs', 'lowback'], obliques: ['obL', 'obR'],
    quads: ['quadL', 'quadR'], hamstrings: ['hamL', 'hamR'], glutes: ['gluteL', 'gluteR'],
    'glutes (side)': ['gluteL', 'gluteR'], calves: ['calfL', 'calfR'], 'hip flexors': ['hipfL', 'hipfR'],
    hips: ['hipfL', 'hipfR', 'gluteL', 'gluteR'], 'inner thighs': ['addL', 'addR'],
    legs: ['quadL', 'quadR', 'hamL', 'hamR', 'calfL', 'calfR'],
    'full body': ['pecL', 'pecR', 'abs', 'quadL', 'quadR', 'gluteL', 'gluteR'],
  };
  // 'Chest · triceps · shoulders' -> Set of muscle shape keys
  function highlightFor(muscles) {
    const set = new Set();
    String(muscles || '').toLowerCase().split(/[·,]/).forEach(part => {
      const t = part.trim();
      if (!t) return;
      const hit = MUSCLE[t] || MUSCLE[Object.keys(MUSCLE).find(k => t === k || t.startsWith(k + ' ') || t.endsWith(' ' + k)) || ''];
      if (hit) hit.forEach(x => set.add(x));
    });
    return set;
  }
  const LEN = Fig.LEN;
  const HIPW = 4.2, SHW = 7.4; // half widths

  // ------------------------------------------------------------------ scene for one figure
  function build(fig, light, hi) {
    const anat = !!hi;
    const scene = new T.Scene();
    scene.add(new T.HemisphereLight(0xdbe8ff, 0x1a1f28, .85));
    const key = new T.DirectionalLight(0xffffff, 1.35);
    key.position.set(60, 120, 90); key.castShadow = true;
    key.shadow.mapSize.set(768, 768);
    Object.assign(key.shadow.camera, { left: -90, right: 90, top: 90, bottom: -20, near: 1, far: 400 });
    key.shadow.radius = 6; key.shadow.bias = -0.0008;
    scene.add(key);
    const rim = new T.DirectionalLight(0x8ebaff, .72); rim.position.set(-80, 60, -70); scene.add(rim);
    const fill = new T.DirectionalLight(0xffd7b5, .28); fill.position.set(25, 35, 85); scene.add(fill);

    // floor with a soft spot
    // Anatomy pictures: the floor catches only the shadow, so the card stays pure white.
    const floorMat = anat ? new T.ShadowMaterial({ opacity: .16 })
      : new T.MeshStandardMaterial({ color: light ? 0xe6e8ec : 0x232b37, roughness: .95 });
    const floor = new T.Mesh(new T.CircleGeometry(anat ? 420 : 140, 64), floorMat);
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
    const ring = new T.Mesh(new T.RingGeometry(36, 37, 64), new T.MeshBasicMaterial({ color: light ? 0xd5d9df : 0x2c3a4c }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = .05; if (!anat) scene.add(ring);

    const body = new T.Group(); scene.add(body);
    const cap = (r, len, mat) => { const m = new T.Mesh(new T.CapsuleGeometry(r, Math.max(.01, len), 6, 14), mat); m.castShadow = true; body.add(m); m.userData.len = len; return m; };
    const sph = (r, mat, sx = 1, sy = 1, sz = 1) => { const m = new T.Mesh(new T.SphereGeometry(r, 24, 16), mat); m.scale.set(sx, sy, sz); m.castShadow = true; body.add(m); return m; };
    const box = (w, h, d, mat) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat); m.castShadow = true; m.receiveShadow = true; body.add(m); return m; };

    const SKIN = anat ? MAT.body : MAT.skin, SHIRT = anat ? MAT.body : MAT.shirt,
      SHORTS = anat ? MAT.trunks : MAT.shorts, SHOE = anat ? MAT.shoeA : MAT.shoe;
    const P = {
      // legs (thigh skin, shorts sleeve, shin, shoe)
      lTh: cap(3.3, LEN.th - 2, SKIN), lSh: cap(2.6, LEN.sh - 2, SKIN), lShorts: cap(3.85, LEN.th * .5, SHORTS), lShoe: box(3.6, 2.6, 8, SHOE),
      rTh: cap(3.3, LEN.th - 2, SKIN), rSh: cap(2.6, LEN.sh - 2, SKIN), rShorts: cap(3.85, LEN.th * .5, SHORTS), rShoe: box(3.6, 2.6, 8, SHOE),
      // arms
      lUa: cap(2.25, LEN.ua - 1.5, SKIN), lFa: cap(1.9, LEN.fa - 1.5, SKIN), lSleeve: cap(2.75, LEN.ua * .42, SHIRT), lHand: sph(2.1, SKIN),
      rUa: cap(2.25, LEN.ua - 1.5, SKIN), rFa: cap(1.9, LEN.fa - 1.5, SKIN), rSleeve: cap(2.75, LEN.ua * .42, SHIRT), rHand: sph(2.1, SKIN),
      // torso
      chest: sph(5.6, SHIRT, 1, 1.55, 1.38), belly: sph(5.0, SHIRT, 1, 1.25, 1.2), pelvis: sph(5.2, SHORTS, 1, .9, 1.25),
      neck: cap(2.1, 3.2, SKIN), head: sph(4.9, SKIN, 1, 1.12, .95), hair: sph(5.05, anat ? MAT.body : MAT.hair, 1.02, 1.0, .98),
      lDelt: sph(3.1, SHIRT), rDelt: sph(3.1, SHIRT),
    };
    P.hair.scale.set(1.06, .9, 1.05);
    if (anat) { P.lSleeve.visible = P.rSleeve.visible = false; }

    // Red muscle shapes laid over the body. Only the worked ones are built.
    const OV = {};
    const mus = (key, geo, sx, sy, sz) => {
      if (!hi.has(key)) return;
      const m = new T.Mesh(geo, MAT.hi); m.castShadow = true;
      if (sx) m.scale.set(sx, sy, sz);
      body.add(m); OV[key] = m;
    };
    const capG = (r, l) => new T.CapsuleGeometry(r, l, 6, 14), sphG = r => new T.SphereGeometry(r, 20, 14);
    ['deltL', 'deltR'].forEach(k => mus(k, sphG(3.6)));
    mus('pecL', sphG(3.4), 1, 1.0, .8); mus('pecR', sphG(3.4), 1, 1.0, .8);
    mus('abs', sphG(3.0), .9, 1.8, .95); mus('absLow', sphG(2.6), .9, 1.15, .95);
    mus('obL', sphG(2.2), .85, 1.5, .8); mus('obR', sphG(2.2), .85, 1.5, .8);
    mus('lats', sphG(4.0), .9, 1.35, 1.15); mus('traps', sphG(3.1), .9, .9, 1.2);
    mus('lowback', sphG(3.1), .85, 1.1, 1.1);
    ['gluteL', 'gluteR'].forEach(k => mus(k, sphG(3.5), 1, .95, .95));
    ['biL', 'biR'].forEach(k => mus(k, capG(2.3, LEN.ua * .5)));
    ['triL', 'triR'].forEach(k => mus(k, capG(2.25, LEN.ua * .55)));
    ['faL', 'faR'].forEach(k => mus(k, capG(1.9, LEN.fa * .55)));
    ['quadL', 'quadR'].forEach(k => mus(k, capG(3.0, LEN.th * .55)));
    ['hamL', 'hamR'].forEach(k => mus(k, capG(2.9, LEN.th * .5)));
    ['calfL', 'calfR'].forEach(k => mus(k, capG(2.5, LEN.sh * .45)));
    ['hipfL', 'hipfR'].forEach(k => mus(k, capG(2.2, LEN.th * .3)));
    ['addL', 'addR'].forEach(k => mus(k, capG(2.2, LEN.th * .5)));

    // props
    const props = { held: [] };
    (fig.props || []).forEach(pr => {
      if (pr.box) { const m = box(pr.box[1] - pr.box[0], pr.box[2], 24, MAT.pad); m.position.set((pr.box[0] + pr.box[1]) / 2, pr.box[2] / 2, 0); }
      if (pr.wall != null) { const m = box(4, 80, 60, MAT.wood); m.position.set(pr.wall + 2, 40, 0); }
      if (pr.bar) { const m = new T.Mesh(new T.CylinderGeometry(1, 1, 50, 12), MAT.chrome); m.rotation.x = Math.PI / 2; m.position.set(pr.bar[0], pr.bar[1], 0); m.castShadow = true; body.add(m); }
      if (pr.anchor) { props.anchor = pr.anchor; props.cable = cap(.35, 1, MAT.cable); props.cable.userData.dyn = true; }
      if (pr.bb) {
        const g = new T.Group();
        const bar = new T.Mesh(new T.CylinderGeometry(.9, .9, 46, 12), MAT.chrome); bar.rotation.x = Math.PI / 2; g.add(bar);
        [-17, 17].forEach(z => { const pl = new T.Mesh(new T.CylinderGeometry(7.2, 7.2, 2.2, 32), MAT.iron); pl.rotation.x = Math.PI / 2; pl.position.z = z; pl.castShadow = true; g.add(pl); });
        g.children.forEach(c => { c.castShadow = true; }); body.add(g); props.bar = g;
      }
      if (pr.db) ['l', 'r'].forEach(sd => {
        const g = new T.Group();
        const h = new T.Mesh(new T.CylinderGeometry(.7, .7, 7, 10), MAT.chrome); h.rotation.x = Math.PI / 2; g.add(h);
        [-3.6, 3.6].forEach(z => { const pl = new T.Mesh(new T.CylinderGeometry(2.6, 2.6, 2.2, 6), MAT.iron); pl.rotation.x = Math.PI / 2; pl.position.z = z; pl.castShadow = true; g.add(pl); });
        body.add(g); props.held.push([sd, g]);
      });
      if (pr.kb) {
        const g = new T.Group();
        const bell = new T.Mesh(new T.SphereGeometry(4.3, 20, 14), MAT.kb); bell.position.y = -5.2; bell.castShadow = true; g.add(bell);
        const hd = new T.Mesh(new T.TorusGeometry(2.4, .55, 8, 20), MAT.kb); hd.position.y = -1.4; g.add(hd);
        body.add(g); props.kb = g;
      }
    });
    const BACK = ['lats', 'traps', 'lowback', 'gluteL', 'gluteR', 'hamL', 'hamR', 'calfL', 'calfR', 'triL', 'triR'];
    const FRONT = ['pecL', 'pecR', 'abs', 'absLow', 'obL', 'obR', 'biL', 'biR', 'quadL', 'quadR', 'hipfL', 'hipfR', 'faL', 'faR'];
    const score = list => list.reduce((n, k) => n + (hi && hi.has(k) ? 1 : 0), 0);
    const posterior = !!hi && score(BACK) > score(FRONT);
    return { scene, P, OV, props, frames: fig.frames.map(Fig.solve), fig, posterior };
  }

  // ------------------------------------------------------------------ posing
  const V = (x, y, z) => new T.Vector3(x, y, z);
  const UP = V(0, 1, 0);
  const tmpQ = new T.Quaternion();
  function seg(mesh, a, b, from = 0, to = 1) {
    const s = a.clone().lerp(b, from), e = a.clone().lerp(b, to);
    const d = e.clone().sub(s), len = d.length();
    mesh.position.copy(s).add(e).multiplyScalar(.5);
    if (len > 1e-4) mesh.quaternion.setFromUnitVectors(UP, d.normalize());
    if (mesh.userData.dyn) mesh.scale.y = Math.max(.01, len);
  }
  // orient an ellipsoid along the torso with its depth across the body
  function orient(mesh, up, side) {
    const y = up.clone().normalize(), z = side.clone().sub(y.clone().multiplyScalar(side.dot(y))).normalize(), x = y.clone().cross(z);
    mesh.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(x, y, z));
  }

  function pose(S, fr, front) {
    const p = S.P;
    const J = k => front ? V(0, fr[k][1], fr[k][0]) : V(fr[k][0], fr[k][1], 0);
    const hip = J('hip'), neck = J('neck'), head = J('head');
    const off = (v, z) => v.clone().add(V(0, 0, z));
    // legs
    const lz = front ? -2.4 : -HIPW, rz = front ? 2.4 : HIPW;
    const lHip = off(hip, lz), rHip = off(hip, rz);
    const lK = off(J('lk'), front ? -2.4 : -HIPW), lF = off(J('lf'), front ? -2.4 : -HIPW);
    const rK = off(J('rk'), front ? 2.4 : HIPW), rF = off(J('rf'), front ? 2.4 : HIPW);
    seg(p.lTh, lHip, lK, .05, .95); seg(p.lSh, lK, lF, .05, .9); seg(p.lShorts, lHip, lK, 0, .5);
    seg(p.rTh, rHip, rK, .05, .95); seg(p.rSh, rK, rF, .05, .9); seg(p.rShorts, rHip, rK, 0, .5);
    const shoe = (m, k, f) => {
      const d = f.clone().sub(k).normalize();
      // toes point forward: perpendicular to shin in the sagittal plane, towards +x (or toward the viewer in front view)
      let fw = front ? V(1, 0, 0) : V(-d.y, d.x, 0); if (!front && fw.x < 0) fw.negate();
      const c = f.clone().add(fw.clone().multiplyScalar(2.2));
      m.position.copy(c);
      m.lookAt(c.clone().add(fw));
    };
    shoe(p.lShoe, lK, lF); shoe(p.rShoe, rK, rF);
    // torso
    const up = neck.clone().sub(hip);
    const side = V(0, 0, 1);
    p.pelvis.position.copy(hip.clone().add(up.clone().multiplyScalar(.04))); orient(p.pelvis, up, side);
    p.belly.position.copy(hip.clone().lerp(neck, .38)); orient(p.belly, up, side);
    p.chest.position.copy(hip.clone().lerp(neck, .72)); orient(p.chest, up, side);
    seg(p.neck, neck.clone().lerp(head, .05), neck.clone().lerp(head, .6));
    p.head.position.copy(head); orient(p.head, head.clone().sub(neck), side);
    const hu = head.clone().sub(neck).normalize();
    const fwd = front ? V(1, 0, 0) : V(hu.y, -hu.x, 0);
    p.hair.position.copy(head.clone().add(hu.clone().multiplyScalar(1.15)).add(fwd.clone().multiplyScalar(-.95))); orient(p.hair, hu, side);
    // arms: shoulders sit a little below the neck point, wide across the chest
    const sh = neck.clone().lerp(hip, .08);
    const lS = off(sh, -SHW), rS = off(sh, SHW);
    const armZ = front ? 0 : 1;
    const lE = off(J('le'), -SHW * armZ), lH = off(J('lh'), -SHW * armZ);
    const rE = off(J('re'), SHW * armZ), rH = off(J('rh'), SHW * armZ);
    if (front) { // front view: 2D x already holds the spread; shift shoulder ends out
      lE.z += -SHW + 0; lH.z += -SHW; rE.z += SHW; rH.z += SHW;
    }
    seg(p.lUa, lS, lE, .05, .95); seg(p.lFa, lE, lH, .05, .88); seg(p.lSleeve, lS, lE, 0, .42); p.lHand.position.copy(lH);
    seg(p.rUa, rS, rE, .05, .95); seg(p.rFa, rE, rH, .05, .88); seg(p.rSleeve, rS, rE, 0, .42); p.rHand.position.copy(rH);
    p.lDelt.position.copy(lS); p.rDelt.position.copy(rS);
    // props that move with the hands
    const pr = S.props;
    if (pr.bar) pr.bar.position.copy(lH.clone().lerp(rH, .5)).setZ(0);
    pr.held.forEach(([sd, g]) => g.position.copy(sd === 'l' ? lH : rH));
    if (pr.kb) pr.kb.position.copy(lH.clone().lerp(rH, .5));
    if (pr.cable) seg(pr.cable, V(pr.anchor[0], pr.anchor[1], 0), rH.clone().lerp(lH, .5));

    // ---- muscle shapes ride on the limbs, offset toward the front or back of the body
    const OV = S.OV;
    if (OV && Object.keys(OV).length) {
      const tUp = neck.clone().sub(hip).normalize();
      const fwdB = front ? V(1, 0, 0) : V(tUp.y, -tUp.x, 0).normalize();
      const put = (k, a, b, f0, f1, off, dz) => {
        const m = OV[k]; if (!m) return;
        const s0 = a.clone().lerp(b, f0), s1 = a.clone().lerp(b, f1);
        const c = s0.clone().lerp(s1, .5).add(fwdB.clone().multiplyScalar(off));
        if (dz) c.z += dz;
        m.position.copy(c);
        const d = s1.clone().sub(s0);
        if (d.length() > 1e-4) m.quaternion.setFromUnitVectors(UP, d.clone().normalize());
      };
      const at = (k, p0, off, dz) => { const m = OV[k]; if (!m) return; const c = p0.clone().add(fwdB.clone().multiplyScalar(off)); if (dz) c.z += dz; m.position.copy(c); orient(m, tUp, side); };
      const chestC = hip.clone().lerp(neck, .72), bellyC = hip.clone().lerp(neck, .38);
      at('pecL', chestC, 3.9, front ? -2.7 : -2.6); at('pecR', chestC, 3.9, front ? 2.7 : 2.6);
      at('abs', bellyC.clone().lerp(chestC, .1), 3.7, 0); at('absLow', hip.clone().lerp(neck, .2), 3.6, 0);
      at('obL', bellyC, 2.1, -3.9); at('obR', bellyC, 2.1, 3.9);
      at('lats', chestC.clone().lerp(bellyC, .35), -3.4, 0); at('traps', neck.clone().lerp(chestC, .35), -2.6, 0);
      at('lowback', bellyC.clone().lerp(hip, .45), -3.4, 0);
      at('gluteL', hip.clone(), -3.4, -2.5); at('gluteR', hip.clone(), -3.4, 2.5);
      at('deltL', lS, .3, 0); at('deltR', rS, .3, 0);
      put('biL', lS, lE, .25, .8, 1.5); put('biR', rS, rE, .25, .8, 1.5);
      put('triL', lS, lE, .2, .8, -1.5); put('triR', rS, rE, .2, .8, -1.5);
      put('faL', lE, lH, .15, .75, 1.1); put('faR', rE, rH, .15, .75, 1.1);
      put('quadL', lHip, lK, .25, .9, 1.9); put('quadR', rHip, rK, .25, .9, 1.9);
      put('hamL', lHip, lK, .3, .9, -1.9); put('hamR', rHip, rK, .3, .9, -1.9);
      put('calfL', lK, lF, .12, .6, -1.6); put('calfR', rK, rF, .12, .6, -1.6);
      put('hipfL', lHip, lK, .02, .32, 1.8); put('hipfR', rHip, rK, .02, .32, 1.8);
      put('addL', lHip, lK, .25, .85, .2, front ? 1.8 : 2.0); put('addR', rHip, rK, .25, .85, .2, front ? -1.8 : -2.0);
    }
    return { hip, head, feet: [lF, rF], hands: [lH, rH] };
  }

  const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  function lerpFrame(a, b, t) {
    const o = {};
    for (const k in a) o[k] = [a[k][0] + (b[k][0] - a[k][0]) * t, a[k][1] + (b[k][1] - a[k][1]) * t];
    return o;
  }
  function frameAt(S, time) {
    const fs = S.frames, n = fs.length;
    if (n === 1) {
      // gentle breathing for holds
      const f = fs[0], b = Math.sin(time * 2) * .25;
      return lerpFrame(f, Object.fromEntries(Object.entries(f).map(([k, v]) => [k, k === 'head' || k === 'neck' ? [v[0], v[1] + b] : v])), 1);
    }
    const dur = S.fig.dur || 2.2;
    const ph = (time % dur) / dur * n, i = Math.floor(ph), t = ease(ph - i);
    return lerpFrame(fs[i % n], fs[(i + 1) % n], t);
  }

  // camera framing from the bounds of all frames
  function frameCamera(S, cam, w, h, orbit, pad = 22) {
    let x0 = 1e9, x1 = -1e9, y1 = 0;
    S.frames.forEach(fr => Object.values(fr).forEach(([x, y]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }));
    (S.fig.props || []).forEach(pr => { if (pr.box) { x0 = Math.min(x0, pr.box[0]); x1 = Math.max(x1, pr.box[1]); } if (pr.bar) y1 = Math.max(y1, pr.bar[1] + 3); });
    y1 += 8;
    const front = !!S.fig.front;
    const cx = front ? 0 : (x0 + x1) / 2, span = front ? Math.max(30, (x1 - x0) * .9) : x1 - x0 + 16;
    const target = V(cx, y1 * .46, 0);
    const fov = cam.fov * Math.PI / 180, aspect = w / h;
    const needH = Math.max(y1 * 1.12, span / aspect * 1.05);
    const dist = needH / 2 / Math.tan(fov / 2) + pad;
    const yaw = (front ? 32 : 38) * Math.PI / 180 + orbit;
    // figure faces +x; camera sits front-side so you see the near side and the face
    const dir = V(Math.sin(yaw) * (front ? 1 : .75) * (S.posterior ? -1 : 1), .2, Math.cos(yaw)).normalize();
    cam.position.copy(target).add(dir.multiplyScalar(dist));
    cam.lookAt(target);
  }

  // ------------------------------------------------------------------ public: live view
  let active = null; // {el, S, cam, raf, t0}
  function mount(el, fig, opts = {}) {
    if (!fig || !el) return false;
    if (active && active.el !== el) {
      // leave a still image behind in the previous view
      try { const img = new Image(); img.src = renderer.domElement.toDataURL('image/png'); img.className = 'fig3d-still'; active.el.appendChild(img); } catch (e) { }
      stop();
    } else if (active) stop();
    const S = build(fig, !!opts.light, opts.hi);
    const cam = new T.PerspectiveCamera(30, 1, 1, 2000);
    const cv = renderer.domElement; cv.className = 'fig3d';
    el.querySelectorAll('.fig3d-still').forEach(x => x.remove());
    el.appendChild(cv);
    active = { el, S, cam, t0: performance.now(), orbit: opts.orbit !== false };
    const loop = () => {
      if (!active || active.S !== S) return;
      if (!el.isConnected) { stop(); return; }
      const w = el.clientWidth || 300, h = el.clientHeight || 300;
      if (cv.width !== Math.round(w * renderer.getPixelRatio()) || cv.height !== Math.round(h * renderer.getPixelRatio())) { renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
      const t = (performance.now() - active.t0) / 1000;
      pose(S, frameAt(S, t), !!fig.front);
      frameCamera(S, cam, w, h, active.orbit ? Math.sin(t * .35) * .22 : 0);
      renderer.render(S.scene, cam);
      active.raf = requestAnimationFrame(loop);
    };
    loop();
    return true;
  }
  function stop() {
    if (!active) return;
    cancelAnimationFrame(active.raf);
    disposeScene(active.S.scene);
    active = null;
  }
  function disposeScene(scene) {
    scene.traverse(o => { if (o.geometry) o.geometry.dispose(); });
  }

  // ------------------------------------------------------------------ public: still image of one pose
  const cache = {};
  function still(key, fig, frameIdx, w, h, light, hi) {
    const k = key + ':' + frameIdx + ':' + w + 'x' + h + (light ? 'L' : 'D') + (hi ? 'A' : '');
    if (cache[k]) return cache[k];
    const live = active;
    const S = build(Object.assign({}, fig, { frames: [fig.frames[frameIdx]] }), light, hi);
    const cam = new T.PerspectiveCamera(30, w / h, 1, 2000);
    const prevSize = new T.Vector2(); renderer.getSize(prevSize);
    renderer.setSize(w, h, false);
    pose(S, S.frames[0], !!fig.front);
    S.frames = fig.frames.map(Fig.solve); // frame the camera on the whole move so poses line up
    frameCamera(S, cam, w, h, 0, light ? 2 : 14);
    renderer.render(S.scene, cam);
    const url = renderer.domElement.toDataURL('image/png');
    renderer.domElement.style.width = renderer.domElement.style.height = '';
    disposeScene(S.scene);
    if (live) { renderer.setSize(prevSize.x, prevSize.y, false); }
    return (cache[k] = url);
  }

  const queue = [];
  let pumping = false;
  function pump() {
    pumping = true;
    const t0 = performance.now();
    while (queue.length && performance.now() - t0 < 24) {
      const img = queue.shift();
      if (!img.isConnected || img.src) continue;
      const id = img.dataset.still, x = EX[id] || EX.rest, fi = img.dataset.frame != null ? +img.dataset.frame : x.fig.frames.length - 1 >= 1 ? 1 : 0;
      try { img.src = still(id, x.fig, Math.min(fi, x.fig.frames.length - 1), 240, 190, true, highlightFor(x.muscles)); } catch (e) { }
    }
    if (queue.length) requestAnimationFrame(pump); else pumping = false;
  }
  function scan(root) {
    (root.querySelectorAll ? root.querySelectorAll('img[data-still]:not([src])') : []).forEach(img => queue.push(img));
    if (queue.length && !pumping) requestAnimationFrame(pump);
  }
  new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1) { if (n.matches && n.matches('img[data-still]')) queue.push(n); scan(n); } })))
    .observe(document.documentElement, { childList: true, subtree: true });
  if (!pumping && queue.length) requestAnimationFrame(pump);

  return { ok: true, mount, stop, still, renderer, scan, highlightFor };
})();
