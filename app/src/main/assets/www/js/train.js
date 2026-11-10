/* Training: browse workouts, programs, challenges, exercise library, guided player. */
'use strict';

const Programs = {
  active() { return DB.get('program'); },
  meta(id) { return PROGRAMS.find(p => p.id === id); },
  start(id) { DB.set('program', { id, start: D.monday(D.today()), done: {} }); App.emit('data'); },
  quit() { DB.set('program', null); App.emit('data'); },
  week(p) { return clamp(Math.floor(D.diff(D.today(), p.start) / 7), 0, Programs.meta(p.id).weeks - 1); },
  markDone(key, val = true) {
    const p = Programs.active(); if (!p) return;
    if (val) p.done[key] = val; else delete p.done[key];
    DB.save('program'); App.emit('data');
  },
  stats(p) { const m = Programs.meta(p.id); const total = sum(m.plan, w => w.length); return { total, done: Object.keys(p.done || {}).length, pct: Object.keys(p.done || {}).length / total }; },
  // next undone workout up to the current week
  next() {
    const p = Programs.active(); if (!p) return null;
    const m = Programs.meta(p.id); if (!m) return null;
    const cw = Programs.week(p);
    for (let w = 0; w <= cw; w++) for (let i = 0; i < m.plan[w].length; i++) {
      const key = w + '-' + i;
      if (!p.done[key]) return { prog: m, w, i, key, workout: Workouts.get(m.plan[w][i]) };
    }
    return null;
  },
};

const Train = {
  seg: 'browse',
  filter: { type: 'All', focus: 'All', time: 'Any', equip: 'Any' },
  moveCat: 'All', moveQ: '',

  heroEx(w) { const skip = ['jacks', 'armc', 'hknees', 'mountain']; return (w.items.find(i => !skip.includes(i[0])) || w.items[0])[0]; },
  // Pre-rendered exercise pictures (img/ex/<id>-<frame>.webp). Frame 1 is the working
  // position when a move has one, otherwise the single pose.
  exImg(exId, frame) {
    const x = EX[exId] ? exId : 'rest';
    const n = (EX[x].fig && EX[x].fig.frames.length) || 1;
    const f = frame == null ? (n > 1 ? 1 : 0) : clamp(frame, 0, n - 1);
    return 'img/ex/' + x + '-' + f + '.webp';
  },
  figThumb(exId, frame) {
    return `<img class="still" src="${Train.exImg(exId, frame)}" alt="" loading="lazy">`;
  },
  live(box, exId) {
    if (!box) return;
    box.innerHTML = `<img class="still" src="${Train.exImg(exId)}" alt="">`;
  },

  render(v) {
    v.innerHTML = `<div class="top"><h1 class="h1">Training</h1></div>
      <div class="page" style="padding-top:8px"><div class="seg" id="t-seg"><button data-s="browse">Workouts</button><button data-s="programs">Programs</button><button data-s="challenges">Challenges</button><button data-s="moves">Moves</button></div></div>
      <div id="t-body"></div>`;
    $$('#t-seg button', v).forEach(b => { b.classList.toggle('on', b.dataset.s === Train.seg); b.onclick = () => { Train.seg = b.dataset.s; Train.render(v); }; });
    const body = $('#t-body', v);
    ({ browse: Train.renderBrowse, programs: Train.renderPrograms, challenges: Train.renderChallenges, moves: Train.renderMoves })[Train.seg](body);
  },

  // ---------------------------------------------------------- browse
  tile(w, wide) {
    return `<button class="tile ${wide ? 'wide' : ''}" data-w="${w.id}"><div class="tf">${Train.figThumb(Train.heroEx(w), wide)}</div>
      <div class="tb">${wide ? '<div class="eyebrow" style="color:#a8a8a8">Workout of the day</div>' : ''}<div class="tt ${wide ? 'mt8' : ''}">${esc(w.name)}</div>
      <div class="row mt4 small muted" style="gap:8px">${Workouts.minutes(w)} min · ${esc(w.type || 'Custom')}
      <span class="lvl">${[1, 2, 3].map(i => `<i class="${i <= (w.level || 2) ? 'on' : ''}"></i>`).join('')}</span></div></div></button>`;
  },

  renderBrowse(body) {
    const f = Train.filter;
    const list = WORKOUTS.filter(w => (f.type === 'All' || w.type === f.type) && (f.focus === 'All' || w.focus === f.focus)
      && (f.time === 'Any' || (f.time === '≤10 min' ? Workouts.minutes(w) <= 10 : f.time === '10–20 min' ? Workouts.minutes(w) > 10 && Workouts.minutes(w) <= 20 : Workouts.minutes(w) > 20))
      && (f.equip === 'Any' || (f.equip === 'No equipment' ? !w.equip : !!w.equip)));
    const featured = WORKOUTS[(D.diff(D.today(), '2026-01-01') % WORKOUTS.length + WORKOUTS.length) % WORKOUTS.length];
    const custom = DB.get('custom');
    const chipRow = (key, vals) => `<div class="chips mt8">${vals.map(x => `<button class="chip ${f[key] === x ? 'on' : ''}" data-f="${key}" data-v="${esc(x)}">${esc(x)}</button>`).join('')}</div>`;
    const filtered = f.type !== 'All' || f.focus !== 'All' || f.time !== 'Any' || f.equip !== 'Any';
    body.innerHTML = `
      ${filtered ? '' : `<div class="section" style="margin-top:6px"><div class="tiles">${Train.tile(featured, true)}</div></div>`}
      <div class="section" style="margin-top:${filtered ? 6 : 22}px">
        ${chipRow('type', ['All'].concat(W_TYPES))}
        ${chipRow('focus', ['All'].concat(W_FOCUS))}
        ${chipRow('time', ['Any', '≤10 min', '10–20 min', '20+ min'])}
        ${chipRow('equip', ['Any', 'No equipment', 'Dumbbells'])}
      </div>
      <div class="section" style="margin-top:16px"><div class="section-head"><h2 class="h2">${filtered ? list.length + ' workouts' : 'All workouts'}</h2>${filtered ? '<button class="link" data-clear>Clear</button>' : ''}</div>
        ${list.length ? `<div class="tiles">${list.map(w => Train.tile(w)).join('')}</div>` : '<div class="card empty">No workouts match. Try fewer filters.</div>'}</div>
      <div class="section"><div class="section-head"><h2 class="h2">My workouts</h2><button class="link" data-new>+ Create</button></div>
        ${custom.length ? `<div class="tiles">${custom.map(w => Train.tile(w)).join('')}</div>` : `<div class="card muted small">Build your own: pick exercises, time or reps, and rounds.</div>`}</div>`;
    $$('[data-w]', body).forEach(b => b.onclick = () => Train.detail(b.dataset.w));
    $$('[data-f]', body).forEach(b => b.onclick = () => { f[b.dataset.f] = b.dataset.v; App.render(); });
    const cl = $('[data-clear]', body); if (cl) cl.onclick = () => { Train.filter = { type: 'All', focus: 'All', time: 'Any', equip: 'Any' }; App.render(); };
    $('[data-new]', body).onclick = () => Train.builder();
  },

  // ---------------------------------------------------------- workout detail
  detail(id, opts = {}) {
    const w = Workouts.get(id); if (!w) return;
    let previewTimer = null;
    App.push(w.name, body => {
      const uniq = Array.from(new Set(w.items.map(i => i[0])));
      body.innerHTML = `<div class="page" style="padding-top:0">
        <div class="fig-box dark" style="height:250px" data-prev></div>
        <div class="eyebrow mt16">${esc(w.type || 'Custom')} · ${esc(w.focus || '')}${w.equip ? ' · ' + esc(w.equip) : ''}</div>
        <div class="display mt8" style="font-size:40px">${esc(w.name)}</div>
        ${w.desc ? `<p class="muted" style="margin:8px 0 0">${esc(w.desc)}</p>` : ''}
        <div class="stats mt16"><div class="stat"><div class="v">${Workouts.minutes(w)}</div><div class="k">minutes</div></div>
          <div class="stat"><div class="v">${uniq.length}</div><div class="k">moves</div></div>
          <div class="stat"><div class="v">${w.rounds || 1}×</div><div class="k">rounds</div></div></div>
        <button class="btn volt block mt16" data-go>Start workout</button>
        <div class="h2 mt24">Moves</div>
        <div class="list mt12">${w.items.map(([ex, val]) => `<button class="list-item" style="width:100%;text-align:left" data-ex="${ex}"><div class="ex-thumb">${Train.figThumb(ex)}</div>
          <div class="grow"><div style="font-weight:700">${esc((EX[ex] || { n: ex }).n)}</div><div class="tiny muted">${esc((EX[ex] || {}).muscles || '')}</div></div>
          <div class="num" style="font-weight:700">${typeof val === 'number' ? val + 's' : '×' + val}</div></button>`).join('')}</div>
        <p class="muted small">${w.rest || 0}s rest between moves${(w.rounds || 1) > 1 ? ' · ' + w.rounds + ' rounds' : ''}. Tap a move to see how to do it.</p>
        ${w.custom ? `<div class="row mt16"><button class="btn ghost grow" data-edit>Edit</button><button class="btn danger grow" data-del>Delete</button></div>` : ''}</div>`;
      $('[data-go]', body).onclick = () => Train.play(w, opts);
      $$('[data-ex]', body).forEach(b => b.onclick = () => Train.exerciseSheet(b.dataset.ex));
      // preview cycles through the moves
      let k = 0; clearInterval(previewTimer);
      previewTimer = setInterval(() => { const box = $('[data-prev]', body); if (!box) return clearInterval(previewTimer); k = (k + 1) % uniq.length; if (!App.stack.length || !box.closest('.ov') || App.stack[App.stack.length - 1] !== box.closest('.ov') || $('#sheet-wrap').classList.contains('open') || Train.player) return; Train.live(box, uniq[k]); }, 4000);
      requestAnimationFrame(() => Train.live($('[data-prev]', body), uniq[0]));
      if (w.custom) {
        $('[data-edit]', body).onclick = () => Train.builder(w);
        $('[data-del]', body).onclick = () => App.confirm('Delete workout?', w.name, 'Delete', () => { DB.set('custom', DB.get('custom').filter(x => x.id !== w.id)); App.pop(); }, true);
      }
    }, { onPop: () => clearInterval(previewTimer) });
  },

  exerciseSheet(id) {
    const x = EX[id]; if (!x) return;
    const labels = Train.poseLabels(id, x.fig.frames.length);
    App.sheet(s => {
      s.innerHTML = `<div class="fig-box dark" style="height:260px" data-live></div>
        <div class="display mt16" style="font-size:30px">${esc(x.n)}</div>
        <div class="row mt8 wrap" style="gap:6px">${x.muscles ? `<span class="pill">${esc(x.muscles)}</span>` : ''}<span class="pill">${x.equip === 'none' ? 'No equipment' : esc(x.equip)}</span></div>
        ${x.fig.frames.length > 1 ? `<div class="h3 mt16">Key positions</div>
        <div class="poses mt8">${x.fig.frames.map((f, i) => `<div class="pose"><div class="pf"><img class="still" src="${Train.exImg(id, i)}" alt="" loading="lazy"></div><div class="pl"><i>${i + 1}</i>${esc(labels[i])}</div></div>`).join('')}</div>` : ''}
        <div class="h3 mt16">How to do it</div>
        <ol style="margin:8px 0 0;padding-left:20px">${x.steps.map(t => `<li style="margin:6px 0">${esc(t)}</li>`).join('')}</ol>
        <button class="btn ghost block mt16" data-x>Got it</button>`;
      $('[data-x]', s).onclick = () => App.closeSheet();
      requestAnimationFrame(() => Train.live($('[data-live]', s), id));
    });
  },

  poseLabels(id, n) {
    const L = {
      squat: ['Stand', 'Squat'], jsquat: ['Squat', 'Jump'], pulsesq: ['Low', 'Lower'], sumo: ['Stand', 'Squat'], goblet: ['Stand', 'Squat'], backsquat: ['Stand', 'Squat'],
      pushup: ['Top', 'Lower'], wpushup: ['Top', 'Lower'], dpushup: ['Top', 'Lower'], kneepush: ['Top', 'Lower'], pike: ['Top', 'Lower'],
      lunge: ['Stand', 'Lunge'], fwdlunge: ['Stand', 'Lunge'], dblunge: ['Stand', 'Lunge'], slunge: ['Stand', 'Lunge'],
      jacks: ['Start', 'Jump'], curl: ['Start', 'Curl up'], hammer: ['Start', 'Curl up'], bridge: ['Start', 'Lift'], bridgeL: ['Start', 'Lift'], bridgeR: ['Start', 'Lift'], hipthrust: ['Down', 'Drive up'],
      dbrow: ['Start', 'Pull'], row: ['Start', 'Pull'], burpee: ['Jump', 'Squat', 'Plank', 'Push-up'], climbers: ['Right knee', 'Left knee'],
      dips: ['Start', 'Dip'], deadlift: ['Set up', 'Stand'], rdl: ['Stand', 'Hinge'], ohp: ['Rack', 'Press'], dbshoulder: ['Rack', 'Press'], bench: ['Press', 'Lower'], dbpress: ['Press', 'Lower'],
      crunch: ['Down', 'Crunch'], situp: ['Down', 'Up'], vup: ['Long', 'V'], legraise: ['Down', 'Up'], pullup: ['Hang', 'Pull'], chinup: ['Hang', 'Pull'], pulldown: ['Reach', 'Pull'],
      latraise: ['Down', 'Raise'], pushdown: ['Up', 'Push down'], triext: ['Up', 'Lower'], calf: ['Down', 'Rise'], stepup: ['Step', 'Stand tall'], kbswing: ['Hinge', 'Swing'],
      inch: ['Fold', 'Plank'], superman: ['Down', 'Lift'], birddog: ['Start', 'Reach'], donkey: ['Start', 'Kick'], hknees: ['Right', 'Left'], buttkick: ['Right', 'Left'], rotpush: ['Top', 'Lower', 'Top', 'Rotate'],
    };
    const l = L[id] || (n === 2 ? ['Start', 'Finish'] : []);
    return Array.from({ length: n }, (_, i) => l[i] || 'Step ' + (i + 1));
  },

  // ---------------------------------------------------------- guided player (runs in the background service)
  play(w, opts = {}) {
    if (!w) return;
    const st = DB.get('settings');
    const steps = Workouts.steps(w);
    const plan = { title: w.name, rest: w.rest || 0, ready: 5, voice: !!st.voice,
      steps: steps.map(s => ({ name: (EX[s.ex] || { n: s.ex }).n, sec: s.sec, reps: s.reps })) };
    N.workoutReset();
    N.workoutStart(JSON.stringify(plan));
    st.liveWorkout = { id: w.id, opts, startedAt: Date.now() }; DB.save('settings');
    Train.showPlayer(w, opts);
  },

  showPlayer(w, opts = {}) {
    if (Train.player) return;
    const steps = Workouts.steps(w), rounds = w.rounds || 1, per = w.items.length;
    const el = document.createElement('div'); el.className = 'player dark'; document.body.appendChild(el);
    N.keepAwake(true);
    const R = 54, C = 2 * Math.PI * R;
    el.innerHTML = `
      <div class="pl-top"><button class="icon-btn" data-x>${ICON.left}</button><div class="grow center pl-title" data-title></div><button class="icon-btn" data-info>?</button></div>
      <div class="pl-prog">${steps.map(() => '<i></i>').join('')}</div>
      <div class="between" style="padding:10px 18px 0"><span class="small" data-phase style="opacity:.7;font-weight:600"></span><span class="pl-sets"><b data-set>1</b> / ${rounds} ${rounds === 1 ? 'set' : 'sets'}</span></div>
      <div class="pl-fig" data-fig></div>
      <div class="pl-info">
        <button class="pl-ring" data-pp><svg viewBox="0 0 128 128"><circle cx="64" cy="64" r="${R}" class="trk"/><circle cx="64" cy="64" r="${R}" class="prg" data-arc stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="0"/></svg>
          <div class="pl-ring-t"><b data-time>00:05</b><span data-pp-ic>tap to pause</span></div></button>
        <div class="grow"><div class="pl-amt" data-amt></div><div class="pl-cue" data-cue></div><div class="pl-next" data-next></div></div>
      </div>
      <div class="pl-btns"><button class="pl-btn" data-prev>${ICON.left.replace('<svg', '<svg width="22" height="22" fill="currentColor"')} Previous</button>
        <button class="pl-btn main" data-go><span data-go-l>Next</span> ${ICON.right.replace('<svg', '<svg width="22" height="22" fill="currentColor"')}</button></div>`;
    const q = s => el.querySelector(s);
    let shown = null, started = false, last = null, finished = false;

    q('[data-x]').onclick = () => quit();
    q('[data-info]').onclick = () => { const ex = shown; if (ex) Train.exerciseSheet(ex); };
    q('[data-pp]').onclick = () => { N.workoutCmd('toggle'); N.vibrate(20); setTimeout(tick, 80); };
    q('[data-prev]').onclick = () => { N.workoutCmd('prev'); setTimeout(tick, 80); };
    q('[data-go]').onclick = () => { const s = last; N.workoutCmd(s && s.phase === 'work' && steps[s.idx] && steps[s.idx].reps ? 'done' : 'next'); N.vibrate(20); setTimeout(tick, 80); };

    const tick = () => {
      let s; try { s = JSON.parse(N.workoutState()); } catch (e) { return; }
      if (s.status === 'running' || s.status === 'paused') started = true;
      if (s.status === 'done') return finish(false, s);
      if (s.status === 'idle') { if (started) finish(true, last || s); else cleanup(); return; }
      last = s;
      const i = Math.max(0, s.idx), cur = steps[i];
      const showStep = s.phase === 'ready' ? steps[0] : s.phase === 'rest' ? steps[Math.min(steps.length - 1, s.idx + 1)] : cur;
      if (shown !== showStep.ex) {
        shown = showStep.ex;
        Train.live(q('[data-fig]'), shown);
      }
      el.classList.toggle('resting', s.phase === 'rest' || s.phase === 'ready');
      const nm = (EX[showStep.ex] || { n: showStep.ex }).n;
      q('[data-title]').textContent = nm;
      q('[data-phase]').textContent = s.phase === 'ready' ? 'GET READY' : s.phase === 'rest' ? 'REST · UP NEXT' : `MOVE ${i + 1} OF ${steps.length}`;
      q('[data-set]').textContent = Math.min(rounds, Math.floor((s.phase === 'rest' ? s.idx + 1 : i) / per) + 1);
      $$('.pl-prog i', el).forEach((b, k) => { b.className = k < i || (k === i && s.phase === 'rest') ? 'done' : k === i && s.phase === 'work' ? 'cur' : ''; });
      const repsMove = s.phase === 'work' && cur && cur.reps;
      q('[data-amt]').textContent = s.phase === 'rest' ? 'Rest' : s.phase === 'ready' ? 'Get ready' : repsMove ? `${cur.reps} Reps` : `${cur.sec} sec`;
      q('[data-cue]').textContent = (EX[showStep.ex] || {}).cue || '';
      const nx = s.phase === 'work' ? steps[i + 1] : null;
      q('[data-next]').textContent = nx ? 'Next: ' + (EX[nx.ex] || { n: nx.ex }).n : '';
      // ring
      const total = s.phase === 'ready' ? 5 : s.phase === 'rest' ? (w.rest || 1) : (cur.sec || 1);
      const arc = q('[data-arc]');
      if (s.leftMs >= 0) {
        q('[data-time]').textContent = F.clock(Math.ceil(s.leftMs / 1000));
        arc.setAttribute('stroke-dashoffset', (C * (1 - clamp(s.leftMs / 1000 / total, 0, 1))).toFixed(1));
      } else {
        q('[data-time]').textContent = '×' + cur.reps;
        arc.setAttribute('stroke-dashoffset', '0');
      }
      q('[data-pp-ic]').textContent = s.status === 'paused' ? '▶ paused' : 'tap to pause';
      el.classList.toggle('paused', s.status === 'paused');
      q('[data-go-l]').textContent = repsMove ? 'Done' : s.phase === 'ready' ? 'Start' : 'Next';
      q('[data-prev]').disabled = i < 1 || s.phase === 'ready';
    };
    const timer = setInterval(tick, 250);
    Train.player = { el, timer };

    const cleanup = () => {
      clearInterval(timer); el.remove(); N.keepAwake(false); App.modal = null; Train.player = null;
      const st = DB.get('settings'); st.liveWorkout = null; DB.save('settings');
    };
    const quit = () => {
      if (!started || !last || last.idx < 1) { N.workoutCmd('stop'); N.workoutReset(); cleanup(); return; }
      N.workoutCmd('pause');
      App.sheet(sh => {
        sh.innerHTML = `<div class="h2">End workout?</div><p class="muted">${last.idx} of ${steps.length} moves done in ${F.clock(last.elapsedMs / 1000)}.</p>
          <button class="btn volt block mt12" data-save>Save what I did</button><button class="btn ghost block mt8" data-resume>Keep going</button><button class="btn danger block mt8" data-quit>Quit without saving</button>`;
        $('[data-save]', sh).onclick = () => { App.closeSheet(); N.workoutCmd('stop'); finish(true, last); };
        $('[data-resume]', sh).onclick = () => { App.closeSheet(); N.workoutCmd('resume'); };
        $('[data-quit]', sh).onclick = () => { App.closeSheet(); N.workoutCmd('stop'); N.workoutReset(); cleanup(); };
      });
    };
    const finish = (partial, s) => {
      if (finished) return; finished = true;
      clearInterval(timer);
      const elapsed = Math.round((s.elapsedMs || 0) / 1000);
      const doneN = partial ? Math.max(0, s.idx) : steps.length;
      const doneSteps = steps.slice(0, doneN);
      const reps = sum(doneSteps.filter(x => x.ex.includes('pushup')), x => x.reps || Math.round(x.sec / 2.5));
      N.workoutReset();
      el.className = 'player dark';
      el.innerHTML = `<div class="pl-body" style="padding:36px 22px 0;flex:1;overflow:auto"><div style="font-size:64px">🏆</div><div class="pl-done">${partial ? 'Nice effort' : 'Workout complete'}</div>
        <div class="muted mt8" style="color:#9aa6b6">${esc(w.name)}</div>
        <div class="stats mt24" style="width:100%"><div class="stat center"><div class="v">${F.clock(elapsed)}</div><div class="k">time</div></div>
          <div class="stat center"><div class="v">${doneSteps.length}</div><div class="k">moves</div></div>
          <div class="stat center"><div class="v">${Math.round(elapsed / 60 * 7)}</div><div class="k">kcal</div></div></div>
        <div class="row mt24" style="width:100%">${MOODS.map(m => `<button class="chip grow dk" data-m="${m.id}" style="justify-content:center;font-size:20px">${m.e}</button>`).join('')}</div>
        <textarea class="mt12 dk" rows="2" placeholder="Add a note (optional)" data-note></textarea>
        <button class="pl-btn main mt16" style="width:100%" data-ok>Save to log</button></div>`;
      let mood = '';
      $$('[data-m]', el).forEach(b => b.onclick = () => { mood = mood === b.dataset.m ? '' : b.dataset.m; $$('[data-m]', el).forEach(x => x.classList.toggle('on', x.dataset.m === mood)); });
      $('[data-ok]', el).onclick = () => {
        const e = Log.add({ type: w.type === 'Yoga' || w.type === 'Mobility' ? 'yoga' : 'home', title: w.name, durSec: elapsed, reps, note: $('[data-note]', el).value.trim(), src: 'workout', refId: w.id });
        if (mood) Diary.set(D.today(), { mood });
        if (opts.progKey) Programs.markDone(opts.progKey, e.id);
        cleanup(); App.popAll(); App.toast('Workout logged 💪'); App.render();
      };
    };
    App.modal = { back: () => { if (finished) return true; quit(); return true; } };
    tick();
  },

  faceOn() { return null; },

  // ---------------------------------------------------------- programs
  renderPrograms(body) {
    const p = Programs.active();
    const nx = Programs.next();
    body.innerHTML = `
      ${p && Programs.meta(p.id) ? `<div class="section" style="margin-top:6px"><div class="section-head"><h2 class="h2">Your program</h2></div>
        <button class="hero" style="display:block;width:100%;text-align:left" data-open="${p.id}">
          <div class="between"><div><div class="eyebrow">${Programs.meta(p.id).e} ${esc(Programs.meta(p.id).name)} · week ${Programs.week(p) + 1} of ${Programs.meta(p.id).weeks}</div>
          <div class="display mt8" style="font-size:26px">${nx ? esc(nx.workout.name) : 'All caught up 🎉'}</div>
          <div class="muted small mt4">${nx ? Workouts.minutes(nx.workout) + ' min · up next' : 'Next week unlocks on Monday'}</div></div>
          <div class="ring">${ringSvg(Programs.stats(p).pct, 62, 6, '#d4ff3a', '#333')}<div class="ring-label small" style="font-weight:700">${Math.round(Programs.stats(p).pct * 100)}%</div></div></div></button></div>` : ''}
      <div class="section" style="margin-top:${p ? 22 : 6}px"><div class="section-head"><h2 class="h2">Programs</h2><span class="muted small">multi-week plans</span></div>
        ${PROGRAMS.map(pr => `<button class="card white tap" style="display:block;width:100%;text-align:left" data-open="${pr.id}">
          <div class="row"><div class="emoji-badge" style="width:54px;height:54px;font-size:28px">${pr.e}</div>
          <div class="grow"><div class="display" style="font-size:22px">${esc(pr.name)}</div><div class="muted small mt4">${esc(pr.desc)}</div>
          <div class="row mt8 small"><span class="pill">${pr.weeks} weeks</span><span class="pill">${pr.plan[0].length}× / week</span><span class="lvl">${[1, 2, 3].map(i => `<i class="${i <= pr.level ? 'on' : ''}"></i>`).join('')}</span></div></div></div></button>`).join('')}</div>`;
    $$('[data-open]', body).forEach(b => b.onclick = () => Train.programDetail(b.dataset.open));
  },

  programDetail(id) {
    const m = Programs.meta(id);
    App.push(m.name, body => {
      const p = Programs.active(), mine = p && p.id === id;
      const cw = mine ? Programs.week(p) : -1;
      body.innerHTML = `<div class="page" style="padding-top:0">
        <div class="display" style="font-size:42px">${m.e} ${esc(m.name)}</div>
        <p class="muted">${esc(m.desc)}</p>
        <div class="stats"><div class="stat"><div class="v">${m.weeks}</div><div class="k">weeks</div></div>
          <div class="stat"><div class="v">${m.plan[0].length}</div><div class="k">per week</div></div>
          <div class="stat"><div class="v">${sum(m.plan.flat(), x => Workouts.minutes(Workouts.get(x)))}</div><div class="k">total min</div></div></div>
        ${mine ? '' : `<button class="btn volt block mt16" data-start>Start program</button>`}
        <div class="mt24">${m.plan.map((wk, w) => `<div class="plan-week"><div class="eyebrow" style="margin-bottom:6px">Week ${w + 1}${w === cw ? ' · this week' : ''}</div>
          <div class="list">${wk.map((wid, i) => { const wo = Workouts.get(wid), key = w + '-' + i, done = mine && p.done[key];
            return `<div class="plan-day ${w === cw ? 'today' : ''}"><div class="ex-thumb" data-w="${wid}" data-k="${key}">${Train.figThumb(Train.heroEx(wo))}</div>
              <div class="grow" data-w="${wid}" data-k="${key}"><div class="small" style="font-weight:700">${esc(wo.name)}</div><div class="tiny muted">${Workouts.minutes(wo)} min · ${esc(wo.focus)}</div></div>
              ${mine ? `<button class="check ${done ? 'on' : ''}" data-chk="${key}"></button>` : ''}</div>`; }).join('')}</div></div>`).join('')}</div>
        ${mine ? '<button class="btn danger block mt8" data-quit>End program</button>' : ''}</div>`;
      $$('[data-w]', body).forEach(b => b.onclick = () => Train.detail(b.dataset.w, mine ? { progKey: b.dataset.k } : {}));
      $$('[data-chk]', body).forEach(b => b.onclick = () => { Programs.markDone(b.dataset.chk, !p.done[b.dataset.chk]); App.redrawTop(); });
      const sb = $('[data-start]', body);
      if (sb) sb.onclick = () => { const go = () => { Programs.start(id); App.popAll(); Train.seg = 'programs'; App.go('train'); App.toast(m.name + ' started'); }; if (p) App.confirm('Switch program?', 'Your current program progress will be replaced.', 'Switch', go); else go(); };
      const q = $('[data-quit]', body);
      if (q) q.onclick = () => App.confirm('End program?', 'Logged workouts stay in your diary.', 'End', () => { Programs.quit(); App.pop(); }, true);
    });
  },

  // ---------------------------------------------------------- moves library
  renderMoves(body) {
    const ids = Object.keys(EX).filter(id => id !== 'rest' && !/R$/.test(id) || (id.endsWith('R') && !EX[id.slice(0, -1) + 'L']));
    const q = Train.moveQ.toLowerCase();
    const list = ids.filter(id => (Train.moveCat === 'All' || EX[id].cat === Train.moveCat) && (!q || EX[id].n.toLowerCase().includes(q) || (EX[id].muscles || '').toLowerCase().includes(q)));
    body.innerHTML = `<div class="page" style="padding-top:6px">
        <input data-q placeholder="Search ${ids.length} moves or muscles" value="${esc(Train.moveQ)}">
        <div class="chips mt12">${['All'].concat(EX_CATS).map(c => `<button class="chip ${Train.moveCat === c ? 'on' : ''}" data-c="${c}">${c}</button>`).join('')}</div></div>
      <div class="section" style="margin-top:8px"><div class="list" data-list>${list.map(id => `<button class="list-item" style="width:100%;text-align:left" data-ex="${id}">
        <div class="ex-thumb">${Train.figThumb(id)}</div><div class="grow"><div style="font-weight:700">${esc(EX[id].n)}</div><div class="tiny muted">${esc(EX[id].muscles)}</div></div>
        <span class="pill">${esc(EX[id].cat)}</span></button>`).join('') || '<div class="list-item muted small">No moves found.</div>'}</div></div>`;
    $$('[data-ex]', body).forEach(b => b.onclick = () => Train.exerciseSheet(b.dataset.ex));
    $$('[data-c]', body).forEach(b => b.onclick = () => { Train.moveCat = b.dataset.c; App.render(); });
    const inp = $('[data-q]', body);
    let t = null;
    inp.oninput = () => { clearTimeout(t); t = setTimeout(() => { Train.moveQ = inp.value; App.render(); const n = $('#t-body [data-q]'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 300); };
  },

  // ---------------------------------------------------------- custom workout builder
  builder(existing) {
    const w = existing ? JSON.parse(JSON.stringify(existing)) : { id: 'c-' + uid(), name: '', type: 'Custom', focus: 'Custom', level: 2, rounds: 2, rest: 15, items: [], custom: true };
    App.push(existing ? 'Edit workout' : 'New workout', body => {
      body.innerHTML = `<div class="page" style="padding-top:0">
        <div class="field" style="margin-top:0"><label>Name</label><input data-name value="${esc(w.name)}" placeholder="e.g. Lunch-break burner"></div>
        <div class="row mt12"><div class="field grow" style="margin:0"><label>Rounds</label><div class="stepper"><button data-r="-1">−</button><input data-rounds value="${w.rounds}" readonly><button data-r="1">+</button></div></div>
          <div class="field grow" style="margin:0"><label>Rest (s)</label><div class="stepper"><button data-rs="-5">−</button><input data-rest value="${w.rest}" readonly><button data-rs="5">+</button></div></div></div>
        <div class="h2 mt24">Moves</div>
        <div class="list mt12" data-items></div>
        <div class="h3 mt24">Add moves</div>
        <div class="list mt8">${Object.keys(EX).filter(k => k !== 'rest' && !/R$/.test(k)).map(k => `<button class="list-item" style="width:100%;text-align:left;padding:8px 12px" data-add="${k}"><div class="ex-thumb" style="width:52px;height:42px">${Train.figThumb(k)}</div><div class="grow small" style="font-weight:600">${esc(EX[k].n)}</div><span style="font-size:22px">+</span></button>`).join('')}</div>
        <button class="btn volt block mt24" data-save style="position:sticky;bottom:12px">Save workout</button></div>`;
      const items = $('[data-items]', body);
      const drawItems = () => {
        if (!w.items.length) { items.innerHTML = '<div class="list-item muted small">Add moves from the list below.</div>'; return; }
        items.innerHTML = w.items.map(([ex, v], k) => `<div class="list-item"><div class="ex-thumb" style="width:52px;height:42px">${Train.figThumb(ex)}</div><div class="grow small" style="font-weight:600">${esc(EX[ex].n)}</div>
          <button class="chip" data-mode="${k}">${typeof v === 'number' ? v + 's' : '×' + v}</button><button class="icon-btn plain" data-rm="${k}">${ICON.close}</button></div>`).join('');
        $$('[data-rm]', items).forEach(b => b.onclick = () => { w.items.splice(+b.dataset.rm, 1); drawItems(); });
        $$('[data-mode]', items).forEach(b => b.onclick = () => {
          const k = +b.dataset.mode, cur = w.items[k][1];
          const opts = [20, 30, 40, 45, 60, '5', '8', '10', '12', '15', '20'];
          w.items[k][1] = opts[(opts.findIndex(o => o === cur) + 1) % opts.length]; drawItems();
        });
      };
      drawItems();
      $$('[data-add]', body).forEach(b => b.onclick = () => { w.items.push([b.dataset.add, 30]); drawItems(); App.toast(EX[b.dataset.add].n + ' added'); });
      $$('[data-r]', body).forEach(b => b.onclick = () => { w.rounds = clamp(w.rounds + +b.dataset.r, 1, 10); $('[data-rounds]', body).value = w.rounds; });
      $$('[data-rs]', body).forEach(b => b.onclick = () => { w.rest = clamp(w.rest + +b.dataset.rs, 0, 120); $('[data-rest]', body).value = w.rest; });
      $('[data-save]', body).onclick = () => {
        w.name = $('[data-name]', body).value.trim() || 'My workout';
        if (!w.items.length) return App.toast('Add at least one move');
        const list = DB.get('custom'), at = list.findIndex(x => x.id === w.id);
        if (at >= 0) list[at] = w; else list.push(w);
        DB.save('custom'); App.popAll(); Train.seg = 'browse'; App.go('train'); App.toast('Workout saved');
      };
    });
  },

  openEvil() {
    const a = Ch.active().find(c => c.kind === 'evil');
    if (a) return Train.openChallenge(a.id);
    Train.seg = 'challenges'; App.go('train');
    Train.setupChallenge(CHALLENGE_PRESETS[0]);
  },

  // ---------------------------------------------------------- challenges
  renderChallenges(body) {
    const active = Ch.active(), past = Ch.all().filter(c => !active.includes(c));
    body.innerHTML = `
      ${active.length ? `<div class="section" style="margin-top:6px"><div class="section-head"><h2 class="h2">Active</h2></div>
        ${active.map(c => { const t = Ch.target(c, D.today()), d = Ch.repsOn(c, D.today()); return `<button class="card white tap" style="display:block;width:100%;text-align:left" data-c="${c.id}">
          <div class="between"><div class="row"><div class="emoji-badge">${c.e}</div><div><div class="h3">${esc(c.name)}</div><div class="muted small">Day ${Ch.dayIndex(c) + 1} of ${c.days} · 🔥 ${Ch.streak(c)} streak</div></div></div>
          <div class="ring">${ringSvg(t ? d / t : 0, 54, 6)}<div class="ring-label small num" style="font-weight:700">${d}</div></div></div></button>`; }).join('')}</div>` : ''}
      <div class="section" ${active.length ? '' : 'style="margin-top:6px"'}><div class="section-head"><h2 class="h2">Start a challenge</h2></div>
        ${CHALLENGE_PRESETS.map((p, k) => `<button class="card white tap" style="display:block;width:100%;text-align:left" data-p="${k}">
          <div class="row"><div class="emoji-badge">${p.e}</div><div class="grow"><div class="h3">${esc(p.name)}</div><div class="muted small">${esc(p.desc)}</div></div></div></button>`).join('')}</div>
      ${past.length ? `<div class="section"><div class="section-head"><h2 class="h2">Past</h2></div><div class="list">${past.map(c => `<button class="list-item" style="width:100%;text-align:left" data-c="${c.id}">
        <div class="emoji-badge">${c.e}</div><div class="grow"><div style="font-weight:600">${esc(c.name)}</div><div class="tiny muted">Started ${D.nice(c.start)}</div></div>${Ch.completed(c) ? '<span class="pill volt">✓ Done</span>' : ''}</button>`).join('')}</div></div>` : ''}`;
    $$('[data-c]', body).forEach(b => b.onclick = () => Train.openChallenge(b.dataset.c));
    $$('[data-p]', body).forEach(b => b.onclick = () => Train.setupChallenge(CHALLENGE_PRESETS[+b.dataset.p]));
  },

  setupChallenge(p) {
    App.sheet(s => {
      const evil = p.kind === 'evil';
      s.innerHTML = `<div class="row"><div class="emoji-badge">${p.e}</div><div class="h2">${esc(p.name)}</div></div>
        <p class="muted small">${esc(p.desc)}</p>
        ${p.custom ? `<div class="field"><label>Name</label><input data-name placeholder="e.g. Plank-a-day"></div>
          <div class="field"><label>Exercise</label><select data-ex>${['pushup', 'squat', 'lunge', 'burpee', 'crunch', 'dips', 'jsquat', 'climbers', 'calf'].map(k => `<option value="${k}">${EX[k].n}</option>`).join('')}</select></div>` : ''}
        ${evil ? `<div class="field"><label>Your max push-ups in one go</label><input data-max type="number" inputmode="numeric" placeholder="Do a max set now, then enter it"></div>`
          : `<div class="row"><div class="field grow"><label>Reps per day</label><input data-target type="number" inputmode="numeric" value="${p.target}"></div>
             <div class="field grow"><label>Days</label><input data-days type="number" inputmode="numeric" value="${p.days}"></div></div>`}
        <div class="field"><label>Start</label><input data-start type="date" value="${D.today()}"></div>
        <div class="row mt12"><div class="field grow" style="margin:0"><label>Alerts from</label><select data-from>${[5, 6, 7, 8, 9, 10].map(h => `<option ${h === 7 ? 'selected' : ''}>${h}</option>`).join('')}</select></div>
          <div class="field grow" style="margin:0"><label>until</label><select data-to>${[19, 20, 21, 22, 23].map(h => `<option ${h === 22 ? 'selected' : ''}>${h}</option>`).join('')}</select></div></div>
        ${evil ? '<p class="tiny muted mt8">Rule: no skipping. Do your sets every interval while you\'re awake, stopping an hour before bed. Formula from The Modern Rogue.</p>' : ''}
        <button class="btn volt block mt16" data-go>Start challenge</button>`;
      $('[data-go]', s).onclick = () => {
        const c = { id: uid(), kind: p.kind, name: p.name, e: p.e, ex: p.ex || 'pushup', days: p.days, start: $('[data-start]', s).value || D.today(),
          from: +$('[data-from]', s).value, to: +$('[data-to]', s).value, log: {} };
        if (evil) {
          c.max = +$('[data-max]', s).value; if (!(c.max > 0)) return App.toast('Enter your max first');
        } else {
          c.target = +$('[data-target]', s).value || p.target; c.days = +$('[data-days]', s).value || p.days;
          if (p.custom) { c.name = $('[data-name]', s).value.trim() || 'My challenge'; c.ex = $('[data-ex]', s).value; c.e = EX[c.ex].e; }
        }
        DB.get('challenges').push(c); Ch.save();
        if (evil && c.start === D.today()) { // the max test you just did counts as today's first set
          Ch.addSet(c, c.max); c.log[c.start][0].test = true; Ch.save();
        }
        App.closeSheet(); Train.openChallenge(c.id);
        if (evil) Train.setReminder(c);
      };
    });
  },

  setReminder(c) {
    const d = Ch.evilDay(c, Ch.dayIndex(c));
    if (c.kind === 'evil' && d && !d.final) {
      N.reminderSet(d.every, c.from || 7, c.to || 22, `Push-ups! Do ${d.reps}`, `${c.name} · day ${Ch.dayIndex(c) + 1}`);
      c.alerts = true; c.alertEvery = d.every; c.alertDay = D.today(); Ch.save();
      App.toast(`Alerts every ${d.every} min, ${c.from || 7}:00–${c.to || 22}:00`);
    } else if (c.kind === 'count') {
      const every = c.alertEvery || 60;
      N.reminderSet(every, c.from || 7, c.to || 22, `${c.name}: time for a set`, `${Math.max(0, Ch.target(c, D.today()) - Ch.repsOn(c, D.today()))} to go today`);
      c.alerts = true; c.alertEvery = every; Ch.save();
      App.toast(`Alerts every ${every} min`);
    }
  },

  openChallenge(id) {
    const c = Ch.get(id); if (!c) return;
    let prox = false, near = false, lastFlip = 0;
    App.push(c.name, (body) => {
      const today = D.today(), i = Ch.dayIndex(c), done = Ch.repsOn(c, today), target = Ch.target(c, today);
      const evil = c.kind === 'evil', ed = evil ? Ch.evilDay(c, i) : null;
      const exName = EX[c.ex] ? EX[c.ex].n : 'Reps';
      const setSize = evil && ed ? ed.reps : 10;
      const left = Math.max(0, target - done);
      const over = i >= c.days;
      body.innerHTML = `<div class="page" style="padding-top:0">
        <div class="between"><div class="eyebrow">${over ? 'Finished' : i < 0 ? 'Starts ' + D.nice(c.start) : `Day ${i + 1} of ${c.days}`} · 🔥 ${Ch.streak(c)}</div>
          <button class="chip ${c.alerts ? 'on' : ''}" data-alert>⏰ ${c.alerts ? 'Alerts on' : 'Alerts off'}</button></div>
        ${evil ? Train.evilHtml(c, i, ed) : ''}
        <div class="center mt16"><div class="eyebrow">${evil ? 'Push-ups today' : exName + ' left today'}</div>
          <div class="counter num ${!evil && left === 0 ? 'done' : ''}" data-count>${evil ? done : left}</div>
          <div class="muted small">${evil ? (target ? `target ≈ ${target} (${ed.reps} × every ${ed.every} min)` : '') : `${done} of ${target} done`}</div></div>
        ${!over && i >= 0 ? `<div class="count-pad mt16">
          <button class="main" data-add="${setSize}">${evil ? `Set done · ${setSize}` : `+${setSize}`}</button>
          <button data-add="1">+1</button><button data-add="5">+5</button><button data-add="custom">#</button></div>
        <div class="row mt12"><button class="btn ghost grow sm" data-undo>Undo last</button>
          ${N.hasProximity() ? `<button class="btn sm grow ${prox ? 'volt' : 'outline'}" data-prox>${prox ? '● Counting…' : '📱 Sensor count'}</button>` : ''}</div>
        ${prox ? '<p class="small muted center mt8">Phone flat on the floor under your chest, screen up. Each time your chest comes down close to it counts one rep. Tap again to stop and save.</p>' : ''}` : ''}
        <div class="h2 mt24">Progress</div>
        <div class="card mt8">${Train.challengeGrid(c)}</div>
        <div class="h2 mt24">Today's sets</div>
        <div class="list mt8">${((c.log || {})[today] || []).slice().reverse().map(s => `<div class="list-item small"><span class="muted">${D.time(s.ts)}</span><span class="grow"></span><b>${s.reps}</b>${s.test ? '<span class="pill">test</span>' : ''}</div>`).join('') || '<div class="list-item small muted">No sets yet today.</div>'}</div>
        <button class="btn danger block mt24" data-end>${over ? 'Remove challenge' : 'End challenge'}</button></div>`;

      const q = s => $(s, body);
      $$('[data-add]', body).forEach(b => b.onclick = () => {
        if (b.dataset.add === 'custom') {
          App.sheet(sh => {
            sh.innerHTML = `<div class="h2">Log a set</div><input class="mt12" type="number" inputmode="numeric" data-n placeholder="Reps" autofocus><button class="btn volt block mt12" data-ok>Add</button>`;
            setTimeout(() => $('[data-n]', sh).focus(), 100);
            $('[data-ok]', sh).onclick = () => { const n = +$('[data-n]', sh).value; App.closeSheet(); if (n > 0) addReps(n); };
          });
          return;
        }
        addReps(+b.dataset.add);
      });
      const addReps = n => {
        const before = Ch.repsOn(c, today);
        Ch.addSet(c, n); N.vibrate(30);
        const after = Ch.repsOn(c, today);
        if (target && before < target && after >= target) { Beep.play(1300, 300); if (DB.get('settings').voice) N.speak(`Daily target done! ${after} ${exName.toLowerCase()}.`); App.toast('🎉 Daily target hit!'); }
        App.redrawTop();
      };
      const u = q('[data-undo]'); if (u) u.onclick = () => { Ch.undoSet(c); App.redrawTop(); };
      const ab = q('[data-alert]');
      ab.onclick = () => {
        if (c.alerts) { N.reminderClear(); c.alerts = false; Ch.save(); App.toast('Alerts off'); App.redrawTop(); return; }
        if (c.kind === 'evil') { Train.setReminder(c); App.redrawTop(); return; }
        App.sheet(sh => {
          sh.innerHTML = `<div class="h2">Remind me every…</div><div class="chips mt12" style="flex-wrap:wrap">${[30, 45, 60, 90, 120, 180].map(m => `<button class="chip" data-m="${m}">${m} min</button>`).join('')}</div>
            <p class="small muted">Between ${c.from || 7}:00 and ${c.to || 22}:00. It rings until you tap it.</p>`;
          $$('[data-m]', sh).forEach(b => b.onclick = () => { c.alertEvery = +b.dataset.m; App.closeSheet(); Train.setReminder(c); App.redrawTop(); });
        });
      };
      const pb = q('[data-prox]');
      if (pb) pb.onclick = () => {
        prox = !prox; N.proximity(prox); N.keepAwake(prox);
        if (prox) { App.toast('Sensor counting on'); if (DB.get('settings').voice) N.speakNow('Go!'); proxCount = 0; }
        else if (proxCount > 0) { Ch.addSet(c, proxCount); App.toast(`${proxCount} reps saved`); proxCount = 0; }
        App.redrawTop();
      };
      q('[data-end]').onclick = () => App.confirm(over ? 'Remove challenge?' : 'End challenge?', over ? 'Its history goes too, but the reps stay in your log.' : 'Progress so far stays in your log.', over ? 'Remove' : 'End', () => {
        if (c.alerts) N.reminderClear();
        if (over) DB.set('challenges', Ch.all().filter(x => x.id !== c.id)); else { c.ended = true; c.alerts = false; Ch.save(); }
        App.pop();
      }, true);
      const rt = q('[data-retest]');
      if (rt) rt.onclick = () => {
        const n = +q('[data-retest-n]').value; if (!(n > 0)) return App.toast('Enter your max');
        if (ed.final) c.finalMax = n; else c.max2 = n;
        Ch.addSet(c, n); c.log[today][c.log[today].length - 1].test = true; Ch.save();
        if (!ed.final && c.alerts) Train.setReminder(c);
        if (ed.final) App.toast(`Max went ${c.max} → ${n} (${n >= c.max ? '+' : ''}${n - c.max}) 🐻`);
        App.redrawTop();
      };
    }, { onPop: () => { if (prox) { N.proximity(false); N.keepAwake(false); if (proxCount > 0) Ch.addSet(c, proxCount); } prox = false; App.off('native:proximity', onProx); } });

    // rep counting from the proximity sensor: near -> far = one rep
    let proxCount = 0;
    const onProx = r => {
      if (!prox) return;
      const now = Date.now();
      if (r.near) { near = true; return; }
      if (near && now - lastFlip > 350) {
        proxCount++; lastFlip = now; N.vibrate(20);
        if (DB.get('settings').voice) N.speakNow(String(proxCount));
        const el = $('[data-count]', App.stack[App.stack.length - 1]);
        if (el) el.textContent = c.kind === 'evil' ? Ch.repsOn(c, D.today()) + proxCount : Math.max(0, Ch.target(c, D.today()) - Ch.repsOn(c, D.today()) - proxCount);
      }
      near = false;
    };
    App.on('native:proximity', onProx);
    // Evil Russian alerts change interval day to day; keep them in step
    if (c.kind === 'evil' && c.alerts && c.alertDay !== D.today()) Train.setReminder(c);
  },

  evilHtml(c, i, ed) {
    if (!ed) return `<div class="card mt12"><div class="h3">Challenge complete 🐻</div><div class="muted small mt4">Start max ${c.max}${c.max2 ? ' · week 2 ' + c.max2 : ''}${c.finalMax ? ' · final ' + c.finalMax : ''}</div></div>`;
    const needTest = ed.test && (ed.final ? !c.finalMax : ed.w2 && !c.max2);
    return `<div class="hero mt12">
      <div class="eyebrow">${ed.final ? 'Final day' : ed.w2 ? 'Week 2' : 'Week 1'} · based on max ${ed.base}</div>
      <div class="display mt8" style="font-size:30px">${ed.final ? 'Final max test' : ed.test ? (needTest ? 'Re-test your max' : `${ed.reps} every ${ed.every} min`) : `${ed.reps} every ${ed.every} min`}</div>
      <div class="muted small mt4">${ed.final ? 'Go until you can\'t do any more. See how far you\'ve come.' : ed.test && needTest ? 'Do one all-out set, enter it, and the rest of the week is recalculated.' : 'Every interval while awake. No skipping.'}</div>
      ${needTest ? `<div class="row mt12"><input type="number" inputmode="numeric" data-retest-n placeholder="Max reps" style="max-width:140px"><button class="btn volt sm" data-retest>Save max</button></div>` : ''}
      ${c.finalMax ? `<div class="mt12"><span class="pill volt">Max ${c.max} → ${c.finalMax}</span></div>` : ''}</div>`;
  },

  challengeGrid(c) {
    const cells = [];
    for (let k = 0; k < c.days; k++) {
      const d = D.add(c.start, k), t = Ch.target(c, d), r = Ch.repsOn(c, d);
      const st = d > D.today() ? 'f' : (t ? r >= t : r > 0) ? 'y' : d === D.today() ? 't' : 'n';
      cells.push(`<div title="${d}" style="aspect-ratio:1;border-radius:6px;display:grid;place-items:center;font-size:10px;font-weight:700;
        background:${st === 'y' ? 'var(--volt)' : st === 't' ? '#fff' : st === 'n' ? '#fde3df' : 'var(--s1)'};color:${st === 'y' ? '#000' : 'var(--muted)'};${st === 't' ? 'box-shadow:inset 0 0 0 2px #111' : ''}">${k + 1}</div>`);
    }
    return `<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:5px">${cells.join('')}</div>`;
  },
};
App.register('train', Train);
// Reopen the player if a workout is still running in the background.
const resumeWorkout = () => {
  const lw = DB.get('settings').liveWorkout; if (!lw || Train.player) return;
  let s; try { s = JSON.parse(N.workoutState()); } catch (e) { return; }
  const w = Workouts.get(lw.id);
  if (w && (s.status === 'running' || s.status === 'paused' || s.status === 'done')) Train.showPlayer(w, lw.opts || {});
};
App.on('boot', resumeWorkout);
App.on('native:resume', resumeWorkout);
App.off = (evt, fn) => { App.listeners[evt] = (App.listeners[evt] || []).filter(f => f !== fn); };
App.on('open-active-challenge', () => { const a = Ch.active().find(c => c.alerts) || Ch.active()[0]; if (a) Train.openChallenge(a.id); });
