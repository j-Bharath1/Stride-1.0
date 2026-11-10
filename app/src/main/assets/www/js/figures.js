/* Animated exercise demos: a tiny stick-figure rig rendered as SVG with SMIL animation.
   World units, y up, ground at y = 0. Figure faces +x (right) in side view. */
'use strict';

const Fig = (() => {
  const LEN = { torso: 30, neck: 7, head: 5.6, ua: 13, fa: 12, th: 21, sh: 20 };
  const R = d => d * Math.PI / 180;
  // limb angle: 0 = straight down, +90 = forward (+x), 180 = up
  const dA = a => [Math.sin(R(a)), -Math.cos(R(a))];
  // torso angle: 0 = straight up, +90 = forward
  const dT = t => [Math.sin(R(t)), Math.cos(R(t))];
  const add = (p, d, l) => [p[0] + d[0] * l, p[1] + d[1] * l];

  function limb(base, spec, l1, l2) {
    if (Array.isArray(spec)) { const j = add(base, dA(spec[0]), l1); return [j, add(j, dA(spec[1]), l2)]; }
    const T = spec.ik, dx = T[0] - base[0], dy = T[1] - base[1];
    let d = Math.hypot(dx, dy);
    if (d >= l1 + l2 - 0.05) { const u = [dx / d, dy / d]; return [add(base, u, l1), add(base, u, l1 + l2)]; }
    d = Math.max(d, Math.abs(l1 - l2) + 0.05);
    const th = Math.atan2(dy, dx), A = Math.acos((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d));
    const c1 = [base[0] + l1 * Math.cos(th + A), base[1] + l1 * Math.sin(th + A)];
    const c2 = [base[0] + l1 * Math.cos(th - A), base[1] + l1 * Math.sin(th - A)];
    const b = { f: [1, 0], b: [-1, 0], u: [0, 1], d: [0, -1] }[spec.bend || 'f'];
    const m = [(base[0] + T[0]) / 2, (base[1] + T[1]) / 2];
    const s = c => (c[0] - m[0]) * b[0] + (c[1] - m[1]) * b[1];
    return [s(c1) >= s(c2) ? c1 : c2, T];
  }

  // Solve a pose into joint positions.
  function solve(p) {
    const hip = p.hip;
    const t = p.neck ? Math.atan2(p.neck[0] - hip[0], p.neck[1] - hip[1]) * 180 / Math.PI : (p.t || 0);
    const neck = add(hip, dT(t), LEN.torso);
    const head = add(neck, dT(t + (p.head || 0)), LEN.neck);
    const ll = limb(hip, p.ll, LEN.th, LEN.sh), rl = limb(hip, p.rl, LEN.th, LEN.sh);
    const la = limb(neck, p.la, LEN.ua, LEN.fa), ra = limb(neck, p.ra, LEN.ua, LEN.fa);
    const lift = p.lift || 0;
    const up = q => [q[0], q[1] + lift];
    return {
      hip: up(hip), neck: up(neck), head: up(head),
      lk: up(ll[0]), lf: up(ll[1]), rk: up(rl[0]), rf: up(rl[1]),
      le: up(la[0]), lh: up(la[1]), re: up(ra[0]), rh: up(ra[1]),
    };
  }

  // Segments in draw order: far side first (lighter), then torso, near side.
  const SEGS = [
    ['neck', 'le', 'far'], ['le', 'lh', 'far'], ['hip', 'lk', 'far'], ['lk', 'lf', 'far'],
    ['hip', 'neck', 'body'],
    ['hip', 'rk', 'near'], ['rk', 'rf', 'near'], ['neck', 're', 'near'], ['re', 'rh', 'near'],
  ];

  const f1 = n => (Math.round(n * 10) / 10).toString();

  function anim(attr, vals, dur, extra = '') {
    if (vals.length < 2 || vals.every(v => v === vals[0])) return '';
    const all = vals.concat([vals[0]]);
    const n = all.length - 1;
    const kt = all.map((_, i) => (i / n).toFixed(3)).join(';');
    const ks = Array(n).fill('.45 0 .55 1').join(';');
    return `<animate attributeName="${attr}" values="${all.join(';')}" keyTimes="${kt}" calcMode="spline" keySplines="${ks}" dur="${dur}s" repeatCount="indefinite" ${extra}/>`;
  }

  // Character palette (side view: far limbs a shade darker)
  const PAL_LIGHT = {
    skin: '#b47a52', skinFar: '#8a5a3b', shirt: '#4b5059', shirtFar: '#363a41',
    shorts: '#1c1e22', shortsFar: '#141518', shoe: '#0f1012', sole: '#e9e9e9', hair: '#1d1512', beard: '#231915',
  };
  const PAL_DARK = Object.assign({}, PAL_LIGHT, { shorts: '#33363d', shortsFar: '#26292e', shoe: '#e9ebee', shirt: '#5a606a', shirtFar: '#41464e' });
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const norm = v => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };

  // Build the drawing primitives for one solved frame. Same list shape for every frame.
  function parts(fr, front, opts) {
    const PAL = opts.dark ? PAL_DARK : PAL_LIGHT;
    const P = [];
    const L = (a, b, w, c) => P.push({ k: 'l', x1: a[0], y1: a[1], x2: b[0], y2: b[1], w, c });
    const C = (p, r, c) => P.push({ k: 'c', cx: p[0], cy: p[1], r, c });
    const leg = (hip, knee, foot, far) => {
      L(hip, knee, 8, far ? PAL.skinFar : PAL.skin);
      L(knee, foot, 6.4, far ? PAL.skinFar : PAL.skin);
      L(hip, lerp(hip, knee, .58), 9.6, far ? PAL.shortsFar : PAL.shorts);
      const d = norm([foot[0] - knee[0], foot[1] - knee[1]]);
      const p1 = [-d[1], d[0]], p2 = [d[1], -d[0]], pd = p1[0] >= p2[0] ? p1 : p2;
      const t2 = front ? [foot[0], foot[1] + .01] : [foot[0] + pd[0] * 4.6, foot[1] + pd[1] * 4.6];
      L(foot, t2, 4.8, PAL.shoe);
    };
    const arm = (sh, el, hand, far) => {
      L(sh, el, 5.6, far ? PAL.skinFar : PAL.skin);
      L(el, hand, 4.7, far ? PAL.skinFar : PAL.skin);
      L(sh, lerp(sh, el, .45), 7.4, far ? PAL.shirtFar : PAL.shirt);
      C(hand, 2.5, far ? PAL.skinFar : PAL.skin);
    };
    arm(fr.neck, fr.le, fr.lh, !front);
    leg(fr.hip, fr.lk, fr.lf, !front);
    // torso: shirt with shorts waistband, neck
    L(fr.hip, fr.neck, 12.6, PAL.shirt);
    L(fr.hip, lerp(fr.hip, fr.neck, .2), 12.8, PAL.shorts);
    L(fr.neck, lerp(fr.neck, fr.head, .55), 4.6, PAL.skin);
    leg(fr.hip, fr.rk, fr.rf, false);
    // head
    const u = norm([fr.head[0] - fr.neck[0], fr.head[1] - fr.neck[1]]);
    const f = front ? [0, 0] : [u[1], -u[0]]; // facing direction (+x when upright)
    const H = fr.head;
    if (opts.face) {
      P.push({ k: 'img', cx: H[0], cy: H[1] + (front ? 0 : .6), r: 8.4 });
    } else {
      C([H[0] - f[0] * 1.1 + u[0] * 1.2, H[1] - f[1] * 1.1 + u[1] * 1.2], 6.3, PAL.hair);
      C([H[0] + f[0] * .9 - u[0] * .5, H[1] + f[1] * .9 - u[1] * .5], 5.5, PAL.skin);
      C([H[0] + f[0] * 1.6 - u[0] * 2.9, H[1] + f[1] * 1.6 - u[1] * 2.9], front ? 3.6 : 3.3, PAL.beard);
      C([H[0] + f[0] * 2.2 - u[0] * 1.2, H[1] + f[1] * 2.2 - u[1] * 1.2], 2.6, PAL.skin); // cheek over beard top
      C([H[0] + f[0] * 3.6 + u[0] * .9 - (front ? 2 : 0), H[1] + f[1] * 3.6 + u[1] * .9], .7, '#1a1a1a');
      if (front) C([H[0] + 2, H[1] + .9], .7, '#1a1a1a');
    }
    arm(fr.neck, fr.re, fr.rh, false);
    return P;
  }

  // fig: {frames:[pose,...], dur, front, props:[...]}; opts: {dark, face}
  function svg(fig, opts = {}) {
    if (!fig) return '';
    const frames = fig.frames.map(solve);
    const dur = fig.dur || 2.2;
    const front = !!fig.front;
    const dark = !!opts.dark;
    const face = opts.face ? (typeof opts.face === 'string' ? opts.face : Fig.faceUrl) : null;
    // bounds
    let x0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const grow = (x, y) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y1 = Math.max(y1, y); };
    frames.forEach(fr => Object.values(fr).forEach(([x, y]) => grow(x, y)));
    frames.forEach(fr => { grow(fr.head[0] - 9, fr.head[1] + 9); grow(fr.head[0] + 9, fr.head[1] + 9); });
    (fig.props || []).forEach(pr => {
      if (pr.wall != null) grow(pr.wall, 70);
      if (pr.box) { grow(pr.box[0], pr.box[2]); grow(pr.box[1], pr.box[2]); }
      if (pr.bar) { grow(pr.bar[0] - 12, pr.bar[1]); grow(pr.bar[0] + 12, pr.bar[1] + 2); }
      if (pr.anchor) grow(pr.anchor[0], pr.anchor[1]);
    });
    const pad = 9;
    let w = x1 - x0 + pad * 2, h = Math.max(y1, 30) + pad + 5;
    const asp = opts.aspect || 1.25;
    if (w < h * asp) { const extra = (h * asp - w) / 2; x0 -= extra; w = h * asp; }
    const vb = `${f1(x0 - pad)} ${f1(-(Math.max(y1, 30) + pad))} ${f1(w)} ${f1(h)}`;
    const Y = y => -y;
    const g = dark ? { ground: '#2a3340', shadow: 'rgba(0,0,0,.45)', box: '#2b3440', boxS: '#3d4757', bar: '#a7b0bb', cable: '#7f8a97', plate: '#e8ecf1' }
      : { ground: '#e2e2e2', shadow: 'rgba(0,0,0,.10)', box: '#ececec', boxS: '#cfcfcf', bar: '#777', cable: '#9a9a9a', plate: '#111' };

    const uid = 'f' + Math.random().toString(36).slice(2, 8);
    let out = `<svg class="fig" viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" preserveAspectRatio="xMidYMax meet">`;
    if (face) out += `<defs><clipPath id="${uid}c" clipPathUnits="objectBoundingBox"><circle cx=".5" cy=".5" r=".5"/></clipPath></defs>`;
    out += `<line x1="${f1(x0 - pad)}" y1="0.8" x2="${f1(x0 - pad + w)}" y2="0.8" stroke="${g.ground}" stroke-width="1.4"/>`;
    // soft floor shadow under the hips
    const sx = frames.map(fr => f1((fr.lf[0] + fr.rf[0] + fr.hip[0]) / 3));
    out += `<ellipse cx="${sx[0]}" cy="1" rx="16" ry="1.8" fill="${g.shadow}">${anim('cx', sx, dur)}</ellipse>`;
    (fig.props || []).forEach(pr => {
      if (pr.wall != null) out += `<rect x="${f1(pr.wall)}" y="-72" width="5" height="72" fill="${g.box}"/>`;
      if (pr.box) out += `<rect x="${f1(pr.box[0])}" y="${f1(Y(pr.box[2]))}" width="${f1(pr.box[1] - pr.box[0])}" height="${f1(pr.box[2])}" rx="1.5" fill="${g.box}" stroke="${g.boxS}" stroke-width=".8"/>`;
      if (pr.bar) out += `<line x1="${f1(pr.bar[0] - 12)}" y1="${f1(Y(pr.bar[1]))}" x2="${f1(pr.bar[0] + 12)}" y2="${f1(Y(pr.bar[1]))}" stroke="${g.bar}" stroke-width="2.4" stroke-linecap="round"/>`;
    });
    (fig.props || []).filter(pr => pr.anchor).forEach(pr => {
      const xs = frames.map(fr => f1(fr.rh[0])), ys = frames.map(fr => f1(Y(fr.rh[1])));
      out += `<line x1="${f1(pr.anchor[0])}" y1="${f1(Y(pr.anchor[1]))}" x2="${xs[0]}" y2="${ys[0]}" stroke="${g.cable}" stroke-width="1">${anim('x2', xs, dur)}${anim('y2', ys, dur)}</line>`;
    });
    // character
    const all = frames.map(fr => parts(fr, front, { face, dark }));
    all[0].forEach((p0, i) => {
      const seq = all.map(ps => ps[i]);
      if (p0.k === 'l') {
        const A = k => seq.map(p => f1(k.startsWith('y') ? Y(p[k]) : p[k]));
        const xa = A('x1'), ya = A('y1'), xb = A('x2'), yb = A('y2');
        out += `<line x1="${xa[0]}" y1="${ya[0]}" x2="${xb[0]}" y2="${yb[0]}" stroke="${p0.c}" stroke-width="${p0.w}" stroke-linecap="round">`
          + anim('x1', xa, dur) + anim('y1', ya, dur) + anim('x2', xb, dur) + anim('y2', yb, dur) + '</line>';
      } else if (p0.k === 'c') {
        const cx = seq.map(p => f1(p.cx)), cy = seq.map(p => f1(Y(p.cy)));
        out += `<circle cx="${cx[0]}" cy="${cy[0]}" r="${p0.r}" fill="${p0.c}">${anim('cx', cx, dur)}${anim('cy', cy, dur)}</circle>`;
      } else if (p0.k === 'img') {
        const xs = seq.map(p => f1(p.cx - p.r)), ys = seq.map(p => f1(Y(p.cy) - p.r)), s = f1(p0.r * 2);
        const rx = seq.map(p => f1(p.cx)), ry = seq.map(p => f1(Y(p.cy)));
        out += `<circle cx="${rx[0]}" cy="${ry[0]}" r="${f1(p0.r + .7)}" fill="#fff">${anim('cx', rx, dur)}${anim('cy', ry, dur)}</circle>`;
        out += `<image href="${face}" xlink:href="${face}" x="${xs[0]}" y="${ys[0]}" width="${s}" height="${s}" clip-path="url(#${uid}c)" preserveAspectRatio="xMidYMid slice">${anim('x', xs, dur)}${anim('y', ys, dur)}</image>`;
      }
    });
    // hand-held weights
    const held = (fig.props || []).find(pr => pr.db || pr.bb || pr.kb);
    if (held) {
      const hands = held.bb || held.kb ? ['rh'] : ['lh', 'rh'];
      hands.forEach(hk => {
        const xs = frames.map(fr => f1(fr[hk][0])), ys = frames.map(fr => f1(Y(fr[hk][1])));
        if (held.bb) out += `<circle cx="${xs[0]}" cy="${ys[0]}" r="7.2" fill="${dark ? '#1b1d21' : '#2a2a2a'}" stroke="${dark ? '#5d6672' : '#111'}" stroke-width="1.6">${anim('cx', xs, dur)}${anim('cy', ys, dur)}</circle>`
          + `<circle cx="${xs[0]}" cy="${ys[0]}" r="1.8" fill="#bfc6cf">${anim('cx', xs, dur)}${anim('cy', ys, dur)}</circle>`;
        else if (held.kb) out += `<circle cx="${xs[0]}" cy="${ys[0]}" r="4.6" fill="#2a2d33" stroke="#111" stroke-width="1.2">${anim('cx', xs, dur)}${anim('cy', ys, dur)}</circle>`;
        else out += `<rect x="${xs[0]}" y="${ys[0]}" width="10" height="4" rx="1.6" fill="${hk === 'lh' && !front ? '#25282d' : '#33373e'}" stroke="#0e0f11" stroke-width="1" transform="translate(-5 -2)">${anim('x', xs, dur)}${anim('y', ys, dur)}</rect>`;
      });
    }
    return out + '</svg>';
  }

  return { svg, solve, LEN, faceUrl: 'img/me.jpg' };
})();

// ------------------------------------------------------------------ pose builders
const PB = (() => {
  const S = { hip: [0, 41], t: 0, ll: { ik: [-1.5, 0] }, rl: { ik: [1.5, 0] }, la: [3, 6], ra: [-3, 2] };
  const pose = o => Object.assign({}, S, o);
  const deg = Math.PI / 180;

  // Straight-body plank family rotating about the feet (or knees).
  function plank(o = {}) {
    const elev = o.elev != null ? o.elev : 20.6;
    const pivot = o.knees ? [o.feetX != null ? o.feetX : -20, 0] : [o.feetX != null ? o.feetX : -40, 0];
    const legLen = o.knees ? 21 : 41;
    const hip = [pivot[0] + legLen * Math.cos(elev * deg), legLen * Math.sin(elev * deg)];
    const t = 90 - elev + (o.tAdj || 0);
    const p = { hip, t, head: o.head || 0, lift: o.lift || 0 };
    if (o.knees) {
      // thighs down to the knees, shins flat behind
      p.ll = [-(90 - elev), -88]; p.rl = [-(90 - elev), -86];
    } else {
      p.ll = o.ll || { ik: [pivot[0] - 1, 0] }; p.rl = o.rl || { ik: [pivot[0] + 1, 0] };
    }
    const neck = [hip[0] + 30 * Math.sin(t * deg), hip[1] + 30 * Math.cos(t * deg)];
    const handX = o.handX != null ? o.handX : neck[0];
    if (o.forearm) { p.la = [-4, 90]; p.ra = [2, 92]; }
    else { p.la = o.la || { ik: [handX - 1, 0], bend: o.bend || 'b' }; p.ra = o.ra || { ik: [handX + 1, 0], bend: o.bend || 'b' }; }
    return p;
  }
  // shoulder position of a straight-arm plank (for fixing hands)
  function plankNeckX(elev = 20.6, feetX = -40) { const hip = [feetX + 41 * Math.cos(elev * deg), 41 * Math.sin(elev * deg)]; return hip[0] + 30 * Math.sin((90 - elev) * deg); }

  function squat(d, o = {}) { // d: 0 standing .. 1 deep
    return pose(Object.assign({ hip: [-9 * d, 41 - 19 * d], t: 6 + 38 * d, ll: { ik: [2, 0], bend: 'f' }, rl: { ik: [4, 0], bend: 'f' }, la: [80, 85], ra: [85, 90] }, o));
  }
  function lunge(d, o = {}) { // reverse/forward lunge, near leg in front
    const hy = 41 - 16 * d;
    return pose(Object.assign({ hip: [0, hy], t: 4, rl: { ik: [12 + 6 * d, 0], bend: 'f' }, ll: { ik: [-16 - 6 * d, 0], bend: 'd' }, la: [10, 15], ra: [-10, -5] }, o));
  }
  // lying on back, head toward -x, knees bent
  function supine(o = {}) {
    return Object.assign({ hip: [0, 4.5], t: -86, ll: { ik: [19, 0.5], bend: 'u' }, rl: { ik: [21, 0.5], bend: 'u' }, la: [-10, 0], ra: [-20, -10], head: -4 }, o);
  }
  // face down, head toward +x
  function prone(o = {}) {
    return Object.assign({ hip: [0, 4], t: 88, ll: [-88, -90], rl: [-87, -89], la: [175, 178], ra: [170, 175] }, o);
  }
  // hands & knees
  function quad(o = {}) {
    return Object.assign({ hip: [0, 21], t: 82, ll: [0, -88], rl: [2, -86], la: { ik: [29, 0], bend: 'b' }, ra: { ik: [31, 0], bend: 'b' } }, o);
  }
  // sitting on the floor, leaning back
  function seated(o = {}) {
    return Object.assign({ hip: [0, 4.5], t: -30, ll: { ik: [22, 0.5], bend: 'u' }, rl: { ik: [24, 0.5], bend: 'u' }, la: [60, 90], ra: [70, 95] }, o);
  }
  return { pose, plank, plankNeckX, squat, lunge, supine, prone, quad, seated, S };
})();
