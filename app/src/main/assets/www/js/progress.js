/* Progress: charts, personal records, club badges. */
'use strict';

const Progress = {
  range: 'weeks', metric: 'km',
  METRICS: [
    { id: 'km', name: 'Distance', unit: 'km', f: es => sum(es.filter(e => e.type === 'run' || e.type === 'walk' || e.type === 'hike'), e => e.distM) / 1000, fmt: v => v.toFixed(1) },
    { id: 'min', name: 'Active time', unit: 'min', f: es => sum(es, e => e.durSec) / 60, fmt: v => Math.round(v) },
    { id: 'push', name: 'Push-ups', unit: 'reps', f: es => sum(es.filter(e => e.type === 'pushups'), e => e.reps), fmt: v => F.int(v) },
    { id: 'sess', name: 'Sessions', unit: '', f: es => es.filter(Log.isActive).length, fmt: v => v },
  ],

  buckets() {
    const today = D.today(), out = [];
    if (Progress.range === 'days') {
      for (let k = 29; k >= 0; k--) { const d = D.add(today, -k); out.push({ label: String(+d.slice(8)), from: d, to: d, hi: k === 0 }); }
    } else if (Progress.range === 'weeks') {
      const m = D.monday(today);
      for (let k = 11; k >= 0; k--) { const s = D.add(m, -7 * k); out.push({ label: D.parse(s).getDate() + '/' + (D.parse(s).getMonth() + 1), from: s, to: D.add(s, 6), hi: k === 0 }); }
    } else {
      const ym = D.month(today);
      for (let k = 11; k >= 0; k--) { const m = D.addMonth(ym, -k); out.push({ label: D.monthName(m).slice(0, 3), from: m + '-01', to: m + '-31', hi: k === 0 }); }
    }
    return out;
  },

  render(v) {
    const P = Progress, met = P.METRICS.find(m => m.id === P.metric);
    const b = P.buckets();
    const data = b.map(x => ({ label: x.label, value: met.f(Log.range(x.from, x.to)), hi: x.hi }));
    const all = Log.range(b[0].from, b[b.length - 1].to);
    const total = met.f(all), avg = total / b.length;
    const rec = Club.records(), cs = Club.stats();
    const rangeName = { days: 'last 30 days', weeks: 'last 12 weeks', months: 'last 12 months' }[P.range];
    const per = { days: 'day', weeks: 'week', months: 'month' }[P.range];

    v.innerHTML = `
      <div class="top"><h1 class="h1">Progress</h1></div>
      <div class="page" style="padding-top:8px">
        <div class="seg" id="p-range"><button data-r="days">30 days</button><button data-r="weeks">12 weeks</button><button data-r="months">12 months</button></div>
        <div class="chips mt12" id="p-met">${P.METRICS.map(m => `<button class="chip ${m.id === P.metric ? 'on' : ''}" data-m="${m.id}">${m.name}</button>`).join('')}</div>
        <div class="mt16"><div class="big-num num" style="font-size:56px">${met.fmt(total)}<span class="small muted" style="font-family:var(--body);font-weight:600;font-size:15px"> ${met.unit}</span></div>
          <div class="muted small">${esc(met.name)} · ${rangeName} · avg ${met.fmt(avg)} ${met.unit} per ${per}</div></div>
        <canvas class="chart mt16" id="p-chart"></canvas>
      </div>

      <div class="section"><div class="section-head"><h2 class="h2">Activity mix</h2><span class="muted small">${rangeName}</span></div>
        <div class="card">${Chart.mixHtml(TYPES.map(t => ({ e: t.e, name: t.name, value: all.filter(e => e.type === t.id).length })).filter(x => x.value).sort((a, c) => c.value - a.value), x => x + (x === 1 ? ' time' : ' times')) || '<div class="muted small">Nothing logged in this range.</div>'}</div></div>

      <div class="section"><div class="section-head"><h2 class="h2">Personal records</h2></div>
        <div class="card records">
          ${Progress.rec('Longest distance', rec.far && F.km(rec.far.distM) + ' km', rec.far && rec.far.date)}
          ${Progress.rec('Longest session', rec.longTime && F.dur(rec.longTime.durSec), rec.longTime && rec.longTime.date)}
          ${Progress.rec('Most push-ups in a day', rec.pushDay && F.int(rec.pushDay[1]), rec.pushDay && rec.pushDay[0])}
          ${Progress.rec('Biggest week', rec.bigWeek && Math.round(rec.bigWeek[1] / 60) + ' min', rec.bigWeek && rec.bigWeek[0])}
          ${Progress.rec('Best streak', cs.bestStreak ? cs.bestStreak + ' days' : null)}
        </div></div>

      <div class="section"><div class="section-head"><h2 class="h2">Club</h2><span class="muted small">${BADGES.filter(x => x.test(cs)).length} / ${BADGES.length} badges</span></div>
        <div class="card"><div class="stats">
          <div class="stat"><div class="v num">${cs.totalKm.toFixed(0)}</div><div class="k">lifetime km</div></div>
          <div class="stat"><div class="v num">${cs.runs}</div><div class="k">runs</div></div>
          <div class="stat"><div class="v num">${F.int(cs.pushups)}</div><div class="k">push-ups</div></div></div>
          <div class="mt12 small muted">Next km milestone: ${[50, 100, 250, 500, 1000, 2500, 5000].find(m => m > cs.totalKm) || '∞'} km</div>
          <div class="bar mt4"><i style="width:${Progress.milestonePct(cs.totalKm)}%"></i></div></div>
        <div class="badges mt12">${BADGES.map(x => { const got = x.test(cs); return `<div class="badge ${got ? 'got' : ''}"><div class="bi" style="${x.e.length > 2 && /\w/.test(x.e) ? 'font-family:var(--display);font-weight:700;font-size:18px;color:#111' : ''}">${x.e}</div><div class="bn">${esc(x.n)}</div><div class="bd">${esc(x.d)}</div></div>`; }).join('')}</div></div>`;

    $$('#p-range button', v).forEach(bt => { bt.classList.toggle('on', bt.dataset.r === P.range); bt.onclick = () => { P.range = bt.dataset.r; App.render(); }; });
    $$('#p-met .chip', v).forEach(bt => bt.onclick = () => { P.metric = bt.dataset.m; App.render(); });
    $$('[data-dayrec]', v).forEach(bt => bt.onclick = () => LogUI.openDay(bt.dataset.dayrec));
    requestAnimationFrame(() => {
      Chart.bars($('#p-chart', v), data, { h: 190, fmt: met.fmt, goal: P.metric === 'km' && P.range === 'months' ? DB.get('settings').monthlyKm : 0 });
    });
  },

  rec(name, value, date) {
    return `<button class="rec" style="width:100%;text-align:left" ${date ? `data-dayrec="${date}"` : ''}>
      <div><div class="small">${esc(name)}</div>${date ? `<div class="tiny muted">${esc(D.nice(date))}</div>` : ''}</div>
      <b class="num ${value ? '' : 'dim'}">${value || '—'}</b></button>`;
  },
  milestonePct(km) {
    const ms = [0, 50, 100, 250, 500, 1000, 2500, 5000];
    const i = ms.findIndex(m => m > km); if (i < 0) return 100;
    return clamp((km - ms[i - 1]) / (ms[i] - ms[i - 1]) * 100, 0, 100);
  },
};
App.register('progress', Progress);
