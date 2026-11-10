/* Small canvas charts in the app's style. */
'use strict';

const Chart = {
  setup(canvas, h) {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth || canvas.parentNode.clientWidth || 320;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    canvas.style.height = h + 'px';
    const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
    return { ctx, w, h };
  },
  niceMax(v) {
    if (v <= 0) return 1;
    const p = Math.pow(10, Math.floor(Math.log10(v))), n = v / p;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
  },
  font(px, w = 600) { return `${w} ${px}px Inter, system-ui, sans-serif`; },

  // data: [{label, value, hi?}], opts: {h, fmt, color, highlightLast}
  bars(canvas, data, opts = {}) {
    const { ctx, w, h } = Chart.setup(canvas, opts.h || 180);
    const padL = 34, padB = 22, padT = 18, cw = w - padL - 4, ch = h - padB - padT;
    const max = Chart.niceMax(Math.max(...data.map(d => d.value), opts.min || 0));
    ctx.font = Chart.font(10); ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let i = 0; i <= 2; i++) {
      const y = padT + ch - ch * i / 2;
      ctx.fillStyle = '#9a9a9a'; ctx.fillText(Chart.short(max * i / 2), padL - 8, y);
      ctx.strokeStyle = '#ededed'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(w, y); ctx.stroke();
    }
    if (opts.goal) {
      const y = padT + ch - ch * Math.min(1, opts.goal / max);
      ctx.setLineDash([4, 4]); ctx.strokeStyle = '#ff9f2e'; ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(w, y); ctx.stroke(); ctx.setLineDash([]);
    }
    const n = data.length, slot = cw / n, bw = Math.max(3, Math.min(28, slot * 0.62));
    const every = Math.ceil(n / 8);
    data.forEach((d, i) => {
      const x = padL + slot * i + (slot - bw) / 2;
      const bh = max ? ch * d.value / max : 0;
      ctx.fillStyle = d.hi ? '#111' : (opts.color || '#d6d6d6');
      Chart.rr(ctx, x, padT + ch - bh, bw, Math.max(bh, d.value > 0 ? 3 : 0), Math.min(6, bw / 2));
      if ((i % every === 0 && n - 1 - i >= every) || i === n - 1) {
        ctx.fillStyle = d.hi ? '#111' : '#8a8a8a'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.font = Chart.font(10);
        ctx.fillText(d.label, x + bw / 2, padT + ch + 7);
      }
      if (d.hi && d.value > 0 && opts.showValue !== false) {
        ctx.fillStyle = '#111'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.font = Chart.font(11, 700);
        ctx.fillText(opts.fmt ? opts.fmt(d.value) : Chart.short(d.value), x + bw / 2, padT + ch - bh - 4);
      }
    });
  },

  // data: [{label, value}] (value null = gap); lower-is-better shows inverted axis when opts.invert
  line(canvas, data, opts = {}) {
    const { ctx, w, h } = Chart.setup(canvas, opts.h || 180);
    const padL = 40, padB = 22, padT = 16, cw = w - padL - 10, ch = h - padB - padT;
    const vals = data.map(d => d.value).filter(v => v != null);
    if (!vals.length) { ctx.fillStyle = '#9a9a9a'; ctx.font = Chart.font(13); ctx.textAlign = 'center'; ctx.fillText('No data yet', w / 2, h / 2); return; }
    let lo = Math.min(...vals), hi = Math.max(...vals);
    if (lo === hi) { lo -= 1; hi += 1; }
    const span = hi - lo; lo -= span * .15; hi += span * .15;
    const Y = v => opts.invert ? padT + ch * (v - lo) / (hi - lo) : padT + ch - ch * (v - lo) / (hi - lo);
    const X = i => padL + (data.length === 1 ? cw / 2 : cw * i / (data.length - 1));
    ctx.font = Chart.font(10); ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    [lo + (hi - lo) * .15, (lo + hi) / 2, hi - (hi - lo) * .15].forEach(v => {
      ctx.fillStyle = '#9a9a9a'; ctx.fillText(opts.fmt ? opts.fmt(v) : Chart.short(v), padL - 8, Y(v));
      ctx.strokeStyle = '#ededed'; ctx.beginPath(); ctx.moveTo(padL, Y(v)); ctx.lineTo(w, Y(v)); ctx.stroke();
    });
    // area + line
    const pts = data.map((d, i) => d.value == null ? null : [X(i), Y(d.value)]).filter(Boolean);
    const g = ctx.createLinearGradient(0, padT, 0, padT + ch);
    g.addColorStop(0, 'rgba(212,255,58,.55)'); g.addColorStop(1, 'rgba(212,255,58,0)');
    ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
    ctx.lineTo(pts[pts.length - 1][0], padT + ch); ctx.lineTo(pts[0][0], padT + ch); ctx.closePath(); ctx.fillStyle = g; ctx.fill();
    ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
    ctx.strokeStyle = '#111'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.stroke();
    pts.forEach((p, i) => { ctx.beginPath(); ctx.arc(p[0], p[1], i === pts.length - 1 ? 4.5 : 2.5, 0, 7); ctx.fillStyle = i === pts.length - 1 ? '#d4ff3a' : '#111'; ctx.fill(); if (i === pts.length - 1) { ctx.lineWidth = 2; ctx.strokeStyle = '#111'; ctx.stroke(); } });
    const every = Math.ceil(data.length / 7);
    ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillStyle = '#8a8a8a';
    data.forEach((d, i) => {
      if (!((i % every === 0 && data.length - 1 - i >= every) || i === data.length - 1)) return;
      const tw = ctx.measureText(d.label).width;
      ctx.fillText(d.label, clamp(X(i), padL + tw / 2, w - tw / 2 - 2), padT + ch + 7);
    });
  },

  // Activity mix: [{e, name, value}] horizontal bars, returns HTML (no canvas needed)
  mixHtml(items, fmt) {
    const max = Math.max(1, ...items.map(i => i.value));
    return items.map(i => `<div class="row" style="margin:8px 0"><div style="width:28px;font-size:20px">${i.e}</div>
      <div class="grow"><div class="between small"><span>${esc(i.name)}</span><span class="muted num">${fmt(i.value)}</span></div>
      <div class="bar mt4"><i style="width:${(i.value / max * 100).toFixed(1)}%"></i></div></div></div>`).join('');
  },

  // Draw a GPS route, fitted and north-up.
  route(canvas, points, opts = {}) {
    const { ctx, w, h } = Chart.setup(canvas, opts.h || 220);
    ctx.fillStyle = opts.bg || '#f2f2f2'; ctx.fillRect(0, 0, w, h);
    // faint grid
    ctx.strokeStyle = opts.grid || '#e9e9e9'; ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 24) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += 24) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    if (!points || points.length < 2) {
      ctx.fillStyle = '#9a9a9a'; ctx.font = Chart.font(13); ctx.textAlign = 'center';
      ctx.fillText(opts.empty || 'Waiting for GPS…', w / 2, h / 2); return;
    }
    const lat0 = points[0][0] * Math.PI / 180;
    const xy = points.map(p => [p[1] * Math.cos(lat0), p[0]]);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    xy.forEach(([x, y]) => { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); });
    const pad = 22, sx = (w - pad * 2) / Math.max(1e-9, maxX - minX), sy = (h - pad * 2) / Math.max(1e-9, maxY - minY);
    const s = Math.min(sx, sy), ox = (w - (maxX - minX) * s) / 2, oy = (h - (maxY - minY) * s) / 2;
    const P = ([x, y]) => [ox + (x - minX) * s, h - (oy + (y - minY) * s)];
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(212,255,58,.6)'; ctx.lineWidth = 9;
    ctx.beginPath(); xy.forEach((p, i) => { const q = P(p); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }); ctx.stroke();
    ctx.strokeStyle = opts.line || '#111'; ctx.lineWidth = 3.5; ctx.stroke();
    const a = P(xy[0]), b = P(xy[xy.length - 1]);
    ctx.fillStyle = '#3ddc84'; ctx.beginPath(); ctx.arc(a[0], a[1], 6, 0, 7); ctx.fill();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(b[0], b[1], 6, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b[0], b[1], 2.5, 0, 7); ctx.fill();
  },

  rr(ctx, x, y, w, h, r) {
    if (h <= 0) return;
    r = Math.min(r, h / 2, w / 2);
    ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.fill();
  },
  short(v) { return v >= 1000 ? (v / 1000).toFixed(v >= 10000 ? 0 : 1) + 'k' : (Math.round(v * 10) / 10).toString(); },
};

function ringSvg(pct, size = 64, stroke = 7, color = '#111', track = '#e6e6e6') {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, off = c * (1 - clamp(pct, 0, 1));
  return `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${track}" stroke-width="${stroke}"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"/></svg>`;
}
