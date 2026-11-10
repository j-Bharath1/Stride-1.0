/* Log: the training diary. Month (goals/results + calendar boxes), week, day, journal. */
'use strict';

const LogUI = {
  view: 'month', ym: null, weekStart: null, day: null,

  render(v) {
    const S = LogUI, today = D.today();
    S.ym = S.ym || D.month(today); S.weekStart = S.weekStart || D.monday(today); S.day = S.day || today;
    const title = S.view === 'week' ? `${D.nice(S.weekStart)} – ${D.nice(D.add(S.weekStart, 6))}` : S.view === 'day' ? D.long(S.day) : D.monthName(S.ym);
    const year = S.view === 'month' || S.view === 'journal' ? S.ym.slice(0, 4) : '';
    v.innerHTML = `
      <div class="top" style="align-items:center">
        <div class="grow"><div class="eyebrow">${year || 'Diary'}</div><h1 class="h1 ${S.view === 'week' || S.view === 'day' ? '' : ''}" style="${S.view === 'week' || S.view === 'day' ? 'font-size:24px' : ''}">${esc(title)}</h1></div>
        <button class="icon-btn" data-prev>${ICON.left}</button><button class="icon-btn" data-next>${ICON.right}</button>
      </div>
      <div class="page" style="padding-top:6px"><div class="seg" id="l-seg"><button data-v="day">Day</button><button data-v="week">Week</button><button data-v="month">Month</button><button data-v="journal">Journal</button></div></div>
      <div id="l-body"></div>
      <button class="btn volt" id="l-add" style="position:fixed;right:16px;bottom:calc(var(--tabs-h) + 16px);z-index:5;box-shadow:0 6px 20px rgba(0,0,0,.6)">${ICON.plus.replace('<svg', '<svg width="20" height="20" fill="currentColor"')} Log</button>`;
    $$('#l-seg button', v).forEach(b => { b.classList.toggle('on', b.dataset.v === S.view); b.onclick = () => { S.view = b.dataset.v; if (S.view === 'day') S.day = S.day || today; App.render(); }; });
    const step = n => {
      if (S.view === 'month' || S.view === 'journal') S.ym = D.addMonth(S.ym, n);
      else if (S.view === 'week') { S.weekStart = D.add(S.weekStart, 7 * n); S.ym = D.month(S.weekStart); }
      else { S.day = D.add(S.day, n); S.ym = D.month(S.day); }
      App.render();
    };
    $('[data-prev]', v).onclick = () => step(-1);
    $('[data-next]', v).onclick = () => step(1);
    onPress($('h1', v), () => { S.ym = D.month(today); S.weekStart = D.monday(today); S.day = today; App.render(); });
    $('#l-add', v).onclick = () => LogUI.addSheet(S.view === 'day' ? S.day : today);
    const body = $('#l-body', v);
    ({ month: LogUI.monthView, week: LogUI.weekView, day: LogUI.dayView, journal: LogUI.journalView })[S.view](body);
    body.insertAdjacentHTML('beforeend', '<div style="height:70px"></div>');
  },

  // ---------------------------------------------------------- MONTH: goals/results + calendar
  monthView(body) {
    const ym = LogUI.ym, today = D.today();
    const goals = DB.get('goals')[ym] || [];
    const first = ym + '-01', n = D.daysInMonth(ym), lead = D.dow(first);
    const cells = [];
    for (let k = 0; k < lead; k++) cells.push(null);
    for (let d = 1; d <= n; d++) cells.push(ym + '-' + String(d).padStart(2, '0'));
    while (cells.length % 7) cells.push(null);
    const m = Club.month(ym);
    const ents = Log.range(first, ym + '-31');

    body.innerHTML = `
      <div class="section" style="margin-top:4px">
        <div class="goals" id="l-goals">
          <div class="gh">Goals</div><div class="gh">Results</div>
          ${(goals.length ? goals : [{}, {}, {}]).map(g => `<div class="gc ${g.done ? 'done' : ''}" data-g><span class="chk ${g.done ? 'on' : ''}">${g.done ? '✓' : ''}</span><span class="t">${g.text ? esc(g.text) : '<span class="dim">•</span>'}</span></div>
            <div class="gc r" data-g>${g.result ? esc(g.result) : ''}</div>`).join('')}
        </div>
        <div class="tiny muted mt4">Tap to edit goals and results</div>
      </div>

      <div class="section">
        <div class="cal-head">${D.DAYS.map(d => `<div>${d}</div>`).join('')}</div>
        <div class="cal" id="l-cal">${cells.map(d => {
          if (!d) return '<div class="c out"></div>';
          const di = Diary.get(d), em = Log.emojis(d), dow = D.dow(d);
          return `<div class="c ${dow >= 5 ? 'we' : ''} ${d === today ? 'today' : ''}" data-d="${d}">
            ${di.long ? '<i class="pen"></i>' : ''}<div class="dn">${+d.slice(8)}</div>
            <div class="em">${em.slice(0, 4).join('')}</div>${di.short ? `<div class="nt">${esc(di.short)}</div>` : ''}</div>`;
        }).join('')}</div>
        <div class="tiny muted mt8">Tap a day for a quick note · <b>long-press</b> to write in detail <span style="color:var(--blue)">●</span></div>
      </div>

      <div class="section"><div class="card"><div class="stats">
        <div class="stat"><div class="v num">${new Set(ents.filter(Log.isActive).map(e => e.date)).size}</div><div class="k">active days</div></div>
        <div class="stat"><div class="v num">${m.km.toFixed(1)}</div><div class="k">km run</div></div>
        <div class="stat"><div class="v num">${F.int(m.pushups)}</div><div class="k">push-ups</div></div></div>
        <div class="mt12">${Chart.mixHtml(TYPES.map(t => ({ e: t.e, name: t.name, value: ents.filter(e => e.type === t.id).length })).filter(x => x.value).sort((a, b) => b.value - a.value).slice(0, 5), x => x + '×') || '<div class="muted small">Nothing logged this month yet.</div>'}</div>
      </div></div>`;

    $$('#l-goals [data-g]', body).forEach(el => el.onclick = () => LogUI.goalsSheet(ym));
    $$('#l-cal .c[data-d]', body).forEach(c => onPress(c, () => LogUI.openDay(c.dataset.d), () => LogUI.writer(c.dataset.d)));
  },

  // ---------------------------------------------------------- WEEK
  weekView(body) {
    const ws = LogUI.weekStart, today = D.today();
    const ents = Log.range(ws, D.add(ws, 6));
    const km = sum(ents.filter(e => e.type === 'run'), e => e.distM) / 1000;
    body.innerHTML = `
      <div class="section" style="margin-top:4px"><div class="card"><div class="stats">
        <div class="stat"><div class="v num">${new Set(ents.filter(Log.isActive).map(e => e.date)).size}/7</div><div class="k">active days</div></div>
        <div class="stat"><div class="v num">${km.toFixed(1)}</div><div class="k">km</div></div>
        <div class="stat"><div class="v num">${Math.round(sum(ents, e => e.durSec) / 60)}</div><div class="k">minutes</div></div></div>
        <canvas class="chart mt12" id="l-wchart"></canvas></div></div>
      <div class="section"><div class="list">${D.DAYS_LONG.map((name, i) => {
        const d = D.add(ws, i), di = Diary.get(d), de = Log.forDay(d), em = Log.emojis(d);
        return `<div class="list-item" data-d="${d}" style="align-items:flex-start;${d === today ? 'background:var(--volt-tint)' : ''}">
          <div style="width:44px;flex-shrink:0"><div class="big-num" style="font-size:24px;${i >= 5 ? 'color:var(--red)' : d === today ? 'text-decoration:underline' : ''}">${+d.slice(8)}</div><div class="tiny muted" style="font-weight:700">${name.slice(0, 3).toUpperCase()}</div></div>
          <div class="grow"><div style="font-size:20px;min-height:24px">${em.join(' ') || '<span class="dim small">—</span>'}</div>
            ${de.filter(e => Log.detail(e)).map(e => `<div class="tiny muted">${(TYPE[e.type] || TYPE.home).e} ${esc(Log.label(e))} · ${esc(Log.detail(e))}</div>`).join('')}
            ${di.short ? `<div class="small mt4">${esc(di.short)}</div>` : ''}
            ${di.long ? `<div class="tiny mt4" style="color:var(--blue)">✍ ${esc(di.long.slice(0, 70))}${di.long.length > 70 ? '…' : ''}</div>` : ''}</div></div>`;
      }).join('')}</div><div class="tiny muted mt8">Tap a day to edit · long-press to write in detail</div></div>`;
    requestAnimationFrame(() => Chart.bars($('#l-wchart', body), D.DAYS.map((n, i) => {
      const d = D.add(ws, i); return { label: n, value: Math.round(sum(Log.forDay(d), e => e.durSec) / 60), hi: d === today };
    }), { h: 130, fmt: v => v + 'm' }));
    $$('[data-d]', body).forEach(r => onPress(r, () => LogUI.openDay(r.dataset.d), () => LogUI.writer(r.dataset.d)));
  },

  // ---------------------------------------------------------- DAY (full page in the tab)
  dayView(body) {
    const d = LogUI.day;
    body.innerHTML = '<div class="section" style="margin-top:4px" id="l-day"></div>';
    LogUI.dayEditor($('#l-day', body), d, true);
  },

  // ---------------------------------------------------------- JOURNAL (like the notes pages)
  journalView(body) {
    const ym = LogUI.ym, n = D.daysInMonth(ym);
    const rows = [];
    for (let k = 1; k <= n; k++) {
      const d = ym + '-' + String(k).padStart(2, '0'), di = Diary.get(d), em = Log.emojis(d);
      rows.push(`<div class="jd ${D.dow(d) >= 5 ? 'we' : ''}" data-d="${d}"><div class="jn">${k}<small>${D.DAYS[D.dow(d)]}</small></div>
        <div class="jt">${em.length ? `<div style="font-size:15px;margin-bottom:2px">${em.join(' ')}</div>` : ''}${di.long ? esc(di.long) : di.short ? `<span class="muted">${esc(di.short)}</span>` : '<span class="dim">…</span>'}</div></div>`);
    }
    body.innerHTML = `<div class="section" style="margin-top:4px"><div class="cal-head" style="grid-template-columns:1fr"><div style="font-size:15px;font-family:var(--display);color:#1d3c78">${D.monthName(ym).toUpperCase()}</div></div>
      <div class="list journal" style="border-radius:0 0 var(--r) var(--r)">${rows.join('')}</div></div>`;
    $$('.jd', body).forEach(r => onPress(r, () => LogUI.writer(r.dataset.d), () => LogUI.openDay(r.dataset.d)));
  },

  // ---------------------------------------------------------- day editor (sheet or page)
  openDay(date) { App.sheet(s => LogUI.dayEditor(s, date, false), () => App.redrawTop()); },

  dayEditor(el, date, inPage) {
    const di = Diary.get(date), ents = Log.forDay(date);
    const manualTypes = new Set(ents.filter(e => e.src === 'manual' && !e.distM && !e.durSec && !e.reps).map(e => e.type));
    const anyType = new Set(ents.map(e => e.type));
    el.innerHTML = `
      ${inPage ? '' : `<div class="between"><div><div class="eyebrow">${D.rel(date) === D.nice(date) ? '' : esc(D.rel(date))}</div><div class="h2">${esc(D.long(date))}</div></div>
        <button class="icon-btn" data-open title="Open day">${ICON.right}</button></div>`}
      <div class="field" style="${inPage ? 'margin-top:0' : ''}"><label>What did you do?</label>
        <div class="emoji-grid">${TYPES.map(t => `<button data-t="${t.id}" class="${anyType.has(t.id) ? 'on' : ''}"><span class="e">${t.e}</span>${esc(t.name.split(' /')[0])}</button>`).join('')}</div>
        <div class="tiny muted mt8">Tap to mark · long-press to add time, distance or reps</div></div>
      ${ents.length ? `<div class="list mt12">${ents.map(LogUI.itemHtml).join('')}</div>` : ''}
      <div class="field"><label>Feeling</label><div class="row">${MOODS.map(m => `<button class="chip grow ${di.mood === m.id ? 'on' : ''}" data-m="${m.id}" style="justify-content:center">${m.e}</button>`).join('')}</div></div>
      <div class="field"><label>Box note <span class="dim" style="text-transform:none;letter-spacing:0">· shows in the calendar</span></label>
        <input data-short maxlength="80" value="${esc(di.short || '')}" placeholder="e.g. 5k easy, legs heavy"></div>
      <div class="field"><label>Detailed note</label>
        <button class="card tap" data-long style="display:block;width:100%;text-align:left;min-height:70px;border:1.5px dashed #cfcfcf">
          ${di.long ? `<div class="small" style="white-space:pre-wrap;max-height:120px;overflow:hidden">${esc(di.long)}</div>` : '<span class="muted small">Nothing yet.</span>'}
          <div class="row mt8 small" style="font-weight:700;text-decoration:underline">${ICON.pen.replace('<svg', '<svg width="16" height="16" fill="currentColor"')} ${di.long ? 'Open & keep writing' : 'Write in detail'}</div></button></div>
      <button class="btn ghost block mt16" data-add>${ICON.plus.replace('<svg', '<svg width="18" height="18" fill="currentColor"')} Add activity with details</button>
      ${inPage ? '' : '<button class="btn volt block mt8" data-close>Done</button>'}`;

    const redraw = () => LogUI.dayEditor(el, date, inPage);
    $$('[data-t]', el).forEach(b => onPress(b, () => {
      const t = b.dataset.t;
      if (manualTypes.has(t)) { const e = ents.find(x => x.type === t && x.src === 'manual' && !x.distM && !x.durSec && !x.reps); Log.remove(e.id); }
      else if (anyType.has(t)) { LogUI.editSheet(ents.find(x => x.type === t)); return; }
      else Log.add({ date, type: t, ts: D.parse(date).getTime() + 12 * 3600e3, src: 'manual' });
      N.vibrate(15); redraw();
    }, () => LogUI.addSheet(date, b.dataset.t)));
    $$('[data-m]', el).forEach(b => b.onclick = () => { Diary.set(date, { mood: di.mood === b.dataset.m ? '' : b.dataset.m }); redraw(); });
    const sh = $('[data-short]', el);
    let t = null;
    sh.oninput = () => { clearTimeout(t); t = setTimeout(() => Diary.set(date, { short: sh.value.trim() }, true), 400); };
    sh.onblur = () => { clearTimeout(t); Diary.set(date, { short: sh.value.trim() }, true); };
    $('[data-long]', el).onclick = () => { if (!inPage) App.closeSheet(); LogUI.writer(date); };
    $('[data-add]', el).onclick = () => LogUI.addSheet(date);
    const op = $('[data-open]', el); if (op) op.onclick = () => { App.closeSheet(); LogUI.view = 'day'; LogUI.day = date; LogUI.ym = D.month(date); App.popAll(); App.go('log'); };
    const cl = $('[data-close]', el); if (cl) cl.onclick = () => { Diary.set(date, { short: sh.value.trim() }, true); App.closeSheet(); };
    LogUI.bindItems(el);
  },

  // ---------------------------------------------------------- detailed writing popup
  writer(date) {
    const di = Diary.get(date);
    const el = document.createElement('div'); el.className = 'writer';
    el.innerHTML = `<div class="ov-bar"><button class="icon-btn plain" data-x>${ICON.left}</button>
        <div class="t"><div class="tiny muted" style="font-weight:600">${esc(D.DAYS_LONG[D.dow(date)])}</div>${esc(D.parse(date).getDate() + ' ' + D.monthName(D.month(date)) + ' ' + date.slice(0, 4))}</div>
        <button class="btn volt sm" data-save>Save</button></div>
      <div class="wr-meta row wrap" style="gap:6px">${Log.emojis(date).map(e => `<span class="pill">${e}</span>`).join('')}
        ${Log.forDay(date).filter(e => Log.detail(e)).map(e => `<span class="pill">${esc(Log.detail(e))}</span>`).join('')}</div>
      <textarea placeholder="How did training go? Sleep, food, how you felt, what to change next time…">${esc(di.long || '')}</textarea>
      <div class="between tiny muted" style="padding:6px 18px 12px"><span data-wc></span><span data-st>Saved</span></div>`;
    document.body.appendChild(el);
    const ta = $('textarea', el), wc = $('[data-wc]', el), stEl = $('[data-st]', el);
    const count = () => { const w = ta.value.trim() ? ta.value.trim().split(/\s+/).length : 0; wc.textContent = w + ' word' + (w === 1 ? '' : 's'); };
    let t = null;
    const save = () => { clearTimeout(t); Diary.set(date, { long: ta.value.replace(/\s+$/, '') }, true); stEl.textContent = 'Saved'; };
    ta.oninput = () => { count(); stEl.textContent = 'Editing…'; clearTimeout(t); t = setTimeout(save, 800); };
    const close = () => { save(); el.remove(); App.modal = prev; App.redrawTop(); };
    const prev = App.modal;
    App.modal = { back: () => { close(); return true; } };
    $('[data-x]', el).onclick = close;
    $('[data-save]', el).onclick = () => { close(); App.toast('Note saved'); };
    count();
    setTimeout(() => { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }, 120);
  },

  // ---------------------------------------------------------- add / edit activity with details
  addSheet(date, type) { LogUI.editSheet(null, date, type); },

  editSheet(entry, date, type) {
    const isNew = !entry;
    const e = entry ? Object.assign({}, entry) : { date: date || D.today(), type: type || 'run', durSec: 0, distM: 0, reps: 0, note: '', effort: null };
    App.sheet(s => {
      const draw = () => {
        const t = TYPE[e.type] || TYPE.home;
        const run = false;
        s.innerHTML = `<div class="between"><div class="h2">${isNew ? 'Log activity' : esc(Log.label(e))}</div>${!isNew ? `<button class="icon-btn" data-del style="color:var(--red)">${ICON.trash}</button>` : ''}</div>
          <div class="field"><label>Date</label><input type="date" data-date value="${e.date}"></div>
          ${run ? '' : `<div class="field"><label>Type</label><div class="emoji-grid">${TYPES.map(x => `<button data-t="${x.id}" class="${x.id === e.type ? 'on' : ''}"><span class="e">${x.e}</span>${esc(x.name.split(' /')[0])}</button>`).join('')}</div></div>`}
          <div class="field"><label>Title (optional)</label><input data-title value="${esc(e.title || '')}" placeholder="${esc(t.name)}"></div>
          ${t.unit === 'none' ? '' : `<div class="row">
            <div class="field grow"><label>Minutes</label><input type="number" inputmode="decimal" data-min value="${e.durSec ? Math.round(e.durSec / 6) / 10 : ''}" ${run ? 'readonly' : ''}></div>
            ${t.unit === 'dist' ? `<div class="field grow"><label>Distance km</label><input type="number" inputmode="decimal" data-km value="${e.distM ? Math.round(e.distM) / 1000 : ''}" ${run ? 'readonly' : ''}></div>` : ''}
            ${t.unit === 'reps' || e.reps ? `<div class="field grow"><label>Reps</label><input type="number" inputmode="numeric" data-reps value="${e.reps || ''}"></div>` : ''}</div>`}
          ${t.unit === 'none' ? '' : `<div class="field"><label>Effort</label><div class="seg">${EFFORT.map((x, i) => `<button data-ef="${i}" class="${e.effort === i ? 'on' : ''}" style="font-size:11px">${x}</button>`).join('')}</div></div>`}
          <div class="field"><label>Note</label><textarea data-note rows="2" placeholder="Optional">${esc(e.note || '')}</textarea></div>
  
          <button class="btn volt block mt16" data-save>${isNew ? 'Add to log' : 'Save'}</button>`;
        $$('[data-t]', s).forEach(b => b.onclick = () => { grab(); e.type = b.dataset.t; draw(); });
        $$('[data-ef]', s).forEach(b => b.onclick = () => { e.effort = e.effort === +b.dataset.ef ? null : +b.dataset.ef; $$('[data-ef]', s).forEach(x => x.classList.toggle('on', +x.dataset.ef === e.effort)); });
        $('[data-save]', s).onclick = () => {
          grab();
          if (isNew) Log.add(Object.assign({ ts: e.date === D.today() ? Date.now() : D.parse(e.date).getTime() + 12 * 3600e3, src: 'manual' }, e));
          else Log.update(entry.id, e);
          App.closeSheet(); App.toast(isNew ? 'Logged ✓' : 'Saved'); App.redrawTop();
        };
        const del = $('[data-del]', s);
        if (del) del.onclick = () => { App.closeSheet(); App.confirm('Delete entry?', Log.label(entry), 'Delete', () => { Log.remove(entry.id); App.redrawTop(); }, true); };
      };
      const grab = () => {
        const v = sel => { const el = $(sel, s); return el ? el.value : ''; };
        e.date = v('[data-date]') || e.date; e.title = v('[data-title]').trim(); e.note = v('[data-note]').trim();
        if ($('[data-min]', s)) e.durSec = Math.round((+v('[data-min]') || 0) * 60);
        if ($('[data-km]', s)) e.distM = Math.round((+v('[data-km]') || 0) * 1000);
        if ($('[data-reps]', s)) e.reps = Math.round(+v('[data-reps]') || 0);
      };
      draw();
    }, () => App.redrawTop());
  },

  // ---------------------------------------------------------- goals & results
  goalsSheet(ym) {
    const all = DB.get('goals');
    const list = (all[ym] || []).map(g => Object.assign({}, g));
    if (!list.length) list.push({ id: uid(), text: '', result: '', done: false });
    App.sheet(s => {
      const draw = () => {
        s.innerHTML = `<div class="h2">${D.monthName(ym)} goals</div><p class="muted small" style="margin-top:4px">Set goals at the start of the month, fill in results as you go.</p>
          ${list.map((g, i) => `<div class="card" style="padding:12px;margin-top:10px">
            <div class="row"><button class="check ${g.done ? 'on' : ''}" data-done="${i}"></button><input data-text="${i}" value="${esc(g.text)}" placeholder="Goal ${i + 1}" style="font-weight:600"></div>
            <div class="row mt8"><span class="tiny muted" style="width:24px;text-align:center">→</span><input data-res="${i}" value="${esc(g.result)}" placeholder="Result"><button class="icon-btn plain" data-rm="${i}">${ICON.close}</button></div></div>`).join('')}
          <button class="btn ghost block mt12" data-add>${ICON.plus.replace('<svg', '<svg width="18" height="18" fill="currentColor"')} Add goal</button>
          <button class="btn volt block mt8" data-save>Save</button>`;
        $$('[data-done]', s).forEach(b => b.onclick = () => { grab(); const g = list[+b.dataset.done]; g.done = !g.done; draw(); });
        $$('[data-rm]', s).forEach(b => b.onclick = () => { grab(); list.splice(+b.dataset.rm, 1); draw(); });
        $('[data-add]', s).onclick = () => { grab(); list.push({ id: uid(), text: '', result: '', done: false }); draw(); const ins = $$('[data-text]', s); ins[ins.length - 1].focus(); };
        $('[data-save]', s).onclick = () => { grab(); all[ym] = list.filter(g => g.text.trim() || g.result.trim()); if (!all[ym].length) delete all[ym]; DB.save('goals'); App.closeSheet(); App.redrawTop(); };
      };
      const grab = () => { list.forEach((g, i) => { const t = $(`[data-text="${i}"]`, s), r = $(`[data-res="${i}"]`, s); if (t) g.text = t.value; if (r) g.result = r.value; }); };
      draw();
    });
  },

  // ---------------------------------------------------------- shared list item
  itemHtml(e) {
    const t = TYPE[e.type] || TYPE.home;
    return `<button class="list-item" style="width:100%;text-align:left" data-entry="${e.id}"><div class="emoji-badge">${t.e}</div>
      <div class="grow" style="min-width:0"><div class="ellipsis" style="font-weight:600">${esc(Log.label(e))}</div>
      <div class="tiny muted ellipsis">${esc([D.rel(e.date), Log.detail(e), e.note].filter(Boolean).join(' · '))}</div></div></button>`;
  },
  bindItems(root) {
    $$('[data-entry]', root).forEach(b => b.onclick = () => {
      const e = Log.all().find(x => x.id === b.dataset.entry); if (!e) return;
      LogUI.editSheet(e);
    });
  },
};
App.register('log', LogUI);
