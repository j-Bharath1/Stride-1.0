/* Gym: routines, live set logger with rest timer, history, personal records. */
'use strict';

const Gym = {
  rest: null, // {end, timer, el}

  fmtVol(kg) { return kg >= 10000 ? (kg / 1000).toFixed(1) + '<span class="small"> t</span>' : F.int(kg) + '<span class="small"> kg</span>'; },
  routines() { return GYM_ROUTINES.concat(DB.get('routines') || []); },
  sessions() { return DB.get('gym'); },
  e1rm(kg, reps) { return reps > 0 && kg > 0 ? kg * (1 + reps / 30) : 0; },
  // last logged sets for an exercise
  lastSets(exId) {
    const ss = Gym.sessions().slice().sort((a, b) => b.startedAt - a.startedAt);
    for (const s of ss) { const x = s.exercises.find(e => e.ex === exId); if (x) return x.sets.filter(t => t.done); }
    return [];
  },
  bestE1rm(exId, beforeTs = Infinity) {
    let best = 0;
    Gym.sessions().filter(s => s.startedAt < beforeTs).forEach(s => s.exercises.filter(e => e.ex === exId).forEach(e => e.sets.forEach(t => { if (t.done) best = Math.max(best, Gym.e1rm(t.kg, t.reps)); })));
    return best;
  },

  render(v) {
    const draft = DB.get('settings').gymDraft;
    const ss = Gym.sessions().slice().sort((a, b) => b.startedAt - a.startedAt);
    const mon = D.monday(D.today());
    const wk = ss.filter(s => s.date >= mon);
    const exDone = Array.from(new Set(ss.flatMap(s => s.exercises.map(e => e.ex))));
    v.innerHTML = `
      <div class="top"><h1 class="h1">Gym</h1></div>
      <div class="page" style="padding-top:10px">
        ${draft ? `<button class="hero" style="display:block;width:100%;text-align:left" data-resume><div class="eyebrow">In progress</div>
          <div class="display mt8" style="font-size:26px">${esc(draft.name)}</div><div class="muted small mt4">Started ${D.time(draft.startedAt)} · tap to resume</div></button>` : ''}
        <div class="card white ${draft ? 'mt12' : ''}"><div class="stats">
          <div class="stat"><div class="v num">${wk.length}</div><div class="k">sessions this week</div></div>
          <div class="stat"><div class="v num">${Gym.fmtVol(sum(wk, s => s.volume))}</div><div class="k">volume</div></div>
          <div class="stat"><div class="v num">${Math.round(sum(wk, s => s.durSec) / 60)}</div><div class="k">minutes</div></div></div></div>
        <button class="btn block mt12" data-empty>${ICON.plus.replace('<svg', '<svg width="20" height="20" fill="currentColor"')} Start empty workout</button>
      </div>
      <div class="section"><div class="section-head"><h2 class="h2">Routines</h2><button class="link" data-new>+ New</button></div>
        ${Gym.routines().map(r => `<div class="card white" style="padding:14px">
          <div class="between"><div class="row"><div class="emoji-badge">${r.e || '🏋️'}</div><div><div class="h3">${esc(r.name)}</div><div class="tiny muted">${esc(r.focus || r.items.length + ' exercises')}</div></div></div>
          <button class="btn volt sm" data-start="${r.id}">Start</button></div>
          <div class="row mt12" style="gap:6px;overflow:hidden">${r.items.slice(0, 6).map(it => `<div class="ex-thumb" style="width:48px;height:40px">${Train.figThumb(it.ex)}</div>`).join('')}</div>
          <div class="tiny muted mt8">${r.items.map(it => `${(EX[it.ex] || {}).n} ${it.sets}×${it.sec ? it.sec + 's' : it.reps}`).join(' · ')}</div>
          ${r.custom ? `<div class="row mt8"><button class="link" data-edit="${r.id}">Edit</button></div>` : ''}</div>`).join('')}</div>
      <div class="section"><div class="section-head"><h2 class="h2">Strength progress</h2></div>
        ${exDone.length ? `<div class="list">${exDone.map(id => { const b = Gym.bestE1rm(id); return `<button class="list-item" style="width:100%;text-align:left" data-prog="${id}"><div class="ex-thumb" style="width:52px;height:42px">${Train.figThumb(id)}</div>
          <div class="grow"><div style="font-weight:700">${esc((EX[id] || { n: id }).n)}</div><div class="tiny muted">Best est. 1-rep max</div></div><b class="num">${b ? Math.round(b) + ' kg' : '—'}</b></button>`; }).join('')}</div>`
          : '<div class="card muted small">Log a session and your best lifts show up here.</div>'}</div>
      <div class="section"><div class="section-head"><h2 class="h2">History</h2><span class="muted small">${ss.length} sessions</span></div>
        ${ss.length ? `<div class="list">${ss.slice(0, 15).map(s => `<button class="list-item" style="width:100%;text-align:left" data-sess="${s.id}"><div class="emoji-badge">🏋️</div>
          <div class="grow"><div style="font-weight:700">${esc(s.name)}</div><div class="tiny muted">${esc(D.rel(s.date))} · ${F.dur(s.durSec)} · ${F.int(s.volume)} kg</div></div></button>`).join('')}</div>`
          : '<div class="card empty"><div class="e">🏋️</div>Pick a routine and start lifting.</div>'}</div>`;
    const rs = $('[data-resume]', v); if (rs) rs.onclick = () => Gym.logger(draft);
    $('[data-empty]', v).onclick = () => Gym.begin({ id: 'empty', name: 'Workout', items: [] });
    $$('[data-start]', v).forEach(b => b.onclick = () => Gym.begin(Gym.routines().find(r => r.id === b.dataset.start)));
    $$('[data-edit]', v).forEach(b => b.onclick = () => Gym.routineBuilder(Gym.routines().find(r => r.id === b.dataset.edit)));
    $('[data-new]', v).onclick = () => Gym.routineBuilder();
    $$('[data-prog]', v).forEach(b => b.onclick = () => Gym.exerciseProgress(b.dataset.prog));
    $$('[data-sess]', v).forEach(b => b.onclick = () => Gym.sessionDetail(b.dataset.sess));
  },

  begin(r) {
    const st = DB.get('settings');
    const go = () => {
      const draft = { id: uid(), name: r.name, routineId: r.id, startedAt: Date.now(), exercises: r.items.map(it => Gym.newEx(it.ex, it)) };
      st.gymDraft = draft; DB.save('settings');
      Gym.logger(draft);
    };
    if (st.gymDraft) App.confirm('Workout in progress', 'Discard the unfinished workout and start a new one?', 'Start new', go, true); else go();
  },

  newEx(exId, it = {}) {
    const prev = Gym.lastSets(exId);
    const n = it.sets || Math.max(3, prev.length) || 3;
    const sets = [];
    for (let k = 0; k < n; k++) { const p = prev[k] || prev[prev.length - 1]; sets.push({ kg: p ? p.kg : '', reps: p ? p.reps : (it.sec ? it.sec : it.reps || ''), done: false }); }
    return { ex: exId, rest: it.rest || 90, timed: !!it.sec, target: it.sec ? it.sec + 's' : it.reps ? it.reps + ' reps' : '', sets };
  },

  saveDraft(d) { DB.data.settings.gymDraft = d; DB.save('settings'); },

  // ---------------------------------------------------------- live logger
  logger(d) {
    let clock = null;
    App.push(d.name, (body, ov) => {
      body.innerHTML = `<div class="page" style="padding-top:0;padding-bottom:90px">
        <div class="between"><div><div class="eyebrow">${esc(D.long(D.today()))}</div><div class="big-num num mt4" style="font-size:34px" data-clock>00:00</div></div>
          <button class="btn volt" data-finish>Finish</button></div>
        <div data-exs></div>
        <button class="btn ghost block mt16" data-addex>${ICON.plus.replace('<svg', '<svg width="20" height="20" fill="currentColor"')} Add exercise</button>
        <button class="btn danger block mt8" data-cancel>Cancel workout</button></div>`;
      const exs = $('[data-exs]', body);
      const draw = () => {
        exs.innerHTML = d.exercises.map((x, xi) => {
          const prev = Gym.lastSets(x.ex);
          return `<div class="gx"><div class="between"><button class="row grow" style="text-align:left" data-info="${x.ex}"><div class="ex-thumb" style="width:56px;height:46px">${Train.figThumb(x.ex)}</div>
            <div><div class="h3">${esc((EX[x.ex] || { n: x.ex }).n)}</div><div class="tiny muted">${x.target ? 'Target ' + esc(x.target) + ' · ' : ''}rest ${x.rest}s</div></div></button>
            <button class="icon-btn plain" data-rmex="${xi}">${ICON.trash}</button></div>
            <div class="set-row head mt8"><span class="center">Set</span><span>Previous</span><span class="center">${x.timed ? '' : 'kg'}</span><span class="center">${x.timed ? 'sec' : 'reps'}</span><span></span></div>
            ${x.sets.map((t, si) => `<div class="set-row ${t.done ? 'done' : ''}"><span class="n">${si + 1}</span>
              <span class="prev">${prev[si] ? (x.timed ? prev[si].reps + 's' : `${prev[si].kg || 0} × ${prev[si].reps}`) : '—'}</span>
              ${x.timed ? '<span></span>' : `<input type="number" inputmode="decimal" data-kg="${xi}-${si}" value="${t.kg}" placeholder="0">`}
              <input type="number" inputmode="numeric" data-reps="${xi}-${si}" value="${t.reps}" placeholder="0">
              <button class="ok" data-ok="${xi}-${si}"></button></div>`).join('')}
            <div class="row mt8"><button class="btn ghost sm grow" data-addset="${xi}">+ Set</button>${x.sets.length > 1 ? `<button class="btn ghost sm" data-rmset="${xi}">− Set</button>` : ''}</div></div>`;
        }).join('') || '<div class="card muted small mt16">No exercises yet. Add one below.</div>';
        const ix = s => s.split('-').map(Number);
        $$('[data-kg]', exs).forEach(i => i.oninput = () => { const [a, b] = ix(i.dataset.kg); d.exercises[a].sets[b].kg = i.value === '' ? '' : +i.value; Gym.saveDraft(d); });
        $$('[data-reps]', exs).forEach(i => i.oninput = () => { const [a, b] = ix(i.dataset.reps); d.exercises[a].sets[b].reps = i.value === '' ? '' : +i.value; Gym.saveDraft(d); });
        $$('[data-ok]', exs).forEach(b => b.onclick = () => {
          const [a, c] = ix(b.dataset.ok), x = d.exercises[a], t = x.sets[c];
          t.done = !t.done;
          if (t.done) {
            if (t.reps === '' || t.reps == null) t.reps = 0;
            if (!x.timed && (t.kg === '' || t.kg == null)) t.kg = 0;
            N.vibrate(25); Gym.startRest(x.rest);
            const best = Gym.bestE1rm(x.ex), now = Gym.e1rm(+t.kg, +t.reps);
            if (best && now > best + 0.01) App.toast(`🏅 New best: ${EX[x.ex].n} ${t.kg} kg × ${t.reps}`);
          }
          Gym.saveDraft(d); draw();
        });
        $$('[data-addset]', exs).forEach(b => b.onclick = () => { const x = d.exercises[+b.dataset.addset], l = x.sets[x.sets.length - 1]; x.sets.push({ kg: l ? l.kg : '', reps: l ? l.reps : '', done: false }); Gym.saveDraft(d); draw(); });
        $$('[data-rmset]', exs).forEach(b => b.onclick = () => { d.exercises[+b.dataset.rmset].sets.pop(); Gym.saveDraft(d); draw(); });
        $$('[data-rmex]', exs).forEach(b => b.onclick = () => { d.exercises.splice(+b.dataset.rmex, 1); Gym.saveDraft(d); draw(); });
        $$('[data-info]', exs).forEach(b => b.onclick = () => Train.exerciseSheet(b.dataset.info));
      };
      draw();
      const tickClock = () => { const c = $('[data-clock]', body); if (c) c.textContent = F.clock((Date.now() - d.startedAt) / 1000); };
      clearInterval(clock); clock = setInterval(tickClock, 1000); tickClock();
      $('[data-addex]', body).onclick = () => Gym.pickExercise(id => { d.exercises.push(Gym.newEx(id)); Gym.saveDraft(d); draw(); });
      $('[data-cancel]', body).onclick = () => App.confirm('Cancel workout?', 'Nothing from this session will be saved.', 'Discard', () => { Gym.stopRest(); Gym.saveDraft(null); App.pop(); }, true);
      $('[data-finish]', body).onclick = () => Gym.finish(d);
    }, { onPop: () => { clearInterval(clock); Gym.stopRest(); } });
  },

  pickExercise(cb) {
    App.sheet(s => {
      const ids = Object.keys(EX).filter(k => k !== 'rest' && !/R$/.test(k));
      const order = ids.sort((a, b) => (EX[a].cat === 'Gym' ? 0 : 1) - (EX[b].cat === 'Gym' ? 0 : 1));
      s.innerHTML = `<div class="h2">Add exercise</div><input class="mt12" data-q placeholder="Search">
        <div class="list mt12" data-l>${order.map(k => `<button class="list-item" style="width:100%;text-align:left;padding:8px 12px" data-k="${k}" data-n="${esc(EX[k].n.toLowerCase())}"><div class="ex-thumb" style="width:52px;height:42px">${Train.figThumb(k)}</div>
          <div class="grow"><div class="small" style="font-weight:700">${esc(EX[k].n)}</div><div class="tiny muted">${esc(EX[k].muscles)}</div></div></button>`).join('')}</div>`;
      $('[data-q]', s).oninput = e => { const q = e.target.value.toLowerCase(); $$('[data-k]', s).forEach(b => b.classList.toggle('hidden', !b.dataset.n.includes(q))); };
      $$('[data-k]', s).forEach(b => b.onclick = () => { App.closeSheet(); cb(b.dataset.k); });
    });
  },

  // Rest timer runs in the background service: keeps counting, beeps and notifies with the screen off.
  startRest(sec) {
    Gym.stopRest();
    N.workoutReset();
    N.workoutStart(JSON.stringify({ title: 'Rest', restMode: true, voice: !!DB.get('settings').voice, steps: [{ name: 'Rest', sec }] }));
    const el = document.createElement('div'); el.className = 'rest-bar';
    el.innerHTML = `<div class="grow"><div class="tiny" style="opacity:.6;font-weight:700">REST</div><div class="t num" data-t></div></div>
      <button data-c="sub15">−15</button><button data-c="add15">+15</button><button data-c="next" style="background:var(--volt);color:#111">Skip</button>`;
    document.body.appendChild(el);
    const r = Gym.rest = { el, started: false };
    const tick = () => {
      let s; try { s = JSON.parse(N.workoutState()); } catch (e) { return; }
      if (s.status === 'running' || s.status === 'paused') r.started = true;
      if (s.status === 'done' || (r.started && s.status === 'idle')) { Gym.stopRest(); return; }
      const t = $('[data-t]', el); if (t && s.leftMs >= 0) t.textContent = F.clock(Math.ceil(s.leftMs / 1000));
    };
    r.timer = setInterval(tick, 250); tick();
    $$('[data-c]', el).forEach(b => b.onclick = () => { N.workoutCmd(b.dataset.c); setTimeout(tick, 80); });
  },
  stopRest() {
    if (!Gym.rest) return;
    clearInterval(Gym.rest.timer); Gym.rest.el.remove(); Gym.rest = null;
    let s; try { s = JSON.parse(N.workoutState()); } catch (e) { s = {}; }
    if (s.status === 'running' || s.status === 'paused') N.workoutCmd('stop');
    N.workoutReset();
  },

  finish(d) {
    const doneSets = d.exercises.flatMap(x => x.sets.filter(t => t.done).map(t => ({ x, t })));
    if (!doneSets.length) return App.toast('Tick off at least one set first');
    Gym.stopRest();
    const durSec = Math.round((Date.now() - d.startedAt) / 1000);
    const volume = Math.round(sum(doneSets, ({ x, t }) => x.timed ? 0 : (+t.kg || 0) * (+t.reps || 0)));
    // PRs vs. history before this session
    const prs = [];
    d.exercises.forEach(x => {
      const before = Gym.bestE1rm(x.ex, d.startedAt);
      const best = Math.max(0, ...x.sets.filter(t => t.done).map(t => Gym.e1rm(+t.kg, +t.reps)));
      if (best > 0 && best > before + .01 && before > 0) prs.push(EX[x.ex].n);
    });
    const session = { id: d.id, date: D.iso(new Date(d.startedAt)), startedAt: d.startedAt, durSec, routineId: d.routineId, name: d.name, volume,
      exercises: d.exercises.map(x => ({ ex: x.ex, timed: x.timed, sets: x.sets.map(t => ({ kg: +t.kg || 0, reps: +t.reps || 0, done: !!t.done })) })) };
    Gym.sessions().push(session); DB.save('gym');
    Log.add({ date: session.date, ts: d.startedAt, type: 'gym', title: d.name, durSec, src: 'gym', refId: session.id,
      note: `${doneSets.length} sets · ${F.int(volume)} kg volume${prs.length ? ' · PR: ' + prs.join(', ') : ''}` });
    Gym.saveDraft(null);
    App.popAll(); App.go('gym');
    App.sheet(s => {
      s.innerHTML = `<div class="center"><div style="font-size:60px">🏆</div><div class="display" style="font-size:32px">${esc(d.name)} done</div>
        <div class="stats mt16"><div class="stat"><div class="v">${F.clock(durSec)}</div><div class="k">time</div></div><div class="stat"><div class="v">${doneSets.length}</div><div class="k">sets</div></div><div class="stat"><div class="v">${F.int(volume)}</div><div class="k">kg volume</div></div></div>
        ${prs.length ? `<div class="pill volt mt16">🏅 New best: ${esc(prs.join(', '))}</div>` : ''}</div>
        ${d.routineId === 'empty' ? '<button class="btn ghost block mt16" data-save>Save as routine</button>' : ''}
        <button class="btn volt block mt8" data-ok>Nice</button>`;
      $('[data-ok]', s).onclick = () => App.closeSheet();
      const sv = $('[data-save]', s);
      if (sv) sv.onclick = () => { App.closeSheet(); Gym.routineBuilder({ id: 'r-' + uid(), name: d.name, e: '⭐', custom: true, items: d.exercises.map(x => ({ ex: x.ex, sets: x.sets.length, reps: x.sets[0] ? x.sets[0].reps : 10, rest: x.rest })) }, true); };
    });
    if (DB.get('settings').voice) N.speak(`Workout complete. ${doneSets.length} sets, ${F.int(volume)} kilograms lifted.${prs.length ? ' New personal best!' : ''}`);
  },

  // ---------------------------------------------------------- routine builder
  routineBuilder(existing, isNew) {
    const r = existing ? JSON.parse(JSON.stringify(existing)) : { id: 'r-' + uid(), name: '', e: '⭐', custom: true, items: [] };
    if (existing && !existing.custom) { r.id = 'r-' + uid(); r.custom = true; r.name = existing.name + ' (mine)'; }
    App.push(existing && !isNew ? 'Edit routine' : 'New routine', body => {
      body.innerHTML = `<div class="page" style="padding-top:0">
        <div class="field" style="margin-top:0"><label>Name</label><input data-name value="${esc(r.name)}" placeholder="e.g. Monday chest"></div>
        <div data-items class="mt12"></div>
        <button class="btn ghost block mt12" data-add>${ICON.plus.replace('<svg', '<svg width="20" height="20" fill="currentColor"')} Add exercise</button>
        <button class="btn volt block mt16" data-save>Save routine</button>
        ${existing && existing.custom && !isNew ? '<button class="btn danger block mt8" data-del>Delete routine</button>' : ''}</div>`;
      const box = $('[data-items]', body);
      const draw = () => {
        box.innerHTML = r.items.map((it, k) => `<div class="gx"><div class="between"><div class="row"><div class="ex-thumb" style="width:52px;height:42px">${Train.figThumb(it.ex)}</div><b class="small">${esc(EX[it.ex].n)}</b></div><button class="icon-btn plain" data-rm="${k}">${ICON.close}</button></div>
          <div class="row mt8"><div class="grow"><div class="tiny muted">Sets</div><div class="stepper"><button data-s="${k}:-1">−</button><input value="${it.sets}" readonly><button data-s="${k}:1">+</button></div></div>
          <div class="grow"><div class="tiny muted">Reps</div><div class="stepper"><button data-r="${k}:-1">−</button><input value="${it.reps}" readonly><button data-r="${k}:1">+</button></div></div>
          <div class="grow"><div class="tiny muted">Rest s</div><div class="stepper"><button data-t="${k}:-15">−</button><input value="${it.rest}" readonly><button data-t="${k}:15">+</button></div></div></div></div>`).join('') || '<div class="card muted small">Add exercises to build your routine.</div>';
        const pr = (attr, key, lo, hi) => $$(`[data-${attr}]`, box).forEach(b => b.onclick = () => { const [k, dlt] = b.dataset[attr].split(':').map(Number); r.items[k][key] = clamp((+r.items[k][key] || 0) + dlt, lo, hi); draw(); });
        pr('s', 'sets', 1, 10); pr('r', 'reps', 1, 50); pr('t', 'rest', 0, 300);
        $$('[data-rm]', box).forEach(b => b.onclick = () => { r.items.splice(+b.dataset.rm, 1); draw(); });
      };
      draw();
      $('[data-add]', body).onclick = () => Gym.pickExercise(id => { r.items.push({ ex: id, sets: 3, reps: 10, rest: 90 }); draw(); });
      $('[data-save]', body).onclick = () => {
        r.name = $('[data-name]', body).value.trim() || 'My routine';
        if (!r.items.length) return App.toast('Add at least one exercise');
        const list = DB.get('routines'), at = list.findIndex(x => x.id === r.id);
        if (at >= 0) list[at] = r; else list.push(r);
        DB.save('routines'); App.popAll(); App.go('gym'); App.toast('Routine saved');
      };
      const del = $('[data-del]', body);
      if (del) del.onclick = () => App.confirm('Delete routine?', r.name, 'Delete', () => { DB.set('routines', DB.get('routines').filter(x => x.id !== r.id)); App.popAll(); App.go('gym'); }, true);
    });
  },

  // ---------------------------------------------------------- history & progress
  sessionDetail(id) {
    const s = Gym.sessions().find(x => x.id === id); if (!s) return;
    App.push(s.name, body => {
      body.innerHTML = `<div class="page" style="padding-top:0"><div class="eyebrow">${esc(D.long(s.date))} · ${esc(D.time(s.startedAt))}</div>
        <div class="stats mt16"><div class="stat"><div class="v">${F.clock(s.durSec)}</div><div class="k">time</div></div>
          <div class="stat"><div class="v">${sum(s.exercises, x => x.sets.filter(t => t.done).length)}</div><div class="k">sets</div></div>
          <div class="stat"><div class="v">${F.int(s.volume)}</div><div class="k">kg volume</div></div></div>
        ${s.exercises.map(x => `<div class="gx"><div class="row"><div class="ex-thumb" style="width:52px;height:42px">${Train.figThumb(x.ex)}</div><b>${esc((EX[x.ex] || { n: x.ex }).n)}</b></div>
          <div class="mt8 small">${x.sets.filter(t => t.done).map((t, i) => `<div class="between" style="padding:4px 0;border-bottom:1px solid var(--line)"><span class="muted">Set ${i + 1}</span><b class="num">${x.timed ? t.reps + ' s' : `${t.kg} kg × ${t.reps}`}</b></div>`).join('')}</div></div>`).join('')}
        <button class="btn danger block mt24" data-del>Delete session</button></div>`;
      $('[data-del]', body).onclick = () => App.confirm('Delete session?', 'Also removes it from your diary.', 'Delete', () => {
        DB.set('gym', Gym.sessions().filter(x => x.id !== id));
        Log.all().filter(e => e.refId === id).forEach(e => Log.remove(e.id));
        App.pop();
      }, true);
    });
  },

  exerciseProgress(exId) {
    const pts = Gym.sessions().slice().sort((a, b) => a.startedAt - b.startedAt).map(s => {
      const x = s.exercises.find(e => e.ex === exId); if (!x) return null;
      const best = Math.max(0, ...x.sets.filter(t => t.done).map(t => Gym.e1rm(t.kg, t.reps)));
      const top = x.sets.filter(t => t.done).sort((a, b) => b.kg - a.kg)[0];
      return best ? { date: s.date, best, top } : null;
    }).filter(Boolean);
    App.push(EX[exId].n, body => {
      body.innerHTML = `<div class="page" style="padding-top:0">
        <div class="fig-box" style="height:170px;padding:10px 10px 2px">${Fig.svg(EX[exId].fig)}</div>
        <div class="eyebrow mt16">Best estimated 1-rep max</div>
        <div class="big-num num" style="font-size:56px">${pts.length ? Math.round(Math.max(...pts.map(p => p.best))) : 0}<span class="small muted" style="font-family:var(--body);font-size:15px"> kg</span></div>
        <div class="card white mt12"><canvas class="chart" data-c></canvas></div>
        <div class="h2 mt24">Sessions</div>
        <div class="list mt8">${pts.slice().reverse().map(p => `<div class="list-item small"><span class="grow">${esc(D.nice(p.date))}</span><span class="muted">top set ${p.top.kg} × ${p.top.reps}</span><b class="num">${Math.round(p.best)} kg</b></div>`).join('')}</div></div>`;
      requestAnimationFrame(() => Chart.line($('[data-c]', body), pts.map(p => ({ label: D.parse(p.date).getDate() + '/' + (D.parse(p.date).getMonth() + 1), value: Math.round(p.best) })), { h: 170 }));
    });
  },
};
App.register('gym', Gym);
